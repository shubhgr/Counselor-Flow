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

  function showAuth(mode) {
    const signup = mode === 'signup';
    document.getElementById('panel-signup').hidden = !signup;
    document.getElementById('panel-login').hidden = signup;
    document.getElementById('tab-signup').classList.toggle('active', signup);
    document.getElementById('tab-login').classList.toggle('active', !signup);
  }

  window.showAuth = showAuth;
  showAuth(new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup');
}
