/**
 * GradRight Counselor — notifications panel (topbar bell).
 * Connects, refunds, withdrawals, community replies, upcoming meets.
 */
(function () {
  var READ_KEY = 'gradright_notif_read_v1';
  var TODAY = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseStamp(s) {
    if (window.GradRightDB && GradRightDB.parseStamp) return GradRightDB.parseStamp(s);
    if (!s) return null;
    if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
    var p = String(s).trim().split(/[- :T]/).map(Number);
    var d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1, p[3] || 0, p[4] || 0);
    return isNaN(d.getTime()) ? null : d;
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

  function formatClock(d) {
    if (window.GradRightDB && GradRightDB.formatTime) return GradRightDB.formatTime(d);
    var h = d.getHours();
    var m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + ap;
  }

  function formatWhen(stamp) {
    var d = parseStamp(stamp);
    if (!d) return '';
    var ageMin = Math.max(0, Math.floor((TODAY - d) / 60000));
    if (ageMin < 1) return 'Just now';
    if (ageMin < 60) return ageMin + ' min ago';
    var ageHr = Math.floor(ageMin / 60);
    if (ageHr < 5) return ageHr + ' hr ago';
    var t0 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    var d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((t0 - d0) / 86400000);
    var time = formatClock(d);
    if (diff === 0) return 'Today, ' + time;
    if (diff === 1) return 'Yesterday, ' + time;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ', ' + time;
  }

  function minsUntil(stamp) {
    var d = parseStamp(stamp);
    if (!d) return null;
    return Math.round((d - TODAY) / 60000);
  }

  function loadRead() {
    try {
      var raw = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveRead(ids) {
    localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(0, 200)));
  }

  function personName(id) {
    var list = (window.GradRightDB && GradRightDB.people) || [];
    var hit = list.filter(function (p) {
      return p.id === id;
    })[0];
    return hit ? hit.name : 'A student';
  }

  function baseNotifications() {
    var items = [];
    var now = new Date(TODAY);

    function ago(mins) {
      var d = new Date(now);
      d.setMinutes(d.getMinutes() - mins);
      return isoStamp(d);
    }

    items.push({
      id: 'n-connect-1',
      kind: 'connect',
      icon: 'person_add',
      title: 'New connect',
      body: 'Aarav Reddy paid ₹1,999 to connect with you.',
      at: ago(25),
      href: 'person.html?id=aarav&from=dashboard',
    });
    items.push({
      id: 'n-connect-2',
      kind: 'connect',
      icon: 'person_add',
      title: 'New connect',
      body: 'Meera Kapoor paid ₹1,999 to connect with you.',
      at: ago(95),
      href: 'students.html',
    });
    items.push({
      id: 'n-refund-1',
      kind: 'refund',
      icon: 'undo',
      title: 'Connect fee refunded',
      body: '₹1,999 for Yash Desai was refunded to the student.',
      at: ago(180),
      href: 'transactions.html',
    });
    items.push({
      id: 'n-wd-1',
      kind: 'withdrawal',
      icon: 'account_balance',
      title: 'Withdrawal processing',
      body: '₹8,200 to HDFC · •••• 4821 is on the way via NEFT.',
      at: ago(40),
      href: 'transactions.html',
    });
    items.push({
      id: 'n-wd-2',
      kind: 'withdrawal',
      icon: 'check_circle',
      title: 'Withdrawal landed',
      body: '₹12,500 was credited to your primary bank.',
      at: ago(400),
      href: 'transactions.html',
    });
    items.push({
      id: 'n-comm-1',
      kind: 'community',
      icon: 'forum',
      title: 'Reply on Community',
      body: 'Meera Kapoor replied to your comment on SOP help.',
      at: ago(55),
      href: 'community.html',
    });
    items.push({
      id: 'n-comm-2',
      kind: 'community',
      icon: 'chat_bubble',
      title: 'New question for you',
      body: 'Aarav Reddy asked about California CS safety schools.',
      at: ago(220),
      href: 'community.html',
    });
    items.push({
      id: 'n-chat-1',
      kind: 'chat',
      icon: 'chat',
      title: 'New chat message',
      body: 'Jia Das sent you a message about Australia medical timing.',
      at: ago(12),
      href: 'chats.html',
    });

    return items;
  }

  function meetNotifications() {
    var out = [];
    if (!window.GradRightCalls) return out;
    var calls =
      typeof GradRightCalls.all === 'function'
        ? GradRightCalls.all()
        : Array.isArray(GradRightCalls.list)
          ? GradRightCalls.list
          : [];
    calls.forEach(function (c) {
      if (!c) return;
      var phase = typeof GradRightCalls.phase === 'function' ? GradRightCalls.phase(c) : c.status;
      if (phase !== 'upcoming' && phase !== 'ongoing' && c.status !== 'upcoming') return;
      if (phase === 'completed' || phase === 'missed' || c.status === 'done' || c.status === 'missed') return;
      var stamp = String(c.day) + ' ' + String(c.time || '00:00');
      var mins = minsUntil(stamp);
      if (mins == null) return;
      if (mins < -5 || mins > 180) return;
      var name = c.name || personName(c.personId || c.person_id);
      var title;
      var body;
      if (mins <= 0 || phase === 'ongoing') {
        title = 'Meet starting now';
        body = name + ' · ' + (c.service || 'Session') + ' is ready to join.';
      } else if (mins < 60) {
        title = 'Meet in ' + mins + ' min';
        body = name + ' · ' + (c.service || 'Session') + ' at ' + formatClock(parseStamp(stamp));
      } else {
        title = 'Upcoming meet';
        body = name + ' · ' + (c.service || 'Session') + ' in about ' + Math.round(mins / 60) + ' hr';
      }
      out.push({
        id: 'n-meet-' + c.id,
        kind: 'meet',
        icon: 'videocam',
        title: title,
        body: body,
        at: isoStamp(new Date(TODAY.getTime() - 2 * 60000)),
        href: 'calls.html',
        urgent: mins <= 15 || phase === 'ongoing',
      });
    });
    return out;
  }

  function allNotifications() {
    var read = loadRead();
    var items = baseNotifications().concat(meetNotifications());
    items.forEach(function (n) {
      n.unread = read.indexOf(n.id) < 0;
    });
    items.sort(function (a, b) {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return String(b.at).localeCompare(String(a.at));
    });
    return items;
  }

  function unreadCount(items) {
    return items.filter(function (n) {
      return n.unread;
    }).length;
  }

  function kindClass(kind) {
    if (kind === 'connect') return 'is-connect';
    if (kind === 'refund') return 'is-refund';
    if (kind === 'withdrawal') return 'is-withdraw';
    if (kind === 'community') return 'is-community';
    if (kind === 'meet') return 'is-meet';
    if (kind === 'chat') return 'is-chat';
    return '';
  }

  function renderList(items) {
    if (!items.length) {
      return '<p class="notif-empty">You’re all caught up.</p>';
    }
    return items
      .map(function (n) {
        return (
          '<a class="notif-item' +
          (n.unread ? ' is-unread' : '') +
          (n.urgent ? ' is-urgent' : '') +
          '" href="' +
          escapeHtml(n.href || '#') +
          '" data-notif-id="' +
          escapeHtml(n.id) +
          '">' +
          '<span class="notif-ico ' +
          kindClass(n.kind) +
          '" aria-hidden="true"><span class="material-symbols-rounded">' +
          escapeHtml(n.icon) +
          '</span></span>' +
          '<span class="notif-copy">' +
          '<strong>' +
          escapeHtml(n.title) +
          '</strong>' +
          '<span class="notif-body">' +
          escapeHtml(n.body) +
          '</span>' +
          '<span class="notif-time">' +
          escapeHtml(formatWhen(n.at)) +
          '</span></span></a>'
        );
      })
      .join('');
  }

  function syncBadge(wrap, items) {
    var badge = wrap.querySelector('.notif-badge');
    var n = unreadCount(items);
    if (!badge) return;
    if (n > 0) {
      badge.hidden = false;
      badge.textContent = n > 9 ? '9+' : String(n);
    } else {
      badge.hidden = true;
      badge.textContent = '';
    }
  }

  function paint(wrap) {
    var items = allNotifications();
    var list = wrap.querySelector('.notif-list');
    if (list) list.innerHTML = renderList(items);
    syncBadge(wrap, items);
  }

  function markRead(id) {
    var read = loadRead();
    if (read.indexOf(id) < 0) {
      read.push(id);
      saveRead(read);
    }
  }

  function markAllRead() {
    var ids = allNotifications().map(function (n) {
      return n.id;
    });
    saveRead(ids);
  }

  function ensureActions(topbar) {
    var actions = topbar.querySelector('.actions');
    if (actions) return actions;
    actions = document.createElement('div');
    actions.className = 'actions people-top-actions';
    topbar.appendChild(actions);
    return actions;
  }

  function mount() {
    if (document.getElementById('notif-wrap')) return;
    var topbar = document.querySelector('.main > .topbar') || document.querySelector('.topbar');
    if (!topbar) return;
    var page = document.body && document.body.dataset.page;
    if (page === 'call') return;

    var actions = ensureActions(topbar);
    var wrap = document.createElement('div');
    wrap.className = 'notif-wrap';
    wrap.id = 'notif-wrap';
    wrap.innerHTML =
      '<button type="button" class="icon-btn notif-bell" id="notif-bell" aria-label="Notifications" aria-expanded="false" aria-haspopup="true">' +
      '<span class="material-symbols-rounded" aria-hidden="true">notifications</span>' +
      '<span class="notif-badge" hidden></span>' +
      '</button>' +
      '<div class="notif-panel" id="notif-panel" hidden role="dialog" aria-label="Notifications">' +
      '<div class="notif-head">' +
      '<strong>Notifications</strong>' +
      '<button type="button" class="notif-mark" id="notif-mark-all">Mark all read</button>' +
      '</div>' +
      '<div class="notif-list gr-scroll"></div>' +
      '</div>';

    actions.insertBefore(wrap, actions.firstChild);

    var bell = wrap.querySelector('#notif-bell');
    var panel = wrap.querySelector('#notif-panel');

    function close() {
      panel.hidden = true;
      bell.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('is-open');
    }

    function open() {
      paint(wrap);
      panel.hidden = false;
      bell.setAttribute('aria-expanded', 'true');
      wrap.classList.add('is-open');
    }

    bell.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) open();
      else close();
    });

    wrap.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target.closest('#notif-mark-all')) {
        markAllRead();
        paint(wrap);
        return;
      }
      var item = e.target.closest('[data-notif-id]');
      if (item) {
        markRead(item.getAttribute('data-notif-id'));
      }
    });

    document.addEventListener('click', function () {
      if (!panel.hidden) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    paint(wrap);
  }

  function boot() {
    mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.GradRightNotifications = { mount: mount, paint: function () {
    var wrap = document.getElementById('notif-wrap');
    if (wrap) paint(wrap);
  } };
})();
