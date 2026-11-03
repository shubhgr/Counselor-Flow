/**
 * Counselor weekly hours. Saved from Calendar → localStorage.
 */
(function () {
  var KEY = 'gradright_calendar_v1';
  var DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DEFAULT = {
    duration: 45,
    timezone: 'Asia/Kolkata',
    bookingPeriod: '2 Months',
    noticeValue: 240,
    noticeUnit: 'Minutes',
    buffer: '10 min',
    policy: { mode: 'request', notice: '24h' },
    scheduleName: 'Working Hours',
    schedule: [
      { id: 'mon', label: 'Monday', on: true, ranges: [['9:00 AM', '1:00 PM']] },
      { id: 'tue', label: 'Tuesday', on: true, ranges: [['10:00 AM', '6:00 PM']] },
      { id: 'wed', label: 'Wednesday', on: true, ranges: [['12:00 PM', '8:00 PM']] },
      { id: 'thu', label: 'Thursday', on: true, ranges: [['10:00 AM', '6:00 PM']] },
      { id: 'fri', label: 'Friday', on: false, ranges: [['10:00 AM', '4:00 PM']] },
      { id: 'sat', label: 'Saturday', on: false, ranges: [['10:00 AM', '2:00 PM']] },
      { id: 'sun', label: 'Sunday', on: false, ranges: [['11:00 AM', '3:00 PM']] },
    ],
    blockedDates: ['2026-9-26', '2026-9-29', '2026-10-2'],
    dateOverrides: [
      { date: '2026-9-26', unavailable: true, ranges: [] },
      { date: '2026-9-29', unavailable: true, ranges: [] },
      { date: '2026-10-2', unavailable: true, ranges: [] },
    ],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.schedule)) {
          return {
            duration: Number(saved.duration) || DEFAULT.duration,
            timezone: saved.timezone || DEFAULT.timezone,
            bookingPeriod: saved.bookingPeriod || DEFAULT.bookingPeriod,
            noticeValue: saved.noticeValue != null ? saved.noticeValue : DEFAULT.noticeValue,
            noticeUnit: saved.noticeUnit || DEFAULT.noticeUnit,
            buffer: saved.buffer || DEFAULT.buffer,
            policy: saved.policy || clone(DEFAULT.policy),
            scheduleName: saved.scheduleName || DEFAULT.scheduleName,
            schedule: saved.schedule,
            blockedDates: saved.blockedDates || [],
            dateOverrides: saved.dateOverrides || (saved.blockedDates || []).map(function (key) {
              return { date: key, unavailable: true, ranges: [] };
            }),
          };
        }
      }
    } catch (e) {}
    return clone(DEFAULT);
  }

  function set(data) {
    var prev = get();
    var next = {
      duration: Number(data && data.duration) || prev.duration || DEFAULT.duration,
      timezone: (data && data.timezone) || prev.timezone || DEFAULT.timezone,
      bookingPeriod: (data && data.bookingPeriod) || prev.bookingPeriod || DEFAULT.bookingPeriod,
      noticeValue: data && data.noticeValue != null ? data.noticeValue : prev.noticeValue,
      noticeUnit: (data && data.noticeUnit) || prev.noticeUnit || DEFAULT.noticeUnit,
      buffer: (data && data.buffer) || prev.buffer || DEFAULT.buffer,
      policy: (data && data.policy) || prev.policy || clone(DEFAULT.policy),
      scheduleName: (data && data.scheduleName) || prev.scheduleName || DEFAULT.scheduleName,
      schedule: (data && data.schedule) || prev.schedule || DEFAULT.schedule,
      blockedDates: (data && data.blockedDates) || prev.blockedDates || [],
      dateOverrides: (data && data.dateOverrides) || prev.dateOverrides || DEFAULT.dateOverrides,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {}
    return next;
  }

  function parseLabel(label) {
    var m = String(label || '').match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!m) {
      var p = String(label || '').split(':');
      return Number(p[0] || 0) * 60 + Number(p[1] || 0);
    }
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    var ap = m[3].toUpperCase();
    if (ap === 'AM') {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return h * 60 + min;
  }

  function formatClock(mins) {
    var h = Math.floor(mins / 60) % 24;
    var m = mins % 60;
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function toHhmm(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function dayKey(d) {
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function dayConfig(date, data) {
    var id = DAY_IDS[date.getDay()];
    return (data.schedule || []).filter(function (d) {
      return d.id === id;
    })[0];
  }

  function startsForDay(date, data, afterMinutes) {
    var day = dayConfig(date, data);
    var key = dayKey(date);
    var loose = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    var override = ((data.dateOverrides || []).filter(function (item) {
      return item.date === key || item.date === loose;
    })[0]) || null;
    if (!override && ((data.blockedDates || []).indexOf(key) >= 0 || (data.blockedDates || []).indexOf(loose) >= 0)) {
      override = { unavailable: true, ranges: [] };
    }
    if (override && override.unavailable) return [];
    var ranges = override && override.ranges && override.ranges.length
      ? override.ranges
      : (day && day.on ? day.ranges || [] : []);
    if (!ranges.length) return [];
    var duration = Number(data.duration) || 45;
    var out = [];
    ranges.forEach(function (range) {
      var start = parseLabel(range[0]);
      var end = parseLabel(range[1]);
      if (end <= start) end += 24 * 60;
      var t = start;
      if (afterMinutes != null) t = Math.max(t, Math.ceil((afterMinutes + 1) / 15) * 15);
      while (t + duration <= end) {
        out.push(t);
        t += 15;
      }
    });
    return out;
  }

  function openSlots(fromDate, opts) {
    opts = opts || {};
    var data = get();
    var now = opts.afterMinutes != null ? opts.afterMinutes : fromDate.getHours() * 60 + fromDate.getMinutes();
    var booked = {};
    (opts.booked || []).forEach(function (b) {
      var start;
      if (typeof b.time === 'number') start = b.time;
      else if (String(b.time || '').indexOf('M') >= 0) start = parseLabel(b.time);
      else {
        var p = String(b.time || '').split(':');
        start = Number(p[0] || 0) * 60 + Number(p[1] || 0);
      }
      booked[String(b.day || b.date || '') + '|' + toHhmm(start)] = true;
    });
    var limit = opts.limit || 6;
    var out = [];
    var today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    function push(date, labelPrefix, after) {
      var key = dayKey(date);
      startsForDay(date, data, after).forEach(function (mins) {
        var hhmm = toHhmm(mins);
        if (booked[key + '|' + hhmm]) return;
        out.push({
          day: labelPrefix === 'Today' ? 'today' : 'tomorrow',
          date: key,
          time: hhmm,
          label: labelPrefix + ' · ' + formatClock(mins),
        });
      });
    }

    push(today, 'Today', now);
    push(tomorrow, 'Tomorrow', null);
    return out.slice(0, limit);
  }

  function slotsForDate(date, opts) {
    opts = opts || {};
    var data = get();
    var booked = {};
    (opts.booked || []).forEach(function (b) {
      var start;
      if (typeof b.time === 'number') start = b.time;
      else if (String(b.time || '').indexOf('M') >= 0) start = parseLabel(b.time);
      else {
        var p = String(b.time || '').split(':');
        start = Number(p[0] || 0) * 60 + Number(p[1] || 0);
      }
      booked[String(b.day || b.date || '') + '|' + toHhmm(start)] = true;
    });
    var after = opts.afterMinutes;
    var today = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
    var isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    if (isToday && after == null) after = today.getHours() * 60 + today.getMinutes();
    var duration = Number(opts.duration) || Number(data.duration) || 45;
    var slotData = Object.assign({}, data, { duration: duration });
    var key = dayKey(date);
    return startsForDay(date, slotData, after)
      .filter(function (mins) {
        return !booked[key + '|' + toHhmm(mins)];
      })
      .map(function (mins) {
        return {
          date: key,
          time: toHhmm(mins),
          label: formatClock(mins),
          mins: duration,
          iso: key + 'T' + toHhmm(mins) + ':00',
        };
      });
  }

  window.GradRightCalendar = {
    KEY: KEY,
    DEFAULT: clone(DEFAULT),
    get: get,
    set: set,
    openSlots: openSlots,
    slotsForDate: slotsForDate,
    dayKey: dayKey,
    formatClock: formatClock,
  };
})();
