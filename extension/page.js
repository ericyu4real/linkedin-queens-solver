import {
  applySolution,
  ensureBoardInteractive,
  isBoardSolved,
  looksLikeCompletion,
  readBoard,
  solveBoard,
} from './board.js';

const RUN_ATTR = 'data-queens-auto-solver';
const COMMAND = 'queens-solver-command';
const RESULT = 'queens-solver-result';

let running = false;

function mark(status) {
  const grid =
    document.querySelector('[data-testid="interactive-grid"]') || document.querySelector('.board-grid');
  if (grid) grid.setAttribute(RUN_ATTR, status);
}

function reply(id, payload) {
  window.dispatchEvent(
    new CustomEvent(RESULT, {
      detail: { id, ...payload },
    }),
  );
}

function isQueensUrl() {
  const href = location.href;
  return /\/games\/queens(\/|$|\?)/i.test(href) || /queensultimate\.com/i.test(href);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStatus() {
  if (looksLikeCompletion()) {
    const board = readBoard();
    return {
      ok: true,
      identified: true,
      hasBoard: true,
      n: board ? board.n : null,
      solved: true,
      completed: true,
    };
  }

  const board = readBoard();
  if (!board) {
    return {
      ok: true,
      identified: isQueensUrl(),
      hasBoard: false,
      n: null,
      solved: false,
      completed: false,
    };
  }

  const solved = isBoardSolved(board);
  return {
    ok: true,
    identified: true,
    hasBoard: true,
    n: board.n,
    solved,
    completed: solved,
  };
}

async function runSolver() {
  if (running) {
    return { ok: false, error: 'already-running' };
  }

  const status = getStatus();
  if (status.completed || status.solved) {
    mark('solved');
    return { ok: true, solved: true, n: status.n };
  }
  if (!status.hasBoard) {
    return {
      ok: false,
      error: status.identified ? 'need-start' : 'not-queens',
    };
  }

  running = true;
  mark('running');

  try {
    ensureBoardInteractive();
    await sleep(250);

    const board = readBoard();
    if (!board) {
      mark('unsolved');
      return { ok: false, error: 'need-start' };
    }

    const queens = solveBoard(board);
    if (!queens) {
      mark('unsolved');
      return { ok: false, error: 'no-solution', n: board.n };
    }

    const result = await applySolution(readBoard() || board, queens);
    const latest = readBoard();
    const solved = !!(latest && isBoardSolved(latest)) || result.solved || looksLikeCompletion();
    mark(solved ? 'solved' : 'incomplete');
    return { ok: solved, solved, n: board.n };
  } catch (err) {
    mark('error');
    return { ok: false, error: String(err && err.message ? err.message : err) };
  } finally {
    running = false;
  }
}

window.addEventListener(COMMAND, async (event) => {
  const detail = event.detail || {};
  const id = detail.id;
  if (detail.type === 'GET_STATUS') {
    reply(id, getStatus());
    return;
  }
  if (detail.type === 'AUTOFILL') {
    reply(id, await runSolver());
  }
});
