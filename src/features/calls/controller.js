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

  (function () {
    var PATCH_KEY = 'gradright_dash_call_patches_v1';
    var CLOCK_KEY = 'gradright_dash_clock_started_v1';
    var selected = null;
    var query = '';
    var statusFilter = 'all';
    const anchor = new Date((window.GradRightCalls?.todayKey || '2026-09-23') + 'T00:00:00');
    const rangeStart = new Date(anchor);
    rangeStart.setDate(anchor.getDate() - 29);
    const dateKey = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    var dateRange = { preset: '30', start: dateKey(rangeStart), end: dateKey(anchor) };

    function isPendingAccount() {
      if (window.GradRightSession && GradRightSession.get) {
        var s = GradRightSession.get();
        if (s) return !s.verified;
      }
      return !!(document.body && document.body.classList.contains('is-unverified'));
    }

    function clockStarted() {
      try {
        var started = Number(sessionStorage.getItem(CLOCK_KEY) || 0);
        if (!started) {
          started = Date.now();
          sessionStorage.setItem(CLOCK_KEY, String(started));
        }
        return started;
      } catch (e) {
        return Date.now();
      }
    }

    function nowMinutes() {
      return 18 * 60 + (Date.now() - clockStarted()) / 60000;
    }

    function timeToMinutes(hhmm) {
      var p = String(hhmm || '').split(':');
      return Number(p[0] || 0) * 60 + Number(p[1] || 0);
    }

    function liveLeftText(call) {
      var end = timeToMinutes(call.time) + (Number(call.mins) || 30);
      var left = Math.max(0, Math.round((end - nowMinutes()) * 60));
      if (left <= 0) return 'Ending now';
      var m = Math.floor(left / 60);
      var s = left % 60;
      return 'Ending in ' + m + ':' + String(s).padStart(2, '0') + ' minutes';
    }

    function esc(value) {
      return String(value || '').replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
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

    function savePatches(patches) {
      try {
        localStorage.setItem(PATCH_KEY, JSON.stringify(patches));
      } catch (e) {}
    }

    function patchCall(id, fields) {
      var patches = loadPatches();
      patches[id] = Object.assign({}, patches[id], fields);
      savePatches(patches);
    }

    function openSlots() {
      var booked = allBookings()
        .filter(function (call) {
          return call.status !== 'cancelled' && call.status !== 'moved';
        })
        .map(function (call) {
          return { day: call.day, time: call.time, mins: call.mins };
        });
      var today = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
      if (window.GradRightCalendar && GradRightCalendar.openSlots) {
        return GradRightCalendar.openSlots(today, {
          afterMinutes: nowMinutes(),
          booked: booked,
          limit: 6,
        });
      }
      return [];
    }

    function phaseOf(call) {
      return (
        (window.GradRightCalls && GradRightCalls.phase && GradRightCalls.phase(call)) || 'completed'
      );
    }

    function allBookings() {
      var patches = loadPatches();
      var rows = window.GradRightCalls && GradRightCalls.all ? GradRightCalls.all() : [];
      return rows
        .map(function (call) {
          return Object.assign({}, call, patches[call.id] || {});
        })
        .filter(function (call) {
          return call.status !== 'cancelled';
        });
    }

    function bookings() {
      if (isPendingAccount()) return [];
      return allBookings();
    }

    function byId(id) {
      return (
        bookings().filter(function (c) {
          return c.id === id;
        })[0] || null
      );
    }

    function roleBadge(role) {
      return role === 'parent'
        ? '<span class="role-badge parent">Parent</span>'
        : '<span class="role-badge student">Student</span>';
    }

    function clock(call) {
      return window.GradRightCalls && GradRightCalls.formatClock
        ? GradRightCalls.formatClock(call.time)
        : call.time;
    }

    function dayLabel(call) {
      return window.GradRightCalls && GradRightCalls.dayLabel
        ? GradRightCalls.dayLabel(call.day)
        : call.day;
    }

    function hint(call) {
      if (phaseOf(call) === 'ongoing') {
        return window.GradRightCalls && GradRightCalls.liveLeftText
          ? GradRightCalls.liveLeftText(call)
          : liveLeftText(call);
      }
      return window.GradRightCalls && GradRightCalls.hint ? GradRightCalls.hint(call) : '';
    }

    function whenLine(call) {
      return dayLabel(call) + ' · ' + clock(call);
    }

    function chatHref(call) {
      return '/chats?id=' + encodeURIComponent(call.personId);
    }

    function joinHref(call) {
      return '/call?id=' + encodeURIComponent(call.personId) + '&from=calls';
    }

    function chatBtn(call) {
      return (
        '<a class="icon-btn dash-call-chat" href="' +
        chatHref(call) +
        '" title="Chat" aria-label="Chat">' +
        '<span class="app-icon" aria-hidden="true">chat</span></a>'
      );
    }

    function moreMenu(call) {
      var slots = openSlots();
      return (
        '<button type="button" class="icon-btn dash-call-more" data-call-menu="' +
        esc(call.id) +
        '" title="Meet options" aria-label="Meet options" aria-expanded="false">' +
        '<span class="app-icon" aria-hidden="true">more_vert</span></button>' +
        '<div class="dash-reschedule-menu" hidden>' +
        (slots.length ? '<div class="dash-menu-label">Reschedule</div>' : '') +
        slots
          .map(function (slot) {
            return (
              '<button type="button" data-move="' +
              esc(call.id) +
              '" data-date="' +
              esc(slot.date || slot.day) +
              '" data-time="' +
              esc(slot.time) +
              '">' +
              esc(slot.label) +
              '</button>'
            );
          })
          .join('') +
        '<button type="button" class="is-danger" data-cancel="' +
        esc(call.id) +
        '">Cancel meet</button></div>'
      );
    }

    function rowHtml(call) {
      var phase = phaseOf(call);
      var cardPhase = phase === 'ongoing' ? 'live' : phase === 'completed' ? 'done' : phase;
      var open = phase === 'ongoing' || phase === 'upcoming';
      var action = open
        ? '<div class="dash-call-actions">' +
          '<a class="dash-join" href="' +
          joinHref(call) +
          '">' +
          (phase === 'ongoing' ? 'Join now' : 'Join') +
          '</a>' +
          chatBtn(call) +
          moreMenu(call) +
          '</div>'
        : '<div class="dash-call-actions">' +
          '<span class="dash-call-status' +
          (phase === 'missed' ? ' is-missed' : '') +
          '">' +
          (phase === 'missed' ? 'Missed' : 'Done') +
          '</span>' +
          chatBtn(call) +
          '</div>';
      return (
        '<div class="dash-slot" data-call="' +
        esc(call.id) +
        '"><span class="dash-slot-time">' +
        esc(clock(call)) +
        '</span><div class="dash-slot-card' +
        (cardPhase === 'done' ? ' is-done' : '') +
        (cardPhase === 'missed' ? ' is-missed' : '') +
        (cardPhase === 'live' ? ' is-live' : '') +
        '"><div class="dash-call-main"><div class="dash-call-title"><strong>' +
        esc(call.name) +
        '</strong>' +
        roleBadge(call.role) +
        '</div><span' +
        (phase === 'ongoing' ? ' data-live-left="' + esc(call.id) + '"' : '') +
        '>' +
        esc(hint(call)) +
        '</span></div>' +
        action +
        '</div></div>'
      );
    }

    function listHtml(items, groupDays, hideToday = false) {
      if (!items.length) {
        if (isPendingAccount()) {
          return '<div class="dash-empty"><strong>Nothing here yet</strong><span>Meets show up after you are approved.</span></div>';
        }
        return '<p class="calls-empty">Nothing here yet.</p>';
      }
      if (!groupDays) {
        return '<div class="dash-agenda-group">' + items.map(rowHtml).join('') + '</div>';
      }
      var last = null;
      var html = '';
      items.forEach(function (call) {
        if (call.day !== last) {
          if (last) html += '</div>';
          const label = dayLabel(call);
          html += '<div class="dash-agenda-group">';
          if (!hideToday || label !== 'Today') {
            html += '<div class="calls-day-label">' + esc(label) + '</div>';
          }
          last = call.day;
        }
        html += rowHtml(call);
      });
      if (last) html += '</div>';
      return html;
    }

    function nextJoin(rows) {
      return (
        rows.filter(function (c) {
          return phaseOf(c) === 'ongoing';
        })[0] ||
        rows.filter(function (c) {
          return phaseOf(c) === 'upcoming';
        })[0] ||
        null
      );
    }

    function formatMins(total) {
      total = Math.max(0, Math.round(Number(total) || 0));
      if (total >= 60) {
        var h = Math.floor(total / 60);
        var m = total % 60;
        return m ? h + 'h ' + m + 'm' : h + 'h';
      }
      return total + 'm';
    }

    function chartSeries(rows) {
      var buckets = {};
      rows.forEach(function (call) {
        var day = String(call.day || '');
        if (!day) return;
        if (!buckets[day]) buckets[day] = { day: day, completed: 0, missed: 0 };
        var ph = phaseOf(call);
        if (ph === 'missed') buckets[day].missed += 1;
        else if (ph === 'completed' || ph === 'ongoing') buckets[day].completed += 1;
      });
      var keys = Object.keys(buckets).sort();
      if (keys.length > 30) keys = keys.slice(-30);
      if (!keys.length) {
        keys = [
          window.GradRightCalls && GradRightCalls.todayKey ? GradRightCalls.todayKey : '2026-09-23',
        ];
        buckets[keys[0]] = { day: keys[0], completed: 0, missed: 0 };
      }
      return keys.map(function (k) {
        return buckets[k];
      });
    }

    function renderChart(rows) {
      const series = chartSeries(rows).map((day) => ({
        date: new Date(day.day + 'T00:00:00'),
        visitors: day.completed,
        connections: day.missed,
      }));
      paintAnalyticsChart({
        document,
        TODAY: new Date((window.GradRightCalls?.todayKey || '2026-09-23') + 'T00:00:00'),
        formatWhen: (date) => dayLabel({ day: date.toISOString().slice(0, 10) }),
        formatShort: (date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        series,
        grain: 'day',
        labels: ['Completed', 'Missed'],
        sharedScale: true,
      });
    }

    function renderStats(rows) {
      var missed = rows.filter(function (c) {
        return phaseOf(c) === 'missed';
      });
      var done = rows.filter(function (c) {
        return phaseOf(c) === 'completed';
      });
      var time = done.reduce(function (n, c) {
        return n + (Number(c.mins) || 30);
      }, 0);
      var avg = done.length ? Math.round(time / done.length) : 0;
      document.getElementById('stat-total').textContent = String(rows.length);
      document.getElementById('stat-done').textContent = String(done.length);
      document.getElementById('stat-missed').textContent = String(
        rows.filter((c) => c.day === (window.GradRightCalls?.todayKey || '2026-09-23')).length,
      );

      document.getElementById('stat-avg').textContent = avg ? avg + 'm' : '—';
      const eligible = bookings().filter(
        (call) =>
          (!query || `${call.name} ${call.service || ''}`.toLowerCase().includes(query)) &&
          (statusFilter === 'all' || phaseOf(call) === statusFilter),
      );
      const previousEnd = new Date(dateRange.start + 'T00:00:00');
      previousEnd.setDate(previousEnd.getDate() - 1);
      const days =
        Math.round(
          (new Date(dateRange.end + 'T00:00:00') - new Date(dateRange.start + 'T00:00:00')) /
            86400000,
        ) + 1;
      const previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - days + 1);
      const previous = eligible.filter(
        (call) => call.day >= dateKey(previousStart) && call.day <= dateKey(previousEnd),
      );
      const previousDone = previous.filter((call) => phaseOf(call) === 'completed');
      const previousAvg = previousDone.length
        ? previousDone.reduce((sum, call) => sum + (Number(call.mins) || 30), 0) /
          previousDone.length
        : 0;
      const yesterday = new Date(anchor);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayCount = rows.filter((call) => call.day === dateKey(anchor)).length;
      const yesterdayCount = eligible.filter((call) => call.day === dateKey(yesterday)).length;
      [
        ['total', rows.length, previous.length],
        ['done', done.length, previousDone.length],
        ['missed', todayCount, yesterdayCount],
        ['avg', avg, previousAvg],
      ].forEach(([key, value, prior]) => {
        const el = document.getElementById(`stat-${key}-trend`);
        const allTime = dateRange.preset === 'all' && key !== 'missed';
        const change = prior ? Math.round(((value - prior) / prior) * 100) : null;
        el.textContent = allTime
          ? 'Across all time'
          : change === null
            ? key === 'missed'
              ? 'No meets yesterday'
              : 'No prior-period data'
            : `${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}% vs ${key === 'missed' ? 'yesterday' : 'previous period'}`;
        el.style.color =
          allTime || change === null || key === 'avg'
            ? 'var(--gray-500)'
            : change >= 0
              ? 'var(--green-700)'
              : 'var(--red-500)';
      });
      renderChart(rows);
    }

    function render() {
      var rows = bookings().filter((call) => {
        const day = String(call.day || '').slice(0, 10);
        return (
          (!query || `${call.name} ${call.service || ''}`.toLowerCase().includes(query)) &&
          (!dateRange ||
            dateRange.preset === 'all' ||
            (day >= dateRange.start && day <= dateRange.end)) &&
          (statusFilter === 'all' || phaseOf(call) === statusFilter)
        );
      });
      var live = rows.filter(function (c) {
        return phaseOf(c) === 'ongoing';
      });
      var upcoming = rows.filter(function (c) {
        return phaseOf(c) === 'upcoming';
      });
      var history = rows.filter(function (c) {
        return phaseOf(c) === 'completed' || phaseOf(c) === 'missed';
      });
      var pill = document.getElementById('ongoing-pill');
      var ongoingMount = document.getElementById('ongoing-mount');
      if (!live.length) {
        pill.hidden = true;
        var next = upcoming[0];
        var pending = isPendingAccount();
        ongoingMount.innerHTML =
          '<div class="ongoing-empty"><div><strong>No meet in progress</strong><span>' +
          (pending
            ? 'Meets show up here after you are approved.'
            : next
              ? 'Next is ' + esc(next.name) + ' · ' + esc(whenLine(next))
              : 'Nothing else is booked.') +
          '</span></div></div>';
      } else {
        pill.hidden = false;
        ongoingMount.innerHTML = listHtml(live, false);
      }
      document.getElementById('upcoming-count').textContent = String(upcoming.length);
      document.getElementById('upcoming-mount').innerHTML = listHtml(upcoming, true, true);
      document.getElementById('recent-count').textContent = String(history.length);
      document.getElementById('recent-mount').innerHTML = listHtml(history, true);
      renderStats(rows);
      document.getElementById('join-next').disabled = !nextJoin(rows);
      if (window.GradRightShell) GradRightShell.applyAccess();
      if (window.GradRightLiveCall) GradRightLiveCall.mount();
      renderSheet();
    }

    var workspace = document.getElementById('calls-workspace');
    var callPanel = document.getElementById('call-panel');
    var callPanelBody = document.getElementById('call-panel-body');
    var callPanelTitle = document.getElementById('call-panel-title');

    function openSheet(id) {
      var call = byId(id);
      if (!call) return;
      location.href =
        '/person?id=' +
        encodeURIComponent(call.personId || '') +
        '&call=' +
        encodeURIComponent(id) +
        '&from=calls';
    }

    function closeSheet() {
      selected = null;
      renderSheet();
    }

    function renderSheet() {
      if (!selected) {
        callPanel.hidden = true;
        workspace.classList.remove('is-profile-open');
        callPanelBody.innerHTML = '';
        return;
      }
      var call = byId(selected);
      if (!call) {
        selected = null;
        callPanel.hidden = true;
        workspace.classList.remove('is-profile-open');
        return;
      }
      callPanel.hidden = false;
      workspace.classList.add('is-profile-open');
      callPanelTitle.textContent = call.name;
      callPanelBody.innerHTML =
        window.GradRightCallPanel && GradRightCallPanel.cardHtml
          ? GradRightCallPanel.cardHtml(call, { from: 'calls' })
          : '';
      if (window.GradRightShell) GradRightShell.applyAccess();
    }

    if (window.GradRightCalls) {
      GradRightCalls.onLiveEnd = function () {
        render();
      };
    }

    function closeRescheduleMenus(except) {
      document.querySelectorAll('.dash-reschedule-menu').forEach(function (menu) {
        if (menu === except) return;
        menu.hidden = true;
        var slot = menu.closest('.dash-slot');
        if (slot) slot.classList.remove('has-menu-open');
        var btn = menu.parentElement && menu.parentElement.querySelector('[data-call-menu]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    var cancelModal = document.getElementById('cancel-call-modal');
    var cancelNameEl = document.getElementById('cancel-call-name');
    var pendingCancelId = '';

    function closeCancelModal() {
      pendingCancelId = '';
      if (cancelModal) cancelModal.hidden = true;
      document.body.classList.remove('cal-modal-open');
    }

    function openCancelModal(id) {
      var call = byId(id);
      if (!call || !cancelModal) return;
      pendingCancelId = id;
      if (cancelNameEl) cancelNameEl.textContent = call.name;
      closeRescheduleMenus();
      cancelModal.hidden = false;
      document.body.classList.add('cal-modal-open');
    }

    scope.listen(document.getElementById('meets-search'), 'input', (event) => {
      query = event.target.value.trim().toLowerCase();
      render();
    });
    scope.listen(document.getElementById('meets-filter'), 'change', (event) => {
      statusFilter = event.target.value;
      render();
    });
    scope.listen(window, 'counselor:meets-range', (event) => {
      const range = event.detail;
      const iso = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateRange = { preset: range.preset, start: iso(range.start), end: iso(range.end) };
      render();
    });
    scope.listen(document.getElementById('join-next'), 'click', function () {
      var call = nextJoin(bookings());
      if (!call) return;
      location.href = joinHref(call);
    });

    scope.listen(document.querySelector('.content'), 'click', function (event) {
      var openBtn = event.target.closest('[data-call-menu]');
      if (openBtn) {
        event.preventDefault();
        event.stopPropagation();
        var menu = openBtn.parentElement.querySelector('.dash-reschedule-menu');
        var willOpen = menu && menu.hidden;
        closeRescheduleMenus(menu);
        if (menu) menu.hidden = !willOpen;
        openBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        var slot = openBtn.closest('.dash-slot');
        if (slot) slot.classList.toggle('has-menu-open', !!willOpen);
        return;
      }
      var cancelBtn = event.target.closest('[data-cancel]');
      if (cancelBtn) {
        event.preventDefault();
        event.stopPropagation();
        openCancelModal(cancelBtn.getAttribute('data-cancel'));
        return;
      }
      var pick = event.target.closest('[data-move]');
      if (pick) {
        event.preventDefault();
        event.stopPropagation();
        patchCall(pick.getAttribute('data-move'), {
          day: pick.getAttribute('data-date'),
          time: pick.getAttribute('data-time'),
          status: 'upcoming',
          movedLabel: '',
        });
        closeRescheduleMenus();
        render();
        return;
      }
      if (event.target.closest('a, button, .dash-call-actions')) return;
      var hit = event.target.closest('[data-call]');
      if (hit) openSheet(hit.getAttribute('data-call'));
    });

    if (cancelModal) {
      scope.listen(cancelModal, 'click', function (event) {
        if (event.target.closest('[data-close-cancel]')) closeCancelModal();
      });
    }

    var confirmCancel = document.getElementById('confirm-cancel-call');
    if (confirmCancel) {
      scope.listen(confirmCancel, 'click', function () {
        if (!pendingCancelId) return;
        patchCall(pendingCancelId, { status: 'cancelled' });
        if (selected === pendingCancelId) closeSheet();
        closeCancelModal();
        render();
      });
    }

    scope.listen(document, 'click', function (event) {
      if (!event.target.closest('.dash-call-actions')) closeRescheduleMenus();
    });

    scope.listen(document.getElementById('call-panel-close'), 'click', closeSheet);

    scope.listen(document, 'keydown', function (event) {
      if (event.key === 'Escape' && selected) closeSheet();
    });

    function tickLiveTimers() {
      var nodes = document.querySelectorAll('[data-live-left]');
      if (!nodes.length) return;
      var ended = false;
      nodes.forEach(function (el) {
        var call = byId(el.getAttribute('data-live-left'));
        if (!call) return;
        if (phaseOf(call) !== 'ongoing') {
          if (!(
            window.GradRightCalls &&
            GradRightCalls.isDemoLive &&
            GradRightCalls.isDemoLive(call)
          )) {
            ended = true;
          }
          return;
        }
        el.textContent =
          window.GradRightCalls && GradRightCalls.liveLeftText
            ? GradRightCalls.liveLeftText(call)
            : liveLeftText(call);
      });
      if (ended) render();
    }

    scope.listen(document, 'gradright:safety', function (e) {
      var detail = (e && e.detail) || {};
      if (detail.action === 'block' && selected) {
        var call = byId(selected);
        if (
          call &&
          detail.user &&
          (detail.user.id === call.personId || detail.user.name === call.name)
        ) {
          closeSheet();
        }
      }
    });

    setInterval(tickLiveTimers, 1000);
    render();
  })();
}
