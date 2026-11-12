export const PERSON_DRAWER_EVENT = 'counselor:person-drawer';

export function requestPersonDrawer(window, url) {
  return (
    url.origin === window.location.origin &&
    url.pathname === '/person' &&
    !window.dispatchEvent(
      new window.CustomEvent(PERSON_DRAWER_EVENT, { detail: url.search, cancelable: true }),
    )
  );
}
