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

  (function () {
    const verified = window.GradRightSession ? window.GradRightSession.isVerified() : false;
    const forcePreview = new URLSearchParams(location.search).get('preview') === '1';

    document.body.classList.toggle('is-verified', verified);
    document.body.classList.toggle('is-unverified', !verified);
    document.body.dataset.verified = verified ? 'true' : 'false';

    document.querySelectorAll('[data-verified-only]').forEach((el) => {
      el.hidden = !verified;
    });
    document.querySelectorAll('[data-unverified-only]').forEach((el) => {
      el.hidden = verified;
    });

    if (window.GradRightTestimonials) {
      GradRightTestimonials.renderList(document.getElementById('public-testi-list'), {
        empty: 'No testimonials yet.',
      });
    }

    const banner = document.getElementById('preview-pending-banner');
    if (banner) banner.hidden = verified && !forcePreview;
    if (forcePreview && verified) {
      banner.hidden = false;
      banner.querySelector('h3').textContent = 'Full page preview';
      banner.querySelector('p').textContent =
        'You’re verified — this is the live student-facing profile page.';
    }
  })();
}
