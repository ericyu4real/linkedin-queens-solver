import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { renderFixtureHtml } from './fixture-html.mjs';
import { board4, board4FixtureColors, board4Solution } from './boards.mjs';
import { isValidSolution } from '../extension/solver.js';

const EXTENSION_PATH = path.resolve(import.meta.dirname, '../extension');

const freshHtml = renderFixtureHtml({
  regions: board4,
  colors: board4FixtureColors,
  title: 'Queens fixture fresh',
});

const partialHtml = renderFixtureHtml({
  regions: board4,
  colors: board4FixtureColors,
  title: 'Queens fixture partial',
  preset: [
    ['queen', 'cross', 'empty', 'empty'],
    ['empty', 'empty', 'cross', 'empty'],
    ['empty', 'queen', 'empty', 'empty'],
    ['cross', 'empty', 'empty', 'empty'],
  ],
});

let server;
let baseUrl;
let userDataDir;
let browser;
let launchError;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      let html = '<!doctype html><title>not found</title>';
      if (url.pathname === '/fresh') html = freshHtml;
      if (url.pathname === '/partial') html = partialHtml;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
}

async function launch() {
  userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'queens-ext-'));
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
  browser = await puppeteer.launch({
    headless: true,
    executablePath,
    userDataDir,
    pipe: true,
    enableExtensions: [EXTENSION_PATH],
    args: [
      '--enable-unsafe-extension-debugging',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: { width: 900, height: 800 },
  });
}

function cellLabels(page) {
  return page.$$eval('[data-cell-idx]', (els) =>
    els.map((el) => el.getAttribute('aria-label')),
  );
}

function queensFromLabels(labels, n) {
  const queens = Array(n).fill(-1);
  for (const label of labels) {
    const match = label.match(/^(Empty cell|Cross|Queen) of color (.+), row (\d+), column (\d+)$/);
    if (!match || match[1] !== 'Queen') continue;
    queens[Number(match[3]) - 1] = Number(match[4]) - 1;
  }
  return queens;
}

async function waitForSolved(page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const status = document.getElementById('status');
      const completion = document.getElementById('completion');
      const grid = document.querySelector('[data-testid="interactive-grid"]');
      return (
        (status && status.textContent === 'solved') ||
        (completion && !completion.hidden) ||
        (grid && grid.getAttribute('data-queens-auto-solver') === 'solved')
      );
    },
    { timeout },
  );
}

before(async () => {
  await startServer();
  try {
    await launch();
  } catch (err) {
    launchError = err;
  }
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (userDataDir) fs.rmSync(userDataDir, { recursive: true, force: true });
});

function skipIfNoBrowser(t) {
  if (launchError) {
    t.skip(
      `Chrome for Testing could not launch (${launchError.message}). Install with: PUPPETEER_CACHE_DIR=./.cache/puppeteer npx puppeteer browsers install chrome`,
    );
    return true;
  }
  return false;
}

test('unpacked extension solves a fresh fixture board', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/fresh`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="interactive-grid"]');
  await waitForSolved(page);
  const labels = await cellLabels(page);
  const queens = queensFromLabels(labels, 4);
  assert.deepEqual(queens, board4Solution);
  assert.equal(isValidSolution(
    board4.map((row) => row.map((key) => board4FixtureColors[key].name)),
    queens,
  ), true);
  const completionVisible = await page.$eval('#completion', (el) => !el.hidden);
  const status = await page.$eval('#status', (el) => el.textContent);
  const seeResults = await page.$eval('#completion button', (el) => el.textContent.trim());
  assert.equal(completionVisible, true);
  assert.equal(status, 'solved');
  assert.equal(seeResults, 'See results');
  await page.close();
});

test('unpacked extension clears a wrong queen and leftover X marks on a partial board', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/partial`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="interactive-grid"]');
  const before = await cellLabels(page);
  assert.ok(before[0].startsWith('Queen of color'), 'preset wrong queen at 0,0');
  assert.ok(before.some((label) => label.startsWith('Cross of color')), 'preset has X marks');
  await waitForSolved(page);
  const labels = await cellLabels(page);
  const queens = queensFromLabels(labels, 4);
  assert.deepEqual(queens, board4Solution);
  assert.equal(labels[0].startsWith('Queen of color'), false, 'incorrect queen was cleared');
  const completionVisible = await page.$eval('#completion', (el) => !el.hidden);
  assert.equal(completionVisible, true);
  await page.close();
});

test('solver does not start a second run after the fixture re-renders as solved', async (t) => {
  if (skipIfNoBrowser(t)) return;
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/fresh`, { waitUntil: 'domcontentloaded' });
  await waitForSolved(page);
  const first = await page.$eval(
    '[data-testid="interactive-grid"]',
    (el) => el.getAttribute('data-queens-auto-solver'),
  );
  await page.evaluate(() => {
    document.querySelector('[data-testid="interactive-grid"]').appendChild(document.createTextNode(''));
  });
  await new Promise((r) => setTimeout(r, 600));
  const second = await page.$eval(
    '[data-testid="interactive-grid"]',
    (el) => el.getAttribute('data-queens-auto-solver'),
  );
  assert.equal(first, 'solved');
  assert.equal(second, 'solved');
  await page.close();
});
