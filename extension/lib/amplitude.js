/* Amplitude HTTP API v2: общий модуль расширения
 *
 * API Key (публичный), безопасно хранить в клиентском коде.
 * Secret Key, только в серверных Python-скриптах, здесь НЕ нужен.
 */
const amp = (() => {
  const API_KEY    = 'dd365ebb60dd430bea642a05b780de5b';
  const ENDPOINT   = 'https://api2.amplitude.com/2/httpapi';
  const DEVICE_KEY = '_amp_device_id';

  const _version = chrome.runtime.getManifest().version;
  const _lang    = (typeof navigator !== 'undefined' ? navigator.language : null) || 'en';

  function _deviceId(cb) {
    chrome.storage.local.get([DEVICE_KEY], (r) => {
      if (r[DEVICE_KEY]) return cb(r[DEVICE_KEY]);
      const id = 'cso_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      chrome.storage.local.set({ [DEVICE_KEY]: id }, () => cb(id));
    });
  }

  function track(eventType, properties) {
    _deviceId((deviceId) => {
      fetch(ENDPOINT, {
        method:    'POST',
        keepalive: true,
        headers:   { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: API_KEY,
          events: [{
            event_type:       eventType,
            device_id:        deviceId,
            platform:         'Chrome Extension',
            app_version:      _version,
            language:         _lang,
            time:             Date.now(),
            event_properties: properties || {},
          }],
        }),
      }).catch(() => {});
    });
  }

  // Открывает вкладку с ?amp_did=device_id, сайт считывает и сшивает воронку.
  function openTab(url) {
    _deviceId((deviceId) => {
      const sep = url.includes('?') ? '&' : '?';
      chrome.tabs.create({ url: url + sep + 'amp_did=' + deviceId });
    });
  }

  return { track, openTab, getDeviceId: _deviceId };
})();
