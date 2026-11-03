/**
 * Dashboard top: date range, visitors / connects / earnings / reviews, chart.
 * Earnings = sum of each connected person's amount (people.csv).
 */
(function () {
  const TODAY = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
  const PEOPLE = (window.GradRightDB && GradRightDB.people) || [];

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

  function emptyNote(kind) {
    if (!isApproved()) {
      if (kind === 'calls') {
        return { title: 'No meets yet', text: 'Bookings show up here after you are approved.' };
      }
      if (kind === 'connects') {
        return { title: 'No connects yet', text: 'Paid connections show up here after you are approved.' };
      }
      return { title: 'No visitors yet', text: 'Sources show up here after you are approved.' };
    }
    if (kind === 'calls') {
      if (rangeKey === 'today') return { title: 'No meets today', text: 'Nothing scheduled for today.' };
      if (rangeKey === 'yesterday') return { title: 'No meets yesterday', text: 'Nothing was booked that day.' };
      return { title: 'No meets in this period', text: 'Try a different date range.' };
    }
    if (kind === 'connects') {
      if (rangeKey === 'today') return { title: 'No connects today', text: 'New connections will land here.' };
      if (rangeKey === 'yesterday') {
        return { title: 'No connects yesterday', text: 'Nobody connected that day.' };
      }
      return { title: 'No connects in this period', text: 'Try a different date range.' };
    }
    return { title: 'No visitors in this period', text: 'Try a different date range.' };
  }

  function emptyHtml(kind) {
    const n = emptyNote(kind);
    return (
      '<div class="dash-empty"><strong>' +
      n.title +
      '</strong><span>' +
      n.text +
      '</span></div>'
    );
  }
  const dayKey =
    (window.GradRightDB && GradRightDB.dayKey) ||
    function (s) {
      return String(s || '').slice(0, 10);
    };
  const formatWhen = (window.GradRightDB && GradRightDB.formatWhen) || function (stamp) {
    return String(stamp || '');
  };

  let rangeKey = '30';
  let customStart = null;
  let customEnd = null;
  let rangeMemo = null;
  let calStart = { y: 2026, m: 7 };
  let calEnd = { y: 2026, m: 8 };

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

  function connectAmount(p) {
    const n = Number(p && p.amount);
    if (Number.isFinite(n) && n > 0) return n;
    return p && p.connected ? 1999 : 0;
  }

  function formatInr(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function formatInrCompact(n) {
    n = Number(n || 0);
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (n >= 10000) return '₹' + Math.round(n / 1000) + 'k';
    return formatInr(n);
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

  function stampHour(stamp) {
    const parse = window.GradRightDB && GradRightDB.parseStamp;
    const d = stamp instanceof Date ? stamp : parse ? parse(stamp) : null;
    return d ? d.getHours() : 0;
  }

  function emptyBucket() {
    return { visitors: 0, unique: {}, connections: 0, earnings: 0, reviews: 0, ratingSum: 0 };
  }

  const REVIEWS = (function () {
    const out = [];
    const connected = PEOPLE.filter(function (p) {
      return p.connected && p.connectedOn;
    });
    connected.forEach(function (p, i) {
      if (i % 3 !== 0) return;
      const d = parseDay(p.connectedOn);
      d.setDate(d.getDate() + 1 + (i % 4));
      if (d > TODAY) return;
      out.push({
        day: iso(d),
        hour: Math.min(23, stampHour(p.connectedOn) + 1 + (i % 3)),
        rating: i % 7 === 0 ? 4 : 5,
        id: p.id,
      });
    });
    return out;
  })();

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
        const hk = v.when + ' ' + String(stampHour(v.date || v.at || v.when)).padStart(2, '0');
        const hour = bucket(hours, hk);
        hour.visitors += 1;
        hour.unique[p.id] = true;
      });
      if (p.connected && p.connectedOn) {
        const amt = connectAmount(p);
        const dayKeyOn = dayKey(p.connectedOn);
        const day = bucket(days, dayKeyOn);
        day.connections += 1;
        day.earnings += amt;
        const hk = dayKeyOn + ' ' + String(stampHour(p.connectedOn)).padStart(2, '0');
        const hour = bucket(hours, hk);
        hour.connections += 1;
        hour.earnings += amt;
      }
    });
    REVIEWS.forEach(function (rv) {
      const day = bucket(days, rv.day);
      day.reviews += 1;
      day.ratingSum += rv.rating;
      const hk = rv.day + ' ' + String(rv.hour).padStart(2, '0');
      const hour = bucket(hours, hk);
      hour.reviews += 1;
      hour.ratingSum += rv.rating;
    });
    return { days: days, hours: hours };
  })();

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
      earnings: bucket.earnings,
      reviews: bucket.reviews,
      ratingSum: bucket.ratingSum,
    };
  }

  function buildSeries() {
    const r = chartRange();
    const days = daysIn(r);
    if (!isApproved()) {
      if (days.length <= 1) {
        const day = days[0] || startOfDay(TODAY);
        const key = iso(day);
        const series = [];
        for (let h = 0; h < 24; h++) {
          const hk = key + ' ' + String(h).padStart(2, '0');
          series.push(
            packPoint(null, new Date(day.getFullYear(), day.getMonth(), day.getDate(), h), hk, 'hour', h)
          );
        }
        return { series: series, grain: 'hour' };
      }
      return {
        grain: 'day',
        series: days.map(function (day) {
          const key = iso(day);
          return packPoint(null, day, key, 'day');
        }),
      };
    }
    if (days.length <= 1) {
      const day = days[0] || startOfDay(TODAY);
      const key = iso(day);
      const series = [];
      for (let h = 0; h < 24; h++) {
        const hk = key + ' ' + String(h).padStart(2, '0');
        series.push(
          packPoint(ACTIVITY.hours[hk], new Date(day.getFullYear(), day.getMonth(), day.getDate(), h), hk, 'hour', h)
        );
      }
      return { series: series, grain: 'hour' };
    }
    return {
      grain: 'day',
      series: days.map(function (day) {
        const key = iso(day);
        return packPoint(ACTIVITY.days[key], day, key, 'day');
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

  function maxOf(series, key) {
    return Math.max(
      1,
      series.reduce(function (n, d) {
        return Math.max(n, d[key] || 0);
      }, 0)
    );
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
    const maxVis = maxOf(series, 'visitors');
    const maxCon = maxOf(series, 'connections');

    function xy(i, value, max) {
      const x = series.length === 1 ? pad.l + innerW / 2 : pad.l + (i / (series.length - 1)) * innerW;
      const y = pad.t + innerH - (value / max) * innerH;
      return { x: x, y: y };
    }

    const visPts = series.map(function (d, i) {
      return xy(i, d.visitors, maxVis);
    });
    const conPts = series.map(function (d, i) {
      return xy(i, d.connections, maxCon);
    });

    let html = '';
    visPts.forEach(function (p, i) {
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
      '<path class="analytics-path visitors" d="' +
      pathFrom(visPts) +
      '"></path>' +
      '<path class="analytics-path connections" d="' +
      pathFrom(conPts) +
      '"></path>';
    if (grain === 'hour') {
      visPts.forEach(function (p, i) {
        if (!series[i].visitors && !series[i].connections) return;
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
        '<div><span class="dot visitors"></span>Impressions<span>' +
        d.visitors +
        '</span></div>' +
        '<div><span class="dot connections"></span>Connects<span>' +
        d.connections +
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

  function renderStats() {
    const built = buildSeries();
    const series = built.series;
    const visitors = series.reduce(function (n, d) {
      return n + d.visitors;
    }, 0);
    const connections = series.reduce(function (n, d) {
      return n + d.connections;
    }, 0);
    const reviews = series.reduce(function (n, d) {
      return n + d.reviews;
    }, 0);
    const ratingSum = series.reduce(function (n, d) {
      return n + d.ratingSum;
    }, 0);
    const unique = {};
    if (isApproved()) {
      PEOPLE.forEach(function (p) {
        (p.views || []).forEach(function (v) {
          if (inRange(v.when)) unique[p.id] = true;
        });
      });
    }
    const uniqueCount = Object.keys(unique).length;
    const earnings = series.reduce(function (n, d) {
      return n + d.earnings;
    }, 0);
    const avg = reviews ? ratingSum / reviews : 0;

    document.getElementById('stat-visitors').textContent = visitors.toLocaleString('en-IN');
    document.getElementById('stat-visitors-hint').textContent = uniqueCount.toLocaleString('en-IN') + ' unique';
    document.getElementById('stat-connects').textContent = connections.toLocaleString('en-IN');
    document.getElementById('stat-connects-hint').textContent = 'All paid connections';
    document.getElementById('stat-earnings').textContent = formatInrCompact(earnings);
    document.getElementById('stat-earnings-hint').textContent =
      'Across ' + connections.toLocaleString('en-IN') + ' connections';
    document.getElementById('stat-reviews').textContent = reviews ? avg.toFixed(1) : '—';
    document.getElementById('stat-reviews-hint').textContent =
      reviews.toLocaleString('en-IN') + ' reviews received';

    paintTrends({
      unique: uniqueCount,
      connections: connections,
      earnings: earnings,
      reviews: reviews,
    });

    renderChart(series, built.grain);
    renderSources();
  }

  function vsLabel() {
    if (rangeKey === 'today') return 'from yesterday';
    if (rangeKey === 'yesterday') return 'from prior day';
    if (rangeKey === '7') return 'from last week';
    if (rangeKey === '30') return 'from last month';
    return 'from previous period';
  }

  function previousRange() {
    const r = currentRange();
    const len = daysIn(r).length;
    const end = addDays(r.start, -1);
    return makeRange(addDays(end, 1 - len), end);
  }

  function inGivenRange(isoDate, r) {
    const key = dayKey(isoDate);
    return key >= r.startKey && key <= r.endKey;
  }

  function statsForRange(r) {
    const unique = {};
    let connections = 0;
    let earnings = 0;
    let reviews = 0;
    if (!isApproved()) {
      return { unique: 0, connections: 0, earnings: 0, reviews: 0 };
    }
    PEOPLE.forEach(function (p) {
      (p.views || []).forEach(function (v) {
        if (inGivenRange(v.when, r)) unique[p.id] = true;
      });
      if (p.connected && p.connectedOn && inGivenRange(p.connectedOn, r)) {
        connections += 1;
        earnings += connectAmount(p);
      }
    });
    REVIEWS.forEach(function (rv) {
      if (inGivenRange(rv.day, r)) reviews += 1;
    });
    return {
      unique: Object.keys(unique).length,
      connections: connections,
      earnings: earnings,
      reviews: reviews,
    };
  }

  function formatDelta(curr, prev) {
    if (prev <= 0 && curr <= 0) return { text: 'No change ' + vsLabel(), cls: '' };
    if (prev <= 0) return { text: 'New ' + vsLabel(), cls: 'up' };
    const pct = Math.round(((curr - prev) / prev) * 100);
    if (pct === 0) return { text: 'Same ' + vsLabel(), cls: '' };
    return {
      text: (pct > 0 ? '↑ ' : '↓ ') + Math.abs(pct) + '% ' + vsLabel(),
      cls: pct > 0 ? 'up' : 'down',
    };
  }

  function paintTrend(id, curr, prev) {
    const el = document.getElementById(id);
    if (!el) return;
    if (rangeKey === 'all') {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    const d = formatDelta(curr, prev);
    el.hidden = false;
    el.textContent = d.text;
    el.classList.toggle('up', d.cls === 'up');
    el.classList.toggle('down', d.cls === 'down');
  }

  function paintTrends(curr) {
    if (rangeKey === 'all' || !isApproved()) {
      ['stat-visitors-trend', 'stat-connects-trend', 'stat-earnings-trend', 'stat-reviews-trend'].forEach(
        function (id) {
          const el = document.getElementById(id);
          if (el) {
            el.hidden = true;
            el.textContent = '';
          }
        }
      );
      return;
    }
    const prev = statsForRange(previousRange());
    paintTrend('stat-visitors-trend', curr.unique, prev.unique);
    paintTrend('stat-connects-trend', curr.connections, prev.connections);
    paintTrend('stat-earnings-trend', curr.earnings, prev.earnings);
    paintTrend('stat-reviews-trend', curr.reviews, prev.reviews);
  }

  const SOURCE_ORDER = [
    { key: 'marketplace', label: 'Marketplace' },
    { key: 'recommended', label: 'Recommended match' },
    { key: 'community', label: 'Community' },
    { key: 'profile-share', label: 'Profile share' },
    { key: 'community-replies', label: 'Community replies' },
    { key: 'google', label: 'Google' },
    { key: 'instagram', label: 'Instagram' },
  ];

  function sourceSeed(p, v, mod) {
    const seed = String((p && p.id) || '') + String((v && v.when) || '') + String((v && v.at) || '');
    let n = 0;
    for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i) * (i + 1)) % mod;
    return n;
  }

  function visitSource(p, v) {
    const raw = (v && v.source) || p.lastSource || p.source || 'Visited profile';
    if (raw === 'Recommended match') return 'recommended';
    if (raw === 'From Community') {
      return sourceSeed(p, v, 5) === 0 ? 'community-replies' : 'community';
    }
    if (raw === 'From chat share') {
      return sourceSeed(p, v, 10) < 3 ? 'instagram' : 'profile-share';
    }
    const n = sourceSeed(p, v, 10);
    if (n === 0) return 'instagram';
    if (n <= 2) return 'google';
    return 'marketplace';
  }

  function paintSourceRows(rows) {
    const list = document.getElementById('source-list');
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = emptyHtml('sources');
      return;
    }
    const max = rows.reduce(function (n, row) {
      return Math.max(n, row.count);
    }, 1);
    list.innerHTML = rows
      .map(function (row, i) {
        const width = row.count ? Math.max(12, Math.round((row.count / max) * 100)) : 0;
        return (
          '<div class="source-row' +
          (i === 0 && row.count ? ' is-lead' : '') +
          (row.count ? '' : ' is-empty') +
          '">' +
          '<span class="bar" style="width:' +
          width +
          '%;opacity:' +
          (1 - i * 0.12).toFixed(2) +
          '"></span>' +
          '<span class="dot" aria-hidden="true"></span>' +
          '<span class="name">' +
          row.label +
          '</span>' +
          '<span class="count">' +
          row.count.toLocaleString('en-IN') +
          '</span></div>'
        );
      })
      .join('');
  }

  function emptySourceRows() {
    return SOURCE_ORDER.filter(function (item) {
      return (
        item.key === 'marketplace' ||
        item.key === 'recommended' ||
        item.key === 'community' ||
        item.key === 'profile-share' ||
        item.key === 'community-replies'
      );
    }).map(function (item) {
      return { key: item.key, label: item.label, count: 0 };
    });
  }

  function renderSources() {
    const list = document.getElementById('source-list');
    if (!list) return;
    if (!isApproved()) {
      paintSourceRows(emptySourceRows());
      return;
    }
    const counts = {};
    PEOPLE.forEach(function (p) {
      (p.views || []).forEach(function (v) {
        if (!inRange(v.when)) return;
        const key = visitSource(p, v);
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    const rows = SOURCE_ORDER.map(function (item) {
      return { key: item.key, label: item.label, count: counts[item.key] || 0 };
    }).filter(function (row) {
      return row.count > 0;
    });
    paintSourceRows(rows.length ? rows : emptySourceRows());
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
    renderStats();
    renderTodayCalls();
    renderRecentConnects();
  }

  const presetBtn = document.getElementById('preset-btn');
  const presetMenu = document.getElementById('preset-menu');
  const startBtn = document.getElementById('start-btn');
  const endBtn = document.getElementById('end-btn');
  const startMenu = document.getElementById('cal-start-menu');
  const endMenu = document.getElementById('cal-end-menu');

  if (!presetBtn) return;

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

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#range-wrap')) closeMenus();
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

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  const CALLS_PATCH_KEY = 'gradright_dash_call_patches_v1';
  const CLOCK_KEY = 'gradright_dash_clock_started_v1';

  function readClockStarted() {
    try {
      const raw = sessionStorage.getItem(CLOCK_KEY);
      const n = Number(raw);
      if (n > 0) return n;
      sessionStorage.setItem(CLOCK_KEY, String(Date.now()));
    } catch (e) {}
    return Date.now();
  }

  const clockStarted = readClockStarted();

  function enrichCall(call) {
    const person =
      (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[call.personId]) || {};
    const fromService = String(call.service || '').toLowerCase().indexOf('parent') >= 0;
    return Object.assign({}, call, {
      name: call.name || person.name || 'Student',
      initials: call.initials || person.initials || '•',
      amber: call.amber != null ? call.amber : !!person.amber,
      role: call.role || person.role || (fromService ? 'parent' : 'student'),
    });
  }

  function defaultTodayCalls() {
    if (window.GradRightCalls && typeof GradRightCalls.today === 'function') {
      return GradRightCalls.today().map(enrichCall);
    }
    return [];
  }

  function loadPatches() {
    try {
      const raw = localStorage.getItem(CALLS_PATCH_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      return saved && typeof saved === 'object' ? saved : {};
    } catch (e) {
      return {};
    }
  }

  function savePatches(patches) {
    try {
      localStorage.setItem(CALLS_PATCH_KEY, JSON.stringify(patches));
    } catch (e) {}
  }

  function patchCall(id, fields) {
    const patches = loadPatches();
    patches[id] = Object.assign({}, patches[id], fields);
    savePatches(patches);
  }

  function loadAllCalls() {
    if (!isApproved()) return [];
    const patches = loadPatches();
    const source =
      window.GradRightCalls && typeof GradRightCalls.all === 'function'
        ? GradRightCalls.all()
        : defaultTodayCalls();
    return source.map(function (call) {
      return Object.assign({}, enrichCall(call), patches[call.id] || {});
    });
  }

  function loadTodayCalls() {
    const today = (window.GradRightCalls && GradRightCalls.todayKey) || dayKey(TODAY);
    return loadAllCalls().filter(function (call) {
      return dayKey(call.day) === today;
    });
  }

  function loadRangeCalls() {
    return loadAllCalls().filter(function (call) {
      return inRange(call.day);
    });
  }

  function callById(id) {
    return (
      loadAllCalls().filter(function (call) {
        return call.id === id;
      })[0] || null
    );
  }

  function isSingleDayRange() {
    const r = currentRange();
    return !!(r && r.startKey && r.startKey === r.endKey);
  }

  function rangeListTitle(kind) {
    const noun = kind === 'calls' ? 'meets' : 'connects';
    if (rangeKey === 'today') return 'Today’s ' + noun;
    if (rangeKey === 'yesterday') return 'Yesterday’s ' + noun;
    return noun.charAt(0).toUpperCase() + noun.slice(1);
  }

  function syncSectionTitles() {
    const calls = document.getElementById('dash-calls-title');
    const connects = document.getElementById('dash-connects-title');
    if (calls) calls.textContent = rangeListTitle('calls');
    if (connects) connects.textContent = rangeListTitle('connects');
  }

  function callDayLabel(day) {
    if (window.GradRightCalls && GradRightCalls.dayLabel) {
      return GradRightCalls.dayLabel(day);
    }
    return day;
  }

  function timeToMinutes(hhmm) {
    const p = String(hhmm || '').split(':');
    return Number(p[0] || 0) * 60 + Number(p[1] || 0);
  }

  function nowMinutes() {
    return TODAY.getHours() * 60 + TODAY.getMinutes() + (Date.now() - clockStarted) / 60000;
  }

  function formatCallClock(hhmm) {
    const p = String(hhmm || '').split(':');
    const h = Number(p[0] || 0);
    const m = String(p[1] || '00').padStart(2, '0');
    return (h % 12 || 12) + ':' + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function formatWait(mins) {
    if (mins <= 0) return 'Starts soon';
    if (mins < 60) return 'Starts in ' + mins + ' min';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (!m) return h === 1 ? 'Starts in 1 hr' : 'Starts in ' + h + ' hr';
    return 'Starts in ' + h + ' hr ' + m + ' min';
  }

  function callPhase(call) {
    if (window.GradRightCalls && GradRightCalls.isDemoLive && GradRightCalls.isDemoLive(call)) {
      return 'live';
    }
    if (call.status === 'cancelled') return 'cancelled';
    if (call.status === 'moved') return 'moved';
    if (call.status === 'missed') return 'missed';
    if (window.GradRightCalls && GradRightCalls.phase) {
      const mapped = GradRightCalls.phase(call);
      if (mapped === 'ongoing') return 'live';
      if (mapped === 'completed') return 'done';
      return mapped;
    }
    const start = timeToMinutes(call.time);
    const end = start + (Number(call.mins) || 30);
    const now = TODAY.getHours() * 60 + TODAY.getMinutes();
    if (call.status === 'done' || end <= now) return 'done';
    if (start < now && now < end) return 'live';
    return 'upcoming';
  }

  function isOpenPhase(phase) {
    return phase === 'live' || phase === 'upcoming';
  }

  function liveLeftSeconds(call) {
    if (window.GradRightCalls && GradRightCalls.liveLeftSeconds) {
      return GradRightCalls.liveLeftSeconds(call);
    }
    const end = timeToMinutes(call.time) + (Number(call.mins) || 30);
    return Math.max(0, Math.round((end - nowMinutes()) * 60));
  }

  function liveLeftText(call) {
    if (window.GradRightCalls && GradRightCalls.liveLeftText) {
      return GradRightCalls.liveLeftText(call);
    }
    const left = liveLeftSeconds(call);
    if (left <= 0) return 'Ending now';
    const m = Math.floor(left / 60);
    const s = left % 60;
    return 'Ending in ' + m + ':' + String(s).padStart(2, '0') + ' minutes';
  }

  function callHint(call, phase) {
    const mins = Number(call.mins) || 30;
    if (phase === 'live') return liveLeftText(call);
    if (phase === 'upcoming') return mins + ' min · ' + formatWait(Math.round(timeToMinutes(call.time) - nowMinutes()));
    if (phase === 'cancelled') return mins + ' min';
    if (phase === 'missed') return mins + ' min · Didn’t join';
    if (phase === 'moved' && call.movedLabel) return mins + ' min · ' + call.movedLabel;
    return mins + ' min';
  }

  function roleBadge(role) {
    return role === 'parent'
      ? '<span class="role-badge parent">Parent</span>'
      : '<span class="role-badge student">Student</span>';
  }

  function openSlots() {
    const booked = loadTodayCalls()
      .filter(function (call) {
        return call.status !== 'cancelled' && call.status !== 'moved';
      })
      .map(function (call) {
        return {
          day: call.day || ((window.GradRightCalls && GradRightCalls.todayKey) || '2026-09-23'),
          time: call.time,
          mins: call.mins,
        };
      });
    if (window.GradRightCalendar && typeof GradRightCalendar.openSlots === 'function') {
      return GradRightCalendar.openSlots(TODAY, {
        afterMinutes: nowMinutes(),
        booked: booked,
        limit: 6,
      });
    }
    return [];
  }

  function sortTodayCalls(list) {
    return list.slice().sort(function (a, b) {
      const pa = callPhase(a);
      const pb = callPhase(b);
      const oa = isOpenPhase(pa) ? 0 : 1;
      const ob = isOpenPhase(pb) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  }

  function renderCallSlot(call) {
    const phase = callPhase(call);
    const clock = formatCallClock(call.time);
    const open = isOpenPhase(phase);
    const slots = openSlots();
    const joinHref =
      'call.html?id=' + encodeURIComponent(call.personId || call.id) + '&from=dashboard';
    const joinBtn = call.joined
      ? '<span class="dash-call-status">Joined</span>'
      : '<a class="dash-join" data-join="' +
        escapeHtml(call.id) +
        '" href="' +
        joinHref +
        '">' +
        (phase === 'live' ? 'Join now' : 'Join') +
        '</a>';
    const actions = open
      ? '<div class="dash-call-actions">' +
        joinBtn +
        '<button type="button" class="icon-btn dash-call-more" data-call-menu="' +
        escapeHtml(call.id) +
        '" title="Meet options" aria-label="Meet options" aria-expanded="false">' +
        '<span class="material-symbols-rounded" aria-hidden="true">more_vert</span></button>' +
        '<div class="dash-reschedule-menu" hidden>' +
        (slots.length ? '<div class="dash-menu-label">Reschedule</div>' : '') +
        slots
          .map(function (slot) {
            return (
              '<button type="button" data-move="' +
              escapeHtml(call.id) +
              '" data-day="' +
              slot.day +
              '" data-time="' +
              slot.time +
              '">' +
              escapeHtml(slot.label) +
              '</button>'
            );
          })
          .join('') +
        '<button type="button" class="is-danger" data-cancel="' +
        escapeHtml(call.id) +
        '">Cancel meet</button></div></div>'
      : '<span class="dash-call-status' +
        (phase === 'missed' ? ' is-missed' : '') +
        '">' +
        (phase === 'cancelled'
          ? 'Cancelled'
          : phase === 'moved'
            ? 'Moved'
            : phase === 'missed'
              ? 'Missed'
              : 'Done') +
        '</span>';

    return (
      '<div class="dash-slot" data-call="' +
      escapeHtml(call.id) +
      '">' +
      '<span class="dash-slot-time">' +
      escapeHtml(clock) +
      '</span>' +
      '<div class="dash-slot-card' +
      (phase === 'done' ? ' is-done' : '') +
      (phase === 'moved' ? ' is-moved' : '') +
      (phase === 'cancelled' ? ' is-cancelled' : '') +
      (phase === 'missed' ? ' is-missed' : '') +
      (phase === 'live' ? ' is-live' : '') +
      '">' +
      '<div class="dash-call-main">' +
      '<div class="dash-call-title"><strong>' +
      escapeHtml(call.name) +
      '</strong>' +
      roleBadge(call.role) +
      '</div>' +
      '<span' +
      (phase === 'live' ? ' data-live-left="' + escapeHtml(call.id) + '"' : '') +
      '>' +
      escapeHtml(callHint(call, phase)) +
      '</span></div>' +
      actions +
      '</div></div>'
    );
  }

  function renderGroup(items) {
    if (!items.length) return '';
    return '<div class="dash-agenda-group">' + items.map(renderCallSlot).join('') + '</div>';
  }

  function renderTodayCalls() {
    const mount = document.getElementById('today-calls');
    syncSectionTitles();
    if (!mount) return;
    const list = loadRangeCalls().filter(function (call) {
      return callPhase(call) !== 'cancelled';
    });
    if (!list.length) {
      mount.innerHTML = emptyHtml('calls');
      return;
    }
    if (isSingleDayRange()) {
      const sorted = sortTodayCalls(list);
      const next = sorted.filter(function (call) {
        return isOpenPhase(callPhase(call));
      });
      const earlier = sorted.filter(function (call) {
        return !isOpenPhase(callPhase(call));
      });
      mount.innerHTML = renderGroup(next) + renderGroup(earlier);
      return;
    }
    const byDay = {};
    list.forEach(function (call) {
      const key = dayKey(call.day);
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(call);
    });
    const days = Object.keys(byDay).sort().reverse();
    mount.innerHTML = days
      .map(function (day) {
        const items = sortTodayCalls(byDay[day]);
        return (
          '<div class="dash-agenda-group"><div class="calls-day-label">' +
          escapeHtml(callDayLabel(day)) +
          '</div>' +
          items.map(renderCallSlot).join('') +
          '</div>'
        );
      })
      .join('');
  }

  function renderRecentConnects() {
    const mount = document.getElementById('recent-connects');
    syncSectionTitles();
    if (!mount) return;
    const pool = (window.GradRightDB && GradRightDB.connected) || PEOPLE;
    const connected = pool
      .filter(function (p) {
        return p.connected && p.connectedOn && inRange(p.connectedOn);
      })
      .sort(function (a, b) {
        return String(b.connectedOn).localeCompare(String(a.connectedOn));
      });
    if (!isApproved() || !connected.length) {
      mount.innerHTML = emptyHtml('connects');
      return;
    }
    mount.innerHTML = connected
      .map(function (p) {
        return (
          '<button type="button" class="dash-connect' +
          (p.id === selectedConnectId ? ' is-open' : '') +
          '" data-connect="' +
          escapeHtml(p.id) +
          '">' +
          '<span class="avatar sm' +
          (p.amber ? ' amber' : '') +
          '">' +
          escapeHtml(p.initials) +
          '</span>' +
          '<span class="meta"><strong>' +
          escapeHtml(p.name) +
          '</strong><span>Paid ' +
          formatInr(connectAmount(p)) +
          ' · ' +
          escapeHtml(formatWhen(p.connectedOn, TODAY)) +
          '</span></span>' +
          '<a class="icon-btn dash-connect-chat" href="chats.html?id=' +
          encodeURIComponent(p.id) +
          '" title="Chat" aria-label="Chat">' +
          '<span class="material-symbols-rounded" aria-hidden="true">chat</span></a></button>'
        );
      })
      .join('');
    if (selectedConnectId) renderConnectPanel();
  }

  function closeRescheduleMenus(except) {
    document.querySelectorAll('.dash-reschedule-menu').forEach(function (menu) {
      if (menu === except) return;
      menu.hidden = true;
      const btn = menu.parentElement && menu.parentElement.querySelector('[data-call-menu]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  const todayCallsEl = document.getElementById('today-calls');
  const dashWorkspace = document.getElementById('dash-workspace');
  const callPanel = document.getElementById('call-panel');
  const callPanelBody = document.getElementById('call-panel-body');
  const callPanelTitle = document.getElementById('call-panel-title');
  const cancelModal = document.getElementById('cancel-call-modal');
  const cancelNameEl = document.getElementById('cancel-call-name');
  let pendingCancelId = '';
  let selectedCallId = '';
  let selectedConnectId = '';

  function personById(id) {
    return (
      (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[id]) ||
      PEOPLE.filter(function (p) {
        return p.id === id;
      })[0] ||
      null
    );
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
    const methods = ['UPI · Google Pay', 'UPI · PhonePe', 'UPI · Paytm', 'Visa · ••4242', 'Net banking · HDFC'];
    return methods[hashSeed(p.id) % methods.length];
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

  function closeCallPanel() {
    selectedCallId = '';
    selectedConnectId = '';
    if (callPanel) callPanel.hidden = true;
    if (dashWorkspace) dashWorkspace.classList.remove('is-profile-open');
    if (callPanelBody) callPanelBody.innerHTML = '';
    document.querySelectorAll('.dash-connect.is-open').forEach(function (el) {
      el.classList.remove('is-open');
    });
  }

  function renderCallPanel() {
    if (!callPanel || !callPanelBody || !selectedCallId) return;
    const call = callById(selectedCallId);
    if (!call || call.status === 'cancelled') {
      closeCallPanel();
      return;
    }
    callPanel.hidden = false;
    if (dashWorkspace) dashWorkspace.classList.add('is-profile-open');
    if (callPanelTitle) callPanelTitle.textContent = call.name;
    callPanelBody.innerHTML =
      window.GradRightCallPanel && GradRightCallPanel.cardHtml
        ? GradRightCallPanel.cardHtml(call, { from: 'dashboard' })
        : '';
    if (window.GradRightShell) GradRightShell.applyAccess();
  }

  function renderConnectPanel() {
    if (!callPanel || !callPanelBody || !selectedConnectId) return;
    const p = personById(selectedConnectId);
    if (!p || !p.connected) {
      closeCallPanel();
      return;
    }
    const chatHref = 'chats.html?id=' + encodeURIComponent(p.id);
    callPanel.hidden = false;
    if (dashWorkspace) dashWorkspace.classList.add('is-profile-open');
    if (callPanelTitle) callPanelTitle.textContent = 'Payment';
    callPanelBody.innerHTML =
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
      '<div class="txn-amount">' +
      escapeHtml(formatInr(connectAmount(p))) +
      '</div>' +
      '<p class="hint-text">Connect fee</p>' +
      '<div class="call-panel-facts txn-facts">' +
      factRow('Txn ID', txnIdFor(p)) +
      factRow('UTR', txnUtrFor(p)) +
      factRow('Paid', formatWhen(p.connectedOn, TODAY)) +
      factRow('Status', 'Paid') +
      factRow('Method', txnMethodFor(p)) +
      factRow('Source', p.source || p.lastSource || 'Marketplace') +
      factRow('Service', p.service || 'Connect') +
      (p.forWho ? factRow('For', p.forWho) : '') +
      '</div>' +
      '<div class="call-panel-actions">' +
      '<a class="btn btn-primary" href="' +
      chatHref +
      '">Chat</a>' +
      '</div></div>';
    document.querySelectorAll('.dash-connect').forEach(function (el) {
      el.classList.toggle('is-open', el.getAttribute('data-connect') === selectedConnectId);
    });
    if (window.GradRightShell) GradRightShell.applyAccess();
  }

  function openCallPanel(id) {
    var call = callById(id);
    if (!call) return;
    location.href =
      'person.html?id=' +
      encodeURIComponent(call.personId || '') +
      '&call=' +
      encodeURIComponent(id) +
      '&from=dashboard';
  }

  function openConnectPanel(id) {
    location.href = 'person.html?id=' + encodeURIComponent(id) + '&from=dashboard';
  }

  if (callPanel) {
    const closeBtn = document.getElementById('call-panel-close');
    if (closeBtn) closeBtn.addEventListener('click', closeCallPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (selectedCallId || selectedConnectId) && !pendingCancelId) {
        closeCallPanel();
      }
    });
  }

  function closeCancelModal() {
    pendingCancelId = '';
    if (cancelModal) cancelModal.hidden = true;
    document.body.classList.remove('cal-modal-open');
  }

  function openCancelModal(id) {
    const call = callById(id);
    if (!call || !cancelModal) return;
    pendingCancelId = id;
    if (cancelNameEl) cancelNameEl.textContent = call.name;
    closeRescheduleMenus();
    cancelModal.hidden = false;
    document.body.classList.add('cal-modal-open');
  }

  const recentConnectsEl = document.getElementById('recent-connects');
  if (recentConnectsEl) {
    recentConnectsEl.addEventListener('click', function (e) {
      if (e.target.closest('.dash-connect-chat')) return;
      const hit = e.target.closest('[data-connect]');
      if (!hit) return;
      openConnectPanel(hit.getAttribute('data-connect'));
    });
  }

  if (todayCallsEl) {
    todayCallsEl.addEventListener('click', function (e) {
      const joinBtn = e.target.closest('[data-join]');
      if (joinBtn) {
        patchCall(joinBtn.getAttribute('data-join'), { joined: true });
        return;
      }
      const openBtn = e.target.closest('[data-call-menu]');
      if (openBtn) {
        e.stopPropagation();
        const menu = openBtn.parentElement.querySelector('.dash-reschedule-menu');
        const willOpen = menu && menu.hidden;
        closeRescheduleMenus(menu);
        if (menu) menu.hidden = !willOpen;
        openBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        return;
      }
      const cancelBtn = e.target.closest('[data-cancel]');
      if (cancelBtn) {
        e.preventDefault();
        e.stopPropagation();
        openCancelModal(cancelBtn.getAttribute('data-cancel'));
        return;
      }
      const pick = e.target.closest('[data-move]');
      if (pick) {
        const id = pick.getAttribute('data-move');
        const day = pick.getAttribute('data-day');
        const time = pick.getAttribute('data-time');
        const label = pick.textContent.trim();
        if (day === 'tomorrow') {
          patchCall(id, { status: 'moved', movedLabel: label });
        } else {
          patchCall(id, { time: time, status: 'upcoming', movedLabel: '' });
        }
        renderTodayCalls();
        if (selectedCallId) renderCallPanel();
        return;
      }
      if (e.target.closest('a, button, .dash-call-actions')) return;
      const hit = e.target.closest('[data-call]');
      if (hit) openCallPanel(hit.getAttribute('data-call'));
    });
  }

  if (cancelModal) {
    cancelModal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-cancel]')) {
        closeCancelModal();
      }
    });
  }

  const confirmCancel = document.getElementById('confirm-cancel-call');
  if (confirmCancel) {
    confirmCancel.addEventListener('click', function () {
      if (!pendingCancelId) return;
      patchCall(pendingCancelId, { status: 'cancelled' });
      if (selectedCallId === pendingCancelId) closeCallPanel();
      closeCancelModal();
      renderTodayCalls();
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dash-call-actions')) closeRescheduleMenus();
  });

  function tickLiveTimers() {
    const nodes = document.querySelectorAll('[data-live-left]');
    if (!nodes.length) return;
    const list = loadAllCalls();
    let ended = false;
    nodes.forEach(function (el) {
      const id = el.getAttribute('data-live-left');
      const call = list.filter(function (c) {
        return c.id === id;
      })[0];
      if (!call) return;
      if (callPhase(call) !== 'live') {
        if (!(window.GradRightCalls && GradRightCalls.isDemoLive && GradRightCalls.isDemoLive(call))) {
          ended = true;
        }
        return;
      }
      el.textContent = liveLeftText(call);
    });
    if (ended) renderTodayCalls();
  }

  setInterval(tickLiveTimers, 1000);

  render();
  renderTodayCalls();
  renderRecentConnects();
})();
