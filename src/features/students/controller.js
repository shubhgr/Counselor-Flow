import { paintAnalyticsChart } from '@/lib/charts/analytics';
// Route-scoped workflow: subscriptions, timers and generated overlays are
// owned by createRouteScope and disposed when Next navigation leaves this screen.
export function initialize(scope) {
  const {
    document,
    window,
    location,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame,
    cancelAnimationFrame,
    URL,
    MutationObserver,
    ResizeObserver,
    IntersectionObserver,
    fetch,
  } = scope;

  const TODAY = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
  const PEOPLE = (window.GradRightDB && GradRightDB.people) || [];
  const dayKey =
    (window.GradRightDB && GradRightDB.dayKey) ||
    function (s) {
      return s ? String(s).slice(0, 10) : '';
    };
  const formatWhen =
    (window.GradRightDB && GradRightDB.formatWhen) ||
    function (stamp) {
      return stamp || '—';
    };

  function isPending() {
    if (window.GradRightSession && GradRightSession.get) {
      const s = GradRightSession.get();
      if (s) return !s.verified;
    }
    return !!(document.body && document.body.classList.contains('is-unverified'));
  }

  let listView = 'all';
  let filter = 'all';
  let impMode = 'unique';

  function applyView(view) {
    listView = view || 'all';
    if (listView === 'connected') {
      filter = 'connected';
      impMode = 'unique';
    } else if (listView === 'unique') {
      filter = 'impressions';
      impMode = 'unique';
    } else if (listView === 'total') {
      filter = 'impressions';
      impMode = 'total';
    } else {
      listView = 'all';
      filter = 'all';
      impMode = 'unique';
    }
    document.querySelectorAll('[data-view]').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-view') === listView);
    });
    const filterLabel = document.getElementById('filter-label');
    if (filterLabel) filterLabel.textContent = viewLabel();
  }

  function viewLabel() {
    if (listView === 'connected') return 'Connected';
    if (listView === 'unique') return 'Unique impression';
    if (listView === 'total') return 'Total impression';
    return 'All';
  }

  applyView(new URLSearchParams(location.search).get('view'));
  let query = '';
  let selectedId = '';
  let toastTimer = null;
  const PAGE = 20;
  let listCache = [];
  let shownCount = 0;
  let fetchingMore = false;
  let fetchTimer = null;
  let rangeKey = '30';
  let customStart = null;
  let customEnd = null;
  let rangeMemo = null;
  let calStart = { y: 2026, m: 7 };
  let calEnd = { y: 2026, m: 8 };

  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  function parseDay(iso) {
    const key = dayKey(iso);
    const p = key.split('-').map(Number);
    return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
  }

  function iso(d) {
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatShort(d) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function formatActivity(stamp) {
    return formatWhen(stamp, TODAY);
  }

  function makeRange(start, end) {
    const a = startOfDay(start);
    const b = startOfDay(end);
    return { start: a, end: b, startKey: iso(a), endKey: iso(b) };
  }

  const ALL_TIME = (function () {
    let min = startOfDay(TODAY);
    let max = startOfDay(TODAY);
    PEOPLE.forEach(function (p) {
      (p.views || []).forEach(function (v) {
        if (!v.when) return;
        const d = startOfDay(parseDay(v.when));
        if (d < min) min = d;
        if (d > max) max = d;
      });
      if (p.connectedOn) {
        const d = startOfDay(parseDay(p.connectedOn));
        if (d < min) min = d;
      }
    });
    return makeRange(min, max);
  })();

  function bumpRange() {
    rangeMemo = null;
  }

  function currentRange() {
    if (rangeMemo) return rangeMemo;
    const end = startOfDay(TODAY);
    if (rangeKey === 'all') rangeMemo = ALL_TIME;
    else if (rangeKey === 'today') rangeMemo = makeRange(end, end);
    else if (rangeKey === 'yesterday') {
      const y = addDays(end, -1);
      rangeMemo = makeRange(y, y);
    } else if (rangeKey === 'custom' && customStart && customEnd) {
      const a = startOfDay(customStart);
      const b = startOfDay(customEnd);
      rangeMemo = a <= b ? makeRange(a, b) : makeRange(b, a);
    } else {
      const days = Number(rangeKey);
      rangeMemo = days ? makeRange(addDays(end, 1 - days), end) : ALL_TIME;
    }
    return rangeMemo;
  }

  function inRange(isoDate) {
    const r = currentRange();
    const key = dayKey(isoDate);
    return key >= r.startKey && key <= r.endKey;
  }

  function lastView(p) {
    return (p.views && p.views[0]) || null;
  }

  function sortKey(p, visit) {
    if (visit && visit.at) return visit.at;
    if (visit && visit.when) return visit.when;
    if (p.lastView) return p.lastView;
    return p.connectedOn || '1970-01-01';
  }

  function matchesQuery(p, extra) {
    if (!query) return true;
    const hay = [p.name, p.email, p.service, p.source, p.forWho, p.role, extra]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.indexOf(query) >= 0;
  }

  function roleBadge(role) {
    return role === 'parent'
      ? '<span class="role-badge parent">Parent</span>'
      : '<span class="role-badge student">Student</span>';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function personCalls(id) {
    return (
      (window.GradRightCalls && GradRightCalls.forPerson && GradRightCalls.forPerson(id)) || []
    );
  }

  function bookingPhase(call) {
    return (
      (window.GradRightCalls && GradRightCalls.phase && GradRightCalls.phase(call)) || 'completed'
    );
  }

  function renderBookings(id) {
    const calls = personCalls(id);
    if (!calls.length) return '<p class="hint-text">No bookings yet.</p>';
    const clock = window.GradRightCalls && GradRightCalls.formatClock;
    const dayLabel = window.GradRightCalls && GradRightCalls.dayLabel;
    const hint = window.GradRightCalls && GradRightCalls.hint;
    return (
      '<div class="dash-agenda-group">' +
      calls
        .map(function (call) {
          const phase = bookingPhase(call);
          const cardPhase = phase === 'ongoing' ? 'live' : phase === 'completed' ? 'done' : phase;
          const action =
            phase === 'ongoing' || phase === 'upcoming'
              ? '<a class="dash-join" href="/call?id=' +
                encodeURIComponent(call.personId || id) +
                '&from=students">' +
                (phase === 'ongoing' ? 'Join now' : 'Join') +
                '</a>'
              : '<span class="dash-call-status' +
                (phase === 'missed' ? ' is-missed' : '') +
                '">' +
                (phase === 'missed' ? 'Missed' : 'Done') +
                '</span>';
          return (
            '<div class="dash-slot"><span class="dash-slot-time">' +
            escapeHtml(clock ? clock(call.time) : call.time) +
            '</span><div class="dash-slot-card' +
            (cardPhase === 'done' ? ' is-done' : '') +
            (cardPhase === 'missed' ? ' is-missed' : '') +
            (cardPhase === 'live' ? ' is-live' : '') +
            '"><div class="dash-call-main"><div class="dash-call-title"><strong>' +
            escapeHtml(dayLabel ? dayLabel(call.day) : call.day) +
            '</strong></div><span' +
            (phase === 'ongoing' ? ' data-live-left="' + escapeHtml(call.id) + '"' : '') +
            '>' +
            escapeHtml(
              phase === 'ongoing' && window.GradRightCalls && GradRightCalls.liveLeftText
                ? GradRightCalls.liveLeftText(call)
                : hint
                  ? hint(call)
                  : '',
            ) +
            '</span></div>' +
            action +
            '</div></div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  const workspace = document.getElementById('people-workspace');
  const personPanel = document.getElementById('person-panel');
  const personPanelBody = document.getElementById('person-panel-body');
  const personPanelTitle = document.getElementById('person-panel-title');
  const peopleToast = document.getElementById('people-toast');

  function closePerson() {
    selectedId = '';
    personPanel.hidden = true;
    workspace.classList.remove('is-profile-open');
    personPanelBody.innerHTML = '';
    const selected = document.querySelector('.people-table tr.is-selected');
    if (selected) selected.classList.remove('is-selected');
  }

  const LAST_CHATS = {
    aarav: {
      text: 'That meet helped a lot. I’ll revise the UC Davis and Northeastern rows tonight.',
      when: 'Wed, 23 Sep · 12:08 PM',
    },
    meera: {
      text: 'Thanks for the SOP notes!',
      when: 'Tue, 22 Sep · 4:35 PM',
    },
    tanvi: {
      text: 'Can we move tomorrow’s meet?',
      when: 'Mon, 21 Sep · 9:14 AM',
    },
    jia: {
      text: 'Sent my IELTS scorecard.',
      when: 'Sun, 20 Sep · 6:02 PM',
    },
    kabir: {
      text: 'LOR draft from my professor is ready.',
      when: 'Wed, 23 Sep · 2:15 PM',
    },
    ananya: {
      text: 'Scholarship essay v2 attached.',
      when: 'Tue, 22 Sep · 6:48 PM',
    },
    rohan: {
      text: 'Mock visa interview went well?',
      when: 'Fri, 18 Sep · 11:42 AM',
    },
  };

  function lastChat(p) {
    if (LAST_CHATS[p.id]) return LAST_CHATS[p.id];
    return {
      text: 'Hi Priya, I found you via ' + (p.source || 'your profile') + '.',
      when: formatActivity(p.lastView || p.connectedOn),
    };
  }

  function hashSeed(value) {
    let n = 2166136261;
    const s = String(value || '');
    for (let i = 0; i < s.length; i++) n = ((n ^ s.charCodeAt(i)) * 16777619) >>> 0;
    return n;
  }

  function txnIdFor(p) {
    if (window.GradRightDB && GradRightDB.txnIdFor) return GradRightDB.txnIdFor(p);
    const hex = hashSeed(p.id + (p.connectedOn || ''))
      .toString(16)
      .toUpperCase()
      .padStart(8, '0');
    return 'GRC-' + hex.slice(0, 4) + '-' + hex.slice(4);
  }

  function txnUtrFor(p) {
    if (window.GradRightDB && GradRightDB.txnUtrFor) return GradRightDB.txnUtrFor(p);
    return String(100000000000 + (hashSeed('utr' + p.id) % 899999999999)).slice(0, 12);
  }

  function txnMethodFor(p) {
    if (window.GradRightDB && GradRightDB.txnMethodFor) return GradRightDB.txnMethodFor(p);
    const methods = [
      'UPI · Google Pay',
      'UPI · PhonePe',
      'UPI · Paytm',
      'Visa · ••4242',
      'Net banking · HDFC',
    ];
    return methods[hashSeed(p.id) % methods.length];
  }

  function connectAmount(p) {
    if (window.GradRightDB && GradRightDB.connectAmount) return GradRightDB.connectAmount(p);
    const n = Number(p && p.amount);
    if (Number.isFinite(n) && n > 0) return n;
    return p && p.connected ? 1999 : 0;
  }

  function formatInr(n) {
    if (window.GradRightDB && GradRightDB.formatInr) return GradRightDB.formatInr(n);
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function factRow(label, value) {
    return (
      '<div class="call-fact"><span>' +
      escapeHtml(label) +
      '</span><strong>' +
      escapeHtml(value) +
      '</strong></div>'
    );
  }

  function paymentHtml(p) {
    if (!p || !p.connected) return '';
    return (
      '<div class="cpp-section people-payment">' +
      '<h3>Payment</h3>' +
      '<div class="txn-amount">' +
      escapeHtml(formatInr(connectAmount(p))) +
      '</div>' +
      '<p class="hint-text">Connect fee</p>' +
      '<div class="call-panel-facts txn-facts">' +
      factRow('Txn ID', txnIdFor(p)) +
      factRow('UTR', txnUtrFor(p)) +
      factRow('Paid', formatActivity(p.connectedOn)) +
      factRow('Status', 'Paid') +
      factRow('Method', txnMethodFor(p)) +
      factRow('Source', p.source || p.lastSource || 'Marketplace') +
      factRow('Service', p.service || 'Connect') +
      (p.forWho ? factRow('For', p.forWho) : '') +
      '</div></div>'
    );
  }

  function renderPersonPanel(p) {
    const callsHtml = renderBookings(p.id);
    const chat = lastChat(p);
    const lastHtml =
      '<div class="c-activity-item compact"><p>' +
      escapeHtml(chat.text) +
      '</p><div class="c-activity-meta">' +
      escapeHtml(chat.when) +
      '</div></div>';

    personPanelTitle.textContent = p.name;
    personPanelBody.innerHTML =
      '<div class="cpp-card">' +
      '<div class="avatar lg' +
      (p.amber ? ' amber' : '') +
      '">' +
      escapeHtml(p.initials) +
      '</div>' +
      '<h2>' +
      escapeHtml(p.name) +
      '</h2>' +
      '<div class="c-profile-badge-row">' +
      roleBadge(p.role) +
      '</div>' +
      '<p class="c-profile-role">' +
      escapeHtml(p.email || '') +
      (p.forWho ? ' · ' + escapeHtml(p.forWho) : '') +
      '</p>' +
      '<a class="btn btn-primary" href="/chats?id=' +
      encodeURIComponent(p.id) +
      '">Chat</a>' +
      paymentHtml(p) +
      '<div class="cpp-section"><h3>Bookings</h3>' +
      callsHtml +
      '</div>' +
      '<div class="cpp-section"><h3>Last message</h3>' +
      lastHtml +
      '</div>' +
      ((window.GradRightSafety && GradRightSafety.actionsHtml(p)) || '') +
      '</div>';
  }

  function openPerson(id) {
    const p =
      (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[id]) ||
      PEOPLE.filter(function (x) {
        return x.id === id;
      })[0];
    if (!p || !p.connected) return;
    if (window.GradRightSafety && GradRightSafety.isBlocked(p)) return;
    location.href = '/person?id=' + encodeURIComponent(id) + '&from=people';
    document.querySelectorAll('.people-table tr').forEach(function (tr) {
      tr.classList.toggle('is-selected', tr.getAttribute('data-id') === id);
    });
  }

  function showVisitToast() {
    peopleToast.innerHTML =
      '<strong>Someone just visited your profile</strong>' +
      '<span>Identity stays hidden until they connect.</span>';
    peopleToast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      peopleToast.hidden = true;
    }, 3200);
  }

  function rows() {
    if (isPending()) return [];
    const out = [];
    PEOPLE.forEach(function (p) {
      if (window.GradRightSafety && GradRightSafety.isBlocked(p)) return;
      const views = (p.views || []).filter(function (v) {
        return inRange(v.when);
      });
      const connectedIn = p.connected && p.connectedOn && inRange(p.connectedOn);
      if (!views.length && !connectedIn) return;

      if (filter === 'connected' && !p.connected) return;
      if (filter === 'impressions' && p.connected) return;

      if (p.connected && (filter === 'all' || filter === 'connected')) {
        if (matchesQuery(p)) out.push({ kind: 'connected', person: p, visit: lastView(p) });
      }

      if (!p.connected && (filter === 'all' || filter === 'impressions')) {
        if (impMode === 'total') {
          views.forEach(function (v) {
            if (matchesQuery(p, v.source)) out.push({ kind: 'impression', person: p, visit: v });
          });
        } else if (views.length && matchesQuery(p)) {
          out.push({ kind: 'impression', person: p, visit: views[0] });
        }
      }
    });

    return out.sort(function (a, b) {
      const aPin = a.kind === 'connected' && a.person.id === 'aarav';
      const bPin = b.kind === 'connected' && b.person.id === 'aarav';
      if (aPin !== bPin) return aPin ? -1 : 1;
      return sortKey(b.person, b.visit).localeCompare(sortKey(a.person, a.visit));
    });
  }

  function chartRange() {
    return currentRange() || ALL_TIME;
  }

  function daysIn(r) {
    const out = [];
    const d = startOfDay(r.start);
    const end = startOfDay(r.end);
    while (d <= end) {
      out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function stampHour(stamp) {
    const parse = window.GradRightDB && GradRightDB.parseStamp;
    const d = stamp instanceof Date ? stamp : parse ? parse(stamp) : null;
    return d ? d.getHours() : 0;
  }

  function emptyBucket() {
    return { visitors: 0, unique: {}, connections: 0, seconds: 0 };
  }

  const ACTIVITY = (function () {
    const days = {};
    const hours = {};
    function bucket(map, key) {
      if (!map[key]) map[key] = emptyBucket();
      return map[key];
    }
    PEOPLE.forEach(function (p) {
      (p.views || []).forEach(function (v) {
        if (!v.when) return;
        const day = bucket(days, v.when);
        day.visitors += 1;
        day.unique[p.id] = true;
        day.seconds += v.seconds || 45;
        const hk = v.when + ' ' + String(stampHour(v.date || v.at)).padStart(2, '0');
        const hour = bucket(hours, hk);
        hour.visitors += 1;
        hour.unique[p.id] = true;
        hour.seconds += v.seconds || 45;
      });
      if (p.connected && p.connectedOn) {
        const dayKeyOn = dayKey(p.connectedOn);
        bucket(days, dayKeyOn).connections += 1;
        const hk = dayKeyOn + ' ' + String(stampHour(p.connectedOn)).padStart(2, '0');
        bucket(hours, hk).connections += 1;
      }
    });
    return { days: days, hours: hours };
  })();

  function packPoint(b, date, key, grain, hour) {
    const bucket = b || emptyBucket();
    return {
      date: date,
      key: key,
      grain: grain,
      hour: hour,
      visitors: bucket.visitors,
      unique: Object.keys(bucket.unique).length,
      connections: bucket.connections,
      seconds: bucket.seconds,
    };
  }

  function buildSeries() {
    const r = chartRange();
    const days = daysIn(r);
    const pending = isPending();
    if (days.length <= 1) {
      const day = days[0] || startOfDay(TODAY);
      const key = iso(day);
      const series = [];
      for (let h = 0; h < 24; h++) {
        const hk = key + ' ' + String(h).padStart(2, '0');
        series.push(
          packPoint(
            pending ? null : ACTIVITY.hours[hk],
            new Date(day.getFullYear(), day.getMonth(), day.getDate(), h),
            hk,
            'hour',
            h,
          ),
        );
      }
      return { series: series, grain: 'hour' };
    }
    return {
      grain: 'day',
      series: days.map(function (day) {
        const key = iso(day);
        return packPoint(pending ? null : ACTIVITY.days[key], day, key, 'day');
      }),
    };
  }

  function formatDuration(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return h + 'h ' + (m % 60) + 'm';
    }
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  function renderStats() {
    const built = buildSeries();
    const series = built.series;
    const visitors = series.reduce(function (n, d) {
      return n + d.visitors;
    }, 0);
    const connections = series.reduce(function (n, d) {
      return n + d.connections;
    }, 0);
    const seconds = series.reduce(function (n, d) {
      return n + d.seconds;
    }, 0);
    const unique = {};
    if (!isPending()) {
      PEOPLE.forEach(function (p) {
        (p.views || []).forEach(function (v) {
          if (inRange(v.when)) unique[p.id] = true;
        });
      });
    }
    document.getElementById('stat-unique').textContent = Object.keys(unique).length;
    document.getElementById('stat-total').textContent = visitors.toLocaleString('en-IN');
    document.getElementById('stat-connections').textContent = connections;

    document.getElementById('stat-avg').textContent = visitors
      ? formatDuration(Math.round(seconds / visitors))
      : '0s';
    const range = currentRange();
    if (rangeKey !== 'all' && range) {
      const saved = { rangeKey, customStart, customEnd, rangeMemo };
      const length = Math.round((range.end - range.start) / 86400000) + 1;
      customEnd = addDays(range.start, -1);
      customStart = addDays(customEnd, 1 - length);
      rangeKey = 'custom';
      bumpRange();
      const previousRange = currentRange();
      const previous = buildSeries().series;
      const prevVisitors = previous.reduce((n, d) => n + d.visitors, 0);
      const prevConnections = previous.reduce((n, d) => n + d.connections, 0);
      const prevSeconds = previous.reduce((n, d) => n + d.seconds, 0);
      const prevUnique = new Set();
      if (!isPending())
        PEOPLE.forEach((p) =>
          (p.views || []).forEach((v) => {
            if (
              v.when.slice(0, 10) >= iso(previousRange.start) &&
              v.when.slice(0, 10) <= iso(previousRange.end)
            )
              prevUnique.add(p.id);
          }),
        );
      rangeKey = saved.rangeKey;
      customStart = saved.customStart;
      customEnd = saved.customEnd;
      rangeMemo = saved.rangeMemo;
      const values = [
        ['unique', Object.keys(unique).length, prevUnique.size],
        ['total', visitors, prevVisitors],
        ['connections', connections, prevConnections],
        ['avg', visitors ? seconds / visitors : 0, prevVisitors ? prevSeconds / prevVisitors : 0],
      ];
      values.forEach(([key, value, prior]) => {
        const el = document.getElementById('stat-' + key + '-trend');
        const change = prior ? Math.round(((value - prior) / prior) * 100) : null;
        el.textContent =
          change === null
            ? 'No prior-period data'
            : `${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% vs previous period`;
        el.style.color =
          change === null ? 'var(--gray-500)' : change >= 0 ? 'var(--green-700)' : 'var(--red-500)';
      });
    } else
      ['unique', 'total', 'connections', 'avg'].forEach((key) => {
        document.getElementById('stat-' + key + '-trend').textContent = '';
      });
    renderChart(series, built.grain);
  }

  function renderChart(series, grain) {
    paintAnalyticsChart({ document, TODAY, formatWhen, formatShort, series, grain });
  }

  function presetLabel() {
    if (rangeKey === 'today') return 'Today';
    if (rangeKey === 'yesterday') return 'Yesterday';
    if (rangeKey === '7') return 'Last 7 days';
    if (rangeKey === '30') return 'Last 30 days';
    if (rangeKey === 'all') return 'All time';
    return 'Custom';
  }

  function datesLabel() {
    const r = currentRange() || chartRange();
    return { start: formatShort(r.start), end: formatShort(r.end) };
  }

  function syncCalViews() {
    const r = currentRange() || chartRange();
    calStart = { y: r.start.getFullYear(), m: r.start.getMonth() };
    calEnd = { y: r.end.getFullYear(), m: r.end.getMonth() };
  }

  function renderOneCal(side) {
    const view = side === 'start' ? calStart : calEnd;
    const r = currentRange() || chartRange();
    document.getElementById('cal-label-' + side).textContent = MONTHS[view.m] + ' ' + view.y;
    const first = new Date(view.y, view.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      .map(function (d) {
        return '<div class="range-cal-dow">' + d + '</div>';
      })
      .join('');
    for (let i = 0; i < startPad; i++)
      html += '<button type="button" class="range-cal-day is-empty" disabled></button>';
    const a = startOfDay(r.start).getTime();
    const b = startOfDay(r.end).getTime();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(view.y, view.m, d);
      const t = date.getTime();
      const cls = [
        'range-cal-day',
        t >= a && t <= b ? 'in-range' : '',
        t === a || t === b ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ');
      html +=
        '<button type="button" class="' +
        cls +
        '" data-side="' +
        side +
        '" data-date="' +
        iso(date) +
        '">' +
        d +
        '</button>';
    }
    document.getElementById('cal-grid-' + side).innerHTML = html;
  }

  function renderCals() {
    renderOneCal('start');
    renderOneCal('end');
  }

  function rowHtml(row) {
    const p = row.person;
    const visit = row.visit;
    const connected = row.kind === 'connected';
    const source = connected
      ? p.source || (visit && visit.source) || '—'
      : (visit && visit.source) || p.lastSource || p.source || '—';
    const connectedAt = connected ? formatActivity(p.connectedOn) : '—';
    const lastViewed = formatActivity((visit && (visit.at || visit.when)) || p.lastView);
    const viewsIn = (p.views || []).filter(function (v) {
      return inRange(v.when);
    }).length;

    const who =
      '<div class="people-who' +
      (connected ? '' : ' is-blurred') +
      '">' +
      '<span class="avatar sm' +
      (p.amber ? ' amber' : '') +
      '">' +
      p.initials +
      '</span>' +
      '<div><strong>' +
      p.name +
      '</strong> ' +
      roleBadge(p.role) +
      '<span>' +
      (connected
        ? (p.forWho ? p.forWho + ' · ' : '') + p.email
        : viewsIn > 1 && impMode === 'unique'
          ? viewsIn + ' views'
          : 'Not connected') +
      '</span></div></div>';

    const actions = connected
      ? '<td class="people-actions">' +
        '<a class="icon-btn people-chat-btn" href="/chats?id=' +
        p.id +
        '" title="Chat" aria-label="Chat"><span class="app-icon" aria-hidden="true">chat</span></a></td>'
      : '<td class="people-actions">' +
        '<span class="icon-btn people-lock-btn" title="Hidden until they connect" aria-label="Hidden until they connect">' +
        '<span class="app-icon" aria-hidden="true">lock</span></span></td>';

    return (
      '<tr class="' +
      (connected ? 'is-connected' : 'is-impression') +
      (selectedId === p.id ? ' is-selected' : '') +
      '" data-id="' +
      p.id +
      '" data-kind="' +
      (connected ? 'connected' : 'impression') +
      '">' +
      '<td>' +
      who +
      '</td>' +
      '<td>' +
      source +
      '</td>' +
      '<td>' +
      connectedAt +
      '</td>' +
      '<td>' +
      lastViewed +
      '</td>' +
      actions +
      '</tr>'
    );
  }

  function setFetchState(on) {
    document.getElementById('people-fetch').hidden = !on;
  }

  function paintSlice(from, to) {
    const body = document.getElementById('people-body');
    const html = listCache.slice(from, to).map(rowHtml).join('');
    if (from === 0) body.innerHTML = html;
    else body.insertAdjacentHTML('beforeend', html);
  }

  function loadMore() {
    if (fetchingMore || shownCount >= listCache.length) return;
    fetchingMore = true;
    setFetchState(true);
    clearTimeout(fetchTimer);
    fetchTimer = setTimeout(function () {
      const from = shownCount;
      shownCount = Math.min(listCache.length, shownCount + PAGE);
      paintSlice(from, shownCount);
      fetchingMore = false;
      setFetchState(false);
    }, 380);
  }

  function render() {
    document.getElementById('preset-label').textContent = presetLabel();
    const labels = datesLabel();
    document.getElementById('start-label').textContent = labels.start;
    document.getElementById('end-label').textContent = labels.end;
    document.getElementById('filter-btn').classList.toggle('on', listView !== 'all');
    const filterLabel = document.getElementById('filter-label');
    if (filterLabel) filterLabel.textContent = viewLabel();
    renderStats();

    listCache = rows();
    shownCount = Math.min(PAGE, listCache.length);
    fetchingMore = false;
    clearTimeout(fetchTimer);
    setFetchState(false);

    const empty = document.getElementById('people-empty');
    const body = document.getElementById('people-body');
    if (!listCache.length) {
      body.innerHTML = '';
      empty.hidden = false;
      empty.className = 'people-empty' + (isPending() ? ' dash-empty' : '');
      empty.innerHTML = isPending()
        ? '<strong>No people yet</strong><span>Visitors and connections show up here after you are approved.</span>'
        : 'No people match this filter.';
      return;
    }
    empty.hidden = true;
    empty.className = 'people-empty';
    empty.textContent = 'No people match this filter.';
    paintSlice(0, shownCount);
  }

  scope.listen(window, 'counselor:students-range', function (event) {
    const selection = event.detail;
    rangeKey = selection.preset === 'month' ? 'custom' : selection.preset;
    customStart = selection.start;
    customEnd = selection.end;
    bumpRange();
    render();
  });
  const presetBtn = document.getElementById('preset-btn');
  const presetMenu = document.getElementById('preset-menu');
  const startBtn = document.getElementById('start-btn');
  const endBtn = document.getElementById('end-btn');
  const startMenu = document.getElementById('cal-start-menu');
  const endMenu = document.getElementById('cal-end-menu');
  const filterBtn = document.getElementById('filter-btn');
  const filterMenu = document.getElementById('filter-menu');

  function closeMenus(except) {
    if (except !== 'preset') {
      presetMenu.hidden = true;
      presetBtn.setAttribute('aria-expanded', 'false');
    }
    if (except !== 'start') {
      startMenu.hidden = true;
      startBtn.setAttribute('aria-expanded', 'false');
    }
    if (except !== 'end') {
      endMenu.hidden = true;
      endBtn.setAttribute('aria-expanded', 'false');
    }
    if (except !== 'filter') {
      filterMenu.hidden = true;
      filterBtn.setAttribute('aria-expanded', 'false');
      filterBtn.classList.toggle('on', listView !== 'all');
    }
  }

  function shiftMonth(view, dir) {
    view.m += dir;
    if (view.m < 0) {
      view.m = 11;
      view.y -= 1;
    }
    if (view.m > 11) {
      view.m = 0;
      view.y += 1;
    }
  }

  scope.listen(presetBtn, 'click', function (e) {
    e.stopPropagation();
    const open = presetMenu.hidden;
    closeMenus('preset');
    presetMenu.hidden = !open;
    presetBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  function openCal(side) {
    const isStart = side === 'start';
    const menu = isStart ? startMenu : endMenu;
    const btn = isStart ? startBtn : endBtn;
    const open = menu.hidden;
    closeMenus(side);
    if (open) {
      syncCalViews();
      renderOneCal(side);
    }
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  scope.listen(startBtn, 'click', function (e) {
    e.stopPropagation();
    openCal('start');
  });
  scope.listen(endBtn, 'click', function (e) {
    e.stopPropagation();
    openCal('end');
  });

  scope.listen(filterBtn, 'click', function (e) {
    e.stopPropagation();
    const open = filterMenu.hidden;
    closeMenus('filter');
    filterMenu.hidden = !open;
    filterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) filterBtn.classList.add('on');
  });

  scope.listen(document, 'click', function (e) {
    if (!e.target.closest('#range-wrap') && !e.target.closest('#filter-wrap')) closeMenus();
  });

  scope.listen(presetMenu, 'click', function (e) {
    const btn = e.target.closest('[data-range]');
    if (!btn) return;
    rangeKey = btn.getAttribute('data-range');
    customStart = null;
    customEnd = null;
    bumpRange();
    document.querySelectorAll('[data-range]').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    syncCalViews();
    render();
    closeMenus();
  });

  scope.listen(document.getElementById('dates-chip'), 'click', function (e) {
    const nav = e.target.closest('[data-cal-nav]');
    if (nav) {
      const side = nav.getAttribute('data-side');
      shiftMonth(side === 'start' ? calStart : calEnd, Number(nav.getAttribute('data-cal-nav')));
      renderOneCal(side);
      return;
    }
    const day = e.target.closest('[data-date]');
    if (!day) return;
    const d = parseDay(day.getAttribute('data-date'));
    const r = currentRange() || chartRange();
    const side = day.getAttribute('data-side');
    if (side === 'start') {
      customStart = d;
      customEnd = r.end < d ? d : r.end;
    } else {
      customEnd = d;
      customStart = r.start > d ? d : r.start;
    }
    rangeKey = 'custom';
    bumpRange();
    document.querySelectorAll('[data-range]').forEach(function (b) {
      b.classList.remove('active');
    });
    renderOneCal(side);
    render();
  });

  document.querySelectorAll('[data-view]').forEach(function (tab) {
    scope.listen(tab, 'click', function () {
      applyView(tab.getAttribute('data-view') || 'all');
      render();
    });
  });

  scope.listen(document.getElementById('people-search'), 'input', function (e) {
    query = e.target.value.trim().toLowerCase();
    render();
  });

  scope.listen(document.getElementById('people-body'), 'click', function (e) {
    if (e.target.closest('.people-chat-btn')) return;
    const tr = e.target.closest('tr');
    if (!tr) return;
    const kind = tr.getAttribute('data-kind');
    const id = tr.getAttribute('data-id');
    if (kind === 'connected') openPerson(id);
    else showVisitToast();
  });

  scope.listen(document.getElementById('person-panel-close'), 'click', closePerson);

  const peopleScroller = document.querySelector('.people-table-track');
  const peopleSentinel = document.getElementById('people-sentinel');
  let peopleObserver = null;
  if (peopleScroller && peopleSentinel && 'IntersectionObserver' in window) {
    peopleObserver = new IntersectionObserver(
      function (entries) {
        if (entries[0] && entries[0].isIntersecting) loadMore();
      },
      { root: peopleScroller, rootMargin: '180px', threshold: 0 },
    );
  }
  if (peopleScroller) {
    scope.listen(peopleScroller, 'scroll', function () {
      if (
        peopleScroller.scrollTop + peopleScroller.clientHeight >=
        peopleScroller.scrollHeight - 140
      ) {
        loadMore();
      }
    });
  }

  function tickStudentLive() {
    document.querySelectorAll('[data-live-left]').forEach(function (el) {
      const id = el.getAttribute('data-live-left');
      const call = (
        (window.GradRightCalls && GradRightCalls.all && GradRightCalls.all()) ||
        []
      ).filter(function (c) {
        return c.id === id;
      })[0];
      if (!call || !window.GradRightCalls || !GradRightCalls.liveLeftText) return;
      if (GradRightCalls.phase(call) !== 'ongoing') return;
      el.textContent = GradRightCalls.liveLeftText(call);
    });
  }
  setInterval(tickStudentLive, 1000);

  scope.listen(document, 'gradright:safety', function (e) {
    var detail = (e && e.detail) || {};
    if (detail.action === 'block') {
      if (
        selectedId &&
        detail.user &&
        (detail.user.id === selectedId ||
          detail.user.name ===
            (
              PEOPLE.filter(function (x) {
                return x.id === selectedId;
              })[0] || {}
            ).name)
      ) {
        closePerson();
      }
    }
    render();
  });

  render();
  if (peopleObserver) peopleObserver.observe(peopleSentinel);
}
