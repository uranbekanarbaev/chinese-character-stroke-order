importScripts('../lib/amplitude.js');

const SITE          = 'https://hsk-tutor.com';
const WELCOME_URL   = 'https://hsk-tutor.com/welcome-page/chinese-character-stroke-order';
const UNINSTALL_URL = 'https://hsk-tutor.com/uninstall-page/chinese-character-stroke-order';
const CHINESE_RE    = /[一-鿿㐀-䶿豈-﫿]/;

chrome.action.onClicked.addListener(() => {
  amp.track('Расш_иконка_нажата');
  amp.openTab(SITE);
});

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({
    id:       'cso-lookup',
    title:    'Stroke Order for "%s"',
    contexts: ['selection'],
  });

  if (details.reason === 'install') {
    const версия = chrome.runtime.getManifest().version;
    const язык   = chrome.i18n.getUILanguage();
    amp.track('Расш_расширение_установлено', { версия, язык });
    amp.openTab(WELCOME_URL);
  }

  if (details.reason === 'update') {
    const новая      = chrome.runtime.getManifest().version;
    const предыдущая = details.previousVersion || '';
    amp.track('Расш_расширение_обновлено', { предыдущая_версия: предыдущая, новая_версия: новая });
  }

  // setUninstallURL only takes a plain string, route through getDeviceId so
  // the uninstall funnel ties back to the same Amplitude user as install/use,
  // same as every URL opened via amp.openTab already does.
  amp.getDeviceId((deviceId) => {
    chrome.runtime.setUninstallURL(`${UNINSTALL_URL}?amp_did=${deviceId}`);
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'cso-lookup') return;
  const sel = info.selectionText || '';
  let char = null;
  for (const ch of sel) {
    if (CHINESE_RE.test(ch)) { char = ch; break; }
  }
  amp.track('Расш_контекстное_меню_нажато', {
    длина_текста:  sel.length,
    есть_иероглиф: char !== null,
    символ:        char || '',
  });
  amp.openTab(char ? `${SITE}/${encodeURIComponent(char)}?ref=menu` : `${SITE}?ref=menu`);
});

// Сообщения от content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'track') amp.track(msg.event, msg.props || {});
  if (msg.action === 'openSite') amp.openTab(msg.url || SITE);
});
