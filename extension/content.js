import {
  applySolution,
  boardFingerprint,
  isBoardSolved,
  looksLikeLinkedInCompletion,
  readBoard,
  solveBoard,
} from './board.js';

const RUN_ATTR = 'data-queens-auto-solver';
const DEBOUNCE_MS = 400;

let running = false;
let solvedFingerprint = null;
let observer = null;
let debounceTimer = null;

function mark(status) {
  const grid = document.querySelector('[data-testid="interactive-grid"]');
  if (grid) grid.setAttribute(RUN_ATTR, status);
}

async function waitForPlayableBoard(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const board = readBoard();
    if (board) return board;
    await new Promise((r) => setTimeout(r, 100));
  }
  return readBoard();
}

async function runSolver() {
  if (running) return;
  const board = readBoard();
  if (!board) return;

  const fingerprint = boardFingerprint(board.regions);
  if (solvedFingerprint === fingerprint) return;
  if (isBoardSolved(board) || looksLikeLinkedInCompletion()) {
    solvedFingerprint = fingerprint;
    mark('solved');
    return;
  }

  running = true;
  mark('running');

  try {
    const queens = solveBoard(board);
    if (!queens) {
      mark('unsolved');
      console.warn('[Queens solver] No valid placement for this board.');
      return;
    }

    const result = await applySolution(readBoard() || board, queens);

    const latest = readBoard();
    if ((latest && isBoardSolved(latest)) || result.solved || looksLikeLinkedInCompletion()) {
      solvedFingerprint = fingerprint;
      mark('solved');
    } else {
      mark('incomplete');
    }
  } catch (err) {
    console.warn('[Queens solver]', err);
    mark('error');
  } finally {
    running = false;
  }
}

function scheduleRun() {
  if (running) return;
  const board = readBoard();
  if (!board) return;
  const fingerprint = boardFingerprint(board.regions);
  if (solvedFingerprint === fingerprint) return;
  if (isBoardSolved(board) || looksLikeLinkedInCompletion()) {
    solvedFingerprint = fingerprint;
    mark('solved');
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runSolver();
  }, DEBOUNCE_MS);
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver(() => scheduleRun());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label'],
  });
}

waitForPlayableBoard().then((board) => {
  startObserver();
  if (board) scheduleRun();
});

startObserver();
