export function isVerified() {
  const account = window.GradRightSession?.get();
  return account ? !!account.verified : true; // consistent signed-out demo
}

export function applyAccess() {
  const verified = isVerified();
  document.body.dataset.verified = String(verified);
  document.body.classList.toggle('is-verified', verified);
  document.body.classList.toggle('is-unverified', !verified);
  for (const [selector, show] of [
    ['[data-verified-only]', verified],
    ['[data-unverified-only]', !verified],
  ]) {
    document.querySelectorAll(selector).forEach((el) => {
      el.hidden = !show;
      el.setAttribute('aria-hidden', String(!show));
    });
  }
  document.querySelectorAll('[data-connect-action]').forEach((el) => {
    el.classList.toggle('is-locked', !verified);
    el.setAttribute('aria-disabled', String(!verified));
    if (el.matches('input,textarea,button')) el.disabled = !verified;
  });
}
