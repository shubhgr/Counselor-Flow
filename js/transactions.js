/**
 * Transactions: search, date range, status filter, chart, ledger.
 */
(function () {
  const TODAY = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
  const PEOPLE = (window.GradRightDB && GradRightDB.people) || [];
  const dayKey =
    (window.GradRightDB && GradRightDB.dayKey) ||
    function (s) {
      return String(s || '').slice(0, 10);
    };
  const formatWhen = (window.GradRightDB && GradRightDB.formatWhen) || function (s) {
    return s || '';
  };
  const formatInr = (window.GradRightDB && GradRightDB.formatInr) || function (n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  };
  const connectAmount = (window.GradRightDB && GradRightDB.connectAmount) || function (p) {
    const n = Number(p && p.amount);
    if (Number.isFinite(n) && n > 0) return n;
    return p && p.connected ? 1999 : 0;
  };
  const txnIdFor = (window.GradRightDB && GradRightDB.txnIdFor) || function (p) {
    return 'GRC-' + String((p && p.id) || '0000').slice(0, 8).toUpperCase();
  };
  const txnMethodFor = (window.GradRightDB && GradRightDB.txnMethodFor) || function () {
    return 'UPI';
  };
  const parseStamp = (window.GradRightDB && GradRightDB.parseStamp) || function (s) {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
    const p = String(s).trim().split(/[- :T]/).map(Number);
    const d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1, p[3] || 0, p[4] || 0);
    return isNaN(d.getTime()) ? null : d;
  };

  function isApproved() {
    if (window.GradRightSession && GradRightSession.get) {
      const s = GradRightSession.get();
      if (s) return !!s.verified;
    }
    return !!(
      document.body &&
      (document.body.classList.contains('is-verified') || document.body.dataset.verified === 'true')
    );
  }

  function hashSeed(value) {
    let n = 2166136261;
    const s = String(value || '');
    for (let i = 0; i < s.length; i++) n = ((n ^ s.charCodeAt(i)) * 16777619) >>> 0;
    return n;
  }

  function isoStamp(d) {
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0') +
      ' ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0')
    );
  }

  function addDaysStamp(stamp, days, hour, minute) {
    const d = parseStamp(stamp) || new Date(TODAY);
    d.setDate(d.getDate() + days);
    if (hour != null) d.setHours(hour, minute || 0, 0, 0);
    return isoStamp(d);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusMeta(status) {
    if (status === 'success') return { label: 'Success', cls: 'success' };
    if (status === 'failed') return { label: 'Failed', cls: 'danger' };
    if (status === 'refunded') return { label: 'Refunded', cls: 'muted' };
    if (status === 'processing') return { label: 'Processing', cls: 'warn' };
    return { label: status, cls: 'muted' };
  }

  function typeMeta(type) {
    if (type === 'connect') return 'Connect fee';
    if (type === 'withdrawal') return 'Withdrawal';
    if (type === 'refund') return 'Refund';
    return type;
  }

  function filterLabel(key) {
    if (key === 'success') return 'Success';
    if (key === 'failed') return 'Failed';
    if (key === 'refunded') return 'Refunded';
    if (key === 'withdrawal') return 'Withdrawal';
    return 'All';
  }

  function buildLedger() {
    const connected = PEOPLE.filter(function (p) {
      return p.connected;
    });
    const rows = [];

    connected.forEach(function (p) {
      const amount = connectAmount(p);
      const seed = hashSeed(p.id);
      const stamp = p.connectedOn || isoStamp(TODAY);
      const method = txnMethodFor(p);
      const refunded = seed % 19 === 0;

      if (seed % 9 === 0) {
        rows.push({
          key: 'fail-' + p.id,
          at: addDaysStamp(stamp, -1, 10 + (seed % 8), 15),
          type: 'connect',
          name: p.name,
          initials: p.initials,
          amber: !!p.amber,
          detail: p.name,
          txnId: txnIdFor({ id: p.id + '-fail', connectedOn: stamp }),
          method: method,
          amount: amount,
          status: 'failed',
        });
      }

      rows.push({
        key: 'pay-' + p.id,
        at: stamp,
        type: 'connect',
        name: p.name,
        initials: p.initials,
        amber: !!p.amber,
        detail: p.name,
        txnId: txnIdFor(p),
        method: method,
        amount: amount,
        status: refunded ? 'refunded' : 'success',
      });

      if (refunded) {
        rows.push({
          key: 'ref-' + p.id,
          at: addDaysStamp(stamp, 2 + (seed % 4), 14, 20),
          type: 'refund',
          name: p.name,
          initials: p.initials,
          amber: !!p.amber,
          detail: p.name,
          txnId: 'RFN-' + txnIdFor(p).replace('GRC-', ''),
          method: method,
          amount: amount,
          status: 'refunded',
        });
      }
    });

    const earned = rows.reduce(function (n, r) {
      return n + (r.type === 'connect' && r.status === 'success' ? r.amount : 0);
    }, 0);
    const refundedSum = rows.reduce(function (n, r) {
      return n + (r.type === 'refund' ? r.amount : 0);
    }, 0);
    const net = Math.max(0, earned - refundedSum);

    const payouts = [
      { at: '2026-07-31 16:40', share: 0.18, status: 'success' },
      { at: '2026-08-15 17:05', share: 0.2, status: 'success' },
      { at: '2026-08-31 16:20', share: 0.16, status: 'success' },
      { at: '2026-09-15 17:10', share: 0.18, status: 'success' },
      { at: '2026-09-23 11:00', share: 0.08, status: 'processing' },
    ];
    payouts.forEach(function (pay, i) {
      let amount = Math.round(net * pay.share);
      amount = Math.round(amount / 50) * 50;
      if (amount < 500) return;
      rows.push({
        key: 'wd-' + i,
        at: pay.at,
        type: 'withdrawal',
        name: 'Bank payout',
        initials: 'BK',
        amber: false,
        detail: 'HDFC · ••4821',
        txnId: 'WDL-' + String(1000 + i * 17) + '-' + String(hashSeed('wd' + i)).slice(0, 4).toUpperCase(),
        method: 'NEFT · HDFC',
        amount: amount,
        status: pay.status,
      });
    });

    rows.sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    });
    return rows;
  }

  const LEDGER = isApproved() ? buildLedger() : [];

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
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

  function makeRange(start, end) {
    const a = startOfDay(start);
    const b = startOfDay(end);
    return { start: a, end: b, startKey: iso(a), endKey: iso(b) };
  }

  const ALL_TIME = (function () {
    let min = startOfDay(TODAY);
    let max = startOfDay(TODAY);
    LEDGER.forEach(function (row) {
      const d = startOfDay(parseDay(row.at));
      if (d < min) min = d;
      if (d > max) max = d;
    });
    return makeRange(min, max);
  })();

  let rangeKey = '30';
  let customStart = null;
  let customEnd = null;
  let rangeMemo = null;
  let calStart = { y: 2026, m: 7 };
  let calEnd = { y: 2026, m: 8 };
  let filter = 'all';
  let query = '';

  function bumpRange() {
    rangeMemo = null;
  }

  function currentRange() {
    if (rangeMemo) return rangeMemo;
    const end = startOfDay(TODAY);
    if (rangeKey === 'all') rangeMemo = ALL_TIME;
    else if (rangeKey === 'today') rangeMemo = makeRange(end, end);
    else if (rangeKey === 'yesterday') rangeMemo = makeRange(addDays(end, -1), addDays(end, -1));
    else if (rangeKey === 'custom' && customStart && customEnd) {
      const a = startOfDay(customStart);
      const b = startOfDay(customEnd);
      rangeMemo = a <= b ? makeRange(a, b) : makeRange(b, a);
    } else {
      const days = Number(rangeKey);
      rangeMemo = days ? makeRange(addDays(end, 1 - days), end) : ALL_TIME;
    }
    return rangeMemo;
  }

  function inRange(stamp) {
    const r = currentRange();
    const key = dayKey(stamp);
    return key >= r.startKey && key <= r.endKey;
  }

  function stampHour(stamp) {
    const d = parseStamp(stamp);
    return d ? d.getHours() : 0;
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

  function emptyPoint(date, key, grain, hour) {
    return { date: date, key: key, grain: grain, hour: hour, earnings: 0, withdrawn: 0 };
  }

  function addToBucket(map, key, row) {
    if (!map[key]) map[key] = { earnings: 0, withdrawn: 0 };
    if (row.type === 'connect' && row.status === 'success') map[key].earnings += row.amount;
    if (row.type === 'withdrawal' && row.status === 'success') map[key].withdrawn += row.amount;
  }

  function buildSeries() {
    const r = currentRange();
    const days = daysIn(r);
    const byDay = {};
    const byHour = {};
    if (isApproved()) {
      LEDGER.forEach(function (row) {
        if (!inRange(row.at)) return;
        addToBucket(byDay, dayKey(row.at), row);
        addToBucket(byHour, dayKey(row.at) + ' ' + String(stampHour(row.at)).padStart(2, '0'), row);
      });
    }
    if (days.length <= 1) {
      const day = days[0] || startOfDay(TODAY);
      const key = iso(day);
      const series = [];
      for (let h = 0; h < 24; h++) {
        const hk = key + ' ' + String(h).padStart(2, '0');
        const b = byHour[hk] || { earnings: 0, withdrawn: 0 };
        series.push({
          date: new Date(day.getFullYear(), day.getMonth(), day.getDate(), h),
          key: hk,
          grain: 'hour',
          hour: h,
          earnings: b.earnings,
          withdrawn: b.withdrawn,
        });
      }
      return { series: series, grain: 'hour' };
    }
    return {
      grain: 'day',
      series: days.map(function (day) {
        const key = iso(day);
        const b = byDay[key] || { earnings: 0, withdrawn: 0 };
        return emptyPoint(day, key, 'day');
      }).map(function (pt) {
        const b = byDay[pt.key] || { earnings: 0, withdrawn: 0 };
        pt.earnings = b.earnings;
        pt.withdrawn = b.withdrawn;
        return pt;
      }),
    };
  }

  function pathFrom(points) {
    return points
      .map(function (p, i) {
        return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
      })
      .join(' ');
  }

  function renderChart(series, grain) {
    const svg = document.getElementById('analytics-chart');
    const tip = document.getElementById('analytics-tip');
    if (!svg || !tip) return;
    const w = 760;
    const h = 180;
    const pad = { l: 8, r: 8, t: 16, b: 8 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const max = Math.max(
      1,
      series.reduce(function (n, d) {
        return Math.max(n, d.earnings, d.withdrawn);
      }, 0)
    );

    function xy(i, value) {
      const x = series.length === 1 ? pad.l + innerW / 2 : pad.l + (i / (series.length - 1)) * innerW;
      const y = pad.t + innerH - (value / max) * innerH;
      return { x: x, y: y };
    }

    const earnPts = series.map(function (d, i) {
      return xy(i, d.earnings);
    });
    const wdPts = series.map(function (d, i) {
      return xy(i, d.withdrawn);
    });

    let html = '';
    earnPts.forEach(function (p, i) {
      html +=
        '<rect class="analytics-hit" data-i="' +
        i +
        '" x="' +
        (p.x - innerW / series.length / 2).toFixed(1) +
        '" y="0" width="' +
        Math.max(12, innerW / series.length).toFixed(1) +
        '" height="' +
        h +
        '"></rect>';
    });
    html +=
      '<path class="analytics-path earnings" d="' +
      pathFrom(earnPts) +
      '"></path>' +
      '<path class="analytics-path connections" d="' +
      pathFrom(wdPts) +
      '"></path>';
    if (grain === 'hour') {
      earnPts.forEach(function (p, i) {
        if (!series[i].earnings && !series[i].withdrawn) return;
        html +=
          '<circle class="analytics-dot" cx="' +
          p.x.toFixed(1) +
          '" cy="' +
          p.y.toFixed(1) +
          '" r="2.4"></circle>';
      });
    }
    svg.innerHTML = html;
    svg.dataset.ready = '1';

    function showTip(i, evt) {
      const d = series[i];
      if (!d) return;
      const label = grain === 'hour' ? formatWhen(d.date, TODAY) : formatShort(d.date);
      tip.hidden = false;
      tip.innerHTML =
        '<strong>' +
        label +
        '</strong>' +
        '<div><span class="dot earnings"></span>Earnings<span>' +
        formatInr(d.earnings) +
        '</span></div>' +
        '<div><span class="dot connections"></span>Withdrawn<span>' +
        formatInr(d.withdrawn) +
        '</span></div>';
      const wrap = tip.parentElement.getBoundingClientRect();
      const x = evt.clientX - wrap.left;
      tip.style.left = Math.min(wrap.width - 180, Math.max(8, x - 80)) + 'px';
      tip.style.top = '12px';
    }

    svg.onmousemove = function (e) {
      const hit = e.target.closest('[data-i]');
      if (!hit) return;
      showTip(Number(hit.getAttribute('data-i')), e);
    };
    svg.onmouseleave = function () {
      tip.hidden = true;
    };
  }

  function rangedRows() {
    return LEDGER.filter(function (row) {
      return inRange(row.at);
    });
  }

  function matches(row) {
    if (!inRange(row.at)) return false;
    if (filter === 'withdrawal' && row.type !== 'withdrawal') return false;
    if (filter !== 'all' && filter !== 'withdrawal' && row.status !== filter) return false;
    if (!query) return true;
    const hay = [row.detail, row.name, row.txnId, row.method, typeMeta(row.type), row.status]
      .join(' ')
      .toLowerCase();
    return hay.indexOf(query) >= 0;
  }

  function renderStats() {
    const rows = rangedRows();
    const earned = rows.reduce(function (n, r) {
      return n + (r.type === 'connect' && r.status === 'success' ? r.amount : 0);
    }, 0);
    const withdrawn = rows.reduce(function (n, r) {
      return n + (r.type === 'withdrawal' && r.status === 'success' ? r.amount : 0);
    }, 0);
    const refunded = rows.reduce(function (n, r) {
      return n + (r.type === 'refund' ? r.amount : 0);
    }, 0);
    const processing = rows.reduce(function (n, r) {
      return n + (r.type === 'withdrawal' && r.status === 'processing' ? r.amount : 0);
    }, 0);
    const successCount = rows.filter(function (r) {
      return r.type === 'connect' && r.status === 'success';
    }).length;
    const payoutCount = rows.filter(function (r) {
      return r.type === 'withdrawal' && r.status === 'success';
    }).length;
    const available = Math.max(0, earned - withdrawn - refunded - processing);

    document.getElementById('stat-earned').textContent = formatInr(earned);
    document.getElementById('stat-earned-hint').textContent =
      'From ' + successCount + ' successful connects';
    document.getElementById('stat-withdrawn').textContent = formatInr(withdrawn);
    document.getElementById('stat-withdrawn-hint').textContent =
      payoutCount + (payoutCount === 1 ? ' payout to bank' : ' payouts to bank');
    document.getElementById('stat-available').textContent = formatInr(available);
    document.getElementById('stat-available-hint').textContent =
      rangeKey === 'all' ? 'Left to withdraw' : 'Left in this period';

    const built = buildSeries();
    renderChart(built.series, built.grain);
  }

  function renderTable() {
    const body = document.getElementById('txn-body');
    const empty = document.getElementById('txn-empty');
    const visible = LEDGER.filter(matches);
    body.innerHTML = '';
    empty.hidden = visible.length > 0;
    visible.forEach(function (row) {
      const st = statusMeta(row.status);
      const incoming = row.type === 'connect' && row.status === 'success';
      const outgoing = row.type === 'withdrawal' || row.type === 'refund';
      const amountCls = incoming ? 'is-in' : outgoing ? 'is-out' : 'is-flat';
      const sign = incoming ? '' : outgoing ? '−' : '';
      const who =
        '<div class="people-who">' +
        '<span class="avatar sm' +
        (row.amber ? ' amber' : '') +
        '">' +
        escapeHtml(row.initials) +
        '</span>' +
        '<div><strong>' +
        escapeHtml(row.detail) +
        '</strong><span>' +
        escapeHtml(row.type === 'withdrawal' ? 'Payout' : 'Connect') +
        '</span></div></div>';
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' +
        escapeHtml(formatWhen(row.at)) +
        '</td><td>' +
        escapeHtml(typeMeta(row.type)) +
        '</td><td>' +
        who +
        '</td><td class="txn-mono">' +
        escapeHtml(row.txnId) +
        '</td><td>' +
        escapeHtml(row.method) +
        '</td><td class="txn-amt ' +
        amountCls +
        '">' +
        sign +
        escapeHtml(formatInr(row.amount)) +
        '</td><td><span class="pill ' +
        st.cls +
        '">' +
        escapeHtml(st.label) +
        '</span></td>';
      body.appendChild(tr);
    });
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
    const r = currentRange();
    return { start: formatShort(r.start), end: formatShort(r.end) };
  }

  function syncCalViews() {
    const r = currentRange();
    calStart = { y: r.start.getFullYear(), m: r.start.getMonth() };
    calEnd = { y: r.end.getFullYear(), m: r.end.getMonth() };
  }

  function renderOneCal(side) {
    const view = side === 'start' ? calStart : calEnd;
    const r = currentRange();
    document.getElementById('cal-label-' + side).textContent = MONTHS[view.m] + ' ' + view.y;
    const first = new Date(view.y, view.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      .map(function (d) {
        return '<div class="range-cal-dow">' + d + '</div>';
      })
      .join('');
    for (let i = 0; i < startPad; i++) html += '<button type="button" class="range-cal-day is-empty" disabled></button>';
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

  function render() {
    document.getElementById('preset-label').textContent = presetLabel();
    const labels = datesLabel();
    document.getElementById('start-label').textContent = labels.start;
    document.getElementById('end-label').textContent = labels.end;
    document.getElementById('filter-label').textContent = filterLabel(filter);
    renderStats();
    renderTable();
  }

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
      filterBtn.classList.toggle('on', filter !== 'all');
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

  presetBtn.addEventListener('click', function (e) {
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

  startBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openCal('start');
  });
  endBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    openCal('end');
  });

  filterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    const open = filterMenu.hidden;
    closeMenus('filter');
    filterMenu.hidden = !open;
    filterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) filterBtn.classList.add('on');
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#range-wrap') && !e.target.closest('#filter-wrap')) closeMenus();
  });

  presetMenu.addEventListener('click', function (e) {
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

  document.getElementById('dates-chip').addEventListener('click', function (e) {
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
    const r = currentRange();
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

  filterMenu.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    filter = btn.getAttribute('data-filter');
    document.querySelectorAll('#filter-menu .filter-option').forEach(function (el) {
      el.classList.toggle('active', el === btn);
    });
    render();
    closeMenus();
  });

  document.getElementById('txn-search').addEventListener('input', function (e) {
    query = e.target.value.trim().toLowerCase();
    renderTable();
  });

  var BANK_KEY = 'gradright_payout_banks_v1';
  var BANK_OPTIONS = [
    { id: 'hdfc', name: 'HDFC Bank', sms: 'HDFCBK' },
    { id: 'icici', name: 'ICICI Bank', sms: 'ICICIB' },
    { id: 'sbi', name: 'State Bank of India', sms: 'SBIINB' },
    { id: 'axis', name: 'Axis Bank', sms: 'AXISBK' },
    { id: 'kotak', name: 'Kotak Mahindra Bank', sms: 'KOTAKB' },
  ];
  var bankDraft = null;
  var bankSmsTimer = null;
  var bankCheckTimer = null;

  function sessionPhone() {
    var s = window.GradRightSession && GradRightSession.get && GradRightSession.get();
    if (s && s.phone) return s.phone;
    return '9876543210';
  }

  function sessionName() {
    var s = window.GradRightSession && GradRightSession.get && GradRightSession.get();
    return (s && s.name) || 'Priya Sharma';
  }

  function formatPhone(value) {
    if (window.GradRightSession && GradRightSession.formatPhone) {
      return GradRightSession.formatPhone(value);
    }
    var d = String(value || '').replace(/\D/g, '').slice(-10);
    if (d.length !== 10) return value || '';
    return '+91 ' + d.slice(0, 5) + ' ' + d.slice(5);
  }

  function maskAccount(num) {
    var d = String(num || '').replace(/\D/g, '');
    if (d.length < 4) return '••••';
    return '•••• ' + d.slice(-4);
  }

  function smsCodeFor(phone) {
    return String(100000 + (hashSeed(phone + 'bank') % 900000));
  }

  function loadBanks() {
    try {
      var raw = JSON.parse(localStorage.getItem(BANK_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveBanks(list) {
    localStorage.setItem(BANK_KEY, JSON.stringify(list));
  }

  function bankById(id) {
    return BANK_OPTIONS.filter(function (b) {
      return b.id === id;
    })[0] || BANK_OPTIONS[0];
  }

  function renderBanks() {
    var list = document.getElementById('bank-list');
    var addBtn = document.getElementById('add-bank-btn');
    if (!list) return;
    var banks = loadBanks();
    if (addBtn) {
      addBtn.hidden = banks.length >= 2;
    }
    if (!banks.length) {
      list.innerHTML =
        '<div class="bank-empty">' +
        '<strong>No payout bank yet</strong>' +
        '<p>Link a bank to withdraw connect fees. You can add up to 2 accounts. The bank will text the number registered with it, then we verify the account.</p>' +
        '<button type="button" class="btn btn-primary btn-sm" data-bank-add>Add bank</button>' +
        '</div>';
      return;
    }
    list.innerHTML = banks
      .map(function (b, i) {
        return (
          '<article class="bank-card">' +
          '<div class="bank-card-top"><strong>' +
          escapeHtml(b.bankName) +
          '</strong><span class="bank-pill">' +
          (i === 0 ? 'Primary' : 'Verified') +
          '</span></div>' +
          '<div class="bank-card-meta">' +
          escapeHtml(maskAccount(b.account)) +
          '<br>IFSC ' +
          escapeHtml(b.ifsc) +
          '<br>' +
          escapeHtml(b.holder) +
          '</div>' +
          '<div class="bank-card-actions">' +
          (i === 0 ? '' : '<button type="button" data-bank-primary="' + i + '">Make primary</button>') +
          '<button type="button" class="is-danger" data-bank-remove="' +
          i +
          '">Remove</button>' +
          '</div></article>'
        );
      })
      .join('');
  }

  function clearBankTimers() {
    if (bankSmsTimer) {
      clearTimeout(bankSmsTimer);
      bankSmsTimer = null;
    }
    if (bankCheckTimer) {
      clearInterval(bankCheckTimer);
      bankCheckTimer = null;
    }
  }

  function closeBankModal() {
    var modal = document.getElementById('bank-modal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('cal-modal-open');
    clearBankTimers();
    bankDraft = null;
  }

  function openBankModal() {
    if (loadBanks().length >= 2) return;
    bankDraft = {
      step: 'phone',
      phone: sessionPhone(),
      bankId: 'hdfc',
      account: '',
      ifsc: '',
      holder: sessionName(),
      smsArrived: false,
      checks: 0,
    };
    var modal = document.getElementById('bank-modal');
    if (modal) modal.hidden = false;
    document.body.classList.add('cal-modal-open');
    paintBankStep();
  }

  function setBankActions(html) {
    var el = document.getElementById('bank-modal-actions');
    if (el) el.innerHTML = html;
  }

  function paintBankStep() {
    var title = document.getElementById('bank-modal-title');
    var body = document.getElementById('bank-modal-body');
    if (!body || !bankDraft) return;
    var bank = bankById(bankDraft.bankId);
    var code = smsCodeFor(bankDraft.phone);

    if (bankDraft.step === 'phone') {
      if (title) title.textContent = 'Confirm mobile';
      body.innerHTML =
        '<p class="bank-step-note">Use the number registered with your bank. They will send a message to this number to start linking.</p>' +
        '<label class="field"><span>Contact number</span>' +
        '<input type="tel" id="bank-phone" inputmode="numeric" autocomplete="tel" value="' +
        escapeHtml(formatPhone(bankDraft.phone)) +
        '" /></label>';
      setBankActions(
        '<button type="button" class="btn btn-secondary" data-close-bank>Cancel</button>' +
          '<button type="button" class="btn btn-primary" data-bank-next>Send bank message</button>'
      );
      return;
    }

    if (bankDraft.step === 'sms') {
      if (title) title.textContent = 'Bank message';
      body.innerHTML =
        '<p class="bank-step-note">' +
        escapeHtml(bank.name) +
        ' is sending a message to ' +
        escapeHtml(formatPhone(bankDraft.phone)) +
        '. Keep this page open.</p>' +
        (bankDraft.smsArrived
          ? '<div class="bank-sms"><div class="bank-sms-from">' +
            escapeHtml(bank.sms) +
            '</div><p>Use ' +
            escapeHtml(code) +
            ' to confirm your GradRight payout account. Do not share this code.</p></div>'
          : '<div class="bank-sms is-wait">Waiting for the bank message…</div>');
      setBankActions(
        '<button type="button" class="btn btn-secondary" data-close-bank>Cancel</button>' +
          '<button type="button" class="btn btn-primary" data-bank-next' +
          (bankDraft.smsArrived ? '' : ' disabled') +
          '>Continue</button>'
      );
      if (!bankDraft.smsArrived) {
        clearBankTimers();
        bankSmsTimer = setTimeout(function () {
          if (!bankDraft || bankDraft.step !== 'sms') return;
          bankDraft.smsArrived = true;
          paintBankStep();
        }, 1400);
      }
      return;
    }

    if (bankDraft.step === 'code') {
      if (title) title.textContent = 'Enter code';
      body.innerHTML =
        '<p class="bank-step-note">Enter the 6-digit code from the bank message.</p>' +
        '<label class="field"><span>Verification code</span>' +
        '<input type="text" id="bank-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" /></label>' +
        '<p class="hint-text" id="bank-code-err" hidden>That code does not match the bank message.</p>';
      setBankActions(
        '<button type="button" class="btn btn-secondary" data-close-bank>Cancel</button>' +
          '<button type="button" class="btn btn-primary" data-bank-next>Verify code</button>'
      );
      return;
    }

    if (bankDraft.step === 'details') {
      if (title) title.textContent = 'Bank details';
      body.innerHTML =
        '<p class="bank-step-note">Payouts go to this account after verification. You can link up to 2 banks.</p>' +
        '<label class="field"><span>Bank</span><select id="bank-name">' +
        BANK_OPTIONS.map(function (opt) {
          return (
            '<option value="' +
            opt.id +
            '"' +
            (opt.id === bankDraft.bankId ? ' selected' : '') +
            '>' +
            escapeHtml(opt.name) +
            '</option>'
          );
        }).join('') +
        '</select></label>' +
        '<label class="field"><span>Account number</span>' +
        '<input type="text" id="bank-account" inputmode="numeric" value="' +
        escapeHtml(bankDraft.account) +
        '" /></label>' +
        '<label class="field"><span>IFSC</span>' +
        '<input type="text" id="bank-ifsc" value="' +
        escapeHtml(bankDraft.ifsc) +
        '" placeholder="HDFC0001234" /></label>' +
        '<label class="field"><span>Account holder</span>' +
        '<input type="text" id="bank-holder" value="' +
        escapeHtml(bankDraft.holder) +
        '" /></label>';
      setBankActions(
        '<button type="button" class="btn btn-secondary" data-close-bank>Cancel</button>' +
          '<button type="button" class="btn btn-primary" data-bank-next>Start verification</button>'
      );
      return;
    }

    if (bankDraft.step === 'verify') {
      if (title) title.textContent = 'Verifying';
      var checks = [
        'Mobile number matched',
        'Bank message confirmed',
        'Account details checked',
        'Name match with your profile',
      ];
      body.innerHTML =
        '<p class="bank-step-note">We are confirming this account with the bank. This usually takes a few seconds.</p>' +
        '<div class="bank-checks">' +
        checks
          .map(function (label, i) {
            var done = i < bankDraft.checks;
            return (
              '<div class="bank-check' +
              (done ? ' is-done' : '') +
              '"><span class="material-symbols-rounded" aria-hidden="true">' +
              (done ? 'check_circle' : 'radio_button_unchecked') +
              '</span>' +
              escapeHtml(label) +
              '</div>'
            );
          })
          .join('') +
        '</div>';
      setBankActions(
        '<button type="button" class="btn btn-primary" data-bank-next' +
          (bankDraft.checks >= checks.length ? '' : ' disabled') +
          '>Finish</button>'
      );
      if (bankDraft.checks < checks.length && !bankCheckTimer) {
        bankCheckTimer = setInterval(function () {
          if (!bankDraft || bankDraft.step !== 'verify') {
            clearBankTimers();
            return;
          }
          bankDraft.checks += 1;
          if (bankDraft.checks >= checks.length) clearBankTimers();
          paintBankStep();
        }, 700);
      }
      return;
    }

    if (title) title.textContent = 'Bank linked';
    body.innerHTML =
      '<div class="bank-done-mark"><span class="material-symbols-rounded" aria-hidden="true">check</span></div>' +
      '<p class="bank-step-note"><strong>' +
      escapeHtml(bankDraft.bankName || bank.name) +
      '</strong> is ready for payouts. Connect fees can be withdrawn to ' +
      escapeHtml(maskAccount(bankDraft.account)) +
      '.</p>';
    setBankActions('<button type="button" class="btn btn-primary" data-close-bank>Done</button>');
  }

  function readBankFields() {
    var phone = document.getElementById('bank-phone');
    var code = document.getElementById('bank-code');
    var name = document.getElementById('bank-name');
    var account = document.getElementById('bank-account');
    var ifsc = document.getElementById('bank-ifsc');
    var holder = document.getElementById('bank-holder');
    if (phone) {
      bankDraft.phone = String(phone.value || '').replace(/\D/g, '').slice(-10);
    }
    if (name) bankDraft.bankId = name.value;
    if (account) bankDraft.account = String(account.value || '').replace(/\D/g, '');
    if (ifsc) bankDraft.ifsc = String(ifsc.value || '').toUpperCase().replace(/\s+/g, '');
    if (holder) bankDraft.holder = holder.value.trim() || sessionName();
    return code ? String(code.value || '').replace(/\D/g, '') : '';
  }

  function nextBankStep() {
    if (!bankDraft) return;
    var typed = readBankFields();
    if (bankDraft.step === 'phone') {
      if (bankDraft.phone.length !== 10) return;
      bankDraft.step = 'sms';
      bankDraft.smsArrived = false;
      paintBankStep();
      return;
    }
    if (bankDraft.step === 'sms') {
      if (!bankDraft.smsArrived) return;
      bankDraft.step = 'code';
      paintBankStep();
      return;
    }
    if (bankDraft.step === 'code') {
      var err = document.getElementById('bank-code-err');
      if (typed !== smsCodeFor(bankDraft.phone)) {
        if (err) err.hidden = false;
        return;
      }
      bankDraft.step = 'details';
      paintBankStep();
      return;
    }
    if (bankDraft.step === 'details') {
      if (bankDraft.account.length < 8 || bankDraft.ifsc.length < 8) return;
      bankDraft.bankName = bankById(bankDraft.bankId).name;
      bankDraft.step = 'verify';
      bankDraft.checks = 0;
      paintBankStep();
      return;
    }
    if (bankDraft.step === 'verify') {
      if (bankDraft.checks < 4) return;
      var list = loadBanks();
      list.push({
        id: 'b' + Date.now(),
        bankId: bankDraft.bankId,
        bankName: bankDraft.bankName,
        account: bankDraft.account,
        ifsc: bankDraft.ifsc,
        holder: bankDraft.holder,
        phone: bankDraft.phone,
      });
      saveBanks(list.slice(0, 2));
      bankDraft.step = 'done';
      paintBankStep();
      renderBanks();
    }
  }

  renderBanks();

  var bankList = document.getElementById('bank-list');
  var addBankBtn = document.getElementById('add-bank-btn');
  var bankModal = document.getElementById('bank-modal');
  if (addBankBtn) addBankBtn.addEventListener('click', openBankModal);
  if (bankList) {
    bankList.addEventListener('click', function (e) {
      if (e.target.closest('[data-bank-add]')) {
        openBankModal();
        return;
      }
      var primary = e.target.closest('[data-bank-primary]');
      if (primary) {
        var idx = Number(primary.getAttribute('data-bank-primary'));
        var rows = loadBanks();
        if (!rows[idx]) return;
        var picked = rows.splice(idx, 1)[0];
        rows.unshift(picked);
        saveBanks(rows);
        renderBanks();
        return;
      }
      var remove = e.target.closest('[data-bank-remove]');
      if (remove) {
        var at = Number(remove.getAttribute('data-bank-remove'));
        var next = loadBanks().filter(function (_b, i) {
          return i !== at;
        });
        saveBanks(next);
        renderBanks();
      }
    });
  }
  if (bankModal) {
    bankModal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-bank]')) {
        closeBankModal();
        return;
      }
      if (e.target.closest('[data-bank-next]')) {
        var nextBtn = e.target.closest('[data-bank-next]');
        if (nextBtn.disabled) return;
        nextBankStep();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!bankModal || bankModal.hidden) return;
    if (e.key === 'Escape') closeBankModal();
    if (e.key === 'Enter' && bankDraft && bankDraft.step !== 'verify' && bankDraft.step !== 'done') {
      e.preventDefault();
      nextBankStep();
    }
  });

  render();
})();
