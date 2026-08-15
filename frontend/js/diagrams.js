const Diagrams = (() => {
  const GREY = '#c0b8b0';
  const RED  = '#cc3120';
  const FAST = 60;

  function render(char, container, charDataLoader) {
    container.innerHTML = '<div class="diagrams-loading">Loading…</div>';

    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(probe);

    const probeOpts = {
      width: 1, height: 1, padding: 0,
      onLoadCharDataSuccess: (data) => {
        probe.remove();
        container.innerHTML = '';
        _buildCards(char, data.strokes.length, container, charDataLoader);
      },
      onLoadCharDataError: () => {
        probe.remove();
        container.innerHTML = '<p class="diagrams-error">Could not load diagrams.</p>';
      },
    };
    if (charDataLoader) probeOpts.charDataLoader = charDataLoader;
    HanziWriter.create(probe, char, probeOpts);
  }

  function _buildCards(char, total, container, charDataLoader) {
    for (let i = 1; i <= total; i++) {
      const card = document.createElement('div');
      card.className = 'diagram-card';

      const wrap = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'diagram-label';
      label.textContent = i;

      card.appendChild(wrap);
      card.appendChild(label);
      container.appendChild(card);

      _renderCard(wrap, char, i - 1, charDataLoader);
    }
  }

  function _renderCard(container, char, targetStroke, charDataLoader) {
    const cardOpts = {
      width: 72,
      height: 72,
      padding: 5,
      showOutline: true,
      strokeColor: GREY,
      outlineColor: '#ece7e0',
      renderer: 'svg',
      showCharacter: false,
      onLoadCharDataSuccess: () => {
        w.hideCharacter({ duration: 0 });
        _drawUpTo(w, 0, targetStroke);
      },
    };
    if (charDataLoader) cardOpts.charDataLoader = charDataLoader;
    const w = HanziWriter.create(container, char, cardOpts);
  }

  function _drawUpTo(writer, current, target) {
    if (current > target) return;

    const isLast = current === target;
    if (isLast) writer.updateColor('strokeColor', RED);
    else writer.updateColor('strokeColor', GREY);

    writer.animateStroke(current, {
      strokeAnimationSpeed: FAST,
      onComplete: () => _drawUpTo(writer, current + 1, target),
    });
  }

  return { render };
})();
