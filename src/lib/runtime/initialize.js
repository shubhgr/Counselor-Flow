import { createRouteScope } from './route-scope';
import { mountWorkflowIcons } from './icons';
import { applyAccess, isVerified } from './access';
let initialization;
export function initializeRuntime(router) {
  if (initialization) return initialization;
  initialization = (async () => {
    mountWorkflowIcons();
    const scope = createRouteScope({ router, global: true });
    // These are browser data/services, not script tags or server-side effects.
    const modules = [
      () => import('../domain/session'),
      () => import('../domain/people-db'),
      () => import('../domain/calls-db'),
      () => import('../domain/calendar-db'),
      () => import('../domain/testimonials'),
      () => import('../domain/safety'),
      () => import('../domain/live-call'),
      () => import('../domain/intro-recorder'),
      () => import('../domain/call-panel'),
      () => import('../domain/cal-com'),
    ];
    window.GR_CAL_CLIENT_ID = process.env.NEXT_PUBLIC_CAL_CLIENT_ID || '';
    window.GR_CAL_REDIRECT_URI =
      process.env.NEXT_PUBLIC_CAL_REDIRECT_URI || `${window.location.origin}/calendar`;
    for (const load of modules) (await load()).initialize(scope);
    for (const method of ['set', 'clear']) {
      const original = window.GradRightSession[method];
      window.GradRightSession[method] = (...args) => {
        const result = original(...args);
        window.dispatchEvent(new Event('gradright:session'));
        return result;
      };
    }
    window.GradRightShell = {
      isVerified,
      applyAccess,
      session: () => window.GradRightSession.get(),
      applySessionFields() {
        const account = window.GradRightSession.get();
        if (!account) return;
        for (const [key, value] of Object.entries({
          name: account.name,
          email: account.email,
          phone: account.phoneDisplay,
          initials: account.initials,
        })) {
          document.querySelectorAll(`[data-session-${key}]`).forEach((el) => {
            if (el.matches('input,textarea')) el.value = value;
            else el.textContent = value;
          });
        }
      },
    };
    document.addEventListener(
      'click',
      (event) => {
        if (!isVerified() && event.target.closest('[data-connect-action]')) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    return true;
  })();
  return initialization;
}
