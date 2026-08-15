(() => {
  const CHINESE_RE = /[一-鿿㐀-䶿豈-﫿]/;
  const SITE = 'https://hsk-tutor.com';
  const DISMISSED_KEY = '_cso_dismissed';
  const POS_KEY = '_cso_widget_y';

  if (location.hostname.includes('hsk-tutor.com')) return;

  function hasChinese() {
    return CHINESE_RE.test((document.body?.innerText || '').slice(0, 8000));
  }

  function getStoredY() {
    const v = sessionStorage.getItem(POS_KEY);
    return v ? parseInt(v, 10) : Math.floor(window.innerHeight * 0.35);
  }

  function track(event, props) {
    chrome.runtime.sendMessage({ action: 'track', event, props: { ...props, страница: location.hostname } });
  }

  function injectWidget() {
    if (document.getElementById('cso-widget')) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const iconUrl = chrome.runtime.getURL('icons/icon_48.png');

    const widget = document.createElement('div');
    widget.id = 'cso-widget';
    widget.title = 'Chinese Character Stroke Order';
    widget.style.top = `${Math.min(getStoredY(), window.innerHeight - 90)}px`;
    widget.innerHTML = `
      <div class="cso-body">
        <span class="cso-char">字</span>
        <span class="cso-label">Stroke<br>Order</span>
      </div>
      <button class="cso-close" title="Dismiss">✕</button>
    `;
    document.body.appendChild(widget);

    track('Расш_виджет_показан');

    widget.querySelector('.cso-body').addEventListener('click', () => {
      // При выделенном иероглифе → открыть страницу конкретного символа
      const sel = window.getSelection()?.toString() || '';
      let char = null;
      for (const ch of sel) {
        if (CHINESE_RE.test(ch)) { char = ch; break; }
      }
      track('Расш_виджет_нажат', { символ: char || '' });
      const url = (char ? `${SITE}/${encodeURIComponent(char)}` : SITE) + '?ref=widget';
      chrome.runtime.sendMessage({ action: 'openSite', url });
    });

    widget.querySelector('.cso-close').addEventListener('click', (e) => {
      e.stopPropagation();
      track('Расш_виджет_закрыт');
      widget.remove();
      sessionStorage.setItem(DISMISSED_KEY, '1');
    });

    // Drag
    let dragging = false, dragStartY = 0, widgetStartY = 0;

    widget.addEventListener('mousedown', (e) => {
      if (e.target.closest('.cso-close')) return;
      dragging = true;
      dragStartY = e.clientY;
      widgetStartY = parseInt(widget.style.top, 10);
      widget.classList.add('cso-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const newY = Math.max(0, Math.min(window.innerHeight - 90, widgetStartY + e.clientY - dragStartY));
      widget.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      widget.classList.remove('cso-dragging');
      sessionStorage.setItem(POS_KEY, widget.style.top);
    });
  }

  function tryInject() {
    if (hasChinese()) injectWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
  } else {
    tryInject();
  }

  // Watch for dynamic content (SPAs that load Chinese text later)
  const observer = new MutationObserver(() => {
    if (!document.getElementById('cso-widget') && !sessionStorage.getItem(DISMISSED_KEY) && hasChinese()) {
      injectWidget();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
})();
