/**
 * GradRight Counselor — Button component
 * Shared CTA helper. Prefer HTML: <button class="btn btn-primary">…</button>
 * or <a class="btn btn-secondary btn-sm" href="…">…</a>
 *
 * Variants: primary | secondary | ghost | danger
 * Size: default | sm
 * Corner radius: 20px (--radius-btn)
 */
(function () {
  const VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };

  /**
   * @param {object} opts
   * @param {string} opts.label
   * @param {'primary'|'secondary'|'ghost'|'danger'} [opts.variant='primary']
   * @param {'sm'|null} [opts.size]
   * @param {'button'|'submit'|'reset'} [opts.type='button']
   * @param {string} [opts.href] — if set, renders an <a>
   * @param {boolean} [opts.disabled]
   * @param {string} [opts.className]
   * @param {Record<string,string>} [opts.attrs]
   * @returns {HTMLButtonElement|HTMLAnchorElement}
   */
  function createButton(opts) {
    const {
      label = '',
      variant = 'primary',
      size = null,
      type = 'button',
      href = null,
      disabled = false,
      className = '',
      attrs = {},
    } = opts || {};

    const el = href
      ? document.createElement('a')
      : document.createElement('button');

    const classes = ['btn', VARIANTS[variant] || VARIANTS.primary];
    if (size === 'sm') classes.push('btn-sm');
    if (className) classes.push(className);
    el.className = classes.join(' ');

    if (href) {
      el.href = href;
      if (disabled) {
        el.setAttribute('aria-disabled', 'true');
        el.tabIndex = -1;
      }
    } else {
      el.type = type;
      el.disabled = !!disabled;
    }

    el.textContent = label;

    Object.keys(attrs).forEach((key) => {
      el.setAttribute(key, attrs[key]);
    });

    return el;
  }

  window.GradRightButton = { create: createButton, variants: VARIANTS };
})();
