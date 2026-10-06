/**
 * AdmitRight — university admissions dashboard (prototype).
 * Students come from the GradRight AI profiling flow. Programs are fixed;
 * each program owns one or more preferences (criteria + a minimum match score),
 * and a preference decides which students the university sees.
 */
(function () {
  var PREFS_KEY = 'admitright_prefs_v5';
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
    { id: 'btech-cse', name: 'B.Tech Computer Science', fee: 18, stream: 'PCM', seats: 240, prefName: 'JEE Main 85+ coders' },
    { id: 'btech-ai', name: 'B.Tech AI & ML', fee: 20, stream: 'PCM', seats: 120, prefName: 'Maths-strong AI aspirants' },
    { id: 'bsc-ds', name: 'B.Sc Data Science', fee: 12, stream: 'PCM', seats: 90, prefName: 'Analytical PCM students' },
    { id: 'bba', name: 'BBA', fee: 10, stream: 'Any', seats: 180, prefName: 'Business-minded all-rounders' },
    { id: 'bdes', name: 'B.Des', fee: 16, stream: 'Any', seats: 60, prefName: 'UCEED & NATA creatives' },
    { id: 'bcom', name: 'B.Com (Hons)', fee: 8, stream: 'Commerce', seats: 120, noDefaultPref: true },
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
  ];
  /** Every preference uses the same bands: Matches 80+, Close 60–79, Below under 60. */
  var MATCH_MIN = 80;
  var CLOSE_MIN = 60;

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
        intake: spreadIntake('GR-' + (24180 + i * 37), rand() < 0.8 ? INTAKES[0] : INTAKES[1]),
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

  /** The sample data is all 2027; spread students across intake years by GR ID, keeping their month. */
  function spreadIntake(id, intake) {
    var month = String(intake || 'Aug').split(' ')[0];
    var n = hashOf(String(id)) % 100;
    var year = n < 12 ? '2026' : n < 67 ? '2027' : n < 89 ? '2028' : '2029';
    return month + ' ' + year;
  }

  function intakeYear(s) {
    return String(s.intake || '').split(' ').pop();
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
      intake: spreadIntake(r.id, r.intake),
      stage: stage === -1 ? 0 : stage,
      createdOn: created,
      daysAgo: Math.max(0, Math.floor((TODAY - created) / 86400000)),
      events: events,
      lastActive: parseStamp(r.last_active_at),
      extra: {
        source: r.source,
        languages: r.languages,
        hostel: r.hostel,
        scholarship: r.scholarship,
        loan: r.loan,
        careerGoal: r.career_goal,
      },
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
      location: { radius: 100, weight: 20 },
      test: { tests: (DEFAULT_TESTS[program.id] || [req('CUET UG', 70)]).map(function (t) { return Object.assign({}, t); }), weight: 30 },
      class12: { min: tech ? 80 : 70, weight: 30 },
      class10: { min: tech ? 75 : 65, weight: 10 },
      budget: { min: Math.max(5, program.fee - 6), max: program.fee + 6, weight: 20 },
      stream: { value: program.stream, weight: tech ? 30 : 1 },
      board: { values: BOARDS.slice(), weight: 10 },
      activities: { values: tech ? ['Coding', 'Robotics'] : ['Debate', 'Art', 'MUN'], weight: 10 },
    };
  }

  function defaultPrefs() {
    var out = {};
    PROGRAMS.forEach(function (p) {
      out[p.id] = p.noDefaultPref ? [] : [{ id: newId(), name: p.prefName, criteria: baseCriteria(p) }];
    });
    var ncr = baseCriteria(PROGRAMS[0]);
    ncr.location = { radius: 100, weight: 40 };
    ncr.test = { tests: [req('JEE Main', 90), req('JEE Advanced', 15000), req('BITSAT', 250), req('CUET UG', 90)], weight: 35 };
    ncr.class12 = { min: 90, weight: 35 };
    ncr.class10 = { min: 85, weight: 20 };
    ncr.budget = { min: 15, max: 30, weight: 20 };
    ncr.activities = { values: ['Coding', 'Robotics', 'MUN'], weight: 10 };
    out[PROGRAMS[0].id].push({ id: newId(), name: 'Delhi NCR high achievers', criteria: ncr });
    out[PROGRAMS[0].id] = out[PROGRAMS[0].id].concat(cseSeedPrefs());
    return out;
  }

  /** Stable ids so the seeds are added to stored preferences only once. */
  function cseSeedPrefs() {
    var cse = PROGRAMS[0];
    function make(id, name, edit) {
      var c = baseCriteria(cse);
      edit(c);
      return { id: id, name: name, criteria: c };
    }
    return [
      make('seed-cse-iit', 'JEE Advanced rankers', function (c) {
        c.location = { radius: 2000, weight: 5 };
        c.test = { tests: [req('JEE Advanced', 10000), req('JEE Main', 95)], weight: 50 };
        c.class12 = { min: 85, weight: 25 };
        c.class10 = { min: 85, weight: 10 };
        c.budget = { min: 12, max: 30, weight: 15 };
      }),
      make('seed-cse-coders', 'Olympiad & hackathon coders', function (c) {
        c.location = { radius: 500, weight: 10 };
        c.test = { tests: [req('JEE Main', 85), req('BITSAT', 220), req('CUET UG', 85)], weight: 25 };
        c.class12 = { min: 80, weight: 20 };
        c.activities = { values: ['Coding', 'Olympiads', 'Hackathons', 'Robotics'], weight: 40 };
      }),
      make('seed-cse-local', 'Budget-friendly local talent', function (c) {
        c.location = { radius: 50, weight: 40 };
        c.test = { tests: [req('JEE Main', 75), req('CUET UG', 75), req('MHT CET', 75)], weight: 20 };
        c.class12 = { min: 75, weight: 25 };
        c.budget = { min: 8, max: 18, weight: 35 };
      }),
      make('seed-cse-cbse', 'CBSE 90%+ toppers', function (c) {
        c.board = { values: ['CBSE', 'CISCE'], weight: 30 };
        c.class12 = { min: 90, weight: 40 };
        c.class10 = { min: 90, weight: 20 };
        c.test = { tests: [req('JEE Main', 85), req('CUET UG', 90)], weight: 20 };
      }),
      make('seed-cse-national', 'Pan-India strong scorers', function (c) {
        c.location = { radius: 2500, weight: 5 };
        c.test = { tests: [req('JEE Main', 90), req('BITSAT', 240), req('CUET UG', 90)], weight: 40 };
        c.class12 = { min: 85, weight: 30 };
        c.budget = { min: 15, max: 30, weight: 15 };
      }),
    ];
  }

  var SEEDS_KEY = 'admitright_seeds_v2';
  var RETIRED_SEEDS = ['seed-cse-jan'];

  function loadPrefs() {
    var defaults = defaultPrefs();
    try {
      var stored = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (stored) {
        PROGRAMS.forEach(function (p) {
          if (!Array.isArray(stored[p.id]) || !stored[p.id].length) return;
          stored[p.id].forEach(function (pref) {
            if (pref.name === 'Standard intake' && p.prefName) pref.name = p.prefName;
          });
          defaults[p.id] = stored[p.id];
        });
        if (localStorage.getItem(SEEDS_KEY) !== '1') {
          var cse = defaults[PROGRAMS[0].id] = defaults[PROGRAMS[0].id].filter(function (p) {
            return RETIRED_SEEDS.indexOf(p.id) === -1;
          });
          cseSeedPrefs().forEach(function (seed) {
            if (!cse.some(function (p) { return p.id === seed.id || p.name === seed.name; })) cse.push(seed);
          });
          localStorage.setItem(PREFS_KEY, JSON.stringify(defaults));
        }
      }
      localStorage.setItem(SEEDS_KEY, '1');
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

  /** How far past the bar a test result is, comparable across tests; ranks are lower-is-better. */
  function testMargin(t, rq) {
    if (rq.kind === 'rank') return (rq.min - t.value) / rq.min;
    return (t.value - rq.min) / (rq.max || 100);
  }

  /** v is the credit against the preference; raw is an uncapped strength used to rank students against each other. */
  function criterionScore(id, s, p) {
    switch (id) {
      case 'location':
        if (s.km <= p.radius) return { v: 1, raw: -s.km, note: s.km + ' km away' };
        return { v: clamp01(0.7 - (s.km - p.radius) / p.radius), raw: -s.km, note: s.km + ' km away' };
      case 'test': {
        var best = null;
        p.tests.forEach(function (rq) {
          s.tests.forEach(function (t) {
            if (t.name.toLowerCase() !== rq.name.toLowerCase()) return;
            var v = testCredit(t, rq);
            var raw = testMargin(t, rq);
            if (!best || raw > best.raw) best = { v: v, raw: raw, note: testNote(t) };
          });
        });
        if (best) return best;
        return { v: 0, raw: -1e9, note: s.tests.length ? 'No accepted test' : 'No test' };
      }
      case 'class12':
        return { v: s.class12 >= p.min ? 1 : clamp01(0.8 - (p.min - s.class12) / 12), raw: s.class12, note: markNote(s.mark12) };
      case 'class10':
        return { v: s.class10 >= p.min ? 1 : clamp01(0.8 - (p.min - s.class10) / 12), raw: s.class10, note: markNote(s.mark10) };
      case 'budget': {
        var note = '₹' + s.budget[0] + '–' + s.budget[1] + 'L';
        if (s.budget[1] >= p.min && s.budget[0] <= p.max) return { v: 1, raw: 0, note: note };
        var gap = s.budget[1] < p.min ? p.min - s.budget[1] : s.budget[0] - p.max;
        return { v: clamp01(0.7 - gap / 8), raw: -gap, note: note };
      }
      case 'stream': {
        var okStream = p.value === 'Any' || s.stream === p.value ? 1 : 0;
        return { v: okStream, raw: okStream, note: s.stream };
      }
      case 'board': {
        var okBoard = p.values.indexOf(s.board) !== -1 ? 1 : 0;
        return { v: okBoard, raw: okBoard, note: s.board };
      }
      case 'activities': {
        if (!p.values.length) return { v: 1, raw: s.activities.length, note: s.activities.join(', ') };
        var wanted = p.values.map(function (a) { return a.toLowerCase(); });
        var hit = s.activities.filter(function (a) { return wanted.indexOf(a.toLowerCase()) !== -1; }).length;
        return { v: hit ? clamp01(0.6 + hit * 0.4) : 0.2, raw: hit + s.activities.length / 100, note: s.activities.join(', ') };
      }
    }
    return { v: 0, raw: 0, note: '' };
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
      return { id: c.id, label: c.label, v: r.v, raw: r.raw, note: r.note, weight: p.weight };
    });
    return { score: weight ? Math.round((total / weight) * 100) : 0, parts: parts };
  }

  /* ——— State ——— */

  var state = {
    view: 'dashboard',
    program: PROGRAMS[0].id,
    prefId: null,
    stage: null,
    layout: 'board',
    query: '',
    range: 0,
    intake: '2027',
    ppProgram: PROGRAMS[0].id,
    collapsed: {},
    filters: { min: '', max: '', vals: {} },
  };

  function programById(id) {
    return PROGRAMS.filter(function (p) { return p.id === id; })[0];
  }

  /** The preference a student is judged by in the current dashboard context. */
  function activePrefFor(s) {
    if (state.program !== 'all') return findPref(state.program, state.prefId);
    return prefsFor(s.program)[0];
  }

  /** bucket 3 means the program has no preference yet, so the student isn't scored. */
  function rescore() {
    STUDENTS.forEach(function (s) {
      var pref = activePrefFor(s);
      if (!pref) {
        s.pref = null;
        s.score = null;
        s.parts = [];
        s.bucket = 3;
        return;
      }
      var r = scoreAgainst(s, pref);
      s.pref = pref;
      s.score = r.score;
      s.parts = r.parts;
      s.bucket = s.score >= MATCH_MIN ? 0 : s.score >= CLOSE_MIN ? 1 : 2;
    });
    rankParts();
  }

  /** Each part's rel is the share of the program's applicants this student is level with or ahead of on that criterion. */
  function rankParts() {
    var byProgram = {};
    STUDENTS.forEach(function (s) {
      if (!s.pref) return;
      (byProgram[s.program] = byProgram[s.program] || []).push(s);
    });
    Object.keys(byProgram).forEach(function (pid) {
      var group = byProgram[pid];
      var n = group.length;
      CRITERIA.forEach(function (c, ci) {
        var sorted = group.map(function (s) { return s.parts[ci].raw; }).sort(function (a, b) { return a - b; });
        group.forEach(function (s) {
          var part = s.parts[ci];
          var lo = 0;
          var hi = n;
          while (lo < hi) {
            var mid = (lo + hi) >> 1;
            if (sorted[mid] <= part.raw) lo = mid + 1;
            else hi = mid;
          }
          part.rel = Math.round((lo / n) * 100);
        });
      });
    });
  }

  /** range 0 means all time. */
  function inRange(s) {
    return !state.range || s.daysAgo <= state.range;
  }

  var SAVED_KEY = 'admitright_saved_v1';
  var SAVED = {};
  try {
    (JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') || []).forEach(function (id) { SAVED[id] = true; });
  } catch (err) { SAVED = {}; }

  function isSaved(id) {
    return !!SAVED[id];
  }

  function toggleSaved(id) {
    if (SAVED[id]) delete SAVED[id];
    else SAVED[id] = true;
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(Object.keys(SAVED))); } catch (err) { /* storage full or blocked */ }
    return !!SAVED[id];
  }

  function savedView() {
    return state.view === 'saved';
  }

  function baseSet() {
    return STUDENTS.filter(function (s) {
      if (savedView() && !SAVED[s.id]) return false;
      if (!inRange(s)) return false;
      if (state.intake && intakeYear(s) !== state.intake) return false;
      if (state.program !== 'all' && s.program !== state.program) return false;
      return true;
    });
  }

  function visibleSet() {
    var q = state.query.trim().toLowerCase();
    return baseSet()
      .filter(function (s) {
        if (!savedView() && state.stage !== null && s.stage < state.stage) return false;
        if (!passesFilters(s)) return false;
        if (!q) return true;
        return (s.name + ' ' + s.id + ' ' + s.city).toLowerCase().indexOf(q) !== -1;
      })
      .sort(state.program === 'all' ? byProgress : byScore);
  }

  /** Criteria filtered by a numeric range on the student's actual value, and those picked from a list. */
  var RANGE_FILTERS = {
    location: { unit: 'km', get: function (s) { return s.km; } },
    class12: { unit: '%', get: function (s) { return s.class12; } },
    class10: { unit: '%', get: function (s) { return s.class10; } },
    budget: { unit: '₹L' },
  };
  var PICK_FILTERS = {
    stream: function (s) { return [s.stream]; },
    board: function (s) { return [s.board]; },
    activities: function (s) { return s.activities; },
  };

  function filtersOn() {
    return state.program !== 'all' && !!findPref(state.program, state.prefId);
  }

  function filterActive(v) {
    return !!v && ((v.min !== undefined && v.min !== '') || (v.max !== undefined && v.max !== '') || !!v.val);
  }

  function activeFilters() {
    var vals = state.filters.vals;
    return Object.keys(vals).filter(function (id) { return filterActive(vals[id]); });
  }

  function activeFilterCount() {
    if (!filtersOn()) return 0;
    var f = state.filters;
    return (f.min !== '' || f.max !== '' ? 1 : 0) + activeFilters().length;
  }

  function resetFilters() {
    state.filters = { min: '', max: '', vals: {} };
  }

  function within(x, v) {
    return (v.min === undefined || v.min === '' || x >= Number(v.min)) && (v.max === undefined || v.max === '' || x <= Number(v.max));
  }

  /** The test a test filter applies to; defaults to the preference's first accepted test. */
  function filterTest(pref) {
    var tests = pref.criteria.test.tests;
    var name = (state.filters.vals.test || {}).val;
    return tests.filter(function (t) { return t.name === name; })[0] || tests[0];
  }

  /** Score and value filters only apply while a preference is scoring the students. */
  function passesFilters(s) {
    if (!filtersOn()) return true;
    var f = state.filters;
    if (f.min !== '' && (s.score === null || s.score < Number(f.min))) return false;
    if (f.max !== '' && (s.score === null || s.score > Number(f.max))) return false;
    var ids = activeFilters();
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var v = f.vals[id];
      if (id === 'test') {
        var rq = filterTest(s.pref);
        var t = rq && s.tests.filter(function (x) { return x.name.toLowerCase() === rq.name.toLowerCase(); })[0];
        if (!t || !within(t.value, v)) return false;
      } else if (id === 'budget') {
        if (v.min !== undefined && v.min !== '' && s.budget[1] < Number(v.min)) return false;
        if (v.max !== undefined && v.max !== '' && s.budget[0] > Number(v.max)) return false;
      } else if (RANGE_FILTERS[id]) {
        if (!within(RANGE_FILTERS[id].get(s), v)) return false;
      } else if (PICK_FILTERS[id] && v.val) {
        if (PICK_FILTERS[id](s).indexOf(v.val) === -1) return false;
      }
    }
    return true;
  }

  /** All programs has no single preference to rank by, so students further along the journey come first. */
  function byProgress(a, b) {
    return b.stage - a.stage || (b.lastActive || 0) - (a.lastActive || 0);
  }

  function byScore(a, b) {
    return (b.score === null ? -1 : b.score) - (a.score === null ? -1 : a.score);
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
    return ['hi', 'mid', 'lo', 'none'][s.bucket];
  }

  function scoreColor(s) {
    return ['var(--success)', 'var(--yellow-600)', 'var(--danger)', 'var(--gray-200)'][s.bucket];
  }

  function scoreHtml(s) {
    return s.score === null ? '—' : s.score + '<small>%</small>';
  }

  /* ——— Score changes after a preference edit ——— */

  /* Per preference: { edits: [{ at, old: {id: score before}, now: {id: score after} }] }, oldest first,
     holding only the students whose score moved in that edit. */
  var CHANGES_KEY = 'admitright_pref_changes_v2';
  var MAX_EDITS = 10;
  var CHANGES = {};
  var VERSION_VIEW = {};
  try { CHANGES = JSON.parse(localStorage.getItem(CHANGES_KEY) || '{}') || {}; } catch (err) { CHANGES = {}; }
  try { localStorage.removeItem('admitright_pref_changes_v1'); } catch (err) { /* blocked */ }

  function saveChanges() {
    try { localStorage.setItem(CHANGES_KEY, JSON.stringify(CHANGES)); } catch (err) { /* storage full or blocked */ }
  }

  function bucketOf(score) {
    return score >= MATCH_MIN ? 0 : score >= CLOSE_MIN ? 1 : 2;
  }

  function editsFor(prefId) {
    return (CHANGES[prefId] && CHANGES[prefId].edits) || [];
  }

  function recordChange(programId, before, after) {
    var old = {};
    var now = {};
    var oldParts = {};
    var up = 0;
    var down = 0;
    var moved = 0;
    STUDENTS.forEach(function (s) {
      if (s.program !== programId) return;
      var beforeScore = scoreAgainst(s, before);
      var afterScore = scoreAgainst(s, after);
      var a = beforeScore.score;
      var b = afterScore.score;
      if (a === b) return;
      old[s.id] = a;
      now[s.id] = b;
      oldParts[s.id] = beforeScore.parts.map(function (p) {
        return { id: p.id, label: p.label, note: p.note, rel: Math.round((p.v || 0) * 100), weight: p.weight };
      });
      if (b > a) up += 1;
      else down += 1;
      if (bucketOf(a) !== bucketOf(b)) moved += 1;
    });
    if (!up && !down) return { up: 0, down: 0, moved: 0 };
    var edits = editsFor(after.id).concat([{ at: Date.now(), old: old, now: now, oldParts: oldParts, before: clone(before) }]);
    CHANGES[after.id] = { edits: edits.slice(-MAX_EDITS) };
    saveChanges();
    return { up: up, down: down, moved: moved };
  }

  /** Every edit that moved this student's score, oldest first, numbered within the preference. */
  function historyFor(s) {
    if (!s.pref || s.score === null) return [];
    var edits = editsFor(s.pref.id);
    var out = [];
    edits.forEach(function (e, i) {
      if (!Object.prototype.hasOwnProperty.call(e.old, s.id)) return;
      out.push({ n: i + 1, at: e.at, was: e.old[s.id], now: e.now[s.id], parts: e.oldParts && e.oldParts[s.id] });
    });
    return out;
  }

  /** The latest edit that moved this student, if it still matches the score shown now. */
  function changeFor(s) {
    var h = historyFor(s);
    var last = h[h.length - 1];
    if (!last || last.now !== s.score) return null;
    return {
      was: last.was, at: last.at, edits: h.length,
      diff: s.score - last.was,
      from: bucketOf(last.was) !== s.bucket ? bucketOf(last.was) : null,
    };
  }

  function changeTip(ch) {
    return 'Was ' + ch.was + '% before the edit ' + timeAgo(ch.at) +
      (ch.from !== null ? ' · was ' + bucketDefs()[ch.from].name : '') +
      (ch.edits > 1 ? ' · changed in ' + ch.edits + ' edits' : '');
  }

  function deltaHtml(s) {
    var ch = changeFor(s);
    if (!ch) return '';
    var up = ch.diff > 0;
    var tip = changeTip(ch);
    return '<span class="ar-delta ' + (up ? 'up' : 'down') + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) + '">' +
      '<s>' + ch.was + '%</s>' + ico(up ? 'arrow_upward' : 'arrow_downward') + '</span>';
  }

  function scoreDeltaHtml(s) {
    return savedView() ? deltaHtml(s) : '';
  }

  function cardScoreBox(s) {
    var showingOld = savedView() && VERSION_VIEW[s.id] && changeFor(s);
    var ch = changeFor(s);
    var score = showingOld ? ch.was : s.score;
    var klass = showingOld
      ? (ch.was >= MATCH_MIN ? 'hi' : ch.was >= CLOSE_MIN ? 'mid' : 'lo')
      : scoreClass(s);
    return '<div class="ar-card-scorebox"><div class="ar-score-wrap">' +
      (showingOld ? '' : scoreDeltaHtml(s)) +
      '<div class="ar-score ' + klass + '">' + (score == null ? '—' : score + '<small>%</small>') + '</div></div></div>';
  }

  function latestVersion(s) {
    var h = historyFor(s);
    return h[h.length - 1] || null;
  }

  function lastScorePref(s) {
    if (!s.pref) return null;
    var edits = editsFor(s.pref.id);
    var last = edits[edits.length - 1];
    if (last && last.before) return last.before;
    var seeds = cseSeedPrefs();
    for (var i = 0; i < seeds.length; i++) {
      if (seeds[i].id === s.pref.id) return seeds[i];
    }
    return null;
  }

  function lastScoreParts(s) {
    var pref = lastScorePref(s);
    if (pref) {
      return scoreAgainst(s, pref).parts.map(function (p) {
        return { id: p.id, label: p.label, note: p.note, rel: Math.round((p.v || 0) * 100), weight: p.weight };
      });
    }
    var v = latestVersion(s);
    return v && v.parts && v.parts.length ? v.parts : null;
  }

  function editedHtml(prefId) {
    var edits = editsFor(prefId);
    if (!edits.length) return '';
    return '<em class="ar-edited">' + ico('history') +
      (edits.length > 1 ? 'Edited ' + edits.length + ' times · last ' : 'Edited ') + timeAgo(edits[edits.length - 1].at) +
      '<button type="button" class="ar-edited-clear" data-clear-history="' + prefId + '">Clear</button></em>';
  }

  function historyHtml(s) {
    var h = historyFor(s);
    if (!h.length) return '';
    var rows = h.slice().reverse().map(function (e) {
      var up = e.now > e.was;
      return '<li><span>Edit ' + e.n + ' <em>' + timeAgo(e.at) + '</em></span>' +
        '<span class="ar-hist-scores">' + e.was + '%' + ico('arrow_forward') +
        '<b class="' + (up ? 'up' : 'down') + '">' + e.now + '%</b></span></li>';
    }).join('');
    return '<div class="ar-hist"><div class="ar-hist-head">' + ico('history') + 'Score history</div><ul>' + rows + '</ul></div>';
  }

  function timeAgo(ts) {
    var min = Math.round((Date.now() - ts) / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    var h = Math.round(min / 60);
    if (h < 24) return h + ' hr ago';
    var d = Math.round(h / 24);
    return d + ' day' + (d === 1 ? '' : 's') + ' ago';
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
    }
    return '';
  }

  /** How many students in a program clear a preference's minimum score. */
  function matchCount(programId, pref) {
    return STUDENTS.filter(function (s) {
      return s.program === programId && scoreAgainst(s, pref).score >= MATCH_MIN;
    }).length;
  }

  /* ——— Dashboard: funnel ——— */

  /** Each funnel row shows students matching the preference out of everyone at that stage. */
  function renderFunnel() {
    var set = baseSet();
    var counts = STAGES.map(function (_, i) {
      return set.filter(function (s) { return s.stage >= i; }).length;
    });
    var matched = STAGES.map(function (_, i) {
      return set.filter(function (s) { return s.stage >= i && s.bucket === 0; }).length;
    });
    $('funnel-clear').hidden = state.stage === null;
    var shownCounts = state.program === 'all' ? counts : matched;
    $('funnel-mini').innerHTML = STAGES.map(function (st, i) {
      return '<button type="button" class="ar-mini-step' + (state.stage === i ? ' active' : '') + '" data-stage="' + i + '" title="' + esc(st.name) + '">' +
        '<span class="ar-mini-top">' + ico(st.icon) + '<b>' + shownCounts[i] + '</b></span><small>' + esc(st.name) + '</small></button>';
    }).join('');
    $('funnel-grid').innerHTML = STAGES.map(function (st, i) {
      var shown = state.program === 'all' ? counts : matched;
      var prev = i ? shown[i - 1] : shown[0];
      var conv = prev ? Math.round((shown[i] / prev) * 100) : 0;
      return (
        '<button type="button" class="ar-frow' + (state.stage === i ? ' active' : '') + '" data-stage="' + i + '">' +
        '<span class="ar-frow-ico">' + ico(st.icon) + '</span>' +
        '<span class="ar-frow-name">' + esc(st.name) + '<small>' + (i ? conv + '% of previous' : 'Students in funnel') + '</small></span>' +
        (state.program === 'all'
          ? '<strong>' + counts[i] + '</strong>'
          : '<strong title="' + matched[i] + ' of ' + counts[i] + ' students match the preference">' + matched[i] + '</strong>') +
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
        var tone = w >= 30 ? 3 : w >= 15 ? 2 : 1;
        return (
          '<div class="ar-pref-row"><span>' + esc(c.label) + '</span><strong>' + esc(criterionLine(c.id, pref.criteria[c.id])) +
          '<i class="ar-weight w' + tone + '" title="Weight">' + w + '</i></strong></div>'
        );
      }).join('');
  }

  /** All programs shows the funnel alone; a picked program adds what its preference looks for. */
  function renderPrefPanel() {
    var panel = document.querySelector('.ar-prefs-panel');
    var edit = $('pref-panel-edit');
    var all = state.program === 'all';
    panel.hidden = all;
    document.querySelector('.ar-insights').classList.toggle('single', all);
    if (all) return;
    var pref = findPref(state.program, state.prefId);
    if (!pref) {
      $('pref-panel-title').textContent = 'No preference yet';
      edit.textContent = 'Create';
      $('prefs-summary').innerHTML = '<p class="panel-lead">' + esc(programById(state.program).name) +
        ' has no preference, so its students aren’t scored. Create one to sort them into Matches, Close and Below.</p>';
      return;
    }
    $('pref-panel-title').textContent = 'Preferences';
    edit.textContent = 'Edit';
    $('prefs-summary').innerHTML = '<div class="ar-pref-list">' + prefRows(pref) + '</div>';
    var on = CRITERIA.filter(function (c) { return pref.criteria[c.id].weight > 0; });
    $('prefs-mini').innerHTML = on.map(function (c) {
      var line = criterionLine(c.id, pref.criteria[c.id]);
      return '<span class="ar-mini-val" title="' + esc(c.label + ': ' + line) + '">' + esc(line) + '</span>';
    }).join('');
  }

  /** The best accepted test if there is one, otherwise the first test taken. */
  function headlineTest(s) {
    var part = (s.parts || []).filter(function (p) { return p.id === 'test'; })[0];
    if (part && part.v > 0) return part.note;
    return s.test ? testNote(s.test) : 'No test';
  }

  /* ——— Dashboard: students ——— */

  function attrChipsFromParts(parts, oldVersion) {
    return parts
      .filter(function (p) { return p.weight > 0; })
      .sort(function (a, b) { return b.weight - a.weight; })
      .map(function (p) {
        var rel = p.rel == null ? 0 : p.rel;
        var tone = rel >= 75 ? 'hi' : rel >= 40 ? 'mid' : 'lo';
        var tip = p.label + ': ' + p.note + ' · level with or ahead of ' + rel + '% of applicants';
        return '<span class="ar-attr' + (oldVersion ? ' old' : '') + '" title="' + esc(tip) + '"><b class="ar-attr-pct ' + tone + '">' + rel + '%</b>' +
          '<i class="ar-attr-dot" aria-hidden="true"></i>' + esc(p.label) + '</span>';
      }).join('');
  }

  function versionChip(s, showingOld) {
    if (!savedView() || !changeFor(s) || !lastScoreParts(s)) return '';
    return '<button type="button" class="ar-attr ar-version-chip' + (showingOld ? ' on' : '') + '" data-view-version="' + s.id + '">' +
      (showingOld ? 'Now' : 'Last score') + '</button>';
  }

  function attrChips(s) {
    if (!s.pref) return '<span class="ar-attr none">' + ico('tune') + 'No preference yet</span>';
    var showingOld = savedView() && VERSION_VIEW[s.id];
    var oldParts = showingOld ? lastScoreParts(s) : null;
    return attrChipsFromParts(oldParts || s.parts, !!oldParts) + versionChip(s, !!oldParts);
  }

  function stagePill(s) {
    var st = STAGES[s.stage];
    return '<span class="ar-stage-pill">' + ico(st.icon) + esc(st.name) + '</span>';
  }

  /** Without a picked program there's no shared preference, so cards show profile facts instead of a score. */
  function cardHtml(s) {
    var all = state.program === 'all';
    var facts = [s.stream, 'Class 12 ' + s.class12 + '%', headlineTest(s)].map(function (f) {
      return '<span class="ar-attr none">' + esc(f) + '</span>';
    }).join('');
    return (
      '<div class="ar-card" role="button" tabindex="0" data-student="' + s.id + '">' +
      '<div class="ar-card-top"><div class="avatar">' + esc(s.initials) + '</div>' +
      '<div class="ar-card-who"><strong>' + esc(s.name) + '</strong><small>' + esc(s.id) + '</small></div>' +
      (all ? '' : cardScoreBox(s)) +
      cardSaveHtml(s.id) + '</div>' +
      '<div class="ar-attrs">' + (all ? facts : attrChips(s)) + '</div>' +
      '<div class="ar-card-meta"><span>' + esc(programById(s.program).name) + '</span>' + stagePill(s) + '</div>' +
      '</div>'
    );
  }

  function cardSaveHtml(id) {
    var on = isSaved(id);
    var tip = on ? 'Unsave' : 'Save';
    return '<button type="button" class="ar-card-save' + (on ? ' on' : '') + '" data-card-save="' + id + '" aria-pressed="' + on + '" aria-label="' + tip + '" data-tip="' + tip + '">' +
      ico('bookmark') + '</button>';
  }

  function bucketDefs() {
    return [
      { name: 'Matches preference', range: MATCH_MIN + '–100%', color: 'var(--green-500)' },
      { name: 'Close', range: CLOSE_MIN + '–' + (MATCH_MIN - 1) + '%', color: 'var(--yellow-500)' },
      { name: 'Below', range: 'Under ' + CLOSE_MIN + '%', color: 'var(--red-500)' },
    ];
  }

  /** Every student is on the board; cards are added in chunks as a column scrolls so large lists stay fast. */
  var BOARD_CHUNK = 100;
  var TABLE_LIMIT = 300;
  var boardCols = [];

  /** Students of programs without a preference get their own full-width section; it replaces the columns when that program is picked. */
  function renderBoard() {
    var list = visibleSet();
    if (state.program === 'all') {
      boardCols = [{ items: list, shown: 0 }];
      $('board').innerHTML =
        '<div class="ar-col-list ar-col-grid ar-col-plain gr-scroll" data-col="0">' +
        (list.length ? '' : '<div class="ar-col-empty">No students match these filters.</div>') + '</div>';
      growColumn(0);
      return;
    }
    boardCols = [0, 1, 2, 3].map(function (i) {
      return { items: list.filter(function (s) { return s.bucket === i; }), shown: 0 };
    });
    var unscored = boardCols[3].items;
    var scoredView = !!findPref(state.program, state.prefId);
    var html = scoredView ? bucketDefs().map(function (b, i) {
      var items = boardCols[i].items;
      return (
        '<div class="ar-col"><div class="ar-col-head"><h3><i style="background:' + b.color + '"></i>' + b.name +
        '<b class="ar-col-count">' + items.length + '</b></h3><small>' + b.range + '</small></div>' +
        '<div class="ar-col-list gr-scroll" data-col="' + i + '">' +
        (items.length ? '' : '<div class="ar-col-empty">No students here yet.</div>') + '</div></div>'
      );
    }).join('') : '';
    if (unscored.length) {
      var names = PROGRAMS.filter(function (p) {
        return unscored.some(function (s) { return s.program === p.id; });
      });
      html +=
        '<div class="ar-col ar-col-wide"><div class="ar-col-head"><h3><i style="background:var(--gray-300)"></i>No preference yet</h3>' +
        '<small>Not scored · ' + unscored.length + '</small></div>' +
        '<div class="ar-col-note">' + esc(names.map(function (p) { return p.name; }).join(', ')) +
        (names.length === 1 ? ' has' : ' have') + ' no preference, so these students aren’t scored.' +
        names.map(function (p) {
          return '<button type="button" class="btn btn-primary btn-sm" data-create-pref="' + p.id + '">' + ico('add') +
            'Create preference' + (names.length > 1 ? ' for ' + esc(p.name) : '') + '</button>';
        }).join('') + '</div>' +
        '<div class="ar-col-list ar-col-grid gr-scroll" data-col="3"></div></div>';
    }
    $('board').innerHTML = html;
    boardCols.forEach(function (_, i) { if (document.querySelector('[data-col="' + i + '"]')) growColumn(i); });
  }

  function growColumn(i) {
    var col = boardCols[i];
    if (!col || col.shown >= col.items.length) return;
    var next = col.items.slice(col.shown, col.shown + BOARD_CHUNK);
    col.shown += next.length;
    document.querySelector('[data-col="' + i + '"]').insertAdjacentHTML('beforeend', next.map(cardHtml).join(''));
  }

  document.addEventListener('scroll', function (e) {
    var el = e.target;
    var plain = document.querySelector('.ar-col-plain');
    if (plain && plain.getBoundingClientRect().bottom < window.innerHeight + 600) growColumn(0);
    if (!el.getAttribute || !el.hasAttribute('data-col')) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) growColumn(Number(el.getAttribute('data-col')));
  }, true);

  function tableMore(n) {
    return n > TABLE_LIMIT ? '<div class="ar-col-empty">Showing top ' + TABLE_LIMIT + ' of ' + n + '. Use search or Export to get everyone.</div>' : '';
  }

  function studentCell(s) {
    var sub = state.program === 'all' ? s.id + ' · ' + programById(s.program).name : s.id + ' · ' + s.city;
    return '<td class="ar-td-student"><div class="ar-who"><span class="avatar sm">' + esc(s.initials) + '</span>' +
      '<div><span class="ar-name">' + esc(s.name) + '</span><small class="ar-cell-sub">' + esc(sub) + '</small></div></div></td>';
  }

  function saveCell(s) {
    return '<td class="ar-td-save">' + cardSaveHtml(s.id) + '</td>';
  }

  /** A program's tables are split by match level; columns are the preference's criteria with each student's score on them. */
  function renderTable(list) {
    var pref = state.program === 'all' ? null : findPref(state.program, state.prefId);
    if (!pref) {
      $('table').innerHTML = '<div class="panel ar-table-wrap">' + (list.length
        ? '<table class="ar-table ar-table-fit"><thead><tr><th class="ar-th-student">Student</th><th>Stage</th><th>Stream</th><th>Class 12</th><th>Test</th><th>Budget</th><th>Location</th><th>Intake</th><th class="ar-th-save"></th></tr></thead><tbody>' +
          list.slice(0, TABLE_LIMIT).map(function (s) {
            return '<tr data-student="' + s.id + '">' + studentCell(s) + '<td>' + stagePill(s) + '</td><td>' + esc(s.stream) + '</td>' +
              '<td>' + esc(markNote(s.mark12)) + '</td><td>' + esc(headlineTest(s)) + '</td><td>₹' + s.budget[0] + '–' + s.budget[1] + 'L</td>' +
              '<td>' + esc(s.city) + ' · ' + s.km + ' km</td><td>' + esc(s.intake) + '</td>' + saveCell(s) + '</tr>';
          }).join('') + '</tbody></table>' + tableMore(list.length)
        : '<div class="ar-col-empty">No students match these filters.</div>') + '</div>';
      return;
    }
    var crits = CRITERIA.filter(function (c) { return c.id !== 'board' && pref.criteria[c.id].weight > 0; });
    var head = '<tr><th class="ar-th-student">Student</th><th class="ar-th-match">Match</th>' + crits.map(function (c) {
      return '<th title="Percentile among ' + esc(programById(state.program).name) + ' applicants on ' + esc(c.label.toLowerCase()) + '">' +
        esc(c.id === 'activities' ? 'Activities' : c.label) + ' <i class="ar-th-weight">' + pref.criteria[c.id].weight + '</i></th>';
    }).join('') + '<th class="ar-th-save"></th></tr>';
    $('table').innerHTML = bucketDefs().map(function (b, i) {
      var items = list.filter(function (s) { return s.bucket === i; });
      var rows = items.slice(0, TABLE_LIMIT).map(function (s) {
        return '<tr data-student="' + s.id + '">' + studentCell(s) +
          '<td><div class="ar-score-wrap"><span class="ar-score ' + scoreClass(s) + '">' + scoreHtml(s) + '</span>' + scoreDeltaHtml(s) + '</div></td>' +
          crits.map(function (c) {
            var part = s.parts.filter(function (p) { return p.id === c.id; })[0];
            var tip = part.note + ' · level with or ahead of ' + part.rel + '% of ' + programById(s.program).name + ' applicants';
            return '<td><b class="ar-cell-score" title="' + esc(tip) + '">' + part.rel + '<small>%</small></b></td>';
          }).join('') + saveCell(s) + '</tr>';
      }).join('');
      var shut = !!state.collapsed[i];
      return (
        '<section class="panel ar-table-wrap' + (shut ? ' collapsed' : '') + '">' +
        '<button type="button" class="ar-table-head" data-toggle-table="' + i + '" aria-expanded="' + !shut + '">' +
        '<h3><i style="background:' + b.color + '"></i>' + b.name + '<b class="ar-col-count">' + items.length + '</b></h3>' +
        '<span class="ar-table-meta"><small>' + b.range + '</small>' + ico('expand_more') + '</span></button>' +
        (shut ? '' : items.length
          ? '<div class="ar-table-scroll"><table class="ar-table ar-table-fit"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' + tableMore(items.length)
          : '<div class="ar-col-empty">No students here yet.</div>') +
        '</section>'
      );
    }).join('');
  }

  function renderFilters(list) {
    var chips = [];
    if (!savedView() && state.stage !== null) chips.push('<button type="button" class="ar-filter-chip" data-clear="stage">Reached: ' + esc(STAGES[state.stage].name) + ico('close') + '</button>');
    if (filtersOn()) {
      var f = state.filters;
      if (f.min !== '' || f.max !== '') {
        var range = f.min !== '' && f.max !== '' ? f.min + '–' + f.max + '%' : f.min !== '' ? f.min + '%+' : 'up to ' + f.max + '%';
        chips.push('<button type="button" class="ar-filter-chip" data-clear="score">Match ' + range + ico('close') + '</button>');
      }
      var pref = findPref(state.program, state.prefId);
      activeFilters().forEach(function (id) {
        chips.push('<button type="button" class="ar-filter-chip" data-clear="crit:' + id + '">' + esc(filterChipText(id, f.vals[id], pref)) + ico('close') + '</button>');
      });
    }
    renderFilterBtn();
    $('active-filters').innerHTML = chips.join('');
    $('active-filters').hidden = !chips.length;

    $('students-count').textContent = list.length;
    if ($('filter-show-count')) $('filter-show-count').textContent = list.length;
    $('students-title').textContent = savedView() ? 'Saved students' : state.program === 'all' ? 'All students' : 'Students by match';
  }

  function renderFilterBtn() {
    var n = activeFilterCount();
    $('filter-wrap').hidden = !filtersOn();
    $('filter-count').hidden = !n;
    $('filter-count').textContent = n;
    $('filter-btn').classList.toggle('active', n > 0);
  }

  function testUnit(rq) {
    return rq.kind === 'rank' ? 'rank' : rq.kind === 'percentile' ? '%ile' : '/ ' + fmtNum(rq.max);
  }

  function filterChipText(id, v, pref) {
    var c = CRITERIA.filter(function (x) { return x.id === id; })[0];
    var label = c.label;
    var unit = RANGE_FILTERS[id] ? RANGE_FILTERS[id].unit : '';
    if (id === 'test') {
      var rq = filterTest(pref);
      label = rq.name;
      unit = testUnit(rq);
    }
    if (PICK_FILTERS[id]) return label + ': ' + v.val;
    var lo = v.min !== undefined && v.min !== '';
    var hi = v.max !== undefined && v.max !== '';
    var money = id === 'budget';
    var num = function (n) { return money ? '₹' + n + 'L' : n; };
    var suffix = money ? '' : unit === 'rank' ? ' rank' : unit === '%' ? '%' : ' ' + unit;
    if (lo && hi) return label + ' ' + num(v.min) + '–' + num(v.max) + suffix;
    if (lo) return label + ' ≥ ' + num(v.min) + suffix;
    if (hi) return label + ' ≤ ' + num(v.max) + suffix;
    return label + ' taken';
  }

  /** The smallest and largest value among the program's students, used as input hints. */
  function extent(get) {
    var lo = Infinity;
    var hi = -Infinity;
    baseSet().forEach(function (s) {
      var x = get(s);
      if (x === null || x === undefined || isNaN(x)) return;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    });
    return lo === Infinity ? ['', ''] : [Math.floor(lo), Math.ceil(hi)];
  }

  /** Min/max fields with the unit inside each box; attr is the data attribute the input handler reads. */
  function rangeInputs(attr, v, unit) {
    var val = function (k) { return v[k] === undefined ? '' : v[k]; };
    var money = unit === '₹L';
    var field = function (k, ph) {
      return '<label class="ar-fin">' + (money ? '<span>₹</span>' : '') +
        '<input type="number" placeholder="' + ph + '" ' + attr(k) + ' value="' + val(k) + '" aria-label="' + ph + '">' +
        '<span>' + (money ? 'L' : esc(unit)) + '</span></label>';
    };
    return '<div class="ar-frange">' + field('min', 'Min') + '<i>–</i>' + field('max', 'Max') + '</div>';
  }

  function pickOptions(get) {
    var seen = {};
    baseSet().forEach(function (s) { get(s).forEach(function (x) { if (x) seen[x] = true; }); });
    return Object.keys(seen).sort();
  }

  var FILTER_ORDER = ['test', 'class12', 'class10', 'location', 'budget', 'stream', 'board', 'activities'];

  /** One row per criterion the preference scores on, filtering on each student's actual value. */
  function renderFilterMenu() {
    var pref = findPref(state.program, state.prefId);
    if (!pref) return;
    var f = state.filters;
    var crit = function (id) { return CRITERIA.filter(function (c) { return c.id === id; })[0]; };
    var numAttr = function (id) { return function (k) { return 'data-fnum="' + id + ':' + k + '"'; }; };
    var span = function (ext, unit) {
      if (ext[0] === '') return '';
      return 'In data: ' + ext[0] + '–' + ext[1] + (unit === '%' ? '%' : unit ? ' ' + unit : '');
    };
    var row = function (labelHtml, control) {
      return '<div class="ar-ffield">' + labelHtml + control + '</div>';
    };
    var label = function (text, hint) {
      return '<span class="ar-flabel"' + (hint ? ' title="' + esc(hint) + '"' : '') + '>' + esc(text) + '</span>';
    };
    var field = function (id) {
      var v = f.vals[id] || {};
      var name = crit(id).label;
      if (id === 'test') {
        var rq = filterTest(pref);
        var unit = testUnit(rq);
        var ext = extent(function (s) {
          var t = s.tests.filter(function (x) { return x.name.toLowerCase() === rq.name.toLowerCase(); })[0];
          return t ? t.value : null;
        });
        return row('<select class="ar-fselect ar-flabel-select" data-fsel="test" aria-label="Test" title="' + esc(span(ext, unit)) + '">' +
          pref.criteria.test.tests.map(function (t) {
            return '<option' + (t.name === rq.name ? ' selected' : '') + '>' + esc(t.name) + '</option>';
          }).join('') + '</select>', rangeInputs(numAttr('test'), v, unit));
      }
      if (id === 'budget') {
        var lo = extent(function (s) { return s.budget[0]; })[0];
        var hi = extent(function (s) { return s.budget[1]; })[1];
        return row(label(name, lo === '' ? '' : 'In data: ₹' + lo + '–' + hi + 'L'), rangeInputs(numAttr(id), v, '₹L'));
      }
      if (RANGE_FILTERS[id]) {
        var u = RANGE_FILTERS[id].unit;
        return row(label(name, span(extent(RANGE_FILTERS[id].get), u)), rangeInputs(numAttr(id), v, u));
      }
      return row(label(name), '<select class="ar-fselect" data-fsel="' + id + '" aria-label="' + esc(name) + '"><option value="">Any</option>' +
        pickOptions(PICK_FILTERS[id]).map(function (o) {
          return '<option' + (v.val === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>');
    };
    var scoreAttr = function (k) { return 'data-fscore="' + k + '" min="0" max="100"'; };
    $('filter-menu').innerHTML =
      '<div class="ar-fmenu-head"><strong>Filters</strong><button type="button" class="ar-link" data-freset>Reset</button></div>' +
      '<div class="ar-fmenu-body gr-scroll">' +
      row(label('Match score'), rangeInputs(scoreAttr, f, '%')) +
      FILTER_ORDER.filter(function (id) { return pref.criteria[id].weight > 0; }).map(field).join('') +
      row(label('Intake'), '<select class="ar-fselect" data-fintake aria-label="Intake">' +
        [['', 'All intakes'], ['2026', '2026'], ['2027', '2027'], ['2028', '2028'], ['2029', '2029']].map(function (o) {
          return '<option value="' + o[0] + '"' + (state.intake === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>') +
      '</div>' +
      '<div class="ar-fmenu-foot"><button type="button" class="btn btn-primary btn-sm" data-fdone>Show <span id="filter-show-count">' +
      visibleSet().length + '</span> students</button></div>';
  }

  function renderStudents() {
    var pref = filtersOn() && findPref(state.program, state.prefId);
    if (pref) {
      Object.keys(state.filters.vals).forEach(function (id) {
        if (!(pref.criteria[id].weight > 0)) delete state.filters.vals[id];
      });
    }
    var list = visibleSet();
    renderFilters(list);
    var noneSaved = savedView() && !Object.keys(SAVED).length;
    $('saved-empty').hidden = !noneSaved;
    $('board').hidden = noneSaved || state.layout !== 'board';
    $('table').hidden = noneSaved || state.layout !== 'table';
    if (noneSaved) return;
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
    var active = findPref(state.program, state.prefId) || { id: null, name: 'No preference' };
    $('pref-label').textContent = active.name;
    $('pref-menu').innerHTML =
      prefsFor(state.program).map(function (p) {
        return '<button type="button" class="ar-menu-item' + (p.id === active.id ? ' active' : '') + '" data-pref="' + p.id + '">' +
          esc(p.name) + '</button>';
      }).join('') +
      '<button type="button" class="ar-menu-item ar-menu-add" data-create-pref="' + state.program + '">' + ico('add') + 'Create preference</button>';
  }

  function applyInsightsCollapse() {
    var shut = localStorage.getItem('admitright_insights_collapsed') === '1';
    document.querySelector('.ar-insights').classList.toggle('collapsed', shut);
    document.querySelectorAll('[data-toggle-insights]').forEach(function (b) {
      b.setAttribute('aria-label', shut ? 'Expand' : 'Collapse');
      b.setAttribute('aria-expanded', String(!shut));
    });
  }

  function renderDashboard() {
    applyInsightsCollapse();
    rescore();
    renderTopMenus();
    renderFunnel();
    renderPrefPanel();
    renderStudents();
  }

  /* ——— Programs & preferences view ——— */

  function renderPrograms() {
    $('pp-program-count').textContent = PROGRAMS.length;
    $('pp-program-list').innerHTML = PROGRAMS.map(function (p) {
      var n = STUDENTS.filter(function (s) { return s.program === p.id; }).length;
      return (
        '<button type="button" class="ar-pp-program' + (state.ppProgram === p.id ? ' active' : '') + '" data-pp-program="' + p.id + '">' +
        '<strong>' + esc(p.name) + '</strong><small>' + fmtNum(n) + '</small></button>'
      );
    }).join('');

    var program = programById(state.ppProgram);
    var prefs = prefsFor(program.id);
    if (!prefs.length) {
      $('pp-cards').innerHTML =
        '<article class="panel ar-pp-empty">' + ico('tune') + '<h3>No preferences yet</h3>' +
        '<button type="button" class="btn btn-primary btn-sm" id="pp-create-empty" data-create-pref="' + program.id + '">' +
        ico('add') + 'Create preference</button></article>';
      return;
    }
    $('pp-cards').innerHTML = prefs.map(function (pref, i) {
      var n = matchCount(program.id, pref);
      var chips = CRITERIA.filter(function (c) { return pref.criteria[c.id].weight > 0; }).map(function (c) {
        return '<span class="ar-crit">' + ico(c.icon) + esc(criterionLine(c.id, pref.criteria[c.id])) + '</span>';
      }).join('');
      return (
        '<article class="panel ar-pp-card">' +
        '<div class="ar-pp-card-head"><h3>' + esc(pref.name) + '</h3>' +
        (i === 0 ? '<span class="ar-default">Default</span>' : '') + '</div>' +
        '<div class="ar-crits">' + chips + '</div>' +
        '<div class="ar-pp-card-foot"><span><b>' + n + '</b> match' +
        editedHtml(pref.id) + '</span>' +
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
    $('view-dashboard').hidden = view === 'programs';
    $('view-dashboard').classList.toggle('ar-saved-view', view === 'saved');
    $('view-programs').hidden = view !== 'programs';
    document.querySelectorAll('.ar-rail-item[data-go]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-go') === view);
    });
    if (view === 'programs') renderPrograms();
    else renderDashboard();
    window.scrollTo(0, 0);
  }

  /* ——— Drawer ——— */

  /** modal shows a centred popup instead of the side panel. */
  function openDrawer(title, body, foot, modal) {
    $('drawer').classList.toggle('modal', !!modal);
    $('drawer').classList.remove('ar-confirm-modal');
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
      (!s.pref ? esc(program.name) + ' has no preference yet, so this student isn’t scored. ' :
        gaps.length ? 'Gaps: ' + esc(gaps.join(', ')) + '. ' : 'No major gaps against this preference. ') +
      '<br><br><strong>Next best step:</strong> ' + next
    );
  }

  var profileCollapsed = { match: true, profile: true, other: true, log: true };

  function profileSection(key, title, html, cls) {
    return (
      '<details class="ar-block ar-fold' + (cls ? ' ' + cls : '') + '" data-fold="' + key + '"' + (profileCollapsed[key] ? '' : ' open') + '>' +
      '<summary><h4>' + title + '</h4>' + ico('expand_more') + '</summary>' +
      '<div class="ar-fold-body">' + html + '</div></details>'
    );
  }

  function hashOf(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  /** Extra profile answers from the AI flow; CSV columns win, otherwise stable demo values per student. */
  function otherDetails(s) {
    var x = s.extra || {};
    var h = hashOf(s.id);
    function pickBy(list, shift) {
      return list[(h >>> shift) % list.length];
    }
    var goals = {
      'btech-cse': ['Software engineer', 'Product engineer', 'Startup founder'],
      'btech-ai': ['ML engineer', 'AI researcher', 'Data scientist'],
      'bsc-ds': ['Data analyst', 'Data scientist', 'Business analyst'],
      bba: ['Product manager', 'Consultant', 'Family business'],
      bdes: ['UX designer', 'Product designer', 'Brand designer'],
    }[s.program] || ['Not shared'];
    return [
      ['Career goal', x.careerGoal || pickBy(goals, 1)],
      ['Came from', x.source || pickBy(['GradRight AI flow', 'Counsellor referral', 'Education fair', 'School partnership'], 3)],
      ['Languages', x.languages || pickBy(['English, Hindi', 'English, Hindi, Punjabi', 'English, Hindi, Bengali', 'English'], 5)],
      ['Needs hostel', x.hostel || (s.km > 60 ? 'Yes' : pickBy(['No', 'Maybe'], 7))],
      ['Scholarship interest', x.scholarship || pickBy(['Yes', 'No', 'Merit only'], 9)],
      ['Education loan', x.loan || pickBy(['Interested', 'Not needed', 'Exploring'], 11)],
      ['Profile created', fmtDateTime(s.createdOn)],
      ['Last active', s.lastActive ? fmtDateTime(s.lastActive) : 'Not yet'],
    ];
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

    var scored = s.parts.filter(function (p) { return p.weight > 0; });
    var matches = scored.map(function (p) {
      var pct = Math.round(p.v * 100);
      var tone = pct >= 99 ? 'hi' : pct >= 50 ? 'mid' : 'lo';
      return (
        '<div class="ar-match-row">' +
        '<span class="ar-match-label">' + esc(p.label) + '</span>' +
        '<em>' + esc(p.note) + '</em>' +
        '<b class="ar-match-score ' + tone + '">' + pct + '%</b>' +
        '</div>'
      );
    }).join('');
    if (scored.length) {
      matches += '<div class="ar-match-total"><span>Match score</span>' +
        '<span></span>' +
        '<b class="ar-match-score ' + scoreClass(s) + '">' + s.score + '%</b></div>';
    }

    var other = '<div class="ar-facts">' + otherDetails(s).map(function (f) {
      return '<div><span>' + f[0] + '</span><strong>' + esc(f[1]) + '</strong></div>';
    }).join('') + '</div>';

    var facts = [
      ['Location', s.city + ' · ' + s.km + ' km'], ['Stream', s.stream],
      ['Class 10', markNote(s.mark10)], ['Class 12', markNote(s.mark12)],
      ['Fee budget', '₹' + s.budget[0] + '–' + s.budget[1] + 'L'], ['Program (AOI)', program.name],
      ['Intake', s.intake], ['GR ID', s.id],
    ].map(function (f) {
      return '<div><span>' + f[0] + '</span><strong>' + esc(f[1]) + '</strong></div>';
    }).join('');

    var accepted = s.pref ? (s.pref.criteria.test.tests || []).map(function (rq) { return rq.name.toLowerCase(); }) : null;
    var tests = s.tests.length
      ? s.tests.map(function (t) {
        var ok = !!accepted && accepted.indexOf(t.name.toLowerCase()) !== -1;
        return '<div class="ar-test-row"><span>' + esc(t.name) +
          (t.custom ? '<i class="ar-tag">Custom</i>' : '') + '</span>' +
          '<strong>' + esc(testNote(t).slice(t.name.length + 1)) + '</strong>' +
          (accepted ? '<em class="' + (ok ? 'ok' : '') + '">' + (ok ? 'Accepted' : 'Not in preference') + '</em>' : '<em></em>') + '</div>';
      }).join('')
      : '<p class="ar-muted">No tests added.</p>';

    var activities = s.activities.map(function (a) {
      var custom = ACTIVITIES.map(function (x) { return x.toLowerCase(); }).indexOf(a.toLowerCase()) === -1;
      return '<span class="pill">' + esc(a) + (custom ? ' · custom' : '') + '</span>';
    }).join('');

    if (!s.pref) {
      matches = '<p class="ar-muted">' + esc(program.name) + ' has no preference, so there’s nothing to match against.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm ar-block-btn" data-create-pref="' + s.program + '">' + ico('add') + 'Create preference</button>';
    }

    var body =
      '<div class="ar-hero"><div class="avatar lg">' + esc(s.initials) + '</div>' +
      '<div class="ar-hero-who"><h3>' + esc(s.name) + '</h3><p>' + esc(s.id) + ' · ' + esc(program.name) + '</p>' +
      '<p style="margin-top:0.35rem">' + stagePill(s) + '</p></div>' +
      '<div class="ar-ring" style="--p:' + (s.score || 0) + ';--c:' + scoreColor(s) + '"><span>' + (s.score === null ? '—' : s.score + '%') + '</span></div></div>' +
      profileSection('ai', ico('auto_awesome') + 'AI summary', aiSummary(s), 'ar-ai') +
      profileSection('match', 'Preference match', matches) +
      profileSection('profile', 'Profile', '<div class="ar-facts">' + facts + '</div>' +
        '<div class="ar-subsec"><span class="ar-sublabel">Test scores</span>' + tests + '</div>' +
        '<div class="ar-subsec"><span class="ar-sublabel">Extracurricular</span><div class="ar-tags">' + activities + '</div></div>') +
      profileSection('other', 'Other details', other) +
      profileSection('log', 'Activity log', '<div class="ar-journey">' + journey + '</div>');

    openDrawer(
      'Student profile',
      body,
      saveBtnHtml(s.id) +
      '<button type="button" class="btn btn-primary btn-sm" data-action="reach">Reach out</button>'
    );
  }

  function saveBtnHtml(id) {
    var on = isSaved(id);
    return '<button type="button" class="btn btn-secondary btn-sm btn-icon ar-save-btn' + (on ? ' on' : '') + '" data-action="shortlist" data-id="' + id + '">' +
      ico(on ? 'bookmark_added' : 'bookmark_add') + (on ? 'Saved' : 'Save to list') + '</button>';
  }

  /* ——— Preference editor ——— */

  var editing = null; // { programId, prefId|null, draft, customTest }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function weightSelect(cid, w, on) {
    return '<input type="number" class="ar-weight-input" min="1" max="100" step="1" data-weight="' + cid + '" value="' + w + '" aria-label="Weight, 1 to 100"' + (on ? '' : ' disabled') + ' />';
  }

  function checks(name, all, selected) {
    return '<div class="ar-checks">' + all.map(function (v) {
      return '<label class="ar-check"><input type="checkbox" name="' + name + '" value="' + esc(v) + '"' +
        (selected.indexOf(v) !== -1 ? ' checked' : '') + ' />' + esc(v) + '</label>';
    }).join('') + '</div>';
  }

  function unitSuffix(rq) {
    if (rq.kind === 'rank') return 'or better';
    if (rq.kind === 'percentile') return '%ile or more';
    return '/ ' + fmtNum(rq.max) + ' or more';
  }

  function testsEditor(c) {
    var rows = c.test.tests.map(function (rq, i) {
      var info = testInfo(rq.name);
      return (
        '<div class="ar-req">' +
        '<div class="ar-req-name"><strong>' + esc(rq.name) + '</strong>' +
        '<small>' + (rq.custom ? '<i class="ar-tag">Custom</i>' : esc((info && info.hint) || 'Score out of ' + fmtNum(rq.max))) + '</small></div>' +
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

  /** Callers run readEditor() before changing the draft, so the DOM doesn't overwrite their change here. */
  function rerenderEditor() {
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

    /** Unticked criteria keep their settings but get weight 0, so they don't count. */
    function row(cid, label, control, hint) {
      var on = c[cid].weight > 0;
      return '<div class="ar-form-row' + (on ? '' : ' off') + '" data-crit-row="' + cid + '"><div class="field">' +
        '<label class="ar-include"><input type="checkbox" data-include="' + cid + '"' + (on ? ' checked' : '') + ' />' + label + '</label>' +
        '<div class="ar-crit-body">' + control + (hint ? '<p class="ar-hint">' + hint + '</p>' : '') + '</div></div>' +
        weightSelect(cid, on ? c[cid].weight : c[cid].saved || 10, on) + '</div>';
    }
    var gradeHint = 'Boards grade differently. CGPA is converted × 9.5 and IB points ÷ 45 before comparing.';

    return (
      '<label class="ar-editor-program">' + ico('school') + '<div><span>Program</span>' +
      '<select id="pe-program" aria-label="Program">' + PROGRAMS.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === program.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('') + '</select></div>' + ico('expand_more') + '</label>' +
      '<div class="field"><label>Preference name</label><input type="text" id="pe-name" value="' + esc(d.name) + '" placeholder="e.g. Delhi NCR high achievers" /></div>' +

      '<p class="ar-score-preview ar-preview-line" id="pe-preview"></p>' +

      '<div class="ar-editor-sub"><h4>What counts toward the score</h4><span>Weight (1–100)</span></div>' +
      '<p class="ar-hint ar-editor-hint">Tick a criterion to include it in the match score. Unticked ones are ignored.</p>' +
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
      row('activities', 'Extracurricular', activityEditor(c))
    );
  }

  function readEditor() {
    var body = $('drawer-body');
    var d = editing.draft;
    function num(id, fallback) {
      var v = Number($(id).value);
      return $(id).value === '' || isNaN(v) ? fallback : v;
    }
    var saved = {};
    function weight(cid) {
      var v = Math.round(Number(body.querySelector('[data-weight="' + cid + '"]').value));
      var prev = d.criteria[cid].weight || d.criteria[cid].saved || 10;
      saved[cid] = isNaN(v) || v < 1 ? prev : Math.min(100, v);
      return body.querySelector('[data-include="' + cid + '"]').checked ? saved[cid] : 0;
    }
    function checked(name) {
      return Array.prototype.map.call(body.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
    }
    var bmin = num('pe-bmin', d.criteria.budget.min);
    var bmax = num('pe-bmax', d.criteria.budget.max);
    d.name = $('pe-name').value.trim();
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
    };
    Object.keys(saved).forEach(function (cid) { d.criteria[cid].saved = saved[cid]; });
  }

  function updatePreview() {
    readEditor();
    var d = editing.draft;
    var total = STUDENTS.filter(function (s) { return s.program === editing.programId; }).length;
    var n = matchCount(editing.programId, d);
    $('pe-preview').innerHTML = '<b>' + n + '</b> of ' + total + ' students in this program would match (' + MATCH_MIN + '%+).';
  }

  function openEditor(programId, prefId) {
    var program = programById(programId);
    var existing = prefId ? findPref(programId, prefId) : null;
    editing = {
      programId: programId,
      fromProgramId: programId,
      prefId: existing ? existing.id : null,
      draft: existing ? clone(existing) : { id: null, name: '', criteria: baseCriteria(program) },
    };
    openDrawer(
      existing ? 'Edit preference' : 'Create preference',
      editorHtml(),
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="save-pref">' + (existing ? 'Save changes' : 'Create preference') + '</button>',
      true
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
    var change = null;
    if (editing.prefId && editing.fromProgramId !== editing.programId) {
      d.id = editing.prefId;
      PREFS[editing.fromProgramId] = prefsFor(editing.fromProgramId).filter(function (p) { return p.id !== d.id; });
      PREFS[editing.programId] = list.concat(d);
      if (state.prefId === d.id) state.prefId = null;
    } else if (editing.prefId) {
      d.id = editing.prefId;
      var before = list.filter(function (p) { return p.id === d.id; })[0];
      PREFS[editing.programId] = list.map(function (p) { return p.id === d.id ? d : p; });
      if (before) change = recordChange(editing.programId, before, d);
    } else {
      d.id = newId();
      PREFS[editing.programId] = list.concat(d);
    }
    savePrefs();
    var created = !editing.prefId;
    var programId = editing.programId;
    var prefId = d.id;
    closeDrawer();
    state.ppProgram = programId;
    if (state.program === programId && (created || state.prefId === prefId)) state.prefId = prefId;
    if (state.view === 'programs') renderPrograms();
    else renderDashboard();
    toast(created ? 'Preference created.'
      : change && (change.up || change.down)
        ? 'Preference saved. ' + change.up + ' scored higher, ' + change.down + ' lower.'
        : 'Preference saved. No scores changed.');
  }

  function confirmDeletePref(programId, prefId) {
    if (prefsFor(programId).length <= 1) return;
    var pref = findPref(programId, prefId);
    openDrawer(
      'Delete preference',
      '<div class="ar-confirm">' + ico('delete') +
      '<p>Delete <strong>“' + esc(pref.name) + '”</strong> from ' + esc(programById(programId).name) + '? This can’t be undone.</p></div>',
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-confirm-delete="' + prefId + '" data-confirm-program="' + programId + '">Delete</button>',
      true
    );
    $('drawer').classList.add('ar-confirm-modal');
  }

  function deletePref(programId, prefId) {
    var list = prefsFor(programId);
    if (list.length <= 1) return;
    PREFS[programId] = list.filter(function (p) { return p.id !== prefId; });
    if (state.prefId === prefId) state.prefId = null;
    savePrefs();
    if (CHANGES[prefId]) {
      delete CHANGES[prefId];
      saveChanges();
    }
    closeDrawer();
    renderPrograms();
    toast('Preference deleted.');
  }

  /* ——— Events ——— */

  var MENUS = [['program-btn', 'program-menu'], ['pref-btn', 'pref-menu'], ['range-btn', 'range-menu'], ['intake-btn', 'intake-menu'], ['filter-btn', 'filter-menu']];

  /** The toolbar menu and the Filters row both drive the same intake year. */
  function setIntake(year) {
    state.intake = year;
    document.querySelectorAll('[data-intake]').forEach(function (b) {
      var on = b.getAttribute('data-intake') === year;
      b.classList.toggle('active', on);
      if (on) $('intake-label').textContent = b.textContent;
    });
    renderDashboard();
  }

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
    resetFilters();
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
        if (MENUS[i][1] === 'filter-menu') renderFilterMenu();
        toggleMenu(MENUS[i][0], MENUS[i][1]);
        return;
      }
    }

    if (t.closest('[data-freset]')) {
      resetFilters();
      renderFilterMenu();
      renderStudents();
      return;
    }

    if (t.closest('[data-fdone]')) {
      closeMenus();
      return;
    }

    var clearHist = t.closest('[data-clear-history]');
    if (clearHist) {
      delete CHANGES[clearHist.getAttribute('data-clear-history')];
      saveChanges();
      renderPrograms();
      toast('Score history cleared.');
      return;
    }

    var version = t.closest('[data-view-version]');
    if (version) {
      e.preventDefault();
      var sid = version.getAttribute('data-view-version');
      VERSION_VIEW[sid] = !VERSION_VIEW[sid];
      renderStudents();
      return;
    }

    if (t.closest('[data-toggle-insights]')) {
      var wasShut = localStorage.getItem('admitright_insights_collapsed') === '1';
      localStorage.setItem('admitright_insights_collapsed', wasShut ? '0' : '1');
      applyInsightsCollapse();
      return;
    }

    var toggleTable = t.closest('[data-toggle-table]');
    if (toggleTable) {
      var ti = toggleTable.getAttribute('data-toggle-table');
      state.collapsed[ti] = !state.collapsed[ti];
      renderStudents();
      return;
    }

    var createPref = t.closest('[data-create-pref]');
    if (createPref) {
      closeMenus();
      openEditor(createPref.getAttribute('data-create-pref'));
      return;
    }

    var programItem = t.closest('[data-program]');
    if (programItem) {
      var pid = programItem.getAttribute('data-program');
      closeMenus();
      setProgram(pid);
      return;
    }

    var prefItem = t.closest('[data-pref]');
    if (prefItem) {
      state.prefId = prefItem.getAttribute('data-pref');
      resetFilters();
      closeMenus();
      renderDashboard();
      return;
    }

    var intakeItem = t.closest('[data-intake]');
    if (intakeItem) {
      closeMenus();
      setIntake(intakeItem.getAttribute('data-intake'));
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
      else {
        var current = findPref(state.program, state.prefId);
        openEditor(state.program, current && current.id);
      }
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

    var layout = t.closest('[data-view]');
    if (layout) {
      state.layout = layout.getAttribute('data-view');
      document.querySelectorAll('[data-view]').forEach(function (b) { b.classList.toggle('active', b === layout); });
      renderStudents();
      return;
    }

    var clear = t.closest('[data-clear]');
    if (clear) {
      var what = clear.getAttribute('data-clear');
      if (what === 'score') {
        state.filters.min = state.filters.max = '';
        renderStudents();
        return;
      }
      if (what.indexOf('crit:') === 0) {
        delete state.filters.vals[what.slice(5)];
        renderStudents();
        return;
      }
      if (what === 'stage') state.stage = null;
      else setProgram('all');
      renderDashboard();
      return;
    }

    var cardSave = t.closest('[data-card-save]');
    if (cardSave) {
      var savedNow = toggleSaved(cardSave.getAttribute('data-card-save'));
      toast(savedNow ? 'Saved to your list.' : 'Removed from your list.');
      renderStudents();
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
      confirmDeletePref(state.ppProgram, delPref.getAttribute('data-delete-pref'));
      return;
    }

    var confirmDel = t.closest('[data-confirm-delete]');
    if (confirmDel) {
      deletePref(confirmDel.getAttribute('data-confirm-program'), confirmDel.getAttribute('data-confirm-delete'));
      return;
    }

    var usePref = t.closest('[data-use-pref]');
    if (usePref) {
      state.program = state.ppProgram;
      state.prefId = usePref.getAttribute('data-use-pref');
      state.stage = null;
      resetFilters();
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
        readEditor();
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
      else if (act === 'shortlist') {
        var sid = action.getAttribute('data-id');
        var nowSaved = toggleSaved(sid);
        action.outerHTML = saveBtnHtml(sid);
        toast(nowSaved ? 'Saved to your list.' : 'Removed from your list.');
        renderStudents();
      }
      else if (act === 'reach') toast('Outreach queued for this student.');
    }
  });

  $('drawer-body').addEventListener('input', function () {
    if (editing) updatePreview();
  });
  $('drawer-body').addEventListener('change', function (e) {
    if (!editing) return;
    if (e.target.id === 'pe-program') {
      readEditor();
      var next = e.target.value;
      if (!editing.prefId) editing.draft.criteria = baseCriteria(programById(next));
      editing.programId = next;
      $('drawer-body').innerHTML = editorHtml();
      updatePreview();
      return;
    }
    var inc = e.target.getAttribute && e.target.getAttribute('data-include');
    if (inc) {
      if (!e.target.checked && !$('drawer-body').querySelector('[data-include]:checked')) {
        e.target.checked = true;
        toast('Keep at least one criterion in the score.');
        updatePreview();
        return;
      }
      e.target.closest('[data-crit-row]').classList.toggle('off', !e.target.checked);
      $('drawer-body').querySelector('[data-weight="' + inc + '"]').disabled = !e.target.checked;
      updatePreview();
      return;
    }
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

  $('drawer-body').addEventListener('toggle', function (e) {
    var key = e.target.getAttribute && e.target.getAttribute('data-fold');
    if (key) profileCollapsed[key] = !e.target.open;
  }, true);

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
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ar-pick')) e.target.click();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('ar-card')) {
      e.preventDefault();
      openStudent(e.target.getAttribute('data-student'));
    }
  });

  $('student-search').addEventListener('input', function (e) {
    state.query = e.target.value;
    renderStudents();
  });

  $('filter-menu').addEventListener('input', function (e) {
    var v = e.target.value.trim();
    var key = e.target.getAttribute('data-fscore');
    if (key) {
      state.filters[key] = v === '' ? '' : String(Math.max(0, Math.min(100, Math.round(Number(v)) || 0)));
      renderStudents();
      return;
    }
    var num = e.target.getAttribute('data-fnum');
    if (!num) return;
    var bits = num.split(':');
    var vals = state.filters.vals;
    vals[bits[0]] = vals[bits[0]] || {};
    vals[bits[0]][bits[1]] = v === '' || isNaN(Number(v)) ? '' : v;
    renderStudents();
  });

  /** Changing the test redraws the menu so its unit and hints follow; its old range no longer applies. */
  $('filter-menu').addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-fintake')) {
      setIntake(e.target.value);
      return;
    }
    var id = e.target.getAttribute('data-fsel');
    if (!id) return;
    var vals = state.filters.vals;
    if (id === 'test') {
      vals.test = { val: e.target.value };
      renderFilterMenu();
    } else if (e.target.value) {
      vals[id] = { val: e.target.value };
    } else {
      delete vals[id];
    }
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
        return [s.id, s.name, programById(s.program).name, s.pref ? s.pref.name : 'No preference', s.score === null ? '' : s.score, STAGES[s.stage].name, markNote(s.mark10), markNote(s.mark12),
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
