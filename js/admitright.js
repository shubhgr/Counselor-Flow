/**
 * AdmitRight — university admissions dashboard (prototype).
 * Students come from the GradRight AI profiling flow. Programs are fixed;
 * each program owns one or more preferences (criteria + a minimum match score),
 * and a preference decides which students the university sees.
 */
(function () {
  var PREFS_KEY = 'admitright_prefs_v4';
  var TODAY = new Date(2026, 9, 6);

  var STAGES = [
    { id: 'recommended', name: 'Recommended', icon: 'auto_awesome', hint: 'AI recommended your program' },
    { id: 'opened', name: 'Program page opened', icon: 'visibility', hint: 'Viewed the program page' },
    { id: 'shortlisted', name: 'Shortlisted', icon: 'bookmark', hint: 'Added to shortlist' },
    { id: 'expert', name: 'Expert assistance', icon: 'support_agent', hint: 'Talked to an expert' },
    { id: 'applied', name: 'Application started', icon: 'edit_document', hint: 'Started the application' },
    { id: 'enrolled', name: 'Enrolled', icon: 'school', hint: 'Confirmed enrolment' },
  ];

  var PROGRAMS = [
    { id: 'btech-cse', name: 'B.Tech Computer Science', fee: 18, stream: 'PCM', seats: 240 },
    { id: 'btech-ai', name: 'B.Tech AI & ML', fee: 20, stream: 'PCM', seats: 120 },
    { id: 'bsc-ds', name: 'B.Sc Data Science', fee: 12, stream: 'PCM', seats: 90 },
    { id: 'bba', name: 'BBA', fee: 10, stream: 'Any', seats: 180 },
    { id: 'bdes', name: 'B.Des', fee: 16, stream: 'Any', seats: 60 },
  ];

  var BOARDS = ['CBSE', 'CISCE', 'UP Board', 'Maharashtra Board', 'Telangana Board', 'Other State Board', 'IB'];
  var STREAMS = ['PCM', 'PCB', 'Commerce', 'Humanities'];
  var ACTIVITIES = [
    'Coding', 'Robotics', 'Olympiads', 'Hackathons', 'Science fairs', 'Debate', 'MUN', 'Quizzing',
    'Music', 'Dance', 'Theatre', 'Art', 'Photography', 'Creative writing', 'Sports', 'Swimming', 'Chess',
    'NCC', 'Volunteering', 'Entrepreneurship',
  ];

  /**
   * National tests in their own units. kind: percentile | score (out of max) | rank (lower is better).
   * Anything not listed here is a custom test and carries its own max.
   */
  var TESTS = [
    { name: 'JEE Main', kind: 'percentile', max: 100, hint: 'NTA percentile' },
    { name: 'JEE Advanced', kind: 'rank', hint: 'CRL rank' },
    { name: 'BITSAT', kind: 'score', max: 390 },
    { name: 'MHT CET', kind: 'percentile', max: 100, hint: 'Percentile' },
    { name: 'CUET UG', kind: 'percentile', max: 100, hint: 'NTA percentile' },
    { name: 'NEET UG', kind: 'score', max: 720 },
    { name: 'IPMAT Indore', kind: 'score', max: 360 },
    { name: 'CLAT', kind: 'score', max: 120 },
    { name: 'UCEED', kind: 'score', max: 300 },
    { name: 'NATA', kind: 'score', max: 200 },
    { name: 'SAT', kind: 'score', max: 1600 },
  ];

  /** Board grades are stored natively and compared as %. CGPA × 9.5 is CBSE's official conversion; IB has none, so points ÷ 45. */
  var SCALES = {
    percent: { label: '%', toPct: function (v) { return v; } },
    cgpa10: { label: 'CGPA', toPct: function (v) { return Math.round(v * 9.5); } },
    ib45: { label: 'IB points', toPct: function (v) { return Math.round((v / 45) * 100); } },
  };

  function testInfo(name) {
    var key = String(name || '').toLowerCase();
    return TESTS.filter(function (t) { return t.name.toLowerCase() === key; })[0] || null;
  }

  function fmtNum(v) {
    return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /** "JEE Main 94.21 %ile", "NEET UG 540/720", "JEE Advanced rank 8,420". */
  function testNote(t) {
    if (t.kind === 'rank') return t.name + ' rank ' + fmtNum(t.value);
    if (t.kind === 'percentile') return t.name + ' ' + fmtNum(t.value) + ' %ile';
    return t.name + ' ' + fmtNum(t.value) + '/' + fmtNum(t.max);
  }

  function markNote(m) {
    if (m.scale === 'percent') return m.board + ' · ' + m.score + '%';
    return m.board + ' · ' + m.score + ' ' + SCALES[m.scale].label + ' (' + m.pct + '%)';
  }

  function makeMark(board, scale, score) {
    var sc = SCALES[scale] ? scale : 'percent';
    var v = Number(score) || 0;
    return { board: board || 'CBSE', scale: sc, score: v, pct: Math.min(100, SCALES[sc].toPct(v)) };
  }

  /** "JEE Main=94.21;NSO Olympiad=41/60" → test list. */
  function parseTests(text) {
    return String(text || '').split(';').map(function (part) {
      var eq = part.indexOf('=');
      if (eq < 1) return null;
      var name = part.slice(0, eq).trim();
      var raw = part.slice(eq + 1).trim();
      var info = testInfo(name);
      var slash = raw.split('/');
      var value = Number(slash[0]);
      if (isNaN(value)) return null;
      if (info) return { name: info.name, kind: info.kind, max: info.max, value: value, custom: false };
      return { name: name, kind: 'score', max: Number(slash[1]) || 100, value: value, custom: true };
    }).filter(Boolean);
  }
  var INTAKES = ['Aug 2027', 'Jan 2027'];
  var CITIES = [
    ['Noida', 5], ['Greater Noida', 15], ['Ghaziabad', 22], ['Delhi', 28], ['Faridabad', 38],
    ['Gurugram', 45], ['Meerut', 72], ['Aligarh', 130], ['Agra', 200], ['Dehradun', 245],
    ['Jaipur', 270], ['Chandigarh', 255], ['Lucknow', 500], ['Kanpur', 450], ['Bhopal', 760], ['Patna', 1000],
  ];
  var FIRST = ['Aarav', 'Ananya', 'Vihaan', 'Diya', 'Arjun', 'Ishita', 'Kabir', 'Meera', 'Rohan', 'Saanvi',
    'Aditya', 'Kavya', 'Reyansh', 'Myra', 'Vivaan', 'Anika', 'Krish', 'Tara', 'Dev', 'Riya',
    'Yash', 'Nisha', 'Aryan', 'Pooja', 'Siddharth', 'Zara', 'Nikhil', 'Aisha', 'Rahul', 'Sneha',
    'Kunal', 'Priya', 'Harsh', 'Avni', 'Manav', 'Ira', 'Tanmay', 'Simran', 'Om', 'Lavanya',
    'Parth', 'Jiya', 'Shaurya', 'Naina'];
  var LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kapoor', 'Mehta', 'Jain', 'Agarwal', 'Reddy', 'Iyer',
    'Malhotra', 'Bansal', 'Chopra', 'Saxena', 'Mishra', 'Yadav', 'Khanna', 'Joshi'];

  var CRITERIA = [
    { id: 'location', label: 'Location', icon: 'location_on' },
    { id: 'test', label: 'Test score', icon: 'quiz' },
    { id: 'class12', label: 'Class 12', icon: 'school' },
    { id: 'class10', label: 'Class 10', icon: 'menu_book' },
    { id: 'budget', label: 'Fee budget', icon: 'payments' },
    { id: 'stream', label: 'Stream', icon: 'science' },
    { id: 'board', label: 'Class 12 board', icon: 'account_balance' },
    { id: 'activities', label: 'Extracurricular', icon: 'sports_soccer' },
    { id: 'intake', label: 'Intake', icon: 'event' },
  ];
  var WEIGHT_LABEL = { 0: 'Off', 1: 'Low', 2: 'Medium', 3: 'High' };

  /* ——— Demo data ——— */

  var seed = 42;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function pick(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }
  function between(a, b) {
    return a + rand() * (b - a);
  }

  function makeStudents() {
    var list = [];
    for (var i = 0; i < 44; i++) {
      var first = FIRST[i % FIRST.length];
      var last = pick(LAST);
      var program = PROGRAMS[[0, 0, 1, 0, 1, 2, 3, 0, 4, 1, 2][i % 11]];
      var city = rand() < 0.6 ? CITIES[Math.floor(rand() * 8)] : pick(CITIES);
      var strong = rand();
      var stream = program.stream === 'PCM' ? (rand() < 0.85 ? 'PCM' : pick(STREAMS)) : pick(STREAMS);
      var c12 = Math.min(99, Math.round(between(62, 98) * (0.9 + strong * 0.1)));
      var c10 = Math.min(99, Math.round(c12 + between(-6, 8)));
      var board = rand() < 0.55 ? 'CBSE' : pick(BOARDS.slice(0, 6));
      var testPct = Math.min(99, Math.round(between(55, 99) * (0.85 + strong * 0.15)));
      var tests = program.stream === 'PCM'
        ? [{ name: 'JEE Main', kind: 'percentile', max: 100, value: testPct, custom: false }]
        : [{ name: 'CUET UG', kind: 'percentile', max: 100, value: testPct, custom: false }];
      var budgetMin = Math.round(between(6, 18));
      var budgetMax = budgetMin + Math.round(between(3, 10));
      var acts = [];
      var nActs = 1 + Math.floor(rand() * 3);
      while (acts.length < nActs) {
        var a = pick(ACTIVITIES);
        if (acts.indexOf(a) === -1) acts.push(a);
      }
      var stageRoll = rand();
      var stage = stageRoll < 0.3 ? 0 : stageRoll < 0.55 ? 1 : stageRoll < 0.73 ? 2 : stageRoll < 0.86 ? 3 : stageRoll < 0.95 ? 4 : 5;
      var daysAgo = Math.floor(between(2, 340));
      var createdOn = new Date(TODAY.getTime() - daysAgo * 86400000 + Math.floor(between(9, 21)) * 3600000);
      var gapMs = (daysAgo * 86400000) / (stage + 2);
      var events = STAGES.map(function (_, k) {
        return k <= stage ? new Date(createdOn.getTime() + 600000 + k * gapMs) : null;
      });
      list.push({
        id: 'GR-' + (24180 + i * 37),
        name: first + ' ' + last,
        initials: first[0] + last[0],
        phone: '+91 9' + String(Math.floor(between(100000000, 999999999))),
        email: (first + '.' + last).toLowerCase() + '@gmail.com',
        city: city[0],
        km: city[1],
        mark10: makeMark(board, 'percent', c10),
        mark12: makeMark(board, 'percent', c12),
        stream: stream,
        tests: tests,
        activities: acts,
        budget: [budgetMin, budgetMax],
        program: program.id,
        intake: rand() < 0.8 ? INTAKES[0] : INTAKES[1],
        stage: stage,
        createdOn: createdOn,
        daysAgo: daysAgo,
        events: events,
        lastActive: events[stage],
      });
    }
    return list.map(withDerived);
  }

  var STUDENTS = makeStudents();
  var STUDENTS_CSV = 'data/admitright-students.csv';

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  var STAGE_COLUMNS = ['recommended_at', 'opened_at', 'shortlisted_at', 'expert_at', 'applied_at', 'enrolled_at'];

  /** "2026-09-12T14:32" or "2026-09-12" → local Date, or null. */
  function parseStamp(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
  }

  function studentFromRow(r) {
    var program = programById(r.program) ? r.program : PROGRAMS[0].id;
    var stage = STAGES.map(function (s) { return s.id; }).indexOf(r.stage);
    var created = parseStamp(r.created_at || r.created_on) || TODAY;
    var events = STAGE_COLUMNS.map(function (c) { return parseStamp(r[c]); });
    var first = r.first_name || '';
    var last = r.last_name || '';
    return {
      id: r.id,
      name: (first + ' ' + last).trim(),
      initials: ((first[0] || '') + (last[0] || '')).toUpperCase(),
      phone: r.phone,
      email: r.email,
      city: r.city,
      km: Number(r.km) || 0,
      mark10: makeMark(r.class10_board, r.class10_scale, r.class10_score),
      mark12: makeMark(r.class12_board, r.class12_scale, r.class12_score),
      stream: r.stream,
      tests: parseTests(r.tests),
      activities: (r.activities || '').split(';').map(function (a) { return a.trim(); }).filter(Boolean),
      budget: [Number(r.budget_min) || 0, Number(r.budget_max) || 0],
      program: program,
      intake: r.intake,
      stage: stage === -1 ? 0 : stage,
      createdOn: created,
      daysAgo: Math.max(0, Math.floor((TODAY - created) / 86400000)),
      events: events,
      lastActive: parseStamp(r.last_active_at),
    };
  }

  function studentsFromCsv(text) {
    var rows = parseCsv(text);
    var head = rows.shift() || [];
    return rows.map(function (cells) {
      var r = {};
      head.forEach(function (h, i) { r[h.trim()] = (cells[i] || '').trim(); });
      return r;
    }).filter(function (r) { return r.id; }).map(studentFromRow).map(withDerived);
  }

  /** Shortcuts used across the dashboard: marks as %, Class 12 board, headline test. */
  function withDerived(s) {
    s.class10 = s.mark10.pct;
    s.class12 = s.mark12.pct;
    s.board = s.mark12.board;
    s.test = s.tests[0] || null;
    return s;
  }

  /* ——— Preferences (per program) ——— */

  var uid = 0;
  function newId() {
    uid += 1;
    return 'pref-' + Date.now().toString(36) + '-' + uid;
  }

  /** A test requirement: national tests take their unit from TESTS; custom tests carry a max. */
  function req(name, min, max) {
    var info = testInfo(name);
    if (info) return { name: info.name, kind: info.kind, max: info.max, min: min, custom: false };
    return { name: name, kind: 'score', max: max || 100, min: min, custom: true };
  }

  var DEFAULT_TESTS = {
    'btech-cse': [req('JEE Main', 85), req('JEE Advanced', 25000), req('BITSAT', 220), req('CUET UG', 85), req('MHT CET', 85)],
    'btech-ai': [req('JEE Main', 85), req('JEE Advanced', 25000), req('BITSAT', 220), req('CUET UG', 85), req('MHT CET', 85)],
    'bsc-ds': [req('JEE Main', 75), req('CUET UG', 80), req('MHT CET', 80)],
    bba: [req('CUET UG', 70), req('IPMAT Indore', 150), req('SAT', 1200)],
    bdes: [req('UCEED', 120), req('NATA', 90), req('CUET UG', 70)],
  };

  function baseCriteria(program) {
    var tech = program.stream === 'PCM';
    return {
      location: { radius: 100, weight: 2 },
      test: { tests: (DEFAULT_TESTS[program.id] || [req('CUET UG', 70)]).map(function (t) { return Object.assign({}, t); }), weight: 3 },
      class12: { min: tech ? 80 : 70, weight: 3 },
      class10: { min: tech ? 75 : 65, weight: 1 },
      budget: { min: Math.max(5, program.fee - 6), max: program.fee + 6, weight: 2 },
      stream: { value: program.stream, weight: tech ? 3 : 0 },
      board: { values: BOARDS.slice(), weight: 1 },
      activities: { values: tech ? ['Coding', 'Robotics'] : ['Debate', 'Art', 'MUN'], weight: 1 },
      intake: { value: 'Aug 2027', weight: 1 },
    };
  }

  function defaultPrefs() {
    var out = {};
    PROGRAMS.forEach(function (p) {
      out[p.id] = [{ id: newId(), name: 'Standard intake', minScore: 80, criteria: baseCriteria(p) }];
    });
    var ncr = baseCriteria(PROGRAMS[0]);
    ncr.location = { radius: 100, weight: 3 };
    ncr.test = { tests: [req('JEE Main', 90), req('JEE Advanced', 15000), req('BITSAT', 250), req('CUET UG', 90)], weight: 3 };
    ncr.class12 = { min: 90, weight: 3 };
    ncr.class10 = { min: 85, weight: 2 };
    ncr.budget = { min: 15, max: 30, weight: 2 };
    ncr.activities = { values: ['Coding', 'Robotics', 'MUN'], weight: 1 };
    out[PROGRAMS[0].id].push({ id: newId(), name: 'Delhi NCR high achievers', minScore: 90, criteria: ncr });
    return out;
  }

  function loadPrefs() {
    var defaults = defaultPrefs();
    try {
      var stored = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (stored) {
        PROGRAMS.forEach(function (p) {
          if (Array.isArray(stored[p.id]) && stored[p.id].length) defaults[p.id] = stored[p.id];
        });
      }
    } catch (e) {}
    return defaults;
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(PREFS));
    } catch (e) {}
  }

  var PREFS = loadPrefs();

  function prefsFor(programId) {
    return PREFS[programId] || [];
  }

  function findPref(programId, prefId) {
    return prefsFor(programId).filter(function (p) { return p.id === prefId; })[0] || prefsFor(programId)[0];
  }

  /* ——— Scoring ——— */

  function clamp01(n) {
    return Math.max(0, Math.min(1, n));
  }

  /** 1 when the requirement is met, partial credit when close. Ranks are lower-is-better. */
  function testCredit(t, rq) {
    if (rq.kind === 'rank') {
      if (t.value <= rq.min) return 1;
      return clamp01(0.8 - (t.value - rq.min) / rq.min);
    }
    if (t.value >= rq.min) return 1;
    var gapPoints = ((rq.min - t.value) / (rq.max || 100)) * 100;
    return clamp01(0.8 - gapPoints / 15);
  }

  function reqLabel(rq) {
    if (rq.kind === 'rank') return rq.name + ' rank ≤ ' + fmtNum(rq.min);
    if (rq.kind === 'percentile') return rq.name + ' ' + fmtNum(rq.min) + '+ %ile';
    return rq.name + ' ' + fmtNum(rq.min) + '+/' + fmtNum(rq.max);
  }

  function criterionScore(id, s, p) {
    switch (id) {
      case 'location':
        if (s.km <= p.radius) return { v: 1, note: s.km + ' km away' };
        return { v: clamp01(0.7 - (s.km - p.radius) / p.radius), note: s.km + ' km away' };
      case 'test': {
        var best = null;
        p.tests.forEach(function (rq) {
          s.tests.forEach(function (t) {
            if (t.name.toLowerCase() !== rq.name.toLowerCase()) return;
            var v = testCredit(t, rq);
            if (!best || v > best.v) best = { v: v, note: testNote(t) };
          });
        });
        if (best) return best;
        return { v: 0, note: s.tests.length ? 'No accepted test' : 'No test' };
      }
      case 'class12':
        return { v: s.class12 >= p.min ? 1 : clamp01(0.8 - (p.min - s.class12) / 12), note: markNote(s.mark12) };
      case 'class10':
        return { v: s.class10 >= p.min ? 1 : clamp01(0.8 - (p.min - s.class10) / 12), note: markNote(s.mark10) };
      case 'budget': {
        var note = '₹' + s.budget[0] + '–' + s.budget[1] + 'L';
        if (s.budget[1] >= p.min && s.budget[0] <= p.max) return { v: 1, note: note };
        var gap = s.budget[1] < p.min ? p.min - s.budget[1] : s.budget[0] - p.max;
        return { v: clamp01(0.7 - gap / 8), note: note };
      }
      case 'stream':
        return { v: p.value === 'Any' || s.stream === p.value ? 1 : 0, note: s.stream };
      case 'board':
        return { v: p.values.indexOf(s.board) !== -1 ? 1 : 0, note: s.board };
      case 'activities': {
        if (!p.values.length) return { v: 1, note: s.activities.join(', ') };
        var wanted = p.values.map(function (a) { return a.toLowerCase(); });
        var hit = s.activities.filter(function (a) { return wanted.indexOf(a.toLowerCase()) !== -1; }).length;
        return { v: hit ? clamp01(0.6 + hit * 0.4) : 0.2, note: s.activities.join(', ') };
      }
      case 'intake':
        return { v: s.intake === p.value ? 1 : 0.4, note: s.intake };
    }
    return { v: 0, note: '' };
  }

  function scoreAgainst(s, pref) {
    var total = 0;
    var weight = 0;
    var parts = CRITERIA.map(function (c) {
      var p = pref.criteria[c.id];
      var r = criterionScore(c.id, s, p);
      if (p.weight > 0) {
        total += r.v * p.weight;
        weight += p.weight;
      }
      return { id: c.id, label: c.label, v: r.v, note: r.note, weight: p.weight };
    });
    return { score: weight ? Math.round((total / weight) * 100) : 0, parts: parts };
  }

  /* ——— State ——— */

  var state = {
    view: 'dashboard',
    program: 'all',
    prefId: null,
    audience: 'matched',
    stage: null,
    layout: 'board',
    query: '',
    range: 0,
    ppProgram: PROGRAMS[0].id,
  };

  function programById(id) {
    return PROGRAMS.filter(function (p) { return p.id === id; })[0];
  }

  /** The preference a student is judged by in the current dashboard context. */
  function activePrefFor(s) {
    if (state.program !== 'all') return findPref(state.program, state.prefId);
    return prefsFor(s.program)[0];
  }

  function rescore() {
    STUDENTS.forEach(function (s) {
      var pref = activePrefFor(s);
      var r = scoreAgainst(s, pref);
      s.pref = pref;
      s.score = r.score;
      s.parts = r.parts;
      s.bucket = s.score >= pref.minScore ? 0 : s.score >= pref.minScore - 20 ? 1 : 2;
    });
  }

  /** range 0 means all time. */
  function inRange(s) {
    return !state.range || s.daysAgo <= state.range;
  }

  function baseSet(everyone) {
    return STUDENTS.filter(function (s) {
      if (!inRange(s)) return false;
      if (state.program !== 'all' && s.program !== state.program) return false;
      if (!everyone && state.audience === 'matched' && s.bucket !== 0) return false;
      return true;
    });
  }

  function visibleSet(everyone) {
    var q = state.query.trim().toLowerCase();
    return baseSet(everyone)
      .filter(function (s) {
        if (state.stage !== null && s.stage < state.stage) return false;
        if (!q) return true;
        return (s.name + ' ' + s.id + ' ' + s.city).toLowerCase().indexOf(q) !== -1;
      })
      .sort(function (a, b) { return b.score - a.score; });
  }

  /* ——— Helpers ——— */

  function $(id) {
    return document.getElementById(id);
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ico(name) {
    return '<span class="material-symbols-rounded" aria-hidden="true">' + name + '</span>';
  }

  function scoreClass(s) {
    return s.bucket === 0 ? 'hi' : s.bucket === 1 ? 'mid' : 'lo';
  }

  function scoreColor(s) {
    return s.bucket === 0 ? 'var(--success)' : s.bucket === 1 ? 'var(--yellow-600)' : 'var(--danger)';
  }

  function fmtDate(d) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
  }

  function fmtTime(d) {
    var h = d.getHours();
    var mm = String(d.getMinutes()).padStart(2, '0');
    return (h % 12 || 12) + ':' + mm + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  function fmtDateTime(d) {
    return d ? fmtDate(d) + ', ' + fmtTime(d) : '';
  }

  function avg(list, fn) {
    if (!list.length) return 0;
    return list.reduce(function (sum, s) { return sum + fn(s); }, 0) / list.length;
  }

  var toastTimer;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2400);
  }

  function criterionLine(id, p) {
    switch (id) {
      case 'location': return 'Within ' + p.radius + ' km';
      case 'test':
        if (!p.tests.length) return 'No tests';
        return p.tests.slice(0, 2).map(reqLabel).join(' or ') + (p.tests.length > 2 ? ' +' + (p.tests.length - 2) + ' more' : '');
      case 'class12': return p.min + '%+';
      case 'class10': return p.min + '%+';
      case 'budget': return '₹' + p.min + '–' + p.max + 'L';
      case 'stream': return p.value === 'Any' ? 'Any stream' : p.value;
      case 'board': return p.values.length === BOARDS.length ? 'All boards' : p.values.join(', ') || 'None';
      case 'activities': return p.values.join(', ') || 'Any';
      case 'intake': return p.value;
    }
    return '';
  }

  /** How many students in a program clear a preference's minimum score. */
  function matchCount(programId, pref) {
    return STUDENTS.filter(function (s) {
      return s.program === programId && scoreAgainst(s, pref).score >= pref.minScore;
    }).length;
  }

  /* ——— Dashboard: funnel ——— */

  /** Funnel cards count every student; the matched share is shown inside each card. */
  function renderFunnel() {
    var set = baseSet(true);
    var counts = STAGES.map(function (_, i) {
      return set.filter(function (s) { return s.stage >= i; }).length;
    });
    var matched = STAGES.map(function (_, i) {
      return set.filter(function (s) { return s.stage >= i && s.bucket === 0; }).length;
    });
    var top = counts[0] || 1;
    $('funnel-grid').innerHTML = STAGES.map(function (st, i) {
      var prev = i ? counts[i - 1] : counts[0];
      var conv = prev ? Math.round((counts[i] / prev) * 100) : 0;
      var matchPct = counts[i] ? Math.round((matched[i] / counts[i]) * 100) : 0;
      return (
        '<button type="button" class="ar-stage' + (state.stage === i ? ' active' : '') + '" data-stage="' + i + '" title="' + esc(st.hint) + '">' +
        '<div class="ar-stage-top"><span class="ar-stage-name">' + esc(st.name) + '</span>' +
        '<span class="ar-stage-ico">' + ico(st.icon) + '</span></div>' +
        '<strong>' + counts[i] + '</strong>' +
        '<span class="ar-stage-hint">' + (i ? '<b>' + conv + '%</b> of previous' : 'Students in funnel') + '</span>' +
        '<span class="ar-stage-match"><i></i><b>' + matched[i] + '</b> match preference</span>' +
        '<div class="ar-stage-bar"><i style="width:' + Math.round((counts[i] / top) * 100) + '%"><span style="width:' + matchPct + '%"></span></i></div>' +
        '</button>'
      );
    }).join('');
  }

  /* ——— Dashboard: insights ——— */

  function prefRows(pref, limit) {
    return CRITERIA.filter(function (c) { return pref.criteria[c.id].weight > 0; })
      .slice(0, limit || CRITERIA.length)
      .map(function (c) {
        var w = pref.criteria[c.id].weight;
        return (
          '<div class="ar-pref-row"><span>' + esc(c.label) + '</span><strong>' + esc(criterionLine(c.id, pref.criteria[c.id])) +
          '<i class="ar-weight w' + w + '">' + WEIGHT_LABEL[w] + '</i></strong></div>'
        );
      }).join('');
  }

  function renderPrefPanel() {
    var edit = $('pref-panel-edit');
    if (state.program === 'all') {
      $('pref-panel-title').textContent = 'Preferences';
      edit.textContent = 'Manage';
      $('prefs-summary').innerHTML =
        '<p class="panel-lead">All programs view. Each student is scored with the first preference of their program.</p>' +
        '<div class="ar-pref-list">' + PROGRAMS.map(function (p) {
          var pref = prefsFor(p.id)[0];
          return '<div class="ar-pref-row"><span>' + esc(p.name) + '</span><strong>' + esc(pref.name) +
            '<i class="ar-weight w3">' + pref.minScore + '%+</i></strong></div>';
        }).join('') + '</div>';
      return;
    }
    var pref = findPref(state.program, state.prefId);
    $('pref-panel-title').textContent = pref.name;
    edit.textContent = 'Edit';
    $('prefs-summary').innerHTML =
      '<div class="ar-threshold"><span>Show students scoring</span><strong>' + pref.minScore + '%+</strong></div>' +
      '<div class="ar-pref-list">' + prefRows(pref, 6) + '</div>';
  }

  /** The best accepted test if there is one, otherwise the first test taken. */
  function headlineTest(s) {
    var part = (s.parts || []).filter(function (p) { return p.id === 'test'; })[0];
    if (part && part.v > 0) return part.note;
    return s.test ? testNote(s.test) : 'No test';
  }

  function hasAcceptedTest(s) {
    var part = (s.parts || []).filter(function (p) { return p.id === 'test'; })[0];
    return !!part && part.v > 0;
  }

  function renderAverages() {
    var set = baseSet();
    $('avg-count').textContent = set.length + ' students';
    var budgetAvg = avg(set, function (s) { return (s.budget[0] + s.budget[1]) / 2; });
    var items = [
      ['Class 12', avg(set, function (s) { return s.class12; }).toFixed(1) + '%'],
      ['Class 10', avg(set, function (s) { return s.class10; }).toFixed(1) + '%'],
      ['Has an accepted test', set.length ? Math.round((set.filter(hasAcceptedTest).length / set.length) * 100) + '%' : '—'],
      ['Fee budget', '₹' + budgetAvg.toFixed(1) + 'L'],
      ['Within 100 km', set.length ? Math.round((set.filter(function (s) { return s.km <= 100; }).length / set.length) * 100) + '%' : '—'],
      ['Avg match', avg(set, function (s) { return s.score; }).toFixed(0) + '%'],
    ];
    $('avg-profile').innerHTML = items.map(function (it) {
      return '<div><span>' + it[0] + '</span><strong>' + (set.length ? it[1] : '—') + '</strong></div>';
    }).join('');
  }

  function renderProgramBars() {
    var rows = PROGRAMS.map(function (p) {
      var pref = prefsFor(p.id)[0];
      var n = STUDENTS.filter(function (s) {
        if (s.program !== p.id || !inRange(s)) return false;
        return state.audience === 'all' || scoreAgainst(s, pref).score >= pref.minScore;
      }).length;
      return { p: p, n: n };
    }).sort(function (a, b) { return b.n - a.n; });
    var max = rows[0] ? rows[0].n || 1 : 1;
    $('program-bars').innerHTML = rows.map(function (r) {
      return (
        '<button type="button" class="ar-bar' + (state.program === r.p.id ? ' active' : '') + '" data-program="' + r.p.id + '">' +
        '<span>' + esc(r.p.name) + '</span><b>' + r.n + '</b>' +
        '<div class="ar-bar-track"><i style="width:' + Math.round((r.n / max) * 100) + '%"></i></div></button>'
      );
    }).join('');
  }

  /* ——— Dashboard: students ——— */

  function attrChips(s, limit) {
    return s.parts
      .filter(function (p) { return p.weight > 0; })
      .sort(function (a, b) { return b.weight - a.weight; })
      .slice(0, limit)
      .map(function (p) {
        var cls = p.v >= 0.99 ? '' : p.v >= 0.5 ? ' partial' : ' miss';
        var icon = p.v >= 0.99 ? 'check' : p.v >= 0.5 ? 'remove' : 'close';
        return '<span class="ar-attr' + cls + '">' + ico(icon) + esc(p.label) + '</span>';
      }).join('');
  }

  function stagePill(s) {
    var st = STAGES[s.stage];
    return '<span class="ar-stage-pill">' + ico(st.icon) + esc(st.name) + '</span>';
  }

  function cardHtml(s) {
    return (
      '<button type="button" class="ar-card" data-student="' + s.id + '">' +
      '<div class="ar-card-top"><div class="avatar">' + esc(s.initials) + '</div>' +
      '<div class="ar-card-who"><strong>' + esc(s.name) + '</strong><small>' + esc(s.id) + ' · ' + esc(s.city) + '</small></div>' +
      '<div class="ar-score ' + scoreClass(s) + '">' + s.score + '<small>%</small></div></div>' +
      '<div class="ar-attrs">' + attrChips(s, 4) + '</div>' +
      '<div class="ar-card-meta"><span>' + esc(programById(s.program).name) + '</span>' + stagePill(s) + '</div>' +
      '</button>'
    );
  }

  /** Matches = at or above the preference minimum, Close = up to 20 points below, Below = further below. */
  function bucketDefs() {
    var min;
    if (state.program !== 'all') min = findPref(state.program, state.prefId).minScore;
    else {
      var mins = PROGRAMS.map(function (p) { return prefsFor(p.id)[0].minScore; });
      if (mins.every(function (m) { return m === mins[0]; })) min = mins[0];
    }
    if (min == null) {
      return [
        { name: 'Matches preference', range: 'At or above its minimum', color: 'var(--green-500)' },
        { name: 'Close', range: 'Up to 20 points below', color: 'var(--yellow-500)' },
        { name: 'Below', range: 'More than 20 points below', color: 'var(--red-500)' },
      ];
    }
    return [
      { name: 'Matches preference', range: min + '–100%', color: 'var(--green-500)' },
      { name: 'Close', range: Math.max(0, min - 20) + '–' + (min - 1) + '%', color: 'var(--yellow-500)' },
      { name: 'Below', range: 'Under ' + Math.max(0, min - 20) + '%', color: 'var(--red-500)' },
    ];
  }

  var BOARD_LIMIT = 200;
  var TABLE_LIMIT = 300;

  /** The board always shows every match level; the audience toggle only narrows the funnel, stats and table. */
  function renderBoard() {
    var list = visibleSet(true);
    $('board').innerHTML = bucketDefs().map(function (b, i) {
      var items = list.filter(function (s) { return s.bucket === i; });
      var body;
      if (items.length) {
        body = items.slice(0, BOARD_LIMIT).map(cardHtml).join('');
        if (items.length > BOARD_LIMIT) body += '<div class="ar-col-empty">Showing top ' + BOARD_LIMIT + ' of ' + items.length + '. Search or switch to the table to see more.</div>';
      }
      else body = '<div class="ar-col-empty">No students here yet.</div>';
      return (
        '<div class="ar-col"><div class="ar-col-head"><h3><i style="background:' + b.color + '"></i>' + b.name +
        '</h3><small>' + b.range + ' · ' + items.length + '</small></div>' +
        '<div class="ar-col-list gr-scroll">' + body + '</div></div>'
      );
    }).join('');
  }

  function renderTable(list) {
    if (!list.length) {
      $('table').innerHTML = '<div class="ar-col-empty">No students match these filters.</div>';
      return;
    }
    $('table').innerHTML =
      '<table class="ar-table"><thead><tr>' +
      '<th>Student</th><th>GR ID</th><th>Program</th><th>Match</th><th>Stage</th><th>Class 12</th><th>Test</th><th>Budget</th><th>Location</th><th>Intake</th>' +
      '</tr></thead><tbody>' +
      list.slice(0, TABLE_LIMIT).map(function (s) {
        return (
          '<tr data-student="' + s.id + '">' +
          '<td class="ar-name">' + esc(s.name) + '</td>' +
          '<td>' + esc(s.id) + '</td>' +
          '<td>' + esc(programById(s.program).name) + '</td>' +
          '<td><span class="ar-score ' + scoreClass(s) + '">' + s.score + '<small>%</small></span></td>' +
          '<td>' + stagePill(s) + '</td>' +
          '<td>' + s.class12 + '%</td>' +
          '<td>' + esc(headlineTest(s)) + '</td>' +
          '<td>₹' + s.budget[0] + '–' + s.budget[1] + 'L</td>' +
          '<td>' + esc(s.city) + ' · ' + s.km + ' km</td>' +
          '<td>' + esc(s.intake) + '</td>' +
          '</tr>'
        );
      }).join('') +
      '</tbody></table>' +
      (list.length > TABLE_LIMIT ? '<div class="ar-col-empty">Showing top ' + TABLE_LIMIT + ' of ' + list.length + '. Use search or Export to get everyone.</div>' : '');
  }

  function renderFilters(list) {
    var chips = [];
    if (state.stage !== null) chips.push('<button type="button" class="ar-filter-chip" data-clear="stage">Reached: ' + esc(STAGES[state.stage].name) + ico('close') + '</button>');
    if (state.program !== 'all') chips.push('<button type="button" class="ar-filter-chip" data-clear="program">' + esc(programById(state.program).name) + ico('close') + '</button>');
    $('active-filters').innerHTML = chips.join('');
    $('active-filters').hidden = !chips.length;

    var n = list.length + ' student' + (list.length === 1 ? '' : 's');
    var lead;
    if (state.program === 'all') {
      lead = state.audience === 'matched' ? n + ' clear their program’s preference.' : n + ' across all match levels.';
    } else {
      var pref = findPref(state.program, state.prefId);
      lead = state.audience === 'matched'
        ? n + ' score ' + pref.minScore + '%+ on “' + pref.name + '”.'
        : n + ' scored against “' + pref.name + '”.';
    }
    $('students-lead').textContent = lead;
  }

  function renderStudents() {
    var list = visibleSet();
    renderFilters(list);
    $('board').hidden = state.layout !== 'board';
    $('table').hidden = state.layout !== 'table';
    if (state.layout === 'board') renderBoard();
    else renderTable(list);
  }

  function renderTopMenus() {
    var items = [{ id: 'all', name: 'All programs' }].concat(PROGRAMS);
    $('program-menu').innerHTML = items.map(function (p) {
      var n = p.id === 'all' ? STUDENTS.length : STUDENTS.filter(function (s) { return s.program === p.id; }).length;
      return '<button type="button" class="ar-menu-item' + (state.program === p.id ? ' active' : '') + '" data-program="' + p.id + '">' +
        esc(p.name) + '<small>' + n + '</small></button>';
    }).join('');
    $('program-label').textContent = state.program === 'all' ? 'All programs' : programById(state.program).name;

    var prefBtn = $('pref-btn');
    if (state.program === 'all') {
      prefBtn.disabled = true;
      prefBtn.title = 'Pick a program to choose a preference';
      $('pref-label').textContent = 'Program default';
      $('pref-menu').innerHTML = '';
      return;
    }
    prefBtn.disabled = false;
    prefBtn.title = '';
    var active = findPref(state.program, state.prefId);
    $('pref-label').textContent = active.name;
    $('pref-menu').innerHTML =
      prefsFor(state.program).map(function (p) {
        return '<button type="button" class="ar-menu-item' + (p.id === active.id ? ' active' : '') + '" data-pref="' + p.id + '">' +
          esc(p.name) + '<small>' + p.minScore + '%+</small></button>';
      }).join('') +
      '<button type="button" class="ar-menu-item ar-menu-add" data-create-pref="' + state.program + '">' + ico('add') + 'Create preference</button>';
  }

  function renderDashboard() {
    rescore();
    renderTopMenus();
    renderFunnel();
    renderPrefPanel();
    renderAverages();
    renderProgramBars();
    renderStudents();
  }

  /* ——— Programs & preferences view ——— */

  function renderPrograms() {
    $('pp-program-count').textContent = PROGRAMS.length;
    $('pp-program-list').innerHTML = PROGRAMS.map(function (p) {
      var n = STUDENTS.filter(function (s) { return s.program === p.id; }).length;
      var k = prefsFor(p.id).length;
      return (
        '<button type="button" class="ar-pp-program' + (state.ppProgram === p.id ? ' active' : '') + '" data-pp-program="' + p.id + '">' +
        '<strong>' + esc(p.name) + '</strong>' +
        '<small>' + n + ' students · ' + k + ' preference' + (k === 1 ? '' : 's') + '</small></button>'
      );
    }).join('');

    var program = programById(state.ppProgram);
    var total = STUDENTS.filter(function (s) { return s.program === program.id; }).length;
    $('pp-program-title').textContent = program.name;
    $('pp-program-meta').textContent =
      '₹' + program.fee + 'L fee · ' + (program.stream === 'Any' ? 'Any stream' : program.stream) + ' · ' +
      program.seats + ' seats · ' + total + ' students interested';

    var prefs = prefsFor(program.id);
    $('pp-cards').innerHTML = prefs.map(function (pref, i) {
      var n = matchCount(program.id, pref);
      var chips = CRITERIA.filter(function (c) { return pref.criteria[c.id].weight > 0; }).map(function (c) {
        return '<span class="ar-crit">' + ico(c.icon) + esc(criterionLine(c.id, pref.criteria[c.id])) + '</span>';
      }).join('');
      return (
        '<article class="panel ar-pp-card">' +
        '<div class="ar-pp-card-head"><div><h3>' + esc(pref.name) + '</h3>' +
        (i === 0 ? '<span class="ar-default">Default for this program</span>' : '') + '</div>' +
        '<div class="ar-pp-score"><span>Show students scoring</span><strong>' + pref.minScore + '%+</strong></div></div>' +
        '<div class="ar-crits">' + chips + '</div>' +
        '<div class="ar-pp-card-foot"><span><b>' + n + '</b> of ' + total + ' students match</span>' +
        '<div class="ar-pp-actions">' +
        (prefs.length > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-delete-pref="' + pref.id + '">Delete</button>' : '') +
        '<button type="button" class="btn btn-secondary btn-sm" data-edit-pref="' + pref.id + '">Edit</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-use-pref="' + pref.id + '">View students</button>' +
        '</div></div></article>'
      );
    }).join('');
  }

  function setView(view) {
    state.view = view;
    $('view-dashboard').hidden = view !== 'dashboard';
    $('view-programs').hidden = view !== 'programs';
    document.querySelectorAll('.ar-rail-item[data-go]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-go') === view);
    });
    if (view === 'programs') renderPrograms();
    else renderDashboard();
    window.scrollTo(0, 0);
  }

  /* ——— Drawer ——— */

  function openDrawer(title, body, foot) {
    $('drawer-title').textContent = title;
    $('drawer-body').innerHTML = body;
    $('drawer-foot').innerHTML = foot || '';
    $('drawer-foot').hidden = !foot;
    $('drawer').hidden = false;
    $('drawer-body').scrollTop = 0;
  }

  function closeDrawer() {
    $('drawer').hidden = true;
    editing = null;
  }

  function aiSummary(s) {
    var program = programById(s.program);
    var strengths = s.parts.filter(function (p) { return p.weight > 0 && p.v >= 0.99; }).map(function (p) { return p.label.toLowerCase(); });
    var gaps = s.parts.filter(function (p) { return p.weight > 0 && p.v < 0.5; }).map(function (p) { return p.label.toLowerCase(); });
    var next = [
      'Send a personalised program brochure to get them to open the program page.',
      'Share placement stats and a campus video. They are browsing but have not shortlisted.',
      'Offer a 1:1 expert call while the program is on their shortlist.',
      'Nudge them to start the application with a fee waiver or deadline reminder.',
      'Help them finish the application and follow up on missing documents.',
      'Enrolled. Invite them to the incoming batch community.',
    ][s.stage];
    return (
      esc(s.stream) + ' student from ' + esc(s.city) + ' (' + s.km + ' km) with ' + s.class12 + '% in Class 12 and ' +
      esc(headlineTest(s)) + '. Budget ₹' + s.budget[0] + '–' + s.budget[1] + 'L for ' +
      esc(program.name) + ' (₹' + program.fee + 'L). Interested in ' + esc(s.activities.join(', ')) + '. ' +
      (strengths.length ? 'Strong on ' + esc(strengths.slice(0, 3).join(', ')) + '. ' : '') +
      (gaps.length ? 'Gaps: ' + esc(gaps.join(', ')) + '. ' : 'No major gaps against this preference. ') +
      '<br><br><strong>Next best step:</strong> ' + next
    );
  }

  function openStudent(id) {
    var s = STUDENTS.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var program = programById(s.program);

    var events = s.events || [];

    function logRow(cls, icon, label, when, note) {
      return (
        '<div class="ar-step' + cls + '"><i>' + (icon ? ico(icon) : '') + '</i>' +
        '<span class="ar-step-label">' + esc(label) + (note ? '<em>' + esc(note) + '</em>' : '') + '</span>' +
        '<time>' + (when ? esc(fmtDateTime(when)) : 'Not yet') + '</time></div>'
      );
    }

    var journey =
      logRow(' done', 'person_add', 'Profile created on GradRight', s.createdOn) +
      STAGES.map(function (st, i) {
        if (i > s.stage) return logRow(' todo', '', st.name, null);
        return logRow(i === s.stage ? ' done current' : ' done', 'check', st.name, events[i], i === s.stage ? 'Current stage' : '');
      }).join('');

    var matches = s.parts.map(function (p) {
      var pct = Math.round(p.v * 100);
      var color = p.weight === 0 ? 'var(--gray-200)' : pct >= 99 ? 'var(--green-500)' : pct >= 50 ? 'var(--yellow-500)' : 'var(--red-500)';
      return (
        '<div class="ar-match-row"><span>' + esc(p.label) + (p.weight ? '' : ' · off') + '</span>' +
        '<div class="ar-mini-track"><i style="width:' + pct + '%;background:' + color + '"></i></div>' +
        '<em>' + esc(p.note) + '</em></div>'
      );
    }).join('');

    var contact =
      '<div class="ar-private">' +
      '<div><span>Contact</span><strong class="ar-blur" aria-hidden="true">+91 98765 43210</strong></div>' +
      '<div><span>Email</span><strong class="ar-blur" aria-hidden="true">student.name@gmail.com</strong></div>' +
      '<p>' + ico('lock') + 'Contact details stay private. Use Reach out to connect through AdmitRight.</p>' +
      '</div>';

    var facts = [
      ['Location', s.city + ' · ' + s.km + ' km'], ['Stream', s.stream],
      ['Class 10', markNote(s.mark10)], ['Class 12', markNote(s.mark12)],
      ['Fee budget', '₹' + s.budget[0] + '–' + s.budget[1] + 'L'], ['Program (AOI)', program.name],
      ['Intake', s.intake], ['GR ID', s.id],
    ].map(function (f) {
      return '<div><span>' + f[0] + '</span><strong>' + esc(f[1]) + '</strong></div>';
    }).join('');

    var accepted = (s.pref.criteria.test.tests || []).map(function (rq) { return rq.name.toLowerCase(); });
    var tests = s.tests.length
      ? s.tests.map(function (t) {
        var ok = accepted.indexOf(t.name.toLowerCase()) !== -1;
        return '<div class="ar-test-row"><span>' + esc(t.name) +
          (t.custom ? '<i class="ar-tag">Custom</i>' : '') + '</span>' +
          '<strong>' + esc(testNote(t).slice(t.name.length + 1)) + '</strong>' +
          '<em class="' + (ok ? 'ok' : '') + '">' + (ok ? 'Accepted' : 'Not in preference') + '</em></div>';
      }).join('')
      : '<p class="ar-muted">No tests added.</p>';

    var activities = s.activities.map(function (a) {
      var custom = ACTIVITIES.map(function (x) { return x.toLowerCase(); }).indexOf(a.toLowerCase()) === -1;
      return '<span class="pill">' + esc(a) + (custom ? ' · custom' : '') + '</span>';
    }).join('');

    var verdict = s.bucket === 0
      ? 'Clears “' + esc(s.pref.name) + '” (needs ' + s.pref.minScore + '%)'
      : 'Below “' + esc(s.pref.name) + '” (needs ' + s.pref.minScore + '%)';

    var body =
      '<div class="ar-hero"><div class="avatar lg">' + esc(s.initials) + '</div>' +
      '<div class="ar-hero-who"><h3>' + esc(s.name) + '</h3><p>' + esc(s.id) + ' · ' + esc(program.name) + '</p>' +
      '<p style="margin-top:0.35rem">' + stagePill(s) + '</p></div>' +
      '<div class="ar-ring" style="--p:' + s.score + ';--c:' + scoreColor(s) + '"><span>' + s.score + '%</span></div></div>' +
      '<div class="ar-ai"><h4>' + ico('auto_awesome') + 'AI summary</h4>' + aiSummary(s) + '</div>' +
      '<div class="ar-block"><h4>Activity log</h4><div class="ar-journey">' + journey + '</div></div>' +
      '<div class="ar-block"><h4>Preference match · ' + verdict + '</h4>' + matches + '</div>' +
      '<div class="ar-block"><h4>Profile</h4>' + contact + '<div class="ar-facts">' + facts + '</div></div>' +
      '<div class="ar-block"><h4>Test scores</h4>' + tests + '</div>' +
      '<div class="ar-block"><h4>Extracurricular</h4><div class="ar-tags">' + activities + '</div></div>';

    openDrawer(
      'Student profile',
      body,
      '<button type="button" class="btn btn-secondary btn-sm" data-action="shortlist">Save to list</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="reach">Reach out</button>'
    );
  }

  /* ——— Preference editor ——— */

  var editing = null; // { programId, prefId|null, draft, customTest }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function weightSelect(cid, w) {
    return '<select class="ar-weight-select" data-weight="' + cid + '" aria-label="How much this counts">' +
      [3, 2, 1, 0].map(function (n) {
        return '<option value="' + n + '"' + (n === w ? ' selected' : '') + '>' + WEIGHT_LABEL[n] + '</option>';
      }).join('') + '</select>';
  }

  function checks(name, all, selected) {
    return '<div class="ar-checks">' + all.map(function (v) {
      return '<label class="ar-check"><input type="checkbox" name="' + name + '" value="' + esc(v) + '"' +
        (selected.indexOf(v) !== -1 ? ' checked' : '') + ' />' + esc(v) + '</label>';
    }).join('') + '</div>';
  }

  function unitSuffix(rq) {
    if (rq.kind === 'rank') return 'rank or better';
    if (rq.kind === 'percentile') return 'percentile+';
    return 'out of ' + fmtNum(rq.max);
  }

  function testsEditor(c) {
    var rows = c.test.tests.map(function (rq, i) {
      var info = testInfo(rq.name);
      return (
        '<div class="ar-req">' +
        '<div class="ar-req-name"><strong>' + esc(rq.name) + '</strong>' +
        '<small>' + (rq.custom ? '<i class="ar-tag">Custom</i>' : esc((info && info.hint) || (rq.kind === 'score' ? 'Score' : ''))) + '</small></div>' +
        '<label class="ar-req-min"><input type="number" min="0"' + (rq.kind === 'score' ? ' max="' + rq.max + '"' : '') +
        ' step="any" data-test-min="' + i + '" value="' + rq.min + '" aria-label="' + esc(rq.name) + ' minimum" />' +
        '<span>' + unitSuffix(rq) + '</span></label>' +
        '<button type="button" class="ar-icon-btn" data-remove-test="' + i + '" aria-label="Remove ' + esc(rq.name) + '">' + ico('close') + '</button>' +
        '</div>'
      );
    }).join('');
    var taken = c.test.tests.map(function (rq) { return rq.name.toLowerCase(); });
    var options = TESTS.filter(function (t) { return taken.indexOf(t.name.toLowerCase()) === -1; }).map(function (t) {
      return '<option value="' + esc(t.name) + '">' + esc(t.name) + '</option>';
    }).join('');
    var custom = editing.customTest
      ? '<div class="ar-custom-test">' +
        '<input type="text" id="pe-ct-name" placeholder="Test name, e.g. University entrance test" />' +
        '<input type="number" id="pe-ct-max" min="1" placeholder="Out of" />' +
        '<input type="number" id="pe-ct-min" min="0" placeholder="Minimum" />' +
        '<div class="ar-custom-actions"><button type="button" class="btn btn-ghost btn-sm" data-cancel-custom-test>Cancel</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-add-custom-test>Add test</button></div></div>'
      : '';
    return (
      '<div class="ar-reqs">' + (rows || '<p class="ar-muted">No tests yet. Students won’t get credit for tests.</p>') + '</div>' +
      custom +
      (editing.customTest ? '' :
        '<select id="pe-add-test" class="ar-add-select"><option value="">+ Add a test</option>' + options +
        '<option value="__custom">Custom test…</option></select>')
    );
  }

  function activityEditor(c) {
    var known = ACTIVITIES.map(function (a) { return a.toLowerCase(); });
    var extra = c.activities.values.filter(function (a) { return known.indexOf(a.toLowerCase()) === -1; });
    return (
      checks('pe-activity', ACTIVITIES.concat(extra), c.activities.values) +
      '<div class="ar-add-row"><input type="text" id="pe-activity-new" placeholder="Add a custom activity, e.g. Astronomy club" />' +
      '<button type="button" class="btn btn-secondary btn-sm" data-add-activity>Add</button></div>'
    );
  }

  /** Starting minimum when a test is added: roughly a good-but-not-top result in that test's unit. */
  function defaultMin(name) {
    var info = testInfo(name);
    if (!info) return 50;
    if (info.kind === 'rank') return 25000;
    if (info.kind === 'percentile') return 80;
    return Math.round(info.max * 0.6);
  }

  function addCustomTest() {
    var name = $('pe-ct-name').value.trim();
    var max = Number($('pe-ct-max').value);
    var min = Number($('pe-ct-min').value);
    if (!name) { $('pe-ct-name').focus(); toast('Name the test.'); return; }
    if (!max || max <= 0) { $('pe-ct-max').focus(); toast('Add what the test is scored out of.'); return; }
    if ($('pe-ct-min').value === '' || isNaN(min) || min < 0 || min > max) { $('pe-ct-min').focus(); toast('Minimum must be between 0 and ' + max + '.'); return; }
    readEditor();
    var tests = editing.draft.criteria.test.tests;
    if (tests.some(function (rq) { return rq.name.toLowerCase() === name.toLowerCase(); })) { toast(name + ' is already added.'); return; }
    tests.push(req(name, min, max));
    editing.customTest = false;
    rerenderEditor();
  }

  function addCustomActivity() {
    var input = $('pe-activity-new');
    var name = input.value.trim();
    if (!name) { input.focus(); return; }
    readEditor();
    var values = editing.draft.criteria.activities.values;
    if (!values.some(function (a) { return a.toLowerCase() === name.toLowerCase(); })) {
      var known = ACTIVITIES.filter(function (a) { return a.toLowerCase() === name.toLowerCase(); })[0];
      values.push(known || name);
    }
    rerenderEditor();
    $('pe-activity-new').focus();
  }

  function rerenderEditor() {
    readEditor();
    var body = $('drawer-body');
    var top = body.scrollTop;
    body.innerHTML = editorHtml();
    body.scrollTop = top;
    updatePreview();
  }

  function editorHtml() {
    var d = editing.draft;
    var c = d.criteria;
    var program = programById(editing.programId);

    function row(cid, label, control, hint) {
      return '<div class="ar-form-row"><div class="field"><label>' + label + '</label>' + control +
        (hint ? '<p class="ar-hint">' + hint + '</p>' : '') + '</div>' + weightSelect(cid, c[cid].weight) + '</div>';
    }
    var gradeHint = 'Boards grade differently. CGPA is converted × 9.5 and IB points ÷ 45 before comparing.';

    return (
      '<div class="ar-editor-program">' + ico('school') + '<div><span>Program</span><strong>' + esc(program.name) + '</strong></div></div>' +
      '<div class="field"><label>Preference name</label><input type="text" id="pe-name" value="' + esc(d.name) + '" placeholder="e.g. Delhi NCR high achievers" /></div>' +

      '<div class="ar-score-box">' +
      '<div class="ar-score-box-head"><div><strong>Minimum match score</strong><span>Students scoring at or above this show on your dashboard.</span></div>' +
      '<b id="pe-score-out">' + d.minScore + '%</b></div>' +
      '<input type="range" min="40" max="100" step="5" id="pe-score" value="' + d.minScore + '" />' +
      '<p class="ar-score-preview" id="pe-preview"></p></div>' +

      '<div class="ar-editor-sub"><h4>What counts toward the score</h4><span>Weight</span></div>' +
      row('location', 'Location within (km)', '<input type="number" min="5" step="5" id="pe-radius" value="' + c.location.radius + '" />') +
      row('test', 'Entrance tests', testsEditor(c), 'Students need any one of these. Each test uses its own unit; the best one counts.') +
      row('class12', 'Class 12 marks', '<label class="ar-unit"><input type="number" min="0" max="100" id="pe-c12" value="' + c.class12.min + '" /><span>% and above</span></label>', gradeHint) +
      row('class10', 'Class 10 marks', '<label class="ar-unit"><input type="number" min="0" max="100" id="pe-c10" value="' + c.class10.min + '" /><span>% and above</span></label>') +
      row('budget', 'Student fee budget',
        '<div class="ar-pair">' +
        '<label class="ar-unit"><b>₹</b><input type="number" min="0" id="pe-bmin" value="' + c.budget.min + '" aria-label="From" /><span>L min</span></label>' +
        '<label class="ar-unit"><b>₹</b><input type="number" min="0" id="pe-bmax" value="' + c.budget.max + '" aria-label="To" /><span>L max</span></label></div>',
        'Program fee is ₹' + program.fee + 'L. Students whose budget overlaps this range count as a match.') +
      row('stream', 'Stream (Class 11–12)', '<select id="pe-stream">' + ['Any'].concat(STREAMS).map(function (v) {
        return '<option' + (v === c.stream.value ? ' selected' : '') + '>' + v + '</option>';
      }).join('') + '</select>') +
      row('board', 'Accepted Class 12 boards', checks('pe-board', BOARDS, c.board.values)) +
      row('activities', 'Extracurricular', activityEditor(c)) +
      row('intake', 'Intake', '<select id="pe-intake">' + INTAKES.map(function (v) {
        return '<option' + (v === c.intake.value ? ' selected' : '') + '>' + v + '</option>';
      }).join('') + '</select>')
    );
  }

  function readEditor() {
    var body = $('drawer-body');
    var d = editing.draft;
    function num(id, fallback) {
      var v = Number($(id).value);
      return $(id).value === '' || isNaN(v) ? fallback : v;
    }
    function weight(cid) {
      return Number(body.querySelector('[data-weight="' + cid + '"]').value);
    }
    function checked(name) {
      return Array.prototype.map.call(body.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
    }
    var bmin = num('pe-bmin', d.criteria.budget.min);
    var bmax = num('pe-bmax', d.criteria.budget.max);
    d.name = $('pe-name').value.trim();
    d.minScore = Number($('pe-score').value);
    d.criteria = {
      location: { radius: num('pe-radius', d.criteria.location.radius), weight: weight('location') },
      test: {
        tests: d.criteria.test.tests.map(function (rq, i) {
          var input = body.querySelector('[data-test-min="' + i + '"]');
          var v = input ? Number(input.value) : rq.min;
          return Object.assign({}, rq, { min: input && input.value !== '' && !isNaN(v) ? v : rq.min });
        }),
        weight: weight('test'),
      },
      class12: { min: num('pe-c12', d.criteria.class12.min), weight: weight('class12') },
      class10: { min: num('pe-c10', d.criteria.class10.min), weight: weight('class10') },
      budget: { min: Math.min(bmin, bmax), max: Math.max(bmin, bmax), weight: weight('budget') },
      stream: { value: $('pe-stream').value, weight: weight('stream') },
      board: { values: checked('pe-board'), weight: weight('board') },
      activities: { values: checked('pe-activity'), weight: weight('activities') },
      intake: { value: $('pe-intake').value, weight: weight('intake') },
    };
  }

  function updatePreview() {
    readEditor();
    var d = editing.draft;
    var total = STUDENTS.filter(function (s) { return s.program === editing.programId; }).length;
    var n = matchCount(editing.programId, d);
    $('pe-score-out').textContent = d.minScore + '%';
    $('pe-preview').innerHTML = '<b>' + n + '</b> of ' + total + ' students in this program would show.';
  }

  function openEditor(programId, prefId) {
    var program = programById(programId);
    var existing = prefId ? findPref(programId, prefId) : null;
    editing = {
      programId: programId,
      prefId: existing ? existing.id : null,
      draft: existing ? clone(existing) : { id: null, name: '', minScore: 80, criteria: baseCriteria(program) },
    };
    openDrawer(
      existing ? 'Edit preference' : 'Create preference',
      editorHtml(),
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="save-pref">' + (existing ? 'Save changes' : 'Create preference') + '</button>'
    );
    updatePreview();
  }

  function saveEditor() {
    readEditor();
    var d = editing.draft;
    if (!d.name) {
      $('pe-name').focus();
      toast('Give this preference a name.');
      return;
    }
    var list = prefsFor(editing.programId);
    if (editing.prefId) {
      d.id = editing.prefId;
      PREFS[editing.programId] = list.map(function (p) { return p.id === d.id ? d : p; });
    } else {
      d.id = newId();
      list.push(d);
    }
    savePrefs();
    var created = !editing.prefId;
    var programId = editing.programId;
    var prefId = d.id;
    closeDrawer();
    if (state.program === programId && (created || state.prefId === prefId)) state.prefId = prefId;
    if (state.view === 'programs') renderPrograms();
    else renderDashboard();
    toast(created ? 'Preference created.' : 'Preference saved. Students re-scored.');
  }

  function deletePref(programId, prefId) {
    var list = prefsFor(programId);
    if (list.length <= 1) return;
    var pref = findPref(programId, prefId);
    if (!window.confirm('Delete “' + pref.name + '”? Students won’t be scored against it anymore.')) return;
    PREFS[programId] = list.filter(function (p) { return p.id !== prefId; });
    if (state.prefId === prefId) state.prefId = null;
    savePrefs();
    renderPrograms();
    toast('Preference deleted.');
  }

  /* ——— Events ——— */

  var MENUS = [['program-btn', 'program-menu'], ['pref-btn', 'pref-menu'], ['range-btn', 'range-menu']];

  function closeMenus(except) {
    MENUS.forEach(function (m) {
      if (m[1] === except) return;
      $(m[1]).hidden = true;
      $(m[0]).setAttribute('aria-expanded', 'false');
    });
  }

  function toggleMenu(btnId, menuId) {
    closeMenus(menuId);
    var menu = $(menuId);
    menu.hidden = !menu.hidden;
    $(btnId).setAttribute('aria-expanded', String(!menu.hidden));
  }

  function setProgram(id) {
    state.program = id;
    state.prefId = null;
    state.stage = null;
    renderDashboard();
  }

  document.addEventListener('click', function (e) {
    var t = e.target;

    var go = t.closest('[data-go]');
    if (go) {
      e.preventDefault();
      closeMenus();
      setView(go.getAttribute('data-go'));
      return;
    }

    for (var i = 0; i < MENUS.length; i++) {
      if (t.closest('#' + MENUS[i][0])) {
        toggleMenu(MENUS[i][0], MENUS[i][1]);
        return;
      }
    }

    var programItem = t.closest('[data-program]');
    if (programItem) {
      var pid = programItem.getAttribute('data-program');
      closeMenus();
      setProgram(programItem.classList.contains('ar-bar') && state.program === pid ? 'all' : pid);
      return;
    }

    var prefItem = t.closest('[data-pref]');
    if (prefItem) {
      state.prefId = prefItem.getAttribute('data-pref');
      state.stage = null;
      closeMenus();
      renderDashboard();
      return;
    }

    var createPref = t.closest('[data-create-pref]');
    if (createPref) {
      closeMenus();
      openEditor(createPref.getAttribute('data-create-pref'));
      return;
    }

    var rangeItem = t.closest('[data-range]');
    if (rangeItem) {
      state.range = Number(rangeItem.getAttribute('data-range'));
      document.querySelectorAll('[data-range]').forEach(function (b) { b.classList.toggle('active', b === rangeItem); });
      $('range-label').textContent = rangeItem.textContent;
      closeMenus();
      renderDashboard();
      return;
    }

    if (!t.closest('.ar-menu')) closeMenus();

    if (t.closest('#pref-panel-edit')) {
      if (state.program === 'all') setView('programs');
      else openEditor(state.program, findPref(state.program, state.prefId).id);
      return;
    }

    var stage = t.closest('[data-stage]');
    if (stage) {
      var si = Number(stage.getAttribute('data-stage'));
      state.stage = state.stage === si ? null : si;
      renderFunnel();
      renderStudents();
      return;
    }

    var aud = t.closest('[data-audience]');
    if (aud) {
      state.audience = aud.getAttribute('data-audience');
      document.querySelectorAll('[role="tab"][data-audience]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-audience') === state.audience);
      });
      renderDashboard();
      return;
    }

    var layout = t.closest('[data-view]');
    if (layout) {
      state.layout = layout.getAttribute('data-view');
      document.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('active', b === layout); });
      renderStudents();
      return;
    }

    var clear = t.closest('[data-clear]');
    if (clear) {
      if (clear.getAttribute('data-clear') === 'stage') state.stage = null;
      else setProgram('all');
      renderDashboard();
      return;
    }

    var student = t.closest('[data-student]');
    if (student) {
      openStudent(student.getAttribute('data-student'));
      return;
    }

    var ppProgram = t.closest('[data-pp-program]');
    if (ppProgram) {
      state.ppProgram = ppProgram.getAttribute('data-pp-program');
      renderPrograms();
      return;
    }

    if (t.closest('#pp-create')) {
      openEditor(state.ppProgram);
      return;
    }

    var editPref = t.closest('[data-edit-pref]');
    if (editPref) {
      openEditor(state.ppProgram, editPref.getAttribute('data-edit-pref'));
      return;
    }

    var delPref = t.closest('[data-delete-pref]');
    if (delPref) {
      deletePref(state.ppProgram, delPref.getAttribute('data-delete-pref'));
      return;
    }

    var usePref = t.closest('[data-use-pref]');
    if (usePref) {
      state.program = state.ppProgram;
      state.prefId = usePref.getAttribute('data-use-pref');
      state.stage = null;
      state.audience = 'matched';
      document.querySelectorAll('[data-audience]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-audience') === 'matched');
      });
      setView('dashboard');
      $('students').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (t.closest('[data-close-drawer]')) {
      closeDrawer();
      return;
    }

    if (editing) {
      var removeTest = t.closest('[data-remove-test]');
      if (removeTest) {
        readEditor();
        editing.draft.criteria.test.tests.splice(Number(removeTest.getAttribute('data-remove-test')), 1);
        rerenderEditor();
        return;
      }
      if (t.closest('[data-cancel-custom-test]')) {
        editing.customTest = false;
        rerenderEditor();
        return;
      }
      if (t.closest('[data-add-custom-test]')) {
        addCustomTest();
        return;
      }
      if (t.closest('[data-add-activity]')) {
        addCustomActivity();
        return;
      }
    }

    var action = t.closest('[data-action]');
    if (action) {
      var act = action.getAttribute('data-action');
      if (act === 'save-pref') saveEditor();
      else if (act === 'shortlist') toast('Saved to your list.');
      else if (act === 'reach') toast('Outreach queued for this student.');
    }
  });

  $('drawer-body').addEventListener('input', function () {
    if (editing) updatePreview();
  });
  $('drawer-body').addEventListener('change', function (e) {
    if (!editing) return;
    if (e.target.id === 'pe-add-test') {
      var name = e.target.value;
      if (!name) return;
      readEditor();
      if (name === '__custom') editing.customTest = true;
      else editing.draft.criteria.test.tests.push(req(name, defaultMin(name)));
      rerenderEditor();
      return;
    }
    updatePreview();
  });

  $('drawer-body').addEventListener('keydown', function (e) {
    if (!editing || e.key !== 'Enter') return;
    if (e.target.id === 'pe-activity-new') {
      e.preventDefault();
      addCustomActivity();
    } else if (/^pe-ct-/.test(e.target.id)) {
      e.preventDefault();
      addCustomTest();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMenus();
      if (!$('drawer').hidden) closeDrawer();
    }
  });

  $('student-search').addEventListener('input', function (e) {
    state.query = e.target.value;
    renderStudents();
  });

  $('campaign-btn').addEventListener('click', function () {
    var n = visibleSet().length;
    toast(n ? 'Campaign drafted for ' + n + ' student' + (n === 1 ? '' : 's') + '.' : 'No students in this view.');
  });

  $('export-btn').addEventListener('click', function () {
    var list = visibleSet();
    var rows = [['GR ID', 'Name', 'Program', 'Preference', 'Match %', 'Stage', 'Class 10', 'Class 12', 'Tests', 'Budget (L)', 'City', 'Km', 'Intake']].concat(
      list.map(function (s) {
        return [s.id, s.name, programById(s.program).name, s.pref.name, s.score, STAGES[s.stage].name, markNote(s.mark10), markNote(s.mark12),
          s.tests.map(testNote).join('; '), s.budget[0] + '-' + s.budget[1], s.city, s.km, s.intake];
      })
    );
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'admitright-students.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Exported ' + list.length + ' students.');
  });

  renderDashboard();

  if (window.fetch && location.protocol !== 'file:') {
    fetch(STUDENTS_CSV, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.text() : Promise.reject(res.status); })
      .then(function (text) {
        var list = studentsFromCsv(text);
        if (!list.length) return;
        STUDENTS = list;
        if (state.view === 'programs') renderPrograms();
        else renderDashboard();
        toast('Loaded ' + list.length + ' students from CSV.');
      })
      .catch(function () {});
  }
})();
