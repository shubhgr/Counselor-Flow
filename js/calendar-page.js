(function () {
  const DAYS = [
    { id: 'mon', label: 'Monday', on: true, ranges: [['9:00 AM', '1:00 PM']] },
    { id: 'tue', label: 'Tuesday', on: true, ranges: [['10:00 AM', '6:00 PM']] },
    { id: 'wed', label: 'Wednesday', on: true, ranges: [['12:00 PM', '8:00 PM']] },
    { id: 'thu', label: 'Thursday', on: true, ranges: [['10:00 AM', '6:00 PM']] },
    { id: 'fri', label: 'Friday', on: false, ranges: [['10:00 AM', '4:00 PM']] },
    { id: 'sat', label: 'Saturday', on: false, ranges: [['10:00 AM', '2:00 PM']] },
    { id: 'sun', label: 'Sunday', on: false, ranges: [['11:00 AM', '3:00 PM']] },
  ];

  const TIME_OPTS = (function () {
    const out = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const ampm = h < 12 ? 'AM' : 'PM';
        let hr = h % 12;
        if (hr === 0) hr = 12;
        out.push(hr + ':' + String(m).padStart(2, '0') + ' ' + ampm);
      }
    }
    return out;
  })();

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const TODAY = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
  const DEFAULT_BLOCKED_DATES = ['2026-9-26', '2026-9-29', '2026-10-2'];

  const root = document.getElementById('calendar-root');
  const connectEl = document.getElementById('cal-connect');
  const workspaceEl = document.getElementById('cal-workspace');
  const unsavedBar = document.getElementById('unsaved-bar');
  const oauthModal = document.getElementById('cal-oauth-modal');
  const disconnectModal = document.getElementById('cal-disconnect-modal');
  const rescheduleModal = document.getElementById('reschedule-modal');
  const blockModal = document.getElementById('block-modal');
  const weekEl = document.getElementById('week-hours');
  const blockedList = document.getElementById('blocked-dates-list');
  const blockCal = document.getElementById('block-cal');
  const bookerCal = document.getElementById('booker-cal');
  const bookerSlots = document.getElementById('booker-slots');
  const bookerStudent = document.getElementById('booker-student');
  const bookerEvent = document.getElementById('booker-event');
  const bookerConfirm = document.getElementById('booker-confirm');
  let policy = { mode: 'request', notice: '24h' };
  let schedule = DAYS.map(function (d) {
    return { id: d.id, label: d.label, on: d.on, ranges: d.ranges.map(function (r) { return r.slice(); }) };
  });
  let dateOverrides = DEFAULT_BLOCKED_DATES.map(function (key) {
    return { date: key, unavailable: true, ranges: [] };
  });
  let pendingBlock = new Set();
  let pendingOverrideMode = 'unavailable';
  let pendingOverrideRange = ['9:00 AM', '5:00 PM'];
  let blockView = { y: 2026, m: 8 };
  let bookerView = { y: 2026, m: 8 };
  let bookerDay = null;
  let bookerTime = null;
  let bookerEventId = null;
  let editingEventId = null;
  let baseline = null;
  let dirty = false;
  let eventDirty = false;
  let activeTab = 'availability';

  function connected() {
    return window.GradRightCal && GradRightCal.isConnected();
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function normalizeTimeLabel(value) {
    const raw = String(value == null ? '' : value).trim();
    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) {
      return Number(ampm[1]) + ':' + ampm[2] + ' ' + ampm[3].toUpperCase();
    }
    const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hhmm) {
      const h = Number(hhmm[1]);
      return (h % 12 || 12) + ':' + pad2(Number(hhmm[2])) + ' ' + (h >= 12 ? 'PM' : 'AM');
    }
    return '9:00 AM';
  }

  function normalizeRange(range, fallback) {
    const fb = fallback && fallback.length >= 2 ? fallback : ['9:00 AM', '5:00 PM'];
    if (Array.isArray(range) && range.length >= 2) {
      return [normalizeTimeLabel(range[0]), normalizeTimeLabel(range[1])];
    }
    if (range && typeof range === 'object') {
      const start = range.start || range.startTime || range.from;
      const end = range.end || range.endTime || range.to;
      if (start && end) return [normalizeTimeLabel(start), normalizeTimeLabel(end)];
    }
    return [normalizeTimeLabel(fb[0]), normalizeTimeLabel(fb[1])];
  }

  function normalizeSchedule(list) {
    return DAYS.map(function (d) {
      const saved = (list || []).filter(function (s) { return s && s.id === d.id; })[0] || d;
      const source = saved.ranges && saved.ranges.length ? saved.ranges : d.ranges;
      const ranges = source.map(function (r) { return normalizeRange(r, d.ranges[0]); });
      return {
        id: d.id,
        label: d.label,
        on: saved.on == null ? !!d.on : !!saved.on,
        ranges: ranges.length ? ranges : [normalizeRange(null, d.ranges[0])],
      };
    });
  }

  function applyCalendarStore() {
    if (!window.GradRightCalendar) {
      schedule = normalizeSchedule(DAYS);
      return;
    }
    const data = GradRightCalendar.get() || {};
    const tz = document.getElementById('timezone');
    const nameEl = document.getElementById('schedule-name');
    if (tz && data.timezone) tz.value = data.timezone;
    if (nameEl) nameEl.value = data.scheduleName || 'Working Hours';
    const def = document.getElementById('schedule-default');
    if (def && window.GradRightCal) def.checked = GradRightCal.get().isDefault !== false;
    schedule = normalizeSchedule(data.schedule && data.schedule.length ? data.schedule : DAYS);
    dateOverrides = prunePastOverrides(overridesFromStore(data));
    if (!dateOverrides.length && !data.dateOverrides && !data.blockedDates) {
      dateOverrides = prunePastOverrides(DEFAULT_BLOCKED_DATES.map(function (key) {
        return { date: key, unavailable: true, ranges: [] };
      }));
    }
    if (data.policy) policy = { mode: data.policy.mode || 'request', notice: data.policy.notice || '24h' };
  }

  function overrideDateValue(key) {
    const parts = String(key || '').split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function prunePastOverrides(list) {
    const start = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    return (list || []).filter(function (item) {
      return overrideDateValue(item.date) >= start;
    });
  }

  function overridesFromStore(data) {
    if (data && Array.isArray(data.dateOverrides) && data.dateOverrides.length) {
      return data.dateOverrides.map(function (item) {
        if (typeof item === 'string') return { date: item, unavailable: true, ranges: [] };
        return {
          date: item.date,
          unavailable: item.unavailable !== false && !(item.ranges && item.ranges.length),
          ranges: (item.ranges || []).map(function (r) { return r.slice(); }),
        };
      });
    }
    return ((data && data.blockedDates) || []).map(function (key) {
      return { date: key, unavailable: true, ranges: [] };
    });
  }

  function blockedDateKeys() {
    return dateOverrides.filter(function (o) { return o.unavailable; }).map(function (o) { return o.date; });
  }

  function overrideLabel(item) {
    if (item.unavailable || !item.ranges || !item.ranges.length) return 'unavailable';
    return item.ranges.map(function (r) { return r[0] + ' – ' + r[1]; }).join(', ');
  }

  function renderOverrideHours() {
    const wrap = document.getElementById('override-hours');
    if (!wrap) return;
    wrap.hidden = pendingOverrideMode !== 'hours';
    wrap.innerHTML =
      timeSelect(pendingOverrideRange[0]) +
      '<span class="sched-dash">–</span>' +
      timeSelect(pendingOverrideRange[1]);
  }

  function validateAvailabilityForm() {
    const errors = {};
    schedule.forEach(function (day) {
      if (day.on && Object.keys(overlappingIndexes(day.ranges)).length) {
        errors[day.id] = 'Time overlaps with another slot';
      }
    });
    return { isValid: !Object.keys(errors).length, errors: errors };
  }

  function activeDuration() {
    const el = document.querySelector('#ev-durations button.active');
    return el ? el.dataset.value : '45';
  }

  function timeSelect(value) {
    return (
      '<select data-track>' +
      TIME_OPTS.map(function (t) {
        return '<option' + (t === value ? ' selected' : '') + '>' + t + '</option>';
      }).join('') +
      '</select>'
    );
  }

  function toMinutes(label) {
    const m = String(label).match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3].toUpperCase();
    if (ap === 'AM') {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return h * 60 + min;
  }

  function fromMinutes(total) {
    const day = 24 * 60;
    total = ((total % day) + day) % day;
    const snapped = Math.round(total / 15) * 15;
    let h = Math.floor(snapped / 60);
    const min = snapped % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    let hr = h % 12;
    if (hr === 0) hr = 12;
    return hr + ':' + String(min).padStart(2, '0') + ' ' + ap;
  }

  function nextRangeAfter(ranges, fromIndex) {
    const source = ranges[fromIndex] || ranges[ranges.length - 1] || ['9:00 AM', '1:00 PM'];
    const last = toMinutes(TIME_OPTS[TIME_OPTS.length - 1]);
    const startMin = toMinutes(source[1]);
    if (startMin >= last) {
      return [TIME_OPTS[TIME_OPTS.length - 2], TIME_OPTS[TIME_OPTS.length - 1]];
    }
    let endMin = startMin + 4 * 60;
    if (endMin > last) endMin = last;
    if (endMin <= startMin) endMin = Math.min(startMin + 15, last);
    return [fromMinutes(startMin), fromMinutes(endMin)];
  }

  function rangeInterval(start, end) {
    let a = toMinutes(start);
    let b = toMinutes(end);
    if (b <= a) b += 24 * 60;
    return [a, b];
  }

  function overlappingIndexes(ranges) {
    const bad = {};
    const intervals = ranges.map(function (r) { return rangeInterval(r[0], r[1]); });
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        if (intervals[i][0] < intervals[j][1] && intervals[j][0] < intervals[i][1]) {
          bad[i] = true;
          bad[j] = true;
        }
      }
    }
    return bad;
  }

  function snapshot() {
    const tz = document.getElementById('timezone');
    return JSON.stringify({
      timezone: tz ? tz.value : '',
      scheduleName: (document.getElementById('schedule-name') || {}).value,
      isDefault: !!(document.getElementById('schedule-default') || {}).checked,
      schedule: schedule,
      dateOverrides: dateOverrides.slice().sort(function (a, b) {
        return String(a.date).localeCompare(String(b.date), undefined, { numeric: true });
      }),
    });
  }

  function setDirty(next) {
    dirty = next;
    if (unsavedBar) unsavedBar.hidden = !dirty;
    document.body.classList.toggle('has-unsaved', dirty);
  }

  function markDirty() {
    const availDirty = baseline ? snapshot() !== baseline : false;
    setDirty(availDirty || eventDirty);
  }

  function captureBaseline() {
    baseline = snapshot();
    eventDirty = false;
    setDirty(false);
  }

  function renderSchedule() {
    if (!weekEl) return;
    if (!schedule || !schedule.length) schedule = normalizeSchedule(DAYS);
    weekEl.innerHTML = schedule
      .map(function (day) {
        const overlap = day.on ? overlappingIndexes(day.ranges) : {};
        const hasAnyOverlap = Object.keys(overlap).length > 0;
        const slots = day.on
          ? day.ranges
              .map(function (range, idx) {
                const hasOverlap = !!overlap[idx];
                return (
                  '<div class="sched-slot' +
                  (hasOverlap ? ' has-error' : '') +
                  '" data-day="' +
                  day.id +
                  '" data-idx="' +
                  idx +
                  '">' +
                  timeSelect(range[0]) +
                  '<span class="sched-dash">–</span>' +
                  timeSelect(range[1]) +
                  '<button type="button" class="sched-icon-btn sched-add-slot" title="Add hours" aria-label="Add hours">' +
                  '<span class="material-symbols-rounded" aria-hidden="true">add_circle</span></button>' +
                  (day.ranges.length > 1
                    ? '<button type="button" class="sched-icon-btn sched-remove-slot" title="Remove" aria-label="Remove">' +
                      '<span class="material-symbols-rounded" aria-hidden="true">cancel</span></button>'
                    : '<span class="sched-icon-spacer"></span>') +
                  '</div>'
                );
              })
              .join('') +
            (hasAnyOverlap ? '<div class="sched-slot-error">Time overlaps with another slot</div>' : '')
          : '<span class="sched-unavailable">Unavailable</span>';

        return (
          '<div class="sched-day-row' +
          (day.on ? '' : ' is-off') +
          '" data-day="' +
          day.id +
          '">' +
          '<label class="sched-day-check">' +
          '<input type="checkbox" ' +
          (day.on ? 'checked' : '') +
          ' data-day-toggle="' +
          day.id +
          '" />' +
          '<strong>' +
          day.label +
          '</strong>' +
          '</label>' +
          '<div class="sched-day-slots">' +
          slots +
          '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function formatBlocked(key) {
    const parts = key.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderBlockedList() {
    if (!blockedList) return;
    dateOverrides = prunePastOverrides(dateOverrides);
    const sorted = dateOverrides.slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date), undefined, { numeric: true });
    });
    if (!sorted.length) {
      blockedList.innerHTML = '<li class="sched-blocked-empty">No date overrides yet</li>';
      return;
    }
    blockedList.innerHTML = sorted
      .map(function (item) {
        return (
          '<li>' +
          '<div><strong>' +
          formatBlocked(item.date) +
          '</strong><span>' +
          overrideLabel(item) +
          '</span></div>' +
          '<button type="button" class="sched-icon-btn" data-unblock="' +
          item.date +
          '" aria-label="Remove date override">' +
          '<span class="material-symbols-rounded" aria-hidden="true">delete</span></button>' +
          '</li>'
        );
      })
      .join('');
  }

  function renderBlockCal() {
    if (!blockCal) return;
    document.getElementById('block-month-label').textContent = MONTHS[blockView.m] + ' ' + blockView.y;
    const first = new Date(blockView.y, blockView.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(blockView.y, blockView.m + 1, 0).getDate();
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      .map(function (d) { return '<div class="block-cal-dow">' + d + '</div>'; })
      .join('');
    let cells = '';
    for (let i = 0; i < startPad; i++) cells += '<button type="button" class="block-cal-day is-empty" disabled></button>';
    for (let d = 1; d <= daysInMonth; d++) {
      const key = blockView.y + '-' + (blockView.m + 1) + '-' + d;
      const selected = pendingBlock.has(key);
      const past = overrideDateValue(key) < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
      cells +=
        '<button type="button" class="block-cal-day' +
        (selected ? ' is-selected' : '') +
        (past ? ' is-past' : '') +
        '" data-date="' +
        key +
        '"' +
        (past ? ' disabled' : '') +
        '>' +
        d +
        '</button>';
    }
    blockCal.innerHTML = dow + cells;
  }

  function dayById(id) {
    return schedule.find(function (d) { return d.id === id; });
  }

  function syncDayFromDom(dayId) {
    const day = dayById(dayId);
    if (!day || !day.on) return;
    const rows = weekEl.querySelectorAll('.sched-slot[data-day="' + dayId + '"]');
    day.ranges = [];
    rows.forEach(function (row) {
      const selects = row.querySelectorAll('select');
      if (selects.length >= 2) day.ranges.push([selects[0].value, selects[1].value]);
    });
    if (!day.ranges.length) day.ranges = [['9:00 AM', '5:00 PM']];
  }

  function calUsername() {
    if (!window.GradRightCal) return 'shubhanshu-singh-qb543g';
    return GradRightCal.get().username || 'shubhanshu-singh-qb543g';
  }

  function paintConnectedChip() {
    const link = document.getElementById('cal-profile-link');
    if (!link) return;
    const username = calUsername();
    const href = 'https://cal.com/' + username;
    link.href = href;
    link.textContent = 'cal.com/' + username;
    link.title = href;
  }

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('[data-cal-tab]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-cal-tab') === tab);
    });
    ['availability', 'events', 'calendars'].forEach(function (id) {
      const el = document.getElementById('tab-' + id);
      if (el) el.hidden = tab !== id;
    });
    if (baseline) markDirty();
    if (tab === 'events') renderEventTypes();
    if (tab === 'calendars') {
      renderCalendarApps();
      renderConferencing();
    }
  }

  function showWorkspace() {
    if (connectEl) connectEl.hidden = true;
    if (workspaceEl) workspaceEl.hidden = false;
    try { paintConnectedChip(); } catch (e) {}
    try {
      if (window.GradRightCal && GradRightCal.syncEventTypesFromServices) {
        GradRightCal.syncEventTypesFromServices();
      }
    } catch (e) {}
    try {
      applyCalendarStore();
    } catch (e) {
      schedule = normalizeSchedule(DAYS);
    }
    renderSchedule();
    try { renderBlockedList(); } catch (e) {}
    try { captureBaseline(); } catch (e) {}
    try {
      const params = new URLSearchParams(location.search);
      const allowed = { events: 1, calendars: 1, availability: 1 };
      setTab(allowed[params.get('tab')] ? params.get('tab') : 'availability');
    } catch (e) {}
  }

  function showConnect() {
    if (connectEl) connectEl.hidden = false;
    if (workspaceEl) workspaceEl.hidden = true;
    setDirty(false);
    paintConnectForm();
  }

  function renderShell() {
    if (connected()) showWorkspace();
    else showConnect();
  }

  function openModal(el) {
    if (!el) return;
    el.hidden = false;
    document.body.classList.add('cal-modal-open');
  }

  function closeModal(el) {
    if (!el) return;
    el.hidden = true;
    if (!document.querySelector('.cal-modal:not([hidden])')) {
      document.body.classList.remove('cal-modal-open');
    }
  }

  function toast(title, text) {
    let el = document.getElementById('cal-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cal-toast';
      el.className = 'cal-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = '<strong>' + title + '</strong>' + (text ? '<span>' + text + '</span>' : '');
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.hidden = true; }, 3200);
  }

  function bookedTimes() {
    const extra = window.GradRightCal ? GradRightCal.listMeets() : [];
    const calls = window.GradRightCalls && GradRightCalls.all ? GradRightCalls.all() : [];
    return extra.concat(calls)
      .filter(function (c) { return c.status !== 'cancelled' && c.status !== 'moved'; })
      .map(function (c) { return { day: c.day, date: c.day, time: c.time, mins: c.mins }; });
  }

  function dateKey(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function selectedEvent() {
    if (!window.GradRightCal) return { id: 1, title: 'Meet', duration: 45 };
    return GradRightCal.eventTypeById(bookerEventId) || GradRightCal.listEventTypes()[0] || { duration: 45 };
  }

  function slotsOn(y, m, d) {
    if (!window.GradRightCalendar || !GradRightCalendar.slotsForDate) return [];
    return GradRightCalendar.slotsForDate(new Date(y, m, d), {
      booked: bookedTimes(),
      duration: selectedEvent().duration,
    });
  }

  function locationLabel(key) {
    if (key === 'google-meet') return 'Google Meet';
    if (key === 'zoom') return 'Zoom';
    return 'GradRight Meet';
  }

  function calendarLabel(key) {
    if (key === 'google') return 'Google Calendar';
    if (key === 'outlook') return 'Outlook';
    if (key === 'apple') return 'Apple Calendar';
    return key;
  }

  function fillEvents() {
    if (!bookerEvent) return;
    const events = window.GradRightCal ? GradRightCal.listEventTypes() : [];
    const current = bookerEventId || (events[0] && events[0].id);
    bookerEvent.innerHTML = events
      .map(function (ev) {
        return '<option value="' + ev.id + '">' + ev.title + ' · ' + ev.duration + ' min</option>';
      })
      .join('');
    if (current) bookerEvent.value = String(current);
    bookerEventId = bookerEvent.value;
  }

  function fillStudents() {
    if (!bookerStudent) return;
    const people = ((window.GradRightDB && GradRightDB.connected) || []).filter(function (p) {
      return p && p.id && !/^p[0-9a-f]{7,}$/i.test(p.id);
    });
    const current = bookerStudent.value;
    bookerStudent.innerHTML = people
      .map(function (p) {
        return '<option value="' + p.id + '">' + p.name + (p.role === 'parent' ? ' · Parent' : '') + '</option>';
      })
      .join('');
    if (current && people.some(function (p) { return p.id === current; })) bookerStudent.value = current;
  }

  function renderBooker() {
    if (!bookerCal) return;
    fillEvents();
    fillStudents();
    document.getElementById('booker-month-label').textContent = MONTHS[bookerView.m] + ' ' + bookerView.y;
    const first = new Date(bookerView.y, bookerView.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(bookerView.y, bookerView.m + 1, 0).getDate();
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      .map(function (d) { return '<div class="block-cal-dow">' + d + '</div>'; })
      .join('');
    let cells = '';
    for (let i = 0; i < startPad; i++) cells += '<button type="button" class="block-cal-day is-empty" disabled></button>';
    const todayKey = dateKey(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(bookerView.y, bookerView.m, d);
      const past = new Date(bookerView.y, bookerView.m, d) < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
      const slots = past ? [] : slotsOn(bookerView.y, bookerView.m, d);
      const selected = bookerDay === key;
      cells +=
        '<button type="button" class="block-cal-day' +
        (selected ? ' is-selected' : '') +
        (slots.length ? ' has-slots' : '') +
        (key === todayKey ? ' is-today' : '') +
        (past || !slots.length ? ' is-muted' : '') +
        '" data-booker-date="' +
        key +
        '" ' +
        (past || !slots.length ? 'disabled' : '') +
        '>' +
        d +
        '</button>';
    }
    bookerCal.innerHTML = dow + cells;
    renderBookerSlots();
  }

  function renderBookerSlots() {
    if (!bookerSlots) return;
    const label = document.getElementById('booker-day-label');
    if (!bookerDay) {
      if (label) label.textContent = 'Pick a date';
      bookerSlots.innerHTML = '<p class="hint-text">Choose a highlighted day to see open meet slots from your Cal.com hours.</p>';
      if (bookerConfirm) bookerConfirm.disabled = true;
      return;
    }
    const parts = bookerDay.split('-').map(Number);
    const slots = slotsOn(parts[0], parts[1] - 1, parts[2]);
    if (label) {
      label.textContent = new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
    if (!slots.length) {
      bookerSlots.innerHTML = '<p class="hint-text">No open slots on this day.</p>';
      if (bookerConfirm) bookerConfirm.disabled = true;
      return;
    }
    bookerSlots.innerHTML = slots
      .map(function (slot) {
        return (
          '<button type="button" class="booker-slot' +
          (bookerTime === slot.time ? ' is-active' : '') +
          '" data-booker-time="' +
          slot.time +
          '">' +
          slot.label +
          '</button>'
        );
      })
      .join('');
    if (bookerConfirm) bookerConfirm.disabled = !bookerTime;
  }

  function bindAvailability() {
    root.addEventListener('change', function (e) {
      if (e.target.matches('select, input')) {
        const slot = e.target.closest('.sched-slot');
        if (slot) syncDayFromDom(slot.dataset.day);
        markDirty();
      }
    });
    root.addEventListener('input', function (e) {
      if (e.target.matches('input, select')) markDirty();
    });

    weekEl.addEventListener('change', function (e) {
      const toggle = e.target.closest('[data-day-toggle]');
      if (toggle) {
        const day = dayById(toggle.getAttribute('data-day-toggle'));
        day.on = toggle.checked;
        if (day.on && !day.ranges.length) day.ranges = [['9:00 AM', '5:00 PM']];
        renderSchedule();
        markDirty();
        return;
      }
      const slot = e.target.closest('.sched-slot');
      if (slot && e.target.matches('select')) {
        syncDayFromDom(slot.dataset.day);
        renderSchedule();
        markDirty();
      }
    });

    weekEl.addEventListener('click', function (e) {
      const add = e.target.closest('.sched-add-slot');
      if (add) {
        const slot = add.closest('.sched-slot');
        const day = dayById(slot.dataset.day);
        syncDayFromDom(day.id);
        day.ranges.push(nextRangeAfter(day.ranges, Number(slot.dataset.idx)));
        renderSchedule();
        markDirty();
        return;
      }
      const remove = e.target.closest('.sched-remove-slot');
      if (remove) {
        const slot = remove.closest('.sched-slot');
        const day = dayById(slot.dataset.day);
        syncDayFromDom(day.id);
        if (day.ranges.length > 1) {
          day.ranges.splice(Number(slot.dataset.idx), 1);
          renderSchedule();
          markDirty();
        }
      }
    });

    document.getElementById('open-block-dates').addEventListener('click', function () {
      pendingBlock = new Set();
      pendingOverrideMode = 'unavailable';
      pendingOverrideRange = ['9:00 AM', '5:00 PM'];
      document.querySelectorAll('#override-mode .cal-choice').forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-value') === pendingOverrideMode);
      });
      renderOverrideHours();
      renderBlockCal();
      openModal(blockModal);
    });

    document.getElementById('override-mode').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-value]');
      if (!btn) return;
      pendingOverrideMode = btn.getAttribute('data-value');
      document.querySelectorAll('#override-mode .cal-choice').forEach(function (el) {
        el.classList.toggle('active', el === btn);
      });
      renderOverrideHours();
    });

    document.getElementById('override-hours').addEventListener('change', function () {
      const selects = document.querySelectorAll('#override-hours select');
      if (selects.length >= 2) pendingOverrideRange = [selects[0].value, selects[1].value];
    });

    blockModal.querySelectorAll('[data-close-block]').forEach(function (el) {
      el.addEventListener('click', function () { closeModal(blockModal); });
    });

    document.getElementById('block-prev').addEventListener('click', function () {
      blockView.m -= 1;
      if (blockView.m < 0) { blockView.m = 11; blockView.y -= 1; }
      renderBlockCal();
    });

    document.getElementById('block-next').addEventListener('click', function () {
      blockView.m += 1;
      if (blockView.m > 11) { blockView.m = 0; blockView.y += 1; }
      renderBlockCal();
    });

    blockCal.addEventListener('click', function (e) {
      const btn = e.target.closest('.block-cal-day[data-date]');
      if (!btn) return;
      const key = btn.dataset.date;
      if (pendingBlock.has(key)) pendingBlock.delete(key);
      else pendingBlock.add(key);
      renderBlockCal();
    });

    document.getElementById('confirm-block-dates').addEventListener('click', function () {
      const selected = Array.from(pendingBlock);
      if (!selected.length) {
        closeModal(blockModal);
        return;
      }
      const next = dateOverrides.filter(function (item) {
        return selected.indexOf(item.date) < 0;
      });
      selected.forEach(function (date) {
        next.push({
          date: date,
          unavailable: pendingOverrideMode !== 'hours',
          ranges: pendingOverrideMode === 'hours' ? [pendingOverrideRange.slice()] : [],
        });
      });
      dateOverrides = prunePastOverrides(next);
      renderBlockedList();
      closeModal(blockModal);
      markDirty();
    });

    blockedList.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-unblock]');
      if (!btn) return;
      dateOverrides = dateOverrides.filter(function (item) {
        return item.date !== btn.getAttribute('data-unblock');
      });
      renderBlockedList();
      markDirty();
    });

    document.getElementById('discard-btn').addEventListener('click', function () {
      location.reload();
    });

    document.getElementById('save-btn').addEventListener('click', function () {
      const btn = document.getElementById('save-btn');
      const check = validateAvailabilityForm();
      if (!check.isValid) {
        renderSchedule();
        toast('Fix overlapping hours', 'A day has two time ranges that overlap.');
        return;
      }
      const payload = {
        schedule: schedule,
        dateOverrides: dateOverrides,
        blockedDates: blockedDateKeys(),
        timezone: document.getElementById('timezone').value,
        scheduleName: (document.getElementById('schedule-name') || {}).value || 'Working Hours',
        isDefault: !!(document.getElementById('schedule-default') || {}).checked,
      };
      const done = function () {
        const finish = function () {
          btn.textContent = 'Saved';
          captureBaseline();
          toast('Changes saved', 'Students will see these hours when they book a meet.');
          setTimeout(function () { btn.textContent = 'Save'; }, 1000);
        };
        if (eventDirty && typeof window._persistCalendarEventType === 'function') {
          window._persistCalendarEventType().then(finish).catch(finish);
        } else {
          finish();
        }
      };
      const fail = function (err) {
        toast('Could not update availability', (err && err.message) || 'Try save again.');
      };
      if (window.GradRightCal) {
        GradRightCal.saveSchedule(payload).then(done).catch(fail);
      } else if (window.GradRightCalendar) {
        GradRightCalendar.set(payload);
        done();
      }
    });
  }

  function bindBooker() {
    if (!bookerCal) return;
    document.getElementById('booker-prev').addEventListener('click', function () {
      bookerView.m -= 1;
      if (bookerView.m < 0) { bookerView.m = 11; bookerView.y -= 1; }
      renderBooker();
    });
    document.getElementById('booker-next').addEventListener('click', function () {
      bookerView.m += 1;
      if (bookerView.m > 11) { bookerView.m = 0; bookerView.y += 1; }
      renderBooker();
    });
    bookerCal.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-booker-date]');
      if (!btn || btn.disabled) return;
      bookerDay = btn.getAttribute('data-booker-date');
      bookerTime = null;
      renderBooker();
    });
    bookerSlots.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-booker-time]');
      if (!btn) return;
      bookerTime = btn.getAttribute('data-booker-time');
      renderBookerSlots();
    });
    if (bookerEvent) {
      bookerEvent.addEventListener('change', function () {
        bookerEventId = bookerEvent.value;
        bookerTime = null;
        renderBooker();
      });
    }
    bookerConfirm.addEventListener('click', function () {
      if (!bookerDay || !bookerTime || !window.GradRightCal) return;
      const personId = bookerStudent.value;
      bookerConfirm.disabled = true;
      bookerConfirm.textContent = 'Booking…';
      GradRightCal.createBooking({
        personId: personId,
        eventTypeId: bookerEventId,
        day: bookerDay,
        date: bookerDay,
        time: bookerTime,
      }).then(function (res) {
        const meet = res.data || {};
        const when = formatBlocked(meet.day || bookerDay) + ' · ' +
          (window.GradRightCalls && GradRightCalls.formatClock
            ? GradRightCalls.formatClock(meet.time)
            : meet.time);
        bookerConfirm.textContent = 'Book meet';
        bookerTime = null;
        renderBooker();
        toast('Meet booked', (meet.service || 'Meet') + ' · ' + (meet.name || 'Student') + ' · ' + when);
      });
    });
  }

  function showAuthError(message) {
    const el = document.getElementById('cal-auth-error');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function paintConnectForm() {
    showAuthError('');
  }

  function renderEventTypes() {
    const list = document.getElementById('event-type-list');
    if (!list || !window.GradRightCal) return;
    const events = GradRightCal.listEventTypes();
    const storedId = GradRightCal.get().eventTypeId;
    if (!editingEventId) editingEventId = storedId || (events[0] && events[0].id);
    list.innerHTML = events
      .map(function (ev) {
        const selected = String(editingEventId) === String(ev.id);
        return (
          '<li class="event-type-row' +
          (selected ? ' is-active' : '') +
          '" data-event-id="' +
          ev.id +
          '" role="radio" aria-checked="' +
          (selected ? 'true' : 'false') +
          '">' +
          '<span class="event-type-radio" aria-hidden="true"></span>' +
          '<div><strong>' +
          ev.title +
          '</strong><span>' +
          ev.duration +
          ' min · ' +
          (ev.bookingWindowDays || 60) +
          'd window · /' +
          ev.slug +
          ' · ' +
          locationLabel(ev.location) +
          (selected ? ' · Selected for booking' : '') +
          '</span></div></li>'
        );
      })
      .join('');
    if (editingEventId) fillEventForm(editingEventId);
  }

  function fillEventForm(id) {
    if (!window.GradRightCal) return;
    const ev = GradRightCal.eventTypeById(id);
    const empty = document.getElementById('event-settings-empty');
    const form = document.getElementById('event-settings-form');
    if (!ev) {
      if (empty) empty.hidden = false;
      if (form) form.hidden = true;
      return;
    }
    editingEventId = ev.id;
    if (empty) empty.hidden = true;
    if (form) form.hidden = false;
    document.getElementById('event-settings-title').textContent = ev.title;
    const from = document.getElementById('ev-from-service');
    if (from) from.textContent = ev.description || 'Students pick this event when they book a call.';
    document.getElementById('ev-location').value = ev.location || 'gradright-meet';
    document.querySelectorAll('#ev-durations button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.value === String(ev.duration));
    });
    const cal = window.GradRightCalendar ? GradRightCalendar.get() : {};
    const noticeMins = ev.noticeMinutes != null
      ? ev.noticeMinutes
      : GradRightCal.noticeToMinutes(cal.noticeValue, cal.noticeUnit);
    const notice = GradRightCal.minutesToNotice(noticeMins);
    const noticeValue = document.getElementById('ev-notice-value');
    const noticeUnit = document.getElementById('ev-notice-unit');
    const buffer = document.getElementById('ev-buffer');
    const period = document.getElementById('ev-booking-period');
    if (noticeValue) noticeValue.value = notice.value;
    if (noticeUnit) noticeUnit.value = notice.unit;
    if (buffer) {
      buffer.value = String(ev.bufferAfter != null ? ev.bufferAfter : parseInt(cal.buffer, 10) || 10);
    }
    if (period) {
      period.value = String(ev.bookingWindowDays != null
        ? ev.bookingWindowDays
        : GradRightCal.periodLabelToDays(cal.bookingPeriod));
    }
    policy = {
      mode: ev.rescheduleMode || (cal.policy && cal.policy.mode) || 'request',
      notice: ev.rescheduleNotice || (cal.policy && cal.policy.notice) || '24h',
    };
  }

  function renderCalendarApps() {
    const mount = document.getElementById('calendar-apps');
    const dest = document.getElementById('calendar-destination');
    if (!mount || !window.GradRightCal) return;
    const calendars = GradRightCal.get().calendars || { connected: [], destination: '', check: [] };
    const providers = ['google', 'outlook', 'apple'];
    mount.innerHTML = providers
      .map(function (p) {
        const on = calendars.connected.indexOf(p) >= 0;
        const checked = calendars.check.indexOf(p) >= 0;
        return (
          '<div class="cal-app-row">' +
          '<div><strong>' +
          calendarLabel(p) +
          '</strong><span>' +
          (on ? (checked ? 'Checking for conflicts' : 'Connected') : 'Not connected') +
          '</span></div>' +
          (on
            ? '<div class="cal-app-actions">' +
              '<label class="atom-default"><input type="checkbox" data-cal-check="' +
              p +
              '"' +
              (checked ? ' checked' : '') +
              ' /> Conflicts</label>' +
              '<button type="button" class="btn btn-ghost btn-sm" data-cal-off="' +
              p +
              '">Remove</button></div>'
            : '<button type="button" class="btn btn-secondary btn-sm" data-cal-on="' +
              p +
              '">Connect</button>') +
          '</div>'
        );
      })
      .join('');
    if (dest) {
      dest.innerHTML = (calendars.connected.length
        ? calendars.connected
        : []
      )
        .map(function (p) {
          return '<option value="' + p + '"' + (calendars.destination === p ? ' selected' : '') + '>' + calendarLabel(p) + '</option>';
        })
        .join('') || '<option value="">Connect a calendar first</option>';
    }
  }

  function renderConferencing() {
    const mount = document.getElementById('conferencing-apps');
    if (!mount || !window.GradRightCal) return;
    const conf = GradRightCal.get().conferencing || { installed: ['gradright-meet'], defaultApp: 'gradright-meet' };
    const apps = [
      { id: 'gradright-meet', title: 'GradRight Meet', hint: 'In-app video' },
      { id: 'google-meet', title: 'Google Meet', hint: 'Needs Google Calendar' },
      { id: 'zoom', title: 'Zoom', hint: 'Zoom account' },
    ];
    mount.innerHTML = apps
      .map(function (app) {
        const on = conf.installed.indexOf(app.id) >= 0;
        const isDefault = conf.defaultApp === app.id;
        return (
          '<div class="cal-app-row">' +
          '<div><strong>' +
          app.title +
          '</strong><span>' +
          (isDefault ? 'Default location' : app.hint) +
          '</span></div>' +
          (on
            ? '<div class="cal-app-actions">' +
              (isDefault
                ? '<span class="hint-text">Default</span>'
                : '<button type="button" class="btn btn-secondary btn-sm" data-conf-default="' +
                  app.id +
                  '">Set default</button>') +
              (app.id === 'gradright-meet'
                ? ''
                : '<button type="button" class="btn btn-ghost btn-sm" data-conf-off="' +
                  app.id +
                  '">Remove</button>') +
              '</div>'
            : '<button type="button" class="btn btn-secondary btn-sm" data-conf-on="' +
              app.id +
              '">Install</button>') +
          '</div>'
        );
      })
      .join('');
  }

  function bindEvents() {
    const list = document.getElementById('event-type-list');
    if (list) {
      list.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-event-id]');
        if (!btn) return;
        editingEventId = btn.getAttribute('data-event-id');
        if (window.GradRightCal) {
          const ev = GradRightCal.eventTypeById(editingEventId);
          if (ev) {
            GradRightCal.set(Object.assign(GradRightCal.get(), {
              eventTypeId: ev.id,
              eventSlug: ev.slug,
            }));
          }
        }
        bookerEventId = editingEventId;
        renderEventTypes();
        fillEvents();
      });
    }
    const durations = document.getElementById('ev-durations');
    if (durations) {
      durations.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        durations.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        eventDirty = true;
        markDirty();
      });
    }
    const openReschedule = document.getElementById('open-reschedule');
    if (openReschedule && rescheduleModal) {
      openReschedule.addEventListener('click', function () {
        openModal(rescheduleModal);
        document.querySelectorAll('#reschedule-mode .cal-choice').forEach(function (b) {
          b.classList.toggle('active', b.dataset.value === policy.mode);
        });
        document.querySelectorAll('#reschedule-notice .cal-choice').forEach(function (b) {
          b.classList.toggle('active', b.dataset.value === policy.notice);
        });
      });
      rescheduleModal.querySelectorAll('[data-close-reschedule]').forEach(function (el) {
        el.addEventListener('click', function () { closeModal(rescheduleModal); });
      });
      document.getElementById('reschedule-mode').addEventListener('click', function (e) {
        const btn = e.target.closest('.cal-choice');
        if (!btn) return;
        document.querySelectorAll('#reschedule-mode .cal-choice').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        policy.mode = btn.dataset.value;
        eventDirty = true;
        markDirty();
      });
      document.getElementById('reschedule-notice').addEventListener('click', function (e) {
        const btn = e.target.closest('.cal-choice');
        if (!btn) return;
        document.querySelectorAll('#reschedule-notice .cal-choice').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        policy.notice = btn.dataset.value;
        eventDirty = true;
        markDirty();
      });
      document.getElementById('update-policy').addEventListener('click', function () {
        closeModal(rescheduleModal);
      });
    }
    const form = document.getElementById('event-settings-form');
    function persistEventType() {
      if (!editingEventId || !window.GradRightCal) return Promise.resolve();
      const dur = document.querySelector('#ev-durations button.active');
      const noticeValue = document.getElementById('ev-notice-value');
      const noticeUnit = document.getElementById('ev-notice-unit');
      const buffer = document.getElementById('ev-buffer');
      const period = document.getElementById('ev-booking-period');
      return GradRightCal.updateEventType(editingEventId, {
        location: document.getElementById('ev-location').value,
        duration: dur ? Number(dur.dataset.value) : 45,
        noticeMinutes: GradRightCal.noticeToMinutes(
          noticeValue ? noticeValue.value : 240,
          noticeUnit ? noticeUnit.value : 'Minutes'
        ),
        bufferAfter: buffer ? Number(buffer.value) : 10,
        bookingWindowDays: period ? Number(period.value) : 60,
        rescheduleMode: policy.mode,
        rescheduleNotice: policy.notice,
      }).then(function () {
        eventDirty = false;
        renderEventTypes();
      });
    }
    if (form) {
      form.addEventListener('input', function () {
        eventDirty = true;
        markDirty();
      });
      form.addEventListener('change', function () {
        eventDirty = true;
        markDirty();
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        persistEventType().then(function () {
          markDirty();
          toast('Event updated', 'Cal.com will use these limits when a student books this service.');
        });
      });
    }
    window._persistCalendarEventType = persistEventType;
  }

  function bindCalendars() {
    document.getElementById('calendar-apps').addEventListener('click', function (e) {
      const on = e.target.closest('[data-cal-on]');
      const off = e.target.closest('[data-cal-off]');
      if (on) {
        GradRightCal.connectCalendar(on.getAttribute('data-cal-on'));
        renderCalendarApps();
        toast('Calendar connected', calendarLabel(on.getAttribute('data-cal-on')) + ' will be checked for conflicts.');
      }
      if (off) {
        GradRightCal.disconnectCalendar(off.getAttribute('data-cal-off'));
        renderCalendarApps();
      }
    });
    document.getElementById('calendar-apps').addEventListener('change', function (e) {
      const box = e.target.closest('[data-cal-check]');
      if (!box) return;
      GradRightCal.toggleConflictCalendar(box.getAttribute('data-cal-check'));
      renderCalendarApps();
    });
    document.getElementById('calendar-destination').addEventListener('change', function () {
      if (this.value) GradRightCal.setDestination(this.value);
    });
    document.getElementById('conferencing-apps').addEventListener('click', function (e) {
      const on = e.target.closest('[data-conf-on]');
      const off = e.target.closest('[data-conf-off]');
      const def = e.target.closest('[data-conf-default]');
      if (on) {
        GradRightCal.installConferencing(on.getAttribute('data-conf-on'));
        renderConferencing();
        toast('App installed', 'You can set this as the default meet location.');
      }
      if (off) {
        GradRightCal.removeConferencing(off.getAttribute('data-conf-off'));
        renderConferencing();
      }
      if (def) {
        GradRightCal.setDefaultConferencing(def.getAttribute('data-conf-default'));
        renderConferencing();
        toast('Default location', 'New event types will use this conferencing app.');
      }
    });
  }

  function closeOauthModal() {
    closeModal(oauthModal);
  }

  function allowCalConnect(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (window.GradRightCal && GradRightCal.connectDemo) {
        GradRightCal.connectDemo({
          name: 'Shubhanshu Singh',
          email: 'shubhanshu@gradright.com',
          username: 'shubhanshu-singh-qb543g',
        });
      }
    } catch (err) {}
    closeOauthModal();
    try {
      showWorkspace();
    } catch (err) {}
    toast('Cal.com connected', 'Signed in as @shubhanshu-singh-qb543g.');
  }

  window.gradRightAllowCal = allowCalConnect;
  window.gradRightDenyCal = closeOauthModal;

  function bindConnect() {
    paintConnectForm();

    const continueBtn = document.getElementById('cal-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', function () {
        openModal(oauthModal);
      });
    }
    if (oauthModal) {
      oauthModal.addEventListener('click', function (e) {
        if (e.target.closest('#cal-oauth-allow')) {
          allowCalConnect(e);
          return;
        }
        if (
          e.target.closest('#cal-oauth-deny') ||
          e.target.closest('.cal-oauth-x') ||
          e.target.classList.contains('cal-oauth-backdrop')
        ) {
          closeOauthModal();
        }
      });
    }

    const disconnectBtn = document.getElementById('cal-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', function () {
        openModal(disconnectModal);
      });
    }
    if (disconnectModal) {
      disconnectModal.querySelectorAll('[data-close-disconnect]').forEach(function (el) {
        el.addEventListener('click', function () {
          closeModal(disconnectModal);
        });
      });
    }
    const confirmDisconnect = document.getElementById('cal-disconnect-confirm');
    if (confirmDisconnect) {
      confirmDisconnect.addEventListener('click', function () {
        if (window.GradRightCal) GradRightCal.disconnect();
        closeModal(disconnectModal);
        paintConnectForm();
        showConnect();
        toast('Cal.com disconnected', 'Connect again when you want students to book.');
      });
    }

    document.querySelectorAll('[data-cal-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTab(btn.getAttribute('data-cal-tab'));
      });
    });
  }

  function bindTips() {
    document.querySelectorAll('.cal-info').forEach(function (info) {
      const text = info.getAttribute('title') || info.getAttribute('aria-label') || '';
      if (!text) return;
      info.setAttribute('data-tip', text);
      info.removeAttribute('title');
      info.addEventListener('mouseenter', function () {
        const tip = document.createElement('div');
        tip.className = 'cal-floating-tip';
        tip.textContent = info.getAttribute('data-tip');
        document.body.appendChild(tip);
        const rect = info.getBoundingClientRect();
        const tipRect = tip.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - tipRect.width / 2;
        left = Math.max(12, Math.min(left, window.innerWidth - tipRect.width - 12));
        let top = rect.top - tipRect.height - 8;
        if (top < 12) top = rect.bottom + 8;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
        info._calTip = tip;
      });
      info.addEventListener('mouseleave', function () {
        if (info._calTip) info._calTip.remove();
        info._calTip = null;
      });
    });
  }

  function start() {
    try {
      bindConnect();
      bindAvailability();
      bindBooker();
      bindEvents();
      bindCalendars();
      bindTips();
    } catch (err) {}
    try {
      if (window.GradRightCal) {
        const state = GradRightCal.get();
        if (state.connected && state.mode === 'live') {
          GradRightCal.set(Object.assign(state, { mode: 'demo', accessToken: '' }));
        }
      }
    } catch (err) {}
    try {
      renderShell();
      if (workspaceEl && !workspaceEl.hidden) renderSchedule();
    } catch (err) {}
  }

  start();
})();
