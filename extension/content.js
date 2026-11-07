const COMMAND = 'queens-solver-command';
const RESULT = 'queens-solver-result';

function sendToPage(type, timeoutMs) {
  return new Promise((resolve) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timer = setTimeout(() => {
      window.removeEventListener(RESULT, onResult);
      resolve({ ok: false, error: 'timeout' });
    }, timeoutMs);

    function onResult(event) {
      const detail = event.detail || {};
      if (detail.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener(RESULT, onResult);
      resolve(detail);
    }

    window.addEventListener(RESULT, onResult);
    window.dispatchEvent(new CustomEvent(COMMAND, { detail: { type, id } }));
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || (msg.type !== 'GET_STATUS' && msg.type !== 'AUTOFILL')) return undefined;
  const timeoutMs = msg.type === 'AUTOFILL' ? 30000 : 2000;
  sendToPage(msg.type, timeoutMs).then(sendResponse);
  return true;
});
