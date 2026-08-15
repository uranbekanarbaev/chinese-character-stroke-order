const { CHINESE_RE, toScriptChar, resolveCharacterFromInput } = CHAR_LOOKUP;

const PINYIN_MAP = {
  'wo':'我','ni':'你','ta':'他','men':'们','shi':'是','de':'的',
  'bu':'不','zhe':'这','ge':'个','ren':'人','you':'有','lai':'来',
  'guo':'国','zhong':'中','xue':'学','jia':'家','kan':'看','shang':'上',
  'xia':'下','da':'大','xiao':'小','shan':'山','shui':'水','huo':'火',
  'ri':'日','yue':'月','tian':'天','di':'地','ai':'爱','hao':'好',
  'men2':'门','ma':'吗','mu':'木','jin':'金','tu':'土','shuo':'说',
  'zhi':'知','dao':'道','le':'了','na':'那','yi':'一',
};

const PINYIN_MAP_TRAD = {
  ...PINYIN_MAP,
  'men':'們','lai':'來','guo':'國','xue':'學','ai':'愛',
  'men2':'門','shuo':'說','zhe':'這','ge':'個','you':'還',
};

const SIMP_TO_TRAD = {
  '们':'們','来':'來','国':'國','学':'學','爱':'愛','门':'門',
  '说':'說','这':'這','个':'個','书':'書','车':'車','话':'話',
  '电':'電','语':'語','词':'詞','读':'讀','写':'寫','时':'時',
  '动':'動','见':'見','为':'為','长':'長','发':'發','过':'過',
  '还':'還','会':'會','机':'機','记':'記','进':'進','开':'開',
  '乐':'樂','没':'沒','年':'年','气':'氣','钱':'錢','让':'讓',
  '认':'認','上':'上','时':'時','事':'事','说':'說','听':'聽',
  '图':'圖','问':'問','现':'現','想':'想','小':'小','义':'義',
};

// ── DOM refs ────────────────────────────────────────────────────────────────
const searchInput     = document.getElementById('searchInput');
const searchBtn       = document.getElementById('searchBtn');
const emptyState      = document.getElementById('emptyState');
const errorState      = document.getElementById('errorState');
const animArea        = document.getElementById('animArea');
const writerTarget    = document.getElementById('writerTarget');
const strokeCounter   = document.getElementById('strokeCounter');
const animChar        = document.getElementById('animChar');
const diagramsArea    = document.getElementById('diagramsArea');
const diagramsGrid    = document.getElementById('diagramsGrid');
const charInfoSection = document.getElementById('charInfoSection');
const charInfoBig     = document.getElementById('charInfoBig');
const charInfoMeta    = document.getElementById('charInfoMeta');
const practiceArea    = document.getElementById('practiceArea');

const railReplay      = document.getElementById('railReplay');
const railPrint       = document.getElementById('railPrint');
const railSearch      = document.getElementById('railSearch');
const railDraw        = document.getElementById('railDraw');
const btnPractice     = document.getElementById('btnPractice');
const animActions     = document.getElementById('animActions');

const btnSimplified   = document.getElementById('btnSimplified');
const btnTraditional  = document.getElementById('btnTraditional');
const themeBtn        = document.getElementById('themeBtn');
const themeIcon       = document.getElementById('themeIcon');
const rateStars       = document.getElementById('rateStars');
const rateLabel       = document.getElementById('rateLabel');

let currentChar  = '';
let currentSpeed = 1;
let isDark = false;

// ── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  themeIcon.textContent = dark ? '☾' : '☀';
  localStorage.setItem('_csotheme', dark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('_csotheme');
if (savedTheme) applyTheme(savedTheme === 'dark');
else if (window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme(true);

themeBtn.addEventListener('click', () => { applyTheme(!isDark); });

// ── Script toggle ─────────────────────────────────────────────────────────────
let useTraditional = false;

btnSimplified.addEventListener('click', () => setScript(false));
btnTraditional.addEventListener('click', () => setScript(true));

function setScript(trad) {
  useTraditional = trad;
  btnSimplified.classList.toggle('active', !trad);
  btnTraditional.classList.toggle('active', trad);
  const script_val = trad ? 'traditional' : 'simplified';
  ampWeb.track('Сайт_письмо_изменено', { значение: trad ? 'традиционное' : 'упрощённое' });
  if (currentChar) loadChar(currentChar);
}

// ── Speed ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.seg-btn[data-speed]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn[data-speed]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSpeed = parseFloat(btn.dataset.speed);
    const speed_val = btn.textContent.trim().toLowerCase();
    ampWeb.track('Сайт_скорость_изменена', { значение: speed_val });
    Animator.setSpeed(currentSpeed);
    if (currentChar) loadChar(currentChar);
  });
});

// ── Search ────────────────────────────────────────────────────────────────────
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSearch(); });
railSearch.addEventListener('click', () => {
  Practice.exit();
  searchInput.focus();
  searchInput.select();
});

function handleSearch() {
  const raw = searchInput.value.trim();
  if (!raw) return;

  const char = resolveCharacterFromInput(raw, {
    useTraditional, simpToTrad: SIMP_TO_TRAD, pinyinMap: PINYIN_MAP, pinyinMapTrad: PINYIN_MAP_TRAD,
  });

  if (!char) { showError(); return; }
  searchInput.value = char;
  loadChar(char);
}

// ── Load character ────────────────────────────────────────────────────────────
function loadChar(char) {
  currentChar = char;
  Practice.exit();

  emptyState.hidden      = true;
  errorState.hidden      = true;
  animArea.hidden        = false;
  diagramsArea.hidden    = true;
  charInfoSection.hidden = true;

  Draw.hide();
  Draw.clear();
  if (railDraw) railDraw.classList.remove('active');
  railSearch.classList.add('active');

  animChar.textContent   = char;
  strokeCounter.textContent = '';

  setRailEnabled(false);

  const _письмо    = useTraditional ? 'традиционное' : 'упрощённое';
  const _loadStart = Date.now();

  ampWeb.track('Сайт_иероглиф_запрошено', {
    иероглиф: char,
    письмо:   _письмо,
  });

  Animator.init(char, writerTarget, {
    speed: currentSpeed,
    onStroke: (cur, total) => {
      strokeCounter.textContent = `Stroke ${cur} of ${total}`;
    },
    onLoad: (data) => {
      const total = data.strokes.length;
      strokeCounter.textContent = `Stroke 1 of ${total}`;

      charInfoBig.textContent  = char;
      charInfoMeta.textContent = `${total} stroke${total !== 1 ? 's' : ''}`;
      charInfoSection.hidden   = false;

      diagramsArea.hidden = false;
      Diagrams.render(char, diagramsGrid);

      setRailEnabled(true);
      const load_ms = Date.now() - _loadStart;
      const { номер_запроса, первый_запрос, aha_triggered } = ampWeb.onSuccessfulRequest(_письмо);
      ampWeb.track('Сайт_иероглиф_получено', {
        иероглиф:      char,
        черт:          total,
        письмо:        _письмо,
        время_мс:      load_ms,
        номер_запроса,
        первый_запрос,
      });
      if (aha_triggered) { /* AHA moment уже отправлен в onSuccessfulRequest */ }
    },
    onError: showError,
  });
}

function showError() {
  emptyState.hidden      = true;
  errorState.hidden      = false;
  animArea.hidden        = true;
  diagramsArea.hidden    = true;
  charInfoSection.hidden = true;
  setRailEnabled(false);
  ampWeb.track('Сайт_иероглиф_ошибка', { запрос: searchInput.value, ошибка: 'не_найдено' });
}

function setRailEnabled(on) {
  railReplay.disabled = !on;
  railPrint.disabled  = !on;
  if (animActions) animActions.hidden = !on;
}

