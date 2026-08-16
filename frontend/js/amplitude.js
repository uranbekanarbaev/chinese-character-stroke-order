/* Amplitude HTTP API v2: модуль для сайта hsk-tutor.com
 *
 * Сквозная воронка расш → сайт:
 *   Расширение добавляет ?amp_did=cso_xxx в URL.
 *   Этот модуль считывает его и использует тот же device_id,
 *   единый профиль в Amplitude: установил → открыл сайт.
 */
const ampWeb = (() => {
  const API_KEY    = 'dd365ebb60dd430bea642a05b780de5b';
  const ENDPOINT   = 'https://api2.amplitude.com/2/httpapi';
  const DEVICE_KEY = '_amp_device_id';
  const REQ_KEY    = '_amp_req_ok';      // кол-во успешных загрузок иероглифа
  const FIRST_KEY  = '_amp_first_date';  // дата первого успешного запроса
  const AHA_KEY    = '_amp_aha';         // aha moment уже отправлен
  const VISIT_KEY  = '_amp_visits';      // общее кол-во визитов

  // device_id (сшивка воронки)
  function _initDeviceId() {
    const p   = new URLSearchParams(location.search);
    const ext = p.get('amp_did');
    if (ext && ext.startsWith('cso_')) {
      localStorage.setItem(DEVICE_KEY, ext);
      return ext;
    }
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'web_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  // visit counter
  function _initVisits() {
    const v = JSON.parse(localStorage.getItem(VISIT_KEY) || '{"n":0}');
    const firstVisit = v.n === 0;
    v.n++;
    localStorage.setItem(VISIT_KEY, JSON.stringify(v));
    return { total: v.n, firstVisit };
  }

  // источник трафика
  function detectSource(isFromExt) {
    if (isFromExt) return 'расширение';
    const ref = document.referrer;
    if (!ref) return 'прямой';
    if (/google|bing|yandex|baidu|duckduck/i.test(ref)) return 'поиск';
    return 'другое';
  }

  // state
  const deviceId      = _initDeviceId();
  const fromExtension = deviceId.startsWith('cso_');
  const _lang         = navigator.language || 'en';
  const visits        = _initVisits();

  // low-level send
  function _post(payload) {
    fetch(ENDPOINT, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  // track
  function track(eventType, properties) {
    _post({
      api_key: API_KEY,
      events: [{
        event_type:       eventType,
        device_id:        deviceId,
        platform:         'Web',
        language:         _lang,
        time:             Date.now(),
        event_properties: {
          ...(properties || {}),
          из_расширения: fromExtension,
          страница:      location.pathname,
        },
      }],
    });
  }

  // identify: обновить user properties
  function identify(props) {
    _post({
      api_key: API_KEY,
      events: [{
        event_type:      '$identify',
        device_id:       deviceId,
        time:            Date.now(),
        user_properties: { $set: props },
      }],
    });
  }

  // onSuccessfulRequest
  // Вызывать после каждого успешно загруженного иероглифа.
  // Обновляет счётчик, вызывает identify(), при 5-м запросе, AHA moment.
  // Возвращает { номер_запроса, первый_запрос }.
  function onSuccessfulRequest(письмо) {
    const total = parseInt(localStorage.getItem(REQ_KEY) || '0', 10) + 1;
    localStorage.setItem(REQ_KEY, String(total));

    const firstDate = localStorage.getItem(FIRST_KEY) || (() => {
      const d = new Date().toISOString().slice(0, 10);
      localStorage.setItem(FIRST_KEY, d);
      return d;
    })();

    identify({
      всего_запросов:     total,
      первый_запрос_дата: firstDate,
      любимое_письмо:     письмо,
      из_расширения:      fromExtension,
      активирован:        total >= 5,
    });

    let aha_triggered = false;
    if (total === 5 && !localStorage.getItem(AHA_KEY)) {
      localStorage.setItem(AHA_KEY, '1');
      const days = Math.floor((Date.now() - new Date(firstDate).getTime()) / 86400000);
      track('Сайт_пользователь_активирован', {
        запросов:       total,
        дней_с_первого: days,
      });
      aha_triggered = true;
    }

    return { номер_запроса: total, первый_запрос: total === 1, aha_triggered };
  }

  return { track, identify, onSuccessfulRequest, deviceId, fromExtension, visits, detectSource };
})();
