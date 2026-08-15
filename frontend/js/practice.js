const Practice = (() => {
  let writer = null;
  let mistakeCount = 0;
  let correctCount = 0;
  let totalStrokes = 0;
  let active = false;

  const practiceArea    = document.getElementById('practiceArea');
  const practiceChar    = document.getElementById('practiceChar');
  const practiceTarget  = document.getElementById('practiceTarget');
  const practiceFeedback= document.getElementById('practiceFeedback');
  const practiceScore   = document.getElementById('practiceScore');
  const scoreIcon       = document.getElementById('scoreIcon');
  const scoreText       = document.getElementById('scoreText');
  const retryBtn        = document.getElementById('retryBtn');
  const practiceExit    = document.getElementById('practiceExit');

  retryBtn.addEventListener('click', () => _restart());
  practiceExit.addEventListener('click', () => exit());

  function start(char, charDataLoader) {
    if (!char) return;
    active = true;
    practiceChar.textContent = char;
    practiceScore.hidden = true;
    practiceFeedback.textContent = '';
    practiceFeedback.className = 'practice-feedback';
    practiceTarget.innerHTML = '';
    mistakeCount = 0;
    correctCount = 0;
    totalStrokes = 0;

    practiceArea.hidden = false;

    const size = Math.min(
      (practiceTarget.closest('.center')?.offsetWidth || 500) - 80,
      400
    );

    const practiceOpts = {
      width: size,
      height: size,
      padding: Math.round(size * 0.06),
      showOutline: true,
      strokeColor: '#333',
      outlineColor: '#e4dfd6',
      highlightColor: '#cc3120',
      drawingColor: '#cc3120',
      drawingWidth: 4,
      showCharacter: false,
      showHintAfterMisses: 2,
      renderer: 'svg',
      onLoadCharDataSuccess: (data) => {
        totalStrokes = data.strokes.length;
        _quiz(char);
      },
    };
    if (charDataLoader) practiceOpts.charDataLoader = charDataLoader;
    writer = HanziWriter.create(practiceTarget, char, practiceOpts);
  }

  function _quiz(char) {
    writer.quiz({
      onMistake: (strokeData) => {
        mistakeCount++;
        practiceFeedback.textContent = `Wrong stroke — try again (hint in ${Math.max(0, 2 - strokeData.totalMistakes)} more)`;
        practiceFeedback.className = 'practice-feedback wrong';
        setTimeout(() => {
          if (active) practiceFeedback.className = 'practice-feedback';
        }, 1200);
      },
      onCorrectStroke: (strokeData) => {
        correctCount++;
        const remaining = strokeData.strokesRemaining;
        practiceFeedback.textContent = remaining > 0
          ? `✓  ${remaining} stroke${remaining !== 1 ? 's' : ''} left`
          : '';
        practiceFeedback.className = 'practice-feedback correct';
      },
      onComplete: (summary) => {
        active = false;
        _showScore(summary);
        ampWeb.track('Сайт_практика_завершена', {
          иероглиф:  char,
          ошибок:    summary.totalMistakes,
          черт:      totalStrokes,
        });
      },
    });
  }

  function _restart() {
    const char = practiceChar.textContent;
    if (char) start(char);
  }

  function _showScore(summary) {
    const { icon, text } = CHAR_LOOKUP.scoreLabel(summary.totalMistakes, totalStrokes);
    scoreIcon.textContent = icon;
    scoreText.textContent = text;
    practiceScore.hidden = false;
    practiceFeedback.textContent = '';
  }

  function exit() {
    active = false;
    practiceArea.hidden = true;
    if (writer) { try { writer.cancelQuiz(); } catch (_) {} }
    writer = null;
  }

  function isActive() { return !practiceArea.hidden; }

  return { start, exit, isActive };
})();
