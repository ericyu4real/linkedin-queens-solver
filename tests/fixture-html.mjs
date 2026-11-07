const STATE_LABEL = {
  empty: 'Empty cell',
  cross: 'Cross',
  queen: 'Queen',
};

function labelFor(state, colorName, row, col) {
  return `${STATE_LABEL[state]} of color ${colorName}, row ${row + 1}, column ${col + 1}`;
}

function cellHtml(idx, n, regions, colors, preset, r, c) {
  const key = regions[r][c];
  const color = colors[key];
  const state = (preset && preset[r] && preset[r][c]) || 'empty';
  const extraClass = c === n - 1 ? ' last-col' : '';
  return `<div class="queens-cell${extraClass}" data-cell-idx="${idx}" data-testid="cell-${idx}" data-color-key="${key}" aria-label="${labelFor(state, color.name, r, c)}" tabindex="-1" role="button" aria-disabled="false" style="background:${color.bg}"></div>`;
}

export function renderFixtureHtml({
  regions,
  colors,
  preset,
  title = 'Queens fixture',
} = {}) {
  const n = regions.length;
  const cells = [];
  let idx = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cells.push(cellHtml(idx, n, regions, colors, preset, r, c));
      idx += 1;
    }
  }

  const colorMap = Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [key, value.name]),
  );

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; background: #f3f2ef; padding: 24px; }
    #queens-game-board { width: min(420px, 90vw); }
    [data-testid="interactive-grid"] {
      display: grid;
      grid-template-columns: repeat(${n}, 1fr);
      width: 100%;
      aspect-ratio: 1;
      border: 3px solid #111;
    }
    .queens-cell { border: 1px solid #111; cursor: pointer; }
    #status { margin-top: 12px; }
    #completion { margin-top: 16px; padding: 12px; background: #fff; border-radius: 8px; }
    #completion[hidden] { display: none; }
  </style>
</head>
<body>
  <h1>Queens</h1>
  <p>NO.fixture</p>
  <section id="queens-game-board" aria-label="Press enter to gameboard">
    <p aria-hidden="true">LinkedIn Games Interactive Grid Component.</p>
    <div dir="ltr" data-testid="interactive-grid" data-trail-grid="" style="--rows: ${n}; --columns: ${n};">
      ${cells.join('')}
    </div>
  </section>
  <p id="status">playing</p>
  <div id="completion" hidden>
    <h2>Great job</h2>
    <button type="button">See results</button>
  </div>
  <script type="application/json" id="fixture-data">${JSON.stringify({ regions, colorMap, n })}</script>
  <script>
    const ORDER = ['empty', 'cross', 'queen'];
    const STATE_LABEL = { empty: 'Empty cell', cross: 'Cross', queen: 'Queen' };
    const data = JSON.parse(document.getElementById('fixture-data').textContent);
    const n = data.n;
    const regions = data.regions;
    const colorMap = data.colorMap;

    function parseLabel(label) {
      const m = label.match(/^(Empty cell|Cross|Queen) of color (.+), row (\\d+), column (\\d+)$/);
      if (!m) return null;
      return {
        state: m[1] === 'Queen' ? 'queen' : m[1] === 'Cross' ? 'cross' : 'empty',
        color: m[2],
        row: Number(m[3]) - 1,
        col: Number(m[4]) - 1,
      };
    }

    function setLabel(el, state) {
      const parsed = parseLabel(el.getAttribute('aria-label'));
      el.setAttribute('aria-label', STATE_LABEL[state] + ' of color ' + parsed.color + ', row ' + (parsed.row + 1) + ', column ' + (parsed.col + 1));
    }

    function queensTouch(r1, c1, r2, c2) {
      return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) === 1;
    }

    function boardSolved() {
      const cells = [...document.querySelectorAll('[data-cell-idx]')];
      const queens = Array(n).fill(-1);
      const cols = new Set();
      const regs = new Set();
      for (const el of cells) {
        const parsed = parseLabel(el.getAttribute('aria-label'));
        if (parsed.state !== 'queen') continue;
        if (queens[parsed.row] !== -1) return false;
        queens[parsed.row] = parsed.col;
        if (cols.has(parsed.col)) return false;
        cols.add(parsed.col);
        const region = colorMap[regions[parsed.row][parsed.col]] || regions[parsed.row][parsed.col];
        if (regs.has(region)) return false;
        regs.add(region);
      }
      if (queens.some((c) => c < 0) || cols.size !== n || regs.size !== n) return false;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (queensTouch(i, queens[i], j, queens[j])) return false;
        }
      }
      return true;
    }

    function completeIfSolved() {
      if (!boardSolved()) return;
      document.getElementById('status').textContent = 'solved';
      document.getElementById('completion').hidden = false;
      for (const el of document.querySelectorAll('[data-cell-idx]')) {
        el.setAttribute('aria-disabled', 'true');
      }
    }

    for (const el of document.querySelectorAll('[data-cell-idx]')) {
      el.addEventListener('click', () => {
        if (el.getAttribute('aria-disabled') === 'true') return;
        const parsed = parseLabel(el.getAttribute('aria-label'));
        const next = ORDER[(ORDER.indexOf(parsed.state) + 1) % ORDER.length];
        setLabel(el, next);
        completeIfSolved();
      });
    }

    completeIfSolved();
  </script>
</body>
</html>`;
}
