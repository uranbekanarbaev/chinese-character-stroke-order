const Draw = (() => {
  const RECOGNIZE_URL = 'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&num=8';
  const CHINESE_RE = /[一-鿿㐀-䶿豈-﫿]/;

  const drawArea      = document.getElementById('drawArea');
  const siteCanvas    = document.getElementById('siteCanvas');
  const siteClear     = document.getElementById('siteClear');
  const drawActions   = document.getElementById('drawActions');
  const siteRecognize = document.getElementById('siteRecognize');
  const drawStatus    = document.getElementById('drawStatus');
  const drawSuggestions = document.getElementById('drawSuggestions');

  const ctx = siteCanvas.getContext('2d');
  ctx.strokeStyle = '#111009';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let ink = [];
  let currentStroke = null;
  let drawing = false;
  let hasDrawn = false;
  let onRecognize = null;

  // ── Canvas drawing ──────────────────────────────────────────────────────────
  function getPos(e) {
    const r = siteCanvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  siteCanvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    currentStroke = { xs: [x], ys: [y], ts: [Date.now()] };
    siteCanvas.setPointerCapture(e.pointerId);
  });

  siteCanvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    currentStroke.xs.push(x);
    currentStroke.ys.push(y);
    currentStroke.ts.push(Date.now());
  });

  siteCanvas.addEventListener('pointerup', () => {
    if (!drawing || !currentStroke) return;
    drawing = false;
    ink.push(currentStroke);
    currentStroke = null;

    if (!hasDrawn) {
      hasDrawn = true;
      siteClear.hidden = false;
      drawActions.hidden = false;
    }
  });

  siteClear.addEventListener('click', clear);

  function clear() {
    ctx.clearRect(0, 0, siteCanvas.width, siteCanvas.height);
    ink = [];
    hasDrawn = false;
    siteClear.hidden = true;
    drawActions.hidden = true;
    drawSuggestions.hidden = true;
    drawStatus.textContent = '';
  }

  // ── Recognition ─────────────────────────────────────────────────────────────
  siteRecognize.addEventListener('click', async () => {
    if (!ink.length) return;
    siteRecognize.disabled = true;
    drawStatus.textContent = 'Recognizing…';
    drawSuggestions.hidden = true;

    try {
      const results = await _recognize(ink);
      drawStatus.textContent = '';
      if (results.length) {
        _showSuggestions(results);
      } else {
        drawStatus.textContent = 'No match. Try again.';
      }
    } catch {
      drawStatus.textContent = 'Check your connection.';
    } finally {
      siteRecognize.disabled = false;
    }
  });

  async function _recognize(strokes) {
    const inkData = strokes.map(s => [s.xs, s.ys, s.ts]);
    const body = {
      requests: [{
        writing_guide: { writing_area_width: siteCanvas.width, writing_area_height: siteCanvas.height },
        ink: inkData,
        language: 'zh',
      }],
    };
    const resp = await fetch(RECOGNIZE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (data[0] !== 'SUCCESS') throw new Error('API error');
    return data[1][0][1].filter(c => CHINESE_RE.test(c)).slice(0, 8);
  }

  function _showSuggestions(chars) {
    drawSuggestions.innerHTML = '';
    chars.forEach(char => {
      const btn = document.createElement('button');
      btn.className = 'draw-sug-btn';
      btn.textContent = char;
      btn.title = char;
      btn.addEventListener('click', () => {
        if (typeof onRecognize === 'function') onRecognize(char);
        clear();
      });
      drawSuggestions.appendChild(btn);
    });
    drawSuggestions.hidden = false;
  }

  function show() { drawArea.hidden = false; }
  function hide() { drawArea.hidden = true; }
  function isVisible() { return !drawArea.hidden; }

  function onChar(fn) { onRecognize = fn; }

  return { show, hide, isVisible, onChar, clear };
})();
