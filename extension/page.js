import {
  applySolution,
  isBoardSolved,
  looksLikeLinkedInCompletion,
  readBoard,
  solveBoard,
} from './board.js';

const RUN_ATTR = 'data-queens-auto-solver';
const COMMAND = 'queens-solver-command';
const RESULT = 'queens-solver-result';

let running = false;

function mark(status) {
  const grid = document.querySelector('[data-testid="interactive-grid"]');
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
  return /\/games\/queens(\/|$|\?)/i.test(location.href);
}

function getStatus() {
  if (looksLikeLinkedInCompletion()) {
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
    const board = readBoard();
    const queens = solveBoard(board);
    if (!queens) {
      mark('unsolved');
      return { ok: false, error: 'no-solution', n: board.n };
    }

    const result = await applySolution(readBoard() || board, queens);
    const latest = readBoard();
    const solved = !!(latest && isBoardSolved(latest)) || result.solved || looksLikeLinkedInCompletion();
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
