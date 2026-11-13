import { readPublicIdentity } from '@/lib/domain/public-identity';
import {
  AUTHORS,
  posts,
  socialGraph,
  buildSocialGraph,
  readPublishedPosts,
  savePublishedPosts,
  parseCommunityTime,
} from '@/lib/domain/community';

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

  const TODAY = (window.GradRightDB && GradRightDB.today) || new Date(2026, 8, 23, 18, 0);
  const MONTHS_COMM = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];
  const parseStamp =
    (window.GradRightDB && GradRightDB.parseStamp) ||
    function (s) {
      if (!s) return null;
      if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
      const p = String(s)
        .trim()
        .split(/[- :T]/)
        .map(Number);
      const d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1, p[3] || 0, p[4] || 0);
      return isNaN(d.getTime()) ? null : d;
    };
  const formatClock =
    (window.GradRightDB && GradRightDB.formatTime) ||
    function (d) {
      const h = d.getHours();
      const m = d.getMinutes();
      const ap = h >= 12 ? 'PM' : 'AM';
      return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + ap;
    };

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

  function parseRelativeTime(label) {
    return parseCommunityTime(label, TODAY, parseStamp);
  }

  function formatCommunityWhen(stamp) {
    const d = stamp instanceof Date ? stamp : parseStamp(stamp) || parseRelativeTime(stamp);
    if (!d) return '—';
    const ageMin = Math.max(0, Math.floor((TODAY - d) / 60000));
    if (ageMin < 1) return 'Just now';
    if (ageMin < 60) return ageMin + ' min ago';
    const ageHr = Math.floor(ageMin / 60);
    if (ageHr < 5) return ageHr + ' hr ago';
    const t0 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((t0 - d0) / 86400000);
    const time = formatClock(d);
    if (diff === 0) return 'Today, ' + time;
    if (diff === 1) return 'Yesterday, ' + time;
    return d.getDate() + ' ' + MONTHS_COMM[d.getMonth()] + ', ' + time;
  }

  function ensureAt(item) {
    if (!item) return '';
    if (item.at) return item.at;
    item.at = isoStamp(parseRelativeTime(item.time));
    return item.at;
  }

  function hydrateTimes(list) {
    (list || []).forEach(function (p) {
      ensureAt(p);
      (p.comments || []).forEach(function (c) {
        ensureAt(c);
        (c.replies || []).forEach(ensureAt);
      });
    });
  }

  function displayWhen(item) {
    return formatCommunityWhen(ensureAt(item));
  }

  let filter = 'recent';
  let query = '';
  let filterOpen = false;
  const openThreads = new Set();
  const openMenus = new Set();
  const replyTo = {};
  let meName = 'Priya Sharma';
  const profileStack = [];

  const feed = document.getElementById('community-feed');
  const empty = document.getElementById('community-empty');
  const composer = document.getElementById('composer');
  const composeText = document.getElementById('compose-text');
  const filterMenu = document.getElementById('filter-menu');
  const filterBtn = document.getElementById('filter-btn');
  const workspace = document.getElementById('community-workspace');
  const profilePanel = document.getElementById('profile-panel');
  const profilePanelBody = document.getElementById('profile-panel-body');
  const profileBack = document.getElementById('profile-back');
  const profilePanelTitle = document.getElementById('profile-panel-title');
  const profilePanelClose = document.getElementById('profile-panel-close');

  function authorMeta(name) {
    return (
      AUTHORS[name] || {
        type: 'student',
        initials: name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        amber: false,
        role: 'Community member',
        bio: '',
        followers: 0,
        following: 0,
      }
    );
  }

  function roleBadge(name) {
    const meta = authorMeta(name);
    if (meta.type === 'counselor') {
      return '<span class="role-badge counselor">Counselor</span>';
    }
    if (meta.type === 'professor') {
      return '<span class="role-badge professor">Professor</span>';
    }
    return '<span class="role-badge student">Student</span>';
  }

  function nameButton(name) {
    return (
      '<button type="button" class="c-name-btn" data-action="open-profile" data-author="' +
      encodeURIComponent(name) +
      '">' +
      name +
      '</button> ' +
      roleBadge(name)
    );
  }

  function icon(name, fill) {
    return (
      '<span class="app-icon' + (fill ? ' fill' : '') + '" aria-hidden="true">' + name + '</span>'
    );
  }

  function canInteract() {
    if (window.GradRightShell && typeof GradRightShell.isVerified === 'function') {
      return !!GradRightShell.isVerified();
    }
    if (window.GradRightSession && typeof GradRightSession.isVerified === 'function') {
      return !!GradRightSession.isVerified();
    }
    return document.body.classList.contains('is-verified');
  }

  function isFollowingAuthor(name) {
    return posts.some((p) => p.author === name && p.following);
  }

  function setFollowingAuthor(name, value) {
    posts.forEach((p) => {
      if (p.author === name) p.following = value;
    });
  }

  function authorUser(name) {
    const meta = authorMeta(name);
    return {
      id: 'c:' + name,
      name: name,
      initials: meta.initials,
      role: meta.type || 'student',
      amber: !!meta.amber,
    };
  }

  function connectedPerson(name) {
    const list = (window.GradRightDB && GradRightDB.people) || [];
    const key = String(name || '')
      .trim()
      .toLowerCase();
    if (!key) return null;
    return (
      list.filter(function (p) {
        return (
          p.connected &&
          String(p.name || '')
            .trim()
            .toLowerCase() === key
        );
      })[0] || null
    );
  }

  function filteredPosts() {
    let list = posts.slice();
    if (window.GradRightSafety) {
      list = list.filter(function (p) {
        return !GradRightSafety.isBlocked(authorUser(p.author));
      });
    }
    if (filter === 'following') list = list.filter((p) => p.following);
    if (filter === 'top') list = list.slice().sort((a, b) => b.likes - a.likes);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.body.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q),
      );
    }
    return list;
  }

  function commentCount(p) {
    return p.comments.reduce((n, c) => n + 1 + (c.replies ? c.replies.length : 0), 0);
  }

  function collectActivity(name) {
    const authoredPosts = [];
    const authoredReplies = [];
    posts.forEach((p) => {
      if (p.author === name) {
        authoredPosts.push({
          id: p.id,
          at: ensureAt(p),
          tag: p.tag,
          body: p.body,
          likes: p.likes,
        });
      }
      p.comments.forEach((c) => {
        if (c.author === name) {
          authoredReplies.push({
            at: ensureAt(c),
            text: c.text,
            onAuthor: p.author,
          });
        }
        (c.replies || []).forEach((r) => {
          if (r.author === name) {
            authoredReplies.push({
              at: ensureAt(r),
              text: r.text,
              onAuthor: p.author,
            });
          }
        });
      });
    });
    return { posts: authoredPosts, replies: authoredReplies };
  }

  function repliesLabel(count) {
    if (count <= 0) return '';
    if (count === 1) return 'View 1 reply';
    return 'View ' + count + ' replies';
  }

  function renderComment(postId, c, isReply) {
    const meta = authorMeta(c.author);
    return (
      '<div class="cmt' +
      (isReply ? ' cmt-reply' : '') +
      '">' +
      '<button type="button" class="avatar' +
      (meta.amber ? ' amber' : '') +
      ' sm c-avatar-btn" data-action="open-profile" data-author="' +
      encodeURIComponent(c.author) +
      '">' +
      meta.initials +
      '</button>' +
      '<div class="cmt-body">' +
      '<div class="cmt-meta"><div class="c-name-row">' +
      nameButton(c.author) +
      '</div><span>' +
      displayWhen(c) +
      '</span></div>' +
      '<p>' +
      c.text +
      '</p>' +
      (!isReply
        ? '<button type="button" class="cmt-reply-btn" data-action="reply" data-post="' +
          postId +
          '" data-cmt="' +
          c.id +
          '">Reply</button>'
        : '') +
      (c.replies && c.replies.length
        ? '<div class="cmt-replies">' +
          c.replies.map((r) => renderComment(postId, r, true)).join('') +
          '</div>'
        : '') +
      (replyTo[postId] === c.id
        ? '<form class="cmt-compose" data-post="' +
          postId +
          '" data-parent="' +
          c.id +
          '"><input type="text" placeholder="Write a reply…" maxlength="500" /><button class="btn btn-primary btn-sm" type="submit">Reply</button></form>'
        : '') +
      '</div></div>'
    );
  }

  function ownedPosts() {
    const { email } = communitySession();
    return email ? readPublishedPosts(window.localStorage, email) : [];
  }

  function renderPost(p) {
    const ownPost = ownedPosts().some((post) => post.id === p.id);
    const meta = authorMeta(p.author);
    const threadOpen = openThreads.has(p.id);
    const menuOpen = openMenus.has(p.id);
    const count = commentCount(p);
    const locked = !canInteract();

    return (
      '<article class="c-post" data-id="' +
      p.id +
      '">' +
      '<div class="c-post-meta">' +
      '<button type="button" class="avatar' +
      (meta.amber ? ' amber' : '') +
      ' c-avatar-btn" data-action="open-profile" data-author="' +
      encodeURIComponent(p.author) +
      '">' +
      meta.initials +
      '</button>' +
      '<div class="c-post-who">' +
      '<div class="c-name-row">' +
      nameButton(p.author) +
      '</div>' +
      '<span>' +
      displayWhen(p) +
      ' · ' +
      p.tag +
      '</span></div>' +
      (ownPost
        ? ''
        : '<button type="button" class="btn ' +
          (p.following ? 'btn-secondary' : 'btn-primary') +
          ' btn-sm c-follow" data-action="follow" data-id="' +
          p.id +
          '"' +
          (locked ? ' disabled' : '') +
          '>' +
          (p.following ? 'Following' : 'Follow') +
          '</button>') +
      '<button type="button" class="icon-btn' +
      (p.saved ? ' on' : '') +
      '" data-action="save" data-id="' +
      p.id +
      '" title="Save"' +
      (locked ? ' disabled' : '') +
      '>' +
      icon(p.saved ? 'bookmark' : 'bookmark_border', p.saved) +
      '</button>' +
      '<div class="c-menu-wrap">' +
      '<button type="button" class="icon-btn" data-action="menu" data-id="' +
      p.id +
      '" title="More">' +
      icon('more_vert') +
      '</button>' +
      (menuOpen
        ? '<div class="c-menu" role="menu">' +
          '<button type="button" data-action="share" data-id="' +
          p.id +
          '">Share</button>' +
          '<button type="button" data-action="copy" data-id="' +
          p.id +
          '">Copy link</button>' +
          '<button type="button" data-action="open-profile" data-author="' +
          encodeURIComponent(p.author) +
          '">View profile</button>' +
          (ownPost
            ? '<button type="button" class="danger" data-action="delete-post" data-id="' +
              p.id +
              '">Delete post</button>'
            : '<button type="button" data-action="report" data-id="' +
              p.id +
              '">Report</button>' +
              '<button type="button" class="danger" data-action="block" data-id="' +
              p.id +
              '">Block</button>') +
          '</div>'
        : '') +
      '</div></div>' +
      '<p class="c-post-body">' +
      p.body +
      '</p>' +
      (p.image
        ? '<img class="community-post-image" src="' +
          p.image +
          '" alt="University campus building surrounded by trees" loading="lazy">'
        : '') +
      '<div class="c-post-actions">' +
      '<button type="button" class="react-btn' +
      (p.liked ? ' on' : '') +
      '" data-action="like" data-id="' +
      p.id +
      '"' +
      (locked ? ' disabled' : '') +
      '>' +
      icon(p.liked ? 'thumb_up' : 'thumb_up_off_alt', p.liked) +
      '<span data-count="likes">' +
      p.likes +
      '</span></button>' +
      '<button type="button" class="react-btn' +
      (p.disliked ? ' on' : '') +
      '" data-action="dislike" data-id="' +
      p.id +
      '"' +
      (locked ? ' disabled' : '') +
      '>' +
      icon(p.disliked ? 'thumb_down' : 'thumb_down_off_alt', p.disliked) +
      '<span data-count="dislikes">' +
      p.dislikes +
      '</span></button>' +
      '<button type="button" class="react-btn' +
      (threadOpen ? ' on' : '') +
      '" data-action="comments" data-id="' +
      p.id +
      '">' +
      icon(threadOpen ? 'chat_bubble' : 'chat_bubble_outline', threadOpen) +
      '<span>' +
      count +
      '</span></button></div>' +
      (!threadOpen && count > 0
        ? '<button type="button" class="c-reply-teaser" data-action="comments" data-id="' +
          p.id +
          '">' +
          icon('forum') +
          '<span>' +
          repliesLabel(count) +
          '</span></button>'
        : '') +
      (threadOpen
        ? '<div class="c-thread">' +
          '<div class="c-thread-head"><strong>Comments</strong>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="hide-comments" data-id="' +
          p.id +
          '">Hide</button></div>' +
          (p.comments.length
            ? p.comments.map((c) => renderComment(p.id, c, false)).join('')
            : '<p class="c-thread-empty">No comments yet. Be the first to reply.</p>') +
          '<form class="cmt-compose" data-post="' +
          p.id +
          '" data-parent="">' +
          '<input type="text" placeholder="Write a comment…" maxlength="500" ' +
          (locked ? 'disabled' : '') +
          ' />' +
          '<button class="btn btn-primary btn-sm" type="submit"' +
          (locked ? ' disabled' : '') +
          '>Comment</button></form></div>'
        : '') +
      '</article>'
    );
  }

  function syncFilterUI() {
    const labels = { recent: 'Recent', top: 'Top', following: 'Following' };
    const filterLabel = document.getElementById('filter-label');
    if (filterLabel) filterLabel.textContent = labels[filter] || 'Recent';
    filterMenu.hidden = !filterOpen;
    filterBtn.setAttribute('aria-expanded', filterOpen ? 'true' : 'false');
    filterBtn.classList.toggle('on', filterOpen || filter !== 'recent');
    document.querySelectorAll('.filter-option').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  function render() {
    const list = filteredPosts();
    const composerOpen = !composer.hidden;
    empty.hidden = list.length > 0;
    feed.innerHTML = list.map(renderPost).join('');
    renderRail();
    syncFilterUI();
    if (window.GradRightShell && GradRightShell.applyAccess) GradRightShell.applyAccess();
    if (!composerOpen) composer.hidden = true;
  }

  function myExpertiseTags() {
    const tags = [];
    const seen = {};
    function add(tag) {
      const t = String(tag || '').trim();
      if (!t || seen[t.toLowerCase()]) return;
      seen[t.toLowerCase()] = true;
      tags.push(t);
    }
    add('US STEM');
    add('SOP help');
    add('Canada pathways');
    add('UK');
    if (window.GradRightServices && GradRightServices.get) {
      GradRightServices.get().forEach(function (s) {
        const title = String((s && s.title) || '');
        if (/sop|essay/i.test(title)) add('SOP help');
        if (/visa/i.test(title)) add('Visa');
        if (/shortlist|school/i.test(title)) add('US STEM');
        if (/canada/i.test(title)) add('Canada pathways');
        if (/uk|warwick|lse/i.test(title)) add('UK');
      });
    }
    const role = String((authorMeta(meName) && authorMeta(meName).role) || '');
    if (/usa|us\b|stem/i.test(role)) add('US STEM');
    if (/sop/i.test(role)) add('SOP help');
    if (/canada/i.test(role)) add('Canada pathways');
    if (/\buk\b/i.test(role)) add('UK');
    return tags;
  }

  function forYouItems() {
    const tags = myExpertiseTags().map(function (t) {
      return t.toLowerCase();
    });
    return posts
      .filter(function (p) {
        const meta = authorMeta(p.author);
        if (meta.type === 'counselor' || meta.type === 'professor') return false;
        if (p.author === meName) return false;
        return tags.indexOf(String(p.tag || '').toLowerCase()) >= 0;
      })
      .slice()
      .sort(function (a, b) {
        return String(ensureAt(b)).localeCompare(String(ensureAt(a)));
      })
      .slice(0, 5);
  }

  function trendingTopics() {
    const counts = {};
    posts.forEach(function (p) {
      const tag = String(p.tag || '').trim() || 'General';
      if (!counts[tag]) counts[tag] = { tag: tag, posts: 0, likes: 0 };
      counts[tag].posts += 1;
      counts[tag].likes += Number(p.likes) || 0;
    });
    return Object.keys(counts)
      .map(function (k) {
        return counts[k];
      })
      .sort(function (a, b) {
        return b.posts + b.likes * 0.15 - (a.posts + a.likes * 0.15);
      })
      .slice(0, 6);
  }

  function renderRail() {
    const forYouEl = document.getElementById('community-foryou');
    const trendEl = document.getElementById('community-trending');
    if (!forYouEl || !trendEl) return;
    const items = forYouItems();
    if (!items.length) {
      forYouEl.innerHTML =
        '<p class="community-rail-empty">No student questions match your profile topics yet. Keep answering in the feed to attract more.</p>';
    } else {
      forYouEl.innerHTML = items
        .map(function (p) {
          const meta = authorMeta(p.author);
          const snippet = String(p.body || '').slice(0, 92) + (p.body.length > 92 ? '…' : '');
          return (
            '<button type="button" class="community-foryou-item" data-rail-post="' +
            p.id +
            '">' +
            '<span class="avatar sm' +
            (meta.amber ? ' amber' : '') +
            '">' +
            escapeHtml(meta.initials) +
            '</span>' +
            '<span class="community-foryou-copy">' +
            '<strong>' +
            escapeHtml(p.author) +
            '</strong>' +
            '<span class="community-foryou-meta">' +
            escapeHtml(displayWhen(p)) +
            ' · ' +
            escapeHtml(p.tag) +
            '</span>' +
            '<span class="community-foryou-body">' +
            escapeHtml(snippet) +
            '</span></span></button>'
          );
        })
        .join('');
    }
    const topics = trendingTopics();
    trendEl.innerHTML = topics
      .map(function (t) {
        return (
          '<button type="button" class="community-trend-item" data-rail-tag="' +
          encodeURIComponent(t.tag) +
          '">' +
          '<strong>' +
          escapeHtml(t.tag) +
          '</strong>' +
          '<span>' +
          t.posts +
          (t.posts === 1 ? ' post' : ' posts') +
          '</span></button>'
        );
      })
      .join('');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function findPost(id) {
    return posts.find((p) => p.id === id);
  }

  function communitySession() {
    const account = window.GradRightSession?.get() || { name: 'Priya Sharma', initials: 'PS' };
    const identity = readPublicIdentity();
    return { ...account, name: identity.name || account.communityOriginalName || account.name };
  }

  function currentMe() {
    const s = communitySession();
    if (s && s.name) {
      meName = s.name;
      AUTHORS[meName] = AUTHORS[meName] || {
        type: 'counselor',
        initials: s.initials || 'PS',
        amber: false,
        role: 'You · GradRight counselor',
        bio: 'Your counselor profile on GradRight Community.',
        followers: 62,
        following: 40,
      };
      AUTHORS[meName].initials = s.initials || AUTHORS[meName].initials;
    }
    return meName;
  }

  function panelOpen() {
    return !profilePanel.hidden;
  }

  function openPanel() {
    profilePanel.hidden = false;
    workspace.classList.add('is-profile-open');
  }

  function closePanel() {
    profileStack.length = 0;
    profilePanel.hidden = true;
    workspace.classList.remove('is-profile-open');
    profilePanelBody.innerHTML = '';
    profileBack.hidden = true;
    profilePanelClose.hidden = false;
  }

  function pushView(view) {
    profileStack.push(view);
    openPanel();
    renderProfilePanel();
  }

  function replaceTopView(view) {
    if (!profileStack.length) profileStack.push(view);
    else profileStack[profileStack.length - 1] = view;
    openPanel();
    renderProfilePanel();
  }

  function openMyProfile() {
    location.href = '/profile';
  }

  function openProfile(name) {
    if (!name) return;
    var paid = connectedPerson(name);
    if (paid) {
      location.href = '/person?id=' + encodeURIComponent(paid.id) + '&from=community';
      return;
    }
    var meta = authorMeta(name);
    location.href =
      '/person?name=' +
      encodeURIComponent(name) +
      '&from=community&role=' +
      encodeURIComponent(meta.type || 'student');
  }

  function renderProfilePanel() {
    const top = profileStack[profileStack.length - 1];
    if (!top) {
      closePanel();
      return;
    }
    const nested = profileStack.length >= 2;
    profileBack.hidden = !nested;
    profilePanelClose.hidden = nested;
    if (top.type === 'followers') {
      profilePanelTitle.textContent = 'Followers';
      profilePanelBody.innerHTML = renderPeopleList(top.name, 'followers');
    } else if (top.type === 'following') {
      profilePanelTitle.textContent = 'Following';
      profilePanelBody.innerHTML = renderPeopleList(top.name, 'following');
    } else {
      profilePanelTitle.textContent = top.name === currentMe() ? 'Your profile' : 'Profile';
      profilePanelBody.innerHTML = renderProfileCard(top.name);
    }
  }

  function renderPeopleList(owner, kind) {
    const list = (socialGraph[owner] && socialGraph[owner][kind]) || [];
    if (!list.length) {
      return '<p class="hint-text" style="padding:1rem;">No one here yet.</p>';
    }
    return (
      '<div class="cpp-people">' +
      list
        .map(function (name) {
          const meta = authorMeta(name);
          return (
            '<button type="button" class="cpp-person" data-panel-action="open-person" data-name="' +
            encodeURIComponent(name) +
            '">' +
            '<span class="avatar' +
            (meta.amber ? ' amber' : '') +
            '">' +
            meta.initials +
            '</span>' +
            '<span class="cpp-person-meta"><strong>' +
            name +
            '</strong><span>' +
            meta.role +
            '</span></span>' +
            roleBadge(name) +
            '<span class="app-icon" aria-hidden="true">chevron_right</span>' +
            '</button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function renderProfileCard(name) {
    const me = currentMe();
    const meta = authorMeta(name);
    const activity = collectActivity(name);
    const isMe = name === me;
    const isCounselor = meta.type === 'counselor';
    const graph = socialGraph[name] || { followers: [], following: [] };
    const followingThem = isFollowingAuthor(name) || (graph.followers || []).indexOf(me) >= 0;
    const paid = connectedPerson(name);

    const postsHtml = activity.posts.length
      ? activity.posts
          .map(function (p) {
            return (
              '<button type="button" class="c-activity-item c-activity-link" data-panel-action="open-post" data-id="' +
              p.id +
              '">' +
              '<div class="c-activity-label">Post · ' +
              displayWhen(p) +
              (p.tag ? ' · ' + p.tag : '') +
              '</div>' +
              '<p>' +
              p.body +
              '</p>' +
              '<div class="c-activity-meta">' +
              p.likes +
              ' likes</div></button>'
            );
          })
          .join('')
      : '<p class="hint-text">No posts yet.</p>';

    return (
      '<div class="cpp-card">' +
      '<div class="avatar lg' +
      (meta.amber ? ' amber' : '') +
      '">' +
      meta.initials +
      '</div>' +
      '<h2>' +
      name +
      '</h2>' +
      '<p class="c-profile-username">@' +
      escapeHtml(
        meta.username ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '.')
            .replace(/^\.|\.$/g, ''),
      ) +
      '</p>' +
      '<div class="c-profile-badge-row">' +
      roleBadge(name) +
      '</div>' +
      '<p class="c-profile-role">' +
      meta.role +
      '</p>' +
      '<p class="c-profile-bio">' +
      meta.bio +
      '</p>' +
      '<div class="c-profile-stats cpp-stats">' +
      '<div class="cpp-stat"><strong>' +
      activity.posts.length +
      '</strong><span>Posts</span></div>' +
      '<div class="cpp-stat"><strong>' +
      activity.replies.length +
      '</strong><span>Replies</span></div>' +
      '<button type="button" class="cpp-stat" data-panel-action="followers" data-name="' +
      encodeURIComponent(name) +
      '"><strong>' +
      graph.followers.length +
      '</strong><span>Followers</span></button>' +
      '<button type="button" class="cpp-stat" data-panel-action="following" data-name="' +
      encodeURIComponent(name) +
      '"><strong>' +
      graph.following.length +
      '</strong><span>Following</span></button>' +
      '</div>' +
      (isMe
        ? ''
        : '<button type="button" class="btn ' +
          (paid || followingThem ? 'btn-secondary' : 'btn-primary') +
          '" data-panel-action="toggle-follow" data-name="' +
          encodeURIComponent(name) +
          '"' +
          (canInteract() ? '' : ' disabled') +
          '>' +
          (followingThem ? 'Following' : 'Follow') +
          '</button>') +
      (paid
        ? '<a class="btn btn-primary" href="/chats?id=' + encodeURIComponent(paid.id) + '">Chat</a>'
        : '') +
      (isCounselor
        ? '<a class="btn btn-secondary" href="/counselor-public">View marketplace listing</a>'
        : '') +
      '<div class="cpp-section"><h3>Posts</h3>' +
      postsHtml +
      '</div>' +
      '<div class="cpp-section"><h3>Replies</h3>' +
      (activity.replies.length
        ? activity.replies
            .map(
              (reply) =>
                '<article class="c-activity-item"><div class="c-activity-label">Reply · on ' +
                escapeHtml(reply.onAuthor) +
                '’s post</div><p>' +
                escapeHtml(reply.text) +
                '</p></article>',
            )
            .join('')
        : '<p class="hint-text">No replies yet.</p>') +
      '</div>' +
      (window.GradRightSafety && !isMe
        ? GradRightSafety.actionsHtml({
            id: 'c:' + name,
            name: name,
            initials: meta.initials,
            role: meta.type || 'student',
            amber: meta.amber,
          })
        : '') +
      '</div>'
    );
  }

  function closeProfile() {
    closePanel();
  }

  function openComposer() {
    if (!canInteract()) return;
    composer.hidden = false;
    composeText.focus();
  }

  scope.listen(document.getElementById('open-composer'), 'click', openComposer);
  scope.listen(document.getElementById('cancel-composer'), 'click', () => {
    composer.hidden = true;
    composeText.value = '';
  });
  scope.listen(document.getElementById('submit-post'), 'click', () => {
    if (!canInteract()) return;
    const text = composeText.value.trim();
    if (!text) return;
    const s = communitySession();
    AUTHORS[s.name] = AUTHORS[s.name] || {
      type: 'counselor',
      initials: s.initials || 'PS',
      amber: false,
      role: 'You · GradRight counselor',
      bio: 'Your counselor profile on GradRight Community.',
      followers: 0,
      following: 0,
    };
    const post = {
      id: 'p' + Date.now(),
      author: s.name,
      at: isoStamp(TODAY),
      time: 'Just now',
      tag: 'General',
      following: false,
      saved: false,
      liked: false,
      disliked: false,
      likes: 0,
      dislikes: 0,
      body: text,
      comments: [],
    };
    posts.unshift(post);
    if (s.email) {
      const storage = window.localStorage;
      savePublishedPosts(storage, s.email, [post, ...readPublishedPosts(storage, s.email)]);
    }
    composeText.value = '';
    composer.hidden = true;
    filter = 'recent';
    render();
  });

  scope.listen(filterBtn, 'click', (e) => {
    e.stopPropagation();
    filterOpen = !filterOpen;
    syncFilterUI();
  });

  scope.listen(filterMenu, 'click', (e) => {
    const opt = e.target.closest('.filter-option');
    if (!opt) return;
    e.stopPropagation();
    filter = opt.dataset.filter;
    filterOpen = false;
    render();
  });

  scope.listen(document.getElementById('community-search'), 'input', (e) => {
    query = e.target.value;
    render();
  });

  scope.listen(document.getElementById('open-my-profile'), 'click', openMyProfile);
  scope.listen(document.getElementById('profile-panel-close'), 'click', closePanel);
  scope.listen(document.getElementById('profile-back'), 'click', () => {
    if (profileStack.length > 1) {
      profileStack.pop();
      renderProfilePanel();
    } else {
      closePanel();
    }
  });

  scope.listen(profilePanelBody, 'click', (e) => {
    const btn = e.target.closest('[data-panel-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.panelAction;
    const name = btn.dataset.name ? decodeURIComponent(btn.dataset.name) : '';
    if (action === 'followers') {
      pushView({ type: 'followers', name: name });
    } else if (action === 'following') {
      pushView({ type: 'following', name: name });
    } else if (action === 'open-person') {
      pushView({ type: 'profile', name: name });
    } else if (action === 'toggle-follow') {
      if (!canInteract()) return;
      const me = currentMe();
      const graph = socialGraph[name] || { followers: [], following: [] };
      const idx = graph.followers.indexOf(me);
      if (idx >= 0) graph.followers.splice(idx, 1);
      else graph.followers.push(me);
      socialGraph[name] = graph;
      setFollowingAuthor(name, graph.followers.indexOf(me) >= 0);
      const myGraph = socialGraph[me] || { followers: [], following: [] };
      const fIdx = myGraph.following.indexOf(name);
      if (graph.followers.indexOf(me) >= 0 && fIdx < 0) myGraph.following.push(name);
      if (graph.followers.indexOf(me) < 0 && fIdx >= 0) myGraph.following.splice(fIdx, 1);
      socialGraph[me] = myGraph;
      AUTHORS[name].followers = graph.followers.length;
      AUTHORS[me].following = myGraph.following.length;
      renderProfilePanel();
      render();
    } else if (action === 'open-post') {
      focusPost(btn.dataset.id);
    }
  });

  function focusPost(id) {
    if (!id) return;
    const post = findPost(id);
    if (!post) return;
    filter = 'recent';
    query = '';
    document.querySelectorAll('.filter-option').forEach(function (el) {
      el.classList.toggle('active', el.dataset.filter === 'recent');
    });
    const search = document.getElementById('community-search');
    if (search) search.value = '';
    openThreads.add(id);
    openMenus.clear();
    closePanel();
    render();
    requestAnimationFrame(function () {
      const scroller = document.querySelector('.community-primary');
      const el = feed.querySelector('.c-post[data-id="' + id + '"]');
      if (!el) return;
      if (scroller) {
        const top = el.offsetTop - 16;
        scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      el.classList.add('is-flash');
      setTimeout(function () {
        el.classList.remove('is-flash');
      }, 1400);
    });
  }

  const communityRail = document.getElementById('community-rail');
  if (communityRail) {
    scope.listen(communityRail, 'click', function (e) {
      const postBtn = e.target.closest('[data-rail-post]');
      if (postBtn) {
        focusPost(postBtn.getAttribute('data-rail-post'));
        return;
      }
      const tagBtn = e.target.closest('[data-rail-tag]');
      if (tagBtn) {
        const tag = decodeURIComponent(tagBtn.getAttribute('data-rail-tag') || '');
        const search = document.getElementById('community-search');
        query = tag;
        if (search) search.value = tag;
        filter = 'recent';
        closePanel();
        render();
      }
    });
  }

  scope.listen(feed, 'click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const post = id ? findPost(id) : null;

    if (action === 'open-profile') {
      openProfile(decodeURIComponent(btn.dataset.author || ''));
      render();
      return;
    }

    if (action === 'menu') {
      if (openMenus.has(id)) openMenus.delete(id);
      else {
        openMenus.clear();
        openMenus.add(id);
      }
      render();
      return;
    }

    if (action === 'comments') {
      if (openThreads.has(id)) openThreads.delete(id);
      else openThreads.add(id);
      openMenus.delete(id);
      render();
      return;
    }

    if (action === 'hide-comments') {
      openThreads.delete(id);
      delete replyTo[id];
      render();
      return;
    }

    if (action === 'reply') {
      if (!canInteract()) return;
      const cmt = btn.dataset.cmt;
      const postId = btn.dataset.post;
      replyTo[postId] = replyTo[postId] === cmt ? null : cmt;
      openThreads.add(postId);
      render();
      return;
    }

    if (!post) return;

    if (action === 'delete-post') {
      const { email } = communitySession();
      const published = ownedPosts();
      if (!email || !published.some((entry) => entry.id === id)) return;
      if (!window.confirm('Delete this post?')) return;

      savePublishedPosts(
        window.localStorage,
        email,
        published.filter((entry) => entry.id !== id),
      );
      posts.splice(posts.indexOf(post), 1);
      openMenus.delete(id);
      openThreads.delete(id);
      delete replyTo[id];
      render();
      return;
    }

    if (
      !canInteract() &&
      ['follow', 'save', 'like', 'dislike', 'share', 'copy', 'report', 'block'].includes(action)
    ) {
      return;
    }

    if (action === 'follow') {
      post.following = !post.following;
      setFollowingAuthor(post.author, post.following);
      openMenus.delete(id);
      render();
    } else if (action === 'save') {
      post.saved = !post.saved;
      render();
    } else if (action === 'like') {
      if (post.liked) {
        post.liked = false;
        post.likes = Math.max(0, post.likes - 1);
      } else {
        post.liked = true;
        post.likes += 1;
        if (post.disliked) {
          post.disliked = false;
          post.dislikes = Math.max(0, post.dislikes - 1);
        }
      }
      render();
    } else if (action === 'dislike') {
      if (post.disliked) {
        post.disliked = false;
        post.dislikes = Math.max(0, post.dislikes - 1);
      } else {
        post.disliked = true;
        post.dislikes += 1;
        if (post.liked) {
          post.liked = false;
          post.likes = Math.max(0, post.likes - 1);
        }
      }
      render();
    } else if (action === 'share') {
      openMenus.delete(id);
      alert('Sharing options');
      render();
    } else if (action === 'copy') {
      const link = location.href.split('#')[0] + '#' + id;
      if (navigator.clipboard) navigator.clipboard.writeText(link);
      openMenus.delete(id);
      render();
    } else if (action === 'report') {
      openMenus.delete(id);
      render();
      if (window.GradRightSafety) GradRightSafety.openReport(authorUser(post.author));
    } else if (action === 'block') {
      openMenus.delete(id);
      render();
      if (window.GradRightSafety) GradRightSafety.openBlock(authorUser(post.author));
    }
  });

  scope.listen(feed, 'submit', (e) => {
    const form = e.target.closest('.cmt-compose');
    if (!form) return;
    e.preventDefault();
    if (!canInteract()) return;
    const input = form.querySelector('input');
    const text = (input.value || '').trim();
    if (!text) return;
    const postId = form.dataset.post;
    const parent = form.dataset.parent;
    const post = findPost(postId);
    if (!post) return;
    const s = communitySession();
    const entry = {
      id: 'x' + Date.now(),
      author: s.name,
      at: isoStamp(TODAY),
      time: 'Just now',
      text: text,
      replies: [],
    };
    if (parent) {
      const c = post.comments.find((x) => x.id === parent);
      if (c) {
        c.replies = c.replies || [];
        c.replies.push(entry);
      }
      replyTo[postId] = null;
    } else {
      post.comments.push(entry);
    }
    input.value = '';
    openThreads.add(postId);
    render();
  });

  scope.listen(document, 'click', (e) => {
    if (filterOpen && !e.target.closest('#filter-wrap')) {
      filterOpen = false;
      syncFilterUI();
    }
    if (openMenus.size && !e.target.closest('.c-menu-wrap')) {
      openMenus.clear();
      render();
    }
  });

  scope.listen(document, 'gradright:safety', function (e) {
    var detail = (e && e.detail) || {};
    if (detail.action === 'block') {
      var top = profileStack[profileStack.length - 1];
      if (
        top &&
        top.name &&
        detail.user &&
        (detail.user.name === top.name || detail.user.id === 'c:' + top.name)
      ) {
        closePanel();
      }
    }
    render();
  });

  function boot() {
    currentMe();
    const { email } = communitySession();
    if (email) {
      const savedPosts = readPublishedPosts(window.localStorage, email);
      posts.unshift(...savedPosts.filter((post) => !findPost(post.id)));
    }
    hydrateTimes(posts);
    buildSocialGraph(meName);
    const meta = authorMeta(meName);
    document.getElementById('me-avatar').textContent = meta.initials;
    if (window.GradRightShell && GradRightShell.applyAccess) {
      GradRightShell.applyAccess();
    }
    render();
    if (new URLSearchParams(location.search).get('profile') === 'me') location.replace('/profile');
    else {
      closePanel();
      const postId = new URLSearchParams(location.search).get('post');
      if (postId) focusPost(postId);
      if (new URLSearchParams(location.search).get('compose') === '1') openComposer();
    }
  }

  if (document.readyState === 'loading') {
    scope.listen(document, 'DOMContentLoaded', boot);
  } else {
    boot();
  }
}
