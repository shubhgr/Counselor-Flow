/**
 * AdmitRight — university admissions dashboard (prototype).
 * Students come from the GradRight AI profiling flow. Programs are fixed;
 * each program owns one or more preferences (criteria + a minimum match score),
 * and a preference decides which students the university sees.
 */
(function () {
  var PREFS_KEY = 'admitright_prefs_v5';
  var TODAY = new Date(2026, 9, 16);

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

  var BOARD_GROUPS = [
    ['National & international', ['CBSE', 'CISCE', 'IB', 'Cambridge (IGCSE)', 'NIOS']],
    ['State boards', ['Haryana Board', 'UP Board', 'Punjab Board', 'Rajasthan Board', 'Bihar Board', 'MP Board',
      'Maharashtra Board', 'Gujarat Board', 'Telangana Board', 'Andhra Pradesh Board', 'Karnataka Board',
      'Tamil Nadu Board', 'Kerala Board', 'West Bengal Board', 'Other State Board']],
  ];
  var BOARDS = BOARD_GROUPS[0][1].concat(BOARD_GROUPS[1][1]);
  var BOARD_LABELS = { CISCE: 'ICSE / ISC' };
  var OLD_BOARDS = ['CBSE', 'CISCE', 'UP Board', 'Maharashtra Board', 'Telangana Board', 'Other State Board', 'IB'];
  var STREAMS = ['PCM', 'PCB', 'Commerce', 'Humanities'];
  var SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'Accountancy',
    'Business Studies', 'Economics', 'History', 'Political Science', 'Geography', 'Psychology', 'Sociology', 'Fine Arts'];
  var STREAM_SUBJECTS = {
    PCM: ['Physics', 'Chemistry', 'Mathematics'],
    PCB: ['Physics', 'Chemistry', 'Biology'],
    Commerce: ['Accountancy', 'Business Studies', 'Economics'],
    Humanities: ['History', 'Political Science', 'Economics'],
  };
  /** One optional fifth subject per stream, picked from the student id so it stays stable. */
  var STREAM_EXTRAS = {
    PCM: ['Computer Science', 'Economics'],
    PCB: ['Mathematics', 'Psychology'],
    Commerce: ['Mathematics', 'Computer Science'],
    Humanities: ['Geography', 'Psychology', 'Sociology', 'Fine Arts'],
  };

  var CAMPUS = { city: 'Gurugram', state: 'Haryana', venue: 'BML Munjal University campus, Sidhrawali' };
  var CITY_STATE = {
    Gurugram: 'Haryana', Faridabad: 'Haryana', Sonipat: 'Haryana', Panipat: 'Haryana', Rohtak: 'Haryana',
    Karnal: 'Haryana', Ambala: 'Haryana', Hisar: 'Haryana', Delhi: 'Delhi', Chandigarh: 'Chandigarh',
    Noida: 'Uttar Pradesh', 'Greater Noida': 'Uttar Pradesh', Ghaziabad: 'Uttar Pradesh', Meerut: 'Uttar Pradesh',
    Aligarh: 'Uttar Pradesh', Agra: 'Uttar Pradesh', Mathura: 'Uttar Pradesh', Lucknow: 'Uttar Pradesh',
    Kanpur: 'Uttar Pradesh', Varanasi: 'Uttar Pradesh', Dehradun: 'Uttarakhand', Jaipur: 'Rajasthan',
    Ludhiana: 'Punjab', Amritsar: 'Punjab', Bhopal: 'Madhya Pradesh', Indore: 'Madhya Pradesh', Patna: 'Bihar',
    Kolkata: 'West Bengal', Mumbai: 'Maharashtra', Pune: 'Maharashtra', Ahmedabad: 'Gujarat',
    Bengaluru: 'Karnataka', Hyderabad: 'Telangana', Chennai: 'Tamil Nadu',
  };
  var STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
    'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
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
    { id: 'academic', label: 'Academic score', icon: 'school' },
    { id: 'test', label: 'Test score', icon: 'quiz' },
    { id: 'stream', label: 'Subjects', icon: 'science', binary: true },
    { id: 'board', label: 'Class 12 board', icon: 'account_balance', binary: true },
    { id: 'location', label: 'Location', icon: 'location_on', binary: true },
    { id: 'budget', label: 'Fee budget', icon: 'payments' },
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
    var extras = STREAM_EXTRAS[s.stream] || [];
    var seed = String(s.id).split('').reduce(function (n, ch) { return n + ch.charCodeAt(0); }, 0);
    s.subjects = (STREAM_SUBJECTS[s.stream] || []).concat(extras.length ? [extras[seed % extras.length]] : []);
    var eh = hashOf(s.id + ':engage');
    var cr = eh % 100;
    var er = (eh >>> 8) % 100;
    s.engage = {
      campaign: cr < 15 ? 0 : cr < 19 ? 1 : cr < 55 ? 2 : cr < 80 ? 3 : 4,
      event: er < 40 ? 0 : er < 70 ? 1 : er < 87 ? 2 : 3,
    };
    return s;
  }

  /** Engagement is a ladder: each step includes students who went further. */
  var ENGAGE_FILTERS = {
    campaign: { label: 'Campaign activity', steps: ['Sent', 'Delivered', 'Opened', 'Interacted'] },
    event: { label: 'Event activity', steps: ['Opened', 'Registered', 'Joined'] },
  };

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
      academic: { min: tech ? 80 : 70, weight: 40 },
      test: { tests: (DEFAULT_TESTS[program.id] || [req('CUET UG', 70)]).map(function (t) { return Object.assign({}, t); }), weight: 30 },
      stream: { subjects: (STREAM_SUBJECTS[program.stream] || []).slice(), weight: tech ? 30 : 1 },
      board: { values: BOARDS.slice(), weight: 10 },
      location: { mode: 'state', places: [], weight: 20 },
      budget: { min: Math.max(5, program.fee - 6), weight: 20 },
      activities: { values: tech ? ['Coding', 'Robotics'] : ['Debate', 'Art', 'MUN'], weight: 10 },
    };
  }

  /** Brings older preference shapes (radius, Class 10/12, stream, budget range) to the current criteria. */
  function normCriteria(c) {
    var loc = c.location || {};
    if (loc.radius != null || !loc.mode) {
      var r = loc.radius == null ? 100 : loc.radius;
      var w = loc.weight || 0;
      c.location = r > 300
        ? { mode: 'state', places: [], weight: 0, saved: w || loc.saved || 10 }
        : { mode: r <= 50 ? 'city' : 'state', places: [], weight: w, saved: loc.saved };
    }
    if (c.class12 || c.class10 || !c.academic) {
      var c12 = c.class12 || c.academic || { min: 75, weight: 30 };
      var aw = (c12.weight || 0) + ((c.class10 && c.class10.weight) || 0);
      c.academic = { min: c12.min, weight: aw, saved: aw ? undefined : c12.saved || 30 };
      delete c.class12;
      delete c.class10;
    }
    if (c.stream && !c.stream.subjects) {
      c.stream = { subjects: (STREAM_SUBJECTS[c.stream.value] || []).slice(), weight: c.stream.weight, saved: c.stream.saved };
    }
    if (c.budget) delete c.budget.max;
    if (c.board && OLD_BOARDS.every(function (b) { return c.board.values.indexOf(b) !== -1; })) c.board.values = BOARDS.slice();
    return c;
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
    normCriteria(ncr);
    ncr.location = { mode: 'custom', places: ['Delhi', 'Haryana', 'Noida', 'Greater Noida', 'Ghaziabad'], weight: 40 };
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
      return { id: id, name: name, criteria: normCriteria(c) };
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
    PROGRAMS.forEach(function (p) {
      (defaults[p.id] || []).forEach(function (pref) { normCriteria(pref.criteria); });
    });
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
    if (rq.attended) return 1;
    if (rq.kind === 'rank') {
      if (t.value <= rq.min) return 1;
      return clamp01(0.8 - (t.value - rq.min) / rq.min);
    }
    if (t.value >= rq.min) return 1;
    var gapPoints = ((rq.min - t.value) / (rq.max || 100)) * 100;
    return clamp01(0.8 - gapPoints / 15);
  }

  function reqLabel(rq) {
    if (rq.attended) return rq.name + ' taken';
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
      case 'location': {
        var st = CITY_STATE[s.city] || '';
        var okLoc = p.mode === 'city' ? s.city === CAMPUS.city
          : p.mode === 'state' ? st === CAMPUS.state
          : (p.places || []).some(function (x) { return x === s.city || x === st; });
        return { v: okLoc ? 1 : 0, raw: -s.km, note: s.city + (st && st !== s.city ? ', ' + st : '') };
      }
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
      case 'academic':
        return { v: s.class12 >= p.min ? 1 : clamp01(0.8 - (p.min - s.class12) / 12), raw: s.class12, note: markNote(s.mark12) };
      case 'budget': {
        var note = '₹' + s.budget[0] + '–' + s.budget[1] + 'L';
        if (s.budget[1] >= p.min) return { v: 1, raw: s.budget[1] - p.min, note: note };
        var gap = p.min - s.budget[1];
        return { v: clamp01(0.7 - gap / 8), raw: -gap, note: note };
      }
      case 'stream': {
        var subs = p.subjects || [];
        var okStream = subs.every(function (x) { return s.subjects.indexOf(x) !== -1; }) ? 1 : 0;
        return { v: okStream, raw: okStream, note: s.subjects.join(', ') };
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
    stageMode: 'snapshot',
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

  var settingsPage = { tab: 'roles' };

  function settingsPath() {
    return settingsPage.tab === 'users' ? 'settings/users' : 'settings';
  }

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
    academic: { unit: '%', get: function (s) { return s.class12; } },
  };
  var PICK_FILTERS = {
    stream: function (s) { return s.subjects; },
    board: function (s) { return [s.board]; },
    activities: function (s) { return s.activities; },
  };

  function filtersOn() {
    return state.program !== 'all' && !!findPref(state.program, state.prefId);
  }

  /** Ranges keyed by test name. Older saves stored one selected test on val/min/max. */
  function testRanges(v) {
    if (!v) return {};
    if (v.tests) return v.tests;
    if (v.val && ((v.min !== undefined && v.min !== '') || (v.max !== undefined && v.max !== ''))) {
      var one = {};
      one[v.val] = { min: v.min, max: v.max };
      return one;
    }
    return {};
  }

  function filterActive(id, v) {
    if (!v) return false;
    if (id === 'location') return !!v.mode && (v.mode !== 'custom' || !!(v.places && v.places.length));
    if (id === 'test') {
      return Object.keys(testRanges(v)).some(function (name) {
        var r = testRanges(v)[name] || {};
        return (r.min !== undefined && r.min !== '') || (r.max !== undefined && r.max !== '');
      });
    }
    if (id === 'budget') return v.min !== undefined && v.min !== '';
    if (v.vals && v.vals.length) return true;
    if (v.val) return true;
    return (v.min !== undefined && v.min !== '') || (v.max !== undefined && v.max !== '');
  }

  function activeFilters() {
    var vals = state.filters.vals;
    return Object.keys(vals).filter(function (id) { return filterActive(id, vals[id]); });
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

  /* Named filter sets, each tied to the program, preference and intake it was saved with. */
  var SFILTERS_KEY = 'admitright_saved_filters_v1';
  var SFILTERS = (function () {
    try { return JSON.parse(localStorage.getItem(SFILTERS_KEY) || '[]'); } catch (err) { return []; }
  })();
  var fsheet = { tab: 'new', naming: false, editId: null };

  function storeSavedFilters() {
    try { localStorage.setItem(SFILTERS_KEY, JSON.stringify(SFILTERS)); } catch (err) { /* storage full or blocked */ }
  }

  function savedFilterById(id) {
    return SFILTERS.filter(function (x) { return x.id === id; })[0] || null;
  }

  function savedFilterSummary(sf) {
    var vals = sf.filters.vals || {};
    var n = (sf.filters.min !== '' || sf.filters.max !== '' ? 1 : 0) +
      Object.keys(vals).filter(function (id) { return filterActive(id, vals[id]); }).length;
    var program = programById(sf.program);
    var pref = prefsFor(sf.program).filter(function (p) { return p.id === sf.prefId; })[0];
    return [program && program.name, pref && pref.name, n + ' filter' + (n === 1 ? '' : 's'), sf.intake || 'All intakes']
      .filter(Boolean).join(' · ');
  }

  function applySavedFilter(sf) {
    state.program = sf.program;
    state.prefId = sf.prefId;
    state.filters = clone(sf.filters);
    setIntake(sf.intake || '');
  }

  function commitSavedFilter() {
    var input = $('fsave-name');
    var name = input.value.trim();
    if (!name) { input.focus(); toast('Give this filter a label.'); return; }
    var entry = {
      id: fsheet.editId || 'sf-' + Date.now().toString(36),
      name: name, program: state.program, prefId: state.prefId, filters: clone(state.filters), intake: state.intake,
    };
    var updating = !!savedFilterById(entry.id);
    SFILTERS = updating ? SFILTERS.map(function (x) { return x.id === entry.id ? entry : x; }) : [entry].concat(SFILTERS);
    storeSavedFilters();
    fsheet.naming = false;
    fsheet.editId = null;
    fsheet.tab = 'saved';
    renderFilterMenu();
    toast(updating ? 'Filter updated.' : 'Filter saved.');
  }

  function savedFiltersHtml() {
    if (!SFILTERS.length) {
      return '<div class="ar-fsaved-empty">' + ico('bookmark') + '<strong>No saved filters yet</strong>' +
        '<span>Set filters under New filter, then save them to reuse in one click.</span></div>';
    }
    return '<div class="ar-fsaved">' + SFILTERS.map(function (sf) {
      return '<div class="ar-fsaved-row">' +
        '<button type="button" class="ar-fsaved-main" data-fsaved-apply="' + sf.id + '"><strong>' + esc(sf.name) + '</strong>' +
        '<small>' + esc(savedFilterSummary(sf)) + '</small></button>' +
        '<div class="ar-fsaved-tools">' +
        '<button type="button" class="ar-icon-btn" data-fsaved-edit="' + sf.id + '" aria-label="Edit ' + esc(sf.name) + '">' + ico('edit') + '</button>' +
        '<button type="button" class="ar-icon-btn danger" data-fsaved-delete="' + sf.id + '" aria-label="Delete ' + esc(sf.name) + '">' + ico('delete') + '</button>' +
        '</div></div>';
    }).join('') + '</div>';
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

  function studentInLocation(s, v) {
    var st = CITY_STATE[s.city] || '';
    if (v.mode === 'city') return s.city === CAMPUS.city;
    if (v.mode === 'state') return st === CAMPUS.state;
    return (v.places || []).some(function (x) { return x === s.city || x === st; });
  }

  function within(x, v) {
    return (v.min === undefined || v.min === '' || x >= Number(v.min)) && (v.max === undefined || v.max === '' || x <= Number(v.max));
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
        var ranges = testRanges(v);
        var names = Object.keys(ranges);
        for (var ti = 0; ti < names.length; ti++) {
          var range = ranges[names[ti]] || {};
          if ((range.min === undefined || range.min === '') && (range.max === undefined || range.max === '')) continue;
          var taken = s.tests.filter(function (x) { return x.name.toLowerCase() === names[ti].toLowerCase(); })[0];
          if (!taken || !within(taken.value, range)) return false;
        }
      } else if (id === 'budget') {
        if (v.min !== undefined && v.min !== '' && s.budget[1] < Number(v.min)) return false;
      } else if (id === 'location') {
        if (!studentInLocation(s, v)) return false;
      } else if (ENGAGE_FILTERS[id]) {
        if (s.engage[id] < ENGAGE_FILTERS[id].steps.indexOf(v.val) + 1) return false;
      } else if (RANGE_FILTERS[id]) {
        if (!within(RANGE_FILTERS[id].get(s), v)) return false;
      } else if (PICK_FILTERS[id]) {
        var picked = v.vals && v.vals.length ? v.vals : (v.val ? [v.val] : []);
        if (picked.length && !picked.some(function (w) {
          return PICK_FILTERS[id](s).some(function (a) { return String(a).toLowerCase() === String(w).toLowerCase(); });
        })) return false;
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
      case 'location':
        if (p.mode === 'city') return 'In ' + CAMPUS.city;
        if (p.mode === 'state') return 'In ' + CAMPUS.state;
        return p.places.slice(0, 2).join(', ') + (p.places.length > 2 ? ' +' + (p.places.length - 2) : '') || 'No places';
      case 'test':
        if (!p.tests.length) return 'No tests';
        return p.tests.slice(0, 2).map(reqLabel).join(' or ') + (p.tests.length > 2 ? ' +' + (p.tests.length - 2) + ' more' : '');
      case 'academic': return p.min + '%+';
      case 'budget': return '₹' + p.min + 'L+ budget';
      case 'stream': {
        var subs = p.subjects || [];
        if (!subs.length) return 'Any subjects';
        var named = STREAMS.filter(function (k) { return STREAM_SUBJECTS[k].join() === subs.join(); })[0];
        return named || subs.join(', ');
      }
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

  /** Stage counts include every lead in the current program, not only preference matches. */
  function renderFunnel() {
    var set = baseSet();
    var snapshot = state.stageMode === 'snapshot';
    var counts = STAGES.map(function (_, i) {
      return set.filter(function (s) { return atStage(s, i); }).length;
    });
    document.querySelectorAll('[data-stage-mode]').forEach(function (b) {
      var on = b.getAttribute('data-stage-mode') === state.stageMode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $('funnel-clear').hidden = state.stage === null && !state.action;
    $('funnel-mini').innerHTML = STAGES.map(function (st, i) {
      return '<button type="button" class="ar-mini-step' + (state.stage === i ? ' active' : '') + '" data-stage="' + i + '" title="' + esc(st.name) + '">' +
        '<span class="ar-mini-top">' + ico(st.icon) + '<b>' + counts[i] + '</b></span><small>' + esc(st.name) + '</small></button>';
    }).join('');
    var shownTotal = counts.reduce(function (a, b) { return a + b; }, 0);
    var trend = stageSeries(set, snapshot);
    $('funnel-grid').innerHTML = '<div class="ar-fstages">' + STAGES.map(function (st, i) {
      var note;
      var base = snapshot ? shownTotal : counts[0];
      var fill = base ? (counts[i] / base) * 100 : 0;
      if (snapshot) {
        note = Math.round(fill) + '%';
      } else {
        var prev = i ? counts[i - 1] : counts[0];
        note = i ? (prev ? Math.round((counts[i] / prev) * 100) : 0) + '%' : '';
      }
      return (
        '<button type="button" class="ar-frow' + (state.stage === i ? ' active' : '') + (counts[i] ? '' : ' zero') + '" data-stage="' + i + '" style="--st:' + CHART_COLORS[i] + '">' +
        '<span class="ar-frow-name"><i class="ar-frow-dot" aria-hidden="true"></i>' + esc(st.name) + '</span>' +
        '<span class="ar-frow-val">' +
        '<strong>' + counts[i] + '</strong>' +
        (note ? '<small title="' + (snapshot ? 'Share of students at this stage now' : 'Conversion from the previous stage') + '">' + note + '</small>' : '') +
        '</span></button>'
      );
    }).join('') + '</div>';
    $('trend-chart').innerHTML = snapshot ? stageChartHtml(trend) : stageBarsHtml(counts);
    $('trend-actions').innerHTML =
      '<div class="ar-factions">' + ACTIONS.map(function (a) {
        var did = set.filter(function (s) { return s.actions[a.id]; });
        var n = did.length;
        var of = snapshot ? shownTotal : counts[0];
        var pct = of ? Math.round((n / of) * 100) : 0;
        return (
          '<button type="button" class="ar-faction' + (state.action === a.id ? ' active' : '') + (n ? '' : ' zero') + '" data-funnel-action="' + a.id + '" style="--share:' + pct + '">' +
          '<span class="ar-faction-top">' + ico(a.icon) + '<span class="ar-faction-name">' + esc(a.name) + '</span></span>' +
          '<span class="ar-faction-stat"><strong>' + n + '</strong><small>' + pct + '% of students</small></span>' +
          '<span class="ar-faction-meter" aria-hidden="true"><i style="width:' + pct + '%"></i></span></button>'
        );
      }).join('') + '</div>';
  }

  /* ——— Dashboard: stage area chart ——— */

  var CHART_COLORS = STAGES.map(function (st, i) {
    return getComputedStyle(document.documentElement).getPropertyValue('--stage-' + i).trim() || '#782bff';
  });
  var stageChart = null; // { days: [Date], series: [[count per bucket] per stage], step } for the tooltip

  /** Catmull-Rom curve through the points, with control points kept above the baseline so dips never cross it. */
  function smoothPath(pts, base) {
    var r = function (n) { return Math.round(n * 10) / 10; };
    var d = 'M' + r(pts[0][0]) + ',' + r(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1y = Math.min(base, p1[1] + (p2[1] - p0[1]) / 6);
      var c2y = Math.min(base, p2[1] - (p3[1] - p1[1]) / 6);
      d += 'C' + r(p1[0] + (p2[0] - p0[0]) / 6) + ',' + r(c1y) + ' ' + r(p2[0] - (p3[0] - p1[0]) / 6) + ',' + r(c2y) + ' ' + r(p2[0]) + ',' + r(p2[1]);
    }
    return d;
  }

  /** Follows the dashboard date filter; with no filter it spans from the earliest lead to today. Long spans group by week or month. */
  function stageSeries(set, snapshot) {
    var end = dayStart(TODAY);
    var start = state.range ? dayStart(state.range.from) : null;
    if (state.range) end = dayStart(state.range.to);
    if (!start) {
      start = addDays(end, -29);
      set.forEach(function (s) {
        var d = s.events[0] || s.createdOn;
        if (d && d < start) start = dayStart(d);
      });
    }
    var span = Math.round((end - start) / 86400000) + 1;
    var step = span <= 45 ? 1 : span <= 210 ? 7 : 30;
    var n = Math.ceil(span / step);
    var data = { days: [], series: STAGES.map(function () { return []; }), step: step };
    for (var i = 0; i < n; i++) {
      data.days.push(addDays(start, i * step));
      data.series.forEach(function (list) { list.push(0); });
    }
    var reached = function (s, si) { return si ? s.events[si] : s.events[0] || s.createdOn; };
    if (snapshot) {
      /* Snapshot: how many students sit at each stage at the end of every bucket. */
      for (var k = 0; k < n; k++) {
        var cut = addDays(start, (k + 1) * step);
        set.forEach(function (s) {
          for (var si = STAGES.length - 1; si >= 0; si--) {
            var d = reached(s, si);
            if (d && dayStart(d) < cut) { data.series[si][k] += 1; break; }
          }
        });
      }
    } else {
      set.forEach(function (s) {
        STAGES.forEach(function (st, si) {
          var d = reached(s, si);
          if (!d) return;
          var k = Math.floor(Math.round((dayStart(d) - start) / 86400000) / step);
          if (k >= 0 && k < n) data.series[si][k] += 1;
        });
      });
    }
    data.start = start;
    data.snapshot = !!snapshot;
    return data;
  }

  /** One stage's own trend for its row, scaled to its own peak so quiet stages still show a shape. */
  function stageChartHtml(data) {
    var start = data.start;
    var step = data.step;
    var n = data.days.length;
    stageChart = data;
    if (n === 1) {
      var dayCounts = data.series.map(function (list) { return list[0]; });
      var colMax = Math.max.apply(null, dayCounts.concat([1]));
      return '<div class="ar-dcols">' + STAGES.map(function (st, si) {
        return '<button type="button" class="ar-dcol' + (state.stage !== null && state.stage !== si ? ' dim' : '') + '" data-stage="' + si + '" title="' + esc(st.name) + ': ' + dayCounts[si] + '">' +
          '<b>' + dayCounts[si] + '</b><span class="ar-dcol-track"><i style="height:' + Math.max(2, Math.round((dayCounts[si] / colMax) * 100)) + '%;background:' + CHART_COLORS[si] + '"></i></span>' +
          '<small>' + esc(st.name) + '</small></button>';
      }).join('') + '</div>';
    }
    var ticks = [];
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var k = Math.round(f * (n - 1));
      if (ticks.indexOf(data.days[k]) < 0) ticks.push(data.days[k]);
    });
    var ticksHtml = '<div class="ar-achart-ticks">' + ticks.map(function (d) { return '<span>' + esc(fmtShort(d)) + '</span>'; }).join('') + '</div>';
    var W = 600;
    var H = 200;
    var only = state.stage;
    var shownSeries = data.series.filter(function (list, si) { return only === null || si === only; });
    var max = Math.max.apply(null, [].concat.apply([1], shownSeries)) * 1.15;
    var x = function (k) { return n === 1 ? W / 2 : (k / (n - 1)) * W; };
    var y = function (v) { return H - (v / max) * (H - 8); };
    var areas = data.series.map(function (list, si) {
      if (only !== null && si !== only) return '';
      var line = smoothPath(list.map(function (v, k) { return [x(k), y(v)]; }), H);
      return '<path d="' + line + 'L' + W + ',' + H + 'L0,' + H + 'Z" fill="url(#ar-fill-' + si + ')"/>' +
        '<path d="' + line + '" fill="none" stroke="' + CHART_COLORS[si] + '" stroke-width="1.4" vector-effect="non-scaling-stroke"/>';
    }).join('');
    return '<div class="ar-achart">' +
      '<div class="ar-achart-plot">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><defs>' + STAGES.map(function (st, si) {
        return '<linearGradient id="ar-fill-' + si + '" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stop-color="' + CHART_COLORS[si] + '" stop-opacity="0.14"/>' +
          '<stop offset="95%" stop-color="' + CHART_COLORS[si] + '" stop-opacity="0.02"/></linearGradient>';
      }).join('') + '</defs>' +
      [0.25, 0.5, 0.75].map(function (f) {
        return '<line x1="0" x2="' + W + '" y1="' + H * f + '" y2="' + H * f + '" stroke="#ece9f5" vector-effect="non-scaling-stroke"/>';
      }).join('') + areas + '</svg>' +
      '<span class="ar-achart-cursor" hidden></span><div class="ar-achart-tip" hidden></div></div>' + ticksHtml + '</div>';
  }

  /** Funnel mode: one bar per stage, sized against the biggest stage. */
  function stageBarsHtml(values) {
    stageChart = null;
    var bmax = Math.max.apply(null, values.concat([1])) * 1.1;
    return '<div class="ar-bchart">' +
      '<div class="ar-bchart-plot"><div class="ar-bchart-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<div class="ar-bchart-bars">' + STAGES.map(function (st, si) {
        var v = values[si];
        var prev = si ? values[si - 1] : 0;
        var conv = si
          ? '<span><b>' + (prev ? Math.round((v / prev) * 100) : 0) + '%</b> of ' + esc(STAGES[si - 1].name) + '</span>'
          : '<span>Top of the funnel</span>';
        var barH = v ? Math.max(2, (v / bmax) * 100).toFixed(1) : 0;
        return '<button type="button" class="' + (state.stage !== null && state.stage !== si ? 'dim' : '') + '" data-stage="' + si + '" aria-label="' + esc(st.name) + ': ' + v + '" style="--bar:' + CHART_COLORS[si] + ';--h:' + barH + '%">' +
          '<em class="ar-bchart-tip"><strong>' + esc(st.name) + '</strong><span>' + v + ' student' + (v === 1 ? '' : 's') + '</span>' + conv + '</em>' +
          '<b>' + v + '</b><i style="height:' + barH + '%"></i></button>';
      }).join('') + '</div></div>' +
      '<div class="ar-bchart-labels">' + STAGES.map(function (st) { return '<span>' + esc(st.name) + '</span>'; }).join('') + '</div></div>';
  }

  function moveStageChartTip(e) {
    var plot = e.target.closest('.ar-achart-plot');
    if (!plot || !stageChart) return;
    var box = plot.getBoundingClientRect();
    var n = stageChart.days.length;
    var k = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1))));
    var left = n === 1 ? box.width / 2 : (k / (n - 1)) * box.width;
    var cursor = plot.querySelector('.ar-achart-cursor');
    var tip = plot.querySelector('.ar-achart-tip');
    cursor.hidden = false;
    cursor.style.left = left + 'px';
    tip.hidden = false;
    var day = stageChart.days[k];
    var label = stageChart.step === 1 ? fmtShort(day, true)
      : stageChart.step === 7 ? 'Week of ' + fmtShort(day, true)
      : day.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    tip.innerHTML = '<b>' + esc(label) + '</b>' + STAGES.map(function (st, si) {
      if (state.stage !== null && si !== state.stage) return '';
      return '<span><i style="background:' + CHART_COLORS[si] + '"></i>' + esc(st.name) + '<strong>' + stageChart.series[si][k] + '</strong></span>';
    }).join('');
    tip.style.left = Math.min(Math.max(left, 112), box.width - 112) + 'px';
  }

  /** The bucket under the pointer, matching the hover tooltip. */
  function chartBucketAt(e) {
    var plot = e.target.closest('.ar-achart-plot');
    if (!plot || !stageChart || stageChart.days.length < 2) return null;
    var box = plot.getBoundingClientRect();
    var n = stageChart.days.length;
    var k = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1))));
    var from = dayStart(stageChart.days[k]);
    var to = stageChart.step === 1 ? from : addDays(from, stageChart.step - 1);
    var cap = state.range ? dayStart(state.range.to) : dayStart(TODAY);
    if (to > cap) to = cap;
    return { from: from, to: to };
  }

  /** Clicking a point applies that day, week, or month the same way the date picker does. */
  function selectChartDate(e) {
    var bucket = chartBucketAt(e);
    if (!bucket) return;
    state.range = { from: bucket.from, to: bucket.to, preset: 'custom' };
    $('range-label').textContent = rangeText(bucket.from, bucket.to);
    renderDashboard();
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
    if (ENGAGE_FILTERS[id]) return ENGAGE_FILTERS[id].label + ': ' + v.val;
    var c = CRITERIA.filter(function (x) { return x.id === id; })[0];
    var label = c.label;
    var unit = RANGE_FILTERS[id] ? RANGE_FILTERS[id].unit : '';
    if (id === 'test') {
      var ranges = testRanges(v);
      return Object.keys(ranges).map(function (name) {
        var r = ranges[name] || {};
        var lo = r.min !== undefined && r.min !== '';
        var hi = r.max !== undefined && r.max !== '';
        if (!lo && !hi) return '';
        var rq = (pref.criteria.test.tests || []).filter(function (t) { return t.name === name; })[0] || { kind: 'score', max: 100 };
        var suffix = testUnit(rq);
        suffix = suffix === 'rank' ? ' rank' : suffix === '%ile' ? ' %ile' : ' ' + suffix;
        if (lo && hi) return name + ' ' + r.min + '–' + r.max + suffix;
        if (lo) return name + ' ≥ ' + r.min + suffix;
        return name + ' ≤ ' + r.max + suffix;
      }).filter(Boolean).join(', ');
    }
    if (id === 'location') {
      if (v.mode === 'city') return 'Location: in ' + CAMPUS.city;
      if (v.mode === 'state') return 'Location: in ' + CAMPUS.state;
      return 'Location: ' + ((v.places || []).join(', ') || 'Custom');
    }
    if (PICK_FILTERS[id]) return label + ': ' + (v.vals && v.vals.length ? v.vals : [v.val]).join(', ');
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

  var FILTER_ORDER = ['academic', 'test', 'stream', 'board', 'location', 'budget', 'activities'];

  function filterMultiHtml(id, v) {
    var selected = v.vals && v.vals.length ? v.vals : (v.val ? [v.val] : []);
    var boxes = function (all, labels) {
      return '<div class="ar-checks">' + all.map(function (item) {
        return '<label class="ar-check"><input type="checkbox" data-ff="' + id + '" value="' + esc(item) + '"' +
          (selected.indexOf(item) !== -1 ? ' checked' : '') + ' />' + esc((labels && labels[item]) || item) + '</label>';
      }).join('') + '</div>';
    };
    if (id === 'board') {
      return BOARD_GROUPS.map(function (g) {
        return '<div class="ar-check-group"><div class="ar-check-group-head"><span>' + esc(g[0]) + '</span></div>' + boxes(g[1], BOARD_LABELS) + '</div>';
      }).join('');
    }
    var known = id === 'stream' ? SUBJECTS : ACTIVITIES;
    var extra = pickOptions(PICK_FILTERS[id]).filter(function (item) { return known.indexOf(item) === -1; });
    return boxes(known.concat(extra));
  }

  function filterLocationHtml(v) {
    var mode = v.mode || '';
    var places = v.places || [];
    var modes = [['', 'Any'], ['city', 'In ' + CAMPUS.city], ['state', 'In ' + CAMPUS.state], ['custom', 'Custom']];
    var html = '<div class="ar-loc-modes" role="radiogroup" aria-label="Location">' + modes.map(function (m) {
      return '<label><input type="radio" name="ff-loc-mode" value="' + m[0] + '"' + (mode === m[0] ? ' checked' : '') + ' />' + esc(m[1]) + '</label>';
    }).join('') + '</div>';
    if (mode !== 'custom') return html;
    return html + '<div class="ar-place" id="ff-place">' +
      (places.length ? '<div class="ar-place-chips">' + places.map(function (p) {
        return '<span class="ar-place-chip">' + esc(p) + '<button type="button" data-ff-remove-place="' + esc(p) + '" aria-label="Remove ' + esc(p) + '">' + ico('close') + '</button></span>';
      }).join('') + '</div>' : '') +
      '<label class="ar-place-search">' + ico('search') +
      '<input type="text" id="ff-place-q" placeholder="Search a city or state" autocomplete="off" /></label>' +
      '<div class="ar-place-list" id="ff-place-list" hidden></div></div>';
  }

  function openFilterPlaces() {
    var list = $('ff-place-list');
    if (!list) return;
    var places = (state.filters.vals.location && state.filters.vals.location.places) || [];
    list.innerHTML = placeListHtml($('ff-place-q').value, places, 'data-ff-add-place');
    list.hidden = false;
  }

  function refreshFilterMenu() {
    var body = $('filter-menu').querySelector('.ar-fmenu-body');
    var top = body ? body.scrollTop : 0;
    renderFilterMenu();
    body = $('filter-menu').querySelector('.ar-fmenu-body');
    if (body) body.scrollTop = top;
  }

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
        var ranges = testRanges(v);
        return (pref.criteria.test.tests || []).map(function (rq) {
          var tv = ranges[rq.name] || {};
          var unit = testUnit(rq);
          var ext = extent(function (s) {
            var t = s.tests.filter(function (x) { return x.name.toLowerCase() === rq.name.toLowerCase(); })[0];
            return t ? t.value : null;
          });
          return row(label(rq.name, span(ext, unit)), rangeInputs(function (k) {
            return 'data-fnum="test:' + encodeURIComponent(rq.name) + ':' + k + '"';
          }, tv, unit));
        }).join('');
      }
      if (id === 'budget') {
        var lo = extent(function (s) { return s.budget[0]; })[0];
        var hi = extent(function (s) { return s.budget[1]; })[1];
        return row(label(name, lo === '' ? '' : 'In data: ₹' + lo + '–' + hi + 'L'),
          '<label class="ar-fin"><span>₹</span><input type="number" placeholder="Minimum" data-fnum="budget:min" value="' +
          (v.min === undefined ? '' : v.min) + '" aria-label="Minimum fee budget"><span>L</span></label>');
      }
      if (id === 'location') return row(label(name), filterLocationHtml(v));
      if (PICK_FILTERS[id]) return row(label(name), filterMultiHtml(id, v));
      if (RANGE_FILTERS[id]) {
        var u = RANGE_FILTERS[id].unit;
        return row(label(name, span(extent(RANGE_FILTERS[id].get), u)), rangeInputs(numAttr(id), v, u));
      }
      return row(label(name), '');
    };
    var scoreAttr = function (k) { return 'data-fscore="' + k + '" min="0" max="100"'; };
    var head = '<div class="ar-fmenu-head"><strong>Filters</strong>' +
      '<button type="button" class="ar-icon-btn" data-fdone aria-label="Close filters">' + ico('close') + '</button></div>' +
      '<div class="ar-fsheet-tabs" role="tablist">' + [['new', fsheet.editId ? 'Edit filter' : 'New filter'], ['saved', 'Saved filters']].map(function (tb) {
        var on = fsheet.tab === tb[0];
        return '<button type="button" role="tab" class="' + (on ? 'active' : '') + '" aria-selected="' + on + '" data-ftab="' + tb[0] + '">' + tb[1] +
          (tb[0] === 'saved' && SFILTERS.length ? '<small>' + SFILTERS.length + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    if (fsheet.tab === 'saved') {
      $('filter-menu').innerHTML = head + '<div class="ar-fmenu-body gr-scroll">' + savedFiltersHtml() + '</div>';
      return;
    }
    var editingFilter = fsheet.editId && savedFilterById(fsheet.editId);
    var foot = fsheet.naming
      ? '<div class="ar-fmenu-foot ar-fsave-row">' +
        '<label class="ar-fsave-label">Label<input type="text" id="fsave-name" placeholder="e.g. JEE 90+ in Haryana" value="' + esc(editingFilter ? editingFilter.name : '') + '" autocomplete="off" /></label>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-fsave-cancel>Cancel</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-fsave-confirm>Save</button></div>'
      : '<div class="ar-fmenu-foot">' +
        '<button type="button" class="ar-link" data-freset>Clear all</button>' +
        '<button type="button" class="btn btn-secondary btn-sm btn-icon" data-fsave>' + ico('bookmark') + (editingFilter ? 'Update' : 'Save') + '</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-fdone>Apply · <span id="filter-show-count">' +
        visibleSet().length + '</span> students</button></div>';
    $('filter-menu').innerHTML = head +
      '<div class="ar-fmenu-body gr-scroll">' +
      row(label('Match score'), rangeInputs(scoreAttr, f, '%')) +
      FILTER_ORDER.filter(function (id) { return pref.criteria[id].weight > 0; }).map(field).join('') +
      Object.keys(ENGAGE_FILTERS).map(function (id) {
        var cur = (f.vals[id] || {}).val || '';
        return row(label(ENGAGE_FILTERS[id].label, 'Each step includes students who went further'),
          '<div class="ar-fchips" role="radiogroup" aria-label="' + esc(ENGAGE_FILTERS[id].label) + '">' +
          [''].concat(ENGAGE_FILTERS[id].steps).map(function (st) {
            var on = cur === st;
            return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'active' : '') + '" data-fchip="' + id + ':' + esc(st) + '">' + (st || 'Any') + '</button>';
          }).join('') + '</div>');
      }).join('') +
      row(label('Intake'), '<select class="ar-fselect" data-fintake aria-label="Intake">' +
        [['', 'All intakes'], ['2026', '2026'], ['2027', '2027'], ['2028', '2028'], ['2029', '2029']].map(function (o) {
          return '<option value="' + o[0] + '"' + (state.intake === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>') +
      '</div>' + foot;
  }

  function renderStudents() {
    var pref = filtersOn() && findPref(state.program, state.prefId);
    if (pref) {
      Object.keys(state.filters.vals).forEach(function (id) {
        if (pref.criteria[id] && !(pref.criteria[id].weight > 0)) delete state.filters.vals[id];
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

  /* ——— Billing ——— */

  var billRange = null;
  var rpFor = 'dash';
  var BILL_OPENING = 200000;
  var BILL_QUARTER = 18000;
  var BILL_RECHARGES = [
    { at: new Date(2026, 6, 11, 15, 42), amount: 700, by: 'Admissions office' },
    { at: new Date(2026, 6, 11, 15, 2), amount: 500, by: 'Admissions office' },
  ];

  function ensureBillRange() {
    if (billRange) return;
    var r = presetRange('mtd');
    billRange = { from: r.from, to: r.to, preset: 'mtd' };
  }

  function billBounds() {
    ensureBillRange();
    if (!billRange.from) return { from: null, to: null, label: 'All time' };
    var from = dayStart(billRange.from);
    var to = dayStart(billRange.to || billRange.from);
    return { from: from, to: addDays(to, 1), label: rangeText(from, to) };
  }

  function billIn(bounds, d) {
    if (!bounds || !bounds.from) return !!d;
    if (!d) return false;
    var t = d.getTime ? d.getTime() : new Date(d).getTime();
    return t >= bounds.from.getTime() && t < bounds.to.getTime();
  }

  function billMoney(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** What the university is charged for. Volumes come from students, campaigns and events in the period. */
  function billUsage(bounds) {
    var n = { impressions: 0, visited: 0, conversation: 0, shortlisted: 0, email: 0, whatsapp: 0, sms: 0, chat: 0, registered: 0, attended: 0, campaigns: 0 };
    STUDENTS.forEach(function (s) {
      if (billIn(bounds, s.events[0])) n.impressions += 1;
      if (billIn(bounds, s.events[1])) n.visited += 1;
      if (s.actions.callback && billIn(bounds, s.actions.callback)) n.conversation += 1;
      if (s.actions.shortlisted && billIn(bounds, s.actions.shortlisted)) n.shortlisted += 1;
    });
    CAMPAIGN_LIST.forEach(function (c) {
      if (c.status !== 'launched' || !c.sentAt || !billIn(bounds, new Date(c.sentAt))) return;
      n.campaigns += 1;
      var delivered = Math.max(1, Math.round((c.recipients != null ? c.recipients : cgAudience(c.audience).length) * 0.92));
      if (n[c.channel] != null) n[c.channel] += delivered;
    });
    individualRows().forEach(function (row) {
      if (!billIn(bounds, new Date(row.at))) return;
      if (n[row.channel] != null) n[row.channel] += 1;
    });
    Object.keys(CHATS).forEach(function (id) {
      (CHATS[id].messages || []).forEach(function (m) {
        if (m.from === 'uni' && !m.campaign && billIn(bounds, new Date(m.at))) n.chat += 1;
      });
    });
    EVENTS.forEach(function (e) {
      if (e.draft || !billIn(bounds, e.start)) return;
      n.registered += e.registrations;
      if (e.kind === 'webinar' || e.kind === 'ama') n.attended += Math.round(e.registrations * 0.4);
    });
    var groups = [
      { id: 'engagement', name: 'Engagement', note: 'Students reaching or acting on a program', rows: [
        { name: 'Program impressions', icon: 'visibility', volume: n.impressions, price: 2 },
        { name: 'Programs visited', icon: 'travel_explore', volume: n.visited, price: 8 },
        { name: 'Conversation requested', icon: 'forum', volume: n.conversation, price: 12 },
        { name: 'Programs shortlisted', icon: 'bookmark', volume: n.shortlisted, price: 20 },
      ] },
      { id: 'communication', name: 'Communication', note: n.campaigns + ' launched campaign' + (n.campaigns === 1 ? '' : 's') + ' and one-to-one sends', rows: [
        { name: 'WhatsApp messages delivered', icon: 'chat', volume: n.whatsapp, price: 1 },
        { name: 'Text messages delivered', icon: 'sms', volume: n.sms, price: 1 },
        { name: 'Emails delivered', icon: 'mail', volume: n.email, price: 1 },
        { name: 'In-app chat messages', icon: 'forum', volume: n.chat, price: 1 },
      ] },
      { id: 'events', name: 'Event participation', note: 'Registrations and session attendance', rows: [
        { name: 'Unique leads registered', icon: 'how_to_reg', volume: n.registered, price: 6 },
        { name: 'Webinar and AMA attendees', icon: 'co_present', volume: n.attended, price: 12 },
      ] },
    ];
    groups.forEach(function (g) {
      g.total = g.rows.reduce(function (sum, row) { return sum + row.volume * row.price; }, 0);
    });
    return { groups: groups, total: groups.reduce(function (sum, g) { return sum + g.total; }, 0) };
  }

  function renderBilling() {
    var bounds = billBounds();
    var usage = billUsage(bounds);
    var all = billUsage(null);
    var credited = BILL_OPENING + BILL_RECHARGES.reduce(function (sum, r) { return sum + r.amount; }, 0);
    var balance = credited - all.total;
    $('bill-range-label').textContent = bounds.label;
    $('bill-body').innerHTML =
      '<div class="ar-bill-stats">' +
      '<div class="panel ar-bill-stat"><span>' + ico('account_balance_wallet') + 'Wallet balance</span><strong>' + billMoney(balance) + '</strong></div>' +
      '<div class="panel ar-bill-stat"><span>' + ico('calendar_month') + 'Quarterly subscription</span><strong>' + billMoney(BILL_QUARTER) + '</strong></div>' +
      '<p class="ar-bill-when">Charges for ' + esc(bounds.label) + '</p></div>' +
      usage.groups.map(function (g) {
        return '<section class="panel ar-bill-group"><header><div><h2>' + esc(g.name) + '</h2><p>' + esc(g.note) + '</p></div><strong>' + billMoney(g.total) + '</strong></header>' +
          '<table><thead><tr><th>Metric</th><th>Volume</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>' +
          g.rows.map(function (row) {
            return '<tr><td>' + ico(row.icon) + esc(row.name) + '</td><td>' + row.volume.toLocaleString('en-IN') + '</td><td>' + billMoney(row.price) + '</td><td>' + billMoney(row.volume * row.price) + '</td></tr>';
          }).join('') +
          '<tr class="ar-bill-sub"><td colspan="3">' + esc(g.name) + ' total</td><td>' + billMoney(g.total) + '</td></tr></tbody></table></section>';
      }).join('') +
      '<p class="ar-bill-note">Amounts are in USD. Taxes, where they apply, are added on the invoice.</p>';
    $('bill-grand').innerHTML = '<div><strong>Grand total</strong><span>Usage for ' + esc(bounds.label) + '. The quarterly fee is billed separately.</span></div><b>' + billMoney(usage.total) + '</b>';
  }

  function openRechargeHistory() {
    var rows = BILL_RECHARGES.slice().sort(function (a, b) { return b.at - a.at; }).map(function (r) {
      return '<div class="ar-bill-pay"><div><strong>' + esc(fmtDateTime(r.at)) + '</strong><span>Added by ' + esc(r.by) + '</span></div><b>' + billMoney(r.amount) + '</b></div>';
    }).join('');
    openDrawer('Recharge history', '<div class="ar-bill-pays">' + rows + '</div>', '', true);
  }

  function setView(view, fromRoute) {
    state.view = view;
    $('view-dashboard').hidden = view === 'programs' || view === 'chats' || view === 'events' || view === 'campaigns' || view === 'billing' || view === 'settings';
    $('view-dashboard').classList.toggle('ar-saved-view', view === 'saved');
    $('view-programs').hidden = view !== 'programs';
    $('view-chats').hidden = view !== 'chats';
    $('view-events').hidden = view !== 'events';
    $('view-campaigns').hidden = view !== 'campaigns';
    $('view-billing').hidden = view !== 'billing';
    $('view-settings').hidden = view !== 'settings';
    document.querySelectorAll('.ar-rail-item[data-go]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-go') === view);
    });
    if (view === 'programs') renderPrograms();
    else if (view === 'chats') renderChats();
    else if (view === 'events') renderEvents();
    else if (view === 'campaigns') renderCampaigns();
    else if (view === 'billing') renderBilling();
    else if (view === 'settings') renderSettings();
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
    if (view === 'campaigns') return cgPath();
    if (view === 'settings') return settingsPath();
    return view || 'dashboard';
  }

  function parseRoute() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (err) { return p; }
    });
    var view = parts[0] || 'dashboard';
    if (['dashboard', 'programs', 'saved', 'events', 'campaigns', 'billing', 'chats', 'settings'].indexOf(view) < 0) view = 'dashboard';
    var page = 'list';
    var id = null;
    var tab = null;
    if (view === 'events') {
      if (parts[1] === 'create') page = 'create';
      else if (parts[1]) { page = 'detail'; id = parts[1]; }
    }
    if (view === 'campaigns') {
      if (parts[1] === 'drafts') tab = 'drafts';
      else if (parts[1] === 'individual') tab = 'individual';
      else if (parts[1] === 'create') page = 'form';
      else if (parts[1] && parts[2] === 'edit') { page = 'form'; id = parts[1]; }
      else if (parts[1]) { page = 'detail'; id = parts[1]; }
      else tab = 'launched';
    }
    if (view === 'chats' && parts[1]) id = parts[1];
    if (view === 'settings') {
      if (parts[1] === 'users') {
        if (parts[2] === 'new') page = 'user-form';
        else if (parts[2]) { page = 'user-form'; id = parts[2]; }
        else page = 'users';
      } else if (parts[1] === 'roles') {
        if (parts[2] === 'new') page = 'role-form';
        else if (parts[2]) { page = 'role-form'; id = parts[2]; }
        else page = 'roles';
      } else page = 'roles';
    }
    return { view: view, page: page, id: id, tab: tab };
  }

  function routeHref(r) {
    if (r.view === 'campaigns') {
      if (r.page === 'form') return r.id ? '#/campaigns/' + encodeURIComponent(r.id) + '/edit' : '#/campaigns/create';
      if (r.page === 'detail' && r.id) return '#/campaigns/' + encodeURIComponent(r.id);
      return '#/' + cgListPath(r.tab);
    }
    if (r.view === 'events' && r.page === 'create') return '#/events/create';
    if (r.view === 'events' && r.page === 'detail' && r.id) return '#/events/' + encodeURIComponent(r.id);
    if (r.view === 'chats' && r.id) return '#/chats/' + encodeURIComponent(r.id);
    if (r.view === 'settings') {
      if (r.page === 'users') return '#/settings/users';
      if (r.page === 'user-form') return '#/settings/users';
      return '#/settings';
    }
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
    if (r.view === 'settings') {
      settingsPage.tab = r.page === 'users' || r.page === 'user-form' ? 'users' : 'roles';
    }
    if (r.view === 'campaigns') {
      cgPage.page = r.page;
      cgPage.id = r.id || null;
      if (r.tab) cgPage.tab = r.tab;
    } else {
      cgPage.page = 'list';
      cgPage.id = null;
    }
    if (cgPage.page !== 'form') cgForm = null;
    setView(r.view, true);
    if (r.view === 'settings' && r.page === 'user-form') openUserModal(r.id);
    if (r.view === 'settings' && r.page === 'role-form') openRoleModal(r.id);
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
      } else {
        var first = chatThreads().filter(function (c) { return cfPassesBase(c) && cfPassesQuick(c); })[0];
        state.chatId = null;
        if (first) {
          selectChat(first.id);
          history.replaceState(null, '', '#/chats/' + encodeURIComponent(first.id));
        } else if (r.id) {
          history.replaceState(null, '', '#/chats');
        }
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
        ico(c.icon) + '<span>' + c.name + '</span></button>';
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

  var CAMPAIGN_STEPS = ['Sent', 'Delivered', 'Opened', 'Interacted'];

  /** Demo delivery tracking: a stable outcome per send, and only steps that have already happened. */
  function campaignTrack(s, c) {
    var h = hashOf(s.id + ':' + c.at + ':' + c.channel);
    var r = h % 100;
    var reach = r < 6 ? 0 : r < 30 ? 1 : r < 72 ? 2 : 3;
    var at = new Date(c.at).getTime();
    var gaps = [0, 30000 + (h >>> 7) % 150000, 4 * 60000 + (h >>> 11) % (6 * 3600000), 2 * 60000 + (h >>> 17) % (40 * 60000)];
    var steps = [];
    for (var i = 0; i <= reach; i++) {
      at += gaps[i];
      if (at > Date.now()) break;
      steps.push({ name: CAMPAIGN_STEPS[i], at: new Date(at) });
    }
    return steps;
  }

  var CMP_OPEN = {};

  function campaignItemsHtml(s, sent) {
    return '<div class="ar-cmp-list">' + sent.map(function (c) {
      var ch = channelById(c.channel);
      var steps = campaignTrack(s, c);
      var last = steps[steps.length - 1];
      var day = fmtDate(steps[0].at);
      var key = s.id + '|' + c.at + '|' + c.channel;
      var lastWhen = fmtDate(last.at) === fmtDate(new Date()) ? fmtTime(last.at) : fmtDateTime(last.at);
      return '<details class="ar-cmp" data-cmp="' + esc(key) + '"' + (CMP_OPEN[key] ? ' open' : '') + '>' +
        '<summary class="ar-cmp-head">' + ico(ch.icon) + '<span>' + esc(c.subject || (c.text ? c.text.slice(0, 60) + (c.text.length > 60 ? '…' : '') : ch.name + ' campaign')) +
        '<small>' + esc(ch.name) + ' · ' + esc(last.name) + ' ' + esc(lastWhen) + '</small></span>' +
        '<em class="ar-cmp-status s' + steps.length + '">' + esc(last.name) + '</em>' + ico('expand_more') + '</summary>' +
        '<ol class="ar-cmp-steps">' + CAMPAIGN_STEPS.map(function (name, i) {
          var st = steps[i];
          var when = st ? (fmtDate(st.at) === day ? fmtTime(st.at) : fmtDateTime(st.at)) : 'Not yet';
          return '<li class="' + (st ? 'done' : '') + '"><span>' + name + '</span><time>' + esc(i === 0 ? fmtDateTime(st.at) : when) + '</time></li>';
        }).join('') + '</ol></details>';
    }).join('') + '</div>';
  }

  document.addEventListener('toggle', function (e) {
    var key = e.target.getAttribute && e.target.getAttribute('data-cmp');
    if (key) CMP_OPEN[key] = e.target.open;
  }, true);

  function campaignLogHtml(s) {
    var sent = (CAMPAIGNS[s.id] || []).slice().reverse();
    if (!sent.length) return '';
    return profileSection('campaigns', 'Campaigns · ' + sent.length, campaignItemsHtml(s, sent));
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
    var picked = (CF.program !== 'all') + !!cfPref() + (CF.min !== '' || CF.max !== '') + (CF.stages.length > 0) + (CF.extras.length > 0);
    $('cf-count').textContent = picked;
    $('cf-count').hidden = !picked;
    $('cf-toggle').classList.toggle('on', picked > 0);

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
    var campaigns = sent.length ? campaignItemsHtml(s, sent) : '';
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
      (campaigns ? '<div class="ar-cp-sec"><h4>Campaigns <small>' + sent.length + '</small></h4>' + campaigns + '</div>' : '');
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
    $('drawer').classList.remove('ar-confirm-modal', 'ar-campaign-modal', 'ar-event-create-modal', 'ar-event-detail-modal', 'ar-st-user-modal', 'ar-st-role-modal');
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
      '<p style="margin-top:var(--space-1-5)">' + stagePill(s) + '</p></div>' +
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

  function checks(name, all, selected, labels) {
    return '<div class="ar-checks">' + all.map(function (v) {
      return '<label class="ar-check"><input type="checkbox" name="' + name + '" value="' + esc(v) + '"' +
        (selected.indexOf(v) !== -1 ? ' checked' : '') + ' />' + esc((labels && labels[v]) || v) + '</label>';
    }).join('') + '</div>';
  }

  function boardEditor(c) {
    return BOARD_GROUPS.map(function (g, i) {
      return '<div class="ar-check-group"><div class="ar-check-group-head"><span>' + esc(g[0]) + '</span>' +
        '<button type="button" class="ar-link" data-board-all="' + i + '">Select all</button></div>' +
        checks('pe-board', g[1], c.board.values, BOARD_LABELS) + '</div>';
    }).join('');
  }

  function placeOptions(q, taken) {
    q = q.trim().toLowerCase();
    var cities = Object.keys(CITY_STATE).sort().map(function (n) { return { name: n, sub: 'City · ' + CITY_STATE[n] }; });
    var states = STATES.filter(function (n) { return !CITY_STATE[n]; }).map(function (n) { return { name: n, sub: 'State' }; });
    return cities.concat(states).filter(function (o) {
      return taken.indexOf(o.name) === -1 && (!q || o.name.toLowerCase().indexOf(q) !== -1);
    });
  }

  function placeListHtml(q, taken, attr) {
    attr = attr || 'data-add-place';
    var opts = placeOptions(q, taken);
    if (!opts.length) return '<p class="ar-place-none">No city or state matches “' + esc(q) + '”.</p>';
    return opts.map(function (o) {
      return '<button type="button" class="ar-place-opt" ' + attr + '="' + esc(o.name) + '"><span>' + esc(o.name) + '</span><small>' + esc(o.sub) + '</small></button>';
    }).join('');
  }

  function locationEditor(c) {
    var loc = c.location;
    var modes = [['city', 'In ' + CAMPUS.city], ['state', 'In ' + CAMPUS.state], ['custom', 'Custom']];
    var html = '<div class="ar-loc-modes" role="radiogroup" aria-label="Location">' + modes.map(function (m) {
      return '<label><input type="radio" name="pe-loc-mode" value="' + m[0] + '"' + (loc.mode === m[0] ? ' checked' : '') + ' />' + m[1] + '</label>';
    }).join('') + '</div>';
    if (loc.mode !== 'custom') return html;
    return html +
      '<div class="ar-place" id="pe-place">' +
      (loc.places.length ? '<div class="ar-place-chips">' + loc.places.map(function (p) {
        return '<span class="ar-place-chip">' + esc(p) + '<button type="button" data-remove-place="' + esc(p) + '" aria-label="Remove ' + esc(p) + '">' + ico('close') + '</button></span>';
      }).join('') + '</div>' : '') +
      '<label class="ar-place-search">' + ico('search') +
      '<input type="text" id="pe-place-q" placeholder="Search a city or state" autocomplete="off" /></label>' +
      '<div class="ar-place-list" id="pe-place-list" hidden></div></div>';
  }

  function openPlaceList() {
    var list = $('pe-place-list');
    if (!list) return;
    list.innerHTML = placeListHtml($('pe-place-q').value, editing.draft.criteria.location.places);
    list.hidden = false;
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
        '<div class="ar-req' + (rq.attended ? ' attended' : '') + '">' +
        '<div class="ar-req-name"><strong>' + esc(rq.name) + '</strong>' +
        '<small>' + (rq.custom ? '<i class="ar-tag">Custom</i>' : esc((info && info.hint) || 'Score out of ' + fmtNum(rq.max))) + '</small></div>' +
        '<div class="ar-req-modes" role="radiogroup" aria-label="' + esc(rq.name) + ' requirement">' +
        '<label><input type="radio" name="pe-tm-' + i + '" value="attended" data-test-mode="' + i + '"' + (rq.attended ? ' checked' : '') + ' />Taken the test</label>' +
        '<label><input type="radio" name="pe-tm-' + i + '" value="score" data-test-mode="' + i + '"' + (rq.attended ? '' : ' checked') + ' />Minimum score</label></div>' +
        (rq.attended ? '' :
          '<label class="ar-req-min"><input type="number" min="0"' + (rq.kind === 'score' ? ' max="' + rq.max + '"' : '') +
          ' step="any" data-test-min="' + i + '" value="' + rq.min + '" aria-label="' + esc(rq.name) + ' minimum" />' +
          '<span>' + unitSuffix(rq) + '</span></label>') +
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

  function subjectEditor(c) {
    var known = SUBJECTS.map(function (a) { return a.toLowerCase(); });
    var extra = c.stream.subjects.filter(function (a) { return known.indexOf(a.toLowerCase()) === -1; });
    return (
      checks('pe-subject', SUBJECTS.concat(extra), c.stream.subjects) +
      '<div class="ar-add-row"><input type="text" id="pe-subject-new" placeholder="Add a custom subject, e.g. Legal Studies" />' +
      '<button type="button" class="btn btn-secondary btn-sm" data-add-subject>Add</button></div>'
    );
  }

  function addCustomSubject() {
    var input = $('pe-subject-new');
    var name = input.value.trim();
    if (!name) { input.focus(); return; }
    readEditor();
    var values = editing.draft.criteria.stream.subjects;
    if (!values.some(function (a) { return a.toLowerCase() === name.toLowerCase(); })) {
      var known = SUBJECTS.filter(function (a) { return a.toLowerCase() === name.toLowerCase(); })[0];
      values.push(known || name);
    }
    rerenderEditor();
    $('pe-subject-new').focus();
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
        '<div class="ar-crit-body">' + control + (hint ? '<p class="ar-hint">' + hint + '</p>' : '') + '</div></div></div>';
    }
    function group(title, rows) {
      return '<section class="ar-crit-group"><h5>' + title + '</h5>' + rows + '</section>';
    }
    var gradeHint = 'Class 12 result, compared as %. CGPA is converted × 9.5 and IB points ÷ 45.';

    return (
      '<label class="ar-editor-program">' + ico('school') + '<div><span>Program</span>' +
      '<select id="pe-program" aria-label="Program">' + PROGRAMS.map(function (p) {
        return '<option value="' + p.id + '"' + (p.id === program.id ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('') + '</select></div>' + ico('expand_more') + '</label>' +
      '<div class="field"><label>Preference name</label><input type="text" id="pe-name" value="' + esc(d.name) + '" placeholder="e.g. Delhi NCR high achievers" /></div>' +

      '<div class="ar-editor-sub"><h4>What counts toward the score</h4></div>' +
      '<p class="ar-hint ar-editor-hint">Tick a criterion to include it in the match score. Unticked ones are ignored.</p>' +
      group('Academics',
        row('academic', 'Academic score', '<label class="ar-unit"><input type="number" min="0" max="100" id="pe-academic" value="' + c.academic.min + '" /><span>% and above</span></label>', gradeHint) +
        row('test', 'Test score', testsEditor(c), 'Students need any one of these. Pick whether each test only needs to be taken or needs a minimum score.') +
        row('stream', 'Subjects (Class 11–12)', subjectEditor(c), 'Students must have studied every ticked subject. Leave all unticked to accept any.') +
        row('board', 'Accepted Class 12 boards', boardEditor(c))) +
      group('Location & budget',
        row('location', 'Location', locationEditor(c), c.location.mode === 'custom' ? 'Students from any picked city or state count as a match.' : '') +
        row('budget', 'Minimum fee budget',
          '<label class="ar-unit"><b>₹</b><input type="number" min="0" id="pe-bmin" value="' + c.budget.min + '" aria-label="Minimum budget" /><span>lakh or more</span></label>',
          'Program fee is ₹' + program.fee + 'L. Students who can spend at least this much count as a match.')) +
      group('Interests', row('activities', 'Extracurricular', activityEditor(c)))
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
      saved[cid] = d.criteria[cid].weight || d.criteria[cid].saved || 10;
      return body.querySelector('[data-include="' + cid + '"]').checked ? saved[cid] : 0;
    }
    function checked(name) {
      return Array.prototype.map.call(body.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
    }
    var locMode = body.querySelector('input[name="pe-loc-mode"]:checked');
    d.name = $('pe-name').value.trim();
    d.criteria = {
      academic: { min: num('pe-academic', d.criteria.academic.min), weight: weight('academic') },
      test: {
        tests: d.criteria.test.tests.map(function (rq, i) {
          var input = body.querySelector('[data-test-min="' + i + '"]');
          var mode = body.querySelector('[data-test-mode="' + i + '"]:checked');
          var v = input ? Number(input.value) : rq.min;
          return Object.assign({}, rq, {
            min: input && input.value !== '' && !isNaN(v) ? v : rq.min,
            attended: mode ? mode.value === 'attended' : !!rq.attended,
          });
        }),
        weight: weight('test'),
      },
      stream: { subjects: checked('pe-subject'), weight: weight('stream') },
      board: { values: checked('pe-board'), weight: weight('board') },
      location: {
        mode: locMode ? locMode.value : d.criteria.location.mode,
        places: d.criteria.location.places.slice(),
        weight: weight('location'),
      },
      budget: { min: num('pe-bmin', d.criteria.budget.min), weight: weight('budget') },
      activities: { values: checked('pe-activity'), weight: weight('activities') },
    };
    Object.keys(saved).forEach(function (cid) { d.criteria[cid].saved = saved[cid]; });
  }

  function updatePreview() {
    readEditor();
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
    { id: 'openhouse', name: 'Open house', icon: 'apartment' },
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
    ['Campus open house', 'openhouse', 'offline', 'btech-cse', 0, '2027', 96, 180, CAMPUS.city, CAMPUS.venue, '', 980, 240, false, 'Admissions team'],
    ['AI lab open house', 'openhouse', 'hybrid', 'btech-ai', 0, '2027', 140, 120, CAMPUS.city, CAMPUS.venue, 'Zoom', 640, 150, false, 'Faculty of Engineering'],
    ['BBA campus open house', 'openhouse', 'offline', 'bba', null, '2028', 260, 150, CAMPUS.city, CAMPUS.venue, '', 420, 96, false, 'School of Management'],
    ['Design studio open house', 'openhouse', 'hybrid', 'bdes', 0, '2027', -200, 120, CAMPUS.city, CAMPUS.venue, 'Google Meet', 510, 118, false, 'Faculty of Design'],
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
    return (EF.program !== 'all') + !!EF.prefId + !!EF.cohort +
      EF.formats.length + EF.kinds.length + EF.cities.length + EF.platforms.length;
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
    var opt = function (value, label, selected) {
      return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
    };
    var select = function (id, options) {
      return '<select class="ar-cg-select" id="' + id + '">' + options + '</select>';
    };
    var checks = function (group, items) {
      return '<div class="ar-fchips">' + items.map(function (it) {
        var on = EF[group].indexOf(it.id) !== -1;
        return '<button type="button" class="' + (on ? 'active' : '') + '" data-ev-check="' + group + ':' + esc(it.id) + '">' + esc(it.name) + '</button>';
      }).join('') + '</div>';
    };
    var pref = efPref();
    var prefs = EF.program === 'all' ? [] : prefsFor(EF.program);
    $('evf-fields').innerHTML =
      '<label><span>Program</span>' + select('evf-program', [{ id: 'all', name: 'All programs' }].concat(PROGRAMS).map(function (p) {
        return opt(p.id, p.name, EF.program === p.id);
      }).join('')) + '</label>' +
      '<label><span>Preference</span>' + select('evf-pref', opt('', 'Any', !pref) + prefs.map(function (p) {
        return opt(p.id, p.name, pref && pref.id === p.id);
      }).join('')) + '</label>' +
      '<label><span>Cohort</span>' + select('evf-cohort', [''].concat(COHORTS).map(function (c) {
        return opt(c, c ? c + ' intake' : 'All cohorts', EF.cohort === c);
      }).join('')) + '</label>' +
      '<label><span>Format</span>' + checks('formats', EVENT_FORMATS) + '</label>' +
      '<label><span>Kind of event</span>' + checks('kinds', EVENT_KINDS) + '</label>' +
      '<label><span>City</span>' + checks('cities', eventCities().map(function (c) { return { id: c, name: c }; })) + '</label>' +
      '<label><span>Meeting platform</span>' + checks('platforms', Object.keys(PLATFORM_LINKS).map(function (p) { return { id: p, name: p }; })) + '</label>';
    $('evf-pref').disabled = EF.program === 'all';
    var n = efFacetCount();
    $('evf-count').textContent = n;
    $('evf-count').hidden = !n;
    $('evf-clear').hidden = !n;
    $('evf-toggle').classList.toggle('on', n > 0);
  }

  function renderEventChips() {
    var names = {
      formats: function (v) { return formatById(v).name; },
      kinds: function (v) { return kindById(v).name; },
      cities: function (v) { return v; },
      platforms: function (v) { return v; },
    };
    var chips = [];
    if (EF.program !== 'all') chips.push('<button type="button" class="ar-filter-chip" data-ev-clear="program">' + esc(programById(EF.program).name) + ico('close') + '</button>');
    if (EF.prefId && efPref()) chips.push('<button type="button" class="ar-filter-chip" data-ev-clear="pref">' + esc(efPref().name) + ico('close') + '</button>');
    if (EF.cohort) chips.push('<button type="button" class="ar-filter-chip" data-ev-clear="cohort">' + esc(EF.cohort) + ' intake' + ico('close') + '</button>');
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

  function topFive(rows) {
    return rows.slice().sort(function (a, b) { return b.n - a.n || b.regs - a.regs; }).slice(0, 5);
  }

  var evPieFocus = '';
  var FORMAT_PIE = { online: 'var(--purple-500)', offline: 'var(--purple-300)', hybrid: 'var(--purple-400)' };

  function pieActiveId(rows) {
    if (evPieFocus && rows.some(function (r) { return r.id === evPieFocus; })) return evPieFocus;
    var picked = rows.filter(function (r) { return EF.formats.indexOf(r.id) !== -1; });
    if (picked.length === 1) return picked[0].id;
    return '';
  }

  function donutPath(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    var pt = function (r, a) {
      return (Math.round((cx + Math.cos(a) * r) * 10) / 10) + ',' + (Math.round((cy + Math.sin(a) * r) * 10) / 10);
    };
    return 'M' + pt(r1, a0) + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + pt(r1, a1) +
      'L' + pt(r0, a1) + 'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + pt(r0, a0) + 'Z';
  }

  function donutPaths(cx, cy, r0, r1, a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 0.01) {
      var mid = a0 + Math.PI;
      return [donutPath(cx, cy, r0, r1, a0, mid - 0.001), donutPath(cx, cy, r0, r1, mid, a1 - 0.001)];
    }
    return [donutPath(cx, cy, r0, r1, a0, a1)];
  }

  function formatPieHtml(rows) {
    var alive = rows.filter(function (r) { return r.n; });
    if (!alive.length) {
      return '<div class="panel-head"><h2>Event format</h2></div><p class="ar-muted ar-ev-none">No events here with these filters.</p>';
    }
    var active = pieActiveId(rows);
    var total = alive.reduce(function (sum, r) { return sum + r.n; }, 0);
    var current = rows.filter(function (r) { return r.id === active; })[0] || { id: '', name: 'All', n: total };
    var cx = 120;
    var cy = 120;
    var gap = alive.length > 1 ? 0.05 : 0;
    var angle = -Math.PI / 2;
    var slices = alive.map(function (r) {
      var sweep = (r.n / total) * Math.PI * 2;
      var start = angle + gap / 2;
      var end = angle + sweep - gap / 2;
      if (end <= start) end = start + 0.02;
      angle += sweep;
      var on = r.id === current.id;
      var color = FORMAT_PIE[r.id] || 'var(--purple-400)';
      var body = donutPaths(cx, cy, 64, on ? 94 : 82, start, end).map(function (d) {
        return '<path d="' + d + '" fill="' + color + '" />';
      }).join('');
      var ring = on ? donutPaths(cx, cy, 100, 110, start, end).map(function (d) {
        return '<path d="' + d + '" fill="' + color + '" opacity="0.4" />';
      }).join('') : '';
      return '<g class="ar-ev-slice' + (on ? ' on' : '') + '" data-ev-facet="formats:' + esc(r.id) + '" role="button" tabindex="0" aria-pressed="' + (EF.formats.indexOf(r.id) !== -1) + '" aria-label="' + esc(r.name) + ', ' + r.n + ' events">' + body + ring + '</g>';
    }).join('');
    var options = '<option value=""' + (current.id ? '' : ' selected') + '>All</option>' + rows.map(function (r) {
      return '<option value="' + esc(r.id) + '"' + (r.id === current.id ? ' selected' : '') + '>' + esc(r.name) + '</option>';
    }).join('');
    return '<div class="panel-head"><h2>Event format</h2>' +
      '<select class="ar-cg-select ar-ev-pie-select" id="ev-format-focus" aria-label="Highlight a format">' + options + '</select></div>' +
      '<div class="ar-ev-pie"><svg viewBox="0 0 240 240" role="img" aria-label="Events by format">' + slices +
      '<text class="ar-ev-pie-num" x="120" y="116" text-anchor="middle">' + current.n + '</text>' +
      '<text class="ar-ev-pie-cap" x="120" y="136" text-anchor="middle">' + esc(current.name) + '</text></svg></div>';
  }

  function renderEventInsights() {
    var programs = topFive(tally(EVENTS.filter(function (e) { return eventPasses(e, 'program'); }),
      PROGRAMS.map(function (p) { return { id: p.id, name: p.name, icon: 'school' }; }), function (e) { return [e.program]; })
      .filter(function (r) { return r.n; }));
    var kinds = topFive(tally(EVENTS.filter(function (e) { return eventPasses(e, 'kinds'); }), EVENT_KINDS, function (e) { return [e.kind]; })
      .filter(function (r) { return r.n; }));
    var formats = tally(EVENTS.filter(function (e) { return eventPasses(e, 'formats'); }), EVENT_FORMATS, function (e) { return [e.format]; })
      .sort(function (a, b) { return b.n - a.n || b.regs - a.regs; });

    $('ev-insights').innerHTML =
      '<div class="ar-ev-panels">' +
      '<div class="panel ar-ev-panel"><div class="panel-head"><h2>Events by program</h2></div>' + insightRows(programs, 'program', maxN(programs)) + '</div>' +
      '<div class="panel ar-ev-panel"><div class="panel-head"><h2>Kind of event</h2></div>' + insightRows(kinds, 'kinds', maxN(kinds)) + '</div>' +
      '<div class="panel ar-ev-panel ar-ev-pie-panel">' + formatPieHtml(formats) + '</div>' +
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
    return '<div class="ar-ev-cover k-' + e.kind + (big ? ' big' : '') + '">' +
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
    'Open House': 'openhouse',
    'Webinar': 'webinar',
    'Workshop': 'expert',
    'Career Fair': 'expert',
    'Scholarship Session': 'ama',
    'Meet the experts': 'expert',
    'Alumni Meetup': 'coffee',
    'Other': 'ama',
  };
  var EVENT_CREATE_STEPS = [
    { id: 'basics', name: 'Event basics' },
    { id: 'audience', name: 'Audience' },
    { id: 'venue', name: 'Venue and date' },
    { id: 'messages', name: 'Messages' },
    { id: 'registration', name: 'Registration details' },
    { id: 'review', name: 'Review & publish' },
  ];
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
        intake: saved.intake || '',
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
      messages: {
        before: { on: false, mode: 'offset', offset: '24h', date: '', time: '', channel: 'email', text: '' },
        start: { on: false, offset: '0', channel: 'whatsapp', text: '' },
        end: { on: false, offset: '0', channel: 'email', text: '' },
      },
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
    if (!d.messages) return;
    ['before', 'start', 'end'].forEach(function (key) {
      var m = d.messages[key];
      var on = $('evc-msg-' + key + '-on');
      var channel = $('evc-msg-' + key + '-channel');
      var text = $('evc-msg-' + key + '-text');
      if (on) m.on = on.checked;
      if (channel) m.channel = channel.value;
      if (text) m.text = text.value;
    });
    var mode = document.querySelector('[name="evc-msg-before-mode"]:checked');
    var beforeWhen = document.querySelector('[name="evc-msg-before-offset"]:checked');
    var startWhen = document.querySelector('[name="evc-msg-start-offset"]:checked');
    var endWhen = document.querySelector('[name="evc-msg-end-offset"]:checked');
    if (mode) d.messages.before.mode = mode.value;
    if (beforeWhen) d.messages.before.offset = beforeWhen.value;
    if (startWhen) d.messages.start.offset = startWhen.value;
    if (endWhen) d.messages.end.offset = endWhen.value;
    var date = $('evc-msg-before-date');
    var time = $('evc-msg-before-time');
    if (date) d.messages.before.date = date.value;
    if (time) d.messages.before.time = time.value;
  }

  function stepperHtml() {
    return '<div class="ar-evc-stepper">' + EVENT_CREATE_STEPS.map(function (step, i) {
      var cls = i < evCreate.step ? ' done' : i === evCreate.step ? ' active' : '';
      return '<span class="' + cls + '"><i>' + (i < evCreate.step ? ico('check') : String(i + 1)) + '</i><b>' + esc(step.name) + '</b></span>';
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
    d.kind = EVENT_CATEGORY_KIND[d.category] || d.kind || 'webinar';
    return '<div class="ar-evc-sections">' +
      '<section class="ar-evc-block"><h3>Event</h3><p>The name, description and cover are what students see first.</p>' +
      '<div class="ar-evc-row ar-evc-two">' +
      fieldWrap('Event name', textInput('evc-name', d.name, 'Name your event'), true) +
      fieldWrap('Event category', selectHtml('evc-category', d.category, EVENT_CATEGORIES), true) + '</div>' +
      '<div class="ar-evc-formats">' + EVENT_FORMATS.map(function (f) {
        return '<label class="' + (d.format === f.id ? ' on' : '') + '"><input type="radio" name="evc-format" value="' + f.id + '"' + (d.format === f.id ? ' checked' : '') + '>' +
          ico(f.icon) + '<span>' + esc(f.name) + '</span></label>';
      }).join('') + '</div>' +
      '<div class="ar-evc-split">' +
      fieldWrap('Description', '<textarea id="evc-description" rows="5" placeholder="Why should a student attend?">' + esc(d.description) + '</textarea>', false) +
      '<div class="ar-evc-media"><span>Cover image</span><div class="ar-evc-cover k-' + d.kind + '">' +
      (d.coverImage ? '<img src="' + esc(d.coverImage) + '" alt="Event cover preview"><button type="button" data-evc-remove-cover aria-label="Remove image">×</button>' : ico(kindById(d.kind).icon)) +
      '</div><input type="file" id="evc-coverFile" accept="image/*" hidden>' +
      '<label class="ar-link" for="evc-coverFile">' + (d.coverImage ? 'Change image' : 'Upload image') + '</label></div></div></section>' +
      '<section class="ar-evc-block"><h3>Gallery</h3><p>Extra photos from past events. These are separate from the cover.</p>' +
      '<div class="ar-evc-gallery"><div class="ar-evc-gallery-grid">' + d.galleryImages.map(function (src, i) {
        return '<div><img src="' + esc(src) + '" alt="Gallery preview"><button type="button" data-evc-remove-gallery="' + i + '" aria-label="Remove gallery image">×</button></div>';
      }).join('') + '</div>' +
      '<input type="file" id="evc-galleryFiles" accept="image/*" multiple hidden>' +
      '<label class="ar-link" for="evc-galleryFiles">' + ico('add') + (d.galleryImages.length ? 'Add more' : 'Add images') + '</label></div></section></div>';
  }

  function createAudienceHtml() {
    var d = evDraft();
    var saved = savedFilterInfo(d.program);
    var prefOpts = [['', 'All students in the selected program']].concat(prefsFor(d.program).map(function (p) { return [p.id, p.name]; }));
    var filterOpts = [['', 'No saved filter']];
    if (saved) filterOpts.push(['saved', saved.label + (saved.disabled ? ' (pick matching program first)' : ''), saved.disabled]);
    var leads = audienceTargetCount(d);
    var scoreOpts = [['0', d.prefId ? 'Any match score' : 'Select preference to score leads'], ['80', '80% and above'], ['70', '70% and above'], ['60', '60% and above'], ['50', '50% and above']];
    return '<div class="ar-evc-sections"><section class="ar-evc-block"><h3>Audience</h3><p>Who should be invited to this event.</p>' +
      '<div class="ar-evc-row ar-evc-two">' +
      fieldWrap('Program', selectHtml('evc-program', d.program, PROGRAMS.map(function (p) { return [p.id, p.name]; })), true) +
      fieldWrap('Preference', selectHtml('evc-prefId', d.prefId, prefOpts), false) + '</div>' +
      '<div class="ar-evc-row ar-evc-two">' +
      fieldWrap('Match score', selectHtml('evc-matchScore', d.matchScore, scoreOpts), false) +
      fieldWrap('Saved filter', selectHtml('evc-savedFilter', d.savedFilter, filterOpts), false) + '</div>' +
      '<div class="ar-evc-target"><span>Students this reaches</span><strong>' + leads.toLocaleString() + '</strong><small>' +
      esc(d.prefId ? 'From this preference and match score.' : 'Everyone in the selected program.') +
      '</small></div></section></div>';
  }

  function offsetPills(key, offsets, current) {
    return '<div class="ar-evc-formats">' + offsets.map(function (o) {
      return '<label class="' + (current === o[0] ? ' on' : '') + '"><input type="radio" name="evc-msg-' + key + '-offset" value="' + o[0] + '"' +
        (current === o[0] ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
    }).join('') + '</div>';
  }

  function messageCard(key, title, note, body) {
    var m = evDraft().messages[key];
    return '<section class="ar-evc-block">' +
      toggleField('evc-msg-' + key + '-on', m.on, title, note) +
      (m.on ? body + '<div class="ar-evc-row ar-evc-msg-send">' +
        fieldWrap('Channel', selectHtml('evc-msg-' + key + '-channel', m.channel, CAMPAIGN_CHANNELS.map(function (c) { return [c.id, c.name]; }))) +
        fieldWrap('Message', '<textarea id="evc-msg-' + key + '-text" rows="3" placeholder="Hi {first}, a note about {event}.">' + esc(m.text) + '</textarea>') +
        '</div>' : '') + '</section>';
  }

  function createMessagesHtml() {
    var before = evDraft().messages.before;
    var beforeWhen = '<div class="ar-evc-formats">' +
      '<label class="' + (before.mode === 'datetime' ? ' on' : '') + '"><input type="radio" name="evc-msg-before-mode" value="datetime"' + (before.mode === 'datetime' ? ' checked' : '') + '>' + ico('calendar_today') + '<span>A date and time</span></label>' +
      '<label class="' + (before.mode !== 'datetime' ? ' on' : '') + '"><input type="radio" name="evc-msg-before-mode" value="offset"' + (before.mode !== 'datetime' ? ' checked' : '') + '>' + ico('schedule') + '<span>Before it starts</span></label></div>' +
      (before.mode === 'datetime'
        ? '<div class="ar-evc-row ar-evc-two">' + fieldWrap('Date', '<input type="date" id="evc-msg-before-date" value="' + esc(before.date) + '">') + fieldWrap('Time', '<input type="time" id="evc-msg-before-time" value="' + esc(before.time) + '">') + '</div>'
        : offsetPills('before', [['30m', '30 minutes before'], ['1h', '1 hour before'], ['24h', '24 hours before']], before.offset));
    return '<div class="ar-evc-sections">' +
      messageCard('before', 'Before the event starts', 'Choose an exact time, or send it 30 minutes, 1 hour or 24 hours before.', beforeWhen) +
      messageCard('start', 'After the event starts', 'Send once the event is underway.', offsetPills('start', [['0', 'When it starts'], ['30m', '30 minutes after']], evDraft().messages.start.offset)) +
      messageCard('end', 'After the event ends', 'Send once the event is over.', offsetPills('end', [['0', 'When it ends'], ['30m', '30 minutes after'], ['24h', '24 hours after']], evDraft().messages.end.offset)) +
      '</div>';
  }

  function createVenueHtml() {
    var d = evDraft();
    var online = d.format !== 'offline';
    return '<div class="ar-evc-sections">' +
      '<section class="ar-evc-block"><h3>Venue</h3><p>' + (online ? 'Meeting details go out to people who register.' : 'Where people should come.') + '</p>' +
      (online ? toggleField('evc-hasMeetingLink', d.hasMeetingLink, 'Do you have the meeting link?', 'Turn this on if attendees should see the meeting link after registration.') : '') + '</section>' +
      '<section class="ar-evc-block"><h3>When it starts</h3>' +
      '<div class="ar-evc-time-row">' + fieldWrap('Start date', '<input type="date" id="evc-startDate" value="' + esc(d.startDate) + '">', false) +
      fieldWrap('Start time', '<input type="time" id="evc-startTime" value="' + esc(d.startTime) + '">', true) +
      toggleField('evc-time24', d.time24, '24 hour format', '') +
      fieldWrap('Timezone', selectHtml('evc-timezone', d.timezone, ['IST (GMT +05:30)', 'GMT', 'EST (GMT -05:00)', 'PST (GMT -08:00)']), true) + '</div></section>' +
      '<section class="ar-evc-block"><h3>When it ends</h3><div class="ar-evc-radio-row"><label><input type="radio" name="evc-end" checked> Event duration</label><label><input type="radio" name="evc-end"> Event end time</label></div>' +
      '<div class="ar-evc-row">' + fieldWrap('Days', selectHtml('evc-days', d.days, ['00', '01', '02'])) +
      fieldWrap('Hours', selectHtml('evc-hours', d.hours, ['00', '01', '02', '03', '04'])) +
      fieldWrap('Minutes', selectHtml('evc-minutes', d.minutes, ['00', '15', '30', '45'])) + '</div></section></div>';
  }

  function createRegistrationHtml() {
    var d = evDraft();
    var option = function (id, title, body) {
      return '<label class="ar-evc-reg ' + (d.registration === id ? 'on' : '') + '" data-evc-registration="' + id + '"><input type="radio" name="evc-registration" value="' + id + '"' + (d.registration === id ? ' checked' : '') + '>' +
        '<span><b>' + title + '</b>' + (body || '') + '</span></label>';
    };
    return '<div class="ar-evc-sections"><section class="ar-evc-block"><h3>Registration</h3>' +
      option('link', 'Add your registration form link', d.registration === 'link' ? fieldWrap('Registration form link', textInput('evc-formLink', d.formLink, 'https://'), true) : '') +
      option('new', 'Create a new form', d.formBuilt ? '<small>A form already exists. You can edit it.</small><button type="button" class="btn btn-secondary btn-sm" data-ev-form-builder>' + ico('edit') + 'Edit</button>' : '<small>Click Next step to open form builder.</small>') +
      option('template', 'Choose a template', d.registration === 'template' ? '<div class="ar-evc-template">Default Registration Template</div><button type="button" class="btn btn-primary btn-sm" data-ev-apply-template>Apply template to continue</button>' : '') +
      '<h3>Set registration deadline</h3><p class="ar-evc-note">Complete one registration method above to finalize and validate this deadline.</p>' +
      '<div class="ar-evc-time-row">' + fieldWrap('End date', '<input type="date">', false) +
      fieldWrap('End time', '<input type="time">', true) +
      toggleField('evc-time24', d.time24, '24 hour format', '') +
      fieldWrap('Timezone', selectHtml('evc-timezone', d.timezone, ['IST (GMT +05:30)', 'GMT']), true) + '</div>' +
      '<label class="ar-check"><input type="checkbox" id="evc-keepOpen"' + (d.keepOpen ? ' checked' : '') + '> Keep registrations open until event starts</label>' +
      '</section></div>';
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
      '<small>Audience: ' + esc(pref ? pref.name : 'All ' + program.name + ' students') + (d.savedFilter ? ' · saved filter' : '') + '</small>' +
      '<small>Messages: ' + esc((d.messages ? ['before', 'start', 'end'].filter(function (k) { return d.messages[k].on; }) : []).join(', ') || 'none scheduled') + '</small></div></section>';
  }

  function renderEventCreate() {
    var builders = { basics: createBasicsHtml, audience: createAudienceHtml, venue: createVenueHtml, messages: createMessagesHtml, registration: createRegistrationHtml, review: createReviewHtml };
    var html = builders[EVENT_CREATE_STEPS[evCreate.step].id]();
    var body = $('events-create-page') && !$('events-create-page').hidden ? $('ev-create-body') : $('drawer-body');
    var foot = $('events-create-page') && !$('events-create-page').hidden ? $('ev-create-foot') : $('drawer-foot');
    body.innerHTML = stepperHtml() + html;
    var sub = $('ev-create-sub');
    if (sub) sub.textContent = EVENT_CREATE_STEPS[evCreate.step].name;
    foot.innerHTML = '<button type="button" class="btn btn-ghost btn-sm" data-ev-create-back>Back</button>' +
      '<button type="button" class="btn btn-primary btn-sm btn-icon" data-ev-create-next>Next step' + ico('arrow_forward') + '</button>';
    var back = document.querySelector('[data-ev-create-back]');
    if (back) back.textContent = evCreate.step ? 'Previous step' : 'Cancel';
    var next = document.querySelector('[data-ev-create-next]');
    if (next) next.hidden = evCreate.step === EVENT_CREATE_STEPS.length - 1;
  }

  function eventCreateNext() {
    readEventCreate();
    var id = EVENT_CREATE_STEPS[evCreate.step].id;
    if (id === 'basics' && !evCreate.draft.name.trim()) {
      $('evc-name').focus();
      toast('Add an event name.');
      return;
    }
    if (id === 'registration' && evCreate.draft.registration === 'new' && !evCreate.draft.formBuilt) {
      evCreate.draft.formBuilt = true;
      renderEventCreate();
      toast('Form builder added a default form.');
      return;
    }
    if (evCreate.step < EVENT_CREATE_STEPS.length - 1) evCreate.step += 1;
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
      category: d.category, savedFilter: d.savedFilter, displayFormat: format.name, messages: d.messages,
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

  /* ——— Settings: roles, access and users ——— */

  var ACCESS_AREAS = [
    { id: 'dashboard', name: 'Dashboard', hint: 'See students, funnel and match scores' },
    { id: 'programs', name: 'Programs & preferences', hint: 'Create and edit preferences' },
    { id: 'saved', name: 'Saved students', hint: 'Open the saved student list' },
    { id: 'events', name: 'Events', hint: 'View events and registrations' },
    { id: 'events_manage', name: 'Create events', hint: 'Create, draft and publish events' },
    { id: 'chats', name: 'Chats', hint: 'Message students in-platform' },
    { id: 'campaigns', name: 'Campaigns', hint: 'Send email and WhatsApp campaigns' },
    { id: 'settings', name: 'Settings', hint: 'Manage roles and users' },
  ];

  var ROLES_KEY = 'admitright_roles_v2';
  var USERS_KEY = 'admitright_users_v2';
  var SETTINGS_ROLES = [];
  var SETTINGS_USERS = [];

  function defaultRoles() {
    return [
      { id: 'admin', name: 'Admin', desc: 'Full access to AdmitRight', locked: true, access: ACCESS_AREAS.map(function (a) { return a.id; }) },
      { id: 'manager', name: 'Admissions manager', desc: 'Run programs, events and campaigns', access: ['dashboard', 'programs', 'saved', 'events', 'events_manage', 'chats', 'campaigns'] },
      { id: 'counselor', name: 'Counselor', desc: 'Work with students, chats and events', access: ['dashboard', 'saved', 'events', 'chats', 'campaigns'] },
      { id: 'regional', name: 'Regional counselor', desc: 'Follow up with students in their region', access: ['dashboard', 'saved', 'chats'] },
      { id: 'marketing', name: 'Marketing lead', desc: 'Plan campaigns and promote events', access: ['dashboard', 'events', 'events_manage', 'campaigns'] },
      { id: 'events', name: 'Event coordinator', desc: 'Create events and track registrations', access: ['dashboard', 'events', 'events_manage'] },
      { id: 'program', name: 'Program head', desc: 'Own preferences for their programs', access: ['dashboard', 'programs', 'saved'] },
      { id: 'viewer', name: 'Viewer', desc: 'Read-only view of students and events', access: ['dashboard', 'saved', 'events'] },
    ];
  }

  /** Seed teammates: most are active with a profile; a few still have a pending invite. */
  function defaultUsers() {
    var at = function (days) { return addDays(TODAY, -days).toISOString(); };
    var user = function (id, name, email, roleId, title, days) {
      return { id: id, name: name, email: email, roleId: roleId, title: title, status: 'active', lastActive: at(days) };
    };
    var invite = function (id, name, email, roleId, title, days) {
      return { id: id, name: name, email: email, roleId: roleId, title: title, status: 'invited', invitedOn: at(days) };
    };
    return [
      user('u-1', 'Campus Admin', 'admin@bml.edu.in', 'admin', 'IT administrator', 0),
      user('u-2', 'Aman Verma', 'aman.verma@bml.edu.in', 'manager', 'Head of admissions', 0),
      user('u-3', 'Riya Sharma', 'riya.sharma@bml.edu.in', 'counselor', 'Senior counselor', 1),
      user('u-4', 'Karan Mehta', 'karan.mehta@bml.edu.in', 'counselor', 'Admissions counselor', 2),
      user('u-5', 'Neha Kapoor', 'neha.kapoor@bml.edu.in', 'regional', 'North India counselor', 0),
      user('u-6', 'Arjun Nair', 'arjun.nair@bml.edu.in', 'regional', 'South India counselor', 4),
      user('u-7', 'Pooja Iyer', 'pooja.iyer@bml.edu.in', 'marketing', 'Marketing manager', 1),
      user('u-8', 'Vikram Singh', 'vikram.singh@bml.edu.in', 'events', 'Events and outreach lead', 6),
      user('u-9', 'Dr. Meera Joshi', 'meera.joshi@bml.edu.in', 'program', 'Dean, School of Engineering', 3),
      user('u-10', 'Sahil Gupta', 'sahil.gupta@bml.edu.in', 'viewer', 'Finance reviewer', 12),
      invite('u-11', 'Ananya Rao', 'ananya.rao@bml.edu.in', 'counselor', 'Admissions counselor', 1),
      invite('u-12', 'Rohit Bansal', 'rohit.bansal@bml.edu.in', 'marketing', 'Digital marketing executive', 3),
      invite('u-13', 'Ishita Malhotra', 'ishita.malhotra@bml.edu.in', 'events', 'Events associate', 5),
    ];
  }

  function loadSettingsStore(key, fallback) {
    try {
      var saved = JSON.parse(localStorage.getItem(key) || 'null');
      return saved && saved.length ? saved : fallback();
    } catch (err) { return fallback(); }
  }

  function saveSettingsStore() {
    try {
      localStorage.setItem(ROLES_KEY, JSON.stringify(SETTINGS_ROLES));
      localStorage.setItem(USERS_KEY, JSON.stringify(SETTINGS_USERS));
    } catch (err) { /* storage full or blocked */ }
  }

  SETTINGS_ROLES = loadSettingsStore(ROLES_KEY, defaultRoles);
  SETTINGS_USERS = loadSettingsStore(USERS_KEY, defaultUsers);

  function roleById(id) {
    return SETTINGS_ROLES.filter(function (r) { return r.id === id; })[0];
  }

  function userById(id) {
    return SETTINGS_USERS.filter(function (u) { return u.id === id; })[0];
  }

  /** Users always get exactly their role's access; change the role to change what they can do. */
  function accessFor(user) {
    var role = user && roleById(user.roleId);
    return role ? role.access.slice() : [];
  }

  function accessNames(ids) {
    return ACCESS_AREAS.filter(function (a) { return ids.indexOf(a.id) >= 0; }).map(function (a) { return a.name; });
  }

  function storeId(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function renderSettings() {
    var users = settingsPage.tab === 'users';
    $('st-add-label').textContent = users ? 'Invite user' : 'Add role';
    document.querySelectorAll('[data-st-tab]').forEach(function (b) {
      var on = b.getAttribute('data-st-tab') === settingsPage.tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    $('st-list-body').innerHTML = users ? settingsUsersHtml() : settingsRolesHtml();
  }

  function usersOnRole(id) {
    return SETTINGS_USERS.filter(function (u) { return u.roleId === id; }).length;
  }

  function stInitials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }

  /** Up to three chips; the rest fold into "+N more" with the full list on hover. */
  function accessChipsHtml(ids, limit) {
    var names = accessNames(ids);
    var cap = limit || names.length;
    if (!names.length) return '<div class="ar-st-chips"><span class="ar-st-muted">No access yet</span></div>';
    return '<div class="ar-st-chips">' + names.slice(0, cap).map(function (n) {
      return '<span class="ar-st-chip">' + esc(n) + '</span>';
    }).join('') + (names.length > cap ? '<span class="ar-st-chip more" title="' + esc(names.slice(cap).join(', ')) + '">+' + (names.length - cap) + ' more</span>' : '') + '</div>';
  }

  function settingsRolesHtml() {
    return '<div class="panel ar-st-panel"><table class="ar-st-table"><thead><tr><th>Role</th><th>Access</th><th class="num">Users</th><th class="act"></th></tr></thead><tbody>' +
      SETTINGS_ROLES.map(function (r) {
        return '<tr data-st-edit-role="' + r.id + '">' +
          '<td><div class="ar-st-who"><span class="ar-st-ico">' + ico(r.locked ? 'shield_person' : 'badge') + '</span>' +
          '<span><strong>' + esc(r.name) + (r.locked ? '<em class="ar-st-tag">Default</em>' : '') + '</strong><small>' + esc(r.desc || 'Custom role') + '</small></span></div></td>' +
          '<td>' + accessChipsHtml(r.access, 3) + '</td>' +
          '<td class="num">' + usersOnRole(r.id) + '</td>' +
          '<td class="act"><button type="button" class="btn btn-secondary btn-sm" data-st-edit-role="' + r.id + '">Edit access</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var AVATAR_TONES = ['#782bff', '#5b5bd6', '#3b7fc4', '#2b93ad', '#24978c', '#2f8f68', '#b4630b', '#c2416c'];

  function stAvatar(u) {
    return '<span class="avatar ar-st-avatar" style="--tone:' + AVATAR_TONES[hashOf(u.email || u.name) % AVATAR_TONES.length] + '">' + esc(stInitials(u.name)) + '</span>';
  }

  /** Relative to the demo's "today" so seeded activity reads naturally. */
  function stAgo(iso) {
    if (!iso) return '';
    var days = Math.round((dayStart(TODAY) - dayStart(new Date(iso))) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return days + ' days ago';
    return fmtShort(new Date(iso), true);
  }

  function settingsUsersHtml() {
    if (!SETTINGS_USERS.length) {
      return '<div class="panel ar-st-panel ar-st-empty">' + ico('group') + '<h3>No users yet</h3><p>Invite a teammate and give them a role.</p></div>';
    }
    var invited = SETTINGS_USERS.filter(function (u) { return u.status === 'invited'; }).length;
    return '<div class="panel ar-st-panel">' +
      '<div class="ar-st-panel-head"><span>' + (SETTINGS_USERS.length - invited) + ' active</span><span>' + invited + ' pending invite' + (invited === 1 ? '' : 's') + '</span></div>' +
      '<table class="ar-st-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last active</th><th class="act"></th></tr></thead><tbody>' +
      SETTINGS_USERS.map(function (u) {
        var role = roleById(u.roleId);
        var pending = u.status === 'invited';
        return '<tr data-st-edit-user="' + u.id + '">' +
          '<td><div class="ar-st-who">' + stAvatar(u) + '<span><strong>' + esc(u.name) + '</strong><small>' + esc(u.title || 'Team member') + '</small></span></div></td>' +
          '<td class="ar-st-muted">' + esc(u.email) + '</td>' +
          '<td><span class="ar-st-chip role">' + esc(role ? role.name : 'No role') + '</span></td>' +
          '<td><span class="ar-st-status' + (pending ? ' invited' : '') + '">' + (pending ? 'Invited' : 'Active') + '</span></td>' +
          '<td class="ar-st-muted">' + (pending ? 'Sent ' + stAgo(u.invitedOn).toLowerCase() : stAgo(u.lastActive)) + '</td>' +
          '<td class="act">' + (pending ? '<button type="button" class="btn btn-ghost btn-sm" data-st-resend="' + u.id + '">Resend</button>' : '') +
          '<button type="button" class="btn btn-secondary btn-sm" data-st-edit-user="' + u.id + '">Edit</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function accessChecks(selected, locked) {
    return '<div class="ar-st-access">' + ACCESS_AREAS.map(function (a) {
      var on = selected.indexOf(a.id) >= 0;
      return '<label class="ar-st-access-row' + (on ? ' on' : '') + (locked ? ' locked' : '') + '">' +
        '<span><b>' + esc(a.name) + '</b><small>' + esc(a.hint) + '</small></span>' +
        '<input type="checkbox" class="ar-switch" role="switch" data-st-access="' + a.id + '"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') + '></label>';
    }).join('') + '</div>';
  }

  function readAccessChecks() {
    return ACCESS_AREAS.filter(function (a) {
      var el = document.querySelector('[data-st-access="' + a.id + '"]');
      return el && el.checked;
    }).map(function (a) { return a.id; });
  }

  var roleModalId = null;

  function openRoleModal(id) {
    var existing = id ? roleById(id) : null;
    var locked = !!(existing && existing.locked);
    roleModalId = existing ? existing.id : null;
    openDrawer(existing ? 'Edit role' : 'Add role',
      '<div class="ar-st-user-form">' +
      '<label class="ar-evc-field"><span>Role name<em>*</em></span><input type="text" id="st-name" value="' + esc(existing ? existing.name : '') +
      '" placeholder="e.g. Regional counselor"' + (locked ? ' disabled' : '') + '></label>' +
      '<label class="ar-evc-field"><span>Description</span><input type="text" id="st-desc" value="' + esc(existing ? existing.desc || '' : '') + '" placeholder="What this role is for"></label>' +
      '<div class="ar-st-access-head"><span>Access</span><small>' + (locked ? 'The default admin role always has full access.' : 'Tick the pages this role can use.') + '</small></div>' +
      accessChecks(existing ? existing.access : [], locked) + '</div>',
      (existing && !locked ? '<button type="button" class="btn btn-ghost btn-sm ar-st-user-delete" data-st-delete>Delete role</button>' : '') +
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-st-save>' + (existing ? 'Save changes' : 'Add role') + '</button>', true);
    $('drawer').classList.add('ar-st-user-modal', 'ar-st-role-modal');
    (locked ? $('st-desc') : $('st-name')).focus();
  }

  var userModalId = null;

  function roleAccessHtml(roleId) {
    var role = roleById(roleId);
    return accessChipsHtml(role ? role.access : []);
  }

  function openUserModal(id) {
    var existing = id ? userById(id) : null;
    userModalId = existing ? existing.id : null;
    var roleId = existing ? existing.roleId : (SETTINGS_ROLES[0] && SETTINGS_ROLES[0].id);
    openDrawer(existing ? 'Edit user' : 'Invite user',
      '<div class="ar-st-user-form">' +
      '<label class="ar-evc-field"><span>Name<em>*</em></span><input type="text" id="st-user-name" value="' + esc(existing ? existing.name : '') + '" placeholder="Full name"></label>' +
      '<label class="ar-evc-field"><span>Email<em>*</em></span><input type="email" id="st-user-email" value="' + esc(existing ? existing.email : '') + '" placeholder="name@university.edu"></label>' +
      '<label class="ar-evc-field"><span>Job title</span><input type="text" id="st-user-title" value="' + esc(existing ? existing.title || '' : '') + '" placeholder="e.g. Admissions counselor"></label>' +
      '<label class="ar-evc-field"><span>Role<em>*</em></span><select id="st-user-role">' + SETTINGS_ROLES.map(function (r) {
        return '<option value="' + r.id + '"' + (r.id === roleId ? ' selected' : '') + '>' + esc(r.name) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="ar-st-user-access"><span>What this role can access</span><div id="st-user-access">' + roleAccessHtml(roleId) + '</div>' +
      '<p class="ar-cm-note">' + ico('info') + 'Access comes from the role. To change it, edit the role.</p></div></div>',
      (existing ? '<button type="button" class="btn btn-ghost btn-sm ar-st-user-delete" data-st-user-delete>Remove user</button>' : '') +
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-st-user-save>' + (existing ? 'Save changes' : 'Send invite') + '</button>', true);
    $('drawer').classList.add('ar-st-user-modal');
    $('st-user-name').focus();
  }

  function saveUserModal() {
    var name = $('st-user-name').value.trim();
    var email = $('st-user-email').value.trim();
    var roleId = $('st-user-role').value;
    var title = $('st-user-title').value.trim();
    if (!name) {
      $('st-user-name').focus();
      toast('Add a name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('st-user-email').focus();
      toast('Enter a valid email address.');
      return;
    }
    var taken = SETTINGS_USERS.some(function (u) { return u.id !== userModalId && u.email.toLowerCase() === email.toLowerCase(); });
    if (taken) {
      $('st-user-email').focus();
      toast('Someone already uses this email.');
      return;
    }
    var existing = userById(userModalId);
    if (existing) {
      existing.name = name;
      existing.email = email;
      existing.roleId = roleId;
      existing.title = title;
    } else {
      SETTINGS_USERS.unshift({ id: storeId('u'), name: name, email: email, roleId: roleId, title: title, status: 'invited', invitedOn: TODAY.toISOString() });
    }
    saveSettingsStore();
    closeDrawer();
    toast(existing ? 'User updated.' : 'Invite sent to ' + email + '.');
    renderSettings();
  }

  function deleteUserModal() {
    var existing = userById(userModalId);
    if (!existing) return;
    SETTINGS_USERS = SETTINGS_USERS.filter(function (u) { return u.id !== existing.id; });
    saveSettingsStore();
    closeDrawer();
    toast('User removed.');
    renderSettings();
  }

  function saveRoleModal() {
    var name = $('st-name').value.trim();
    if (!name) {
      $('st-name').focus();
      toast('Add a role name.');
      return;
    }
    var access = readAccessChecks();
    if (!access.length) {
      toast('Pick at least one access.');
      return;
    }
    var desc = $('st-desc').value.trim();
    var role = roleById(roleModalId);
    if (role) {
      if (!role.locked) role.name = name;
      role.desc = desc;
      if (!role.locked) role.access = access;
    } else {
      SETTINGS_ROLES.push({ id: storeId('role'), name: name, desc: desc, access: access });
    }
    saveSettingsStore();
    closeDrawer();
    toast(role ? 'Role updated.' : 'Role added.');
    renderSettings();
  }

  function deleteRoleModal() {
    var role = roleById(roleModalId);
    if (!role || role.locked) return;
    if (usersOnRole(role.id)) {
      toast('Move users off this role before deleting it.');
      return;
    }
    SETTINGS_ROLES = SETTINGS_ROLES.filter(function (r) { return r.id !== role.id; });
    saveSettingsStore();
    closeDrawer();
    toast('Role removed.');
    renderSettings();
  }

  /* ——— Campaigns: dashboard, create flow and detail ——— */

  var CG_KEY = 'admitright_campaign_list_v1';
  var CG_STEPS = ['Campaign details', 'Audience', 'Message', 'Review & launch'];
  var CG_RATES = {
    email: { delivered: 0.9, opened: 0.34 },
    whatsapp: { delivered: 0.95, opened: 0.62 },
    sms: { delivered: 0.96, opened: 0.48 },
  };
  var cgPage = { tab: 'launched', page: 'list', id: null };
  var cgForm = null; // { step, id, draft }
  var cgCache = {};
  var CGF = { q: '', channel: 'all', program: 'all', sort: 'new' };

  function cgPath() {
    if (cgPage.page === 'form') return cgPage.id ? 'campaigns/' + encodeURIComponent(cgPage.id) + '/edit' : 'campaigns/create';
    if (cgPage.page === 'detail' && cgPage.id) return 'campaigns/' + encodeURIComponent(cgPage.id);
    return cgListPath(cgPage.tab);
  }

  function cgListPath(tab) {
    if (tab === 'drafts') return 'campaigns/drafts';
    if (tab === 'individual') return 'campaigns/individual';
    return 'campaigns';
  }

  function templateById(id) {
    return CAMPAIGN_TEMPLATES.filter(function (t) { return t.id === id; })[0] || CAMPAIGN_TEMPLATES[0];
  }

  function seedCampaignList() {
    var day = 86400000;
    var base = TODAY.getTime() + 11 * 3600000;
    var portfolio = 'Hi {first}, our faculty is running free portfolio reviews for {program} applicants at {university}. Reply to book a 15-minute slot.';
    var rows = [
      ['cg-fall-apps', 'launched', 'Applications open for Fall 2027', 'Nudge matched B.Tech CSE students to start their application.', 'email', 'reminder', 'btech-cse', 0, '80', '1', '', 2],
      ['cg-scholar-ai', 'launched', 'Merit scholarship for AI & ML', 'Tell high-scoring AI aspirants about merit scholarships.', 'whatsapp', 'scholarship', 'btech-ai', 0, '70', '', '2027', 5],
      ['cg-visit-bba', 'launched', 'Campus visit weekend', 'Invite BBA students who opened the program page to visit campus.', 'email', 'visit', 'bba', -1, '0', '1', '', 9],
      ['cg-deadline-ds', 'launched', 'Final call: Data Science deadline', 'Remind students who started an application but haven’t submitted.', 'sms', 'deadline', 'bsc-ds', -1, '0', '2', '', 14],
      ['cg-bdes-portfolio', 'launched', 'Portfolio review for B.Des', 'Offer portfolio feedback to creative applicants.', 'whatsapp', 'custom', 'bdes', 0, '60', '', '', 21],
      ['cg-bcom-toppers', 'launched', 'Commerce toppers early admit', 'Early admit invite for strong commerce profiles.', 'email', 'scholarship', 'bcom', 0, '80', '', '2027', 33],
      ['cg-may-jee', 'launched', 'JEE results are out', 'Share what a strong JEE score means for B.Tech CSE.', 'email', 'reminder', 'btech-cse', 0, '70', '', '', 168],
      ['cg-may-open', 'launched', 'Applications open for 2027', 'Tell every program that applications are open.', 'whatsapp', 'reminder', 'bba', -1, '0', '', '2027', 154],
      ['cg-may-visit', 'launched', 'May campus walk-in', 'Invite nearby students to a weekday campus visit.', 'sms', 'visit', 'bdes', 0, '0', '', '', 141],
      ['cg-jun-scholar', 'launched', 'June scholarship window', 'Merit aid for high-match AI & ML applicants.', 'email', 'scholarship', 'btech-ai', 0, '70', '', '', 132],
      ['cg-jun-deadline', 'launched', 'Form fee reminder', 'Nudge students who opened the application but have not paid.', 'whatsapp', 'deadline', 'bsc-ds', -1, '0', '2', '', 123],
      ['cg-jun-bcom', 'launched', 'Commerce early decision', 'Early decision note for B.Com applicants.', 'sms', 'scholarship', 'bcom', 0, '60', '', '2027', 110],
      ['cg-jul-coding', 'launched', 'Coding challenge invite', 'Invite matched CSE students to a weekend challenge.', 'email', 'visit', 'btech-cse', 0, '80', '1', '', 105],
      ['cg-jul-parents', 'launched', 'Parent open house', 'WhatsApp parents about the July open house.', 'whatsapp', 'visit', 'bba', 0, '0', '', '', 96],
      ['cg-jul-portfolio', 'launched', 'Portfolio checklist', 'Send the B.Des portfolio checklist before reviews.', 'email', 'custom', 'bdes', 0, '50', '', '', 84],
      ['cg-aug-ai', 'launched', 'AI lab tour', 'Offer a lab tour to students who opened the AI page.', 'whatsapp', 'visit', 'btech-ai', 0, '60', '1', '', 73],
      ['cg-aug-fee', 'launched', 'Fee deadline, 15 August', 'Last call for students who started an application.', 'sms', 'deadline', 'btech-cse', -1, '0', '2', '', 61],
      ['cg-aug-hostel', 'launched', 'Hostel and scholarship FAQ', 'Answer the questions August applicants ask most.', 'email', 'scholarship', 'bsc-ds', 0, '70', '', '2027', 49],
      ['cg-sep-shortlist', 'launched', 'September shortlist', 'Tell shortlisted students what happens next.', 'email', 'reminder', 'btech-cse', 0, '80', '3', '', 41],
      ['cg-sep-wa', 'launched', 'WhatsApp application nudge', 'A short nudge for AI applicants still on the fence.', 'whatsapp', 'reminder', 'btech-ai', 0, '70', '1', '2027', 28],
      ['cg-sep-bba', 'launched', 'BBA interview slots', 'Share interview slots with BBA applicants.', 'sms', 'deadline', 'bba', 0, '60', '2', '', 19],
      ['cg-oct-reopen', 'launched', 'October round reopens', 'Tell matched students the October round is open.', 'email', 'reminder', 'bcom', 0, '70', '', '2027', 13],
      ['cg-oct-visit', 'launched', 'Weekend visit, 10 October', 'Invite students who have not visited campus yet.', 'whatsapp', 'visit', 'bdes', -1, '0', '1', '', 6],
      ['cg-draft-open-house', 'draft', 'Open house follow-up', 'Thank attendees and share next steps.', 'email', 'visit', 'btech-cse', 0, '70', '', '', 1],
      ['cg-draft-ai-wa', 'draft', 'AI & ML application nudge', '', 'whatsapp', 'reminder', 'btech-ai', -1, '0', '1', '2028', 4],
    ];
    return rows.map(function (r) {
      var tpl = templateById(r[5]);
      var pref = r[7] >= 0 ? prefsFor(r[6])[r[7]] : null;
      var at = base - r[11] * day;
      return {
        id: r[0], status: r[1], name: r[2], description: r[3], channel: r[4], template: r[5],
        subject: r[4] === 'email' ? tpl.subject : '', text: r[5] === 'custom' ? portfolio : tpl.text,
        audience: { program: r[6], prefId: pref ? pref.id : '', minScore: r[8], stage: r[9], intake: r[10], savedFilter: '' },
        created: at, updated: at, sentAt: r[1] === 'launched' ? at : null, recipients: null,
      };
    });
  }

  var CAMPAIGN_LIST = null;
  try { CAMPAIGN_LIST = JSON.parse(localStorage.getItem(CG_KEY) || 'null'); } catch (err) { CAMPAIGN_LIST = null; }
  if (!Array.isArray(CAMPAIGN_LIST)) CAMPAIGN_LIST = seedCampaignList();

  function saveCampaignList() {
    try { localStorage.setItem(CG_KEY, JSON.stringify(CAMPAIGN_LIST)); } catch (err) { /* storage full or blocked */ }
  }

  (function addSeededCampaigns() {
    var have = {};
    CAMPAIGN_LIST.forEach(function (c) { have[c.id] = true; });
    var missing = seedCampaignList().filter(function (c) { return !have[c.id]; });
    if (!missing.length) return;
    CAMPAIGN_LIST = missing.concat(CAMPAIGN_LIST);
    saveCampaignList();
  })();

  function campaignById(id) {
    return CAMPAIGN_LIST.filter(function (c) { return c.id === id; })[0] || null;
  }

  function newCampaignDraft(templateId) {
    var tpl = templateById(templateId || 'reminder');
    return {
      id: null, status: 'draft', name: '', description: '', channel: 'email', template: tpl.id, subject: tpl.subject, text: tpl.text,
      audience: { program: state.program !== 'all' ? state.program : PROGRAMS[0].id, prefId: '', minScore: '0', stage: '', intake: '', savedFilter: '' },
    };
  }

  function cgPrefOf(a) {
    return a.program !== 'all' && a.prefId ? findPref(a.program, a.prefId) : null;
  }

  /** Students the audience filters pick, best match first. Cached per render because scoring every student is slow. */
  function cgAudience(a) {
    var key = JSON.stringify(a) + ':' + STUDENTS.length;
    if (cgCache[key]) return cgCache[key];
    var pref = cgPrefOf(a);
    var min = Number(a.minScore) || 0;
    var stage = a.stage === '' || a.stage == null ? -1 : Number(a.stage);
    var list = [];
    STUDENTS.forEach(function (s) {
      if (a.program !== 'all' && s.program !== a.program) return;
      if (stage >= 0 && s.stage < stage) return;
      if (a.intake && intakeYear(s) !== a.intake) return;
      var score = pref ? scoreAgainst(s, pref).score : null;
      if (pref && min && score < min) return;
      list.push({ s: s, score: score });
    });
    list.sort(byScore);
    cgCache[key] = list;
    return list;
  }

  function cgRecipients(c) {
    return c.status === 'launched' && c.recipients != null ? c.recipients : cgAudience(c.audience).length;
  }

  function cgPct(a, b) {
    return b ? Math.round(a / b * 100) : 0;
  }

  function cgMetrics(c) {
    var sent = cgRecipients(c);
    if (c.status !== 'launched') return { sent: sent, delivered: 0, opened: 0, clicked: 0, rates: null };
    var h = hashOf(c.id);
    var base = CG_RATES[c.channel] || CG_RATES.email;
    var rates = {
      delivered: base.delivered + (h % 4) / 100,
      opened: base.opened + ((h >>> 3) % 20) / 100,
      clicked: 0.12 + ((h >>> 6) % 16) / 100,
    };
    var delivered = Math.round(sent * rates.delivered);
    var opened = Math.round(delivered * rates.opened);
    return { sent: sent, delivered: delivered, opened: opened, clicked: Math.round(opened * rates.clicked), rates: rates };
  }

  function cgTargetChips(a) {
    var chips = [a.program === 'all' ? 'All programs' : programById(a.program).name];
    var pref = cgPrefOf(a);
    if (pref) chips.push(pref.name);
    if (pref && Number(a.minScore)) chips.push(a.minScore + '%+ match');
    if (a.stage !== '' && a.stage != null) chips.push(STAGES[Number(a.stage)].name + ' or later');
    if (a.intake) chips.push(a.intake + ' intake');
    return chips;
  }

  function cgChipsHtml(a) {
    return cgTargetChips(a).map(function (t) { return '<span class="ar-crit">' + esc(t) + '</span>'; }).join('');
  }

  function cgSample(c) {
    var first = cgAudience(c.audience)[0];
    return first ? first.s : STUDENTS[0];
  }

  function cgPreviewHtml(c, s) {
    var text = fillTemplate(c.text || '', s).trim();
    if (c.channel === 'email') {
      return '<div class="ar-cg-mail"><div class="ar-cg-mail-head"><span>' + ico('mail') + '</span><div><b>' +
        esc(fillTemplate(c.subject || '', s).trim() || '(No subject)') + '</b><small>BML Munjal University · via AdmitRight</small></div></div>' +
        '<p>' + esc(text || 'Your message will appear here.') + '</p></div>';
    }
    return '<div class="ar-cg-phone ch-' + c.channel + '"><div class="ar-cg-phone-head">' + ico(channelById(c.channel).icon) +
      '<b>BML Munjal University</b><small>' + esc(channelById(c.channel).name) + '</small></div>' +
      '<div class="ar-cg-bubble">' + esc(text || 'Your message will appear here.') + '</div></div>';
  }

  function showCampaignsPage(mode) {
    $('cg-list-head').hidden = mode !== 'list';
    $('cg-list-content').hidden = mode !== 'list';
    $('cg-form-page').hidden = mode !== 'form';
    $('cg-detail-page').hidden = mode !== 'detail';
  }

  function renderCampaigns() {
    cgCache = {};
    if (cgPage.page === 'form') renderCampaignForm();
    else if (cgPage.page === 'detail') renderCampaignDetail();
    else {
      showCampaignsPage('list');
      renderCampaignInsights();
      renderCampaignList();
      renderCampaignSide();
    }
  }

  var cgCharts = {};

  /** Last six months, oldest first, so the charts read left to right like the dashboard. */
  function cgMonthSeries() {
    var end = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    var months = [];
    var index = {};
    for (var i = 5; i >= 0; i--) {
      var m = new Date(end.getFullYear(), end.getMonth() - i, 1);
      index[m.getFullYear() + '-' + m.getMonth()] = months.length;
      months.push(m);
    }
    var campaigns = months.map(function () { return 0; });
    var reached = months.map(function () { return 0; });
    var slot = function (at) {
      var d = new Date(at);
      return index[d.getFullYear() + '-' + d.getMonth()];
    };
    CAMPAIGN_LIST.forEach(function (c) {
      if (c.status !== 'launched' || !c.sentAt) return;
      var i = slot(c.sentAt);
      if (i == null) return;
      campaigns[i] += 1;
      reached[i] += cgMetrics(c).sent;
    });
    individualRows().forEach(function (r) {
      var i = slot(r.at);
      if (i == null) return;
      reached[i] += 1;
    });
    return { months: months, campaigns: campaigns, reached: reached };
  }

  function cgComboChart(series, brand, blue) {
    var months = series.months;
    var rows = [
      { name: 'Campaigns', color: brand, values: series.campaigns },
      { name: 'Users reached', color: blue, values: series.reached },
    ];
    cgCharts.activity = { months: months, rows: rows };
    var n = months.length;
    var W = 600;
    var H = 200;
    var x = function (k) { return n === 1 ? W / 2 : (k / (n - 1)) * W; };
    var defs = '';
    var paths = '';
    rows.slice().reverse().forEach(function (row, ri) {
      var max = Math.max.apply(null, row.values.concat([1])) * 1.15;
      var y = function (v) { return H - (v / max) * (H - 8); };
      var line = smoothPath(row.values.map(function (v, k) { return [x(k), y(v)]; }), H);
      defs += '<linearGradient id="ar-cg-fill-' + ri + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="5%" stop-color="' + row.color + '" stop-opacity="0.35"/>' +
        '<stop offset="95%" stop-color="' + row.color + '" stop-opacity="0.04"/></linearGradient>';
      paths += '<path d="' + line + 'L' + W + ',' + H + 'L0,' + H + 'Z" fill="url(#ar-cg-fill-' + ri + ')"/>' +
        '<path d="' + line + '" fill="none" stroke="' + row.color + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/>';
    });
    var ticks = months.map(function (d) { return d.toLocaleDateString('en-GB', { month: 'short' }); });
    return '<div class="ar-achart" data-cg-chart="activity"><div class="ar-achart-plot">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><defs>' + defs + '</defs>' +
      [0.25, 0.5, 0.75].map(function (f) {
        return '<line x1="0" x2="' + W + '" y1="' + H * f + '" y2="' + H * f + '" stroke="#ece9f5" vector-effect="non-scaling-stroke"/>';
      }).join('') + paths +
      '</svg><span class="ar-achart-cursor" hidden></span><div class="ar-achart-tip" hidden></div></div>' +
      '<div class="ar-achart-ticks">' + ticks.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></div>';
  }

  function renderCampaignInsights() {
    var series = cgMonthSeries();
    var root = getComputedStyle(document.documentElement);
    var brand = root.getPropertyValue('--brand').trim() || '#782bff';
    var blue = root.getPropertyValue('--stage-2').trim() || '#3b7fc4';
    $('cg-chart').innerHTML = cgComboChart(series, brand, blue);
  }

  function moveCgChartTip(e) {
    var plot = e.target.closest('.ar-achart-plot');
    var chart = plot && plot.closest('[data-cg-chart]');
    var data = chart && cgCharts[chart.getAttribute('data-cg-chart')];
    if (!data) return;
    var box = plot.getBoundingClientRect();
    var n = data.months.length;
    var k = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1))));
    var left = n === 1 ? box.width / 2 : (k / (n - 1)) * box.width;
    var cursor = plot.querySelector('.ar-achart-cursor');
    var tip = plot.querySelector('.ar-achart-tip');
    var month = data.months[k].toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    cursor.hidden = false;
    cursor.style.left = left + 'px';
    tip.hidden = false;
    tip.innerHTML = '<b>' + esc(month) + '</b>' + data.rows.map(function (row) {
      return '<span><i style="background:' + row.color + '"></i>' + esc(row.name) + '<strong>' + row.values[k].toLocaleString() + '</strong></span>';
    }).join('');
    tip.style.left = Math.min(Math.max(left, 110), box.width - 110) + 'px';
  }

  /* ——— Campaigns: list ——— */

  /** One-to-one sends from a student card. Named campaigns also write here, and those carry a campaignId. */
  function individualRows() {
    ensureIndividualSeeds();
    var rows = [];
    Object.keys(CAMPAIGNS).forEach(function (id) {
      var s = studentById(id);
      if (!s) return;
      (CAMPAIGNS[id] || []).forEach(function (c) {
        if (c.campaignId) return;
        rows.push({ student: s, channel: c.channel, template: c.template, subject: c.subject || '', text: c.text || '', at: c.at });
      });
    });
    return rows;
  }

  /** Demo sends so the Individual tab is not empty the first time the page opens. */
  function ensureIndividualSeeds() {
    var found = false;
    Object.keys(CAMPAIGNS).forEach(function (id) {
      (CAMPAIGNS[id] || []).forEach(function (c) { if (!c.campaignId) found = true; });
    });
    if (found) return;
    var day = 86400000;
    var now = Date.now();
    [[0, 'email', 'reminder', 2], [3, 'whatsapp', 'scholarship', 4], [6, 'sms', 'deadline', 6], [8, 'email', 'visit', 1],
      [11, 'whatsapp', 'reminder', 9], [14, 'sms', 'scholarship', 3], [17, 'email', 'deadline', 12], [20, 'whatsapp', 'visit', 7]
    ].forEach(function (r) {
      var s = STUDENTS[r[0]];
      if (!s) return;
      var tpl = templateById(r[2]);
      var at = new Date(now - r[3] * day - 3 * 3600000);
      var text = fillTemplate(tpl.text, s);
      (CAMPAIGNS[s.id] = CAMPAIGNS[s.id] || []).push({
        channel: r[1], template: tpl.id, subject: r[1] === 'email' ? fillTemplate(tpl.subject, s) : '', text: text, at: at.toISOString(),
      });
      if (r[1] !== 'sms') return;
      var thread = CHATS[s.id] = CHATS[s.id] || { messages: [], unread: 0, seen: false, typing: false };
      thread.messages.push({ from: 'uni', text: text, at: at.getTime(), campaign: 'sms' });
      thread.seen = false;
    });
    saveCampaigns();
    saveChats();
  }

  function individualKey(r) {
    return r.student.id + '|' + r.at + '|' + r.channel;
  }

  function individualByKey(key) {
    return individualRows().filter(function (r) { return individualKey(r) === key; })[0] || null;
  }

  function cgTrack(s, c) {
    var steps = campaignTrack(s, c);
    var last = steps[steps.length - 1] || { name: 'Sent', at: new Date(c.at) };
    return { steps: steps, last: last, n: Math.max(1, steps.length) };
  }

  function cgIndividuals() {
    var q = CGF.q.trim().toLowerCase();
    return individualRows().filter(function (r) {
      if (CGF.channel !== 'all' && r.channel !== CGF.channel) return false;
      if (CGF.program !== 'all' && r.student.program !== CGF.program) return false;
      var blob = (r.student.name + ' ' + r.student.id + ' ' + r.subject + ' ' + r.text + ' ' + programById(r.student.program).name).toLowerCase();
      return !q || blob.indexOf(q) >= 0;
    }).sort(function (a, b) {
      var ka = new Date(a.at).getTime();
      var kb = new Date(b.at).getTime();
      return CGF.sort === 'old' ? ka - kb : kb - ka;
    });
  }

  function cgIndCardHtml(r) {
    var ch = channelById(r.channel);
    var st = cgTrack(r.student, r);
    var key = esc(individualKey(r));
    var preview = (r.subject || r.text || 'No message').replace(/\s+/g, ' ').trim();
    if (preview.length > 96) preview = preview.slice(0, 96) + '…';
    return '<article class="panel ar-cg-card" data-cg-ind="' + key + '">' +
      '<div class="ar-cg-card-top"><span class="ar-cg-ico ch-' + r.channel + '">' + ico(ch.icon) + '</span>' +
      '<div class="ar-cg-card-title"><h3>' + esc(r.student.name) + '</h3><p>' + esc(preview) + '</p></div></div>' +
      '<div class="ar-cg-meta">' +
      cgMeta('badge', 'GR ID', r.student.id) +
      cgMeta(ch.icon, 'Channel', ch.name) +
      cgMeta('schedule', 'Sent on', fmtDateTime(new Date(r.at))) +
      cgMeta('insights', 'Status', st.last.name) +
      '</div>' +
      '<div class="ar-cg-foot"><div class="ar-cg-chips"><span class="ar-cg-channel ch-' + r.channel + '">' + ico(ch.icon) + esc(ch.name) + '</span>' +
      '<span class="ar-crit">' + esc(programById(r.student.program).name) + '</span></div>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-icon" data-cg-ind-preview="' + key + '">' + ico('visibility') + 'Preview</button></div></article>';
  }

  function cgDeliveryHtml(s, c) {
    var track = cgTrack(s, c);
    var day = fmtDate(track.steps[0] ? track.steps[0].at : new Date(c.at));
    return '<div class="ar-cg-ind-delivery"><h4>Delivery</h4><ol class="ar-cmp-steps">' + CAMPAIGN_STEPS.map(function (name, i) {
      var st = track.steps[i];
      var when = st ? (fmtDate(st.at) === day ? fmtTime(st.at) : fmtDateTime(st.at)) : 'Not yet';
      return '<li class="' + (st ? 'done' : '') + '"><span>' + name + '</span><time>' + esc(st && i === 0 ? fmtDateTime(st.at) : when) + '</time></li>';
    }).join('') + '</ol></div>';
  }

  function openIndividualPreview(key) {
    var r = individualByKey(key);
    if (!r) return;
    var ch = channelById(r.channel);
    openDrawer(r.student.name,
      '<p class="ar-cm-note">' + ico(ch.icon) + esc(ch.name) + ' to ' + esc(r.student.id) + ' · ' + esc(fmtDateTime(new Date(r.at))) + '</p>' +
      '<div class="ar-cg-preview-box">' + cgPreviewHtml(r, r.student) + '</div>' + cgDeliveryHtml(r.student, r),
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Close</button>', true);
    $('drawer').classList.add('ar-campaign-modal');
  }

  function cgFiltered() {
    var q = CGF.q.trim().toLowerCase();
    var want = cgPage.tab === 'drafts' ? 'draft' : 'launched';
    return CAMPAIGN_LIST.filter(function (c) {
      if (c.status !== want) return false;
      if (CGF.channel !== 'all' && c.channel !== CGF.channel) return false;
      if (CGF.program !== 'all' && c.audience.program !== CGF.program) return false;
      return !q || (c.name + ' ' + c.description + ' ' + cgTargetChips(c.audience).join(' ')).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) {
      if (CGF.sort === 'reach') return cgRecipients(b) - cgRecipients(a);
      var ka = a.sentAt || a.updated;
      var kb = b.sentAt || b.updated;
      return CGF.sort === 'old' ? ka - kb : kb - ka;
    });
  }

  function cgMeta(icon, label, value) {
    return '<div class="ar-cg-meta-item">' + ico(icon) + '<span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }

  function cgTool(attr, icon, label, danger) {
    return '<button type="button" class="ar-icon-btn' + (danger ? ' danger' : '') + '" ' + attr + ' aria-label="' + esc(label) + '" data-tip="' + esc(label) + '">' + ico(icon) + '</button>';
  }

  function cgCardHtml(c) {
    var ch = channelById(c.channel);
    var launched = c.status === 'launched';
    var m = cgMetrics(c);
    var id = esc(c.id);
    var tools = launched
      ? cgTool('data-cg-view="' + id + '"', 'insights', 'View campaign details') + cgTool('data-cg-duplicate="' + id + '"', 'content_copy', 'Duplicate')
      : cgTool('data-cg-edit="' + id + '"', 'edit', 'Edit draft') + cgTool('data-cg-duplicate="' + id + '"', 'content_copy', 'Duplicate') + cgTool('data-cg-delete="' + id + '"', 'delete', 'Delete draft', true);
    return '<article class="panel ar-cg-card" data-cg-open="' + id + '">' +
      '<div class="ar-cg-card-top"><span class="ar-cg-ico ch-' + c.channel + '">' + ico(ch.icon) + '</span>' +
      '<div class="ar-cg-card-title"><h3>' + esc(c.name || 'Untitled campaign') + '</h3><p>' + esc(c.description || 'No description yet') + '</p></div>' +
      '<div class="ar-cg-tools">' + tools + '</div></div>' +
      '<div class="ar-cg-meta">' +
      cgMeta('group', 'Recipients', m.sent.toLocaleString() + (m.sent === 1 ? ' student' : ' students')) +
      cgMeta(launched ? 'send' : 'edit_note', launched ? 'Sent on' : 'Last edited', fmtDateTime(new Date(launched ? c.sentAt : c.updated))) +
      (launched ? cgMeta('drafts', 'Open rate', cgPct(m.opened, m.delivered) + '%') + cgMeta('ads_click', 'Click to open', cgPct(m.clicked, m.opened) + '%') : '') +
      '</div>' +
      '<div class="ar-cg-foot"><div class="ar-cg-chips"><span class="ar-cg-channel ch-' + c.channel + '">' + ico(ch.icon) + esc(ch.name) + '</span>' + cgChipsHtml(c.audience) + '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-icon" data-cg-preview="' + id + '">' + ico('visibility') + 'Preview</button></div>' +
      '</article>';
  }

  function renderCampaignList() {
    var launched = CAMPAIGN_LIST.filter(function (c) { return c.status === 'launched'; }).length;
    var tabs = [
      ['launched', 'Launched', launched, '#/campaigns'],
      ['drafts', 'Drafts', CAMPAIGN_LIST.length - launched, '#/campaigns/drafts'],
      ['individual', 'Individual', individualRows().length, '#/campaigns/individual'],
    ];
    $('cg-tabs').innerHTML = tabs.map(function (t) {
      var on = cgPage.tab === t[0];
      return '<a class="ar-seg-btn' + (on ? ' active' : '') + '" href="' + t[3] + '" data-cg-tab="' + t[0] + '" aria-selected="' + on + '">' + t[1] + ' <small>' + t[2] + '</small></a>';
    }).join('');
    if ($('cgf-program').options.length < 2) {
      $('cgf-program').innerHTML = '<option value="all">All programs</option>' + PROGRAMS.map(function (p) {
        return '<option value="' + p.id + '">' + esc(p.name) + '</option>';
      }).join('');
    }
    $('cgf-program').value = CGF.program;
    $('cgf-channel').value = CGF.channel;
    $('cgf-sort').value = CGF.sort;
    if ($('cg-search').value !== CGF.q) $('cg-search').value = CGF.q;
    var cgPicked = (CGF.channel !== 'all') + (CGF.program !== 'all') + (CGF.sort !== 'new');
    $('cgf-count').textContent = cgPicked;
    $('cgf-count').hidden = !cgPicked;
    $('cgf-clear').hidden = !cgPicked;
    $('cgf-toggle').classList.toggle('on', cgPicked > 0);
    var individual = cgPage.tab === 'individual';
    var rows = individual ? cgIndividuals() : cgFiltered();
    var filtered = CGF.q || CGF.channel !== 'all' || CGF.program !== 'all';
    var emptyTitle = filtered ? 'No campaigns match these filters' : individual ? 'No individual campaigns yet' : cgPage.tab === 'drafts' ? 'No drafts' : 'No campaigns launched yet';
    var emptyBody = filtered ? 'Try a different search, channel or program.' : individual
      ? 'Send one from a student card on the dashboard. It shows up here with its delivery status.'
      : 'Create a campaign to reach the right students by email, WhatsApp or text.';
    $('cg-list').innerHTML = rows.length ? rows.map(individual ? cgIndCardHtml : cgCardHtml).join('') :
      '<div class="panel ar-cg-empty">' + ico(individual ? 'person' : cgPage.tab === 'drafts' ? 'edit_note' : 'campaign') +
      '<h3>' + emptyTitle + '</h3><p>' + emptyBody + '</p>' +
      (filtered || individual ? '' : '<button type="button" class="btn btn-primary btn-sm btn-icon" data-cg-new>' + ico('add') + 'Create campaign</button>') + '</div>';
  }

  function cgKpi(icon, label, value, note) {
    return '<div class="ar-cg-kpi"><span class="ar-cg-kpi-ico">' + ico(icon) + '</span><div><span>' + esc(label) + '</span>' +
      '<p><strong>' + esc(String(value)) + '</strong><small>' + esc(note) + '</small></p></div></div>';
  }

  function renderCampaignSide() {
    var launched = CAMPAIGN_LIST.filter(function (c) { return c.status === 'launched'; });
    var t = launched.reduce(function (acc, c) {
      var m = cgMetrics(c);
      acc.sent += m.sent;
      acc.delivered += m.delivered;
      acc.opened += m.opened;
      acc.clicked += m.clicked;
      return acc;
    }, { sent: 0, delivered: 0, opened: 0, clicked: 0 });
    var drafts = CAMPAIGN_LIST.length - launched.length;
    var individuals = individualRows().length;
    $('cg-overview').innerHTML =
      '<section class="panel ar-cg-kpis"><div class="panel-head"><h2>Overview</h2></div>' +
      cgKpi('campaign', 'Total campaigns', CAMPAIGN_LIST.length, launched.length + ' launched · ' + drafts + ' draft' + (drafts === 1 ? '' : 's')) +
      cgKpi('person', 'Individual sends', individuals.toLocaleString(), 'One student at a time') +
      cgKpi('groups', 'Total students', t.sent.toLocaleString(), 'Across ' + launched.length + ' launched campaign' + (launched.length === 1 ? '' : 's')) +
      '</section>';
    $('cg-side').innerHTML =
      '<section class="panel ar-cg-quick"><h3>Quick actions</h3>' +
      '<button type="button" class="ar-cg-action" data-cg-templates>' + ico('description') + '<span><b>Manage templates</b><small>Reusable messages for every channel</small></span>' + ico('chevron_right') + '</button>' +
      '<button type="button" class="ar-cg-action" data-cg-export>' + ico('download') + '<span><b>Export campaign data</b><small>Results as CSV, without student contact details</small></span>' + ico('chevron_right') + '</button>' +
      '</section>';
  }

  function openCampaignPreview(id) {
    var c = campaignById(id);
    if (!c) return;
    var s = cgSample(c);
    var launched = c.status === 'launched';
    openDrawer(c.name || 'Untitled campaign',
      '<p class="ar-cm-note">' + ico('visibility') + 'How ' + esc(s.name.split(' ')[0]) + ' sees this ' + esc(channelById(c.channel).name) + ' message.</p>' +
      '<div class="ar-cg-preview-box">' + cgPreviewHtml(c, s) + '</div>',
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Close</button>' +
      (launched ? '<button type="button" class="btn btn-primary btn-sm" data-cg-view="' + esc(c.id) + '">View campaign details</button>'
        : '<button type="button" class="btn btn-primary btn-sm" data-cg-edit="' + esc(c.id) + '">Edit draft</button>'), true);
    $('drawer').classList.add('ar-campaign-modal');
  }

  function openCampaignTemplates() {
    var s = STUDENTS[0];
    openDrawer('Message templates',
      '<p class="ar-cm-note">' + ico('auto_fix_high') + '{first}, {program} and {university} are filled in for each student.</p>' +
      '<div class="ar-cg-templates">' + CAMPAIGN_TEMPLATES.filter(function (t) { return t.id !== 'custom'; }).map(function (t) {
        return '<div class="ar-cg-template"><div><b>' + esc(t.name) + '</b><small>' + esc(fillTemplate(t.subject, s)) + '</small><p>' + esc(t.text) + '</p></div>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-cg-use-template="' + t.id + '">Use template</button></div>';
      }).join('') + '</div>',
      '<button type="button" class="btn btn-ghost btn-sm" data-close-drawer>Close</button>', true);
    $('drawer').classList.add('ar-campaign-modal');
  }

  function exportCampaigns() {
    var cell = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['Campaign', 'Status', 'Channel', 'Target filters', 'Recipients', 'Delivered', 'Opened', 'Clicked', 'Open rate', 'Click to open rate', 'Sent on']];
    CAMPAIGN_LIST.forEach(function (c) {
      var m = cgMetrics(c);
      var launched = c.status === 'launched';
      rows.push([c.name, launched ? 'Launched' : 'Draft', channelById(c.channel).name, cgTargetChips(c.audience).join(' · '), m.sent,
        m.delivered, m.opened, m.clicked, launched ? cgPct(m.opened, m.delivered) + '%' : '', launched ? cgPct(m.clicked, m.opened) + '%' : '',
        launched ? fmtDateTime(new Date(c.sentAt)) : '']);
    });
    individualRows().forEach(function (r) {
      var track = cgTrack(r.student, r);
      var reached = {};
      track.steps.forEach(function (step) { reached[step.name] = true; });
      rows.push([r.student.name, 'Individual', channelById(r.channel).name,
        r.student.id + ' · ' + programById(r.student.program).name, 1,
        reached.Delivered ? 1 : 0, reached.Opened ? 1 : 0, reached.Interacted ? 1 : 0,
        reached.Opened ? '100%' : '0%', reached.Interacted ? '100%' : '0%', fmtDateTime(new Date(r.at))]);
    });
    var blob = new Blob([rows.map(function (r) { return r.map(cell).join(','); }).join('\n')], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'admitright-campaigns.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Exported ' + (CAMPAIGN_LIST.length + individualRows().length) + ' campaigns.');
  }

  function duplicateCampaign(id) {
    var c = campaignById(id);
    if (!c) return;
    var copy = clone(c);
    copy.id = storeId('cg');
    copy.name = (c.name || 'Untitled campaign') + ' (copy)';
    copy.status = 'draft';
    copy.sentAt = null;
    copy.recipients = null;
    copy.created = copy.updated = Date.now();
    CAMPAIGN_LIST.unshift(copy);
    saveCampaignList();
    cgForm = null;
    toast('Copied as a draft. Make your changes and launch it.');
    goTo('campaigns/' + encodeURIComponent(copy.id) + '/edit');
  }

  function deleteCampaignDraft(id) {
    var c = campaignById(id);
    if (!c || c.status !== 'draft') return;
    if (!window.confirm('Delete the draft "' + (c.name || 'Untitled campaign') + '"?')) return;
    CAMPAIGN_LIST = CAMPAIGN_LIST.filter(function (x) { return x.id !== id; });
    saveCampaignList();
    toast('Draft deleted.');
    if (cgPage.page === 'list') renderCampaigns();
    else goTo('campaigns/drafts');
  }

  /* ——— Campaigns: create flow ——— */

  function cgStepperHtml() {
    return '<div class="ar-evc-stepper">' + CG_STEPS.map(function (n, i) {
      var cls = i < cgForm.step ? ' done' : i === cgForm.step ? ' active' : '';
      return '<span class="' + cls + '"><i>' + (i < cgForm.step ? ico('check') : '') + '</i><b>' + esc(n) + '</b></span>';
    }).join('') + '</div>';
  }

  function cgDetailsStepHtml(d) {
    return '<section class="ar-evc-section"><h3>Campaign details</h3><p class="ar-evc-note">Students don’t see the campaign name. It helps your team find it later.</p>' +
      '<div class="ar-evc-row ar-cg-two">' +
      fieldWrap('Campaign name', textInput('cg-name', d.name, 'e.g. Applications open for Fall 2027'), true) +
      fieldWrap('Short description', textInput('cg-description', d.description, 'What should this campaign achieve?')) + '</div>' +
      '<h3>Channel</h3><div class="ar-evc-formats">' + CAMPAIGN_CHANNELS.map(function (c) {
        var on = d.channel === c.id;
        return '<label class="' + (on ? 'on' : '') + '"><input type="radio" name="cg-channel" value="' + c.id + '"' + (on ? ' checked' : '') + '>' +
          ico(c.icon) + '<span>' + esc(c.name) + '</span></label>';
      }).join('') + '</div>' +
      '<p class="ar-cm-note">' + ico('lock') + 'Sent through AdmitRight. Students’ phone numbers and emails stay private.</p></section>';
  }

  function cgAudienceStepHtml(d) {
    var a = d.audience;
    var all = a.program === 'all';
    var prefs = all ? [] : prefsFor(a.program);
    var saved = savedFilterInfo('all');
    var list = cgAudience(a);
    var programOpts = [['all', 'All programs']].concat(PROGRAMS.map(function (p) { return [p.id, p.name]; }));
    var prefOpts = [['', all ? 'Pick a program to use a preference' : 'All students in the program']].concat(prefs.map(function (p) { return [p.id, p.name]; }));
    var scoreOpts = a.prefId ? [['0', 'Any match score'], ['80', '80% and above'], ['70', '70% and above'], ['60', '60% and above'], ['50', '50% and above']]
      : [['0', 'Pick a preference to score students']];
    var stageOpts = [['', 'Any stage']].concat(STAGES.map(function (s, i) { return [String(i), s.name + ' or later']; }));
    var intakeOpts = [['', 'Any intake'], ['2026', '2026'], ['2027', '2027'], ['2028', '2028'], ['2029', '2029']];
    var filterOpts = [['', 'No saved filter']];
    if (saved) filterOpts.push(['saved', saved.label]);
    var matched = list.filter(function (x) { return x.score !== null && x.score >= MATCH_MIN; }).length;
    return '<section class="ar-evc-section"><h3>Audience</h3><p class="ar-evc-note">Pick who should get this campaign. The count updates as you change filters.</p>' +
      '<div class="ar-evc-group"><h4>Who to target</h4><p>Start from a program, then narrow by preference, match score, funnel stage or intake.</p>' +
      '<div class="ar-evc-row">' +
      fieldWrap('Program', selectHtml('cga-program', a.program, programOpts), true) +
      fieldWrap('Target audience preference', selectHtml('cga-prefId', a.prefId, prefOpts)) +
      fieldWrap('Match score', selectHtml('cga-minScore', a.minScore, scoreOpts)) + '</div>' +
      '<div class="ar-evc-row">' +
      fieldWrap('Funnel stage', selectHtml('cga-stage', a.stage, stageOpts)) +
      fieldWrap('Intake', selectHtml('cga-intake', a.intake, intakeOpts)) +
      fieldWrap('Saved filter', selectHtml('cga-savedFilter', a.savedFilter, filterOpts)) + '</div>' +
      '<div class="ar-evc-target"><span>Total targeted students</span><strong>' + list.length.toLocaleString() + '</strong><small>' +
      esc(cgPrefOf(a) ? matched.toLocaleString() + ' are strong matches for this preference.' : 'Pick a preference to see how well they match.') + '</small></div>' +
      '<div class="ar-cg-chips ar-cg-target-chips">' + cgChipsHtml(a) + '</div></div></section>';
  }

  function cgMessageStepHtml(d) {
    var ch = channelById(d.channel);
    var s = cgSample(d);
    return '<section class="ar-evc-section ar-cg-wide"><h3>Message</h3><p class="ar-evc-note">Sending by ' + esc(ch.name) + '. Each student gets a personalised copy.</p>' +
      '<div class="ar-cg-compose"><div>' +
      fieldWrap('Template', selectHtml('cg-template', d.template, CAMPAIGN_TEMPLATES.map(function (t) { return [t.id, t.name]; }))) +
      (d.channel === 'email' ? fieldWrap('Subject', textInput('cg-subject', d.subject, 'Subject line'), true) : '') +
      fieldWrap('Message', '<textarea id="cg-text" rows="8" placeholder="Write your message">' + esc(d.text) + '</textarea>', true) +
      (d.channel === 'sms' ? '<p class="ar-cg-count" id="cg-sms-count"></p>' : '') +
      '<p class="ar-cm-note">' + ico('auto_fix_high') + '{first}, {program} and {university} are filled in for each student.</p></div>' +
      '<div class="ar-cg-preview-col"><span>Preview for ' + esc(s.name.split(' ')[0]) + '</span><div id="cg-preview">' + cgPreviewHtml(d, s) + '</div></div>' +
      '</div></section>';
  }

  function cgReviewBlock(title, step, body) {
    return '<section class="ar-cg-review-block"><div class="ar-cg-review-head"><h4>' + esc(title) + '</h4>' +
      '<button type="button" class="ar-link" data-cg-step="' + step + '">' + ico('edit') + 'Edit</button></div>' + body + '</section>';
  }

  function cgReviewStepHtml(d) {
    var ch = channelById(d.channel);
    var n = cgAudience(d.audience).length;
    return '<section class="ar-cg-review">' +
      '<div class="ar-cg-review-grid">' +
      cgReviewBlock('Campaign', 0, '<div class="ar-cg-kv">' + detailKV('Name', d.name) + detailKV('Channel', ch.name) + detailKV('Description', d.description) + '</div>') +
      cgReviewBlock('Audience', 1, '<div class="ar-cg-kv">' + detailKV('Recipients', n.toLocaleString() + ' students') + '</div><div class="ar-cg-chips">' + cgChipsHtml(d.audience) + '</div>') +
      '</div>' +
      cgReviewBlock('Message', 2, '<div class="ar-cg-preview-box">' + cgPreviewHtml(d, cgSample(d)) + '</div>') +
      '<div class="ar-cg-launch"><div><h3>Ready to send?</h3><p>' + n.toLocaleString() + ' student' + (n === 1 ? '' : 's') + ' will get this ' +
      esc(ch.id === 'whatsapp' ? ch.name : ch.name.toLowerCase()) + ' message right away. You can’t edit a campaign after launch.</p></div>' +
      '<div class="ar-cg-launch-actions"><button type="button" class="btn btn-secondary btn-sm" data-cg-save-draft>Save as draft</button>' +
      '<button type="button" class="btn btn-primary btn-sm btn-icon" data-cg-launch>' + ico('send') + 'Launch campaign</button></div></div>' +
      '</section>';
  }

  function updateCampaignPreview() {
    if (!cgForm || !$('cg-preview')) return;
    var d = cgForm.draft;
    $('cg-preview').innerHTML = cgPreviewHtml(d, cgSample(d));
    var count = $('cg-sms-count');
    if (count) {
      var len = fillTemplate(d.text || '', cgSample(d)).length;
      count.textContent = len + ' / ' + SMS_LIMIT + ' characters';
      count.classList.toggle('over', len > SMS_LIMIT);
    }
  }

  function renderCampaignForm() {
    var c = cgPage.id ? campaignById(cgPage.id) : null;
    if (cgPage.id && (!c || c.status !== 'draft')) {
      goTo(c ? 'campaigns/' + encodeURIComponent(c.id) : 'campaigns', true);
      return;
    }
    if (!cgForm || cgForm.id !== (cgPage.id || null)) cgForm = { step: 0, id: cgPage.id || null, draft: c ? clone(c) : newCampaignDraft() };
    showCampaignsPage('form');
    var d = cgForm.draft;
    $('cg-form-title').textContent = cgForm.id ? 'Edit campaign' : 'Create campaign';
    $('cg-form-sub').textContent = cgForm.id ? (d.name || 'Untitled campaign') + ' · Draft' : 'Reach the right students by email, WhatsApp or text';
    $('cg-form-body').innerHTML = cgStepperHtml() + [cgDetailsStepHtml, cgAudienceStepHtml, cgMessageStepHtml, cgReviewStepHtml][cgForm.step](d);
    $('cg-form-foot').innerHTML = '<button type="button" class="btn btn-ghost btn-sm" data-cg-prev>' + (cgForm.step ? 'Previous step' : 'Cancel') + '</button>' +
      (cgForm.step < 3 ? '<div class="ar-cg-foot-right"><button type="button" class="btn btn-secondary btn-sm" data-cg-save-draft>Save draft</button>' +
        '<button type="button" class="btn btn-primary btn-sm btn-icon" data-cg-next>Next step' + ico('arrow_forward') + '</button></div>' : '');
    updateCampaignPreview();
  }

  function readCampaignForm() {
    if (!cgForm) return;
    var d = cgForm.draft;
    ['name', 'description', 'template', 'subject', 'text'].forEach(function (k) {
      var el = $('cg-' + k);
      if (el) d[k] = el.value;
    });
    var ch = document.querySelector('[name="cg-channel"]:checked');
    if (ch) d.channel = ch.value;
    ['program', 'prefId', 'minScore', 'stage', 'intake', 'savedFilter'].forEach(function (k) {
      var el = $('cga-' + k);
      if (el) d.audience[k] = el.value;
    });
  }

  /** Why a step can't be finished yet, as [message, field id to focus], or null. */
  function cgProblem(step) {
    var d = cgForm.draft;
    if (step === 0 && !d.name.trim()) return ['Give the campaign a name.', 'cg-name'];
    if (step === 1 && !cgAudience(d.audience).length) return ['No students match this audience. Loosen a filter.', 'cga-program'];
    if (step === 2) {
      if (d.channel === 'email' && !d.subject.trim()) return ['Add a subject line.', 'cg-subject'];
      if (!d.text.trim()) return ['Write a message first.', 'cg-text'];
      if (d.channel === 'sms' && fillTemplate(d.text, cgSample(d)).length > SMS_LIMIT) return ['Keep the text under ' + SMS_LIMIT + ' characters.', 'cg-text'];
    }
    return null;
  }

  function campaignFormNext() {
    readCampaignForm();
    var p = cgProblem(cgForm.step);
    if (p) {
      toast(p[0]);
      if ($(p[1])) $(p[1]).focus();
      return;
    }
    cgForm.step = Math.min(3, cgForm.step + 1);
    renderCampaignForm();
    window.scrollTo(0, 0);
  }

  function campaignFormPrev() {
    readCampaignForm();
    if (!cgForm.step) {
      var drafts = !!cgForm.id;
      cgForm = null;
      goTo(drafts ? 'campaigns/drafts' : cgListPath(cgPage.tab));
      return;
    }
    cgForm.step -= 1;
    renderCampaignForm();
    window.scrollTo(0, 0);
  }

  function cgRow(d, status) {
    var now = Date.now();
    return {
      id: cgForm.id || storeId('cg'), status: status, name: d.name.trim() || 'Untitled campaign', description: d.description.trim(),
      channel: d.channel, template: d.template, subject: d.channel === 'email' ? d.subject : '', text: d.text,
      audience: clone(d.audience), created: d.created || now, updated: now, sentAt: null, recipients: null,
    };
  }

  function storeCampaign(row) {
    var i = CAMPAIGN_LIST.map(function (c) { return c.id; }).indexOf(row.id);
    if (i >= 0) CAMPAIGN_LIST[i] = row;
    else CAMPAIGN_LIST.unshift(row);
    saveCampaignList();
  }

  function saveCampaignDraft() {
    readCampaignForm();
    storeCampaign(cgRow(cgForm.draft, 'draft'));
    cgForm = null;
    cgPage.tab = 'drafts';
    toast('Draft saved.');
    goTo('campaigns/drafts');
  }

  function launchCampaign() {
    readCampaignForm();
    for (var step = 0; step < 3; step++) {
      var p = cgProblem(step);
      if (p) {
        cgForm.step = step;
        renderCampaignForm();
        toast(p[0]);
        if ($(p[1])) $(p[1]).focus();
        return;
      }
    }
    var d = cgForm.draft;
    var ch = channelById(d.channel);
    var students = cgAudience(d.audience).map(function (x) { return x.s; });
    var row = cgRow(d, 'launched');
    row.sentAt = row.updated;
    row.recipients = students.length;
    var at = new Date(row.sentAt).toISOString();
    students.forEach(function (s) {
      var text = fillTemplate(d.text.trim(), s);
      (CAMPAIGNS[s.id] = CAMPAIGNS[s.id] || []).push({
        channel: ch.id, template: d.template, subject: ch.id === 'email' ? fillTemplate(d.subject.trim(), s) : '', text: text, at: at, campaignId: row.id });
      if (ch.id !== 'sms') return;
      var thread = CHATS[s.id] = CHATS[s.id] || { messages: [], unread: 0, seen: false, typing: false };
      thread.messages.push({ from: 'uni', text: text, at: row.sentAt, campaign: ch.id });
      thread.seen = false;
    });
    saveCampaigns();
    if (ch.id === 'sms') saveChats();
    storeCampaign(row);
    cgForm = null;
    cgPage.tab = 'launched';
    toast(ch.name + ' campaign launched to ' + students.length.toLocaleString() + ' students.' + (ch.id === 'sms' ? ' It\'s in Chats.' : ''));
    goTo('campaigns/' + encodeURIComponent(row.id));
  }

  /* ——— Campaigns: detail ——— */

  function cgFunnelHtml(m) {
    var steps = [['Sent', m.sent], ['Delivered', m.delivered], ['Opened', m.opened], ['Clicked', m.clicked]];
    return '<div class="ar-cg-funnel">' + steps.map(function (st) {
      var w = cgPct(st[1], m.sent);
      return '<div class="ar-cg-funnel-row"><span>' + st[0] + '</span><div class="ar-cg-funnel-bar"><i style="width:' + Math.max(w, 2) + '%"></i></div>' +
        '<b>' + st[1].toLocaleString() + '</b><small>' + w + '%</small></div>';
    }).join('') + '</div>';
  }

  function cgRecipientsTable(c, m) {
    var list = cgAudience(c.audience).slice(0, Math.min(m.sent, 12));
    var r = m.rates;
    var mark = function (on) { return on ? ico('check') : '<span class="ar-cg-no">' + ico('remove') + '</span>'; };
    return '<div class="ar-ev-detail-table"><table><thead><tr><th>GR ID</th><th>Name</th><th>Match</th><th>Delivered</th><th>Opened</th><th>Clicked</th></tr></thead><tbody>' +
      (list.length ? list.map(function (x) {
        var roll = hashOf(c.id + ':' + x.s.id) % 1000 / 1000;
        var delivered = roll < r.delivered;
        var opened = roll < r.delivered * r.opened;
        var clicked = roll < r.delivered * r.opened * r.clicked;
        return '<tr><td>' + esc(String(x.s.id).replace(/^(.{4}).+(.{4})$/, '$1…$2')) + '</td><td>' + esc(x.s.name) + '</td>' +
          '<td>' + (x.score === null ? '—' : x.score + '%') + '</td><td>' + mark(delivered) + '</td><td>' + mark(opened) + '</td><td>' + mark(clicked) + '</td></tr>';
      }).join('') : '<tr><td colspan="6">No recipients found.</td></tr>') +
      '</tbody></table></div>';
  }

  function renderCampaignDetail() {
    var c = campaignById(cgPage.id);
    if (!c) {
      goTo('campaigns', true);
      return;
    }
    if (c.status === 'draft') {
      goTo('campaigns/' + encodeURIComponent(c.id) + '/edit', true);
      return;
    }
    showCampaignsPage('detail');
    var ch = channelById(c.channel);
    var m = cgMetrics(c);
    $('cg-detail-title').textContent = c.name;
    $('cg-detail-sub').textContent = ch.name + ' campaign · Sent ' + fmtDateTime(new Date(c.sentAt));
    $('cg-detail-actions').innerHTML =
      '<button type="button" class="btn btn-secondary btn-sm btn-icon" data-cg-preview="' + esc(c.id) + '">' + ico('visibility') + 'Preview</button>' +
      '<button type="button" class="btn btn-primary btn-sm btn-icon" data-cg-duplicate="' + esc(c.id) + '">' + ico('content_copy') + 'Duplicate</button>';
    $('cg-detail-body').innerHTML =
      '<div class="ar-ev-detail-metrics ar-cg-metrics">' +
      eventMetricTile('Recipients', m.sent.toLocaleString(), 'Students targeted') +
      eventMetricTile('Delivered', m.delivered.toLocaleString(), cgPct(m.delivered, m.sent) + '% delivery rate') +
      eventMetricTile('Opened', m.opened.toLocaleString(), cgPct(m.opened, m.delivered) + '% open rate') +
      eventMetricTile('Clicked', m.clicked.toLocaleString(), cgPct(m.clicked, m.opened) + '% click to open · ' + cgPct(m.clicked, m.delivered) + '% click to delivered') +
      '</div>' +
      '<div class="ar-cg-detail-grid">' +
      '<section class="ar-ev-detail-section"><h4>Engagement</h4>' + cgFunnelHtml(m) + '</section>' +
      '<section class="ar-ev-detail-section"><h4>Campaign</h4><div class="ar-cg-kv">' +
      detailKV('Channel', ch.name) + detailKV('Template', templateById(c.template).name) + detailKV('Sent on', fmtDateTime(new Date(c.sentAt))) +
      detailKV('Description', c.description) + '</div>' +
      '<h4 class="ar-cg-sub-h">Target filters</h4><div class="ar-cg-chips">' + cgChipsHtml(c.audience) + '</div></section>' +
      '</div>' +
      '<div class="ar-cg-detail-grid ar-cg-detail-wide">' +
      '<section class="ar-ev-detail-section"><h4>Message</h4><div class="ar-cg-preview-box">' + cgPreviewHtml(c, cgSample(c)) + '</div></section>' +
      '<section class="ar-ev-detail-section"><h4>Recipients</h4><p class="ar-cm-note ar-cg-note">' + ico('lock') + 'Showing the top ' +
      Math.min(m.sent, 12) + ' of ' + m.sent.toLocaleString() + '. Phone numbers and emails stay private.</p>' + cgRecipientsTable(c, m) + '</section>' +
      '</div>';
  }

  var MENUS = [['program-btn', 'program-menu'], ['pref-btn', 'pref-menu'], ['range-btn', 'range-menu'], ['bill-range-btn', 'bill-range-menu'], ['intake-btn', 'intake-menu'], ['filter-btn', 'filter-menu'], ['bulk-btn', 'bulk-menu'],
    ['cf-program-btn', 'cf-program-menu'], ['cf-pref-btn', 'cf-pref-menu'], ['cf-score-btn', 'cf-score-menu'], ['cf-stage-btn', 'cf-stage-menu'], ['cf-extra-btn', 'cf-extra-menu']];

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
    if (rpFor === 'bill') {
      ensureBillRange();
      rp = billRange.from
        ? { from: billRange.from, to: billRange.to, preset: billRange.preset, month: addMonths(billRange.to, -1) }
        : { from: null, to: null, preset: 'all', month: addMonths(TODAY, -1) };
    } else if (state.range) {
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
    (rpFor === 'bill' ? $('bill-range-menu') : $('range-menu')).innerHTML =
      '<div class="ar-rp-body"><div class="ar-rp-presets">' + RANGE_PRESETS.map(function (p) {
        return '<button type="button" class="ar-rp-preset' + (rp.preset === p.id ? ' active' : '') + '" data-rp-preset="' + p.id + '">' + p.name + '</button>';
      }).join('') + '</div>' +
      '<div class="ar-rp-months">' + monthHtml(rp.month, -1) + monthHtml(right, 1) + '</div></div>' +
      '<div class="ar-rp-foot"><span>' + esc(rangeText(rp.from, rp.to)) + (days ? ' · ' + days + ' day' + (days === 1 ? '' : 's') : '') + '</span>' +
      '<button type="button" class="btn btn-primary btn-sm" data-rp-apply>Apply</button></div>';
  }

  function applyRange() {
    var to = rp.to || rp.from;
    if (rpFor === 'bill') {
      billRange = rp.from ? { from: rp.from, to: to, preset: rp.preset } : { from: null, to: null, preset: 'all' };
      renderBilling();
      return;
    }
    if (!rp.from) {
      state.range = null;
      $('range-label').textContent = 'All time';
      return;
    }
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

    if (t.closest('#cg-create') || t.closest('[data-cg-new]')) {
      cgForm = null;
      goTo('campaigns/create');
      return;
    }

    var cgTab = t.closest('[data-cg-tab]');
    if (cgTab) {
      e.preventDefault();
      goTo(cgListPath(cgTab.getAttribute('data-cg-tab')));
      return;
    }

    var cgView = t.closest('[data-cg-view]');
    if (cgView) {
      closeDrawer();
      goTo('campaigns/' + encodeURIComponent(cgView.getAttribute('data-cg-view')));
      return;
    }

    var cgEdit = t.closest('[data-cg-edit]');
    if (cgEdit) {
      closeDrawer();
      cgForm = null;
      goTo('campaigns/' + encodeURIComponent(cgEdit.getAttribute('data-cg-edit')) + '/edit');
      return;
    }

    var cgDup = t.closest('[data-cg-duplicate]');
    if (cgDup) {
      duplicateCampaign(cgDup.getAttribute('data-cg-duplicate'));
      return;
    }

    var cgDel = t.closest('[data-cg-delete]');
    if (cgDel) {
      deleteCampaignDraft(cgDel.getAttribute('data-cg-delete'));
      return;
    }

    var cgPreview = t.closest('[data-cg-preview]');
    if (cgPreview) {
      openCampaignPreview(cgPreview.getAttribute('data-cg-preview'));
      return;
    }

    if (t.closest('[data-cg-templates]')) {
      openCampaignTemplates();
      return;
    }

    var useTpl = t.closest('[data-cg-use-template]');
    if (useTpl) {
      closeDrawer();
      cgForm = { step: 0, id: null, draft: newCampaignDraft(useTpl.getAttribute('data-cg-use-template')) };
      goTo('campaigns/create');
      return;
    }

    if (t.closest('[data-cg-export]')) {
      exportCampaigns();
      return;
    }

    if (t.closest('[data-cg-back]')) {
      var backToDrafts = cgPage.page === 'form' && cgPage.id;
      cgForm = null;
      goTo(backToDrafts ? 'campaigns/drafts' : cgListPath(cgPage.tab));
      return;
    }

    if (t.closest('[data-cg-next]')) {
      campaignFormNext();
      return;
    }

    if (t.closest('[data-cg-prev]')) {
      campaignFormPrev();
      return;
    }

    var cgStep = t.closest('[data-cg-step]');
    if (cgStep && cgForm) {
      readCampaignForm();
      cgForm.step = Number(cgStep.getAttribute('data-cg-step'));
      renderCampaignForm();
      window.scrollTo(0, 0);
      return;
    }

    if (t.closest('[data-cg-save-draft]')) {
      saveCampaignDraft();
      return;
    }

    if (t.closest('[data-cg-launch]')) {
      launchCampaign();
      return;
    }

    var cgIndPreview = t.closest('[data-cg-ind-preview]');
    if (cgIndPreview) {
      openIndividualPreview(cgIndPreview.getAttribute('data-cg-ind-preview'));
      return;
    }

    var cgInd = t.closest('[data-cg-ind]');
    if (cgInd && !t.closest('button, a')) {
      openIndividualPreview(cgInd.getAttribute('data-cg-ind'));
      return;
    }

    var cgOpen = t.closest('[data-cg-open]');
    if (cgOpen && !t.closest('button, a, .ar-cg-menu')) {
      var openC = campaignById(cgOpen.getAttribute('data-cg-open'));
      if (openC) goTo('campaigns/' + encodeURIComponent(openC.id) + (openC.status === 'draft' ? '/edit' : ''));
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

    var stTab = t.closest('[data-st-tab]');
    if (stTab) {
      e.preventDefault();
      goTo(stTab.getAttribute('data-st-tab') === 'users' ? 'settings/users' : 'settings');
      return;
    }

    if (t.closest('#st-add')) {
      if (settingsPage.tab === 'users') openUserModal(null);
      else openRoleModal(null);
      return;
    }

    if (t.closest('[data-st-user-save]')) {
      saveUserModal();
      return;
    }

    if (t.closest('[data-st-user-delete]')) {
      deleteUserModal();
      return;
    }

    var editRole = t.closest('[data-st-edit-role]');
    if (editRole) {
      openRoleModal(editRole.getAttribute('data-st-edit-role'));
      return;
    }

    var resend = t.closest('[data-st-resend]');
    if (resend) {
      var invitee = userById(resend.getAttribute('data-st-resend'));
      if (invitee) {
        invitee.invitedOn = TODAY.toISOString();
        saveSettingsStore();
        renderSettings();
        toast('Invite sent again to ' + invitee.email + '.');
      }
      return;
    }

    var editUser = t.closest('[data-st-edit-user]');
    if (editUser) {
      openUserModal(editUser.getAttribute('data-st-edit-user'));
      return;
    }

    if (t.closest('[data-st-save]')) {
      saveRoleModal();
      return;
    }

    if (t.closest('[data-st-delete]')) {
      deleteRoleModal();
      return;
    }

    if (t.closest('#cf-toggle')) {
      var pop = $('cf-pop');
      pop.hidden = !pop.hidden;
      $('cf-toggle').setAttribute('aria-expanded', String(!pop.hidden));
      if (pop.hidden) closeMenus();
      return;
    }

    for (var i = 0; i < MENUS.length; i++) {
      if (t.closest('#' + MENUS[i][0])) {
        if (MENUS[i][1] === 'filter-menu') {
          fsheet.naming = false;
          renderFilterMenu();
        }
        if (MENUS[i][1] === 'bulk-menu') renderBulkMenu();
        if (MENUS[i][1] === 'range-menu' || MENUS[i][1] === 'bill-range-menu') {
          rpFor = MENUS[i][1] === 'bill-range-menu' ? 'bill' : 'dash';
          openRangePicker();
        }
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

    var ffAdd = t.closest('[data-ff-add-place]');
    var ffRemove = t.closest('[data-ff-remove-place]');
    if (ffAdd || ffRemove) {
      var loc = state.filters.vals.location || { mode: 'custom', places: [] };
      var nextPlaces = (loc.places || []).slice();
      if (ffAdd) {
        var placeName = ffAdd.getAttribute('data-ff-add-place');
        if (nextPlaces.indexOf(placeName) === -1) nextPlaces.push(placeName);
      } else {
        nextPlaces = nextPlaces.filter(function (p) { return p !== ffRemove.getAttribute('data-ff-remove-place'); });
      }
      state.filters.vals.location = { mode: 'custom', places: nextPlaces };
      refreshFilterMenu();
      renderStudents();
      if (ffAdd && $('ff-place-q')) { $('ff-place-q').focus(); openFilterPlaces(); }
      return;
    }

    var fchip = t.closest('[data-fchip]');
    if (fchip) {
      var chipBits = fchip.getAttribute('data-fchip').split(':');
      if (chipBits[1]) state.filters.vals[chipBits[0]] = { val: chipBits[1] };
      else delete state.filters.vals[chipBits[0]];
      var fbody = $('filter-menu').querySelector('.ar-fmenu-body');
      var fscroll = fbody ? fbody.scrollTop : 0;
      renderStudents();
      renderFilterMenu();
      fbody = $('filter-menu').querySelector('.ar-fmenu-body');
      if (fbody) fbody.scrollTop = fscroll;
      return;
    }

    var ftab = t.closest('[data-ftab]');
    if (ftab) {
      fsheet.tab = ftab.getAttribute('data-ftab');
      fsheet.naming = false;
      renderFilterMenu();
      return;
    }

    if (t.closest('[data-fsave]')) {
      if (!activeFilterCount()) { toast('Set at least one filter to save.'); return; }
      fsheet.naming = true;
      renderFilterMenu();
      $('fsave-name').focus();
      return;
    }

    if (t.closest('[data-fsave-cancel]')) {
      fsheet.naming = false;
      renderFilterMenu();
      return;
    }

    if (t.closest('[data-fsave-confirm]')) {
      commitSavedFilter();
      return;
    }

    var sfApply = t.closest('[data-fsaved-apply]');
    if (sfApply) {
      var sfPick = savedFilterById(sfApply.getAttribute('data-fsaved-apply'));
      if (sfPick) {
        applySavedFilter(sfPick);
        fsheet.tab = 'new';
        closeMenus();
        toast('Applied “' + sfPick.name + '”.');
      }
      return;
    }

    var sfEdit = t.closest('[data-fsaved-edit]');
    if (sfEdit) {
      var sfEditing = savedFilterById(sfEdit.getAttribute('data-fsaved-edit'));
      if (sfEditing) {
        applySavedFilter(sfEditing);
        fsheet.editId = sfEditing.id;
        fsheet.tab = 'new';
        $('filter-menu').hidden = false;
        renderFilterMenu();
      }
      return;
    }

    var sfDelete = t.closest('[data-fsaved-delete]');
    if (sfDelete) {
      var delId = sfDelete.getAttribute('data-fsaved-delete');
      var gone = savedFilterById(delId);
      SFILTERS = SFILTERS.filter(function (x) { return x.id !== delId; });
      storeSavedFilters();
      if (fsheet.editId === delId) fsheet.editId = null;
      renderFilterMenu();
      if (gone) toast('Deleted “' + gone.name + '”.');
      return;
    }

    if (t.closest('[data-fdone]')) {
      fsheet.editId = null;
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
      var forBill = rpFor === 'bill';
      applyRange();
      closeMenus();
      if (!forBill) renderDashboard();
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
      EF.program = 'all';
      EF.prefId = null;
      EF.cohort = '';
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
        if (facet[0] === 'formats') evPieFocus = facet.slice(1).join(':');
        toggleIn(EF[facet[0]], facet.slice(1).join(':'));
      }
      renderEvents();
      return;
    }

    var evClear = t.closest('[data-ev-clear]');
    if (evClear) {
      var cleared = evClear.getAttribute('data-ev-clear').split(':');
      if (cleared[0] === 'program') { EF.program = 'all'; EF.prefId = null; }
      else if (cleared[0] === 'pref') EF.prefId = null;
      else if (cleared[0] === 'cohort') EF.cohort = '';
      else toggleIn(EF[cleared[0]], cleared.slice(1).join(':'));
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
      if (t.closest('[data-add-subject]')) {
        addCustomSubject();
        return;
      }
      var addPlace = t.closest('[data-add-place]');
      var removePlace = t.closest('[data-remove-place]');
      if (addPlace || removePlace) {
        readEditor();
        var places = editing.draft.criteria.location.places;
        if (addPlace) places.push(addPlace.getAttribute('data-add-place'));
        else places.splice(places.indexOf(removePlace.getAttribute('data-remove-place')), 1);
        rerenderEditor();
        if (addPlace) { $('pe-place-q').focus(); openPlaceList(); }
        return;
      }
      var boardAll = t.closest('[data-board-all]');
      if (boardAll) {
        var boxes = boardAll.closest('.ar-check-group').querySelectorAll('input[name="pe-board"]');
        var allOn = Array.prototype.every.call(boxes, function (b) { return b.checked; });
        Array.prototype.forEach.call(boxes, function (b) { b.checked = !allOn; });
        updatePreview();
        return;
      }
      if ($('pe-place-list') && !t.closest('#pe-place')) $('pe-place-list').hidden = true;
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

  $('evf-pop').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-ev-check]');
    if (!chip) return;
    var bits = chip.getAttribute('data-ev-check').split(':');
    toggleIn(EF[bits[0]], bits.slice(1).join(':'));
    renderEvents();
  });

  $('evf-pop').addEventListener('change', function (e) {
    if (e.target.id === 'evf-program') {
      EF.program = e.target.value;
      EF.prefId = null;
    } else if (e.target.id === 'evf-pref') {
      EF.prefId = e.target.value || null;
    } else if (e.target.id === 'evf-cohort') {
      EF.cohort = e.target.value;
    } else return;
    renderEvents();
  });

  $('ev-insights').addEventListener('change', function (e) {
    if (e.target.id !== 'ev-format-focus') return;
    evPieFocus = e.target.value;
    renderEventInsights();
  });

  $('ev-insights').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var slice = e.target.closest('.ar-ev-slice');
    if (!slice) return;
    e.preventDefault();
    slice.click();
  });

  $('evf-toggle').addEventListener('click', function () {
    var pop = $('evf-pop');
    pop.hidden = !pop.hidden;
    this.setAttribute('aria-expanded', String(!pop.hidden));
  });

  document.addEventListener('click', function (e) {
    var pop = $('evf-pop');
    if (!pop || pop.hidden || e.composedPath().indexOf($('evf-wrap')) !== -1) return;
    pop.hidden = true;
    $('evf-toggle').setAttribute('aria-expanded', 'false');
  });

  $('bill-history').addEventListener('click', openRechargeHistory);

  $('ev-search').addEventListener('input', function (e) {
    EF.q = e.target.value;
    renderEventInsights();
    renderEventBoard();
  });

  $('cgf-toggle').addEventListener('click', function () {
    var pop = $('cgf-pop');
    pop.hidden = !pop.hidden;
    this.setAttribute('aria-expanded', String(!pop.hidden));
  });

  $('cgf-clear').addEventListener('click', function () {
    CGF.channel = 'all';
    CGF.program = 'all';
    CGF.sort = 'new';
    renderCampaignList();
  });

  document.addEventListener('click', function (e) {
    var pop = $('cgf-pop');
    if (pop.hidden || e.composedPath().indexOf($('cgf-wrap')) !== -1) return;
    pop.hidden = true;
    $('cgf-toggle').setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', function (e) {
    var pop = $('cf-pop');
    if (pop.hidden || e.composedPath().indexOf($('cf-wrap')) !== -1) return;
    pop.hidden = true;
    $('cf-toggle').setAttribute('aria-expanded', 'false');
  });

  $('cg-insights').addEventListener('mousemove', moveCgChartTip);
  $('cg-insights').addEventListener('mouseleave', function () {
    $('cg-insights').querySelectorAll('.ar-achart-cursor, .ar-achart-tip').forEach(function (el) { el.hidden = true; });
  });

  $('trend-chart').addEventListener('mousemove', moveStageChartTip);
  $('trend-chart').addEventListener('click', selectChartDate);

  $('trend-chart').addEventListener('mouseleave', function () {
    document.querySelectorAll('.ar-achart-cursor, .ar-achart-tip').forEach(function (el) { el.hidden = true; });  });

  $('view-campaigns').addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'cg-search') {
      CGF.q = e.target.value;
      renderCampaignList();
      return;
    }
    if (id === 'cg-text' || id === 'cg-subject') {
      readCampaignForm();
      updateCampaignPreview();
    }
  });

  $('view-campaigns').addEventListener('change', function (e) {
    var id = e.target.id;
    var filterKey = { 'cgf-channel': 'channel', 'cgf-program': 'program', 'cgf-sort': 'sort' }[id];
    if (filterKey) {
      CGF[filterKey] = e.target.value;
      renderCampaignList();
      return;
    }
    if (!cgForm) return;
    var d = cgForm.draft;
    if (e.target.name === 'cg-channel') {
      readCampaignForm();
      renderCampaignForm();
      return;
    }
    if (id === 'cg-template') {
      readCampaignForm();
      var tpl = templateById(d.template);
      if (tpl.id !== 'custom') {
        d.subject = tpl.subject;
        d.text = tpl.text;
      }
      renderCampaignForm();
      return;
    }
    if (id.indexOf('cga-') === 0) {
      readCampaignForm();
      var a = d.audience;
      if (id === 'cga-program') {
        a.prefId = '';
        a.minScore = '0';
        a.savedFilter = '';
      }
      if (id === 'cga-prefId' && !a.prefId) a.minScore = '0';
      if (id === 'cga-savedFilter' && a.savedFilter === 'saved') {
        var saved = savedFilterInfo('all');
        if (saved) {
          a.program = programById(saved.program) ? saved.program : 'all';
          a.prefId = a.program !== 'all' && saved.prefId ? saved.prefId : '';
          a.minScore = '0';
          a.intake = saved.intake || '';
        }
      }
      renderCampaignForm();
    }
  });

  $('events-create-page').addEventListener('change', function (e) {
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
    var tag = e.target.tagName;
    if (tag === 'SELECT' || e.target.type === 'radio' || e.target.type === 'checkbox') {
      if (e.target.id === 'evc-program') evCreate.draft.prefId = '';
      renderEventCreate();
    }
  });

  $('events-create-page').addEventListener('input', function (e) {
    if (!evCreate) return;
    if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && e.target.type === 'text')) readEventCreate();
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
    if (e.target.getAttribute('data-st-access')) {
      e.target.closest('.ar-st-access-row').classList.toggle('on', e.target.checked);
      return;
    }
    if (e.target.id === 'st-user-role') {
      $('st-user-access').innerHTML = roleAccessHtml(e.target.value);
      return;
    }
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
      updatePreview();
      return;
    }
    if (e.target.name === 'pe-loc-mode' || e.target.hasAttribute('data-test-mode')) {
      readEditor();
      rerenderEditor();
      if (e.target.name === 'pe-loc-mode' && $('pe-place-q')) $('pe-place-q').focus();
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

  $('drawer-body').addEventListener('focusin', function (e) {
    if (editing && e.target.id === 'pe-place-q') openPlaceList();
  });

  $('drawer-body').addEventListener('input', function (e) {
    if (editing && e.target.id === 'pe-place-q') openPlaceList();
  });

  $('drawer-body').addEventListener('keydown', function (e) {
    if (editing && e.target.id === 'pe-place-q' && e.key === 'Escape') {
      e.stopPropagation();
      $('pe-place-list').hidden = true;
      return;
    }
    if (!editing || e.key !== 'Enter') return;
    if (e.target.id === 'pe-place-q') {
      e.preventDefault();
      var first = $('pe-place-list').querySelector('[data-add-place]');
      if (first) first.click();
      return;
    }
    if (e.target.id === 'pe-subject-new') {
      e.preventDefault();
      addCustomSubject();
    } else if (e.target.id === 'pe-activity-new') {
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
    if (e.target.id === 'ff-place-q') { openFilterPlaces(); return; }
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
    if (bits[0] === 'test') {
      var slot = bits.pop();
      var testName = decodeURIComponent(bits.slice(1).join(':'));
      var next = {};
      var prevRanges = testRanges(vals.test);
      Object.keys(prevRanges).forEach(function (n) { next[n] = { min: prevRanges[n].min || '', max: prevRanges[n].max || '' }; });
      next[testName] = next[testName] || { min: '', max: '' };
      next[testName][slot] = v === '' || isNaN(Number(v)) ? '' : v;
      Object.keys(next).forEach(function (n) {
        if (!next[n].min && !next[n].max) delete next[n];
      });
      if (Object.keys(next).length) vals.test = { tests: next };
      else delete vals.test;
      renderStudents();
      return;
    }
    vals[bits[0]] = vals[bits[0]] || {};
    vals[bits[0]][bits[1]] = v === '' || isNaN(Number(v)) ? '' : v;
    renderStudents();
  });

  $('filter-menu').addEventListener('keydown', function (e) {
    if (e.target.id === 'ff-place-q' && e.key === 'Enter') {
      e.preventDefault();
      var firstPlace = $('ff-place-list') && $('ff-place-list').querySelector('[data-ff-add-place]');
      if (firstPlace) firstPlace.click();
      return;
    }
    if (e.target.id !== 'fsave-name') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSavedFilter();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      fsheet.naming = false;
      renderFilterMenu();
    }
  });

  $('filter-menu').addEventListener('change', function (e) {
    var multi = e.target.getAttribute('data-ff');
    if (multi) {
      var cur = ((state.filters.vals[multi] && state.filters.vals[multi].vals) || []).filter(function (x) { return x !== e.target.value; });
      if (e.target.checked) cur.push(e.target.value);
      if (cur.length) state.filters.vals[multi] = { vals: cur };
      else delete state.filters.vals[multi];
      renderStudents();
      return;
    }
    if (e.target.name === 'ff-loc-mode') {
      if (!e.target.value) delete state.filters.vals.location;
      else {
        var prevLoc = state.filters.vals.location || {};
        state.filters.vals.location = { mode: e.target.value, places: prevLoc.places || [] };
      }
      refreshFilterMenu();
      renderStudents();
      return;
    }
    if (e.target.hasAttribute('data-fintake')) setIntake(e.target.value);
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
