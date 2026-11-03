/**
 * Reviews: search, date range, rating filter, chart, student feedback list.
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const QUOTES = [
    { service: 'SOP review', text: 'SOP feedback was precise. I finally understood how to sound specific without sounding generic.' },
    { service: 'College shortlisting', text: 'Clear shortlist logic for USA CS. Explained reach vs match in a way my parents understood too.' },
    { service: 'Pathway consult', text: 'Great UK pathway session. Follow-ups in chat could be a bit longer next time.' },
    { service: 'Visa prep', text: 'Mock visa answers got sharper after one session. Funding story still needs one more pass.' },
    { service: 'Essay workshop', text: 'Cut the generic opening and the essay finally sounded like me. Sending draft 2 this week.' },
    { service: 'LOR review', text: 'Professor letter was too vague. Priya marked exactly which projects to add.' },
    { service: 'Scholarship essay', text: 'Split Fulbright vs university aid into two stories. That framing helped a lot.' },
    { service: 'Canada pathway', text: 'Ontario college to university transfer now looks like the strongest route for my portfolio.' },
    { service: 'Germany apps', text: 'TU Munich and RWTH plan is clear. We put language after applications, which reduced the panic.' },
    { service: 'Australia visa', text: 'IELTS 7.5 was enough. Next we map CAS and wait for the offer before biometrics.' },
    { service: 'MBA shortlist', text: 'Warwick and LSE now have a real why-this-school paragraph, not a brochure line.' },
    { service: 'Parent consult', text: 'Helpful for parents too. Budget and intake timing were explained without the jargon.' },
    { service: 'Profile review', text: 'GPA and GRE sat in context. Two safer matches were added and one reach got a stronger SOP angle.' },
    { service: 'Interview prep', text: 'Why Canada not USA still drifted. Recording myself after the mock made the gap obvious.' },
    { service: 'Document check', text: 'Financials and CoE checklist was practical. No fluff, just the next three things to do.' },
  ];

  function buildReviews() {
    const connected = PEOPLE.filter(function (p) {
      return p.connected && p.connectedOn;
    });
    const ratingCycle = [5, 5, 4, 5, 3, 5, 4, 5, 2, 5, 5, 4, 1, 5, 4];
    const out = [];
    connected.forEach(function (p, i) {
      if (i % 3 !== 0) return;
      const seed = hashSeed(p.id);
      const quote = QUOTES[seed % QUOTES.length];
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
      const dayAgo = seed % 6 === 0 ? 32 + (seed % 40) : (i + seed % 3) % 30;
      d.setDate(d.getDate() - dayAgo);
      d.setHours(9 + (seed % 10), (seed % 4) * 12, 0, 0);
      if (d > TODAY) return;
      out.push({
        id: p.id,
        name: p.name,
        initials: p.initials,
        amber: !!p.amber,
        role: p.role === 'parent' ? 'parent' : 'student',
        service: p.service || quote.service,
        text: quote.text,
        rating: ratingCycle[i % ratingCycle.length],
        at: isoStamp(d),
      });
    });
    out.sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    });
    return out;
  }

  const ALL = isApproved() ? buildReviews() : [];

  const BADGES = [
    { icon: 'workspace_premium', label: 'Top mentor', locked: false },
    { icon: 'public', label: 'USA expert', locked: false },
    { icon: 'bolt', label: 'Fast reply', locked: false },
    { icon: 'military_tech', label: '100+ sessions', locked: false },
    { icon: 'flag', label: 'UK specialist', locked: true },
    { icon: 'star', label: '5.0 streak', locked: true },
  ];

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
    ALL.forEach(function (row) {
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

  function ranged() {
    return ALL.filter(function (row) {
      return inRange(row.at);
    });
  }

  function matches(row) {
    if (!inRange(row.at)) return false;
    if (filter !== 'all' && String(row.rating) !== filter) return false;
    if (!query) return true;
    const hay = [row.name, row.text, row.service, row.role].join(' ').toLowerCase();
    return hay.indexOf(query) >= 0;
  }

  function emptyStars() {
    return { reviews: 0, s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 };
  }

  function addStar(bucket, rating) {
    bucket.reviews += 1;
    const key = 's' + rating;
    if (bucket[key] != null) bucket[key] += 1;
  }

  function pointFrom(bucket, date) {
    const b = bucket || emptyStars();
    return {
      date: date,
      reviews: b.reviews,
      s1: b.s1,
      s2: b.s2,
      s3: b.s3,
      s4: b.s4,
      s5: b.s5,
    };
  }

  function buildSeries() {
    const r = currentRange();
    const days = daysIn(r);
    const byDay = {};
    const byHour = {};
    if (isApproved()) {
      ranged().forEach(function (row) {
        const dk = dayKey(row.at);
        if (!byDay[dk]) byDay[dk] = emptyStars();
        addStar(byDay[dk], row.rating);
        const hk = dk + ' ' + String(stampHour(row.at)).padStart(2, '0');
        if (!byHour[hk]) byHour[hk] = emptyStars();
        addStar(byHour[hk], row.rating);
      });
    }
    if (days.length <= 1) {
      const day = days[0] || startOfDay(TODAY);
      const key = iso(day);
      const series = [];
      for (let h = 0; h < 24; h++) {
        const hk = key + ' ' + String(h).padStart(2, '0');
        series.push(
          pointFrom(byHour[hk], new Date(day.getFullYear(), day.getMonth(), day.getDate(), h))
        );
      }
      return { series: series, grain: 'hour' };
    }
    return {
      grain: 'day',
      series: days.map(function (day) {
        return pointFrom(byDay[iso(day)], day);
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
    const maxRev = Math.max(
      1,
      series.reduce(function (n, d) {
        return Math.max(n, d.reviews);
      }, 0)
    );
    const maxFive = Math.max(
      1,
      series.reduce(function (n, d) {
        return Math.max(n, d.s5);
      }, 0)
    );

    function xy(i, value, max) {
      const x = series.length === 1 ? pad.l + innerW / 2 : pad.l + (i / (series.length - 1)) * innerW;
      const y = pad.t + innerH - (value / max) * innerH;
      return { x: x, y: y };
    }

    const visPts = series.map(function (d, i) {
      return xy(i, d.reviews, maxRev);
    });
    const fivePts = series.map(function (d, i) {
      return xy(i, d.s5, maxFive);
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
      pathFrom(fivePts) +
      '"></path>';
    if (grain === 'hour') {
      visPts.forEach(function (p, i) {
        if (!series[i].reviews) return;
        html +=
          '<circle class="analytics-dot" cx="' +
          p.x.toFixed(1) +
          '" cy="' +
          p.y.toFixed(1) +
          '" r="2.4"></circle>';
      });
    }
    svg.innerHTML = html;

    function showTip(i, evt) {
      const d = series[i];
      if (!d) return;
      const label = grain === 'hour' ? formatWhen(d.date, TODAY) : formatShort(d.date);
      tip.hidden = false;
      tip.innerHTML =
        '<strong>' +
        label +
        '</strong>' +
        '<div><span class="dot visitors"></span>Reviews<span>' +
        d.reviews +
        '</span></div>' +
        '<div><span class="dot connections"></span>5 star<span>' +
        d.s5 +
        '</span></div>' +
        '<div><span class="dot connections"></span>4 star<span>' +
        d.s4 +
        '</span></div>' +
        '<div><span class="dot connections"></span>3 star<span>' +
        d.s3 +
        '</span></div>' +
        '<div><span class="dot connections"></span>2 star<span>' +
        d.s2 +
        '</span></div>' +
        '<div><span class="dot connections"></span>1 star<span>' +
        d.s1 +
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

  function starsHtml(n) {
    let html = '<span class="rev-stars" aria-label="' + n + ' out of 5">';
    for (let i = 1; i <= 5; i++) {
      html +=
        '<span class="material-symbols-rounded' +
        (i <= n ? ' is-on' : '') +
        '" aria-hidden="true">star</span>';
    }
    return html + '</span>';
  }

  function renderStats() {
    const rows = ranged();
    const count = rows.length;
    const sum = rows.reduce(function (n, r) {
      return n + r.rating;
    }, 0);
    const avg = count ? sum / count : 0;
    const rec = count ? rows.filter(function (r) { return r.rating >= 4; }).length : 0;
    document.getElementById('stat-rating').textContent = count ? avg.toFixed(1) : '—';
    document.getElementById('stat-rating-hint').textContent = 'From ' + count + ' reviews';
    document.getElementById('stat-count').textContent = String(count);
    document.getElementById('stat-count-hint').textContent =
      rangeKey === 'all' ? 'All time' : 'In this period';
    document.getElementById('stat-recommend').textContent = count ? Math.round((rec / count) * 100) + '%' : '—';
    const built = buildSeries();
    renderChart(built.series, built.grain);
  }

  function renderList() {
    const list = document.getElementById('rev-list');
    const empty = document.getElementById('rev-empty');
    const title = document.getElementById('rev-list-title');
    const visible = ALL.filter(matches);
    title.textContent = 'Student reviews' + (visible.length ? ' · ' + visible.length : '');
    list.innerHTML = '';
    empty.hidden = visible.length > 0;
    visible.forEach(function (row) {
      const el = document.createElement('article');
      el.className = 'rev-card';
      el.innerHTML =
        '<div class="people-who">' +
        '<span class="avatar sm' +
        (row.amber ? ' amber' : '') +
        '">' +
        escapeHtml(row.initials) +
        '</span>' +
        '<div><strong>' +
        escapeHtml(row.name) +
        '</strong><span>' +
        escapeHtml(row.role === 'parent' ? 'Parent' : 'Student') +
        ' · ' +
        escapeHtml(row.service) +
        '</span></div></div>' +
        '<time>' +
        escapeHtml(formatWhen(row.at)) +
        '</time>' +
        starsHtml(row.rating) +
        '<p>' +
        escapeHtml(row.text) +
        '</p>';
      list.appendChild(el);
    });
  }

  function renderBadges() {
    const wrap = document.getElementById('rev-badges');
    wrap.innerHTML = BADGES.map(function (b) {
      return (
        '<div class="rev-badge' +
        (b.locked ? ' is-locked' : '') +
        '"><span class="material-symbols-rounded" aria-hidden="true">' +
        b.icon +
        '</span><strong>' +
        escapeHtml(b.label) +
        '</strong>' +
        (b.locked ? '<small>Locked</small>' : '') +
        '</div>'
      );
    }).join('');
  }

  function presetLabel() {
    if (rangeKey === 'today') return 'Today';
    if (rangeKey === 'yesterday') return 'Yesterday';
    if (rangeKey === '7') return 'Last 7 days';
    if (rangeKey === '30') return 'Last 30 days';
    if (rangeKey === 'all') return 'All time';
    return 'Custom';
  }

  function filterLabel(key) {
    if (key === '5') return '5 stars';
    if (key === '4') return '4 stars';
    if (key === '3') return '3 stars';
    if (key === '2') return '2 stars';
    if (key === '1') return '1 star';
    return 'All ratings';
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
    renderList();
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

  document.getElementById('rev-search').addEventListener('input', function (e) {
    query = e.target.value.trim().toLowerCase();
    renderList();
  });

  renderBadges();
  render();
})();
