/**
 * Shared call profile panel — People-style card used on Calls + Dashboard.
 */
(function () {
  var PATCH_KEY = 'gradright_dash_call_patches_v1';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadPatches() {
    try {
      var raw = localStorage.getItem(PATCH_KEY);
      var saved = raw ? JSON.parse(raw) : {};
      return saved && typeof saved === 'object' ? saved : {};
    } catch (e) {
      return {};
    }
  }

  function applyPatch(call) {
    return Object.assign({}, call, loadPatches()[call.id] || {});
  }

  function roleBadge(role) {
    return role === 'parent'
      ? '<span class="role-badge parent">Parent</span>'
      : '<span class="role-badge student">Student</span>';
  }

  function phaseOf(call) {
    return (window.GradRightCalls && GradRightCalls.phase && GradRightCalls.phase(call)) || 'completed';
  }

  function phaseLabel(phase) {
    if (phase === 'ongoing') return 'Ongoing';
    if (phase === 'upcoming') return 'Upcoming';
    if (phase === 'missed') return 'Missed';
    return 'Completed';
  }

  function whenHappening(call) {
    var day =
      window.GradRightCalls && GradRightCalls.dayLabel
        ? GradRightCalls.dayLabel(call.day)
        : call.day;
    var clock =
      window.GradRightCalls && GradRightCalls.formatClock
        ? GradRightCalls.formatClock(call.time)
        : call.time;
    return day + ', ' + clock;
  }

  function bookedWhen(call) {
    var stamp = call.bookedOn;
    if (window.GradRightDB && GradRightDB.formatWhen) {
      return GradRightDB.formatWhen(stamp, GradRightDB.today);
    }
    return stamp || '—';
  }

  function bookingsHtml(personId, from) {
    var calls = ((window.GradRightCalls && GradRightCalls.forPerson && GradRightCalls.forPerson(personId)) || [])
      .map(applyPatch)
      .filter(function (c) {
        return c.status !== 'cancelled';
      });
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
          var action =
            phase === 'ongoing' || phase === 'upcoming'
              ? '<a class="dash-join" href="call.html?id=' +
                encodeURIComponent(call.personId || personId) +
                '&from=' +
                encodeURIComponent(from) +
                '">' +
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
                  : ''
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

  function cardHtml(call, opts) {
    opts = opts || {};
    var from = opts.from || 'calls';
    call = applyPatch(call);
    var person =
      (window.GradRightDB && GradRightDB.byId && GradRightDB.byId[call.personId]) || {};
    var phase = phaseOf(call);
    var joinHref =
      'call.html?id=' + encodeURIComponent(call.personId || '') + '&from=' + encodeURIComponent(from);
    var chatHref = 'chats.html?id=' + encodeURIComponent(call.personId || '');
    var actions = '';
    if (phase === 'ongoing' || phase === 'upcoming') {
      actions +=
        '<a class="btn btn-primary" href="' +
        joinHref +
        '">' +
        (phase === 'ongoing' ? 'Join now' : 'Join') +
        '</a>';
    }
    actions += '<a class="btn' + (actions ? ' btn-secondary' : ' btn-primary') + '" href="' + chatHref + '">Chat</a>';
    return (
      '<div class="cpp-card">' +
      '<div class="avatar lg' +
      (call.amber ? ' amber' : '') +
      '">' +
      escapeHtml(call.initials) +
      '</div>' +
      '<h2>' +
      escapeHtml(call.name) +
      '</h2>' +
      '<div class="c-profile-badge-row">' +
      roleBadge(call.role) +
      '</div>' +
      '<div class="call-panel-facts">' +
      '<div class="call-fact"><span>When</span><strong>' +
      escapeHtml(whenHappening(call)) +
      '</strong></div>' +
      '<div class="call-fact"><span>Booked</span><strong>' +
      escapeHtml(bookedWhen(call)) +
      '</strong></div>' +
      '<div class="call-fact"><span>Length</span><strong>' +
      escapeHtml(String(call.mins || 30) + ' min') +
      '</strong></div>' +
      '<div class="call-fact is-' +
      escapeHtml(phase) +
      '"><span>Status</span><strong>' +
      escapeHtml(phaseLabel(phase)) +
      '</strong></div>' +
      '</div>' +
      '<div class="call-panel-actions">' +
      actions +
      '</div>' +
      '<div class="cpp-section"><h3>Bookings</h3>' +
      bookingsHtml(call.personId, from) +
      '</div>' +
      ((window.GradRightSafety &&
        GradRightSafety.actionsHtml({
          id: call.personId,
          name: call.name,
          initials: call.initials,
          role: call.role,
          email: person.email,
          amber: call.amber,
        })) ||
        '') +
      '</div>'
    );
  }

  window.GradRightCallPanel = {
    cardHtml: cardHtml,
  };
})();
