/**
 * Cal.com integration — Availability Settings + slots + bookings.
 * Live mode hits API v2 when an access token is present.
 * Demo mode mirrors the same endpoints locally so the prototype works on file://.
 *
 * Docs: https://cal.com/docs/atoms/availability-settings
 * API:  GET/PATCH /v2/schedules  GET /v2/slots  POST /v2/bookings
 */
(function () {
  var KEY = 'gradright_calcom_v1';
  var CONFIG_KEY = 'gradright_calcom_config';
  var CONNECTED_KEY = 'gradright_calcom_connected';
  var API_URL = 'https://api.cal.com/v2';
  var AUTH_URL = 'https://app.cal.com/auth/oauth2/authorize';
  var TOKEN_URL = 'https://api.cal.com/v2/auth/oauth2/token';
  var EMBED_HOST = 'https://app.cal.com';
  var DAY_NAME = {
    sun: 'Sunday',
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
  };
  var NAME_TO_ID = {
    Sunday: 'sun',
    Monday: 'mon',
    Tuesday: 'tue',
    Wednesday: 'wed',
    Thursday: 'thu',
    Friday: 'fri',
    Saturday: 'sat',
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function nowStamp() {
    var t = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
    return (
      t.getFullYear() +
      '-' +
      pad2(t.getMonth() + 1) +
      '-' +
      pad2(t.getDate()) +
      ' ' +
      pad2(t.getHours()) +
      ':' +
      pad2(t.getMinutes())
    );
  }

  function sessionProfile() {
    var s = window.GradRightSession && GradRightSession.get && GradRightSession.get();
    return {
      name: (s && s.name) || 'Priya Sharma',
      email: (s && s.email) || 'priya.sharma@gmail.com',
      username: String((s && s.name) || 'priya-sharma')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'priya-sharma',
    };
  }

  function isRealClientId(id) {
    var value = String(id || '').trim();
    if (!value) return false;
    if (/^https?:\/\//i.test(value)) return false;
    if (value.indexOf('/') >= 0) return false;
    return value.length >= 8;
  }

  function readConfig() {
    var out = { clientId: '', apiUrl: API_URL, redirectUri: '', accessToken: '' };
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) Object.assign(out, JSON.parse(raw) || {});
    } catch (e) {}
    if (window.GR_CAL_CLIENT_ID) out.clientId = window.GR_CAL_CLIENT_ID;
    if (window.GR_CAL_REDIRECT_URI) out.redirectUri = window.GR_CAL_REDIRECT_URI;
    if (window.GR_CAL_ACCESS_TOKEN) out.accessToken = window.GR_CAL_ACCESS_TOKEN;
    if (!isRealClientId(out.clientId)) out.clientId = '';
    return out;
  }

  function writeConfig(partial) {
    var next = Object.assign(readConfig(), partial || {});
    if (!isRealClientId(next.clientId)) next.clientId = '';
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({
        clientId: next.clientId || '',
        apiUrl: next.apiUrl || API_URL,
        redirectUri: next.redirectUri || '',
        accessToken: next.accessToken || '',
      }));
    } catch (e) {}
    return next;
  }

  function defaultRedirect() {
    if (location.protocol === 'file:') return '';
    return location.origin + location.pathname.replace(/\/$/, '') || (location.origin + '/calendar.html');
  }

  function oauthScopes() {
    return [
      'PROFILE_READ',
      'SCHEDULE_READ',
      'SCHEDULE_WRITE',
      'EVENT_TYPE_READ',
      'EVENT_TYPE_WRITE',
      'BOOKING_READ',
      'BOOKING_WRITE',
      'APPS_READ',
      'APPS_WRITE',
    ].join(' ');
  }

  function base64Url(buffer) {
    var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function pkceVerifier() {
    return base64Url(crypto.getRandomValues(new Uint8Array(32)));
  }

  function pkceChallenge(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (buf) {
      return base64Url(buf);
    });
  }

  function sessionGet(key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  }

  function sessionSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function sessionClearAuth() {
    try {
      sessionStorage.removeItem('gradright_cal_oauth_state');
      sessionStorage.removeItem('gradright_cal_pkce_verifier');
      sessionStorage.removeItem('gradright_cal_oauth_redirect');
    } catch (e) {}
  }

  function authErrorText(err) {
    if (!err) return 'Could not connect to Cal.com.';
    if (typeof err === 'string') return err;
    return err.error_description || err.message || err.error || (err.data && err.data.message) || 'Could not connect to Cal.com.';
  }

  function cleanAuthParams() {
    try {
      var params = new URLSearchParams(location.search);
      ['code', 'state', 'error', 'error_description'].forEach(function (key) {
        params.delete(key);
      });
      var next = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
      history.replaceState({}, '', next);
    } catch (e) {}
  }

  function slugify(text) {
    return String(text || 'meet')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'meet';
  }

  function bookingDefaults() {
    return {
      duration: 45,
      noticeMinutes: 240,
      bufferAfter: 10,
      bookingWindowDays: 60,
      rescheduleMode: 'request',
      rescheduleNotice: '24h',
    };
  }

  function noticeToMinutes(value, unit) {
    var n = Number(value) || 0;
    if (unit === 'Hours') return n * 60;
    if (unit === 'Days') return n * 24 * 60;
    return n;
  }

  function minutesToNotice(mins) {
    mins = Number(mins) || 0;
    if (mins >= 1440 && mins % 1440 === 0) return { value: mins / 1440, unit: 'Days' };
    if (mins >= 60 && mins % 60 === 0) return { value: mins / 60, unit: 'Hours' };
    return { value: mins, unit: 'Minutes' };
  }

  function periodLabelToDays(label) {
    var map = {
      '1 Week': 7,
      '2 Weeks': 14,
      '3 Weeks': 21,
      '4 Weeks': 28,
      '2 Months': 60,
      '3 Months': 90,
    };
    if (map[label]) return map[label];
    var n = Number(label);
    return n > 0 ? n : 60;
  }

  function daysToPeriodLabel(days) {
    var map = { 7: '1 Week', 14: '2 Weeks', 21: '3 Weeks', 28: '4 Weeks', 60: '2 Months', 90: '3 Months' };
    return map[Number(days)] || '2 Months';
  }

  function policyNoticeToMinutes(notice) {
    var map = { '30m': 30, '8h': 480, '24h': 1440 };
    return map[notice] || 0;
  }

  function minutesToPolicyNotice(mins) {
    var n = Number(mins);
    if (!n) return 'anytime';
    var map = { 30: '30m', 480: '8h', 1440: '24h' };
    return map[n] || '24h';
  }

  function bookingWindowDaysFromRemote(remote) {
    if (!remote) return null;
    var w = remote.bookingWindow;
    if (w && typeof w === 'object' && !Array.isArray(w.value) && w.value != null) return Number(w.value) || 60;
    if (remote.periodDays != null) return Number(remote.periodDays);
    return null;
  }

  function eventBookingFromPrev(prev) {
    var d = bookingDefaults();
    if (!prev) return d;
    return {
      duration: prev.duration != null ? Number(prev.duration) : d.duration,
      noticeMinutes: prev.noticeMinutes != null ? Number(prev.noticeMinutes) : d.noticeMinutes,
      bufferAfter: prev.bufferAfter != null ? Number(prev.bufferAfter) : d.bufferAfter,
      bookingWindowDays: prev.bookingWindowDays != null ? Number(prev.bookingWindowDays) : d.bookingWindowDays,
      rescheduleMode: prev.rescheduleMode || d.rescheduleMode,
      rescheduleNotice: prev.rescheduleNotice || d.rescheduleNotice,
    };
  }

  function eventTypeApiBody(ev) {
    var notice = Number(ev.noticeMinutes) || 0;
    var buffer = Number(ev.bufferAfter) || 0;
    var days = Number(ev.bookingWindowDays) || 60;
    var body = {
      lengthInMinutes: Number(ev.duration) || 45,
      minimumBookingNotice: notice,
      afterEventBuffer: buffer,
      bookingWindow: { type: 'calendarDays', value: days, rolling: false },
    };
    if (ev.rescheduleNotice === 'anytime') {
      body.disableRescheduling = { disabled: false };
    } else {
      var before = policyNoticeToMinutes(ev.rescheduleNotice);
      body.disableRescheduling = before
        ? { disabled: false, minutesBefore: before }
        : { disabled: false };
    }
    return body;
  }

  function applyEventToCalendarStore(ev) {
    if (!ev || !window.GradRightCalendar) return;
    var notice = minutesToNotice(ev.noticeMinutes);
    GradRightCalendar.set({
      duration: Number(ev.duration) || 45,
      noticeValue: notice.value,
      noticeUnit: notice.unit,
      buffer: String(Number(ev.bufferAfter) || 0) + ' min',
      bookingPeriod: daysToPeriodLabel(ev.bookingWindowDays),
      policy: {
        mode: ev.rescheduleMode || 'request',
        notice: ev.rescheduleNotice || '24h',
      },
    });
  }

  function servicesForEvents() {
    if (window.GradRightServices && GradRightServices.get) return GradRightServices.get();
    return [
      { id: 'college-shortlisting', title: 'College shortlisting', description: 'Reach / match / safety lists for the student’s profile' },
      { id: 'sop-review', title: 'SOP & essay review', description: 'Structure, voice, and program-fit feedback' },
      { id: 'visa-readiness', title: 'Visa readiness', description: 'Document checklist and interview practice' },
    ];
  }

  function eventFromService(service, prev, index, apps) {
    var booking = eventBookingFromPrev(prev);
    var location = (prev && prev.location) || ((apps && apps.defaultApp) || 'gradright-meet');
    return {
      id: (prev && prev.id != null) ? prev.id : index + 1,
      serviceId: service.id,
      title: service.title,
      slug: slugify(service.id || service.title),
      duration: booking.duration,
      description: service.description || '',
      location: location,
      hidden: false,
      calId: prev && prev.calId,
      noticeMinutes: booking.noticeMinutes,
      bufferAfter: booking.bufferAfter,
      bookingWindowDays: booking.bookingWindowDays,
      rescheduleMode: booking.rescheduleMode,
      rescheduleNotice: booking.rescheduleNotice,
    };
  }

  function defaultEventTypes() {
    return servicesForEvents().map(function (service, i) {
      return eventFromService(service, null, i);
    });
  }

  function syncEventTypesFromServices() {
    var state = read();
    var services = servicesForEvents();
    var existing = (state.eventTypes || []).filter(function (e) {
      return e && e.serviceId !== 'counselor-connect' && e.slug !== 'counselor-connect';
    });
    var used = {};
    var next = services.map(function (service, i) {
      var slug = slugify(service.id || service.title);
      var prev = existing.filter(function (e) {
        return e.serviceId === service.id || e.slug === slug;
      })[0] || null;
      var ev = eventFromService(service, prev, i, state.conferencing);
      if (used[String(ev.id)]) ev.id = (i + 1) * 10 + Object.keys(used).length;
      used[String(ev.id)] = true;
      return ev;
    });
    if (!next.length) next = defaultEventTypes();
    var selected = next.filter(function (e) {
      return String(e.id) === String(state.eventTypeId);
    })[0] || next[0];
    write(Object.assign(state, {
      eventTypes: next,
      eventTypeId: selected.id,
      eventSlug: selected.slug,
    }));
    return next;
  }

  function defaultCalendars() {
    return {
      connected: [],
      destination: '',
      check: [],
    };
  }

  function defaultConferencing() {
    return {
      installed: ['gradright-meet'],
      defaultApp: 'gradright-meet',
    };
  }

  function emptyState() {
    var profile = sessionProfile();
    var events = defaultEventTypes();
    return {
      connected: false,
      mode: 'demo',
      accessToken: '',
      refreshToken: '',
      username: profile.username,
      email: profile.email,
      name: profile.name,
      eventSlug: (events[0] && events[0].slug) || 'college-shortlisting',
      eventTypeId: (events[0] && events[0].id) || 1,
      scheduleId: 1,
      scheduleName: 'Working Hours',
      isDefault: true,
      connectedAt: '',
      bookings: [],
      eventTypes: events,
      calendars: defaultCalendars(),
      conferencing: defaultConferencing(),
    };
  }

  function applyConnectedFlag(state) {
    try {
      if (!state.connected && localStorage.getItem(CONNECTED_KEY) === '1') state.connected = true;
    } catch (e) {}
    return state;
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          var state = Object.assign(emptyState(), saved);
          if (!state.eventTypes || !state.eventTypes.length) state.eventTypes = defaultEventTypes();
          if (!state.calendars) state.calendars = defaultCalendars();
          if (!state.conferencing) state.conferencing = defaultConferencing();
          return applyConnectedFlag(state);
        }
      }
    } catch (e) {}
    return applyConnectedFlag(emptyState());
  }

  function persistConnectedFlag(on) {
    try {
      if (on) localStorage.setItem(CONNECTED_KEY, '1');
      else localStorage.removeItem(CONNECTED_KEY);
    } catch (e) {}
  }

  function write(next) {
    var state = Object.assign(emptyState(), next || {});
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
    persistConnectedFlag(!!state.connected);
    return state;
  }

  function isConnected() {
    if (read().connected) return true;
    try {
      return localStorage.getItem(CONNECTED_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function toHhmmLabel(label) {
    var m = String(label || '').match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) {
      if (/^\d{1,2}:\d{2}$/.test(String(label || ''))) {
        var parts = String(label).split(':');
        return pad2(Number(parts[0])) + ':' + pad2(Number(parts[1]));
      }
      return '09:00';
    }
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    var ap = m[3].toUpperCase();
    if (ap === 'AM') {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return pad2(h) + ':' + pad2(min);
  }

  function fromHhmm(hhmm) {
    var p = String(hhmm || '09:00').split(':');
    var h = Number(p[0] || 0);
    var m = String(p[1] || '00').padStart(2, '0');
    return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function normalizeDateKey(key) {
    var parts = String(key || '').split('-').map(Number);
    if (parts.length < 3) return key;
    return parts[0] + '-' + pad2(parts[1]) + '-' + pad2(parts[2]);
  }

  function scheduleFromLocal(data) {
    var availability = [];
    (data.schedule || []).forEach(function (day) {
      if (!day.on) return;
      (day.ranges || []).forEach(function (range) {
        availability.push({
          days: [DAY_NAME[day.id] || day.label || 'Monday'],
          startTime: toHhmmLabel(range[0]),
          endTime: toHhmmLabel(range[1]),
        });
      });
    });
    var overrides = (data.dateOverrides && data.dateOverrides.length
      ? data.dateOverrides
      : (data.blockedDates || []).map(function (key) {
          return { date: key, unavailable: true, ranges: [] };
        })
    ).map(function (item) {
      if (typeof item === 'string') {
        return { date: normalizeDateKey(item), startTime: '00:00', endTime: '00:00' };
      }
      if (item.unavailable || !item.ranges || !item.ranges.length) {
        return { date: normalizeDateKey(item.date), startTime: '00:00', endTime: '00:00' };
      }
      return {
        date: normalizeDateKey(item.date),
        startTime: toHhmmLabel(item.ranges[0][0]),
        endTime: toHhmmLabel(item.ranges[0][1]),
      };
    });
    var state = read();
    return {
      id: state.scheduleId || 1,
      name: state.scheduleName || data.scheduleName || 'Working Hours',
      timeZone: data.timezone || 'Asia/Kolkata',
      isDefault: state.isDefault !== false,
      availability: availability,
      overrides: overrides,
    };
  }

  function localFromSchedule(payload) {
    var days = [
      { id: 'mon', label: 'Monday', on: false, ranges: [] },
      { id: 'tue', label: 'Tuesday', on: false, ranges: [] },
      { id: 'wed', label: 'Wednesday', on: false, ranges: [] },
      { id: 'thu', label: 'Thursday', on: false, ranges: [] },
      { id: 'fri', label: 'Friday', on: false, ranges: [] },
      { id: 'sat', label: 'Saturday', on: false, ranges: [] },
      { id: 'sun', label: 'Sunday', on: false, ranges: [] },
    ];
    (payload.availability || []).forEach(function (row) {
      (row.days || []).forEach(function (name) {
        var id = NAME_TO_ID[name];
        var day = days.filter(function (d) { return d.id === id; })[0];
        if (!day) return;
        day.on = true;
        day.ranges.push([fromHhmm(row.startTime), fromHhmm(row.endTime)]);
      });
    });
    days.forEach(function (day) {
      if (!day.ranges.length) day.ranges = [['9:00 AM', '5:00 PM']];
    });
    var dateOverrides = (payload.overrides || []).map(function (o) {
      var p = String(o.date || '').split('-').map(Number);
      var date = p[0] + '-' + p[1] + '-' + p[2];
      var unavailable = !!(o.unavailable || o.startTime === o.endTime);
      return {
        date: date,
        unavailable: unavailable,
        ranges: unavailable ? [] : [[fromHhmm(o.startTime), fromHhmm(o.endTime)]],
      };
    });
    return {
      timezone: payload.timeZone || 'Asia/Kolkata',
      scheduleName: payload.name || 'Working Hours',
      isDefault: !!payload.isDefault,
      schedule: days,
      dateOverrides: dateOverrides,
      blockedDates: dateOverrides.filter(function (o) { return o.unavailable; }).map(function (o) { return o.date; }),
    };
  }

  function headers(token) {
    var h = {
      'Content-Type': 'application/json',
      'cal-api-version': '2024-08-13',
    };
    if (token) h.Authorization = 'Bearer ' + token;
    return h;
  }

  function liveEnabled() {
    var state = read();
    var cfg = readConfig();
    return state.mode === 'live' && !!(state.accessToken || cfg.accessToken);
  }

  function token() {
    return read().accessToken || readConfig().accessToken || '';
  }

  function api(path, opts) {
    opts = opts || {};
    var url = (readConfig().apiUrl || API_URL) + path;
    return fetch(url, {
      method: opts.method || 'GET',
      headers: Object.assign(headers(token()), opts.headers || {}, {
        'cal-api-version': opts.version || '2024-08-13',
      }),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res.text().then(function (text) {
        var json = {};
        if (text) {
          try {
            json = JSON.parse(text);
          } catch (e) {
            json = { message: text };
          }
        }
        if (res.status === 401 && !opts._retried && read().refreshToken && readConfig().clientId) {
          return refreshAccessToken().then(function () {
            return api(path, Object.assign({}, opts, { _retried: true }));
          });
        }
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error(
              String(token()).indexOf('cal_') === 0
                ? 'Cal.com rejected that API key. Paste the exact key from Settings → Developer → API keys into js/cal-config.js.'
                : 'Cal.com could not authorize this account. Connect again.'
            );
          }
          throw json;
        }
        return json;
      });
    });
  }

  function refreshAccessToken() {
    var state = read();
    var cfg = readConfig();
    if (!state.refreshToken || !cfg.clientId) {
      return Promise.reject(new Error('Cal.com session expired. Connect again.'));
    }
    return fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId,
        grant_type: 'refresh_token',
        refresh_token: state.refreshToken,
      }),
    }).then(function (res) {
      return res.json().then(function (tokens) {
        if (!res.ok || !tokens.access_token) throw tokens;
        write(Object.assign(read(), {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || state.refreshToken,
        }));
        return tokens;
      });
    });
  }

  function mapCalendarProvider(integration) {
    var t = String(
      (integration && (integration.type || integration.slug || integration.name)) || integration || ''
    ).toLowerCase();
    if (t.indexOf('google') >= 0) return 'google';
    if (t.indexOf('office') >= 0 || t.indexOf('outlook') >= 0) return 'outlook';
    if (t.indexOf('apple') >= 0) return 'apple';
    return '';
  }

  function applyLiveProfile(me) {
    me = me || {};
    var next = Object.assign(read(), {
      connected: true,
      mode: 'live',
      username: me.username || read().username,
      email: me.email || read().email,
      name: me.name || read().name,
      scheduleId: me.defaultScheduleId || read().scheduleId,
      connectedAt: nowStamp(),
    });
    write(next);
    if (me.timeZone && window.GradRightCalendar) {
      var tz = me.timeZone === 'Asia/Calcutta' ? 'Asia/Kolkata' : me.timeZone;
      GradRightCalendar.set(Object.assign(GradRightCalendar.get(), { timezone: tz }));
    }
    return next;
  }

  function mergeRemoteEventTypes(payload) {
    var list = payload && payload.data ? payload.data : payload;
    if (list && list.eventTypeGroups) {
      list = list.eventTypeGroups.reduce(function (acc, group) {
        return acc.concat(group.eventTypes || []);
      }, []);
    }
    if (!Array.isArray(list)) list = [];
    var local = syncEventTypesFromServices();
    var bySlug = {};
    list.forEach(function (e) {
      if (e && e.slug) bySlug[e.slug] = e;
    });
    var next = local.map(function (ev) {
      var remote = bySlug[ev.slug];
      if (!remote) return ev;
      var windowDays = bookingWindowDaysFromRemote(remote);
      var resched = remote.disableRescheduling || {};
      return Object.assign({}, ev, {
        calId: remote.id,
        duration: remote.lengthInMinutes || remote.length || ev.duration,
        location: ev.location,
        noticeMinutes: remote.minimumBookingNotice != null ? Number(remote.minimumBookingNotice) : ev.noticeMinutes,
        bufferAfter: remote.afterEventBuffer != null ? Number(remote.afterEventBuffer) : ev.bufferAfter,
        bookingWindowDays: windowDays != null ? windowDays : ev.bookingWindowDays,
        rescheduleNotice: resched.minutesBefore != null
          ? minutesToPolicyNotice(resched.minutesBefore)
          : ev.rescheduleNotice,
      });
    });
    write(Object.assign(read(), { eventTypes: next }));
    return next;
  }

  function pullConnectedApps() {
    return Promise.all([
      api('/calendars').catch(function () { return null; }),
      api('/conferencing').catch(function () { return null; }),
    ]).then(function (results) {
      var calJson = results[0];
      var confJson = results[1];
      var state = read();
      if (calJson && calJson.data) {
        var connected = [];
        (calJson.data.connectedCalendars || []).forEach(function (c) {
          var p = mapCalendarProvider(c.integration);
          if (p && connected.indexOf(p) < 0) connected.push(p);
        });
        var dest = calJson.data.destinationCalendar;
        var destKey = dest ? mapCalendarProvider(dest.integration || dest) : connected[0] || '';
        state.calendars = {
          connected: connected,
          destination: destKey,
          check: connected.slice(),
        };
      }
      if (confJson) {
        var apps = confJson.data;
        if (!Array.isArray(apps)) apps = (apps && (apps.items || apps.apps)) || [];
        var installed = ['gradright-meet'];
        apps.forEach(function (a) {
          var t = String((a && (a.type || a.slug)) || '').toLowerCase();
          if (t.indexOf('google') >= 0 && installed.indexOf('google-meet') < 0) installed.push('google-meet');
          if (t.indexOf('zoom') >= 0 && installed.indexOf('zoom') < 0) installed.push('zoom');
        });
        state.conferencing = Object.assign(defaultConferencing(), state.conferencing, { installed: installed });
      }
      write(state);
      return state;
    });
  }

  function hydrateFromCal() {
    return api('/me')
      .then(function (json) {
        applyLiveProfile(json.data || json);
        return getSchedule();
      })
      .then(function () {
        return api('/event-types', { version: '2024-06-14' }).catch(function () { return null; });
      })
      .then(function (events) {
        if (events) mergeRemoteEventTypes(events);
        return pullConnectedApps();
      })
      .then(function () {
        return read();
      });
  }

  function connectDemo(opts) {
    opts = opts || {};
    var profile = sessionProfile();
    var state = read();
    var next = write({
      connected: true,
      mode: 'demo',
      accessToken: '',
      username: opts.username || profile.username,
      email: opts.email || profile.email,
      name: opts.name || profile.name,
      eventSlug: state.eventSlug || ((state.eventTypes && state.eventTypes[0] && state.eventTypes[0].slug) || 'college-shortlisting'),
      eventTypeId: state.eventTypeId || 1,
      scheduleId: state.scheduleId || 1,
      scheduleName: state.scheduleName || 'Working Hours',
      isDefault: true,
      connectedAt: nowStamp(),
      bookings: state.bookings || [],
      eventTypes: (state.eventTypes && state.eventTypes.length) ? state.eventTypes : defaultEventTypes(),
      calendars: state.calendars || defaultCalendars(),
      conferencing: state.conferencing || defaultConferencing(),
    });
    try {
      next.eventTypes = syncEventTypesFromServices();
      next = write(Object.assign(read(), {
        connected: true,
        mode: 'demo',
        accessToken: '',
        username: next.username,
        email: next.email,
        name: next.name,
      }));
    } catch (e) {}
    return next;
  }

  function saveClientId(clientId) {
    return writeConfig({ clientId: String(clientId || '').trim() });
  }

  function startOAuth(clientId) {
    if (location.protocol === 'file:') {
      return Promise.reject(new Error('Open Calendar over http://127.0.0.1:8765 so Cal.com can send you back after sign-in.'));
    }
    if (isRealClientId(clientId)) writeConfig({ clientId: String(clientId).trim() });
    var cfg = readConfig();
    if (!isRealClientId(cfg.clientId)) {
      return Promise.reject(new Error('OAuth needs a Cal.com client ID from Settings → Developer → OAuth, not the Calendar page URL.'));
    }
    var redirect = cfg.redirectUri || defaultRedirect();
    if (!redirect) {
      return Promise.reject(new Error('Missing redirect URI.'));
    }
    writeConfig({ redirectUri: redirect });
    var state = 'gr_' + Date.now().toString(36);
    var verifier = pkceVerifier();
    return pkceChallenge(verifier).then(function (challenge) {
      sessionSet('gradright_cal_oauth_state', state);
      sessionSet('gradright_cal_pkce_verifier', verifier);
      sessionSet('gradright_cal_oauth_redirect', redirect);
      var url =
        AUTH_URL +
        '?client_id=' +
        encodeURIComponent(cfg.clientId) +
        '&redirect_uri=' +
        encodeURIComponent(redirect) +
        '&response_type=code&state=' +
        encodeURIComponent(state) +
        '&scope=' +
        encodeURIComponent(oauthScopes()) +
        '&code_challenge=' +
        encodeURIComponent(challenge) +
        '&code_challenge_method=S256';
      location.href = url;
      return url;
    });
  }

  function cancelledError(message) {
    var err = new Error(message || '');
    err.cancelled = true;
    return err;
  }

  function closeOnboardModal() {
    var modal = document.getElementById('cal-onboard-modal');
    var frame = document.getElementById('cal-onboard-frame');
    if (frame) {
      frame.removeAttribute('src');
      frame.hidden = true;
      frame.style.width = '';
      frame.style.height = '';
    }
    if (modal) modal.hidden = true;
    document.body.classList.remove('cal-modal-open');
  }

  function exchangeAuthorizationCode(code) {
    var cfg = readConfig();
    var redirect = sessionGet('gradright_cal_oauth_redirect') || cfg.redirectUri || defaultRedirect();
    var verifier = sessionGet('gradright_cal_pkce_verifier');
    if (!cfg.clientId) {
      return Promise.reject(new Error('OAuth client ID is missing. Save it on this page and try again.'));
    }
    if (!verifier) {
      return Promise.reject(new Error('This sign-in expired. Click Continue with Cal.com again.'));
    }
    return fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect,
        code_verifier: verifier,
      }),
    })
      .then(function (res) {
        return res.json().then(function (tokens) {
          if (!res.ok || !tokens.access_token) throw tokens;
          return tokens;
        });
      })
      .then(function (tokens) {
        write(Object.assign(read(), {
          connected: true,
          mode: 'live',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || '',
          connectedAt: nowStamp(),
        }));
        sessionClearAuth();
        return hydrateFromCal();
      });
  }

  function handleOAuthCallback() {
    var params = new URLSearchParams(location.search);
    if (params.get('error')) {
      var message = params.get('error_description') || params.get('error');
      cleanAuthParams();
      sessionClearAuth();
      return Promise.reject(new Error(message));
    }
    var code = params.get('code');
    var state = params.get('state');
    if (!code) return Promise.resolve(null);
    var expected = sessionGet('gradright_cal_oauth_state');
    if (expected && state && expected !== state) {
      cleanAuthParams();
      return Promise.reject(new Error('Cal.com sign-in was interrupted. Try Continue with Cal.com again.'));
    }
    return exchangeAuthorizationCode(code)
      .then(function (result) {
        cleanAuthParams();
        return result;
      })
      .catch(function (err) {
        cleanAuthParams();
        sessionClearAuth();
        return Promise.reject(new Error(authErrorText(err)));
      });
  }

  function startOnboardingEmbed() {
    if (location.protocol === 'file:') {
      return Promise.reject(new Error('Open Calendar over http://127.0.0.1:8765 so Cal.com can open in this page.'));
    }
    var cfg = readConfig();
    if (!isRealClientId(cfg.clientId)) {
      return Promise.reject(new Error('OAuth needs a Cal.com client ID from Settings → Developer → OAuth.'));
    }
    var redirect = cfg.redirectUri || defaultRedirect();
    if (!redirect) {
      return Promise.reject(new Error('Missing redirect URI.'));
    }
    var modal = document.getElementById('cal-onboard-modal');
    var frame = document.getElementById('cal-onboard-frame');
    var status = document.getElementById('cal-onboard-status');
    if (!modal || !frame) return startOAuth(cfg.clientId);

    writeConfig({ clientId: cfg.clientId, redirectUri: redirect });
    var state = 'gr_' + Date.now().toString(36);
    var verifier = pkceVerifier();
    return pkceChallenge(verifier).then(function (challenge) {
      sessionSet('gradright_cal_oauth_state', state);
      sessionSet('gradright_cal_pkce_verifier', verifier);
      sessionSet('gradright_cal_oauth_redirect', redirect);
      var params = new URLSearchParams({
        client_id: cfg.clientId,
        scope: oauthScopes(),
        state: state,
        theme: 'light',
        redirect_uri: redirect,
        onboardingEmbed: 'true',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      var verifyPath = '/api/onboarding-embed/verify?' + params.toString();
      var verifyUrl = EMBED_HOST + verifyPath;
      var startUrl = EMBED_HOST + '/auth/logout?callbackUrl=' + encodeURIComponent(verifyPath);

      return new Promise(function (resolve, reject) {
        var settled = false;

        function finish(err, value) {
          if (settled) return;
          settled = true;
          window.removeEventListener('message', onMessage);
          modal.querySelectorAll('[data-close-onboard]').forEach(function (el) {
            el.removeEventListener('click', onCancel);
          });
          closeOnboardModal();
          if (err) reject(err);
          else resolve(value);
        }

        function onCancel() {
          sessionClearAuth();
          finish(cancelledError());
        }

        function onMessage(event) {
          if (event.origin !== EMBED_HOST) return;
          var data = event.data || {};
          if (data.originator === 'CAL' && data.type === '__iframeReady' && event.source) {
            try {
              event.source.postMessage({ originator: 'CAL', method: 'parentKnowsIframeReady', arg: {} }, event.origin);
            } catch (e) {}
          }
          if (data.type === 'onboarding:resize') {
            if (data.width) frame.style.width = Math.min(Number(data.width), window.innerWidth - 32) + 'px';
            if (data.height) frame.style.height = Math.min(Number(data.height), window.innerHeight * 0.8) + 'px';
            return;
          }
          if (data.type === 'authorization:allowed') {
            if (data.state !== state) {
              finish(new Error('State mismatch — possible CSRF attack'));
              return;
            }
            if (status) {
              status.hidden = false;
              status.textContent = 'Connecting…';
            }
            exchangeAuthorizationCode(data.code).then(function (result) {
              finish(null, result);
            }).catch(function (err) {
              finish(new Error(authErrorText(err)));
            });
            return;
          }
          if (data.type === 'onboarding:error') {
            finish(new Error(data.message || data.code || 'Cal.com onboarding failed.'));
            return;
          }
          if (data.type === 'authorization:denied') {
            finish(cancelledError('Cal.com access was denied.'));
            return;
          }
          if (data.type === 'onboarding:close') {
            finish(cancelledError());
          }
        }

        window.addEventListener('message', onMessage);
        modal.querySelectorAll('[data-close-onboard]').forEach(function (el) {
          el.addEventListener('click', onCancel);
        });
        if (status) {
          status.hidden = false;
          status.textContent = 'Opening Cal.com…';
        }
        frame.hidden = false;
        frame.src = startUrl;
        setTimeout(function () {
          if (!settled && frame.getAttribute('src') && frame.getAttribute('src').indexOf('/auth/logout') >= 0) {
            frame.src = verifyUrl;
          }
        }, 1600);
        frame.addEventListener('load', function () {
          if (status) status.hidden = true;
        }, { once: true });
        modal.hidden = false;
        document.body.classList.add('cal-modal-open');
      });
    });
  }

  function rememberOAuthStart(opts) {
    opts = opts || {};
    if (opts.state) sessionSet('gradright_cal_oauth_state', opts.state);
    if (opts.verifier) sessionSet('gradright_cal_pkce_verifier', opts.verifier);
    if (opts.redirectUri) {
      sessionSet('gradright_cal_oauth_redirect', opts.redirectUri);
      writeConfig({ redirectUri: opts.redirectUri });
    }
    if (isRealClientId(readConfig().clientId)) writeConfig({ clientId: readConfig().clientId });
  }

  function completeOAuthCode(code) {
    return exchangeAuthorizationCode(code);
  }

  function connectLive() {
    var cfg = readConfig();
    if (document.getElementById('cal-onboard-root')) {
      return Promise.reject(new Error('Use Continue with Cal.com.'));
    }
    if (isRealClientId(cfg.clientId) && location.protocol !== 'file:') {
      return startOnboardingEmbed();
    }
    if (cfg.accessToken && String(cfg.accessToken).indexOf('cal_') === 0) {
      return connectWithApiKey(cfg.accessToken);
    }
    return Promise.reject(new Error('Add a Cal.com API key in js/cal-config.js, then click Continue again.'));
  }

  function tryAutoConnect() {
    var state = read();
    if (state.connected && state.mode === 'live' && token()) {
      return hydrateFromCal().catch(function () {
        return read();
      });
    }
    return Promise.resolve(null);
  }

  function connectWithApiKey(apiKey) {
    var key = String(apiKey || '').trim();
    if (!key) return Promise.reject(new Error('Add a Cal.com API key in js/cal-config.js.'));
    if (key.indexOf('cal_') !== 0) {
      return Promise.reject(new Error('Cal.com API keys start with cal_.'));
    }
    writeConfig({ accessToken: key });
    write(Object.assign(read(), {
      connected: true,
      mode: 'live',
      accessToken: key,
      refreshToken: '',
      connectedAt: nowStamp(),
    }));
    return hydrateFromCal().catch(function (err) {
      write(Object.assign(read(), { connected: false, mode: 'demo', accessToken: '' }));
      writeConfig({ accessToken: '' });
      return Promise.reject(new Error(authErrorText(err) || 'Cal.com rejected that API key.'));
    });
  }

  function disconnect() {
    var state = read();
    writeConfig({ accessToken: '' });
    persistConnectedFlag(false);
    return write(Object.assign(emptyState(), { bookings: state.bookings || [], connected: false }));
  }

  function getSchedule() {
    var local = window.GradRightCalendar ? GradRightCalendar.get() : {};
    var mapped = scheduleFromLocal(local);
    if (!liveEnabled()) return Promise.resolve({ status: 'success', data: mapped });
    return api('/schedules/' + (read().scheduleId || ''), { version: '2024-06-11' })
      .then(function (json) {
        var payload = json.data || json;
        var converted = localFromSchedule(payload);
        if (window.GradRightCalendar) {
          GradRightCalendar.set(Object.assign(GradRightCalendar.get(), converted));
        }
        write(Object.assign(read(), {
          scheduleId: payload.id || read().scheduleId,
          scheduleName: payload.name || read().scheduleName,
          isDefault: payload.isDefault !== false,
        }));
        return { status: 'success', data: payload };
      })
      .catch(function () {
        return { status: 'success', data: mapped };
      });
  }

  function saveSchedule(form) {
    form = form || {};
    var calendar = window.GradRightCalendar
      ? GradRightCalendar.set({
          duration: form.duration,
          schedule: form.schedule,
          blockedDates: form.blockedDates,
          dateOverrides: form.dateOverrides,
          timezone: form.timezone,
          bookingPeriod: form.bookingPeriod,
          noticeValue: form.noticeValue,
          noticeUnit: form.noticeUnit,
          buffer: form.buffer,
          policy: form.policy,
          scheduleName: form.scheduleName,
        })
      : form;
    write(Object.assign(read(), {
      scheduleName: form.scheduleName || read().scheduleName,
      isDefault: form.isDefault != null ? !!form.isDefault : read().isDefault,
    }));
    var payload = scheduleFromLocal(calendar);
    payload.name = form.scheduleName || payload.name;
    payload.isDefault = form.isDefault != null ? !!form.isDefault : payload.isDefault;
    payload.timeZone = form.timezone || payload.timeZone;
    if (!liveEnabled()) {
      return Promise.resolve({ status: 'success', data: payload });
    }
    return api('/schedules/' + (read().scheduleId || payload.id), {
      method: 'PATCH',
      version: '2024-06-11',
      body: {
        name: payload.name,
        timeZone: payload.timeZone,
        isDefault: payload.isDefault,
        availability: payload.availability,
        overrides: payload.overrides || [],
      },
    }).catch(function () {
      return { status: 'success', data: payload };
    });
  }

  function slotsForRange(start, end) {
    var data = window.GradRightCalendar ? GradRightCalendar.get() : {};
    var booked = listMeets().map(function (b) {
      return { day: b.day, date: b.day, time: b.time, mins: b.mins };
    });
    if (window.GradRightCalls && GradRightCalls.all) {
      GradRightCalls.all().forEach(function (c) {
        if (c.status === 'cancelled' || c.status === 'moved') return;
        booked.push({ day: c.day, date: c.day, time: c.time, mins: c.mins });
      });
    }
    var out = [];
    var cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= last) {
      if (window.GradRightCalendar && GradRightCalendar.slotsForDate) {
        GradRightCalendar.slotsForDate(cursor, { booked: booked }).forEach(function (slot) {
          out.push(slot);
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (!liveEnabled()) {
      return Promise.resolve({ status: 'success', data: { slots: groupSlots(out) } });
    }
    var state = read();
    var q =
      '/slots?username=' +
      encodeURIComponent(state.username) +
      '&eventSlug=' +
      encodeURIComponent(state.eventSlug || 'meet') +
      '&start=' +
      start.toISOString() +
      '&end=' +
      last.toISOString();
    return api(q, { version: '2024-09-04' }).catch(function () {
      return { status: 'success', data: { slots: groupSlots(out) } };
    });
  }

  function groupSlots(list) {
    var map = {};
    list.forEach(function (slot) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot.start || slot.iso || slot.time);
    });
    return map;
  }

  function listMeets() {
    return (read().bookings || []).slice();
  }

  function listEventTypes() {
    if (window.GradRightServices) return syncEventTypesFromServices();
    return (read().eventTypes || defaultEventTypes()).slice();
  }

  function eventTypeById(id) {
    return listEventTypes().filter(function (e) {
      return String(e.id) === String(id);
    })[0] || null;
  }

  function nextEventId(list) {
    var max = 0;
    list.forEach(function (e) {
      if (Number(e.id) > max) max = Number(e.id);
    });
    return max + 1;
  }

  function createEventType(input) {
    input = input || {};
    var state = read();
    var list = (state.eventTypes || []).slice();
    var ev = {
      id: nextEventId(list),
      title: input.title || 'New meet',
      slug: slugify(input.slug || input.title),
      duration: Number(input.duration) || 30,
      description: input.description || '',
      location: input.location || (state.conferencing && state.conferencing.defaultApp) || 'gradright-meet',
      hidden: false,
    };
    if (list.some(function (e) { return e.slug === ev.slug; })) ev.slug += '-' + ev.id;
    list.push(ev);
    write(Object.assign(state, { eventTypes: list }));
    if (liveEnabled()) {
      return api('/event-types', {
        method: 'POST',
        version: '2024-06-14',
        body: { title: ev.title, slug: ev.slug, lengthInMinutes: ev.duration },
      }).then(function () {
        return { status: 'success', data: ev };
      }).catch(function () {
        return { status: 'success', data: ev };
      });
    }
    return Promise.resolve({ status: 'success', data: ev });
  }

  function updateEventType(id, fields) {
    var state = read();
    var list = (state.eventTypes || []).map(function (e) {
      if (String(e.id) !== String(id)) return e;
      var next = Object.assign({}, e, fields || {});
      if (fields && fields.title && !fields.slug) next.slug = slugify(fields.title);
      if (fields && fields.slug) next.slug = slugify(fields.slug);
      if (fields && fields.duration != null) next.duration = Number(fields.duration) || e.duration;
      return next;
    });
    write(Object.assign(state, { eventTypes: list }));
    var saved = list.filter(function (e) { return String(e.id) === String(id); })[0];
    applyEventToCalendarStore(saved);
    if (liveEnabled() && saved && saved.calId) {
      return api('/event-types/' + saved.calId, {
        method: 'PATCH',
        version: '2024-06-14',
        body: eventTypeApiBody(saved),
      }).then(function () {
        return { status: 'success', data: saved };
      }).catch(function () {
        return { status: 'success', data: saved };
      });
    }
    return Promise.resolve({ status: 'success', data: saved || eventTypeById(id) });
  }

  function deleteEventType(id) {
    var state = read();
    var list = (state.eventTypes || []).filter(function (e) {
      return String(e.id) !== String(id);
    });
    if (!list.length) list = defaultEventTypes();
    write(Object.assign(state, { eventTypes: list, eventTypeId: list[0].id, eventSlug: list[0].slug }));
    return Promise.resolve({ status: 'success' });
  }

  function calendarSlug(provider) {
    if (provider === 'outlook') return 'office365';
    return provider;
  }

  function authRedirectUrl(json) {
    if (!json) return '';
    var data = json.data || json;
    return data.authUrl || data.url || data.redirectUrl || data.authorizationUrl || '';
  }

  function connectCalendar(provider) {
    var state = read();
    var calendars = Object.assign(defaultCalendars(), state.calendars);
    if (calendars.connected.indexOf(provider) < 0) calendars.connected = calendars.connected.concat([provider]);
    if (!calendars.destination) calendars.destination = provider;
    if (calendars.check.indexOf(provider) < 0) calendars.check = calendars.check.concat([provider]);
    write(Object.assign(state, { calendars: calendars }));
    if (liveEnabled()) {
      var redir = defaultRedirect();
      var path = '/calendars/' + calendarSlug(provider) + '/connect';
      if (redir) path += '?redir=' + encodeURIComponent(redir + (redir.indexOf('?') >= 0 ? '&' : '?') + 'tab=calendars');
      api(path).then(function (json) {
        var url = authRedirectUrl(json);
        if (url) location.href = url;
      }).catch(function () {});
    }
    return calendars;
  }

  function disconnectCalendar(provider) {
    var state = read();
    var calendars = Object.assign(defaultCalendars(), state.calendars);
    calendars.connected = calendars.connected.filter(function (p) { return p !== provider; });
    calendars.check = calendars.check.filter(function (p) { return p !== provider; });
    if (calendars.destination === provider) calendars.destination = calendars.connected[0] || '';
    write(Object.assign(state, { calendars: calendars }));
    return calendars;
  }

  function setDestination(provider) {
    var state = read();
    var calendars = Object.assign(defaultCalendars(), state.calendars);
    calendars.destination = provider;
    write(Object.assign(state, { calendars: calendars }));
    return calendars;
  }

  function toggleConflictCalendar(provider) {
    var state = read();
    var calendars = Object.assign(defaultCalendars(), state.calendars);
    if (calendars.check.indexOf(provider) >= 0) {
      calendars.check = calendars.check.filter(function (p) { return p !== provider; });
    } else {
      calendars.check = calendars.check.concat([provider]);
    }
    write(Object.assign(state, { calendars: calendars }));
    return calendars;
  }

  function installConferencing(app) {
    var state = read();
    var conf = Object.assign(defaultConferencing(), state.conferencing);
    if (conf.installed.indexOf(app) < 0) conf.installed = conf.installed.concat([app]);
    write(Object.assign(state, { conferencing: conf }));
    if (liveEnabled() && app !== 'gradright-meet') {
      var returnTo = defaultRedirect() || location.href;
      var done = returnTo + (returnTo.indexOf('?') >= 0 ? '&' : '?') + 'tab=calendars';
      var req = app === 'google-meet'
        ? api('/conferencing/google-meet/connect', { method: 'POST' })
        : api('/conferencing/' + app + '/oauth/auth-url?returnTo=' + encodeURIComponent(done));
      req.then(function (json) {
        var url = authRedirectUrl(json);
        if (url) location.href = url;
      }).catch(function () {});
    }
    return conf;
  }

  function removeConferencing(app) {
    if (app === 'gradright-meet') return read().conferencing;
    var state = read();
    var conf = Object.assign(defaultConferencing(), state.conferencing);
    conf.installed = conf.installed.filter(function (a) { return a !== app; });
    if (conf.defaultApp === app) conf.defaultApp = 'gradright-meet';
    write(Object.assign(state, { conferencing: conf }));
    return conf;
  }

  function setDefaultConferencing(app) {
    var state = read();
    var conf = Object.assign(defaultConferencing(), state.conferencing);
    if (conf.installed.indexOf(app) < 0) conf.installed = conf.installed.concat([app]);
    conf.defaultApp = app;
    write(Object.assign(state, { conferencing: conf }));
    return conf;
  }

  function createBooking(input) {
    input = input || {};
    var person =
      (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[input.personId]) || {};
    var chosenId = Array.isArray(input.eventTypeId) ? input.eventTypeId[0] : input.eventTypeId;
    var ev = eventTypeById(chosenId) || eventTypeById(read().eventTypeId) || listEventTypes()[0] || {};
    var data = window.GradRightCalendar ? GradRightCalendar.get() : {};
    var mins = Number(ev.duration) || Number(data.duration) || 45;
    var day = input.day || input.date;
    var time = input.time;
    var meet = {
      id: 'c-cal-' + Date.now().toString(36),
      personId: input.personId || person.id || 'guest',
      name: person.name || input.name || 'Student',
      initials: person.initials || 'ST',
      amber: !!person.amber,
      role: person.role || 'student',
      service: ev.title || 'Meet',
      day: day,
      time: time,
      mins: mins,
      status: 'upcoming',
      bookedOn: nowStamp(),
      calUid: 'cal_' + Date.now().toString(36),
      source: 'cal.com',
      eventTypeId: ev.id,
      eventSlug: ev.slug,
    };
    var state = read();
    state.bookings = (state.bookings || []).concat([meet]);
    write(state);

    if (!liveEnabled()) {
      return Promise.resolve({ status: 'success', data: meet });
    }
    var startIso = input.startIso;
    if (!startIso) {
      var p = String(time || '09:00').split(':');
      startIso = day + 'T' + pad2(p[0]) + ':' + pad2(p[1] || '00') + ':00Z';
    }
    return api('/bookings', {
      method: 'POST',
      version: '2024-08-13',
      body: {
        start: startIso,
        eventTypeSlug: ev.slug || state.eventSlug || 'intro-meet',
        username: state.username,
        attendee: {
          name: meet.name,
          email: person.email || 'student@example.com',
          timeZone: (window.GradRightCalendar && GradRightCalendar.get().timezone) || 'Asia/Kolkata',
        },
      },
    })
      .then(function (json) {
        meet.calUid = (json.data && (json.data.uid || json.data.id)) || meet.calUid;
        var next = read();
        next.bookings = (next.bookings || []).map(function (b) {
          return b.id === meet.id ? meet : b;
        });
        write(next);
        return { status: 'success', data: meet };
      })
      .catch(function () {
        return { status: 'success', data: meet };
      });
  }

  window.GradRightCal = {
    KEY: KEY,
    CONFIG_KEY: CONFIG_KEY,
    get: read,
    set: write,
    isConnected: isConnected,
    connectDemo: connectDemo,
    connectLive: connectLive,
    tryAutoConnect: tryAutoConnect,
    connectWithApiKey: connectWithApiKey,
    saveClientId: saveClientId,
    startOAuth: startOAuth,
    startOnboardingEmbed: startOnboardingEmbed,
    rememberOAuthStart: rememberOAuthStart,
    completeOAuthCode: completeOAuthCode,
    handleOAuthCallback: handleOAuthCallback,
    hydrateFromCal: hydrateFromCal,
    defaultRedirect: defaultRedirect,
    authErrorText: authErrorText,
    disconnect: disconnect,
    getSchedule: getSchedule,
    saveSchedule: saveSchedule,
    slotsForRange: slotsForRange,
    createBooking: createBooking,
    listMeets: listMeets,
    listEventTypes: listEventTypes,
    syncEventTypesFromServices: syncEventTypesFromServices,
    eventTypeById: eventTypeById,
    createEventType: createEventType,
    updateEventType: updateEventType,
    deleteEventType: deleteEventType,
    connectCalendar: connectCalendar,
    disconnectCalendar: disconnectCalendar,
    setDestination: setDestination,
    toggleConflictCalendar: toggleConflictCalendar,
    installConferencing: installConferencing,
    removeConferencing: removeConferencing,
    setDefaultConferencing: setDefaultConferencing,
    scheduleFromLocal: scheduleFromLocal,
    liveEnabled: liveEnabled,
    config: readConfig,
    noticeToMinutes: noticeToMinutes,
    minutesToNotice: minutesToNotice,
    periodLabelToDays: periodLabelToDays,
    slugify: slugify,
  };
})();
