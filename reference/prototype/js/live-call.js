/**
 * GradRight Counselor — live call via browser Document Picture-in-Picture only
 * No in-page floating widget. Ongoing row / Open re-opens the browser pop-out.
 */
(function () {
  var STORAGE_KEY = 'gradright_live_call';
  var CATALOG = {
    aarav: {
      studentId: 'aarav',
      name: 'Aarav Reddy',
      initials: 'AR',
      service: 'College shortlisting',
      booked: '45 min',
    },
    meera: {
      studentId: 'meera',
      name: 'Meera Kapoor',
      initials: 'MK',
      service: 'SOP review',
      booked: '30 min',
    },
    tanvi: {
      studentId: 'tanvi',
      name: 'Tanvi Nanda',
      initials: 'TN',
      service: 'Essay workshop',
      booked: '40 min',
    },
    jia: {
      studentId: 'jia',
      name: 'Jia Das',
      initials: 'JD',
      service: 'Pathway consult',
      booked: '40 min',
    },
    sohan: {
      studentId: 'sohan',
      name: 'Sohan Nair',
      initials: 'SN',
      service: 'Visa readiness',
      booked: '30 min',
    },
    kabir: {
      studentId: 'kabir',
      name: 'Kabir Malhotra',
      initials: 'KM',
      service: 'Applications',
      booked: '30 min',
    },
    rohan: {
      studentId: 'rohan',
      name: 'Rohan Desai',
      initials: 'RD',
      service: 'Visa readiness',
      booked: '40 min',
    },
  };

  var timer = null;
  var pipWindow = null;
  var opening = false;

  function supportsDocPip() {
    return !!(window.documentPictureInPicture && documentPictureInPicture.requestWindow);
  }

  function read() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.studentId) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function write(data) {
    try {
      if (!data) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function resolve(partial) {
    var base = CATALOG[partial.studentId] || {};
    var db = window.GradRightDB && GradRightDB.byId && GradRightDB.byId[partial.studentId];
    return {
      studentId: partial.studentId,
      name: partial.name || base.name || (db && db.name) || 'Student',
      initials: partial.initials || base.initials || (db && db.initials) || '?',
      service: partial.service || base.service || (db && db.service) || 'Meet',
      booked: partial.booked || base.booked || '30 min',
      startedAt: partial.startedAt || Date.now(),
      muted: !!partial.muted,
      videoOff: !!partial.videoOff,
    };
  }

  function get() {
    return read();
  }

  function pageId() {
    return document.body && document.body.dataset.page
      ? document.body.dataset.page
      : (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
  }

  function elapsedText(startedAt) {
    var seconds = Math.max(0, Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    var mins = Math.floor(seconds / 60);
    var rest = seconds % 60;
    return mins + ':' + String(rest).padStart(2, '0');
  }

  function absolute(path) {
    try {
      return new URL(path, location.href).href;
    } catch (e) {
      return path;
    }
  }

  function goMain(url) {
    location.href = url;
  }

  function finishEnd(ending) {
    write(null);
    closeBrowserPip();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    removeLegacyInPage();
    if (window.GradRightCalls && GradRightCalls.onLiveEnd) {
      GradRightCalls.onLiveEnd(ending);
    } else if (ending) {
      try {
        sessionStorage.setItem('gradright_last_ended_call', JSON.stringify(ending));
      } catch (err) {}
    }
  }

  function end() {
    finishEnd(read());
  }

  /** Remove any old in-page floating widget from earlier builds */
  function removeLegacyInPage() {
    var el = document.getElementById('gr-live-pip');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function widgetHtml(live) {
    return (
      '<div class="call-pip-drag">' +
        '<span class="pill live">Live</span>' +
        '<strong data-live-elapsed>' +
        elapsedText(live.startedAt) +
        '</strong>' +
      '</div>' +
      '<div class="call-pip-body">' +
        '<div class="call-avatar" data-live-avatar>' +
        live.initials +
        '</div>' +
        '<h3 data-live-name>' +
        live.name +
        '</h3>' +
        '<p class="call-pip-service" data-live-service>' +
        live.service +
        ' · ' +
        live.booked +
        ' booked</p>' +
        '<div class="call-controls">' +
          '<button class="call-btn' +
          (live.muted ? ' on' : '') +
          '" type="button" data-live-mute title="Mute">' +
            '<span class="material-symbols-rounded" aria-hidden="true">' +
            (live.muted ? 'mic_off' : 'mic') +
            '</span>' +
          '</button>' +
          '<button class="call-btn' +
          (live.videoOff ? ' on' : '') +
          '" type="button" data-live-video title="Video">' +
            '<span class="material-symbols-rounded" aria-hidden="true">' +
            (live.videoOff ? 'videocam_off' : 'videocam') +
            '</span>' +
          '</button>' +
          '<button class="call-btn" type="button" data-live-chat title="Chat">' +
            '<span class="material-symbols-rounded" aria-hidden="true">chat</span>' +
          '</button>' +
          '<button class="call-btn end" type="button" data-live-end title="End meet">' +
            '<span class="material-symbols-rounded" aria-hidden="true">call_end</span>' +
          '</button>' +
        '</div>' +
        '<div class="call-pip-actions">' +
          '<button class="btn btn-secondary btn-sm" type="button" data-live-profile>Profile</button>' +
          '<button class="btn btn-secondary btn-sm" type="button" data-live-expand>Expand</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bindActions(root) {
    if (!root || root.dataset.actionsBound === '1') return;
    root.dataset.actionsBound = '1';
    root.addEventListener('click', function (event) {
      var live = read();
      if (!live) return;
      var t = event.target.closest(
        '[data-live-end],[data-live-mute],[data-live-video],[data-live-chat],[data-live-profile],[data-live-expand]'
      );
      if (!t) return;
      event.preventDefault();
      event.stopPropagation();

      if (t.hasAttribute('data-live-end')) {
        finishEnd(live);
        return;
      }
      if (t.hasAttribute('data-live-mute')) {
        patch({ muted: !live.muted });
        return;
      }
      if (t.hasAttribute('data-live-video')) {
        patch({ videoOff: !live.videoOff });
        return;
      }
      if (t.hasAttribute('data-live-chat')) {
        goMain(absolute('chats.html?id=' + encodeURIComponent(live.studentId)));
        return;
      }
      if (t.hasAttribute('data-live-profile')) {
        goMain(
          absolute(
            'person.html?id=' + encodeURIComponent(live.studentId) + '&from=call'
          )
        );
        return;
      }
      if (t.hasAttribute('data-live-expand')) {
        closeBrowserPip();
        goMain(absolute('call.html?id=' + encodeURIComponent(live.studentId) + '&from=calls'));
      }
    });
  }

  function copyStyles(toDoc) {
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="stylesheet"], style'), function (node) {
      toDoc.head.appendChild(node.cloneNode(true));
    });
    var base = toDoc.createElement('base');
    base.href = location.href;
    toDoc.head.prepend(base);
    var extra = toDoc.createElement('style');
    extra.textContent =
      'html,body{margin:0;padding:0;background:#121022;height:100%;overflow:hidden;}' +
      '.call-pip{position:static!important;width:100%!important;height:100%!important;border-radius:0!important;box-shadow:none!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;}';
    toDoc.head.appendChild(extra);
  }

  function browserPipOpen() {
    try {
      if (pipWindow && !pipWindow.closed) return true;
      if (window.documentPictureInPicture && documentPictureInPicture.window) {
        pipWindow = documentPictureInPicture.window;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function closeBrowserPip() {
    try {
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    } catch (e) {}
    pipWindow = null;
    try {
      if (window.documentPictureInPicture && documentPictureInPicture.window) {
        documentPictureInPicture.window.close();
      }
    } catch (e2) {}
  }

  function paintRoot(root, live) {
    if (!root) return;
    root.className = 'call-pip';
    root.innerHTML = widgetHtml(live);
    bindActions(root);
    tick();
  }

  function openBrowserPip(force) {
    var live = read();
    if (!live || !supportsDocPip() || pageId() === 'call') return Promise.resolve(false);
    if (opening) return Promise.resolve(false);

    removeLegacyInPage();

    if (browserPipOpen()) {
      if (!force) {
        var existing = pipWindow.document.querySelector('.call-pip') || pipWindow.document.body;
        paintRoot(existing, live);
        return Promise.resolve(true);
      }
      try {
        pipWindow.close();
      } catch (e) {}
      pipWindow = null;
    }

    opening = true;
    return documentPictureInPicture
      .requestWindow({
        width: 320,
        height: 440,
        preferInitialWindowPlacement: true,
      })
      .then(function (win) {
        opening = false;
        pipWindow = win;
        removeLegacyInPage();
        win.document.title = 'Live meet · ' + live.name;
        copyStyles(win.document);
        var shell = win.document.createElement('div');
        shell.className = 'call-pip';
        win.document.body.appendChild(shell);
        paintRoot(shell, live);
        win.addEventListener('pagehide', function () {
          pipWindow = null;
        });
        if (!timer) timer = setInterval(tick, 1000);
        return true;
      })
      .catch(function () {
        opening = false;
        return false;
      });
  }

  function tick() {
    var live = read();
    if (!live) return;
    var text = elapsedText(live.startedAt);
    document.querySelectorAll('[data-live-elapsed]').forEach(function (node) {
      node.textContent = text;
    });
    if (browserPipOpen()) {
      pipWindow.document.querySelectorAll('[data-live-elapsed]').forEach(function (node) {
        node.textContent = text;
      });
    }
  }

  function refreshOpenUi() {
    var live = read();
    if (!live || !browserPipOpen()) return;
    var shell = pipWindow.document.querySelector('.call-pip') || pipWindow.document.body;
    paintRoot(shell, live);
  }

  function patch(fields) {
    var cur = read();
    if (!cur) return null;
    Object.keys(fields || {}).forEach(function (key) {
      cur[key] = fields[key];
    });
    write(cur);
    refreshOpenUi();
    return cur;
  }

  function start(partial) {
    var existing = read();
    var next = resolve(partial || {});
    if (existing && existing.studentId === next.studentId) {
      next.startedAt = existing.startedAt;
      next.muted = existing.muted;
      next.videoOff = existing.videoOff;
    }
    write(next);
    removeLegacyInPage();
    mount({ userGesture: true });
    return next;
  }

  function mount(opts) {
    opts = opts || {};
    removeLegacyInPage();
    if (
      window.GradRightSession &&
      GradRightSession.get &&
      (function () {
        var s = GradRightSession.get();
        return !!(s && !s.verified);
      })()
    ) {
      closeBrowserPip();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      return null;
    }
    var live = read();

    if (!live) {
      closeBrowserPip();
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      return null;
    }

    if (pageId() === 'call') {
      closeBrowserPip();
      if (!timer) timer = setInterval(tick, 1000);
      tick();
      return live;
    }

    if (browserPipOpen()) {
      refreshOpenUi();
      if (!timer) timer = setInterval(tick, 1000);
      return live;
    }

    if (opts.userGesture && supportsDocPip()) {
      openBrowserPip(true);
    }

    return live;
  }

  window.GradRightLiveCall = {
    CATALOG: CATALOG,
    get: get,
    start: start,
    patch: patch,
    end: end,
    mount: mount,
    openPip: function () {
      return openBrowserPip(true);
    },
    elapsedText: function () {
      var live = read();
      return live ? elapsedText(live.startedAt) : '0:00';
    },
  };
})();
