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

  scope.listen(document.getElementById('simulate-approval'), 'click', (e) => {
    e.preventDefault();
    const s = GradRightSession.get() || {};
    GradRightSession.set(s.phone || '0987654321', Object.assign({}, s, { verified: true }));
    location.href = '/dashboard';
  });
}
