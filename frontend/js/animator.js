const Animator = (() => {
  let writer = null;
  let charData = null;
  let strokeIndex = 0;
  let animSpeed = 1;
  let loopTimer = null;
  let onStrokeCallback = null;
  let running = false;
  let activeTarget = null;
  let generation = 0; // guards against stale callbacks

  function init(char, container, { speed = 1, onStroke, onLoad, onError, charDataLoader } = {}) {
    _stop();
    animSpeed = speed;
    onStrokeCallback = onStroke || null;
    activeTarget = container;
    container.innerHTML = '';

    const size = Math.min(
      (container.closest('.center')?.offsetWidth || 520) - 80,
      400
    );

    const myGen = ++generation;

    const opts = {
      width: Math.max(size, 200),
      height: Math.max(size, 200),
      padding: Math.round(Math.max(size, 200) * 0.06),
      showOutline: true,
      strokeColor: '#111009',
      outlineColor: '#e4dfd6',
      strokeAnimationSpeed: animSpeed,
      delayBetweenStrokes: 300,
      renderer: 'svg',
      onLoadCharDataSuccess: (data) => {
        if (myGen !== generation) return; // stale, a newer init() happened
        charData = data;
        if (onLoad) onLoad(data);
        _startLoop(myGen);
      },
      onLoadCharDataError: () => {
        if (myGen !== generation) return;
        if (onError) onError();
      },
    };
    if (charDataLoader) opts.charDataLoader = charDataLoader;
    writer = HanziWriter.create(container, char, opts);
  }

  function _startLoop(myGen) {
    if (!writer || !charData || myGen !== generation) return;
    running = true;
    strokeIndex = 0;
    writer.hideCharacter({ duration: 0 });
    _next(myGen);
  }

  function _next(myGen) {
    if (!running || myGen !== generation) return;

    if (strokeIndex >= charData.strokes.length) {
      loopTimer = setTimeout(() => {
        if (!running || myGen !== generation) return;
        strokeIndex = 0;
        writer.hideCharacter({ duration: 200 });
        loopTimer = setTimeout(() => _next(myGen), 500);
      }, 900);
      return;
    }

    _showDot(strokeIndex);
    if (onStrokeCallback) onStrokeCallback(strokeIndex + 1, charData.strokes.length);

    const capturedIdx = strokeIndex;
    writer.animateStroke(capturedIdx, {
      strokeAnimationSpeed: animSpeed,
      onComplete: () => {
        if (!running || myGen !== generation) return;
        _removeDot();
        strokeIndex++;
        loopTimer = setTimeout(() => _next(myGen), 180);
      },
    });
  }

  function replay() {
    if (!writer || !charData) return;
    const myGen = ++generation;
    running = false;
    clearTimeout(loopTimer);
    _removeDot();
    try { writer.cancelAnimation(); } catch (_) {}
    running = true;
    strokeIndex = 0;
    writer.hideCharacter({ duration: 150 });
    loopTimer = setTimeout(() => _next(myGen), 280);
  }

  function stop() { _stop(); }

  function _stop() {
    running = false;
    clearTimeout(loopTimer);
    _removeDot();
    if (writer) { try { writer.cancelAnimation(); } catch (_) {} }
  }

  function setSpeed(s) { animSpeed = s; }

  function _showDot(idx) {
    _removeDot();
    if (!activeTarget || !charData) return;
    const svgEl = activeTarget.querySelector('svg');
    if (!svgEl) return;
    const pt = _firstPoint(charData.strokes[idx]);
    if (!pt) return;

    const ns = 'http://www.w3.org/2000/svg';
    const vb = svgEl.viewBox.baseVal;
    const svgH = vb.height || 1024;

    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('data-start-dot', '1');
    dot.setAttribute('cx', pt[0]);
    dot.setAttribute('cy', svgH - pt[1]);
    dot.setAttribute('r', 28);
    dot.setAttribute('fill', '#cc3120');
    dot.setAttribute('opacity', '0.75');
    dot.setAttribute('pointer-events', 'none');
    const title = document.createElementNS(ns, 'title');
    title.textContent = 'Start here';
    dot.appendChild(title);
    svgEl.appendChild(dot);
  }

  function _removeDot() {
    document.querySelectorAll('[data-start-dot]').forEach(el => el.remove());
  }

  function _firstPoint(path) {
    const m = path.match(/^M\s*([-\d.]+)[,\s]+([-\d.]+)/i);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  }

  return { init, replay, stop, setSpeed };
})();
