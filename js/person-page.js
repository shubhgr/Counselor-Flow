/**
 * Unified person profile — used from People, Chats, Meet, Dashboard, Community.
 */
(function () {
  var INTAKE_KEY = 'gradright_person_intake_v1';
  var FOLLOW_KEY = 'gradright_person_follows_v1';

  var INTAKES = ['Fall 2026', 'Spring 2027', 'Fall 2027', 'Spring 2028'];
  var DEGREES = [
    'MS Computer Science',
    'MS Data Science',
    'MBA',
    'MS Mechanical Engineering',
    'MA Economics',
    'MS Business Analytics',
  ];
  var BUDGETS = ['₹20–30 L', '₹30–45 L', '₹45–60 L', '$60–80k', '$80–120k'];
  var COUNTRIES = ['USA', 'Canada', 'UK', 'Germany', 'Australia'];
  var UNI_TYPES = ['Public research (R1)', 'Private research', 'Liberal arts', 'Specialized / STEM'];
  var MESSAGES = [
    'That meet helped a lot. I’ll revise the UC Davis and Northeastern rows tonight.',
    'Shared the SOP draft — can you mark the weak paragraphs?',
    'Need a visa checklist before the October slot.',
    'Parent here. Kabir is leaning Canada if SDS stays on track.',
  ];

  var COMMUNITY = {
    'Aarav Reddy': {
      type: 'student',
      roleLine: 'Student · USA · CS Masters',
      bio: 'Building a California shortlist and working on SOP drafts with GradRight counselors.',
      followers: 5,
      following: 3,
      posts: [
        {
          time: '3d ago',
          tag: 'US STEM',
          likes: 19,
          body:
            'How many safety schools should I keep if I only want California CS programs? My counselor suggested adding Midwest options but I am unsure how far to stretch.',
        },
      ],
    },
    'Rohan Kulkarni': {
      type: 'counselor',
      roleLine: 'Counselor · Canada pathways',
      bio: 'Helps students with SDS timelines, college shortlists, and attestation routes across Canada.',
      followers: 4,
      following: 3,
      posts: [
        {
          time: '2h ago',
          tag: 'Canada pathways',
          likes: 24,
          body:
            'Students applying for fall Canada intake: what is blocking you right now? SDS timeline, proof of funds format, or study plan? Reply with your stage and I will share the checklist piece that usually unblocks it.',
        },
      ],
    },
    'Ananya Lal': {
      type: 'counselor',
      roleLine: 'Counselor · SOP craft',
      bio: 'Guides students on story-led SOPs for UK and US masters applications.',
      followers: 8,
      following: 4,
      posts: [
        {
          time: 'Yesterday',
          tag: 'SOP help',
          likes: 16,
          body: 'One specific module, one past project, one contribution line. Keep the first sentence under 25 words.',
        },
      ],
    },
    'Jia Das': {
      type: 'student',
      roleLine: 'Student · Australia · CS',
      bio: 'Preparing Australian CS masters applications and visa timing questions.',
      followers: 3,
      following: 6,
      posts: [],
    },
    'Meera Kapoor': {
      type: 'student',
      roleLine: 'Student · UK · Business',
      bio: 'Targeting Warwick and LSE, looking for SOP and interview advice.',
      followers: 2,
      following: 5,
      posts: [
        {
          time: 'Yesterday',
          tag: 'SOP help',
          likes: 41,
          body:
            'Stuck on the “why this program” section for Warwick Business. Everything I write sounds generic. Has anyone found a simple structure that still feels personal?',
        },
      ],
    },
    'Sohan Malhotra': {
      type: 'parent',
      roleLine: 'Parent · Canada pathways',
      bio: 'Supporting Kabir’s Canada applications and SDS timeline.',
      followers: 1,
      following: 2,
      posts: [],
    },
  };

  function params() {
    return new URLSearchParams(location.search);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hashSeed(value) {
    var n = 2166136261;
    var s = String(value || '');
    for (var i = 0; i < s.length; i++) n = ((n ^ s.charCodeAt(i)) * 16777619) >>> 0;
    return n;
  }

  function pick(list, seed) {
    return list[hashSeed(seed) % list.length];
  }

  function readStore(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function backHref(from, id) {
    if (from === 'chats' && id) return 'chats.html?id=' + encodeURIComponent(id);
    if (from === 'calls') return 'calls.html';
    if (from === 'call' && id) return 'call.html?id=' + encodeURIComponent(id);
    if (from === 'dashboard') return 'dashboard.html';
    if (from === 'community') return 'community.html';
    if (from === 'transactions') return 'transactions.html';
    return 'students.html';
  }

  function findByName(name) {
    var list = (window.GradRightDB && GradRightDB.people) || [];
    var key = String(name || '').trim().toLowerCase();
    return (
      list.filter(function (p) {
        return p && String(p.name || '').trim().toLowerCase() === key;
      })[0] || null
    );
  }

  function initialsFrom(name) {
    return (
      String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function (w) {
          return w.charAt(0).toUpperCase();
        })
        .join('') || 'P'
    );
  }

  function communityOf(name) {
    return COMMUNITY[name] || null;
  }

  function resolvePerson() {
    var q = params();
    var id = q.get('id') || '';
    var name = q.get('name') || '';
    var db = window.GradRightDB && GradRightDB.byId;
    var person = (id && db && db[id]) || (name && findByName(name)) || null;
    if (person) return person;
    if (!name) return null;
    var comm = communityOf(name);
    return {
      id: 'c:' + name,
      name: name,
      initials: (comm && comm.initials) || initialsFrom(name),
      role: q.get('role') || (comm && comm.type) || 'student',
      connected: false,
      email: '',
      source: 'Community',
      communityOnly: true,
    };
  }

  var PLAN_FOR = {
    aarav: {
      intake: 'Fall 2026',
      degree: 'MS Computer Science',
      budget: '$80–120k',
      country: 'USA',
      uniType: 'Public research (R1)',
    },
    meera: {
      intake: 'Fall 2026',
      degree: 'MBA',
      budget: '₹45–60 L',
      country: 'UK',
      uniType: 'Private research',
    },
    jia: {
      intake: 'Spring 2027',
      degree: 'MS Computer Science',
      budget: '$60–80k',
      country: 'Australia',
      uniType: 'Public research (R1)',
    },
    tanvi: {
      intake: 'Spring 2027',
      degree: 'MS Data Science',
      budget: '₹30–45 L',
      country: 'Canada',
      uniType: 'Specialized / STEM',
    },
  };

  function defaultPlan(person) {
    var key = person.id || person.name;
    var child = person.forWho || (person.role === 'parent' ? 'their child' : '');
    var known = PLAN_FOR[person.id] || PLAN_FOR[String(person.name || '').toLowerCase()];
    return Object.assign(
      {
        intake: pick(INTAKES, key + 'intake'),
        degree: pick(DEGREES, key + 'degree'),
        budget: pick(BUDGETS, key + 'budget'),
        country: pick(COUNTRIES, key + 'country'),
        uniType: pick(UNI_TYPES, key + 'unitype'),
        forWho: child,
      },
      known || {}
    );
  }

  function studyPlan(person) {
    var base = defaultPlan(person);
    var saved = readStore(INTAKE_KEY)[person.id];
    return saved ? Object.assign({}, base, saved) : base;
  }

  function savePlan(personId, patch) {
    var all = readStore(INTAKE_KEY);
    all[personId] = Object.assign({}, all[personId] || {}, patch);
    writeStore(INTAKE_KEY, all);
  }

  function isFollowing(name) {
    return !!readStore(FOLLOW_KEY)[name];
  }

  function setFollowing(name, on) {
    var all = readStore(FOLLOW_KEY);
    if (on) all[name] = true;
    else delete all[name];
    writeStore(FOLLOW_KEY, all);
  }

  function aiSummary(person, plan, comm) {
    if (person.role === 'counselor' || person.role === 'professor') {
      return (
        (comm && comm.bio) ||
        person.name +
          ' is active in Community. Review their posts and marketplace listing before you follow or reach out.'
      );
    }
    if (person.communityOnly && !person.connected) {
      return (
        person.name +
        ' is targeting a ' +
        plan.degree +
        ' for ' +
        plan.intake +
        ' in ' +
        plan.country +
        '. Use their posts and intake notes before you follow or connect.'
      );
    }
    if (person.role === 'parent') {
      return (
        (plan.forWho ? plan.forWho + '’s parent' : person.name) +
        ' is planning a ' +
        plan.degree +
        ' for ' +
        plan.intake +
        ' in ' +
        plan.country +
        '. Budget sits around ' +
        plan.budget +
        '. Focus the next meet on ' +
        (person.service || 'pathway fit') +
        ' and a shortlist that matches ' +
        plan.uniType.toLowerCase() +
        ' campuses.'
      );
    }
    return (
      person.name +
      ' is targeting a ' +
      plan.degree +
      ' for ' +
      plan.intake +
      ' in ' +
      plan.country +
      ', with a ' +
      plan.budget +
      ' budget and a preference for ' +
      plan.uniType.toLowerCase() +
      ' universities. Lead with ' +
      (person.service || 'college shortlisting') +
      ' and keep the next booking on that track.'
    );
  }

  function lastMessage(person) {
    return {
      text: pick(MESSAGES, person.id + 'msg'),
      when: 'Wed, 23 Sep · 12:08 PM',
    };
  }

  function roleBadge(role) {
    if (role === 'parent') return '<span class="role-badge parent">Parent</span>';
    if (role === 'counselor') return '<span class="role-badge counselor">Counselor</span>';
    if (role === 'professor') return '<span class="role-badge professor">Professor</span>';
    return '<span class="role-badge student">Student</span>';
  }

  function factRow(label, value, extraClass) {
    return (
      '<div class="call-fact' +
      (extraClass ? ' ' + extraClass : '') +
      '"><span>' +
      escapeHtml(label) +
      '</span><strong>' +
      escapeHtml(value) +
      '</strong></div>'
    );
  }

  function applyPatch(call) {
    try {
      var raw = localStorage.getItem('gradright_dash_call_patches_v1');
      var saved = raw ? JSON.parse(raw) : {};
      return Object.assign({}, call, (saved && saved[call.id]) || {});
    } catch (e) {
      return call;
    }
  }

  function personCalls(personId) {
    return ((window.GradRightCalls && GradRightCalls.forPerson && GradRightCalls.forPerson(personId)) || [])
      .map(applyPatch)
      .filter(function (c) {
        return c.status !== 'cancelled';
      });
  }

  function phaseOf(call) {
    return (window.GradRightCalls && GradRightCalls.phase && GradRightCalls.phase(call)) || 'completed';
  }

  function nextMeet(calls) {
    return (
      calls.filter(function (c) {
        var p = phaseOf(c);
        return p === 'ongoing' || p === 'upcoming';
      })[0] || null
    );
  }

  function prefField(label, value) {
    return (
      '<div class="person-pref"><span>' +
      escapeHtml(label) +
      '</span><strong>' +
      escapeHtml(value) +
      '</strong></div>'
    );
  }

  function bookingsHtml(calls, from) {
    if (!calls.length) return '<p class="hint-text">No bookings yet.</p>';
    var clock = window.GradRightCalls && GradRightCalls.formatClock;
    var dayLabel = window.GradRightCalls && GradRightCalls.dayLabel;
    var hint = window.GradRightCalls && GradRightCalls.hint;
    return (
      '<div class="dash-agenda-group">' +
      calls
        .map(function (call) {
          var phase = phaseOf(call);
          var cardPhase = phase === 'ongoing' ? 'live' : phase === 'completed' ? 'done' : phase;
          var liveHint =
            phase === 'ongoing' && window.GradRightCalls && GradRightCalls.liveLeftText
              ? GradRightCalls.liveLeftText(call)
              : hint
                ? hint(call)
                : '';
          var action =
            phase === 'ongoing' || phase === 'upcoming'
              ? '<a class="dash-join" href="call.html?id=' +
                encodeURIComponent(call.personId || '') +
                '&from=profile">' +
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
            escapeHtml(liveHint) +
            '</span></div>' +
            action +
            '</div></div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function panel(title, body, extraClass) {
    return (
      '<section class="panel' +
      (extraClass ? ' ' + extraClass : '') +
      '"><div class="panel-head"><h2>' +
      escapeHtml(title) +
      '</h2></div>' +
      body +
      '</section>'
    );
  }

  function postsHtml(posts) {
    if (!posts || !posts.length) return '<p class="hint-text">No posts yet.</p>';
    return posts
      .map(function (p) {
        return (
          '<article class="c-activity-item compact"><div class="c-activity-label">Post · ' +
          escapeHtml(p.time) +
          (p.tag ? ' · ' + escapeHtml(p.tag) : '') +
          '</div><p>' +
          escapeHtml(p.body) +
          '</p><div class="c-activity-meta">' +
          escapeHtml(String(p.likes || 0)) +
          ' likes</div></article>'
        );
      })
      .join('');
  }

  function showStudyPlan(person) {
    return person.role !== 'counselor' && person.role !== 'professor';
  }

  function render() {
    var q = params();
    var from = q.get('from') || 'people';
    var person = resolvePerson();
    var root = document.getElementById('person-root');
    var back = document.getElementById('person-back');
    var title = document.getElementById('person-top-title');
    var actions = document.getElementById('person-top-actions');
    if (!root) return;
    if (!person) {
      root.innerHTML =
        '<section class="panel"><p>No profile found. <a href="students.html">Back to People</a></p></section>';
      return;
    }

    var plan = studyPlan(person);
    var comm = communityOf(person.name);
    var calls = person.communityOnly ? [] : personCalls(person.id);
    var featuredId = q.get('call') || '';
    var featured =
      (featuredId &&
        calls.filter(function (c) {
          return c.id === featuredId;
        })[0]) ||
      nextMeet(calls);
    var chatHref = person.connected ? 'chats.html?id=' + encodeURIComponent(person.id) : '';
    var joinHref = featured
      ? 'call.html?id=' + encodeURIComponent(person.id) + '&from=profile'
      : '';
    var db = window.GradRightDB;
    var paid = !!(person.connected && db);
    var following = isFollowing(person.name);
    var featuredPhase = featured ? phaseOf(featured) : '';

    if (back) back.href = backHref(from, person.communityOnly ? '' : person.id);
    if (title) title.textContent = person.name;
    document.title = person.name + ' — GradRight Counselor';
    if (actions) {
      actions.innerHTML = chatHref
        ? '<a class="btn btn-primary btn-sm" href="' + chatHref + '">Chat</a>'
        : '';
    }

    var heroMeta = [];
    if (comm && comm.roleLine) heroMeta.push(escapeHtml(comm.roleLine));
    else if (person.forWho) heroMeta.push('For ' + escapeHtml(person.forWho));
    if (person.email) heroMeta.push(escapeHtml(person.email));
    if (person.source || person.lastSource) {
      heroMeta.push('Source · ' + escapeHtml(person.source || person.lastSource));
    }
    if (person.connectedOn && db && db.formatWhen) {
      heroMeta.push('Connected · ' + escapeHtml(db.formatWhen(person.connectedOn, db.today)));
    }

    var actionBtns = '';
    if (featured && (featuredPhase === 'ongoing' || featuredPhase === 'upcoming')) {
      actionBtns +=
        '<a class="btn btn-primary" href="' +
        joinHref +
        '">' +
        (featuredPhase === 'ongoing' ? 'Join now' : 'Join') +
        '</a>';
    }
    if (chatHref) {
      actionBtns +=
        '<a class="btn ' +
        (actionBtns ? 'btn-secondary' : 'btn-primary') +
        '" href="' +
        chatHref +
        '">Chat</a>';
    }
    if (comm && person.role !== 'counselor' && !person.connected) {
      actionBtns +=
        '<button type="button" class="btn ' +
        (following ? 'btn-secondary' : actionBtns ? 'btn-secondary' : 'btn-primary') +
        '" id="person-follow">' +
        (following ? 'Following' : 'Follow') +
        '</button>';
    } else if (comm && !person.connected && person.role === 'counselor') {
      actionBtns +=
        '<button type="button" class="btn ' +
        (following ? 'btn-secondary' : 'btn-secondary') +
        '" id="person-follow">' +
        (following ? 'Following' : 'Follow') +
        '</button>';
    }
    if (person.role === 'counselor' || person.role === 'professor') {
      actionBtns += '<a class="btn btn-secondary" href="counselor-public.html">View marketplace listing</a>';
    }

    var nextMeetHtml = '';
    if (featured) {
      var when =
        (window.GradRightCalls && GradRightCalls.dayLabel ? GradRightCalls.dayLabel(featured.day) : featured.day) +
        ', ' +
        (window.GradRightCalls && GradRightCalls.formatClock
          ? GradRightCalls.formatClock(featured.time)
          : featured.time);
      var statusLabel =
        featuredPhase === 'ongoing'
          ? 'Ongoing'
          : featuredPhase === 'upcoming'
            ? 'Upcoming'
            : featuredPhase === 'missed'
              ? 'Missed'
              : 'Done';
      nextMeetHtml = panel(
        featuredPhase === 'ongoing' || featuredPhase === 'upcoming' ? 'Next meet' : 'Meet',
        '<div class="person-facts">' +
          factRow('When', when) +
          factRow(
            'Booked',
            db && db.formatWhen ? db.formatWhen(featured.bookedOn, db.today) : featured.bookedOn || '—'
          ) +
          factRow('Length', String(featured.mins || 30) + ' min') +
          factRow('Status', statusLabel, 'is-' + featuredPhase) +
          '</div>'
      );
    }

    var prefsHtml = showStudyPlan(person)
      ? panel(
          person.role === 'parent'
            ? 'Study plan' + (plan.forWho ? ' · ' + plan.forWho : '')
            : 'Study plan',
          '<div class="person-pref-grid">' +
            prefField('Intake required', plan.intake) +
            prefField('Required degree', plan.degree) +
            prefField('Budget', plan.budget) +
            prefField('Preferred country', plan.country) +
            prefField('Preferred university type', plan.uniType) +
            '</div>'
        )
      : '';

    var paymentHtml = '';
    if (paid) {
      paymentHtml = panel(
        'Payment',
        '<div class="person-amount">' +
          escapeHtml(db.formatInr(db.connectAmount(person))) +
          '</div><p class="hint-text">Connect fee</p><div class="person-facts">' +
          factRow('Txn ID', db.txnIdFor(person)) +
          factRow('UTR', db.txnUtrFor(person)) +
          factRow('Paid', db.formatWhen(person.connectedOn, db.today)) +
          factRow('Status', 'Paid') +
          factRow('Method', db.txnMethodFor(person)) +
          factRow('Source', person.source || person.lastSource || 'Marketplace') +
          factRow('Service', person.service || 'Connect') +
          (person.forWho ? factRow('For', person.forWho) : '') +
          '</div>'
      );
    }

    var msg = lastMessage(person);
    var lastHtml =
      person.communityOnly || !person.connected
        ? ''
        : panel(
            'Last message',
            '<div class="c-activity-item compact"><p>' +
              escapeHtml(msg.text) +
              '</p><div class="c-activity-meta">' +
              escapeHtml(msg.when) +
              '</div></div>'
          );

    var communityHtml = '';
    if (comm) {
      communityHtml = panel(
        'Community',
        '<div class="c-profile-stats person-stats">' +
          '<div><strong>' +
          comm.posts.length +
          '</strong><span>Posts</span></div>' +
          '<div><strong>' +
          comm.followers +
          '</strong><span>Followers</span></div>' +
          '<div><strong>' +
          comm.following +
          '</strong><span>Following</span></div>' +
          '</div>' +
          (comm.bio ? '<p class="person-bio">' + escapeHtml(comm.bio) + '</p>' : '') +
          '<div class="person-posts">' +
          postsHtml(comm.posts) +
          '</div>'
      );
    }

    var bookingsBlock = person.communityOnly ? '' : panel('Bookings', bookingsHtml(calls, from));

    root.innerHTML =
      '<section class="panel person-hero">' +
      '<div class="avatar lg' +
      (person.amber ? ' amber' : '') +
      '">' +
      escapeHtml(person.initials) +
      '</div>' +
      '<h2>' +
      escapeHtml(person.name) +
      '</h2>' +
      '<div class="c-profile-badge-row">' +
      roleBadge(person.role) +
      '</div>' +
      (heroMeta.length ? '<p class="person-hero-meta">' + heroMeta.join('<br>') + '</p>' : '') +
      (actionBtns ? '<div class="person-actions">' + actionBtns + '</div>' : '') +
      '</section>' +
      panel(
        'AI summary',
        '<div class="person-ai"><div class="person-ai-label"><span class="material-symbols-rounded" aria-hidden="true">auto_awesome</span>Profile read</div><p>' +
          escapeHtml(aiSummary(person, plan, comm)) +
          '</p></div>'
      ) +
      '<div class="person-grid">' +
      '<div class="person-col">' +
      prefsHtml +
      '</div><div class="person-col">' +
      nextMeetHtml +
      bookingsBlock +
      paymentHtml +
      lastHtml +
      '</div></div>' +
      communityHtml +
      ((window.GradRightSafety && GradRightSafety.actionsHtml(person)) || '');

    bind(person, calls);
  }

  function bind(person, calls) {
    var follow = document.getElementById('person-follow');
    if (follow) {
      follow.addEventListener('click', function () {
        var on = !isFollowing(person.name);
        setFollowing(person.name, on);
        follow.textContent = on ? 'Following' : 'Follow';
        follow.classList.toggle('btn-primary', !on);
        follow.classList.toggle('btn-secondary', on);
      });
    }

    if (
      calls.some(function (c) {
        return phaseOf(c) === 'ongoing';
      })
    ) {
      window.setInterval(function () {
        document.querySelectorAll('[data-live-left]').forEach(function (el) {
          var id = el.getAttribute('data-live-left');
          var call = calls.filter(function (c) {
            return c.id === id;
          })[0];
          if (call && window.GradRightCalls && GradRightCalls.liveLeftText) {
            el.textContent = GradRightCalls.liveLeftText(call);
          }
        });
      }, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
