# Queens Auto Solver

A Manifest V3 Chrome extension that solves LinkedIn’s Queens puzzle in the page.

When a playable board appears, the extension reads the grid and colored regions from the DOM, computes a solution in local JavaScript, and clicks cells until each queen is on the board. It does not send the board anywhere.

A valid solution has exactly one queen in each row, column, and colored region. Queens cannot touch, including diagonally. Two queens farther apart on the same diagonal are allowed.

## Install (load unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder in this project (`linkedin-queens-solver/extension`), not the repository root.
4. Open [LinkedIn Queens](https://www.linkedin.com/games/queens/), start the game, and wait for the grid. The extension runs on its own once the board is in the page.

Permissions are limited to content scripts on `https://www.linkedin.com/games/*` plus local `http://127.0.0.1/*` / `http://localhost/*` so the fixture tests can load the same unpacked extension. There is no `storage`, `tabs`, or `scripting` permission.

## Tests

```bash
npm install
npx puppeteer browsers install chrome   # first time only, for the end-to-end tests
npm test
```

`npm run test:solver` runs the solver, DOM parser, and local fixture-flow tests (no Chrome).

What the tests cover:

- Solver on a 4×4, 5×5, and the live 8×8 LinkedIn board (#920) captured from the DOM.
- Independent rule checks (not the solver’s own `isValidSolution`) on every returned placement.
- Queens that share a long diagonal are accepted; adjacent queens, including diagonal neighbors, are rejected.
- A 2×2 board has no solution.
- Parser coverage for live `aria-label` text: empty, Cross (X), and Queen.
- Fixture flow: the same `board.js` placer used by the extension solves a local board that mirrors LinkedIn’s cell labels, including a partially played board with a wrong queen and X marks. The fixture then shows **See results**.
- Optional unpacked-extension e2e: Puppeteer loads `extension/` into Chrome for Testing. Those tests skip if Chrome for Testing cannot launch.

Live LinkedIn Queens uses hashed CSS class names, so the extension reads `#queens-game-board`, `[data-testid="interactive-grid"]`, `[data-cell-idx]`, and `aria-label`. Clicks go through the page’s grid `onClick(cellIndex)` handler (empty → Cross → Queen), then each cell is re-read before the next move.

## Manual check on LinkedIn

1. Load the unpacked `extension` folder.
2. Open `https://www.linkedin.com/games/queens/` and click **Start game** if you see the intro.
3. When the colored grid appears, the extension should place queens without further clicks.
4. Confirm LinkedIn itself treats the puzzle as solved. Guest completion goes to `/games/queens/results/guest/` with `gamePlayState=END_SOLVED`, a **Copy score** control, and a card such as “You’re crushing it!”.
5. Optional: click **Reset**, place a wrong queen and a few X marks, reload the page, and confirm it still finishes from that partial state.

The solver ignores existing marks when computing the answer, then clears incorrect queens and turns leftover X marks on solution cells into queens. After each click it re-reads that cell’s `aria-label` before continuing. It stops once the board is solved and will not start another run for the same region layout if the page re-renders.

## Project layout

```
extension/           # unpacked extension
  manifest.json
  solver.js          # pure solver, no DOM
  board.js           # DOM read / click / verify
  content.js         # waits for the board and runs once
tests/
  solver.test.mjs
  board.test.mjs
  fixture-flow.test.mjs
  e2e.test.mjs       # unpacked extension in Chrome for Testing
  boards.mjs         # representative puzzles, including live #920
  fixture-html.mjs   # local board that matches LinkedIn cell labels
```
