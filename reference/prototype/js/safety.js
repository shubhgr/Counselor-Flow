/**
 * GradRight Counselor — report / block (shared across profile openings)
 * Blocked users persist in Settings → Block, and can be unblocked there.
 */
(function () {
  var BLOCK_KEY = 'gradright_blocked_users_v1';
  var REPORT_KEY = 'gradright_reports_v1';
  var toastTimer = null;

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]') || [];
    } catch (e) {
      return [];
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
        .join('') || '—'
    );
  }

  function meName() {
    var s = window.GradRightSession && GradRightSession.get && GradRightSession.get();
    return (s && s.name) || 'Priya Sharma';
  }

  function normalize(user) {
    user = user || {};
    var name = String(user.name || '').trim();
    var id = String(user.id || (name ? 'c:' + name : '')).trim();
    return {
      id: id,
      name: name,
      initials: user.initials || initialsFrom(name),
      role: user.role || 'student',
      email: user.email || '',
      amber: !!user.amber,
    };
  }

  function isSelf(user) {
    var n = normalize(user);
    return !!n.name && n.name === meName();
  }

  function matches(stored, ref) {
    if (!stored) return false;
    if (typeof ref === 'string') return stored.id === ref || stored.name === ref;
    var n = normalize(ref);
    return (!!n.id && stored.id === n.id) || (!!n.name && stored.name === n.name);
  }

  function listBlocked() {
    return load(BLOCK_KEY);
  }

  function listReports() {
    return load(REPORT_KEY);
  }

  function isBlocked(ref) {
    return listBlocked().some(function (u) {
      return matches(u, ref);
    });
  }

  function emit(action, user) {
    document.dispatchEvent(
      new CustomEvent('gradright:safety', { detail: { action: action, user: user } })
    );
  }

  function block(user) {
    var n = normalize(user);
    if (!n.id || isSelf(n) || isBlocked(n)) return n;
    var list = listBlocked();
    list.unshift(
      Object.assign({}, n, {
        blockedAt: new Date().toISOString(),
      })
    );
    save(BLOCK_KEY, list);
    emit('block', n);
    toast(n.name + ' blocked', 'You can unblock them in Settings.');
    return n;
  }

  function unblock(id) {
    var found = null;
    var next = listBlocked().filter(function (u) {
      if (matches(u, id)) {
        found = u;
        return false;
      }
      return true;
    });
    save(BLOCK_KEY, next);
    if (found) {
      emit('unblock', found);
      toast(found.name + ' unblocked', 'They can message and book again.');
    }
    return found;
  }

  function addReport(user, reason, details) {
    var n = normalize(user);
    var row = Object.assign({}, n, {
      reason: reason || 'other',
      details: String(details || '').trim(),
      reportedAt: new Date().toISOString(),
    });
    var list = listReports();
    list.unshift(row);
    save(REPORT_KEY, list);
    emit('report', row);
    toast('Report submitted', 'GradRight support will review this.');
    return row;
  }

  function roleLabel(role) {
    if (role === 'parent') return 'Parent';
    if (role === 'counselor') return 'Counselor';
    if (role === 'professor') return 'Professor';
    return 'Student';
  }

  function reasonLabel(id) {
    if (id === 'harassment') return 'Harassment or abuse';
    if (id === 'spam') return 'Spam or scam';
    if (id === 'inappropriate') return 'Inappropriate content';
    return 'Something else';
  }

  function attrs(n) {
    return (
      ' data-id="' +
      escapeHtml(n.id) +
      '" data-name="' +
      escapeHtml(n.name) +
      '" data-initials="' +
      escapeHtml(n.initials) +
      '" data-role="' +
      escapeHtml(n.role) +
      '" data-email="' +
      escapeHtml(n.email) +
      '" data-amber="' +
      (n.amber ? '1' : '0') +
      '"'
    );
  }

  function actionsHtml(user) {
    var n = normalize(user);
    if (!n.id || isSelf(n)) return '';
    if (isBlocked(n)) {
      return (
        '<div class="cpp-safety">' +
        '<button type="button" data-safety="unblock" data-id="' +
        escapeHtml(n.id) +
        '">Unblock</button></div>'
      );
    }
    return (
      '<div class="cpp-safety">' +
      '<button type="button" data-safety="report"' +
      attrs(n) +
      '>Report</button>' +
      '<button type="button" class="cpp-safety-block" data-safety="block"' +
      attrs(n) +
      '>Block</button></div>'
    );
  }

  function userFromBtn(btn) {
    return normalize({
      id: btn.getAttribute('data-id'),
      name: btn.getAttribute('data-name'),
      initials: btn.getAttribute('data-initials'),
      role: btn.getAttribute('data-role'),
      email: btn.getAttribute('data-email'),
      amber: btn.getAttribute('data-amber') === '1',
    });
  }

  var pending = null;
  var mode = '';

  function ensureUi() {
    if (document.getElementById('safety-modal')) return;
    var modal = document.createElement('div');
    modal.className = 'cal-modal safety-modal';
    modal.id = 'safety-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="cal-modal-backdrop" data-safety-close></div>' +
      '<div class="cal-modal-card" role="dialog" aria-modal="true" aria-labelledby="safety-title">' +
      '<div class="cal-modal-head">' +
      '<h2 id="safety-title">Report</h2>' +
      '<button type="button" class="icon-btn" data-safety-close aria-label="Close">' +
      '<span class="material-symbols-rounded" aria-hidden="true">close</span>' +
      '</button></div>' +
      '<div class="cal-modal-section" id="safety-body"></div>' +
      '<div class="block-modal-actions" id="safety-actions"></div></div>';
    document.body.appendChild(modal);

    if (!document.getElementById('safety-toast')) {
      var toastEl = document.createElement('div');
      toastEl.className = 'people-toast';
      toastEl.id = 'safety-toast';
      toastEl.hidden = true;
      document.body.appendChild(toastEl);
    }
  }

  function closeModal() {
    var modal = document.getElementById('safety-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('cal-modal-open');
    pending = null;
    mode = '';
  }

  function openModal() {
    ensureUi();
    var modal = document.getElementById('safety-modal');
    modal.hidden = false;
    document.body.classList.add('cal-modal-open');
  }

  function openReport(user) {
    var n = normalize(user);
    if (!n.id || isSelf(n)) return;
    pending = n;
    mode = 'report';
    ensureUi();
    document.getElementById('safety-title').textContent = 'Report ' + n.name;
    document.getElementById('safety-body').innerHTML =
      '<p class="cal-modal-label">Why are you reporting this person?</p>' +
      '<label class="safety-reason"><input type="radio" name="safety-reason" value="harassment" checked> Harassment or abuse</label>' +
      '<label class="safety-reason"><input type="radio" name="safety-reason" value="spam"> Spam or scam</label>' +
      '<label class="safety-reason"><input type="radio" name="safety-reason" value="inappropriate"> Inappropriate content</label>' +
      '<label class="safety-reason"><input type="radio" name="safety-reason" value="other"> Something else</label>' +
      '<label class="field safety-details"><span>Details</span>' +
      '<textarea id="safety-details" rows="3" placeholder="What happened?"></textarea></label>';
    document.getElementById('safety-actions').innerHTML =
      '<button type="button" class="btn btn-secondary btn-sm" data-safety-close>Cancel</button>' +
      '<button type="button" class="btn btn-primary btn-sm" data-safety="submit-report">Submit report</button>';
    openModal();
    var field = document.getElementById('safety-details');
    if (field) field.focus();
  }

  function openBlock(user) {
    var n = normalize(user);
    if (!n.id || isSelf(n)) return;
    if (isBlocked(n)) {
      unblock(n.id);
      return;
    }
    pending = n;
    mode = 'block';
    ensureUi();
    document.getElementById('safety-title').textContent = 'Block ' + n.name + '?';
    document.getElementById('safety-body').innerHTML =
      '<p class="cal-modal-label">They won’t be able to message, book, or meet you. You can unblock them anytime in Settings.</p>';
    document.getElementById('safety-actions').innerHTML =
      '<button type="button" class="btn btn-secondary btn-sm" data-safety-close>Cancel</button>' +
      '<button type="button" class="btn btn-danger btn-sm" data-safety="confirm-block">Block</button>';
    openModal();
  }

  function toast(title, sub) {
    ensureUi();
    var el = document.getElementById('safety-toast');
    if (!el) return;
    el.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(sub || '') + '</span>';
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.hidden = true;
    }, 3200);
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    ensureUi();
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-safety-close]')) {
        closeModal();
        return;
      }
      var btn = e.target.closest('[data-safety]');
      if (!btn) return;
      var action = btn.getAttribute('data-safety');
      if (action === 'report') {
        e.preventDefault();
        openReport(userFromBtn(btn));
      } else if (action === 'block') {
        e.preventDefault();
        openBlock(userFromBtn(btn));
      } else if (action === 'unblock') {
        e.preventDefault();
        unblock(btn.getAttribute('data-id') || btn.getAttribute('data-name'));
      } else if (action === 'submit-report') {
        if (!pending) return;
        var picked = document.querySelector('input[name="safety-reason"]:checked');
        var details = document.getElementById('safety-details');
        addReport(pending, picked ? picked.value : 'other', details ? details.value : '');
        closeModal();
      } else if (action === 'confirm-block') {
        if (!pending) return;
        block(pending);
        closeModal();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mode) closeModal();
    });
  });

  window.GradRightSafety = {
    list: listBlocked,
    reports: listReports,
    isBlocked: isBlocked,
    isSelf: isSelf,
    block: block,
    unblock: unblock,
    report: addReport,
    actionsHtml: actionsHtml,
    openReport: openReport,
    openBlock: openBlock,
    normalize: normalize,
    roleLabel: roleLabel,
    reasonLabel: reasonLabel,
    escapeHtml: escapeHtml,
  };
})();
