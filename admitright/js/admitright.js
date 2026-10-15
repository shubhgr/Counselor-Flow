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
    { id: 'recommended', name: 'Recommendation', icon: 'auto_awesome', hint: 'AI recommended your program' },
    { id: 'pdd', name: 'PDD opened', icon: 'visibility', hint: 'Opened the program detail page' },
    { id: 'applied', name: 'Application started', icon: 'edit_document', hint: 'Started the application' },
    { id: 'completed', name: 'Application completed', icon: 'task', hint: 'Submitted the application' },
    { id: 'admit', name: 'Admit offered', icon: 'verified', hint: 'Received an admit offer' },
    { id: 'fee', name: 'Fee paid', icon: 'payments', hint: 'Paid the seat fee' },
    { id: 'enrolled', name: 'Enrolled', icon: 'school', hint: 'Confirmed enrolment' },
  ];

  /** Things a student can do at any point, outside the funnel order. */
  var ACTIONS = [
    { id: 'shortlisted', name: 'Shortlisted', icon: 'bookmark' },
    { id: 'callback', name: 'Call back requested', icon: 'phone_callback' },
    { id: 'loan', name: 'Loan options explored', icon: 'account_balance' },
  ];

  /**
   * The source data still uses the old six steps (recommended, opened, shortlisted, expert, applied, enrolled).
   * Shortlisted and expert become actions; "applied" students are spread over the application → fee steps by GR ID.
   * oldEvents holds one date (or null) per old step.
   */
  function toFunnel(id, oldStage, oldEvents, loan, createdOn) {
    var h = hashOf(String(id) + ':funnel');
    var applied = oldEvents[4];
    var enrolled = oldEvents[5];
    var stage = [0, 1, 1, 1, 2, 6][oldStage] || 0;
    if (oldStage === 4) stage = 2 + (h % 4);
    var events = [oldEvents[0], oldEvents[1], applied, null, null, null, enrolled];
    if (applied) {
      var end = enrolled ? enrolled.getTime() : Math.min(TODAY.getTime(), applied.getTime() + 45 * 86400000);
      var gap = (end - applied.getTime()) / 4;
      for (var k = 3; k <= 5; k++) {
        if (k <= stage) events[k] = new Date(applied.getTime() + (k - 2) * gap);
      }
    }
    var explored = loan ? /interested|exploring/i.test(loan) : (h >>> 4) % 3 === 0;
    var loanAt = explored ? new Date(Math.min(TODAY.getTime(), (oldEvents[1] || createdOn).getTime() + 2 * 86400000)) : null;
    return {
      stage: stage,
      events: events,
      actions: { shortlisted: oldEvents[2] || null, callback: oldEvents[3] || null, loan: loanAt },
    };
  }

  function actionsDone(s) {
    return ACTIONS.filter(function (a) { return s.actions && s.actions[a.id]; }).map(function (a) { return a.id; });
  }

  /**
   * A student can explore several programs, each with its own funnel progress and actions. The data only has the main
   * program, so up to two more are demo values, stable per GR ID, in the first three funnel steps.
   */
  function programJourneys(s) {
    var list = [{ program: s.program, stage: s.stage, events: s.events, actions: s.actions }];
    var h = hashOf(String(s.id) + ':programs');
    var others = PROGRAMS.filter(function (p) { return p.id !== s.program; });
    var start = (s.events[0] || s.createdOn).getTime();
    for (var k = 0; k < h % 3; k++) {
      var p = others[(h >>> (4 + k * 3)) % others.length];
      if (list.some(function (j) { return j.program === p.id; })) continue;
      var stage = (h >>> (12 + k * 2)) % 3;
      var offset = (k + 1) * 9 * 86400000;
      var events = STAGES.map(function (_, i) {
        return i <= stage ? new Date(Math.min(TODAY.getTime(), start + offset + i * 12 * 86400000)) : null;
      });
      var actions = {};
      ACTIONS.forEach(function (a, ai) {
        var done = (h >>> (18 + k * 3 + ai)) % 2 === 1;
        actions[a.id] = done ? new Date(Math.min(TODAY.getTime(), events[stage].getTime() + (ai + 1) * 3 * 86400000)) : null;
      });
      list.push({ program: p.id, stage: stage, events: events, actions: actions });
    }
    return list;
  }

  var PROGRAMS = [
    { id: 'btech-cse', name: 'B.Tech Computer Science', fee: 18, stream: 'PCM', seats: 240, prefName: 'JEE Main 85+ coders' },
    { id: 'btech-ai', name: 'B.Tech AI & ML', fee: 20, stream: 'PCM', seats: 120, prefName: 'Maths-strong AI aspirants' },
    { id: 'bsc-ds', name: 'B.Sc Data Science', fee: 12, stream: 'PCM', seats: 90, prefName: 'Analytical PCM students' },
    { id: 'bba', name: 'BBA', fee: 10, stream: 'Any', seats: 180, prefName: 'Business-minded all-rounders' },
    { id: 'bdes', name: 'B.Des', fee: 16, stream: 'Any', seats: 60, prefName: 'UCEED & NATA creatives' },
    { id: 'bcom', name: 'B.Com (Hons)', fee: 8, stream: 'Commerce', seats: 120, prefName: 'Commerce toppers' },
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

  /* binary criteria are met or not (Yes/No); the rest earn partial credit and show a percentage. */
  var CRITERIA = [
    { id: 'location', label: 'Location', icon: 'location_on', binary: true },
    { id: 'test', label: 'Test score', icon: 'quiz' },
    { id: 'class12', label: 'Class 12', icon: 'school' },
    { id: 'class10', label: 'Class 10', icon: 'menu_book' },
    { id: 'budget', label: 'Fee budget', icon: 'payments' },
    { id: 'stream', label: 'Stream', icon: 'science', binary: true },
    { id: 'board', label: 'Class 12 board', icon: 'account_balance', binary: true },
    { id: 'activities', label: 'Extracurricular', icon: 'sports_soccer', binary: true },
  ];

  function isBinary(id) {
    return CRITERIA.some(function (c) { return c.id === id && c.binary; });
  }

  /** Stored history parts only keep rel (credit × 100); live parts carry v. */
  function partMet(p) {
    return (p.v != null ? p.v : (p.rel || 0) / 100) >= 1;
  }

  function yesNoHtml(p, cls) {
    var met = partMet(p);
    return '<b class="' + cls + ' ' + (met ? 'hi' : 'lo') + '">' + (met ? 'Yes' : 'No') + '</b>';
  }
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
      var oldEvents = [0, 1, 2, 3, 4, 5].map(function (k) {
        return k <= stage ? new Date(createdOn.getTime() + 600000 + k * gapMs) : null;
      });
      var funnel = toFunnel('GR-' + (24180 + i * 37), stage, oldEvents, '', createdOn);
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
        stage: funnel.stage,
        createdOn: createdOn,
        daysAgo: daysAgo,
        events: funnel.events,
        actions: funnel.actions,
        lastActive: oldEvents[stage],
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
  var OLD_STAGE_IDS = ['recommended', 'opened', 'shortlisted', 'expert', 'applied', 'enrolled'];

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
    var stage = OLD_STAGE_IDS.indexOf(r.stage);
    var created = parseStamp(r.created_at || r.created_on) || TODAY;
    var funnel = toFunnel(r.id, stage === -1 ? 0 : stage, STAGE_COLUMNS.map(function (c) { return parseStamp(r[c]); }), r.loan, created);
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
      stage: funnel.stage,
      createdOn: created,
      daysAgo: Math.max(0, Math.floor((TODAY - created) / 86400000)),
      events: funnel.events,
      actions: funnel.actions,
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

  /* data/students-data.js embeds the CSV so the dashboard works when index.html is opened straight from disk. */
  var BUNDLED_STUDENTS = window.ADMITRIGHT_STUDENTS_CSV ? studentsFromCsv(window.ADMITRIGHT_STUDENTS_CSV) : [];
  if (BUNDLED_STUDENTS.length) STUDENTS = BUNDLED_STUDENTS;

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
      out[p.id] = [{ id: newId(), name: p.prefName, criteria: baseCriteria(p) }];
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
      } else {
        /* Default ids are time-based, so they must be stored once for visit snapshots to match later. */
        localStorage.setItem(PREFS_KEY, JSON.stringify(defaults));
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

  /** The first preference of a program is its default; it can be duplicated but not edited or deleted. */
  function isDefaultPref(programId, prefId) {
    var first = prefsFor(programId)[0];
    return !!first && first.id === prefId;
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
        return { v: s.km <= p.radius ? 1 : 0, raw: -s.km, note: s.km + ' km away' };
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
        return { v: hit ? 1 : 0, raw: hit + s.activities.length / 100, note: s.activities.join(', ') };
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
    stageMode: 'funnel',
    action: null,
    layout: 'board',
    query: '',
    range: null, // { from, to, preset } as whole days, or null for all time
    intake: '2027',
    ppProgram: PROGRAMS[0].id,
    collapsed: {},
    filters: { min: '', max: '', vals: {} },
    chatId: null,
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
    return !state.range || (s.createdOn >= state.range.from && s.createdOn < addDays(state.range.to, 1));
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
        if (!savedView() && state.stage !== null && !atStage(s, state.stage)) return false;
        if (!savedView() && state.action && !s.actions[state.action]) return false;
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

  var FILTERS_KEY = 'admitright_filters_v1';

  function saveFilters() {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        program: state.program, prefId: state.prefId, filters: state.filters, intake: state.intake,
      }));
    } catch (err) { /* storage full or blocked */ }
  }

  /** Saved filters only apply to the program and preference they were saved with. */
  function applySavedFilters() {
    resetFilters();
    try {
      var saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || 'null');
      if (!saved || !saved.filters || saved.program !== state.program || saved.prefId !== state.prefId) return;
      state.filters = saved.filters;
      if (typeof saved.intake === 'string') state.intake = saved.intake;
    } catch (err) { /* ignore bad saved filters */ }
  }

  /* The current program, preference and filters survive a refresh within the same tab. */
  var VIEW_KEY = 'admitright_view_v1';

  function saveViewState() {
    if (document.body.classList.contains('ar-locked')) return;
    try {
      sessionStorage.setItem(VIEW_KEY, JSON.stringify({
        program: state.program, prefId: state.prefId, filters: state.filters, intake: state.intake,
      }));
    } catch (err) { /* storage blocked */ }
  }

  function readViewState() {
    try {
      var v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null');
      return v && (v.program === 'all' || programById(v.program)) ? v : null;
    } catch (err) { return null; }
  }

  (function restoreViewState() {
    var v = readViewState();
    if (!v) return;
    state.program = v.program;
    state.prefId = v.prefId;
    if (v.filters) state.filters = v.filters;
    if (typeof v.intake === 'string') state.intake = v.intake;
  })();

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
    return '<div class="ar-card-scorebox"><div class="ar-score-wrap">' + scoreDeltaHtml(s) +
      '<div class="ar-score ' + scoreClass(s) + '">' + scoreHtml(s) + '</div></div></div>';
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

  /* ——— Changes since a preference was last opened ———
     { programs: { programId: { ids: [...] } }, prefs: { prefId: { at, digits } } }
     ids only ever grow, so a preference's digits (one bucket per id, 3 = not in the program) cover
     exactly the students that existed when its dashboard was last opened. */
  var SEEN_KEY = 'admitright_seen_v1';
  try {
    ['admitright_visit_snap_v1', 'admitright_visit_prev_v1', 'admitright_visit_snap_v2', 'admitright_visit_prev_v2']
      .forEach(function (k) { localStorage.removeItem(k); });
  } catch (err) { /* blocked */ }

  function readSeen() {
    var seen = null;
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null'); } catch (err) { seen = null; }
    return seen && seen.programs && seen.prefs ? seen : { programs: {}, prefs: {} };
  }

  function writeSeen(seen) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (err) { /* storage full or blocked */ }
  }

  function markSeen(programId, pref) {
    var seen = readSeen();
    var prog = seen.programs[programId] || (seen.programs[programId] = { ids: [] });
    var index = {};
    prog.ids.forEach(function (id, i) { index[id] = i; });
    var digits = [];
    for (var i = 0; i < prog.ids.length; i++) digits.push('3');
    STUDENTS.forEach(function (s) {
      if (s.program !== programId) return;
      if (!Object.prototype.hasOwnProperty.call(index, s.id)) {
        index[s.id] = prog.ids.length;
        prog.ids.push(s.id);
        digits.push('3');
      }
      digits[index[s.id]] = String(bucketOf(scoreAgainst(s, pref).score));
    });
    seen.prefs[pref.id] = { at: Date.now(), digits: digits.join('') };
    writeSeen(seen);
  }

  function forgetSeen(prefId) {
    var seen = readSeen();
    if (!seen.prefs[prefId]) return;
    delete seen.prefs[prefId];
    writeSeen(seen);
  }

  /** Opening a preference's dashboard counts as seeing it; marked once per preference opened. */
  var lastSeenKey = null;
  function noteDashboardSeen() {
    if (document.body.classList.contains('ar-locked') || state.view !== 'dashboard' || state.program === 'all') return;
    var pref = findPref(state.program, state.prefId);
    if (!pref) return;
    var key = state.program + '|' + pref.id;
    if (key === lastSeenKey) return;
    lastSeenKey = key;
    markSeen(state.program, pref);
  }

  /** Bucket moves and new students since the preference was last opened; null if it never was. */
  function visitChanges(programId, pref, seen) {
    var entry = seen.prefs[pref.id];
    var prog = seen.programs[programId];
    if (!entry || !prog) return null;
    var index = {};
    prog.ids.forEach(function (id, i) { index[id] = i; });
    var out = { at: entry.at, up: 0, down: 0, fresh: [0, 0, 0] };
    STUDENTS.forEach(function (s) {
      if (s.program !== programId) return;
      var b = bucketOf(scoreAgainst(s, pref).score);
      var i = index[s.id];
      var was = i === undefined || i >= entry.digits.length ? 3 : Number(entry.digits.charAt(i));
      if (was === 3) out.fresh[b] += 1;
      else if (was !== b) out[b < was ? 'up' : 'down'] += 1;
    });
    return out;
  }

  function bucketNums(counts) {
    return '<div class="ar-visit-nums">' + bucketDefs().map(function (d, i) {
      return '<span class="ar-visit-num' + (counts[i] ? '' : ' zero') + '"><i style="background:' + d.color + '"></i><b>' + counts[i] + '</b> ' + ['Matches', 'Close', 'Below'][i] + '</span>';
    }).join('') + '</div>';
  }

  function visitLabel(text, count) {
    return '<span class="ar-visit-label">' + text + (count === undefined ? '' : ' <b>' + count + '</b>') + '</span>';
  }

  /** When any preference of the program was last opened; the program's id list dates from then. */
  function programSeenAt(programId, seen) {
    return prefsFor(programId).reduce(function (at, p) {
      return seen.prefs[p.id] ? Math.max(at, seen.prefs[p.id].at) : at;
    }, 0);
  }

  /** Shown until the preference is first opened: where its students stand today, and who is new since the course was last viewed. */
  function visitSnapshotHtml(programId, pref, seen) {
    var prog = seen.programs[programId];
    var lastAt = prog ? programSeenAt(programId, seen) : 0;
    var known = {};
    if (lastAt) prog.ids.forEach(function (id) { known[id] = true; });
    var now = [0, 0, 0];
    var fresh = [0, 0, 0];
    STUDENTS.forEach(function (s) {
      if (s.program !== programId) return;
      var b = bucketOf(scoreAgainst(s, pref).score);
      now[b] += 1;
      if (lastAt && !known[s.id]) fresh[b] += 1;
    });
    var newCol = lastAt
      ? visitLabel('New since last viewed · ' + esc(timeAgo(lastAt)), fresh[0] + fresh[1] + fresh[2]) + bucketNums(fresh)
      : visitLabel('New since last viewed') + '<span class="ar-visit-note">This course hasn’t been viewed yet.</span>';
    return (
      '<div class="ar-visit">' +
      '<div class="ar-visit-head">Not opened yet · current numbers</div>' +
      '<div class="ar-visit-grid">' +
      '<div class="ar-visit-col">' + visitLabel('All students', now[0] + now[1] + now[2]) + bucketNums(now) + '</div>' +
      '<div class="ar-visit-col">' + newCol + '</div>' +
      '</div></div>'
    );
  }

  function visitHtml(programId, pref, seen) {
    var ch = visitChanges(programId, pref, seen);
    if (!ch) return visitSnapshotHtml(programId, pref, seen);
    var newTotal = ch.fresh[0] + ch.fresh[1] + ch.fresh[2];
    return (
      '<div class="ar-visit">' +
      '<div class="ar-visit-head">Since you last opened it · ' + esc(timeAgo(ch.at)) + '</div>' +
      '<div class="ar-visit-grid">' +
      '<div class="ar-visit-col">' + visitLabel('Moved buckets') +
      '<div class="ar-visit-nums">' +
      '<span class="ar-visit-num up' + (ch.up ? '' : ' zero') + '">' + ico('arrow_upward') + '<b>' + ch.up + '</b> moved up</span>' +
      '<span class="ar-visit-num down' + (ch.down ? '' : ' zero') + '">' + ico('arrow_downward') + '<b>' + ch.down + '</b> moved down</span>' +
      '</div></div>' +
      '<div class="ar-visit-col">' + visitLabel('New students', newTotal) +
      bucketNums(ch.fresh) + '</div>' +
      '</div></div>'
    );
  }

  /* ——— Dashboard: stages ——— */

  /** Funnel counts everyone who reached a step (and may have moved on); snapshot counts only those on it now. */
  function atStage(s, i) {
    return state.stageMode === 'snapshot' ? s.stage === i : s.stage >= i;
  }

  /** Each row shows students matching the preference out of everyone at that stage. */
  function renderFunnel() {
    var set = baseSet();
    var snapshot = state.stageMode === 'snapshot';
    var counts = STAGES.map(function (_, i) {
      return set.filter(function (s) { return atStage(s, i); }).length;
    });
    var matched = STAGES.map(function (_, i) {
      return set.filter(function (s) { return atStage(s, i) && s.bucket === 0; }).length;
    });
    document.querySelectorAll('[data-stage-mode]').forEach(function (b) {
      var on = b.getAttribute('data-stage-mode') === state.stageMode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $('funnel-clear').hidden = state.stage === null && !state.action;
    var shownCounts = state.program === 'all' ? counts : matched;
    $('funnel-mini').innerHTML = STAGES.map(function (st, i) {
      return '<button type="button" class="ar-mini-step' + (state.stage === i ? ' active' : '') + '" data-stage="' + i + '" title="' + esc(st.name) + '">' +
        '<span class="ar-mini-top">' + ico(st.icon) + '<b>' + shownCounts[i] + '</b></span><small>' + esc(st.name) + '</small></button>';
    }).join('');
    $('funnel-grid').innerHTML = STAGES.map(function (st, i) {
      var shown = state.program === 'all' ? counts : matched;
      var note;
      if (snapshot) {
        var total = shown.reduce(function (a, b) { return a + b; }, 0);
        note = (total ? Math.round((shown[i] / total) * 100) : 0) + '% of students are here now';
      } else {
        var prev = i ? shown[i - 1] : shown[0];
        note = i ? (prev ? Math.round((shown[i] / prev) * 100) : 0) + '% of previous' : 'Students in funnel';
      }
      return (
        '<button type="button" class="ar-frow' + (state.stage === i ? ' active' : '') + '" data-stage="' + i + '">' +
        '<span class="ar-frow-ico">' + ico(st.icon) + '</span>' +
        '<span class="ar-frow-name">' + esc(st.name) + '<small>' + note + '</small></span>' +
        (state.program === 'all'
          ? '<strong>' + counts[i] + '</strong>'
          : '<strong title="' + matched[i] + ' of ' + counts[i] + ' students match the preference">' + matched[i] + '</strong>') +
        '</button>'
      );
    }).join('') +
      '<div class="ar-factions"><span class="ar-factions-head">Additional user actions</span>' + ACTIONS.map(function (a) {
        var did = set.filter(function (s) { return s.actions[a.id]; });
        var n = state.program === 'all' ? did.length : did.filter(function (s) { return s.bucket === 0; }).length;
        var of = snapshot ? shownCounts.reduce(function (a, b) { return a + b; }, 0) : shownCounts[0];
        return (
          '<button type="button" class="ar-faction' + (state.action === a.id ? ' active' : '') + '" data-funnel-action="' + a.id + '">' +
          ico(a.icon) + '<span class="ar-faction-name">' + esc(a.name) + '<small>' + (of ? Math.round((n / of) * 100) : 0) + '% of students</small></span><strong>' + n + '</strong></button>'
        );
      }).join('') + '</div>';
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
    $('pref-panel-create').hidden = !!pref;
    edit.hidden = $('pref-panel-dup').hidden = !pref;
    if (!pref) {
      $('pref-panel-title').textContent = 'No preference yet';
      $('prefs-summary').innerHTML = '<p class="panel-lead">' + esc(programById(state.program).name) +
        ' has no preference, so its students aren’t scored. Create one to sort them into Matches, Close and Below.</p>';
      return;
    }
    $('pref-panel-title').textContent = 'Preferences';
    var locked = isDefaultPref(state.program, pref.id);
    edit.disabled = locked;
    edit.setAttribute('data-tip', locked ? 'Default can’t be edited, duplicate it' : 'Edit');
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

  var CHIP_ORDER = ['test', 'budget', 'academic', 'board'];

  function chipRank(p) {
    var i = CHIP_ORDER.indexOf(p.id);
    return i === -1 ? CHIP_ORDER.length : i;
  }

  /** Cards fold Class 12 and Class 10 into one academic chip, weighted the way the score weighs them. */
  function academicPart(parts) {
    var marks = parts.filter(function (p) { return p.id === 'class12' || p.id === 'class10'; });
    if (!marks.length) return null;
    var weight = 0;
    var rel = 0;
    marks.forEach(function (p) {
      weight += p.weight;
      rel += (p.rel == null ? 0 : p.rel) * p.weight;
    });
    return {
      id: 'academic', label: 'Academic score', weight: weight, rel: Math.round(rel / weight),
      tip: marks.map(function (p) { return p.label + ': ' + p.note + ', level with or ahead of ' + (p.rel || 0) + '% of applicants'; }).join(' · '),
    };
  }

  /** Test score, fee budget and academics lead; the rest follow by weight. */
  function attrChipsFromParts(parts) {
    var on = parts.filter(function (p) { return p.weight > 0; });
    var academic = academicPart(on);
    on = on.filter(function (p) { return p.id !== 'class12' && p.id !== 'class10'; });
    if (academic) on.push(academic);
    return on
      .sort(function (a, b) { return chipRank(a) - chipRank(b) || b.weight - a.weight; })
      .map(function (p) {
        var cls = 'ar-attr';
        var tail = '<i class="ar-attr-dot" aria-hidden="true"></i>' + esc(p.label) + '</span>';
        if (isBinary(p.id)) {
          var yesTip = p.label + ': ' + p.note + ' · ' + (partMet(p) ? 'meets' : 'doesn’t meet') + ' the preference';
          return '<span class="' + cls + '" title="' + esc(yesTip) + '">' + yesNoHtml(p, 'ar-attr-pct') + tail;
        }
        var rel = p.rel == null ? 0 : p.rel;
        var tone = rel >= 75 ? 'hi' : rel >= 40 ? 'mid' : 'lo';
        var tip = p.tip || p.label + ': ' + p.note + ' · level with or ahead of ' + rel + '% of applicants';
        return '<span class="' + cls + '" title="' + esc(tip) + '"><b class="ar-attr-pct ' + tone + '">' + rel + '%</b>' + tail;
      }).join('');
  }

  function attrChips(s) {
    if (!s.pref) return '<span class="ar-attr none">' + ico('tune') + 'No preference yet</span>';
    return attrChipsFromParts(s.parts);
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
      cardChatHtml(s.id) + cardSaveHtml(s.id) + cardMoreHtml(s.id) + '</div>' +
      '<div class="ar-attrs">' + (all ? facts : attrChips(s)) + '</div>' +
      '<div class="ar-card-meta"><span>' + esc(programById(s.program).name) + '</span>' + stagePill(s) + '</div>' +
      '</div>'
    );
  }

  function cardChatHtml(id) {
    var on = !!(CHATS[id] && CHATS[id].messages.length);
    return '<button type="button" class="ar-card-save ar-card-chat' + (on ? ' on' : '') + '" data-card-chat="' + id + '" aria-label="Chat" data-tip="Chat">' +
      ico('chat') + '</button>';
  }

  function cardSaveHtml(id) {
    var on = isSaved(id);
    var tip = on ? 'Unsave' : 'Save';
    return '<button type="button" class="ar-card-save' + (on ? ' on' : '') + '" data-card-save="' + id + '" aria-pressed="' + on + '" aria-label="' + tip + '" data-tip="' + tip + '">' +
      ico('bookmark') + '</button>';
  }

  function cardMoreHtml(id) {
    return '<button type="button" class="ar-card-save ar-card-more" data-card-more="' + id + '" aria-haspopup="menu" aria-label="More actions" data-tip="More">' +
      ico('more_vert') + '</button>';
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
    if (state.program === 'all' || savedView()) {
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
    if (cardMenuFor) hideCardMenu();
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
    return '<td class="ar-td-save"><div class="ar-td-actions">' + cardChatHtml(s.id) + cardSaveHtml(s.id) + cardMoreHtml(s.id) + '</div></td>';
  }

  /* Ticked students stay ticked while filters change; bulk actions only use the ones still in view. */
  var SELECTED = {};

  function checkCell(s) {
    return '<td class="ar-td-check"><label><input type="checkbox" data-select="' + s.id + '"' + (SELECTED[s.id] ? ' checked' : '') +
      ' aria-label="Select ' + esc(s.name) + '" /></label></td>';
  }

  /** scope is a match bucket index, or 'all' for a single table. */
  function checkHead(scope) {
    return '<th class="ar-th-check"><label><input type="checkbox" data-select-all="' + scope + '" aria-label="Select all" /></label></th>';
  }

  function rowOpen(s) {
    return '<tr data-student="' + s.id + '"' + (SELECTED[s.id] ? ' class="selected"' : '') + '>' + checkCell(s);
  }

  function scopeItems(scope, list) {
    list = list || visibleSet();
    return scope === 'all' ? list : list.filter(function (s) { return s.bucket === Number(scope); });
  }

  function selectedStudents() {
    return visibleSet().filter(function (s) { return SELECTED[s.id]; });
  }

  function bulkTargets() {
    var picked = selectedStudents();
    return picked.length ? picked : visibleSet();
  }

  function syncSelection() {
    var list = visibleSet();
    var n = list.filter(function (s) { return SELECTED[s.id]; }).length;
    $('bulk-label').textContent = n ? n + ' selected' : 'Bulk actions';
    document.querySelectorAll('#table [data-select]').forEach(function (box) {
      var on = !!SELECTED[box.getAttribute('data-select')];
      box.checked = on;
      box.closest('tr').classList.toggle('selected', on);
    });
    document.querySelectorAll('#table [data-select-all]').forEach(function (box) {
      var items = scopeItems(box.getAttribute('data-select-all'), list);
      var on = items.filter(function (s) { return SELECTED[s.id]; }).length;
      box.checked = on > 0 && on === items.length;
      box.indeterminate = on > 0 && on < items.length;
    });
  }

  function renderBulkMenu() {
    var picked = selectedStudents().length;
    var n = bulkTargets().length;
    var dis = n ? '' : ' disabled';
    var saved = savedView();
    var pickOnly = picked ? '' : ' disabled title="Tick students in the table first"';
    function item(attrs, icon, label) {
      return '<button type="button" class="ar-menu-item ar-card-menu-item" role="menuitem" ' + attrs + dis + '>' + ico(icon) + '<span>' + label + '</span></button>';
    }
    $('bulk-menu').innerHTML =
      '<div class="ar-bulk-head"><span>' + (picked ? picked + ' student' + (picked === 1 ? '' : 's') + ' selected' : 'All ' + n + ' student' + (n === 1 ? '' : 's') + ' in this view') + '</span>' +
      (picked ? '<button type="button" class="ar-link" data-bulk-clear>Clear</button>' : '') + '</div>' +
      '<div class="ar-card-menu-head">Campaign</div>' +
      CAMPAIGN_CHANNELS.map(function (c) {
        return item('data-bulk="campaign" data-bulk-channel="' + c.id + '"', c.icon, c.name + ' campaign');
      }).join('') +
      '<div class="ar-bulk-sep"></div>' +
      (saved ? item('data-bulk="unsave"' + pickOnly, 'bookmark_remove', 'Remove from saved') : item('data-bulk="shortlist"' + pickOnly, 'bookmark_add', 'Shortlist')) +
      item('data-bulk="download"', 'download', 'Download CSV');
  }

  function runBulk(action, channel) {
    var list = bulkTargets();
    if (!list.length) return;
    if (action === 'campaign') {
      openCampaign(list.map(function (s) { return s.id; }), channel);
      return;
    }
    if (action === 'download') {
      exportCsv(list);
      return;
    }
    list = selectedStudents();
    if (!list.length) return;
    var add = action === 'shortlist';
    var changed = list.filter(function (s) { return isSaved(s.id) !== add; });
    changed.forEach(function (s) { toggleSaved(s.id); });
    if (!add) list.forEach(function (s) { delete SELECTED[s.id]; });
    toast(add
      ? (changed.length ? changed.length + ' student' + (changed.length === 1 ? '' : 's') + ' added to Saved students.' : 'Already in Saved students.')
      : changed.length + ' student' + (changed.length === 1 ? '' : 's') + ' removed from Saved students.');
    renderStudents();
  }

  /** A program's tables are split by match level; columns are the preference's criteria with each student's score on them. */
  function renderTable(list) {
    var pref = state.program === 'all' ? null : findPref(state.program, state.prefId);
    if (!pref) {
      $('table').innerHTML = '<div class="panel ar-table-wrap">' + (list.length
        ? '<table class="ar-table ar-table-fit"><thead><tr>' + checkHead('all') + '<th class="ar-th-student">Student</th><th>Stage</th><th>Stream</th><th>Class 12</th><th>Test</th><th>Budget</th><th>Location</th><th>Intake</th><th class="ar-th-save"></th></tr></thead><tbody>' +
          list.slice(0, TABLE_LIMIT).map(function (s) {
            return rowOpen(s) + studentCell(s) + '<td>' + stagePill(s) + '</td><td>' + esc(s.stream) + '</td>' +
              '<td>' + esc(markNote(s.mark12)) + '</td><td>' + esc(headlineTest(s)) + '</td><td>₹' + s.budget[0] + '–' + s.budget[1] + 'L</td>' +
              '<td>' + esc(s.city) + ' · ' + s.km + ' km</td><td>' + esc(s.intake) + '</td>' + saveCell(s) + '</tr>';
          }).join('') + '</tbody></table>' + tableMore(list.length)
        : '<div class="ar-col-empty">No students match these filters.</div>') + '</div>';
      return;
    }
    var crits = CRITERIA.filter(function (c) { return c.id !== 'board' && pref.criteria[c.id].weight > 0; });
    var headCols = '<th class="ar-th-student">Student</th><th class="ar-th-match">Match</th>' + crits.map(function (c) {
      return '<th title="Percentile among ' + esc(programById(state.program).name) + ' applicants on ' + esc(c.label.toLowerCase()) + '">' +
        esc(c.id === 'activities' ? 'Activities' : c.label) + ' <i class="ar-th-weight">' + pref.criteria[c.id].weight + '</i></th>';
    }).join('') + '<th class="ar-th-save"></th></tr>';
    function head(scope) {
      return '<tr>' + checkHead(scope) + headCols;
    }
    function rowsFor(items) {
      return items.slice(0, TABLE_LIMIT).map(function (s) {
        return rowOpen(s) + studentCell(s) +
          '<td><div class="ar-score-wrap"><span class="ar-score ' + scoreClass(s) + '">' + scoreHtml(s) + '</span>' + scoreDeltaHtml(s) + '</div></td>' +
          crits.map(function (c) {
            var part = s.parts.filter(function (p) { return p.id === c.id; })[0];
            if (c.binary) {
              return '<td><span title="' + esc(part.note) + '">' + yesNoHtml(part, 'ar-cell-score ar-yesno') + '</span></td>';
            }
            var tip = part.note + ' · level with or ahead of ' + part.rel + '% of ' + programById(s.program).name + ' applicants';
            return '<td><b class="ar-cell-score" title="' + esc(tip) + '">' + part.rel + '<small>%</small></b></td>';
          }).join('') + saveCell(s) + '</tr>';
      }).join('');
    }
    if (savedView()) {
      $('table').innerHTML = '<section class="panel ar-table-wrap">' + (list.length
        ? '<div class="ar-table-scroll"><table class="ar-table ar-table-fit"><thead>' + head('all') + '</thead><tbody>' + rowsFor(list) + '</tbody></table></div>' + tableMore(list.length)
        : '<div class="ar-col-empty">No students match these filters.</div>') + '</section>';
      return;
    }
    $('table').innerHTML = bucketDefs().map(function (b, i) {
      var items = list.filter(function (s) { return s.bucket === i; });
      var rows = rowsFor(items);
      var shut = !!state.collapsed[i];
      return (
        '<section class="panel ar-table-wrap' + (shut ? ' collapsed' : '') + '">' +
        '<button type="button" class="ar-table-head" data-toggle-table="' + i + '" aria-expanded="' + !shut + '">' +
        '<h3><i style="background:' + b.color + '"></i>' + b.name + '<b class="ar-col-count">' + items.length + '</b></h3>' +
        '<span class="ar-table-meta"><small>' + b.range + '</small>' + ico('expand_more') + '</span></button>' +
        (shut ? '' : items.length
          ? '<div class="ar-table-scroll"><table class="ar-table ar-table-fit"><thead>' + head(i) + '</thead><tbody>' + rows + '</tbody></table></div>' + tableMore(items.length)
          : '<div class="ar-col-empty">No students here yet.</div>') +
        '</section>'
      );
    }).join('');
  }

  function renderFilters(list) {
    var chips = [];
    if (!savedView() && state.stage !== null) chips.push('<button type="button" class="ar-filter-chip" data-clear="stage">' + (state.stageMode === 'snapshot' ? 'Now at: ' : 'Reached: ') + esc(STAGES[state.stage].name) + ico('close') + '</button>');
    if (!savedView() && state.action) {
      var act = ACTIONS.filter(function (a) { return a.id === state.action; })[0];
      chips.push('<button type="button" class="ar-filter-chip" data-clear="action">Action: ' + esc(act.name) + ico('close') + '</button>');
    }
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
      '<div class="ar-fmenu-foot">' +
      '<button type="button" class="btn btn-secondary btn-sm" data-fsave>Save</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-fdone>Apply · <span id="filter-show-count">' +
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
    saveViewState();
    var noneSaved = savedView() && !Object.keys(SAVED).length;
    $('saved-empty').hidden = !noneSaved;
    $('board').hidden = noneSaved || state.layout !== 'board';
    $('table').hidden = noneSaved || state.layout !== 'table';
    if (!noneSaved) {
      if (state.layout === 'board') renderBoard();
      else renderTable(list);
    }
    syncSelection();
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
    noteDashboardSeen();
  }

  /* ——— Programs & preferences view ——— */

  function renderPrograms() {
    $('pp-program-count').textContent = PROGRAMS.length;
    $('pp-program-list').innerHTML = PROGRAMS.map(function (p) {
      return (
        '<button type="button" class="ar-pp-program' + (state.ppProgram === p.id ? ' active' : '') + '" data-pp-program="' + p.id + '">' +
        '<strong>' + esc(p.name) + '</strong></button>'
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
      var chips = CRITERIA.filter(function (c) { return pref.criteria[c.id].weight > 0; }).map(function (c) {
        return '<span class="ar-crit">' + ico(c.icon) + esc(criterionLine(c.id, pref.criteria[c.id])) + '</span>';
      }).join('');
      return (
        '<article class="panel ar-pp-card">' +
        '<div class="ar-pp-card-head"><h3>' + esc(pref.name) + '</h3>' +
        (i === 0 ? '<span class="ar-default">Default</span>' : '') + '</div>' +
        '<div class="ar-crits">' + chips + '</div>' +
        '<div class="ar-pp-card-foot">' +
        '<div class="ar-pp-actions">' +
        (i > 0 ? '<button type="button" class="btn btn-ghost btn-sm" data-delete-pref="' + pref.id + '">Delete</button>' : '') +
        '<button type="button" class="btn btn-secondary btn-sm" data-dup-pref="' + pref.id + '">' + ico('content_copy') + 'Duplicate</button>' +
        (i > 0 ? '<button type="button" class="btn btn-secondary btn-sm" data-edit-pref="' + pref.id + '">Edit</button>' : '') +
        '</div></div></article>'
      );
    }).join('');
  }

  function setView(view, fromRoute) {
    state.view = view;
    $('view-dashboard').hidden = view === 'programs' || view === 'chats' || view === 'events';
    $('view-dashboard').classList.toggle('ar-saved-view', view === 'saved');
    $('view-programs').hidden = view !== 'programs';
    $('view-chats').hidden = view !== 'chats';
    $('view-events').hidden = view !== 'events';
    document.querySelectorAll('.ar-rail-item[data-go]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-go') === view);
    });
    if (view === 'programs') renderPrograms();
    else if (view === 'chats') renderChats();
    else if (view === 'events') renderEvents();
    else renderDashboard();
    window.scrollTo(0, 0);
    if (!fromRoute) goTo(viewPath(view));
  }

  function viewPath(view) {
    if (view === 'events') {
      if (evCreate) return 'events/create';
      if (currentEventId) return 'events/' + encodeURIComponent(currentEventId);
      return 'events';
    }
    if (view === 'chats' && state.chatId) return 'chats/' + encodeURIComponent(state.chatId);
    return view || 'dashboard';
  }

  function parseRoute() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (err) { return p; }
    });
    var view = parts[0] || 'dashboard';
    if (['dashboard', 'programs', 'saved', 'events', 'chats'].indexOf(view) < 0) view = 'dashboard';
    var page = 'list';
    var id = null;
    if (view === 'events') {
      if (parts[1] === 'create') page = 'create';
      else if (parts[1]) { page = 'detail'; id = parts[1]; }
    }
    if (view === 'chats' && parts[1]) id = parts[1];
    return { view: view, page: page, id: id };
  }

  function routeHref(r) {
    if (r.view === 'events' && r.page === 'create') return '#/events/create';
    if (r.view === 'events' && r.page === 'detail' && r.id) return '#/events/' + encodeURIComponent(r.id);
    if (r.view === 'chats' && r.id) return '#/chats/' + encodeURIComponent(r.id);
    return '#/' + r.view;
  }

  function currentHash() {
    return location.hash || '#';
  }

  function goTo(path, replace) {
    var href = '#/' + String(path || 'dashboard').replace(/^#\/?/, '');
    if (currentHash() === href) {
      applyRoute();
      return;
    }
    if (replace) {
      history.replaceState(null, '', href);
      applyRoute();
      return;
    }
    location.hash = href;
  }

  function applyRoute() {
    var r = parseRoute();
    var href = routeHref(r);
    if (currentHash() !== href) history.replaceState(null, '', href);
    setView(r.view, true);
    if (r.view === 'events') {
      if (r.page === 'create') openEventCreate(true);
      else if (r.page === 'detail') {
        if (eventById(r.id)) openEvent(r.id, true);
        else {
          evCreate = null;
          currentEventId = null;
          showEventsPage('list');
          history.replaceState(null, '', '#/events');
        }
      } else {
        evCreate = null;
        currentEventId = null;
        showEventsPage('list');
      }
    } else {
      evCreate = null;
      currentEventId = null;
    }
    if (r.view === 'chats') {
      if (r.id && studentById(r.id)) {
        if (!CHATS[r.id]) CHATS[r.id] = { messages: [], unread: 0, seen: false, created: Date.now() };
        selectChat(r.id);
        renderChats();
      } else if (r.id) {
        state.chatId = null;
        history.replaceState(null, '', '#/chats');
        renderChats();
      }
    }
  }

  /* ——— Chats ———
     In-platform messages only: the student's phone and email are never shown to the university.
     { studentId: { messages: [{ from: 'uni' | 'student', text, at }], unread, seen } }
     seen: the student has read the university's latest message. */
  var CHATS_KEY = 'admitright_chats_v2';

  /* Demo only: seeded threads and replies stand in for the student side until real messaging is connected.
     Each message is [from, text, hours ago]. */
  var DEMO_THREADS = [
    { unread: 2, msgs: [
      ['student', 'Hi! Does BML Munjal offer scholarships for JEE Main above 90 percentile?', 30],
      ['student', 'Also, is hostel accommodation guaranteed for first-year students?', 29]] },
    { seen: true, msgs: [
      ['uni', 'Hi {first}, thanks for shortlisting {program}! Would you like to book a call with our admissions team?', 54],
      ['student', 'Yes, that would help. Is Saturday morning possible?', 50],
      ['uni', 'Saturday 11 AM works. We’ll share the invite here.', 49]] },
    { unread: 1, msgs: [
      ['uni', 'Hi {first}, we saw you opened the {program} page. Any questions we can help with?', 80],
      ['student', 'What is the last date to apply for the August intake?', 6]] },
    { msgs: [
      ['student', 'Is there a campus visit day coming up?', 120],
      ['uni', 'Yes! Our next open campus is on 24 October. Shall we reserve a spot for you?', 118],
      ['student', 'Please do, thank you!', 117]] },
    { seen: false, msgs: [
      ['uni', 'Hi {first}, applications for {program} are open. Have you had a chance to start yours?', 20]] },
    { unread: 1, msgs: [
      ['student', 'Can I apply with my CUET score instead of JEE?', 3]] },
    { seen: true, msgs: [
      ['student', 'Hello, what are the placement stats for the last batch?', 200],
      ['uni', 'Our last batch had 92% placements with a median package of ₹8.4 LPA. Happy to share the full report.', 196]] },
    { msgs: [
      ['uni', 'Hi {first}, congratulations on your Class 12 results! {program} could be a great fit for you.', 300],
      ['student', 'Thank you! I’m still comparing a few options.', 290]] },
  ];

  function demoChats() {
    var out = {};
    var n = 0;
    var now = Date.now();
    PROGRAMS.forEach(function (p, pi) {
      var pref = prefsFor(p.id)[0];
      var perBucket = pi === 0 ? 3 : 1;
      var byBucket = [[], [], []];
      STUDENTS.filter(function (s) { return s.program === p.id; })
        .sort(function (a, b) { return hashOf(a.id) - hashOf(b.id); })
        .forEach(function (s) {
          var b = pref ? bucketOf(scoreAgainst(s, pref).score) : 2;
          if (byBucket[b].length < perBucket) byBucket[b].push(s);
        });
      byBucket.forEach(function (list) {
        list.forEach(function (s) {
          var t = DEMO_THREADS[n % DEMO_THREADS.length];
          var stagger = n * 2;
          n += 1;
          var first = s.name.split(' ')[0];
          var msgs = t.msgs.map(function (m) {
            return { from: m[0], text: m[1].replace('{first}', first).replace('{program}', p.name), at: now - (m[2] + stagger) * 3600000 };
          });
          out[s.id] = { messages: msgs, unread: t.unread || 0, seen: !!t.seen };
        });
      });
    });
    return out;
  }

  var DEMO_REPLIES = [
    'Thanks for getting back to me! That really helps.',
    'Could you share more about the fee structure and scholarships?',
    'That sounds great. When is the application deadline?',
    'Thank you! I’ll go through the details and get back to you.',
  ];

  var CHATS = null;
  try { CHATS = JSON.parse(localStorage.getItem(CHATS_KEY) || 'null'); } catch (err) { CHATS = null; }
  try { localStorage.removeItem('admitright_chats_v1'); } catch (err) { /* blocked */ }
  if (!CHATS) {
    CHATS = demoChats();
    saveChats();
  }
  Object.keys(CHATS).forEach(function (id) {
    CHATS[id].messages = CHATS[id].messages.filter(function (m) { return !m.campaign || m.campaign === 'sms'; });
    if (!CHATS[id].messages.length) delete CHATS[id];
    else CHATS[id].typing = false;
  });
  saveChats();
  updateChatBadge();

  function saveChats() {
    try { localStorage.setItem(CHATS_KEY, JSON.stringify(CHATS)); } catch (err) { /* storage full or blocked */ }
  }

  function studentById(id) {
    return STUDENTS.filter(function (s) { return s.id === id; })[0] || null;
  }

  /* Campaigns go out through AdmitRight, so the university never sees the student's phone number or email. */
  var CAMPAIGNS_KEY = 'admitright_campaigns_v1';
  var CAMPAIGN_CHANNELS = [
    { id: 'email', name: 'Email', icon: 'mail' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'forum' },
    { id: 'sms', name: 'Text', icon: 'sms' }];
  var CAMPAIGN_TEMPLATES = [
    { id: 'reminder', name: 'Application reminder', subject: 'Applications for {program} are open',
      text: 'Hi {first}, applications for {program} at {university} are open. Start yours today and our admissions team will help you at every step.' },
    { id: 'scholarship', name: 'Scholarship update', subject: 'Scholarships you may qualify for',
      text: 'Hi {first}, based on your profile you may qualify for a merit scholarship on {program} at {university}. Apply before the deadline to be considered.' },
    { id: 'visit', name: 'Campus visit invite', subject: 'Visit our campus',
      text: 'Hi {first}, we would love to show you around {university}. Book a campus visit or a virtual tour to see {program} up close.' },
    { id: 'deadline', name: 'Deadline reminder', subject: 'The {program} deadline is coming up',
      text: 'Hi {first}, the application deadline for {program} at {university} is coming up soon. Finish your application to keep your seat in the running.' },
    { id: 'custom', name: 'Write your own', subject: '', text: '' }];
  var SMS_LIMIT = 160;

  var CAMPAIGNS = {};
  try { CAMPAIGNS = JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || '{}') || {}; } catch (err) { CAMPAIGNS = {}; }

  function saveCampaigns() {
    try { localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(CAMPAIGNS)); } catch (err) { /* storage full or blocked */ }
  }

  function channelById(id) {
    return CAMPAIGN_CHANNELS.filter(function (c) { return c.id === id; })[0] || CAMPAIGN_CHANNELS[0];
  }

  function fillTemplate(text, s) {
    return text
      .replace(/\{first\}/g, s.name.split(' ')[0])
      .replace(/\{program\}/g, programById(s.program).name)
      .replace(/\{university\}/g, 'BML Munjal University');
  }

  var cardMenuFor = null;

  function hideCardMenu() {
    var menu = $('card-menu');
    if (menu) menu.hidden = true;
    cardMenuFor = null;
  }

  function showCardMenu(btn) {
    var id = btn.getAttribute('data-card-more');
    if (cardMenuFor === id) {
      hideCardMenu();
      return;
    }
    var menu = $('card-menu');
    menu.innerHTML = '<div class="ar-card-menu-head">Campaign</div>' + CAMPAIGN_CHANNELS.map(function (c) {
      return '<button type="button" class="ar-menu-item ar-card-menu-item" role="menuitem" data-campaign="' + c.id + '" data-campaign-student="' + id + '">' +
        ico(c.icon) + '<span>' + c.name + ' campaign</span></button>';
    }).join('');
    menu.hidden = false;
    var r = btn.getBoundingClientRect();
    var h = menu.offsetHeight;
    var below = r.bottom + 6 + h <= window.innerHeight - 8;
    menu.style.top = (below ? r.bottom + 6 : Math.max(8, r.top - 6 - h)) + 'px';
    menu.style.left = Math.max(8, r.right - menu.offsetWidth) + 'px';
    cardMenuFor = id;
  }

  var campaign = null;

  /** For a group the {first} and {program} tokens stay in the draft and are filled in per student when it's sent. */
  function draftText(text, students) {
    return students.length === 1 ? fillTemplate(text, students[0]) : text.replace(/\{university\}/g, 'BML Munjal University');
  }

  function openCampaign(ids, channel) {
    var students = ids.map(studentById).filter(Boolean);
    if (!students.length) return;
    var tpl = CAMPAIGN_TEMPLATES[0];
    campaign = { students: students, channel: channel, template: tpl.id, subject: draftText(tpl.subject, students), text: draftText(tpl.text, students) };
    openDrawer('New campaign', '', '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm btn-icon" data-campaign-send>' + ico('send') + 'Send</button>', true);
    $('drawer').classList.add('ar-campaign-modal');
    renderCampaign();
  }

  function readCampaign() {
    if (!campaign || !$('cm-text')) return;
    campaign.text = $('cm-text').value;
    if ($('cm-subject')) campaign.subject = $('cm-subject').value;
  }

  function campaignToHtml(students) {
    if (students.length === 1) {
      var s = students[0];
      return '<div class="ar-cm-to"><div class="avatar">' + esc(s.initials) + '</div>' +
        '<div><strong>' + esc(s.name) + '</strong><small>' + esc(s.id) + ' · ' + esc(programById(s.program).name) + '</small></div></div>';
    }
    var names = students.slice(0, 2).map(function (x) { return x.name; }).join(', ');
    var rest = students.length - 2;
    return '<div class="ar-cm-to"><div class="ar-cm-stack">' + students.slice(0, 3).map(function (x) {
      return '<div class="avatar">' + esc(x.initials) + '</div>';
    }).join('') + '</div>' +
      '<div><strong>' + students.length + ' students</strong><small>' + esc(names) + (rest > 0 ? ' and ' + rest + ' more' : '') + '</small></div></div>';
  }

  function renderCampaign() {
    var students = campaign.students;
    var single = students.length === 1;
    var ch = channelById(campaign.channel);
    var past = single ? (CAMPAIGNS[students[0].id] || []).slice(-1)[0] : null;
    $('drawer-title').textContent = ch.name + ' campaign';
    $('drawer-body').innerHTML =
      campaignToHtml(students) +
      '<div class="ar-cm-channels" role="tablist" aria-label="Channel">' + CAMPAIGN_CHANNELS.map(function (c) {
        var on = c.id === ch.id;
        return '<button type="button" class="ar-cm-channel' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-campaign-channel="' + c.id + '">' +
          ico(c.icon) + c.name + '</button>';
      }).join('') + '</div>' +
      '<div class="field"><label for="cm-template">Template</label><select id="cm-template">' + CAMPAIGN_TEMPLATES.map(function (t) {
        return '<option value="' + t.id + '"' + (t.id === campaign.template ? ' selected' : '') + '>' + esc(t.name) + '</option>';
      }).join('') + '</select></div>' +
      (ch.id === 'email' ? '<div class="field"><label for="cm-subject">Subject</label><input type="text" id="cm-subject" value="' + esc(campaign.subject) + '" placeholder="Subject line" /></div>' : '') +
      '<div class="field"><label for="cm-text">Message</label><textarea id="cm-text" rows="5" placeholder="Write your message…">' + esc(campaign.text) + '</textarea>' +
      (ch.id === 'sms' ? '<small class="ar-cm-count" id="cm-count"></small>' : '') + '</div>' +
      (single ? '' : '<p class="ar-cm-note">' + ico('auto_fix_high') + '{first} and {program} are filled in for each student.</p>') +
      '<p class="ar-cm-note">' + ico('lock') + 'Sent through AdmitRight. ' + (single ? 'The student\'s phone number and email stay' : 'Students\' phone numbers and emails stay') + ' private.</p>' +
      (past ? '<p class="ar-cm-past">Last campaign: ' + esc(channelById(past.channel).name) + ', ' + esc(fmtDateTime(new Date(past.at))) + '</p>' : '');
    updateCampaignCount();
  }

  function updateCampaignCount() {
    var el = $('cm-count');
    if (!el) return;
    var n = $('cm-text').value.length;
    var parts = Math.max(1, Math.ceil(n / SMS_LIMIT));
    el.textContent = n + ' characters' + (parts > 1 ? ' · ' + parts + ' messages' : '');
    el.classList.toggle('over', n > SMS_LIMIT);
  }

  function campaignLogHtml(s) {
    var sent = (CAMPAIGNS[s.id] || []).slice().reverse();
    if (!sent.length) return '';
    return profileSection('campaigns', 'Campaigns sent · ' + sent.length, sent.map(function (c) {
      var ch = channelById(c.channel);
      return '<div class="ar-cp-extra on">' + ico(ch.icon) + '<span>' + esc(ch.name + (c.subject ? ': ' + c.subject : '')) + '</span>' +
        '<time>' + esc(fmtDateTime(new Date(c.at))) + '</time></div>';
    }).join(''));
  }

  function sendCampaign() {
    readCampaign();
    var students = campaign.students;
    var ch = channelById(campaign.channel);
    if (!campaign.text.trim()) {
      $('cm-text').focus();
      toast('Write a message first.');
      return;
    }
    if (ch.id === 'email' && !campaign.subject.trim()) {
      $('cm-subject').focus();
      toast('Add a subject line.');
      return;
    }
    var now = Date.now();
    students.forEach(function (s) {
      var subject = ch.id === 'email' ? fillTemplate(campaign.subject.trim(), s) : '';
      var text = fillTemplate(campaign.text.trim(), s);
      (CAMPAIGNS[s.id] = CAMPAIGNS[s.id] || []).push({
        channel: ch.id, template: campaign.template, subject: subject, text: text, at: new Date(now).toISOString() });
      if (ch.id !== 'sms') return;
      var thread = CHATS[s.id] = CHATS[s.id] || { messages: [], unread: 0, seen: false, typing: false };
      thread.messages.push({ from: 'uni', text: text, at: now, campaign: ch.id });
      thread.seen = false;
    });
    saveCampaigns();
    saveChats();
    closeDrawer();
    toast(ch.name + ' campaign sent to ' + (students.length === 1 ? students[0].name : students.length + ' students') + '.' +
      (ch.id === 'sms' ? ' It\'s in Chats.' : ''));
    if (state.view === 'chats') renderChats();
    else renderStudents();
  }

  function lastMessage(thread) {
    return thread.messages[thread.messages.length - 1] || null;
  }

  function starterOf(thread) {
    return thread.messages.length ? thread.messages[0].from : '';
  }

  /* ——— Chat filters ——— */
  var CF = { program: 'all', prefId: null, min: '', max: '', stages: [], extras: [], unread: false, by: '' };

  function resetChatFilters() {
    CF = { program: 'all', prefId: null, min: '', max: '', stages: [], extras: [], unread: false, by: '' };
    $('chat-search').value = '';
  }

  function cfPref() {
    if (CF.program === 'all' || !CF.prefId) return null;
    return prefsFor(CF.program).filter(function (p) { return p.id === CF.prefId; })[0] || null;
  }

  function chatThreads() {
    var pref = cfPref();
    return Object.keys(CHATS).map(function (id) {
      var s = studentById(id);
      return { id: id, s: s, thread: CHATS[id], score: s && pref ? scoreAgainst(s, pref).score : null };
    }).filter(function (c) { return c.s && c.thread.messages.length; }).sort(function (a, b) {
      var la = lastMessage(a.thread);
      var lb = lastMessage(b.thread);
      return (lb ? lb.at : b.thread.created || 0) - (la ? la.at : a.thread.created || 0);
    });
  }

  /** The student's progress in the filtered program (any program they explore), else in their main program; null if they don't explore it. */
  function cfJourney(s) {
    var journeys = programJourneys(s);
    if (CF.program === 'all') return journeys[0];
    return journeys.filter(function (j) { return j.program === CF.program; })[0] || null;
  }

  /** Everything except the quick filters, so the quick-filter chips can show what each would leave. */
  function cfPassesBase(c) {
    var s = c.s;
    var journey = cfJourney(s);
    if (!journey) return false;
    if (c.score !== null) {
      if (CF.min !== '' && c.score < Number(CF.min)) return false;
      if (CF.max !== '' && c.score > Number(CF.max)) return false;
    }
    if (CF.stages.length && CF.stages.indexOf(journey.stage) === -1) return false;
    if (CF.extras.length) {
      if (!CF.extras.some(function (x) { return journey.actions[x]; })) return false;
    }
    var q = $('chat-search').value.trim().toLowerCase();
    return !q || s.name.toLowerCase().indexOf(q) !== -1 || s.id.toLowerCase().indexOf(q) !== -1;
  }

  function cfPassesQuick(c) {
    if (CF.unread && !c.thread.unread) return false;
    return !CF.by || starterOf(c.thread) === CF.by;
  }

  function cfActive() {
    return CF.program !== 'all' || CF.stages.length || CF.extras.length || CF.unread || CF.by || $('chat-search').value.trim();
  }

  function pickedLabel(list, names) {
    if (!list.length) return 'Any';
    return list.length === 1 ? names[0] : list.length + ' selected';
  }

  function renderChatFilters() {
    var items = [{ id: 'all', name: 'All programs' }].concat(PROGRAMS);
    $('cf-program-menu').innerHTML = items.map(function (p) {
      return '<button type="button" class="ar-menu-item' + (CF.program === p.id ? ' active' : '') + '" data-cf-program="' + p.id + '">' + esc(p.name) + '</button>';
    }).join('');
    $('cf-program-label').textContent = CF.program === 'all' ? 'All programs' : programById(CF.program).name;

    var prefBtn = $('cf-pref-btn');
    prefBtn.disabled = CF.program === 'all';
    prefBtn.title = prefBtn.disabled ? 'Pick a program to choose a preference' : '';
    $('cf-pref-label').textContent = 'Any';
    if (CF.program !== 'all') {
      var pref = cfPref();
      $('cf-pref-label').textContent = pref ? pref.name : 'Any';
      $('cf-pref-menu').innerHTML =
        '<button type="button" class="ar-menu-item' + (pref ? '' : ' active') + '" data-cf-pref="">Any preference</button>' +
        prefsFor(CF.program).map(function (p) {
          return '<button type="button" class="ar-menu-item' + (pref && pref.id === p.id ? ' active' : '') + '" data-cf-pref="' + p.id + '">' + esc(p.name) + '</button>';
        }).join('');
    }

    var scored = !!cfPref();
    var scoreBtn = $('cf-score-btn');
    scoreBtn.disabled = !scored;
    scoreBtn.title = scored ? '' : 'Pick a program and a preference to filter by match score';
    if (scored && !$('cf-score-menu').contains(document.activeElement)) {
      var scoreAttr = function (k) { return 'data-cf-score="' + k + '" min="0" max="100"'; };
      $('cf-score-menu').innerHTML =
        '<div class="ar-cf-menu-head">Match score range</div>' +
        rangeInputs(scoreAttr, CF, '%') +
        '<div class="ar-cf-presets">' + bucketDefs().map(function (d, i) {
          var r = [[MATCH_MIN, 100], [CLOSE_MIN, MATCH_MIN - 1], [0, CLOSE_MIN - 1]][i];
          return '<button type="button" class="ar-cf-preset" data-cf-preset="' + r[0] + '-' + r[1] + '"><i style="background:' + d.color + '"></i>' + esc(d.name) + '</button>';
        }).join('') + '</div>';
    }
    $('cf-score-label').textContent = CF.min === '' && CF.max === '' ? 'Any' : (CF.min === '' ? 0 : CF.min) + '–' + (CF.max === '' ? 100 : CF.max) + '%';

    var threads = chatThreads();
    var base = threads.filter(cfPassesBase);
    var count = function (fn) { return threads.filter(fn).length; };
    $('cf-stage-menu').innerHTML = '<div class="ar-cf-menu-head">Current step in the funnel</div>' + STAGES.map(function (st, i) {
      return '<label class="ar-cf-check"><input type="checkbox" data-cf-stage="' + i + '"' + (CF.stages.indexOf(i) !== -1 ? ' checked' : '') + '>' +
        ico(st.icon) + '<span>' + esc(st.name) + '</span><small>' + count(function (c) { var j = cfJourney(c.s); return j && j.stage === i; }) + '</small></label>';
    }).join('');
    $('cf-stage-label').textContent = pickedLabel(CF.stages, CF.stages.map(function (i) { return STAGES[i].name; }));

    $('cf-extra-menu').innerHTML = '<div class="ar-cf-menu-head">Done any of these</div>' + ACTIONS.map(function (a) {
      return '<label class="ar-cf-check"><input type="checkbox" data-cf-extra="' + a.id + '"' + (CF.extras.indexOf(a.id) !== -1 ? ' checked' : '') + '>' +
        ico(a.icon) + '<span>' + esc(a.name) + '</span><small>' + count(function (c) { var j = cfJourney(c.s); return j && j.actions[a.id]; }) + '</small></label>';
    }).join('');
    $('cf-extra-label').textContent = pickedLabel(CF.extras, CF.extras.map(function (id) {
      return ACTIONS.filter(function (a) { return a.id === id; })[0].name;
    }));

    $('cf-clear').hidden = !cfActive();

    var quick = [
      ['all', 'All', base.length, !CF.unread && !CF.by],
      ['unread', 'Unread', base.filter(function (c) { return c.thread.unread; }).length, CF.unread],
      ['student', 'Initiated by student', base.filter(function (c) { return starterOf(c.thread) === 'student'; }).length, CF.by === 'student'],
      ['uni', 'Initiated by you', base.filter(function (c) { return starterOf(c.thread) === 'uni'; }).length, CF.by === 'uni'],
    ];
    $('cf-quick').innerHTML = quick.map(function (q) {
      return '<button type="button" class="ar-cf-chip' + (q[3] ? ' on' : '') + '" data-cf-quick="' + q[0] + '" aria-pressed="' + q[3] + '">' +
        esc(q[1]) + '<b>' + q[2] + '</b></button>';
    }).join('');
  }

  function updateChatBadge() {
    var unread = Object.keys(CHATS).reduce(function (n, id) { return n + (CHATS[id].unread || 0); }, 0);
    $('chat-badge').hidden = !unread;
    $('chat-badge').textContent = unread > 9 ? '9+' : unread;
  }

  /** "4:05 PM" today, then "Yesterday", a weekday within the week, else "12 Oct". */
  function chatTime(ts) {
    var d = new Date(ts);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var days = Math.floor((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    if (days <= 0) return fmtTime(d);
    if (days === 1) return 'Yesterday';
    if (days < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return fmtDate(d).replace(' ' + today.getFullYear(), '');
  }

  /** Starting a chat from a card clears the chat filters so the new thread is in the list. */
  function openChat(id) {
    if (!studentById(id)) return;
    if (!CHATS[id]) CHATS[id] = { messages: [], unread: 0, seen: false, created: Date.now() };
    resetChatFilters();
    selectChat(id);
    closeDrawer();
    goTo('chats/' + encodeURIComponent(id));
    var input = $('chat-input');
    if (input) input.focus();
  }

  /** A chat opened from a student card stays out of the list until a message is sent. */
  function selectChat(id) {
    var prev = state.chatId;
    if (prev && prev !== id && CHATS[prev] && !CHATS[prev].messages.length) delete CHATS[prev];
    state.chatId = id;
    if (CHATS[id] && CHATS[id].unread) {
      CHATS[id].unread = 0;
      saveChats();
    }
  }

  function renderChats() {
    if (state.chatId && !CHATS[state.chatId]) state.chatId = null;
    updateChatBadge();
    renderChatFilters();
    renderChatList();
    renderChatThread();
    renderChatProfile();
  }

  function chatCardHtml(c) {
    var t = c.thread;
    var last = lastMessage(t);
    var mine = last && last.from === 'uni';
    var tick = mine
      ? '<span class="ar-chat-tick' + (t.seen ? ' seen' : '') + '" title="' + (t.seen ? 'Read' : 'Sent') + '">' + ico(t.seen ? 'done_all' : 'done') + '</span>'
      : '';
    return (
      '<button type="button" class="ar-chat-card' + (c.id === state.chatId ? ' active' : '') + (t.unread ? ' unread' : '') + '" data-chat-open="' + c.id + '">' +
      '<span class="avatar">' + esc(c.s.initials) + '</span>' +
      '<span class="ar-chat-card-main">' +
      '<span class="ar-chat-card-top"><strong>' + esc(c.s.name) + '</strong>' + (last ? '<time>' + esc(chatTime(last.at)) + '</time>' : '') + '</span>' +
      '<span class="ar-chat-card-sub">' + tick +
      '<span class="ar-chat-preview">' + (last ? (mine ? 'You: ' : '') + (last.campaign ? esc(channelById(last.campaign).name) + ' campaign · ' : '') + esc(last.text) : '<em>No messages yet</em>') + '</span>' +
      (t.unread ? '<b class="ar-chat-unread" aria-label="' + t.unread + ' unread">' + t.unread + '</b>' : '') +
      '</span></span></button>'
    );
  }

  /** With a program and preference picked, chats are grouped into the same cohorts as the dashboard board. */
  function renderChatList() {
    var threads = chatThreads();
    var shown = threads.filter(function (c) { return cfPassesBase(c) && cfPassesQuick(c); });
    $('chat-count').textContent = shown.length === threads.length ? threads.length : shown.length + ' of ' + threads.length;
    if (!shown.length) {
      $('chat-list').innerHTML = '<div class="ar-chat-none">' + (threads.length
        ? 'No chats match these filters.<br><button type="button" class="ar-link" data-cf-clear>Clear filters</button>'
        : 'No conversations yet. Use the chat button on a student card to start one.') + '</div>';
      return;
    }
    if (!cfPref()) {
      $('chat-list').innerHTML = shown.map(chatCardHtml).join('');
      return;
    }
    var groups = [[], [], []];
    shown.forEach(function (c) { groups[bucketOf(c.score)].push(c); });
    $('chat-list').innerHTML = bucketDefs().map(function (d, i) {
      if (!groups[i].length) return '';
      return (
        '<div class="ar-chat-group">' +
        '<div class="ar-chat-group-head"><i style="background:' + d.color + '"></i><strong>' + esc(d.name) + '</strong>' +
        '<span>' + esc(d.range) + '</span><b>' + groups[i].length + '</b></div>' +
        groups[i].map(chatCardHtml).join('') + '</div>'
      );
    }).join('');
  }

  /** Chat panel and profile drawer share the student's picked program; fallback is the program filtered on. */
  function pickedJourney(s, fallback) {
    var journeys = programJourneys(s);
    var chosen = state.cpProgram && state.cpProgram[s.id];
    function find(id) { return journeys.filter(function (j) { return j.program === id; })[0]; }
    return { journeys: journeys, journey: find(chosen) || find(fallback) || journeys[0] };
  }

  function journeyPicker(s, picked) {
    if (picked.journeys.length < 2) return '<small>' + esc(programById(picked.journey.program).name) + '</small>';
    return '<select class="ar-fselect ar-cp-select" data-cp-program="' + s.id + '" aria-label="Program">' +
      picked.journeys.map(function (j) {
        return '<option value="' + j.program + '"' + (j === picked.journey ? ' selected' : '') + '>' + esc(programById(j.program).name) + '</option>';
      }).join('') + '</select>';
  }

  function renderChatProfile() {
    var s = state.chatId && studentById(state.chatId);
    if (!s) {
      $('chat-profile').innerHTML = '<div class="ar-chat-empty sm">' + ico('person') + '<p>The student’s profile shows here.</p></div>';
      return;
    }
    var program = programById(s.program);
    var pref = cfPref() || s.pref || null;
    var result = pref ? scoreAgainst(s, pref) : null;
    var score = result ? result.score : null;
    var color = score === null ? 'var(--line)' : score >= MATCH_MIN ? 'var(--green-500)' : score >= CLOSE_MIN ? 'var(--yellow-500)' : 'var(--red-500)';
    var picked = pickedJourney(s, CF.program);
    var journey = picked.journey;
    var have = ACTIONS.filter(function (a) { return journey.actions[a.id]; });
    var steps = STAGES.map(function (st, i) {
      var cls = i > journey.stage ? ' todo' : i === journey.stage ? ' done current' : ' done';
      var when = i <= journey.stage ? journey.events[i] : null;
      return '<div class="ar-step' + cls + '"><i>' + (i <= journey.stage ? ico('check') : '') + '</i>' +
        '<span class="ar-step-label">' + esc(st.name) + '</span>' +
        '<time>' + (when ? esc(fmtDate(when)) : i <= journey.stage ? '' : 'Not yet') + '</time></div>';
    }).join('');
    var extras = ACTIONS.map(function (a) {
      var at = journey.actions[a.id];
      return '<div class="ar-cp-extra' + (at ? ' on' : '') + '">' + ico(a.icon) + '<span>' + esc(a.name) + '</span>' +
        (at ? '<time>' + esc(fmtDate(at)) + '</time>' : '') + ico(at ? 'check_circle' : 'radio_button_unchecked') + '</div>';
    }).join('');
    var sent = (CAMPAIGNS[s.id] || []).slice().reverse();
    var campaigns = sent.map(function (c) {
      var ch = channelById(c.channel);
      return '<div class="ar-cp-extra on">' + ico(ch.icon) + '<span>' + esc(ch.name + (c.subject ? ': ' + c.subject : '')) + '</span>' +
        '<time>' + esc(fmtDate(new Date(c.at))) + '</time></div>';
    }).join('');
    var box = $('chat-profile');
    var keepScroll = box.getAttribute('data-sid') === s.id ? box.scrollTop : 0;
    box.setAttribute('data-sid', s.id);
    box.innerHTML =
      '<div class="ar-cp-hero"><div class="avatar lg">' + esc(s.initials) + '</div>' +
      '<h3>' + esc(s.name) + '</h3><p>' + esc(s.id + ' · ' + program.name) + '</p>' + stagePill(s) + '</div>' +
      (pref
        ? '<div class="ar-cp-score"><div class="ar-ring" style="--p:' + (score || 0) + ';--c:' + color + '"><span>' + score + '%</span></div>' +
          '<div class="ar-cp-score-text"><span>Match score</span><strong>' + esc(pref.name) + '</strong></div></div>'
        : '') +
      '<div class="ar-cp-sec ar-cp-ai"><h4><span>' + ico('auto_awesome') + 'AI summary</span></h4><p>' + aiSummary(s) + '</p></div>' +
      '<div class="ar-cp-sec ar-cp-match"><h4>Preference match' + (pref ? ' <small>' + esc(pref.name) + '</small>' : '') + '</h4>' +
      matchHtml(s, pref, result) + '</div>' +
      '<div class="ar-cp-sec"><h4>Profile</h4>' + profileFactsHtml(s) +
      '<div class="ar-cp-group"><h5>Test scores</h5>' + testsHtml(s, pref) +
      '<h5>Extracurricular</h5>' + activitiesHtml(s) + '</div></div>' +
      '<div class="ar-cp-sec"><h4>Other details</h4>' + factsHtml(otherDetails(s)) + '</div>' +
      '<div class="ar-cp-sec"><h4>Program' + (picked.journeys.length > 1 ? ' <small>' + picked.journeys.length + ' programs</small>' : '') + '</h4>' +
      '<div class="ar-cp-program">' + journeyPicker(s, picked) + '</div>' +
      '<div class="ar-cp-group">' +
      '<h5>Snapshot steps</h5><div class="ar-journey">' + steps + '</div>' +
      '<h5>Additional user actions <small>' + have.length + ' of ' + ACTIONS.length + '</small></h5>' + extras + '</div></div>' +
      (campaigns ? '<div class="ar-cp-sec"><h4>Campaigns sent <small>' + sent.length + '</small></h4>' + campaigns + '</div>' : '');
    box.scrollTop = keepScroll;
  }

  function renderChatThread() {
    var id = state.chatId;
    var s = id && studentById(id);
    if (!s) {
      $('chat-thread').innerHTML = '<div class="ar-chat-empty">' + ico('forum') + '<h3>Pick a conversation</h3>' +
        '<p>Choose a chat from the list, or start one from any student card on the dashboard.</p></div>';
      return;
    }
    var thread = CHATS[id];
    var oldInput = $('chat-input');
    var draft = oldInput && oldInput.getAttribute('data-chat') === id ? oldInput.value : '';
    var first = s.name.split(' ')[0];
    var programName = programById(s.program).name;
    var quick = [
      'Hi ' + first + ', thanks for your interest in ' + programName + ' at BML Munjal University!',
      'Would you like to schedule a call with our admissions team?',
      'Have you had a chance to start your application?',
    ];
    var msgs = thread.messages.length ? thread.messages.map(function (m) {
      var ch = m.campaign ? channelById(m.campaign) : null;
      return '<div class="ar-msg ' + (m.from === 'uni' ? 'out' : 'in') + (ch ? ' campaign' : '') + '">' +
        (ch ? '<span class="ar-msg-tag">' + ico(ch.icon) + esc(ch.name) + ' campaign</span>' : '') +
        '<p>' + (m.subject ? '<b>' + esc(m.subject) + '</b>' : '') + esc(m.text) + '</p>' +
        '<time>' + esc(chatTime(m.at)) + '</time></div>';
    }).join('') : '<div class="ar-chat-start">Say hello to ' + esc(first) + '. Messages stay on the platform; contact details are never shared.</div>';
    $('chat-thread').innerHTML =
      '<div class="ar-chat-head">' +
      '<span class="avatar">' + esc(s.initials) + '</span>' +
      '<div class="ar-chat-who"><strong>' + esc(s.name) + '</strong><small>' + esc(s.id + ' · ' + programName) + '</small></div>' +
      (starterOf(thread) ? '<span class="ar-chat-starter">' + (starterOf(thread) === 'student' ? 'Initiated by student' : 'Initiated by you') + '</span>' : '') +
      '</div>' +
      '<div class="ar-chat-msgs gr-scroll" id="chat-msgs">' + msgs +
      (thread.typing ? '<div class="ar-msg in typing"><p><i></i><i></i><i></i></p></div>' : '') + '</div>' +
      (thread.messages.length ? '' : '<div class="ar-chat-quick">' + quick.map(function (q) {
        return '<button type="button" class="ar-chat-chip" data-chat-quick="' + esc(q) + '">' + esc(q) + '</button>';
      }).join('') + '</div>') +
      '<form class="ar-chat-compose" id="chat-form">' +
      '<textarea id="chat-input" rows="1" data-chat="' + id + '" placeholder="Message ' + esc(first) + '…">' + esc(draft) + '</textarea>' +
      '<button type="submit" class="btn btn-primary btn-sm btn-icon">' + ico('send') + 'Send</button>' +
      '</form>';
    var box = $('chat-msgs');
    box.scrollTop = box.scrollHeight;
  }

  function sendChat(text) {
    var id = state.chatId;
    text = (text || '').trim();
    if (!id || !text || !CHATS[id]) return;
    var thread = CHATS[id];
    thread.messages.push({ from: 'uni', text: text, at: Date.now() });
    thread.seen = false;
    $('chat-input').value = '';
    var reply = DEMO_REPLIES[thread.messages.filter(function (m) { return m.from === 'student'; }).length % DEMO_REPLIES.length];
    thread.typing = true;
    saveChats();
    renderChats();
    window.setTimeout(function () {
      if (!CHATS[id]) return;
      CHATS[id].typing = false;
      CHATS[id].seen = true;
      CHATS[id].messages.push({ from: 'student', text: reply, at: Date.now() });
      if (!(state.view === 'chats' && state.chatId === id)) CHATS[id].unread = (CHATS[id].unread || 0) + 1;
      saveChats();
      updateChatBadge();
      if (state.view === 'chats') renderChats();
    }, 1600);
  }

  /* ——— Drawer ——— */

  /** modal shows a centred popup instead of the side panel. */
  function openDrawer(title, body, foot, modal) {
    $('drawer').classList.toggle('modal', !!modal);
    $('drawer').classList.remove('ar-confirm-modal', 'ar-campaign-modal', 'ar-event-create-modal', 'ar-event-detail-modal');
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
    campaign = null;
    evEditor = null;
    evCreate = null;
  }

  function aiSummary(s) {
    var program = programById(s.program);
    var strengths = s.parts.filter(function (p) { return p.weight > 0 && p.v >= 0.99; }).map(function (p) { return p.label.toLowerCase(); });
    var gaps = s.parts.filter(function (p) { return p.weight > 0 && p.v < 0.5; }).map(function (p) { return p.label.toLowerCase(); });
    var next = [
      'Send a personalised program brochure to get them to open the program detail page.',
      s.actions.callback ? 'They asked for a call back. Call them and nudge them to start the application.'
        : 'Share placement stats and a campus video, then nudge them to start the application with a fee waiver or deadline reminder.',
      'Help them finish the application and follow up on missing documents.',
      'Review the application and share the admit decision timeline.',
      s.actions.loan ? 'Admit offered. They have explored loans, so share loan partners and the fee payment steps.'
        : 'Admit offered. Share the fee payment steps and scholarship options.',
      'Fee paid. Share the enrolment checklist and orientation dates.',
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

  var profileCollapsed = { match: true, profile: true, other: true, log: true, campaigns: true };

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
      ['Education loan', x.loan || (s.actions.loan ? 'Explored loan options' : pickBy(['Not needed', 'Not yet explored'], 11))],
      ['Profile created', fmtDateTime(s.createdOn)],
      ['Last active', s.lastActive ? fmtDateTime(s.lastActive) : 'Not yet'],
    ];
  }

  /** result is scoreAgainst(s, pref); the drawer passes the dashboard score already on the student. */
  function matchHtml(s, pref, result) {
    if (!pref) {
      return '<p class="ar-muted">' + esc(programById(s.program).name) + ' has no preference, so there’s nothing to match against.</p>' +
        '<button type="button" class="btn btn-secondary btn-sm ar-block-btn" data-create-pref="' + s.program + '">' + ico('add') + 'Create preference</button>';
    }
    var scored = result.parts.filter(function (p) { return p.weight > 0; });
    if (!scored.length) return '';
    var tone = result.score >= MATCH_MIN ? 'hi' : result.score >= CLOSE_MIN ? 'mid' : 'lo';
    return scored.map(function (p) {
      var pct = Math.round(p.v * 100);
      var rowTone = pct >= 99 ? 'hi' : pct >= 50 ? 'mid' : 'lo';
      return (
        '<div class="ar-match-row">' +
        '<span class="ar-match-label">' + esc(p.label) + '</span>' +
        '<em>' + esc(p.note) + '</em>' +
        (isBinary(p.id) ? yesNoHtml(p, 'ar-match-score') : '<b class="ar-match-score ' + rowTone + '">' + pct + '%</b>') +
        '</div>'
      );
    }).join('') +
      '<div class="ar-match-total"><span>Match score</span><span></span>' +
      '<b class="ar-match-score ' + tone + '">' + result.score + '%</b></div>';
  }

  function factsHtml(list) {
    return '<div class="ar-facts">' + list.map(function (f) {
      return '<div><span>' + f[0] + '</span><strong>' + esc(f[1]) + '</strong></div>';
    }).join('') + '</div>';
  }

  function profileFactsHtml(s) {
    return factsHtml([
      ['Location', s.city + ' · ' + s.km + ' km'], ['Stream', s.stream],
      ['Class 10', markNote(s.mark10)], ['Class 12', markNote(s.mark12)],
      ['Fee budget', '₹' + s.budget[0] + '–' + s.budget[1] + 'L'], ['Program (AOI)', programById(s.program).name],
      ['Intake', s.intake], ['GR ID', s.id],
    ]);
  }

  function testsHtml(s, pref) {
    if (!s.tests.length) return '<p class="ar-muted">No tests added.</p>';
    var accepted = pref ? (pref.criteria.test.tests || []).map(function (rq) { return rq.name.toLowerCase(); }) : null;
    return s.tests.map(function (t) {
      var ok = !!accepted && accepted.indexOf(t.name.toLowerCase()) !== -1;
      return '<div class="ar-test-row"><span>' + esc(t.name) +
        (t.custom ? '<i class="ar-tag">Custom</i>' : '') + '</span>' +
        '<strong>' + esc(testNote(t).slice(t.name.length + 1)) + '</strong>' +
        (accepted ? '<em class="' + (ok ? 'ok' : '') + '">' + (ok ? 'Accepted' : 'Not in preference') + '</em>' : '<em></em>') + '</div>';
    }).join('');
  }

  function activitiesHtml(s) {
    return '<div class="ar-tags">' + s.activities.map(function (a) {
      var custom = ACTIVITIES.map(function (x) { return x.toLowerCase(); }).indexOf(a.toLowerCase()) === -1;
      return '<span class="pill">' + esc(a) + (custom ? ' · custom' : '') + '</span>';
    }).join('') + '</div>';
  }

  function openStudent(id) {
    var s = STUDENTS.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var program = programById(s.program);

    var body =
      '<div class="ar-hero"><div class="avatar lg">' + esc(s.initials) + '</div>' +
      '<div class="ar-hero-who"><h3>' + esc(s.name) + '</h3><p>' + esc(s.id) + ' · ' + esc(program.name) + '</p>' +
      '<p style="margin-top:0.35rem">' + stagePill(s) + '</p></div>' +
      '<div class="ar-ring" style="--p:' + (s.score || 0) + ';--c:' + scoreColor(s) + '"><span>' + (s.score === null ? '—' : s.score + '%') + '</span></div></div>' +
      profileSection('ai', ico('auto_awesome') + 'AI summary', aiSummary(s), 'ar-ai') +
      profileSection('match', 'Preference match', matchHtml(s, s.pref, { score: s.score, parts: s.parts })) +
      profileSection('profile', 'Profile', profileFactsHtml(s) +
        '<div class="ar-subsec"><span class="ar-sublabel">Test scores</span>' + testsHtml(s, s.pref) + '</div>' +
        '<div class="ar-subsec"><span class="ar-sublabel">Extracurricular</span>' + activitiesHtml(s) + '</div>') +
      profileSection('other', 'Other details', factsHtml(otherDetails(s))) +
      profileSection('log', 'Activity log', '<div id="log-body">' + activityLogHtml(s) + '</div>') +
      campaignLogHtml(s);

    openDrawer(
      'Student profile',
      body,
      saveBtnHtml(s.id) +
      '<button type="button" class="btn btn-primary btn-sm btn-icon" data-card-chat="' + s.id + '">' + ico('chat') + 'Chat</button>'
    );
  }

  function logRow(cls, icon, label, when, note) {
    return (
      '<div class="ar-step' + cls + '"><i>' + (icon ? ico(icon) : '') + '</i>' +
      '<span class="ar-step-label">' + esc(label) + (note ? '<em>' + esc(note) + '</em>' : '') + '</span>' +
      '<time>' + (when ? esc(fmtDateTime(when)) : 'Not yet') + '</time></div>'
    );
  }

  /** Steps and actions follow the picked program; the GradRight sign-up applies to every program. */
  function activityLogHtml(s) {
    var picked = pickedJourney(s, state.program);
    var j = picked.journey;
    var steps =
      logRow(' done', 'person_add', 'Profile created on GradRight', s.createdOn) +
      STAGES.map(function (st, i) {
        if (i > j.stage) return logRow(' todo', '', st.name, null);
        return logRow(i === j.stage ? ' done current' : ' done', 'check', st.name, j.events[i], i === j.stage ? 'Current stage' : '');
      }).join('');
    var done = ACTIONS.filter(function (a) { return j.actions[a.id]; }).length;
    return '<div class="ar-log-program"><span class="ar-sublabel">Program' + (picked.journeys.length > 1 ? ' · ' + picked.journeys.length + ' programs' : '') + '</span>' +
      journeyPicker(s, picked) + '</div>' +
      '<div class="ar-journey">' + steps + '</div>' +
      '<div class="ar-subsec"><span class="ar-sublabel">Additional user actions · ' + done + ' of ' + ACTIONS.length + '</span>' + ACTIONS.map(function (a) {
        var at = j.actions[a.id];
        return '<div class="ar-cp-extra' + (at ? ' on' : '') + '">' + ico(a.icon) + '<span>' + esc(a.name) + '</span>' +
          '<time>' + (at ? esc(fmtDateTime(at)) : 'Not yet') + '</time></div>';
      }).join('') + '</div>';
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

  function openEditor(programId, prefId, copyOf) {
    var program = programById(programId);
    var existing = prefId ? findPref(programId, prefId) : null;
    var draft = existing ? clone(existing) : { id: null, name: '', criteria: baseCriteria(program) };
    if (copyOf) {
      draft = clone(copyOf);
      draft.id = null;
      draft.name = copyOf.name + ' (copy)';
    }
    editing = {
      programId: programId,
      fromProgramId: programId,
      prefId: existing ? existing.id : null,
      copy: !!copyOf,
      draft: draft,
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

  var creatingFor = null;

  function openCreateChooser(programId) {
    creatingFor = programId;
    openDrawer(
      'Create preference',
      '<div class="ar-create-choices">' +
      '<button type="button" class="ar-create-choice" data-create-choice="new">' + ico('add') +
      '<span><strong>Create new</strong><small>Start from a blank preference</small></span></button>' +
      '<button type="button" class="ar-create-choice" data-create-choice="existing">' + ico('content_copy') +
      '<span><strong>Use existing</strong><small>Copy a preference you already have</small></span></button>' +
      '</div>',
      '',
      true
    );
    $('drawer').classList.add('ar-confirm-modal');
  }

  function prefOptions(programId) {
    var prefs = prefsFor(programId);
    if (!prefs.length) return '<option value="">No preferences in this program</option>';
    return prefs.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('');
  }

  function openCopyPicker() {
    var programId = prefsFor(creatingFor).length ? creatingFor
      : (PROGRAMS.filter(function (p) { return prefsFor(p.id).length; })[0] || programById(creatingFor)).id;
    openDrawer(
      'Use existing preference',
      '<div class="ar-copy-pick">' +
      '<label class="field"><span>Program</span><select id="pc-program">' + PROGRAMS.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === programId ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span>Preference</span><select id="pc-pref">' + prefOptions(programId) + '</select></label>' +
      '</div>',
      '<button type="button" class="btn btn-ghost btn-sm" data-create-back>Back</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-copy-continue>Continue</button>',
      true
    );
    $('drawer').classList.add('ar-confirm-modal');
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
    lastSeenKey = null;
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
    if (list.length <= 1 || isDefaultPref(programId, prefId)) return;
    PREFS[programId] = list.filter(function (p) { return p.id !== prefId; });
    if (state.prefId === prefId) state.prefId = null;
    savePrefs();
    forgetSeen(prefId);
    if (CHANGES[prefId]) {
      delete CHANGES[prefId];
      saveChanges();
    }
    closeDrawer();
    renderPrograms();
    toast('Preference deleted.');
  }

  /* ——— Events ——— */

  var EVENT_KINDS = [
    { id: 'webinar', name: 'Webinar', icon: 'videocam' },
    { id: 'ama', name: 'AMA', icon: 'forum' },
    { id: 'coffee', name: 'Coffee chat', icon: 'local_cafe' },
    { id: 'expert', name: 'Ask the expert', icon: 'psychology' },
  ];
  var EVENT_FORMATS = [
    { id: 'online', name: 'Online', icon: 'language' },
    { id: 'offline', name: 'Offline', icon: 'location_on' },
    { id: 'hybrid', name: 'Hybrid', icon: 'devices' },
  ];
  var EVENT_BUCKETS = [
    { id: 'live', name: 'Live', note: 'Published and upcoming', color: 'var(--green-500)' },
    { id: 'completed', name: 'Completed', note: 'Already happened', color: 'var(--gray-400, #9ca3af)' },
    { id: 'draft', name: 'Draft', note: 'Not published yet', color: 'var(--yellow-500)' },
  ];
  var COHORTS = ['2026', '2027', '2028', '2029'];
  var PLATFORM_LINKS = {
    'Zoom': function (n) { return 'https://zoom.us/j/8' + String(n * 7919 + 104729).slice(0, 9); },
    'Google Meet': function (n) { var c = 'abcdefghijkmnpqrstuvwxyz'; var s = ''; for (var i = 0; i < 10; i++) s += c[(n * 31 + i * 17) % c.length]; return 'https://meet.google.com/' + s.slice(0, 3) + '-' + s.slice(3, 7) + '-' + s.slice(7); },
    'Microsoft Teams': function (n) { return 'https://teams.microsoft.com/l/meetup-join/bmu-' + (n * 4099 + 31337); },
  };
  var CAMPUS = { city: 'Gurugram', venue: 'BML Munjal University campus, Sidhrawali' };

  /* Demo only: events are placed relative to now so the countdown and the Live and Completed buckets stay meaningful.
     [title, kind, format, program, preference index or null, cohort, hours from now, minutes long, city, venue, platform, clicks, registrations, draft, host] */
  var EVENT_SEEDS = [
    ['JEE Main 2027: the last 90 days', 'webinar', 'online', 'btech-cse', 0, '2027', 3.5, 60, '', '', 'Zoom', 1840, 412, false, 'Prof. Anil Mehta, Dean of Engineering'],
    ['Inside our AI & robotics lab', 'webinar', 'hybrid', 'btech-ai', 0, '2027', -0.5, 90, CAMPUS.city, CAMPUS.venue, 'Zoom', 1510, 366, false, 'Dr. Ritu Sharma, AI Lab lead'],
    ['Coffee chat with B.Tech alumni', 'coffee', 'offline', 'btech-cse', null, '2027', 20, 90, 'New Delhi', 'Third Wave Coffee, Connaught Place', '', 620, 84, false, 'Alumni from Google and Zomato'],
    ['AMA: Life in the BMU hostels', 'ama', 'online', 'btech-ai', null, '2027', 46, 45, '', '', 'Google Meet', 960, 203, false, 'Student council'],
    ['Ask the expert: Scholarships and loans', 'expert', 'hybrid', 'bba', 0, '2027', 74, 60, CAMPUS.city, CAMPUS.venue, 'Zoom', 1320, 288, false, 'Neha Kapoor, Financial aid office'],
    ['Design portfolio review', 'expert', 'offline', 'bdes', 0, '2027', 122, 120, 'Jaipur', 'Hotel Clarks Amer, JLN Marg', '', 410, 62, false, 'Faculty of Design'],
    ['Data science careers: what recruiters want', 'webinar', 'online', 'bsc-ds', 0, '2027', 170, 60, '', '', 'Microsoft Teams', 780, 150, false, 'Karan Malhotra, Analytics lead at Deloitte'],
    ['Coffee chat for BBA aspirants', 'coffee', 'offline', 'bba', null, '2028', 218, 90, 'Chandigarh', 'Elante Mall, Industrial Area', '', 300, 41, false, 'BBA student ambassadors'],
    ['AMA with the admissions director', 'ama', 'online', 'btech-cse', null, '2027', 290, 60, '', '', 'Zoom', 2200, 540, false, 'Dr. Sanjay Gupta, Director of Admissions'],
    ['Coffee chat in Lucknow', 'coffee', 'offline', 'btech-cse', null, '2027', -72, 90, 'Lucknow', 'Cafe Repertwahr, Qaiserbagh', '', 540, 77, false, 'Admissions team'],
    ['Choosing between CSE and AI & ML', 'webinar', 'online', 'btech-ai', 0, '2027', -146, 60, '', '', 'Zoom', 2650, 690, false, 'Heads of CSE and AI & ML'],
    ['Ask the expert: Internships at BMU', 'expert', 'hybrid', 'bba', null, '2027', -240, 60, 'New Delhi', 'India Habitat Centre, Lodhi Road', 'Google Meet', 880, 190, false, 'Placement cell'],
    ['B.Des studio walkthrough', 'webinar', 'online', 'bdes', null, '2026', -336, 45, '', '', 'Google Meet', 640, 130, false, 'Faculty of Design'],
    ['AMA: CUET for B.Sc Data Science', 'ama', 'online', 'bsc-ds', 0, '2026', -480, 60, '', '', 'Zoom', 1120, 260, false, 'B.Sc Data Science faculty'],
    ['Coffee chat in Noida', 'coffee', 'offline', 'btech-ai', null, '2027', -600, 90, 'Noida', 'Starbucks, DLF Mall of India', '', 380, 55, false, 'Admissions team'],
    ['Parents’ evening: fees and hostels', 'expert', 'offline', 'btech-cse', null, '2027', -720, 120, CAMPUS.city, CAMPUS.venue, '', 720, 160, false, 'Admissions and hostel office'],
    ['JEE Advanced rank holders meet-up', 'coffee', 'offline', 'btech-cse', 1, '2027', 430, 120, 'New Delhi', 'The Leela Ambience, Gurugram Road', '', 0, 0, true, 'Admissions team'],
    ['Product design careers', 'webinar', 'online', 'bdes', null, '2028', 500, 60, '', '', 'Zoom', 0, 0, true, 'Alumni designers'],
    ['AMA: BBA placements 2026', 'ama', 'hybrid', 'bba', 0, '2027', 600, 60, CAMPUS.city, CAMPUS.venue, 'Microsoft Teams', 0, 0, true, 'Placement cell'],
    ['Ask the expert: Maths prep for data science', 'expert', 'online', 'bsc-ds', null, '2028', 670, 45, '', '', 'Google Meet', 0, 0, true, 'B.Sc Data Science faculty'],
  ];

  var EVENTS = (function () {
    var base = new Date();
    base.setMinutes(0, 0, 0);
    return EVENT_SEEDS.map(function (r, i) {
      var start = new Date(base.getTime() + r[6] * 3600000);
      return {
        id: 'EV-' + (101 + i), name: r[0], kind: r[1], format: r[2], program: r[3], prefIndex: r[4], cohort: r[5],
        start: start, end: new Date(start.getTime() + r[7] * 60000), minutes: r[7],
        city: r[8], venue: r[9], platform: r[10], link: r[10] ? PLATFORM_LINKS[r[10]](i + 1) : '',
        clicks: r[11], registrations: r[12], draft: r[13], host: r[14], image: '',
      };
    });
  })();

  function eventById(id) {
    return EVENTS.filter(function (e) { return e.id === id; })[0];
  }

  function kindById(id) {
    return EVENT_KINDS.filter(function (k) { return k.id === id; })[0];
  }

  function formatById(id) {
    return EVENT_FORMATS.filter(function (f) { return f.id === id; })[0];
  }

  function eventStatus(e, now) {
    if (e.draft) return 'draft';
    return (now || Date.now()) >= e.end.getTime() ? 'completed' : 'live';
  }

  /** Audience preference, looked up by position so it follows the program's current preferences. */
  function eventPref(e) {
    return e.prefIndex === null ? null : prefsFor(e.program)[e.prefIndex] || null;
  }

  function eventPlaces(e) {
    return e.format === 'online' ? [] : [e.city];
  }

  /* Messages a registrant gets straight after signing up. { eventId: { email: { on, subject, text }, whatsapp: { on, text } } } */
  var FOLLOWUPS_KEY = 'admitright_event_followups_v1';
  var FOLLOWUPS = {};
  try { FOLLOWUPS = JSON.parse(localStorage.getItem(FOLLOWUPS_KEY) || '{}') || {}; } catch (err) { FOLLOWUPS = {}; }

  function saveFollowups() {
    try { localStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(FOLLOWUPS)); } catch (err) { /* storage full or blocked */ }
  }

  var FOLLOWUP_CHANNELS = [
    { id: 'email', name: 'Email', icon: 'mail' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'forum' },
  ];

  function defaultFollowups(e) {
    return {
      email: { on: !e.draft, subject: 'You’re registered: {event}',
        text: 'Hi {first},\n\nThanks for registering for {event} on {date} at {time}.\n{where}\n\nWe’ll send you a reminder before it starts. See you there!\n\nAdmissions team, BML Munjal University' },
      whatsapp: { on: !e.draft && e.kind !== 'expert',
        text: 'Hi {first}! You’re in for {event} on {date}, {time}. {where} Reply here if you have any questions.' },
    };
  }

  function followupsFor(e) {
    return FOLLOWUPS[e.id] || defaultFollowups(e);
  }

  function whereLine(e) {
    var place = e.venue + ', ' + e.city;
    if (e.format === 'online') return 'Join on ' + e.platform + ': ' + e.link;
    if (e.format === 'offline') return 'Venue: ' + place + '.';
    return 'Join us at ' + place + ', or online on ' + e.platform + ': ' + e.link;
  }

  function fillEventTemplate(text, e, first) {
    return text
      .replace(/\{first\}/g, first || 'there')
      .replace(/\{event\}/g, e.name)
      .replace(/\{date\}/g, fmtDate(e.start))
      .replace(/\{time\}/g, fmtTime(e.start))
      .replace(/\{where\}/g, whereLine(e));
  }

  /* ——— Events: filters ——— */

  var EF = { program: 'all', prefId: null, cohort: '', formats: [], kinds: [], cities: [], platforms: [], q: '' };

  function efPref() {
    return EF.program === 'all' || !EF.prefId ? null : findPref(EF.program, EF.prefId);
  }

  /** skip leaves one facet out, so each insight counts what picking it would show. */
  function eventPasses(e, skip) {
    if (skip !== 'program' && EF.program !== 'all' && e.program !== EF.program) return false;
    var pref = efPref();
    if (pref && skip !== 'program') {
      var target = eventPref(e);
      if (!target || target.id !== pref.id) return false;
    }
    if (EF.cohort && e.cohort !== EF.cohort) return false;
    if (skip !== 'formats' && EF.formats.length && EF.formats.indexOf(e.format) === -1) return false;
    if (skip !== 'kinds' && EF.kinds.length && EF.kinds.indexOf(e.kind) === -1) return false;
    if (skip !== 'cities' && EF.cities.length && !eventPlaces(e).some(function (c) { return EF.cities.indexOf(c) !== -1; })) return false;
    if (EF.platforms.length && EF.platforms.indexOf(e.platform) === -1) return false;
    var q = EF.q.trim().toLowerCase();
    return !q || (e.name + ' ' + kindById(e.kind).name + ' ' + e.host + ' ' + e.city + ' ' + e.venue).toLowerCase().indexOf(q) !== -1;
  }

  function efFacetCount() {
    return EF.formats.length + EF.kinds.length + EF.cities.length + EF.platforms.length;
  }

  function toggleIn(list, v) {
    var i = list.indexOf(v);
    if (i === -1) list.push(v);
    else list.splice(i, 1);
  }

  function eventCities() {
    var seen = {};
    EVENTS.forEach(function (e) { eventPlaces(e).forEach(function (c) { seen[c] = true; }); });
    return Object.keys(seen).sort();
  }

  function renderEventPickers() {
    $('ev-program-menu').innerHTML = [{ id: 'all', name: 'All programs' }].concat(PROGRAMS).map(function (p) {
      var n = EVENTS.filter(function (e) { return p.id === 'all' || e.program === p.id; }).length;
      return '<button type="button" class="ar-menu-item' + (EF.program === p.id ? ' active' : '') + '" data-ev-program="' + p.id + '">' +
        esc(p.name) + '<small>' + n + '</small></button>';
    }).join('');
    $('ev-program-label').textContent = EF.program === 'all' ? 'All programs' : programById(EF.program).name;

    var prefBtn = $('ev-pref-btn');
    prefBtn.disabled = EF.program === 'all';
    prefBtn.title = prefBtn.disabled ? 'Pick a program to choose a preference' : '';
    var pref = efPref();
    $('ev-pref-label').textContent = pref ? pref.name : 'Any';
    $('ev-pref-menu').innerHTML = EF.program === 'all' ? '' :
      '<button type="button" class="ar-menu-item' + (pref ? '' : ' active') + '" data-ev-pref="">Any preference</button>' +
      prefsFor(EF.program).map(function (p) {
        return '<button type="button" class="ar-menu-item' + (pref && pref.id === p.id ? ' active' : '') + '" data-ev-pref="' + p.id + '">' + esc(p.name) + '</button>';
      }).join('');

    $('ev-cohort-label').textContent = EF.cohort || 'All cohorts';
    $('ev-cohort-menu').innerHTML = [''].concat(COHORTS).map(function (c) {
      return '<button type="button" class="ar-menu-item' + (EF.cohort === c ? ' active' : '') + '" data-ev-cohort="' + c + '">' + (c ? c + ' intake' : 'All cohorts') + '</button>';
    }).join('');

    var check = function (group, value, label, icon, n) {
      return '<label class="ar-cf-check"><input type="checkbox" data-ev-check="' + group + ':' + esc(value) + '"' + (EF[group].indexOf(value) !== -1 ? ' checked' : '') + '>' +
        (icon ? ico(icon) : '') + '<span>' + esc(label) + '</span><small>' + n + '</small></label>';
    };
    var count = function (fn) { return EVENTS.filter(fn).length; };
    $('ev-filter-menu').innerHTML =
      '<div class="ar-fmenu-head"><strong>Filters</strong><button type="button" class="ar-link" data-ev-clear-all>Reset</button></div>' +
      '<div class="ar-fmenu-body gr-scroll">' +
      '<div class="ar-cf-menu-head">Format</div>' + EVENT_FORMATS.map(function (f) {
        return check('formats', f.id, f.name, f.icon, count(function (e) { return e.format === f.id; }));
      }).join('') +
      '<div class="ar-cf-menu-head">Event type</div>' + EVENT_KINDS.map(function (k) {
        return check('kinds', k.id, k.name, k.icon, count(function (e) { return e.kind === k.id; }));
      }).join('') +
      '<div class="ar-cf-menu-head">City</div>' + eventCities().map(function (c) {
        return check('cities', c, c, 'location_city', count(function (e) { return eventPlaces(e).indexOf(c) !== -1; }));
      }).join('') +
      '<div class="ar-cf-menu-head">Meeting platform</div>' + Object.keys(PLATFORM_LINKS).map(function (p) {
        return check('platforms', p, p, 'videocam', count(function (e) { return e.platform === p; }));
      }).join('') + '</div>';
    var n = efFacetCount();
    $('ev-filter-count').hidden = !n;
    $('ev-filter-count').textContent = n;
    $('ev-filter-btn').classList.toggle('active', !!n);
  }

  function renderEventChips() {
    var names = {
      formats: function (v) { return formatById(v).name; },
      kinds: function (v) { return kindById(v).name; },
      cities: function (v) { return v; },
      platforms: function (v) { return v; },
    };
    var chips = [];
    ['formats', 'kinds', 'cities', 'platforms'].forEach(function (g) {
      EF[g].forEach(function (v) {
        chips.push('<button type="button" class="ar-filter-chip" data-ev-clear="' + g + ':' + esc(v) + '">' + esc(names[g](v)) + ico('close') + '</button>');
      });
    });
    if (chips.length > 1) chips.push('<button type="button" class="ar-link" data-ev-clear-all>Clear all</button>');
    $('ev-active-filters').innerHTML = chips.join('');
    $('ev-active-filters').hidden = !chips.length;
  }

  /* ——— Events: insights ——— */

  function insightRows(rows, group, max) {
    if (!rows.length) return '<p class="ar-muted ar-ev-none">No events here with these filters.</p>';
    return rows.map(function (r) {
      var on = group === 'program' ? EF.program === r.id : EF[group].indexOf(r.id) !== -1;
      return '<button type="button" class="ar-ev-row' + (on ? ' active' : '') + '" data-ev-facet="' + group + ':' + esc(r.id) + '" aria-pressed="' + on + '">' +
        '<span class="ar-frow-ico">' + ico(r.icon) + '</span>' +
        '<span class="ar-ev-row-name">' + esc(r.name) + '<small>' + r.regs.toLocaleString('en-IN') + ' registrations</small></span>' +
        '<span class="ar-ev-bar"><i style="width:' + (max ? Math.max(4, Math.round((r.n / max) * 100)) : 0) + '%"></i></span>' +
        '<strong>' + r.n + '</strong></button>';
    }).join('');
  }

  function tally(list, groups, keyOf) {
    return groups.map(function (g) {
      var hit = list.filter(function (e) { return keyOf(e).indexOf(g.id) !== -1; });
      return { id: g.id, name: g.name, icon: g.icon, n: hit.length, regs: hit.reduce(function (a, e) { return a + e.registrations; }, 0) };
    });
  }

  function maxN(rows) {
    return rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0);
  }

  function renderEventInsights() {
    var formats = tally(EVENTS.filter(function (e) { return eventPasses(e, 'formats'); }), EVENT_FORMATS, function (e) { return [e.format]; });
    var kinds = tally(EVENTS.filter(function (e) { return eventPasses(e, 'kinds'); }), EVENT_KINDS, function (e) { return [e.kind]; });
    var programs = tally(EVENTS.filter(function (e) { return eventPasses(e, 'program'); }),
      PROGRAMS.map(function (p) { return { id: p.id, name: p.name, icon: 'school' }; }), function (e) { return [e.program]; })
      .filter(function (r) { return r.n; });
    var cityList = EVENTS.filter(function (e) { return eventPasses(e, 'cities'); });
    var cities = tally(cityList, eventCities().map(function (c) { return { id: c, name: c, icon: 'location_on' }; }), eventPlaces)
      .filter(function (r) { return r.n; })
      .sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); });
    var typeMax = Math.max(maxN(formats), maxN(kinds));

    $('ev-insights').innerHTML =
      '<div class="ar-ev-panels">' +
      '<div class="panel ar-ev-panel"><div class="panel-head"><h2>Event type</h2></div>' +
      '<span class="ar-factions-head">Format</span>' + insightRows(formats, 'formats', typeMax) +
      '<span class="ar-factions-head ar-ev-sub">Kind of event</span>' + insightRows(kinds, 'kinds', typeMax) + '</div>' +
      '<div class="panel ar-ev-panel"><div class="panel-head"><h2>Events by program</h2></div>' + insightRows(programs, 'program', maxN(programs)) + '</div>' +
      '<div class="panel ar-ev-panel"><div class="panel-head"><h2>Offline locations</h2><span class="ar-meta">Offline and hybrid</span></div>' +
      insightRows(cities, 'cities', maxN(cities)) + '</div>' +
      '</div>';
  }

  /* ——— Events: board ——— */

  function countdownText(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + String(sec).padStart(2, '0') + 's';
  }

  /** Within a day of the start the time turns into a live countdown. */
  function eventWhen(e, now) {
    var start = e.start.getTime();
    var day = fmtShort(e.start, e.start.getFullYear() !== new Date(now).getFullYear());
    if (e.draft) return { cls: 'draft', icon: 'edit_calendar', text: day + ', ' + fmtTime(e.start) };
    if (now >= e.end.getTime()) return { cls: 'past', icon: 'event_available', text: day + ', ' + fmtTime(e.start) };
    if (now >= start) return { cls: 'now', icon: '', text: 'Live now' };
    if (start - now <= 86400000) return { cls: 'soon', icon: 'timer', text: 'Starts in ' + countdownText(start - now) };
    return { cls: '', icon: 'schedule', text: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][e.start.getDay()] + ' ' + day + ', ' + fmtTime(e.start) };
  }

  function whenHtml(e, now) {
    var w = eventWhen(e, now);
    return '<span class="ar-ev-when ' + w.cls + '" data-ev-when="' + e.id + '">' + (w.cls === 'now' ? '<i></i>' : ico(w.icon)) + '<span>' + esc(w.text) + '</span></span>';
  }

  function coverHtml(e, now, big) {
    var k = kindById(e.kind);
    return '<div class="ar-ev-cover k-' + e.kind + (big ? ' big' : '') + '"' + (e.image ? ' style="background-image:url(' + esc(e.image) + ')"' : '') + '>' +
      (e.image ? '' : '<span class="ar-ev-cover-art" aria-hidden="true">' + ico(k.icon) + '</span>') +
      '<span class="ar-ev-kind">' + ico(k.icon) + esc(k.name) + '</span>' + whenHtml(e, now) + '</div>';
  }

  function placeHtml(e) {
    var f = formatById(e.format);
    var html = '<span class="ar-ev-format f-' + e.format + '">' + ico(f.icon) + f.name + '</span>';
    if (e.format !== 'online') {
      html += '<span class="ar-ev-place" title="' + esc(e.venue + ', ' + e.city) + '">' + ico('location_on') + '<span>' + esc(e.city) + ' · ' + esc(e.venue) + '</span></span>';
    }
    if (e.format !== 'offline') {
      html += '<a class="ar-ev-link" href="' + esc(e.link) + '" target="_blank" rel="noopener" title="' + esc(e.link) + '">' + ico('videocam') + '<span>' + esc(e.platform) + '</span>' + ico('open_in_new') + '</a>';
    }
    return html;
  }

  function metricsHtml(e) {
    var none = e.draft;
    var rate = e.clicks ? Math.round((e.registrations / e.clicks) * 100) : 0;
    return '<div class="ar-ev-metrics">' +
      '<div><span>' + ico('ads_click') + 'Clicks</span><strong>' + (none ? '—' : e.clicks.toLocaleString('en-IN')) + '</strong></div>' +
      '<div><span>' + ico('how_to_reg') + 'Registrations</span><strong>' + (none ? '—' : e.registrations.toLocaleString('en-IN')) +
      (none ? '' : '<small>' + rate + '% of clicks</small>') + '</strong></div></div>';
  }

  function followupChips(e) {
    var f = followupsFor(e);
    return '<div class="ar-ev-follow"><span>After registration</span>' + FOLLOWUP_CHANNELS.map(function (c) {
      var on = f[c.id].on;
      return '<button type="button" class="ar-ev-follow-chip' + (on ? ' on' : '') + '" data-ev-followup="' + e.id + ':' + c.id + '" title="' +
        (on ? c.name + ' goes out when someone registers. Click to edit.' : c.name + ' is off. Click to set it up.') + '">' +
        ico(c.icon) + c.name + ico(on ? 'check_circle' : 'add_circle') + '</button>';
    }).join('') + '</div>';
  }

  function eventCardHtml(e, now) {
    var pref = eventPref(e);
    return '<div class="ar-ev-card" role="button" tabindex="0" data-event="' + e.id + '">' + coverHtml(e, now) +
      '<div class="ar-ev-body">' +
      '<div class="ar-ev-title"><strong>' + esc(e.name) + '</strong>' +
      '<small>' + esc(programById(e.program).name) + ' · ' + e.cohort + ' intake' + (pref ? ' · ' + esc(pref.name) : '') + '</small></div>' +
      metricsHtml(e) +
      '<div class="ar-ev-type">' + placeHtml(e) + '</div>' +
      followupChips(e) + '</div></div>';
  }

  var evStatuses = {};

  function renderEventBoard() {
    var now = Date.now();
    var list = EVENTS.filter(function (e) { return eventPasses(e); });
    evStatuses = {};
    list.forEach(function (e) { evStatuses[e.id] = eventStatus(e, now); });
    var sorters = {
      live: function (a, b) { return a.start - b.start; },
      completed: function (a, b) { return b.start - a.start; },
      draft: function (a, b) { return a.start - b.start; },
    };
    $('ev-count').textContent = list.length;
    $('ev-board').innerHTML = EVENT_BUCKETS.map(function (b) {
      var items = list.filter(function (e) { return evStatuses[e.id] === b.id; }).sort(sorters[b.id]);
      return '<div class="ar-col"><div class="ar-col-head"><h3><i style="background:' + b.color + '"></i>' + b.name +
        '<b class="ar-col-count">' + items.length + '</b></h3><small>' + b.note + '</small></div>' +
        '<div class="ar-col-list gr-scroll">' + (items.length ? items.map(function (e) { return eventCardHtml(e, now); }).join('')
          : '<div class="ar-col-empty">No ' + b.name.toLowerCase() + ' events with these filters.</div>') + '</div></div>';
    }).join('');
  }

  function renderEvents() {
    renderEventPickers();
    renderEventChips();
    renderEventInsights();
    renderEventBoard();
  }

  /** Ticks the countdowns; an event that starts or ends moves to its new bucket. */
  window.setInterval(function () {
    if (state.view !== 'events') return;
    var now = Date.now();
    var moved = Object.keys(evStatuses).some(function (id) { return eventStatus(eventById(id), now) !== evStatuses[id]; });
    if (moved) {
      renderEventInsights();
      renderEventBoard();
    }
    document.querySelectorAll('[data-ev-when]').forEach(function (el) {
      var w = eventWhen(eventById(el.getAttribute('data-ev-when')), now);
      if (w.cls !== 'soon' && w.cls !== 'now') return;
      el.className = 'ar-ev-when ' + w.cls;
      el.lastChild.textContent = w.text;
    });
  }, 1000);

  /* ——— Events: detail and after-registration messages ——— */

  function openEvent(id, fromRoute) {
    var e = eventById(id);
    if (!e) return;
    var now = Date.now();
    var pref = eventPref(e);
    var f = followupsFor(e);
    var follow = FOLLOWUP_CHANNELS.map(function (c) {
      var m = f[c.id];
      return '<div class="ar-ev-msg' + (m.on ? ' on' : '') + '"><div class="ar-ev-msg-head">' + ico(c.icon) + '<strong>' + c.name + '</strong>' +
        '<em>' + (m.on ? 'On' : 'Off') + '</em>' +
        '<button type="button" class="ar-link" data-ev-followup="' + e.id + ':' + c.id + '">' + ico('edit') + 'Edit</button></div>' +
        (m.on ? '<p>' + (m.subject ? '<b>' + esc(fillEventTemplate(m.subject, e, 'Aarav')) + '</b>' : '') + esc(fillEventTemplate(m.text, e, 'Aarav')) + '</p>' : '') + '</div>';
    }).join('');
    var impressions = eventImpressions(e);
    var ctr = impressions ? Math.round((e.clicks / impressions) * 100) : 0;
    var regRate = e.clicks ? Math.round((e.registrations / e.clicks) * 100) : 0;
    var detailHtml = '<div class="ar-ev-detail">' +
      '<div class="ar-ev-detail-top">' +
      '<div>' + coverHtml(e, now, true) + '</div>' +
      '<div class="ar-ev-detail-side"><div class="ar-ev-dhead"><h3>' + esc(e.name) + '</h3><p>' + esc(formatById(e.format).name) + ' · ' + esc(kindById(e.kind).name) + ' · ' + esc(e.id) + '</p></div>' +
      '<div class="ar-ev-date-row"><span>Start date: <b>' + esc(fmtDate(e.start)) + '</b></span><span>Start time: <b>' + esc(fmtTime(e.start)) + '</b></span></div>' +
      '<div class="ar-ev-detail-metrics">' +
      eventMetricTile('Impressions', impressions) + eventMetricTile('Total clicks', e.clicks) + eventMetricTile('Registrations', e.registrations) +
      eventMetricTile('Click-through rate', ctr + '%', 'Clicked / Impressions') + eventMetricTile('Registration rate', regRate + '%', 'Registered / Clicked') +
      '</div></div></div>' +
      '<div class="ar-ev-detail-section"><h4>Event details</h4><div class="ar-ev-detail-grid">' +
      detailKV('Name', e.name) + detailKV('Duration', e.minutes >= 60 ? (e.minutes / 60) + ' hours' : e.minutes + ' minutes') +
      detailKV('Type', formatById(e.format).name) + detailKV('Category', e.category || kindById(e.kind).name) +
      detailKV('Program', programById(e.program).name) + detailKV('Audience', pref ? pref.name : 'Everyone in the program') +
      '</div></div>' +
      '<div class="ar-ev-detail-section"><div class="ar-ev-detail-cols">' +
      '<div><h4>Registration details</h4>' + factsHtml([['Form', 'AdmitRight event form'], ['Deadline', 'Open until event starts'], ['After registration', FOLLOWUP_CHANNELS.filter(function (c) { return f[c.id].on; }).map(function (c) { return c.name; }).join(', ') || 'None']]) + '</div>' +
      '<div><h4>Date & time</h4>' + factsHtml([['Start date', fmtDate(e.start)], ['Start time', fmtTime(e.start)], ['End date', fmtDate(e.end)], ['End time', fmtTime(e.end)]]) + '</div>' +
      '<div><h4>Venue details</h4><div class="ar-ev-type ar-ev-dtype">' + placeHtml(e) + '</div></div>' +
      '</div></div>' +
      '<div class="ar-ev-detail-section"><h4>Description</h4><p class="ar-ev-detail-desc">' + esc(eventDescription(e)) + '</p></div>' +
      '<div class="ar-ev-detail-section"><h4>After registration</h4><p class="ar-muted">Sent automatically to each student who registers. Shown here with a sample name.</p>' + follow + '</div>' +
      '<div class="ar-ev-detail-section"><div class="ar-ev-table-head"><h4>' + e.registrations + ' Registered users</h4><span class="ar-meta">' + impressions + ' impressions</span></div>' +
      '<div class="ar-seg ar-ev-detail-tabs"><button type="button" class="ar-seg-btn active">Registered users</button><button type="button" class="ar-seg-btn">Impressions</button></div>' +
      eventPeopleTable(e, 'registered') + eventPeopleTable(e, 'impressions') + '</div>' +
      '</div>';
    $('ev-detail-page-title').textContent = e.name;
    $('ev-detail-page-sub').textContent = formatById(e.format).name + ' · ' + kindById(e.kind).name + ' · ' + e.id;
    $('ev-detail-body').innerHTML = detailHtml;
    currentEventId = e.id;
    showEventsPage('detail');
    if (!fromRoute) goTo('events/' + encodeURIComponent(e.id));
  }

  function eventMetricTile(label, value, note) {
    return '<div><span>' + esc(label) + '</span><strong>' + esc(String(value)) + '</strong>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</div>';
  }

  function detailKV(k, v) {
    return '<div><span>' + esc(k) + '</span><strong>' + esc(String(v || '—')) + '</strong></div>';
  }

  function eventImpressions(e) {
    return Math.max(e.clicks + e.registrations * 2, Math.round(e.clicks * 1.35), e.registrations, e.draft ? 0 : 3);
  }

  function eventDescription(e) {
    return e.description || (e.name + ' helps ' + programById(e.program).name + ' prospects understand the program, admissions expectations, next steps, and what makes the experience valuable for the selected audience.');
  }

  function eventAudienceStudents(e) {
    var pref = eventPref(e);
    return STUDENTS.filter(function (s) {
      if (s.program !== e.program) return false;
      return !pref || scoreAgainst(s, pref).score >= CLOSE_MIN;
    }).sort(byScore);
  }

  function eventPeopleTable(e, mode) {
    var all = eventAudienceStudents(e);
    var n = mode === 'registered' ? e.registrations : eventImpressions(e);
    var rows = all.slice(mode === 'registered' ? 0 : 2, Math.min(all.length, (mode === 'registered' ? 0 : 2) + Math.min(n, 5)));
    return '<div class="ar-ev-detail-table' + (mode === 'impressions' ? ' muted' : '') + '">' +
      '<table><thead><tr><th>User ID</th><th>Name</th><th>Viewed</th><th>Opened</th><th>Registered</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (s, i) {
        var reg = mode === 'registered';
        return '<tr><td>' + esc(s.id.replace(/^(.{4}).+(.{4})$/, '$1…$2')) + '</td><td>' + esc(s.name) + '</td>' +
          '<td>' + ico('check') + '</td><td>' + (i % 3 ? ico('close') : ico('check')) + '</td><td>' + (reg ? ico('check') : ico('close')) + '</td></tr>';
      }).join('') : '<tr><td colspan="5">No ' + (mode === 'registered' ? 'registrations' : 'impressions') + ' found.</td></tr>') +
      '</tbody></table></div>';
  }

  var evEditor = null; // { id, channel, draft }

  function openFollowupEditor(id, channel) {
    var e = eventById(id);
    if (!e) return;
    evEditor = { id: id, channel: channel, draft: clone(followupsFor(e)) };
    openDrawer('After registration', '', '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-evm-save>Save</button>', true);
    $('drawer').classList.add('ar-campaign-modal');
    renderFollowupEditor();
  }

  function readFollowupEditor() {
    if (!evEditor || !$('evm-text')) return;
    var m = evEditor.draft[evEditor.channel];
    m.on = $('evm-on').checked;
    m.text = $('evm-text').value;
    if ($('evm-subject')) m.subject = $('evm-subject').value;
  }

  function renderFollowupEditor() {
    var e = eventById(evEditor.id);
    var ch = evEditor.channel;
    var m = evEditor.draft[ch];
    var name = FOLLOWUP_CHANNELS.filter(function (c) { return c.id === ch; })[0].name;
    $('drawer-body').innerHTML =
      '<div class="ar-cm-to"><span class="ar-ev-thumb k-' + e.kind + '">' + ico(kindById(e.kind).icon) + '</span>' +
      '<div><strong>' + esc(e.name) + '</strong><small>' + esc(fmtDateTime(e.start)) + ' · ' + esc(formatById(e.format).name) + '</small></div></div>' +
      '<div class="ar-cm-channels ar-evm-channels" role="tablist" aria-label="Channel">' + FOLLOWUP_CHANNELS.map(function (c) {
        var on = c.id === ch;
        return '<button type="button" class="ar-cm-channel' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-evm-channel="' + c.id + '">' +
          ico(c.icon) + c.name + (evEditor.draft[c.id].on ? '' : ' <small>Off</small>') + '</button>';
      }).join('') + '</div>' +
      '<label class="ar-evm-toggle"><input type="checkbox" id="evm-on"' + (m.on ? ' checked' : '') + '><span class="ar-evm-switch" aria-hidden="true"></span>' +
      '<span>Send this ' + name + ' when a student registers</span></label>' +
      (ch === 'email' ? '<div class="field"><label for="evm-subject">Subject</label><input type="text" id="evm-subject" value="' + esc(m.subject) + '" /></div>' : '') +
      '<div class="field"><label for="evm-text">Message</label><textarea id="evm-text" rows="7">' + esc(m.text) + '</textarea></div>' +
      '<p class="ar-cm-note">' + ico('auto_fix_high') + '{first}, {event}, {date}, {time} and {where} are filled in for each registrant.</p>' +
      '<p class="ar-cm-note">' + ico('lock') + 'Sent through AdmitRight. Students’ phone numbers and emails stay private.</p>';
  }

  function saveFollowupEditor() {
    readFollowupEditor();
    var e = eventById(evEditor.id);
    var bad = FOLLOWUP_CHANNELS.filter(function (c) { return evEditor.draft[c.id].on && !evEditor.draft[c.id].text.trim(); })[0];
    if (bad) {
      evEditor.channel = bad.id;
      renderFollowupEditor();
      $('evm-text').focus();
      toast('Write the ' + bad.name + ' message, or turn it off.');
      return;
    }
    FOLLOWUPS[e.id] = evEditor.draft;
    saveFollowups();
    var on = FOLLOWUP_CHANNELS.filter(function (c) { return evEditor.draft[c.id].on; }).map(function (c) { return c.name; });
    closeDrawer();
    toast(on.length ? on.join(' and ') + ' will go out after each registration.' : 'After-registration messages are off for this event.');
    renderEvents();
  }

  /* ——— Events: create wizard ——— */

  var EVENT_CATEGORIES = ['Open House', 'Webinar', 'Workshop', 'Career Fair', 'Scholarship Session', 'Meet the experts', 'Alumni Meetup', 'Other'];
  var EVENT_CATEGORY_KIND = {
    'Open House': 'webinar',
    'Webinar': 'webinar',
    'Workshop': 'expert',
    'Career Fair': 'expert',
    'Scholarship Session': 'ama',
    'Meet the experts': 'expert',
    'Alumni Meetup': 'coffee',
    'Other': 'ama',
  };
  var evCreate = null; // { step, draft }
  var currentEventId = null;

  function showEventsPage(mode) {
    var list = mode === 'list';
    $('events-list-head').hidden = !list;
    $('events-list-content').hidden = !list;
    $('events-create-page').hidden = mode !== 'create';
    $('events-detail-page').hidden = mode !== 'detail';
    window.scrollTo(0, 0);
  }

  function savedFilterInfo(programId) {
    try {
      var saved = JSON.parse(localStorage.getItem(FILTERS_KEY) || 'null');
      if (!saved || !saved.filters) return null;
      return {
        program: saved.program,
        prefId: saved.prefId,
        label: (saved.program === 'all' ? 'All programs' : programById(saved.program).name) +
          (saved.prefId ? ' · ' + findPref(saved.program, saved.prefId).name : '') +
          (saved.intake ? ' · ' + saved.intake + ' intake' : ''),
        disabled: programId !== 'all' && saved.program !== programId,
      };
    } catch (err) { return null; }
  }

  function newEventDraft() {
    return {
      format: 'online', kind: 'webinar', name: '', category: 'Open House',
      program: PROGRAMS[0].id, prefId: '', savedFilter: '', matchScore: '0',
      description: '', coverImage: '', galleryImages: [],
      hasMeetingLink: false, startDate: '', startTime: '', time24: false, timezone: 'IST (GMT +05:30)',
      endMode: 'duration', days: '00', hours: '01', minutes: '00',
      registration: 'link', formLink: '', keepOpen: false, formBuilt: false,
    };
  }

  function openEventCreate(fromRoute) {
    if (!fromRoute || !evCreate) evCreate = { step: 0, draft: newEventDraft() };
    showEventsPage('create');
    renderEventCreate();
    if (!fromRoute) goTo('events/create');
  }

  function evDraft() {
    return evCreate && evCreate.draft;
  }

  function readEventCreate() {
    var d = evDraft();
    if (!d) return;
    ['name', 'category', 'kind', 'program', 'prefId', 'savedFilter', 'matchScore', 'description', 'startDate', 'startTime', 'timezone',
      'days', 'hours', 'minutes', 'registration', 'formLink'].forEach(function (k) {
      var el = $('evc-' + k);
      if (el) d[k] = el.value;
    });
    d.kind = EVENT_CATEGORY_KIND[d.category] || d.kind || 'webinar';
    var checked = document.querySelector('[name="evc-format"]:checked');
    if (checked) d.format = checked.value;
    ['cover', 'gallery', 'hasMeetingLink', 'time24', 'keepOpen'].forEach(function (k) {
      var el = $('evc-' + k);
      if (el) d[k] = el.checked;
    });
  }

  function stepperHtml() {
    var names = ['Event basics', 'Venue and date', 'Registration details', 'Review & publish'];
    return '<div class="ar-evc-stepper">' + names.map(function (n, i) {
      var cls = i < evCreate.step ? ' done' : i === evCreate.step ? ' active' : '';
      return '<span class="' + cls + '"><i>' + (i < evCreate.step ? ico('check') : '') + '</i><b>' + esc(n) + '</b></span>';
    }).join('') + '</div>';
  }

  function fieldWrap(label, html, req) {
    return '<label class="ar-evc-field"><span>' + esc(label) + (req ? '<em>*</em>' : '') + '</span>' + html + '</label>';
  }

  function textInput(id, value, ph) {
    return '<input type="text" id="' + id + '" value="' + esc(value) + '" placeholder="' + esc(ph || '') + '">';
  }

  function selectHtml(id, value, options) {
    return '<select id="' + id + '">' + options.map(function (o) {
      var val = typeof o === 'string' ? o : o[0];
      var label = typeof o === 'string' ? o : o[1];
      var disabled = typeof o !== 'string' && o[2];
      return '<option value="' + esc(val) + '"' + (value === val ? ' selected' : '') + (disabled ? ' disabled' : '') + '>' + esc(label) + '</option>';
    }).join('') + '</select>';
  }

  function toggleField(id, checked, label, note) {
    return '<label class="ar-evm-toggle ar-evc-toggle"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="ar-evm-switch" aria-hidden="true"></span><span><b>' + esc(label) + '</b><small>' + esc(note || '') + '</small></span></label>';
  }

  function audienceTargetCount(d) {
    var pref = d.prefId ? findPref(d.program, d.prefId) : null;
    var min = Number(d.matchScore) || 0;
    return STUDENTS.filter(function (s) {
      if (s.program !== d.program) return false;
      if (!pref) return true;
      return scoreAgainst(s, pref).score >= min;
    }).length;
  }

  function createBasicsHtml() {
    var d = evDraft();
    var saved = savedFilterInfo(d.program);
    var prefOpts = [['', 'All students in the selected program']].concat(prefsFor(d.program).map(function (p) { return [p.id, p.name]; }));
    var filterOpts = [['', 'No saved filter']];
    if (saved) filterOpts.push(['saved', saved.label + (saved.disabled ? ' (pick matching program first)' : ''), saved.disabled]);
    var leads = audienceTargetCount(d);
    var scoreOpts = [['0', d.prefId ? 'Any match score' : 'Select preference to score leads'], ['80', '80% and above'], ['70', '70% and above'], ['60', '60% and above'], ['50', '50% and above']];
    d.kind = EVENT_CATEGORY_KIND[d.category] || d.kind || 'webinar';
    return '<section class="ar-evc-section"><h3>Event basics</h3>' +
      '<div class="ar-evc-row ar-evc-top-row">' +
      fieldWrap('Event name', textInput('evc-name', d.name, 'Name your event'), false) +
      fieldWrap('Event category', selectHtml('evc-category', d.category, EVENT_CATEGORIES), true) + '</div>' +
      '<div class="ar-evc-formats">' + EVENT_FORMATS.map(function (f) {
        return '<label class="' + (d.format === f.id ? ' on' : '') + '"><input type="radio" name="evc-format" value="' + f.id + '"' + (d.format === f.id ? ' checked' : '') + '>' +
          ico(f.icon) + '<span>' + esc(f.name) + ' event</span></label>';
      }).join('') + '</div>' +
      '<div class="ar-evc-group"><h4>Audience</h4><p>Choose who this event is for. Program, preference and saved filters are grouped here.</p>' +
      fieldWrap('Program', selectHtml('evc-program', d.program, PROGRAMS.map(function (p) { return [p.id, p.name]; })), true) +
      fieldWrap('Target audience preference', selectHtml('evc-prefId', d.prefId, prefOpts), false) +
      fieldWrap('Match score', selectHtml('evc-matchScore', d.matchScore, scoreOpts), false) +
      fieldWrap('Saved filter', selectHtml('evc-savedFilter', d.savedFilter, filterOpts), false) +
      '<div class="ar-evc-target"><span>Total targeted lead</span><strong>' + leads.toLocaleString() + '</strong><small>' +
      esc((d.prefId ? 'Based on selected preference and match score.' : 'Based on selected program.') + (d.savedFilter ? ' Saved filter will narrow this audience.' : '')) +
      '</small></div></div>' +
      fieldWrap('Description', '<textarea id="evc-description" rows="6" placeholder="Describe why students should attend">' + esc(d.description) + '</textarea>', true) +
      '<div class="ar-evc-media"><span>Cover image*</span><div class="ar-evc-cover k-' + d.kind + '">' +
      (d.coverImage ? '<img src="' + esc(d.coverImage) + '" alt="Event cover preview">' : ico(kindById(d.kind).icon)) +
      '<button type="button" data-evc-remove-cover aria-label="Remove image">×</button></div>' +
      '<input type="file" id="evc-coverFile" accept="image/*" hidden>' +
      '<label class="ar-link" for="evc-coverFile">Change image</label></div>' +
      '<div class="ar-evc-gallery"><span>Gallery images</span><small>Add photos from past events or extra details to attract the right students.</small>' +
      '<div class="ar-evc-gallery-grid">' + d.galleryImages.map(function (src, i) {
        return '<div><img src="' + esc(src) + '" alt="Gallery preview"><button type="button" data-evc-remove-gallery="' + i + '" aria-label="Remove gallery image">×</button></div>';
      }).join('') + '</div>' +
      '<input type="file" id="evc-galleryFiles" accept="image/*" multiple hidden>' +
      '<label class="ar-link" for="evc-galleryFiles">' + ico('add') + 'Add more images</label></div>' +
      '</section>';
  }

  function createVenueHtml() {
    var d = evDraft();
    var online = d.format !== 'offline';
    return '<section class="ar-evc-section"><h3>Venue details</h3><p>' + (online ? 'Meeting credentials will be shared with attendees by email after registration.' : 'Venue details will be shown on the event page.') + '</p>' +
      (online ? toggleField('evc-hasMeetingLink', d.hasMeetingLink, 'Do you have the meeting link?', 'Turn this on if attendees should see the meeting link after registration.') : '') +
      '<h3>Start Details</h3>' +
      '<div class="ar-evc-time-row">' + fieldWrap('Start date', '<input type="date" id="evc-startDate" value="' + esc(d.startDate) + '">', false) +
      fieldWrap('Start time', '<input type="time" id="evc-startTime" value="' + esc(d.startTime) + '">', true) +
      toggleField('evc-time24', d.time24, '24 hour format', '') +
      fieldWrap('Timezone', selectHtml('evc-timezone', d.timezone, ['IST (GMT +05:30)', 'GMT', 'EST (GMT -05:00)', 'PST (GMT -08:00)']), true) + '</div>' +
      '<h3>End details</h3><div class="ar-evc-radio-row"><label><input type="radio" name="evc-end" checked> Event duration</label><label><input type="radio" name="evc-end"> Event end time</label></div>' +
      '<div class="ar-evc-row">' + fieldWrap('Days', selectHtml('evc-days', d.days, ['00', '01', '02'])) +
      fieldWrap('Hours', selectHtml('evc-hours', d.hours, ['00', '01', '02', '03', '04'])) +
      fieldWrap('Minutes', selectHtml('evc-minutes', d.minutes, ['00', '15', '30', '45'])) + '</div></section>';
  }

  function createRegistrationHtml() {
    var d = evDraft();
    var option = function (id, title, body) {
      return '<label class="ar-evc-reg ' + (d.registration === id ? 'on' : '') + '" data-evc-registration="' + id + '"><input type="radio" name="evc-registration" value="' + id + '"' + (d.registration === id ? ' checked' : '') + '>' +
        '<span><b>' + title + '</b>' + (body || '') + '</span></label>';
    };
    return '<section class="ar-evc-section"><h3>Registration details</h3>' +
      option('link', 'Add your registration form link', d.registration === 'link' ? fieldWrap('Registration form link', textInput('evc-formLink', d.formLink, 'https://'), true) : '') +
      option('new', 'Create a new form', d.formBuilt ? '<small>A form already exists. You can edit it.</small><button type="button" class="btn btn-secondary btn-sm" data-ev-form-builder>' + ico('edit') + 'Edit</button>' : '<small>Click Next step to open form builder.</small>') +
      option('template', 'Choose a template', d.registration === 'template' ? '<div class="ar-evc-template">Default Registration Template</div><button type="button" class="btn btn-primary btn-sm" data-ev-apply-template>Apply template to continue</button>' : '') +
      '<h3>Set registration deadline</h3><p class="ar-evc-note">Complete one registration method above to finalize and validate this deadline.</p>' +
      '<div class="ar-evc-time-row">' + fieldWrap('End date', '<input type="date">', false) +
      fieldWrap('End time', '<input type="time">', true) +
      toggleField('evc-time24', d.time24, '24 hour format', '') +
      fieldWrap('Timezone', selectHtml('evc-timezone', d.timezone, ['IST (GMT +05:30)', 'GMT']), true) + '</div>' +
      '<label class="ar-check"><input type="checkbox" id="evc-keepOpen"' + (d.keepOpen ? ' checked' : '') + '> Keep registrations open until event starts</label>' +
      '</section>';
  }

  function createReviewHtml() {
    var d = evDraft();
    var program = programById(d.program);
    var pref = d.prefId ? findPref(d.program, d.prefId) : null;
    return '<section class="ar-evc-review"><div class="ar-evc-phone">' +
      '<div class="ar-evc-mobile-card k-' + d.kind + '">' + ico(kindById(d.kind).icon) + '<span>' + esc(d.category) + '</span><h3>' + esc(d.name || 'Untitled event') + '</h3><p>' + esc(program.name) + '</p></div>' +
      '<div class="ar-seg ar-evc-theme"><button type="button" class="ar-seg-btn active">Dark mode</button><button type="button" class="ar-seg-btn">Light mode</button></div></div>' +
      '<div class="ar-evc-review-copy"><h3>Scroll and <span>review</span> your event in this prototype</h3><p>Choose the page you want to view</p>' +
      '<label><input type="radio" checked> Event card</label><label><input type="radio"> Event details</label><label><input type="radio"> Registration form</label>' +
      '<div class="ar-evc-review-actions"><button type="button" class="btn btn-secondary" data-ev-publish="draft">Save event as draft</button>' +
      '<button type="button" class="btn btn-primary" data-ev-publish="publish">Publish event</button></div>' +
      '<small>Built with ' + (d.registration === 'link' ? 'external form link' : d.registration === 'template' ? 'template form' : 'custom form') + '</small>' +
      '<small>Audience: ' + esc(pref ? pref.name : 'All ' + program.name + ' students') + (d.savedFilter ? ' · saved filter' : '') + '</small></div></section>';
  }

  function renderEventCreate() {
    var html = [createBasicsHtml, createVenueHtml, createRegistrationHtml, createReviewHtml][evCreate.step]();
    var body = $('events-create-page') && !$('events-create-page').hidden ? $('ev-create-body') : $('drawer-body');
    var foot = $('events-create-page') && !$('events-create-page').hidden ? $('ev-create-foot') : $('drawer-foot');
    body.innerHTML = stepperHtml() + html;
    foot.innerHTML = '<button type="button" class="btn btn-ghost btn-sm" data-ev-create-back>Back</button>' +
      '<button type="button" class="btn btn-primary btn-sm btn-icon" data-ev-create-next>Next step' + ico('arrow_forward') + '</button>';
    var back = document.querySelector('[data-ev-create-back]');
    if (back) back.textContent = evCreate.step ? 'Previous step' : 'Cancel';
    var next = document.querySelector('[data-ev-create-next]');
    if (next) next.hidden = evCreate.step === 3;
  }

  function eventCreateNext() {
    readEventCreate();
    if (evCreate.step === 0 && !evCreate.draft.name.trim()) {
      $('evc-name').focus();
      toast('Add an event name.');
      return;
    }
    if (evCreate.step === 2 && evCreate.draft.registration === 'new' && !evCreate.draft.formBuilt) {
      evCreate.draft.formBuilt = true;
      renderEventCreate();
      toast('Form builder added a default form.');
      return;
    }
    if (evCreate.step < 3) evCreate.step += 1;
    renderEventCreate();
  }

  function publishCreatedEvent(mode) {
    readEventCreate();
    var d = evCreate.draft;
    var start = new Date();
    start.setDate(start.getDate() + 14);
    var kind = kindById(d.kind);
    var format = formatById(d.format);
    var prefList = prefsFor(d.program);
    var prefIndex = d.prefId ? prefList.map(function (p) { return p.id; }).indexOf(d.prefId) : null;
    if (prefIndex < 0) prefIndex = null;
    EVENTS.unshift({
      id: 'EV-' + (1000 + EVENTS.length + 1), name: d.name.trim() || 'Untitled event', kind: d.kind, format: d.format,
      program: d.program, prefIndex: prefIndex,
      cohort: state.intake || '2027', start: start, end: new Date(start.getTime() + 3600000), minutes: 60,
      city: d.format === 'online' ? '' : CAMPUS.city, venue: d.format === 'online' ? '' : CAMPUS.venue,
      platform: d.format === 'offline' ? '' : 'Zoom', link: d.format === 'offline' ? '' : PLATFORM_LINKS.Zoom(EVENTS.length + 3),
      clicks: 0, registrations: 0, draft: mode === 'draft', host: kind.name + ' host', image: '',
      category: d.category, savedFilter: d.savedFilter, displayFormat: format.name,
    });
    evCreate = null;
    currentEventId = null;
    toast(mode === 'draft' ? 'Event saved as draft.' : 'Event published.');
    goTo('events');
  }

  function readImageFiles(files, done) {
    var list = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) {
      done([]);
      return;
    }
    var out = [];
    var left = list.length;
    list.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        out.push(reader.result);
        left -= 1;
        if (!left) done(out);
      };
      reader.onerror = function () {
        left -= 1;
        if (!left) done(out);
      };
      reader.readAsDataURL(file);
    });
  }

  var MENUS = [['program-btn', 'program-menu'], ['pref-btn', 'pref-menu'], ['range-btn', 'range-menu'], ['intake-btn', 'intake-menu'], ['filter-btn', 'filter-menu'], ['bulk-btn', 'bulk-menu'],
    ['cf-program-btn', 'cf-program-menu'], ['cf-pref-btn', 'cf-pref-menu'], ['cf-score-btn', 'cf-score-menu'], ['cf-stage-btn', 'cf-stage-menu'], ['cf-extra-btn', 'cf-extra-menu'],
    ['ev-program-btn', 'ev-program-menu'], ['ev-pref-btn', 'ev-pref-menu'], ['ev-cohort-btn', 'ev-cohort-menu'], ['ev-filter-btn', 'ev-filter-menu']];

  /** The toolbar menu and the Filters row both drive the same intake year. */
  /* ——— Date range picker ——— */

  function dayStart(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  var RANGE_PRESETS = [
    { id: 'all', name: 'All time' },
    { id: 'today', name: 'Today', days: [0, 0] },
    { id: 'yesterday', name: 'Yesterday', days: [1, 1] },
    { id: '7', name: 'Last 7 days', days: [6, 0] },
    { id: '30', name: 'Last 30 days', days: [29, 0] },
    { id: '90', name: 'Last 90 days', days: [89, 0] },
    { id: 'mtd', name: 'Month to date' },
    { id: 'year', name: 'Last 1 year', days: [364, 0] },
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /** The draft while the picker is open; month is the left calendar. Nothing changes until Apply. */
  var rp = { from: null, to: null, preset: 'all', month: null };

  function presetRange(id) {
    var today = dayStart(TODAY);
    var p = RANGE_PRESETS.filter(function (x) { return x.id === id; })[0];
    if (id === 'mtd') return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    if (!p || !p.days) return null;
    return { from: addDays(today, -p.days[0]), to: addDays(today, -p.days[1]) };
  }

  function setRangePreset(id) {
    var r = presetRange(id);
    rp.preset = id;
    rp.from = r ? r.from : null;
    rp.to = r ? r.to : null;
    rp.month = addMonths(r ? r.to : TODAY, -1);
  }

  function openRangePicker() {
    if (state.range) {
      rp = { from: state.range.from, to: state.range.to, preset: state.range.preset, month: addMonths(state.range.to, -1) };
    } else {
      setRangePreset('all');
    }
    renderRangePicker();
  }

  function pickRangeDay(d) {
    rp.preset = 'custom';
    if (!rp.from || rp.to) {
      rp.from = d;
      rp.to = null;
    } else if (d < rp.from) {
      rp.from = d;
    } else {
      rp.to = d;
    }
  }

  function fmtShort(d, withYear) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + m[d.getMonth()] + (withYear ? ' ' + d.getFullYear() : '');
  }

  function rangeText(from, to) {
    if (!from) return 'All time';
    to = to || from;
    var sameYear = from.getFullYear() === to.getFullYear();
    var otherYear = to.getFullYear() !== TODAY.getFullYear();
    if (from.getTime() === to.getTime()) return fmtShort(from, otherYear);
    return fmtShort(from, !sameYear || otherYear) + ' – ' + fmtShort(to, !sameYear || otherYear);
  }

  function monthHtml(month, nav) {
    var today = dayStart(TODAY);
    var lead = (month.getDay() + 6) % 7;
    var count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var end = rp.to || rp.from;
    var cells = '';
    for (var b = 0; b < lead; b++) cells += '<span></span>';
    for (var d = 1; d <= count; d++) {
      var day = new Date(month.getFullYear(), month.getMonth(), d);
      var cls = 'ar-rp-day';
      if (rp.from && day >= rp.from && day <= end) cls += ' in';
      if (rp.from && day.getTime() === rp.from.getTime()) cls += ' start';
      if (end && day.getTime() === end.getTime()) cls += ' end';
      if (day.getTime() === today.getTime()) cls += ' today';
      cells += day > today
        ? '<span class="' + cls + ' off">' + d + '</span>'
        : '<button type="button" class="' + cls + '" data-rp-day="' + day.getTime() + '">' + d + '</button>';
    }
    var atEnd = addMonths(month, 1) > today;
    return '<div class="ar-rp-month"><div class="ar-rp-head">' +
      (nav < 0 ? '<button type="button" class="ar-rp-nav" data-rp-nav="-1" aria-label="Previous month">' + ico('chevron_left') + '</button>' : '<span></span>') +
      '<strong>' + MONTHS[month.getMonth()] + ' ' + month.getFullYear() + '</strong>' +
      (nav > 0 ? '<button type="button" class="ar-rp-nav" data-rp-nav="1" aria-label="Next month"' + (atEnd ? ' disabled' : '') + '>' + ico('chevron_right') + '</button>' : '<span></span>') +
      '</div><div class="ar-rp-grid">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div></div>';
  }

  function renderRangePicker() {
    var right = addMonths(rp.month, 1);
    var days = rp.from ? Math.round(((rp.to || rp.from) - rp.from) / 86400000) + 1 : 0;
    $('range-menu').innerHTML =
      '<div class="ar-rp-body"><div class="ar-rp-presets">' + RANGE_PRESETS.map(function (p) {
        return '<button type="button" class="ar-rp-preset' + (rp.preset === p.id ? ' active' : '') + '" data-rp-preset="' + p.id + '">' + p.name + '</button>';
      }).join('') + '</div>' +
      '<div class="ar-rp-months">' + monthHtml(rp.month, -1) + monthHtml(right, 1) + '</div></div>' +
      '<div class="ar-rp-foot"><span>' + esc(rangeText(rp.from, rp.to)) + (days ? ' · ' + days + ' day' + (days === 1 ? '' : 's') : '') + '</span>' +
      '<button type="button" class="btn btn-primary btn-sm" data-rp-apply>Apply</button></div>';
  }

  function applyRange() {
    if (!rp.from) {
      state.range = null;
      $('range-label').textContent = 'All time';
      return;
    }
    var to = rp.to || rp.from;
    state.range = { from: rp.from, to: to, preset: rp.preset };
    $('range-label').textContent = rangeText(rp.from, to);
  }

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
    hideCardMenu();
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
      var view = go.getAttribute('data-go');
      if (view === 'events') {
        evCreate = null;
        currentEventId = null;
      }
      if (view === 'chats') state.chatId = null;
      goTo(view);
      return;
    }

    if (t.closest('#ev-create')) {
      openEventCreate();
      return;
    }

    if (t.closest('[data-events-back]')) {
      evCreate = null;
      currentEventId = null;
      goTo('events');
      return;
    }

    for (var i = 0; i < MENUS.length; i++) {
      if (t.closest('#' + MENUS[i][0])) {
        if (MENUS[i][1] === 'filter-menu') renderFilterMenu();
        if (MENUS[i][1] === 'bulk-menu') renderBulkMenu();
        if (MENUS[i][1] === 'range-menu') openRangePicker();
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

    if (t.closest('[data-fsave]')) {
      saveFilters();
      toast('Filters saved.');
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
      openCreateChooser(createPref.getAttribute('data-create-pref'));
      return;
    }

    var choice = t.closest('[data-create-choice]');
    if (choice) {
      if (choice.getAttribute('data-create-choice') === 'new') openEditor(creatingFor);
      else openCopyPicker();
      return;
    }

    if (t.closest('[data-create-back]')) {
      openCreateChooser(creatingFor);
      return;
    }

    if (t.closest('[data-copy-continue]')) {
      var srcProgram = $('pc-program').value;
      var src = findPref(srcProgram, $('pc-pref').value);
      if (!src) {
        toast('Pick a preference to copy.');
        return;
      }
      openEditor(srcProgram, null, src);
      return;
    }

    var dupPref = t.closest('[data-dup-pref]');
    if (dupPref) {
      var orig = findPref(state.ppProgram, dupPref.getAttribute('data-dup-pref'));
      if (orig) openEditor(state.ppProgram, null, orig);
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

    var rpPreset = t.closest('[data-rp-preset]');
    if (rpPreset) {
      setRangePreset(rpPreset.getAttribute('data-rp-preset'));
      renderRangePicker();
      return;
    }

    var rpDay = t.closest('[data-rp-day]');
    if (rpDay) {
      pickRangeDay(new Date(Number(rpDay.getAttribute('data-rp-day'))));
      renderRangePicker();
      return;
    }

    var rpNav = t.closest('[data-rp-nav]');
    if (rpNav) {
      rp.month = addMonths(rp.month, Number(rpNav.getAttribute('data-rp-nav')));
      renderRangePicker();
      return;
    }

    if (t.closest('[data-rp-apply]')) {
      applyRange();
      closeMenus();
      renderDashboard();
      return;
    }

    var evProgram = t.closest('[data-ev-program]');
    if (evProgram) {
      EF.program = evProgram.getAttribute('data-ev-program');
      EF.prefId = null;
      closeMenus();
      renderEvents();
      return;
    }

    var evPref = t.closest('[data-ev-pref]');
    if (evPref) {
      EF.prefId = evPref.getAttribute('data-ev-pref') || null;
      closeMenus();
      renderEvents();
      return;
    }

    var evCohort = t.closest('[data-ev-cohort]');
    if (evCohort) {
      EF.cohort = evCohort.getAttribute('data-ev-cohort');
      closeMenus();
      renderEvents();
      return;
    }

    if (t.closest('[data-ev-clear-all]')) {
      EF.formats = [];
      EF.kinds = [];
      EF.cities = [];
      EF.platforms = [];
      renderEvents();
      return;
    }

    var evReg = t.closest('[data-evc-registration]');
    if (evReg && evCreate && !t.closest('[data-ev-form-builder], [data-ev-apply-template]')) {
      readEventCreate();
      evCreate.draft.registration = evReg.getAttribute('data-evc-registration');
      renderEventCreate();
      return;
    }

    if (t.closest('[data-evc-remove-cover]') && evCreate) {
      readEventCreate();
      evCreate.draft.coverImage = '';
      renderEventCreate();
      return;
    }

    var removeGallery = t.closest('[data-evc-remove-gallery]');
    if (removeGallery && evCreate) {
      readEventCreate();
      evCreate.draft.galleryImages.splice(Number(removeGallery.getAttribute('data-evc-remove-gallery')), 1);
      renderEventCreate();
      return;
    }

    if (t.closest('[data-ev-create-next]') && evCreate) {
      eventCreateNext();
      return;
    }

    if (t.closest('[data-ev-create-back]') && evCreate) {
      if (!evCreate.step) {
        evCreate = null;
        currentEventId = null;
        goTo('events');
      }
      else {
        readEventCreate();
        evCreate.step -= 1;
        renderEventCreate();
      }
      return;
    }

    var evPublish = t.closest('[data-ev-publish]');
    if (evPublish && evCreate) {
      publishCreatedEvent(evPublish.getAttribute('data-ev-publish'));
      return;
    }

    if (t.closest('[data-ev-form-builder]') && evCreate) {
      readEventCreate();
      evCreate.draft.formBuilt = true;
      renderEventCreate();
      toast('Opened form builder with the existing form.');
      return;
    }

    if (t.closest('[data-ev-apply-template]') && evCreate) {
      readEventCreate();
      evCreate.draft.registration = 'new';
      evCreate.draft.formBuilt = true;
      renderEventCreate();
      toast('Template applied.');
      return;
    }

    if (!t.closest('.ar-menu') && !t.closest('[data-card-more]')) closeMenus();

    var evFacet = t.closest('[data-ev-facet]');
    if (evFacet) {
      var facet = evFacet.getAttribute('data-ev-facet').split(':');
      if (facet[0] === 'program') {
        EF.program = EF.program === facet[1] ? 'all' : facet[1];
        EF.prefId = null;
      } else {
        toggleIn(EF[facet[0]], facet.slice(1).join(':'));
      }
      renderEvents();
      return;
    }

    var evClear = t.closest('[data-ev-clear]');
    if (evClear) {
      var cleared = evClear.getAttribute('data-ev-clear').split(':');
      toggleIn(EF[cleared[0]], cleared.slice(1).join(':'));
      renderEvents();
      return;
    }

    var evFollow = t.closest('[data-ev-followup]');
    if (evFollow) {
      var fu = evFollow.getAttribute('data-ev-followup').split(':');
      openFollowupEditor(fu[0], fu[1]);
      return;
    }

    var evmChannel = t.closest('[data-evm-channel]');
    if (evmChannel && evEditor) {
      readFollowupEditor();
      evEditor.channel = evmChannel.getAttribute('data-evm-channel');
      renderFollowupEditor();
      return;
    }

    if (t.closest('[data-evm-save]') && evEditor) {
      saveFollowupEditor();
      return;
    }

    if (t.closest('.ar-ev-link')) return;

    var evCard = t.closest('[data-event]');
    if (evCard) {
      openEvent(evCard.getAttribute('data-event'));
      return;
    }

    if (t.closest('.ar-td-check, .ar-th-check')) return;

    var bulk = t.closest('[data-bulk]');
    if (bulk) {
      closeMenus();
      runBulk(bulk.getAttribute('data-bulk'), bulk.getAttribute('data-bulk-channel'));
      return;
    }

    if (t.closest('[data-bulk-clear]')) {
      SELECTED = {};
      closeMenus();
      syncSelection();
      return;
    }

    if (t.closest('#pref-panel-create')) {
      openEditor(state.program);
      return;
    }

    var prefAct = t.closest('#pref-panel-edit, #pref-panel-dup');
    if (prefAct && !prefAct.disabled) {
      var current = findPref(state.program, state.prefId);
      if (!current) return;
      if (prefAct.id === 'pref-panel-dup') openEditor(state.program, null, current);
      else openEditor(state.program, current.id);
      return;
    }

    var funnelAction = t.closest('[data-funnel-action]');
    if (funnelAction) {
      var fa = funnelAction.getAttribute('data-funnel-action');
      state.action = state.action === fa ? null : fa;
      renderFunnel();
      renderStudents();
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

    var stageMode = t.closest('[data-stage-mode]');
    if (stageMode) {
      state.stageMode = stageMode.getAttribute('data-stage-mode');
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
      else if (what === 'action') state.action = null;
      else if (what === 'funnel') state.stage = state.action = null;
      else setProgram('all');
      renderDashboard();
      return;
    }

    var cardMore = t.closest('[data-card-more]');
    if (cardMore) {
      var reopen = cardMenuFor !== cardMore.getAttribute('data-card-more');
      closeMenus();
      if (reopen) showCardMenu(cardMore);
      return;
    }

    var campaignItem = t.closest('[data-campaign]');
    if (campaignItem) {
      closeMenus();
      openCampaign([campaignItem.getAttribute('data-campaign-student')], campaignItem.getAttribute('data-campaign'));
      return;
    }

    var campaignChannel = t.closest('[data-campaign-channel]');
    if (campaignChannel && campaign) {
      readCampaign();
      campaign.channel = campaignChannel.getAttribute('data-campaign-channel');
      renderCampaign();
      return;
    }

    if (t.closest('[data-campaign-send]') && campaign) {
      sendCampaign();
      return;
    }

    var cardChat = t.closest('[data-card-chat]');
    if (cardChat) {
      openChat(cardChat.getAttribute('data-card-chat'));
      return;
    }

    var chatOpen = t.closest('[data-chat-open]');
    if (chatOpen) {
      goTo('chats/' + encodeURIComponent(chatOpen.getAttribute('data-chat-open')));
      return;
    }

    var cfProgram = t.closest('[data-cf-program]');
    if (cfProgram) {
      CF.program = cfProgram.getAttribute('data-cf-program');
      CF.prefId = null;
      CF.min = CF.max = '';
      closeMenus();
      renderChats();
      return;
    }

    var cfPrefItem = t.closest('[data-cf-pref]');
    if (cfPrefItem) {
      CF.prefId = cfPrefItem.getAttribute('data-cf-pref') || null;
      CF.min = CF.max = '';
      closeMenus();
      renderChats();
      return;
    }

    var cfPreset = t.closest('[data-cf-preset]');
    if (cfPreset) {
      var bounds = cfPreset.getAttribute('data-cf-preset').split('-');
      CF.min = bounds[0];
      CF.max = bounds[1];
      closeMenus();
      renderChats();
      return;
    }

    var cfQuick = t.closest('[data-cf-quick]');
    if (cfQuick) {
      var qk = cfQuick.getAttribute('data-cf-quick');
      if (qk === 'all') {
        CF.unread = false;
        CF.by = '';
      } else if (qk === 'unread') CF.unread = !CF.unread;
      else CF.by = CF.by === qk ? '' : qk;
      renderChats();
      return;
    }

    if (t.closest('#cf-clear') || t.closest('[data-cf-clear]')) {
      resetChatFilters();
      renderChats();
      return;
    }

    var chatQuick = t.closest('[data-chat-quick]');
    if (chatQuick) {
      $('chat-input').value = chatQuick.getAttribute('data-chat-quick');
      $('chat-input').focus();
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
      openCreateChooser(state.ppProgram);
      return;
    }

    var editPref = t.closest('[data-edit-pref]');
    if (editPref) {
      if (isDefaultPref(state.ppProgram, editPref.getAttribute('data-edit-pref'))) return;
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
      state.stage = state.action = null;
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
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'chat-form') return;
    e.preventDefault();
    sendChat($('chat-input').value);
  });

  $('chat-search').addEventListener('input', function () {
    renderChatFilters();
    renderChatList();
  });

  $('ev-filter-menu').addEventListener('change', function (e) {
    var key = e.target.getAttribute('data-ev-check');
    if (!key) return;
    var bits = key.split(':');
    toggleIn(EF[bits[0]], bits.slice(1).join(':'));
    renderEvents();
  });

  $('ev-search').addEventListener('input', function (e) {
    EF.q = e.target.value;
    renderEventInsights();
    renderEventBoard();
  });

  $('drawer-body').addEventListener('change', function (e) {
    if (!evCreate) return;
    if (e.target.id === 'evc-coverFile') {
      readEventCreate();
      readImageFiles(e.target.files, function (images) {
        if (images[0]) evCreate.draft.coverImage = images[0];
        renderEventCreate();
      });
      return;
    }
    if (e.target.id === 'evc-galleryFiles') {
      readEventCreate();
      readImageFiles(e.target.files, function (images) {
        evCreate.draft.galleryImages = evCreate.draft.galleryImages.concat(images).slice(0, 8);
        renderEventCreate();
      });
      return;
    }
    readEventCreate();
    if (e.target.name === 'evc-format' || e.target.name === 'evc-registration' || e.target.id === 'evc-program' ||
        e.target.id === 'evc-kind' || e.target.id === 'evc-category' || e.target.id === 'evc-prefId' ||
        e.target.id === 'evc-matchScore' || e.target.id === 'evc-savedFilter') {
      if (e.target.id === 'evc-program') evCreate.draft.prefId = '';
      renderEventCreate();
    }
  });

  $('drawer-body').addEventListener('input', function (e) {
    if (!evCreate) return;
    if (e.target.id === 'evc-name' || e.target.id === 'evc-description') readEventCreate();
  });

  $('view-chats').addEventListener('change', function (e) {
    var cpStudent = e.target.getAttribute('data-cp-program');
    if (cpStudent) {
      state.cpProgram = state.cpProgram || {};
      state.cpProgram[cpStudent] = e.target.value;
      renderChatProfile();
      return;
    }
    var stage = e.target.getAttribute('data-cf-stage');
    var extra = e.target.getAttribute('data-cf-extra');
    if (stage === null && extra === null) return;
    var list = stage !== null ? CF.stages : CF.extras;
    var key = stage !== null ? Number(stage) : extra;
    var at = list.indexOf(key);
    if (e.target.checked && at === -1) list.push(key);
    if (!e.target.checked && at !== -1) list.splice(at, 1);
    renderChatFilters();
    renderChatList();
  });

  $('view-chats').addEventListener('input', function (e) {
    var k = e.target.getAttribute('data-cf-score');
    if (!k) return;
    var v = e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value)));
    CF[k] = v;
    renderChatFilters();
    renderChatList();
  });

  $('drawer-body').addEventListener('input', function (e) {
    if (editing) updatePreview();
    if (e.target.id === 'cm-text') updateCampaignCount();
  });
  $('drawer-body').addEventListener('change', function (e) {
    var logStudent = e.target.getAttribute('data-cp-program');
    if (logStudent && $('log-body')) {
      state.cpProgram = state.cpProgram || {};
      state.cpProgram[logStudent] = e.target.value;
      $('log-body').innerHTML = activityLogHtml(studentById(logStudent));
      if (state.view === 'chats') renderChatProfile();
      return;
    }
    if (e.target.id === 'cm-template' && campaign) {
      var tpl = CAMPAIGN_TEMPLATES.filter(function (x) { return x.id === e.target.value; })[0];
      campaign.template = tpl.id;
      campaign.subject = draftText(tpl.subject, campaign.students);
      campaign.text = draftText(tpl.text, campaign.students);
      renderCampaign();
      return;
    }
    if (e.target.id === 'pc-program') {
      $('pc-pref').innerHTML = prefOptions(e.target.value);
      return;
    }
    if (!editing) return;
    if (e.target.id === 'pe-program') {
      readEditor();
      var next = e.target.value;
      if (!editing.prefId && !editing.copy) editing.draft.criteria = baseCriteria(programById(next));
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
    if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chat-input') {
      e.preventDefault();
      sendChat(e.target.value);
      return;
    }
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ar-pick')) e.target.click();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('ar-card')) {
      e.preventDefault();
      openStudent(e.target.getAttribute('data-student'));
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('ar-ev-card')) {
      e.preventDefault();
      openEvent(e.target.getAttribute('data-event'));
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

  $('table').addEventListener('change', function (e) {
    var id = e.target.getAttribute('data-select');
    var scope = e.target.getAttribute('data-select-all');
    if (id) {
      if (e.target.checked) SELECTED[id] = true;
      else delete SELECTED[id];
    } else if (scope !== null) {
      var on = e.target.checked;
      scopeItems(scope).forEach(function (s) {
        if (on) SELECTED[s.id] = true;
        else delete SELECTED[s.id];
      });
    } else return;
    syncSelection();
  });

  function exportCsv(list) {
    var rows = [['GR ID', 'Name', 'Program', 'Preference', 'Match %', 'Stage', 'Additional user actions', 'Class 10', 'Class 12', 'Tests', 'Budget (L)', 'City', 'Km', 'Intake']].concat(
      list.map(function (s) {
        var did = ACTIONS.filter(function (a) { return s.actions[a.id]; }).map(function (a) { return a.name; }).join('; ');
        return [s.id, s.name, programById(s.program).name, s.pref ? s.pref.name : 'No preference', s.score === null ? '' : s.score, STAGES[s.stage].name, did, markNote(s.mark10), markNote(s.mark12),
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
    toast('Downloaded ' + list.length + ' student' + (list.length === 1 ? '' : 's') + '.');
  }

  setIntake(state.intake);

  /* ——— Login and starting preference ——— */

  var SESSION_KEY = 'admitright_session';

  function showGate(id) {
    document.body.classList.add('ar-locked');
    $('gate-login').hidden = id !== 'gate-login';
    $('gate-setup').hidden = id !== 'gate-setup';
  }

  function unlock() {
    document.body.classList.remove('ar-locked');
    $('gate-login').hidden = true;
    $('gate-setup').hidden = true;
  }

  function startWith(programId, prefId, keepFilters) {
    state.program = programId;
    state.prefId = prefId;
    state.stage = state.action = null;
    if (!keepFilters) applySavedFilters();
    unlock();
    applyRoute();
  }

  var setupProgram = PROGRAMS[0].id;

  function renderSetup() {
    $('setup-program-count').textContent = PROGRAMS.length;
    $('setup-program-list').innerHTML = PROGRAMS.map(function (p) {
      return '<button type="button" class="ar-pp-program' + (p.id === setupProgram ? ' active' : '') + '" data-setup-program="' + p.id + '">' +
        '<strong>' + esc(p.name) + '</strong></button>';
    }).join('');
    var prefs = prefsFor(setupProgram);
    if (!prefs.length) {
      $('setup-cards').innerHTML =
        '<article class="panel ar-pp-empty">' + ico('tune') + '<h3>No preferences yet</h3>' +
        '<button type="button" class="btn btn-primary btn-sm" data-setup-pref="">Open dashboard</button></article>';
      return;
    }
    var seen = readSeen();
    $('setup-cards').innerHTML = prefs.map(function (pref, i) {
      var chips = CRITERIA.filter(function (c) { return pref.criteria[c.id].weight > 0; }).map(function (c) {
        return '<span class="ar-crit">' + ico(c.icon) + esc(criterionLine(c.id, pref.criteria[c.id])) + '</span>';
      }).join('');
      return (
        '<article class="panel ar-pp-card">' +
        '<div class="ar-pp-card-head"><h3>' + esc(pref.name) + '</h3>' +
        (i === 0 ? '<span class="ar-default">Default</span>' : '') + '</div>' +
        '<div class="ar-crits">' + chips + '</div>' +
        visitHtml(setupProgram, pref, seen) +
        '<div class="ar-pp-card-foot">' +
        '<button type="button" class="btn btn-primary btn-sm ar-setup-go" data-setup-pref="' + pref.id + '">Open dashboard' + ico('arrow_forward') + '</button></div>' +
        '</article>'
      );
    }).join('');
  }

  function openSetup() {
    setupProgram = state.program === 'all' || !programById(state.program) ? PROGRAMS[0].id : state.program;
    renderSetup();
    showGate('gate-setup');
  }

  function afterLogin() {
    var view = readViewState();
    if (view) startWith(view.program, view.prefId, true);
    else openSetup();
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('login-email').value.trim();
    var pass = $('login-pass').value;
    var err = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter a valid email address.'
      : !pass ? 'Enter your password.' : '';
    $('login-error').textContent = err;
    $('login-error').hidden = !err;
    if (err) return;
    try { sessionStorage.setItem(SESSION_KEY, email); } catch (er) { /* blocked */ }
    $('login-pass').value = '';
    afterLogin();
  });

  $('gate-setup').addEventListener('click', function (e) {
    var prog = e.target.closest('[data-setup-program]');
    if (prog) {
      setupProgram = prog.getAttribute('data-setup-program');
      renderSetup();
      return;
    }
    var go = e.target.closest('[data-setup-pref]');
    if (go) startWith(setupProgram, go.getAttribute('data-setup-pref') || null);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-logout]')) return;
    e.preventDefault();
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(VIEW_KEY);
    } catch (er) { /* blocked */ }
    lastSeenKey = null;
    closeDrawer();
    closeMenus();
    showGate('gate-login');
  });

  window.addEventListener('hashchange', function () {
    if (document.body.classList.contains('ar-locked')) return;
    applyRoute();
  });

  var signedIn = null;
  try { signedIn = sessionStorage.getItem(SESSION_KEY); } catch (er) { signedIn = null; }
  if (signedIn) afterLogin();
  else showGate('gate-login');

  if (!BUNDLED_STUDENTS.length && window.fetch && location.protocol !== 'file:') {
    fetch(STUDENTS_CSV, { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.text() : Promise.reject(res.status); })
      .then(function (text) {
        var list = studentsFromCsv(text);
        if (!list.length) return;
        STUDENTS = list;
        if (!$('gate-setup').hidden) renderSetup();
        if (state.view === 'programs') renderPrograms();
        else renderDashboard();
        toast('Loaded ' + list.length + ' students from CSV.');
      })
      .catch(function () {});
  }
})();
