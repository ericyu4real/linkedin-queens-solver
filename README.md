# Queens Auto Solver

A Manifest V3 Chrome extension that fills LinkedIn Queens and Queens Ultimate when you ask it to.

It works for any daily or unlimited board size. It reads the grid from the page (not a screenshot), solves it locally, and clicks the real cells. Nothing is sent off your machine.

A valid solution has exactly one queen in each row, column, and colored region. Queens cannot touch, including diagonally. Two queens farther apart on the same diagonal are allowed.

## Install (load unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select the `extension` folder in this project (`linkedin-queens-solver/extension`), not the repository root.
4. Pin **Queens Auto Solver** from the puzzle-piece menu if you want it on the toolbar.

If you already loaded an older copy, click the reload arrow on the extension card after pulling this change. Detection of Queens Ultimate will not work until you reload.

## How to use

1. Open [LinkedIn Queens](https://www.linkedin.com/games/queens/) or [Queens Ultimate](https://queensultimate.com/unlimited) so the colored grid is visible. On Queens Ultimate, click **Start game** if the board is paused.
2. Click the extension icon.
3. The popup should say it found an N×N Queens board.
4. Click **Autofill**. The extension takes over and places every queen.

It does not fill anything until you click **Autofill**. If the board is already solved, the button stays disabled.

## Tests

```bash
npm install
npx puppeteer browsers install chrome   # first time only, for the unpacked-extension tests
npm test
```

`npm run test:solver` skips Chrome for Testing.

What the tests cover:

- Solver on a 4×4, 5×5, the live 8×8 LinkedIn board (#920), and the live 8×8 Queens Ultimate board (#4107).
- Independent rule checks on every returned placement.
- Queens that share a long diagonal are accepted; adjacent queens are rejected.
- Parser coverage for LinkedIn `aria-label` text and Queens Ultimate `Row … region, empty|marked with X|queen placed` labels.
- Autofill waits for a command: identifying a board does not place queens until `AUTOFILL`.
- Fixture flow for a fresh board and a partially played board (wrong queen plus X marks) on both sites.
- Optional unpacked-extension e2e through the popup Autofill button. Those tests skip if Chrome for Testing cannot launch.

## Project layout

```
extension/           # unpacked extension
  manifest.json
  popup.html/.css/.js
  solver.js          # pure solver, no DOM
  board.js           # DOM read / click / verify
  page.js            # MAIN world: identify board and fill on command
  content.js         # isolated world: popup messaging bridge
  service-worker.js
tests/
```
