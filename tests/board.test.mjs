import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { parseCellLabel, readBoard, placedQueens, isBoardSolved } from '../extension/board.js';
import { board4, board4FixtureColors, board4Solution } from './boards.mjs';
import { renderFixtureHtml } from './fixture-html.mjs';

test('parseCellLabel reads empty, cross, and queen labels from the live format', () => {
  assert.deepEqual(parseCellLabel('Empty cell of color Vibrant Coral, row 1, column 1'), {
    state: 'empty',
    color: 'Vibrant Coral',
    row: 0,
    col: 0,
  });
  assert.deepEqual(parseCellLabel('Cross of color Light Gray, row 2, column 5'), {
    state: 'cross',
    color: 'Light Gray',
    row: 1,
    col: 4,
  });
  assert.deepEqual(parseCellLabel('Queen of color Lime Yellow, row 8, column 8'), {
    state: 'queen',
    color: 'Lime Yellow',
    row: 7,
    col: 7,
  });
  assert.equal(parseCellLabel('Reset'), null);
});

test('readBoard reconstructs regions and states from fixture DOM', () => {
  const html = renderFixtureHtml({
    regions: board4,
    colors: board4FixtureColors,
    preset: [
      ['empty', 'queen', 'cross', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
    ],
  });
  const dom = new JSDOM(html);
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;

  const board = readBoard();
  assert.equal(board.n, 4);
  assert.deepEqual(board.regions, [
    ['Vibrant Coral', 'Vibrant Coral', 'Light Gray', 'Light Gray'],
    ['Vibrant Coral', 'Lime Yellow', 'Light Gray', 'Light Gray'],
    ['Lime Yellow', 'Lime Yellow', 'Soft Blue', 'Light Gray'],
    ['Lime Yellow', 'Soft Blue', 'Soft Blue', 'Soft Blue'],
  ]);
  assert.equal(board.states[0][1], 'queen');
  assert.equal(board.states[0][2], 'cross');
  assert.equal(isBoardSolved(board), false);

  delete globalThis.document;
  delete globalThis.window;
});

test('placedQueens requires exactly one queen per row', () => {
  assert.deepEqual(
    placedQueens([
      ['empty', 'queen', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'queen'],
      ['queen', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'queen', 'empty'],
    ]),
    board4Solution,
  );
  assert.equal(
    placedQueens([
      ['queen', 'queen', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
    ]),
    null,
  );
});
