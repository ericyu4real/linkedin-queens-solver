import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readBoard, isBoardSolved } from '../extension/board.js';
import { board4, board4FixtureColors, board4Solution } from './boards.mjs';
import { renderFixtureHtml, renderUltimateFixtureHtml } from './fixture-html.mjs';

const COMMAND = 'queens-solver-command';
const RESULT = 'queens-solver-result';

function send(type) {
  return new Promise((resolve) => {
    const id = `test-${type}-${Math.random().toString(16).slice(2)}`;
    window.addEventListener(RESULT, function onResult(event) {
      if (event.detail?.id !== id) return;
      window.removeEventListener(RESULT, onResult);
      resolve(event.detail);
    });
    window.dispatchEvent(new CustomEvent(COMMAND, { detail: { type, id } }));
  });
}

test('identifies a Queens board and only fills after Autofill', async () => {
  const html = renderFixtureHtml({
    regions: board4,
    colors: board4FixtureColors,
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://127.0.0.1/games/queens/',
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.CustomEvent = dom.window.CustomEvent;
  await import(`../extension/page.js?bridge=${Date.now()}`);

  try {
    const status = await send('GET_STATUS');
    assert.equal(status.identified, true);
    assert.equal(status.hasBoard, true);
    assert.equal(status.n, 4);
    assert.equal(status.solved, false);
    assert.equal(isBoardSolved(readBoard()), false);

    const result = await send('AUTOFILL');
    assert.equal(result.ok, true);
    assert.equal(result.solved, true);
    const board = readBoard();
    assert.equal(isBoardSolved(board), true);
    assert.deepEqual(
      board.states.map((row) => row.findIndex((state) => state === 'queen')),
      board4Solution,
    );
    assert.equal(document.getElementById('status').textContent, 'solved');
    assert.equal(document.getElementById('completion').hidden, false);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.CustomEvent;
  }
});

test('identifies a Queens Ultimate board and only fills after Autofill', async () => {
  const html = renderUltimateFixtureHtml({
    regions: board4,
    colors: board4FixtureColors,
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://queensultimate.com/unlimited',
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.CustomEvent = dom.window.CustomEvent;
  await import(`../extension/page.js?ultimate=${Date.now()}`);

  try {
    const status = await send('GET_STATUS');
    assert.equal(status.identified, true);
    assert.equal(status.hasBoard, true);
    assert.equal(status.n, 4);
    assert.equal(status.solved, false);

    const result = await send('AUTOFILL');
    assert.equal(result.ok, true);
    assert.equal(result.solved, true);
    const board = readBoard();
    assert.equal(isBoardSolved(board), true);
    assert.deepEqual(
      board.states.map((row) => row.findIndex((state) => state === 'queen')),
      board4Solution,
    );
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.CustomEvent;
  }
});