// ── Rail actions ──────────────────────────────────────────────────────────────
railReplay.addEventListener('click', () => {
  Animator.replay();
  ampWeb.track('Сайт_анимация_повторена', { иероглиф: currentChar });
});
railPrint.addEventListener('click', () => {
  window.print();
  ampWeb.track('Сайт_иероглиф_напечатан', { иероглиф: currentChar });
});
function startPractice() {
  if (!currentChar) return;
  Animator.stop();
  animArea.hidden = true;
  diagramsArea.hidden = true;
  Draw.hide();
  Draw.clear();
  if (railDraw) railDraw.classList.remove('active');
  Practice.start(currentChar);
  ampWeb.track('Сайт_практика_начата', { иероглиф: currentChar });
}

if (btnPractice) btnPractice.addEventListener('click', startPractice);

// When practice exits, restore animation view
document.getElementById('practiceExit').addEventListener('click', () => {
  if (currentChar) {
    animArea.hidden = false;
    diagramsArea.hidden = false;
    railSearch.classList.add('active');
    Animator.init(currentChar, writerTarget, {
      speed: currentSpeed,
      onStroke: (cur, total) => { strokeCounter.textContent = `Stroke ${cur} of ${total}`; },
    });
  }
}, { once: false });

// ── Stars / rating ────────────────────────────────────────────────────────────
const RATING_FORM_URL = 'https://forms.gle/Tx8ADvW8rzRahTo16';

rateStars.querySelectorAll('.star-btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    const n = parseInt(btn.dataset.v);
    rateStars.querySelectorAll('.star-btn').forEach(b => {
      b.classList.toggle('lit', parseInt(b.dataset.v) <= n);
    });
  });
  btn.addEventListener('mouseleave', () => {
    rateStars.querySelectorAll('.star-btn').forEach(b => b.classList.remove('lit'));
  });
  btn.addEventListener('click', () => {
    const stars = parseInt(btn.dataset.v);
    ampWeb.track('Сайт_оценка_поставлена', { оценка: stars });
    window.open(RATING_FORM_URL, '_blank');
  });
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { searchInput.blur(); Practice.exit(); railPractice.classList.remove('active'); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

// Draw panel visible by default on load
if (railDraw) railDraw.classList.add('active');
railSearch.classList.remove('active');

Draw.onChar((char) => {
  searchInput.value = char;
  loadChar(char);
  // draw area hidden inside loadChar already
});

if (railDraw) {
  railDraw.addEventListener('click', () => {
    const showing = Draw.isVisible();
    if (showing) {
      Draw.hide();
      Draw.clear();
      railDraw.classList.remove('active');
    } else {
      Draw.show();
      railDraw.classList.add('active');
      railSearch.classList.remove('active');
    }
  });
}

// ── URL routing: /chinese-stroke-order/我 ─────────────────────────────────────
(() => {
  const CHINESE_RE_URL = /[一-鿿㐀-䶿豈-﫿]/;
  // Works in iframe (src is /chinese-stroke-order/index.html?char=X)
  // and direct access via hash (#我)
  let autoChar = null;

  const params = new URLSearchParams(location.search);
  const qChar = params.get('char');
  if (qChar && CHINESE_RE_URL.test(qChar[0])) autoChar = qChar[0];

  const hashChar = decodeURIComponent(location.hash.slice(1));
  if (!autoChar && hashChar && CHINESE_RE_URL.test(hashChar[0])) autoChar = hashChar[0];

  if (autoChar) {
    searchInput.value = autoChar;
    // defer until scripts are ready
    setTimeout(() => loadChar(autoChar), 100);
  }
})();

const _src = ampWeb.detectSource(ampWeb.fromExtension);
ampWeb.track('Сайт_главная_страница_открыта', {
  источник:      _src,
  первый_визит:  ampWeb.visits.firstVisit,
  номер_визита:  ampWeb.visits.total,
});
