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

  const raw = sessionStorage.getItem('gradright_community_profile');
  const root = document.getElementById('profile-root');
  if (!raw) {
    root.innerHTML =
      '<div class="panel"><p>No profile selected. <a href="/community">Back to community</a></p></div>';
  } else {
    const data = JSON.parse(raw);
    const isCounselor = data.type === 'counselor';
    const badge =
      data.type === 'counselor'
        ? '<span class="role-badge counselor">Counselor</span>'
        : data.type === 'professor'
          ? '<span class="role-badge professor">Professor</span>'
          : '<span class="role-badge student">Student</span>';
    document.title = data.name + ' — GradRight';

    if (isCounselor) {
      location.replace('/counselor-public');
    } else {
      const postsHtml = (data.posts || []).length
        ? data.posts
            .map(function (p) {
              return (
                '<article class="c-activity-item">' +
                '<div class="c-activity-label">Post · ' +
                p.time +
                (p.tag ? ' · ' + p.tag : '') +
                '</div>' +
                '<p>' +
                p.body +
                '</p>' +
                '<div class="c-activity-meta">' +
                p.likes +
                ' likes · ' +
                p.replies +
                ' replies</div></article>'
              );
            })
            .join('')
        : '<p class="hint-text">No posts yet.</p>';

      const repliesHtml = (data.replies || []).length
        ? data.replies
            .map(function (r) {
              return (
                '<article class="c-activity-item">' +
                '<div class="c-activity-label">Reply · ' +
                r.time +
                ' · on ' +
                r.onAuthor +
                "'s post</div>" +
                '<p>' +
                r.text +
                '</p></article>'
              );
            })
            .join('')
        : '<p class="hint-text">No replies yet.</p>';

      root.innerHTML =
        '<div class="c-public-hero panel">' +
        '<div class="avatar lg">' +
        data.initials +
        '</div>' +
        '<div class="c-public-hero-copy">' +
        '<h1>' +
        data.name +
        ' ' +
        badge +
        '</h1>' +
        '<p class="c-profile-role">' +
        (data.role || '') +
        '</p>' +
        '<p class="c-profile-bio">' +
        (data.bio || '') +
        '</p>' +
        '<div class="c-profile-stats c-public-stats">' +
        '<div><strong>' +
        (data.postCount || 0) +
        '</strong><span>Posts</span></div>' +
        '<div><strong>' +
        (data.replyCount || 0) +
        '</strong><span>Replies</span></div>' +
        '<div><strong>' +
        (data.followers || 0) +
        '</strong><span>Followers</span></div>' +
        '</div></div></div>' +
        '<div class="c-public-grid">' +
        '<section class="panel"><div class="panel-head"><h2>Posts</h2></div>' +
        postsHtml +
        '</section>' +
        '<section class="panel"><div class="panel-head"><h2>Replies</h2></div>' +
        repliesHtml +
        '</section></div>' +
        ((window.GradRightSafety &&
          GradRightSafety.actionsHtml({
            id: 'c:' + data.name,
            name: data.name,
            initials: data.initials,
            role: data.type || 'student',
          })) ||
          '');
    }
  }
}
