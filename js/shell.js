/**
 * GradRight Counselor — shared app shell (sidebar navigation)
 * Single source of truth for left nav + counselor chip.
 *
 * Usage on any app page:
 *   <body data-page="dashboard">
 *   <aside id="app-sidebar" class="sidebar"></aside>
 *   <script src="js/session.js"></script>
 *   <script src="js/shell.js"></script>
 */
(function () {
  var SIDEBAR_HTML_KEY = 'gradright_sidebar_html';
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
    if (page === 'student-profile') return 'students';
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
      nav: 6,
    };
  }

  function metaEquals(a, b) {
    if (!a || !b) return false;
    return (
      a.verified === b.verified &&
      a.phone === b.phone &&
      a.name === b.name &&
      a.initials === b.initials &&
      a.nav === b.nav
    );
  }

  function readSidebarCache() {
    try {
      const html = sessionStorage.getItem(SIDEBAR_HTML_KEY);
      const meta = JSON.parse(sessionStorage.getItem(SIDEBAR_META_KEY) || 'null');
      if (!html || !meta) return null;
      return { html: html, meta: meta };
    } catch (e) {
      return null;
    }
  }

  function writeSidebarCache(html, meta) {
    try {
      sessionStorage.setItem(SIDEBAR_HTML_KEY, html);
      sessionStorage.setItem(SIDEBAR_META_KEY, JSON.stringify(meta));
    } catch (e) {}
  }

  function navItem(page, href, label, icon, opts) {
    const active = page === opts.id ? ' active' : '';
    const badge = opts.badge
      ? ` <span class="badge-count">${opts.badge}</span>`
      : '';
    return `<a class="nav-item${active}" href="${href}" data-nav="${opts.id}"><span class="ico material-symbols-rounded" data-icon="${icon}" aria-hidden="true">${icon}</span><span class="nav-label-text">${label}</span>${badge}</a>`;
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

  function renderSidebar(page, verified, account) {
    const dashHref = 'dashboard.html';
    const dashId = 'dashboard';
    const status = verified
      ? '<span class="status-dot verified"></span>Verified'
      : '<span class="status-dot"></span>Not verified';
    const name = (account && account.name) || 'Priya Sharma';
    const initials = (account && account.initials) || 'PS';

    return `
      <div class="brand-mark">
        <img class="brand-logo" src="assets/gradright-logo.png" alt="GradRight" />
      </div>
      <div class="nav-label">Workspace</div>
      ${navItem(page, dashHref, 'Dashboard', 'home', { id: dashId })}
      ${navItem(page, 'students.html', 'People', 'group', { id: 'students' })}
      <div class="nav-label">Connect</div>
      ${navItem(page, 'chats.html', 'Chats', 'chat', { id: 'chats', badge: verified ? '5' : '' })}
      ${navItem(page, 'calls.html', 'Meet', 'videocam', { id: 'calls' })}
      ${navItem(page, 'community.html', 'Community', 'forum', { id: 'community' })}
      <div class="nav-label">You</div>
      ${navItem(page, 'profile.html', 'Profile', 'person', { id: 'profile' })}
      ${navItem(page, 'transactions.html', 'Transactions', 'payments', { id: 'transactions' })}
      ${navItem(page, 'reviews.html', 'Reviews', 'star', { id: 'reviews' })}
      <div class="sidebar-foot">
        <div class="counselor-chip">
          <div class="avatar">${initials}</div>
          <div class="meta">
            <strong>${name}</strong>
            <small>${status}</small>
          </div>
          <a class="sidebar-settings${page === 'settings' ? ' active' : ''}" href="settings.html" data-nav="settings" aria-label="Settings">
            <span class="ico material-symbols-rounded" data-icon="settings" aria-hidden="true">settings</span>
          </a>
        </div>
      </div>
    `;
  }

  function setActiveNav(el, activePage) {
    el.querySelectorAll('[data-nav]').forEach(function (item) {
      const id = item.getAttribute('data-nav');
      item.classList.toggle('active', id === activePage);
    });
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

  function bindNavClick(el) {
    if (el.dataset.navBound === '1') return;
    el.dataset.navBound = '1';
    el.addEventListener('click', function (e) {
      const item = e.target.closest('.nav-item');
      if (!item || !el.contains(item)) return;
      el.querySelectorAll('.nav-item.active').forEach(function (n) {
        n.classList.remove('active');
      });
      item.classList.add('active');
    });
  }

  /** Paint cached markup ASAP so the aside is never empty on navigations */
  function ensureMobileCss() {
    if (document.querySelector('link[data-mobile-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/mobile.css?v=mobile1';
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

  function earlyPaint() {
    const el = document.getElementById('app-sidebar');
    if (!el || el.children.length) return;

    const cached = readSidebarCache();
    if (!cached) return;

    const fingerprint = accountFingerprint(session(), isVerified());
    if (!metaEquals(cached.meta, fingerprint)) return;

    el.classList.add('sidebar');
    el.innerHTML = cached.html;
    setActiveNav(el, normalizeNavId(currentPageId()));
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

    const cached = readSidebarCache();
    const canReuse =
      el.querySelector('.nav-item[data-nav]') &&
      cached &&
      metaEquals(cached.meta, fingerprint);

    if (canReuse) {
      /* Same account/verified — only flip active; no full remount */
      setActiveNav(el, activePage);
    } else {
      const html = renderSidebar(activePage, verified, account);
      el.innerHTML = html;
      writeSidebarCache(html, fingerprint);
    }

    document.body.dataset.page = page;
    bindNavClick(el);
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
  }

  ensureMobileCss();
  earlyPaint();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.GradRightShell = {
    mount,
    currentPageId,
    isVerified,
    session,
    applyAccess,
    applySessionFields,
  };
})();
