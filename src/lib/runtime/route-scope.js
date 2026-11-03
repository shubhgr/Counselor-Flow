/** A lifecycle boundary for migrated workflows. Never patches browser globals.
 * Every document/window subscription, timer, observer, blob URL and generated
 * overlay belongs to this route and is disposed before the next one starts. */
export function createRouteScope({ router, global = false } = {}) {
  const nativeWindow = window;
  const nativeDocument = document;
  const cleanups = [];
  const appended = new Set();
  const abort = new AbortController();
  const timeouts = new Set();
  const intervals = new Set();
  const frames = new Set();
  const urls = new Set();
  let active = true;
  const initialClasses = new Set(nativeDocument.body.classList);

  function subscribe(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }
  const scheduleTimeout = (fn, ms, ...args) => {
    const id = nativeWindow.setTimeout(() => {
      timeouts.delete(id);
      if (active) fn(...args);
    }, ms);
    timeouts.add(id);
    return id;
  };
  const scheduleInterval = (fn, ms, ...args) => {
    const id = nativeWindow.setInterval(() => {
      if (active) fn(...args);
    }, ms);
    intervals.add(id);
    return id;
  };
  const scheduleFrame = (fn) => {
    const id = nativeWindow.requestAnimationFrame((time) => {
      frames.delete(id);
      if (active) fn(time);
    });
    frames.add(id);
    return id;
  };
  function navigate(value, replace = false) {
    const url = new nativeWindow.URL(String(value), nativeWindow.location.href);
    if (url.origin === nativeWindow.location.origin && router) {
      const href = url.pathname + url.search + url.hash;
      (replace ? router.replace : router.push)(href);
    } else if (replace) nativeWindow.location.replace(url.href);
    else nativeWindow.location.assign(url.href);
  }
  const location = new Proxy(nativeWindow.location, {
    get(target, key) {
      if (key === 'assign') return (value) => navigate(value);
      if (key === 'replace') return (value) => navigate(value, true);
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      if (key === 'href') {
        navigate(value);
        return true;
      }
      return Reflect.set(target, key, value, target);
    },
  });
  const body = new Proxy(nativeDocument.body, {
    get(target, key) {
      if (key === 'appendChild' || key === 'append' || key === 'prepend')
        return (...nodes) => {
          nodes.forEach((node) => {
            if (node?.nodeType && !node.isConnected) appended.add(node);
          });
          return target[key](...nodes);
        };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const scopedDocument = new Proxy(nativeDocument, {
    get(target, key) {
      if (key === 'body') return body;
      if (key === 'readyState') return 'complete';
      if (key === 'addEventListener') return (...args) => subscribe(target, ...args);
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, key, value) {
      return Reflect.set(target, key, value, target);
    },
  });
  class ScopedURL extends nativeWindow.URL {
    static createObjectURL(blob) {
      const url = nativeWindow.URL.createObjectURL(blob);
      urls.add(url);
      return url;
    }
    static revokeObjectURL(url) {
      urls.delete(url);
      nativeWindow.URL.revokeObjectURL(url);
    }
  }
  function trackedObserver(name) {
    const Constructor = nativeWindow[name];
    if (!Constructor) return undefined;
    return class extends Constructor {
      constructor(...args) {
        super(...args);
        cleanups.push(() => this.disconnect());
      }
    };
  }
  const overrides = {
    document: scopedDocument,
    location,
    setTimeout: scheduleTimeout,
    clearTimeout: (id) => {
      timeouts.delete(id);
      nativeWindow.clearTimeout(id);
    },
    setInterval: scheduleInterval,
    clearInterval: (id) => {
      intervals.delete(id);
      nativeWindow.clearInterval(id);
    },
    requestAnimationFrame: scheduleFrame,
    cancelAnimationFrame: (id) => {
      frames.delete(id);
      nativeWindow.cancelAnimationFrame(id);
    },
    URL: ScopedURL,
    MutationObserver: trackedObserver('MutationObserver'),
    ResizeObserver: trackedObserver('ResizeObserver'),
    IntersectionObserver: trackedObserver('IntersectionObserver'),
    fetch: (url, options = {}) =>
      nativeWindow.fetch(url, { ...options, signal: options.signal || abort.signal }),
  };
  const scopedWindow = new Proxy(nativeWindow, {
    get(target, key) {
      if (key in overrides) return overrides[key];
      if (key === 'addEventListener') return (...args) => subscribe(target, ...args);
      const value = Reflect.get(target, key, target);
      // Constructors remain constructable; browser instance methods keep their receiver.
      return typeof value === 'function' && !/^[A-Z]/.test(String(key))
        ? value.bind(target)
        : value;
    },
    set(target, key, value) {
      if (key === 'location') {
        navigate(value);
        return true;
      }
      const previous = target[key];
      Reflect.set(target, key, value, target);
      if (!global)
        cleanups.push(() => {
          if (target[key] === value) {
            if (previous === undefined) delete target[key];
            else target[key] = previous;
          }
        });
      return true;
    },
  });
  return {
    ...overrides,
    window: scopedWindow,
    listen(target, ...args) {
      const actual =
        target === scopedDocument
          ? nativeDocument
          : target === scopedWindow
            ? nativeWindow
            : target === body
              ? nativeDocument.body
              : target;
      return subscribe(actual, ...args);
    },
    get active() {
      return active;
    },
    dispose() {
      if (!active) return;
      active = false;
      abort.abort();
      timeouts.forEach((id) => nativeWindow.clearTimeout(id));
      intervals.forEach((id) => nativeWindow.clearInterval(id));
      frames.forEach((id) => nativeWindow.cancelAnimationFrame(id));
      urls.forEach((url) => nativeWindow.URL.revokeObjectURL(url));
      cleanups.reverse().forEach((fn) => fn());
      appended.forEach((node) => node.remove());
      if (!global)
        [...nativeDocument.body.classList].forEach((name) => {
          if (!initialClasses.has(name) && !['is-verified', 'is-unverified'].includes(name))
            nativeDocument.body.classList.remove(name);
        });
    },
  };
}
