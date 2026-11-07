const statusEl = document.getElementById('status');
const button = document.getElementById('autofill');
const hint = document.getElementById('hint');

const TAB_QUERY = {
  url: [
    'https://www.linkedin.com/games/*',
    'http://127.0.0.1/*',
    'http://localhost/*',
  ],
};

function setView({ text, enabled, hintText }) {
  statusEl.textContent = text;
  button.disabled = !enabled;
  if (hintText) hint.textContent = hintText;
}

function statusMessage(info) {
  if (!info || info.error === 'timeout') {
    return {
      text: 'No Queens board on this page.',
      enabled: false,
      hintText: 'Open LinkedIn Queens and start the game first.',
    };
  }
  if (info.completed || info.solved) {
    return {
      text: info.n ? `${info.n}×${info.n} Queens board is already solved.` : 'This Queens board is already solved.',
      enabled: false,
      hintText: 'LinkedIn should show the results screen.',
    };
  }
  if (info.hasBoard) {
    return {
      text: `Found a ${info.n}×${info.n} Queens board.`,
      enabled: true,
      hintText: 'Click Autofill to place every queen.',
    };
  }
  if (info.identified) {
    return {
      text: 'Queens is open, but the board is not on screen yet.',
      enabled: false,
      hintText: 'Click Start game, then open this popup again.',
    };
  }
  return {
    text: 'This is not a Queens game.',
    enabled: false,
    hintText: 'Go to LinkedIn Queens, then click the extension again.',
  };
}

async function askTab(tabId, type) {
  return chrome.tabs.sendMessage(tabId, { type });
}

async function findQueensTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id) {
    try {
      const info = await askTab(active.id, 'GET_STATUS');
      if (info?.identified || info?.hasBoard) return { tab: active, info };
    } catch {
      // Active tab has no solver content script.
    }
  }

  const tabs = await chrome.tabs.query(TAB_QUERY);
  for (const tab of tabs) {
    if (!tab.id || tab.id === active?.id) continue;
    try {
      const info = await askTab(tab.id, 'GET_STATUS');
      if (info?.identified || info?.hasBoard) return { tab, info };
    } catch {
      // Tab is a matching URL without a live content script.
    }
  }

  return { tab: active, info: null };
}

let targetTabId = null;

async function refresh() {
  setView({ text: 'Looking for a Queens board…', enabled: false });
  try {
    const { tab, info } = await findQueensTab();
    targetTabId = tab?.id ?? null;
    setView(statusMessage(info));
  } catch (err) {
    targetTabId = null;
    setView({
      text: 'Could not reach the page.',
      enabled: false,
      hintText: String(err && err.message ? err.message : err),
    });
  }
}

button.addEventListener('click', async () => {
  if (!targetTabId) {
    await refresh();
    if (!targetTabId || button.disabled) return;
  }
  button.disabled = true;
  statusEl.textContent = 'Filling queens…';
  try {
    const result = await askTab(targetTabId, 'AUTOFILL');
    if (result?.solved || result?.ok) {
      setView({
        text: result.n ? `Filled the ${result.n}×${result.n} board.` : 'Filled the Queens board.',
        enabled: false,
        hintText: 'LinkedIn should now show the completed game.',
      });
      return;
    }
    if (result?.error === 'need-start') {
      setView(statusMessage({ identified: true, hasBoard: false }));
      return;
    }
    if (result?.error === 'not-queens') {
      setView(statusMessage({ identified: false, hasBoard: false }));
      return;
    }
    if (result?.error === 'already-running') {
      setView({
        text: 'Already filling this board.',
        enabled: false,
        hintText: 'Wait for the current Autofill to finish.',
      });
      return;
    }
    setView({
      text: 'Could not fill this board.',
      enabled: true,
      hintText: result?.error ? String(result.error) : 'Try starting the game again, then click Autofill.',
    });
  } catch (err) {
    setView({
      text: 'Autofill failed.',
      enabled: true,
      hintText: String(err && err.message ? err.message : err),
    });
  }
});

refresh();
