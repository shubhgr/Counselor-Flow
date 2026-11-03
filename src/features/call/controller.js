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

  var CALLS = GradRightLiveCall.CATALOG;
  var params = new URLSearchParams(location.search);
  var id = params.get('id') && CALLS[params.get('id')] ? params.get('id') : 'aarav';
  var from = params.get('from') || 'calls';
  var base = CALLS[id];

  var live = GradRightLiveCall.start({
    studentId: id,
    name: base.name,
    initials: base.initials,
    service: base.service,
    booked: base.booked,
  });

  document.getElementById('call-name').textContent = live.name;
  document.getElementById('call-avatar').textContent = live.initials;
  document.getElementById('call-title').textContent = 'Meet · ' + live.name;
  document.getElementById('profile-btn').href =
    '/person?id=' + encodeURIComponent(id) + '&from=call';
  document.getElementById('chat-btn').href = '/chats?id=' + encodeURIComponent(id);
  document.getElementById('btn-chat').href = '/chats?id=' + encodeURIComponent(id);

  /* Back always leaves the full-screen call view without ending the live session */
  var backHref = '/calls';
  if (from === 'profile') backHref = '/person?id=' + encodeURIComponent(id) + '&from=call';
  else if (from === 'chats') backHref = '/chats?id=' + encodeURIComponent(id);
  else if (from === 'calls') backHref = '/calls';
  document.getElementById('back-btn').href = backHref;

  function syncControls() {
    var state = GradRightLiveCall.get() || live;
    document.getElementById('btn-mute').classList.toggle('on', !!state.muted);
    document.getElementById('btn-mute').querySelector('.app-icon').textContent = state.muted
      ? 'mic_off'
      : 'mic';
    document.getElementById('btn-video').classList.toggle('on', !!state.videoOff);
    document.getElementById('btn-video').querySelector('.app-icon').textContent = state.videoOff
      ? 'videocam_off'
      : 'videocam';
    document.getElementById('call-elapsed').textContent = GradRightLiveCall.elapsedText();
  }

  scope.listen(document.getElementById('btn-mute'), 'click', function () {
    var state = GradRightLiveCall.get();
    GradRightLiveCall.patch({ muted: !(state && state.muted) });
    syncControls();
  });
  scope.listen(document.getElementById('btn-video'), 'click', function () {
    var state = GradRightLiveCall.get();
    GradRightLiveCall.patch({ videoOff: !(state && state.videoOff) });
    syncControls();
  });
  scope.listen(document.getElementById('end-call'), 'click', function () {
    var ending = GradRightLiveCall.get();
    GradRightLiveCall.end();
    if (ending) {
      try {
        sessionStorage.setItem('gradright_last_ended_call', JSON.stringify(ending));
      } catch (err) {}
    }
    location.href = '/calls';
  });

  /* Back leaves full-screen call; live session stays until red end. Use Pop out on Calls to reopen browser PiP. */
  scope.listen(document.getElementById('back-btn'), 'click', function (event) {
    event.preventDefault();
    location.href = this.getAttribute('href') || '/calls';
  });

  syncControls();
  setInterval(syncControls, 1000);
}
