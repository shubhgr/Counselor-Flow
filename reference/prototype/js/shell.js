/**
 * GradRight Counselor — access and integration controller for the React shell.
 * React markup lives in src/components/app-shell.jsx.
 *
 * Usage on any app page:
 *   <body data-page="dashboard">
 *   <aside id="app-sidebar" class="sidebar"></aside>
 *   <script src="js/session.js"></script>
 *   <script type="module" src="/src/shell-entry.jsx"></script>
 */
(function () {
  var SIDEBAR_META_KEY = 'gradright_sidebar_meta';
  var ICONS_READY_KEY = 'gradright_icons_ready';

  function currentPageId() {
    const fromBody = document.body && document.body.dataset.page;
    if (fromBody) return fromBody;
    const file = (location.pathname.split('/').pop() || 'dashboard.html').replace(
      /\.html$/i,
      ''
    );
    return file || 'dashboard';
  }

  function normalizeNavId(page) {
    if (page === 'student-profile' || page === 'person') {
      var from = new URLSearchParams(location.search).get('from');
      if (from === 'chats') return 'chats';
      if (from === 'calls' || from === 'call') return 'calls';
      if (from === 'dashboard') return 'dashboard';
      if (from === 'community') return 'community';
      if (from === 'transactions') return 'transactions';
      return 'students';
    }
    if (page === 'call') return 'calls';
    if (page === 'calendar' || page === 'services') return 'profile';
    if (page === 'dashboard-pending') return 'dashboard';
    return page;
  }

  function session() {
    return window.GradRightSession ? GradRightSession.get() : null;
  }

  /**
   * Session is source of truth for chip/badge/gating.
   * Without a session, reuse last sidebar meta so pages with different
   * hardcoded data-verified do not flip the nav between navigations.
   */
  function isVerified() {
    const s = session();
    if (s) return !!s.verified;
    try {
      const meta = JSON.parse(sessionStorage.getItem(SIDEBAR_META_KEY) || 'null');
      if (meta && typeof meta.verified === 'boolean') return meta.verified;
    } catch (e) {}
    const raw = document.body && document.body.dataset.verified;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return false;
  }

  function accountFingerprint(account, verified) {
    return {
      verified: !!verified,
      phone: (account && account.phone) || '',
      name: (account && account.name) || 'Priya Sharma',
      initials: (account && account.initials) || 'PS',
      nav: 7,
    };
  }

  function saveSidebarMeta(meta) {
    try {
      sessionStorage.setItem(SIDEBAR_META_KEY, JSON.stringify(meta));
    } catch (e) {}
  }

  function markIconsReady() {
    document.documentElement.classList.add('icons-ready');
    try {
      sessionStorage.setItem(ICONS_READY_KEY, '1');
    } catch (e) {}
  }

  function ensureIconFont() {
    try {
      if (sessionStorage.getItem(ICONS_READY_KEY) === '1') {
        document.documentElement.classList.add('icons-ready');
        return Promise.resolve();
      }
    } catch (e) {}

    if (!document.fonts || !document.fonts.load) {
      markIconsReady();
      return Promise.resolve();
    }
    return Promise.all([
      document.fonts.load('300 20px "Material Symbols Rounded"'),
      document.fonts.load('400 20px "Material Symbols Rounded"'),
    ])
      .catch(function () {})
      .then(markIconsReady);
  }

  function paintSettingsChip() {
    const statusEl = document.getElementById('settings-chip-status');
    if (!statusEl) return;
    const verified = isVerified();
    statusEl.innerHTML = verified
      ? '<span class="status-dot verified"></span>Verified'
      : '<span class="status-dot"></span>Not verified';
  }

  function applySessionFields() {
    const s = session();
    if (!s) return;

    document.querySelectorAll('[data-session-phone]').forEach(function (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = s.phoneDisplay;
      } else {
        el.textContent = s.phoneDisplay;
      }
    });

    document.querySelectorAll('[data-session-name]').forEach(function (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = s.name;
      } else {
        el.textContent = s.name;
      }
    });

    document.querySelectorAll('[data-session-email]').forEach(function (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = s.email;
      } else {
        el.textContent = s.email;
      }
    });

    document.querySelectorAll('[data-session-initials]').forEach(function (el) {
      el.textContent = s.initials;
    });
  }

  function applyAccess() {
    const verified = isVerified();
    document.body.classList.toggle('is-verified', verified);
    document.body.classList.toggle('is-unverified', !verified);
    document.body.dataset.verified = verified ? 'true' : 'false';

    document.querySelectorAll('[data-verified-only]').forEach((el) => {
      el.hidden = !verified;
      el.setAttribute('aria-hidden', verified ? 'false' : 'true');
    });
    document.querySelectorAll('[data-unverified-only]').forEach((el) => {
      el.hidden = verified;
      el.setAttribute('aria-hidden', verified ? 'true' : 'false');
    });

    document.querySelectorAll('[data-connect-action]').forEach((el) => {
      if (verified) {
        el.classList.remove('is-locked');
        el.removeAttribute('aria-disabled');
        if (el.matches('input, textarea, button')) el.disabled = false;
        return;
      }
      el.classList.add('is-locked');
      el.setAttribute('aria-disabled', 'true');
      if (el.matches('input, textarea, button')) el.disabled = true;
      if (el.matches('input, textarea') && el.dataset.lockedPlaceholder) {
        el.placeholder = el.dataset.lockedPlaceholder;
      }
    });

    if (verified) return;

    document.querySelectorAll('[data-connect-action]').forEach((el) => {
      if (el.dataset.lockBound) return;
      el.dataset.lockBound = '1';
      if (el.matches('a, button')) {
        el.addEventListener(
          'click',
          (e) => {
            if (document.body.classList.contains('is-verified')) return;
            e.preventDefault();
            e.stopPropagation();
          },
          true
        );
      }
    });
  }

  // Shared header: page files supply only their action controls.
  const PAGE_TITLES = {
    dashboard: 'Dashboard', students: 'People', chats: 'Chats', calls: 'Meet',
    community: 'Community', profile: 'Profile', calendar: 'Profile',
    reviews: 'Reviews', transactions: 'Transactions', settings: 'Settings',
  };
  const PROFILE_SECTIONS = [
    ['edit', 'Edit profile', 'profile.html'],
    ['services', 'Services & fee', 'profile.html?tab=services'],
    ['testimonials', 'Testimonials', 'profile.html?tab=testimonials'],
    ['calendar', 'Calendar', 'calendar.html'],
    ['preview', 'Student preview', 'profile.html?tab=preview'],
  ];

  function mountHeader() {
    const main = document.querySelector('.main');
    if (!main) return;
    let header = main.querySelector(':scope > .topbar');
    if (!header) {
      header = document.createElement('header');
      main.prepend(header);
    }
    header.classList.add('topbar', 'app-header');
    header.setAttribute('role', 'banner');
    let title = header.querySelector('h1');
    if (!title) {
      title = document.createElement('h1');
      header.prepend(title);
    }
    const page = currentPageId();
    title.textContent = PAGE_TITLES[page] || document.title.split('—')[0].trim();
    let actions = header.querySelector('.actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'actions';
      header.append(actions);
    }
    const sections = header.querySelector('.profile-view-tabs');
    if (sections) {
      sections.className = 'profile-view-tabs';
      sections.setAttribute('role', 'group');
      sections.setAttribute('aria-label', 'Profile sections');
      PROFILE_SECTIONS.forEach(function ([id, label, href]) {
        // Reuse existing buttons to preserve page event handlers.
        let control = sections.querySelector('#tab-' + id);
        if (!control) {
          control = document.createElement('a');
          control.id = 'tab-' + id;
          control.href = href;
          if (location.pathname.endsWith('/calendar.html') && id === 'calendar') {
            control.classList.add('active');
            control.setAttribute('aria-current', 'page');
          }
        }
        control.classList.remove('auth-tab');
        control.classList.add('profile-tab');
        control.textContent = label;
        sections.append(control);
      });
      sections.querySelectorAll('.auth-tab').forEach(function (legacy) { legacy.remove(); });
    }
    if (window.GradRightReactShell) {
      window.GradRightReactShell.renderHeader(header, title.textContent, actions);
    }
    return header;
  }

  /** Paint cached markup ASAP so the aside is never empty on navigations */
  function ensureMobileCss() {
    if (window.GradRightReactShell) return;
    if (document.querySelector('link[href^="css/mobile.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/mobile.css?v=notif8';
    link.setAttribute('data-mobile-css', '1');
    document.head.appendChild(link);
  }

  function closeMobileNav() {
    document.body.classList.remove('nav-open');
    var toggle = document.getElementById('nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function bindMobileNav(sidebar) {
    if (!sidebar || sidebar.dataset.mobileNav === '1') return;
    sidebar.dataset.mobileNav = '1';

    var topbar = document.querySelector('.main > .topbar') || document.querySelector('.topbar');
    if (!topbar) {
      var main = document.querySelector('.main');
      if (main) {
        topbar = document.createElement('header');
        topbar.className = 'topbar mobile-topbar';
        topbar.innerHTML = '<h1>' + (document.title.split('—')[0].trim() || 'GradRight') + '</h1>';
        main.insertBefore(topbar, main.firstChild);
      }
    }
    if (topbar && !document.getElementById('nav-toggle')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'nav-toggle';
      btn.className = 'nav-toggle';
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">menu</span>';
      topbar.insertBefore(btn, topbar.firstChild);
      btn.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    if (!document.getElementById('nav-backdrop')) {
      var back = document.createElement('button');
      back.type = 'button';
      back.id = 'nav-backdrop';
      back.className = 'nav-backdrop';
      back.setAttribute('aria-label', 'Close menu');
      back.addEventListener('click', closeMobileNav);
      document.body.appendChild(back);
    }

    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMobileNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileNav();
    });
  }

  function loadLiveCall(then) {
    if (window.GradRightLiveCall) {
      then();
      return;
    }
    var existing = document.querySelector('script[data-live-call]');
    if (existing) {
      existing.addEventListener('load', then);
      return;
    }
    var script = document.createElement('script');
    script.src = 'js/live-call.js';
    script.dataset.liveCall = '1';
    script.onload = then;
    script.onerror = then;
    document.head.appendChild(script);
  }

  function mount() {
    mountHeader();
    const el = document.getElementById('app-sidebar');
    if (!el) {
      bindMobileNav(document.getElementById('app-settings-nav'));
      applySessionFields();
      applyAccess();
      paintSettingsChip();
      ensureIconFont();
      loadLiveCall(function () {
        if (window.GradRightLiveCall) GradRightLiveCall.mount();
      });
      loadNotifications();
      return;
    }

    const page = currentPageId();
    const account = session();
    const verified = isVerified();
    const fingerprint = accountFingerprint(account, verified);

    if (page === 'dashboard-pending') {
      location.replace('dashboard.html');
      return;
    }

    const activePage = normalizeNavId(page);
    el.classList.add('sidebar');

    window.GradRightReactShell.renderSidebar(el, { page: activePage, verified, account });
    saveSidebarMeta(fingerprint);

    document.body.dataset.page = page;
    bindMobileNav(el);

    const topbar = document.querySelector('.main > .topbar');
    if (topbar) topbar.setAttribute('role', 'banner');

    applySessionFields();
    applyAccess();
    paintSettingsChip();
    ensureIconFont();
    loadLiveCall(function () {
      if (window.GradRightLiveCall) GradRightLiveCall.mount();
    });
    loadNotifications();
  }

  function loadNotifications() {
    if (window.GradRightNotifications) {
      GradRightNotifications.mount();
      return;
    }
    var existing = document.querySelector('script[data-notifications]');
    if (existing) {
      existing.addEventListener('load', function () {
        if (window.GradRightNotifications) GradRightNotifications.mount();
      });
      return;
    }
    var script = document.createElement('script');
    script.src = 'js/notifications.js?v=notif8';
    script.dataset.notifications = '1';
    script.onload = function () {
      if (window.GradRightNotifications) GradRightNotifications.mount();
    };
    document.head.appendChild(script);
  }

  ensureMobileCss();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.GradRightShell = {
    mount,
    mountHeader,
    currentPageId,
    isVerified,
    session,
    applyAccess,
    applySessionFields,
  };
})();
