import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteScope } from '../src/lib/runtime/route-scope.js';
class Tokens extends Set {
  remove(value) {
    this.delete(value);
  }
}
function browser() {
  const previous = { window: globalThis.window, document: globalThis.document };
  const timers = new Map(),
    intervals = new Map(),
    revoked = [];
  let sequence = 0;
  const body = Object.assign(new EventTarget(), {
    classList: new Tokens(['is-verified']),
    appendChild(node) {
      node.isConnected = true;
      return node;
    },
  });
  const document = Object.assign(new EventTarget(), { body, readyState: 'complete' });
  const location = Object.assign(new URL('http://localhost/dashboard'), {
    assign(url) {
      this.assigned = url;
    },
    replace(url) {
      this.replaced = url;
    },
  });
  class BrowserURL extends URL {
    static createObjectURL() {
      return 'blob:example';
    }
    static revokeObjectURL(url) {
      revoked.push(url);
    }
  }
  const window = Object.assign(new EventTarget(), {
    document,
    location,
    URL: BrowserURL,
    CustomEvent,
    setTimeout(fn) {
      const id = ++sequence;
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    setInterval(fn) {
      const id = ++sequence;
      intervals.set(id, fn);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    requestAnimationFrame(fn) {
      const id = ++sequence;
      timers.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) {
      timers.delete(id);
    },
    fetch: async () => ({ ok: true }),
  });
  globalThis.window = window;
  globalThis.document = document;
  return {
    window,
    document,
    body,
    timers,
    intervals,
    revoked,
    restore() {
      globalThis.window = previous.window;
      globalThis.document = previous.document;
    },
  };
}
test('route navigation removes element, document and window handlers', () => {
  const env = browser();
  try {
    const scope = createRouteScope();
    const element = new EventTarget();
    let calls = 0;
    for (const target of [element, scope.document, scope.window])
      scope.listen(target, 'click', () => calls++);
    for (const target of [element, env.document, env.window])
      target.dispatchEvent(new Event('click'));
    assert.equal(calls, 3);
    scope.dispose();
    for (const target of [element, env.document, env.window])
      target.dispatchEvent(new Event('click'));
    assert.equal(calls, 3);
  } finally {
    env.restore();
  }
});
test('route disposal cancels timers, revokes uploads and removes generated overlays', () => {
  const env = browser();
  try {
    const scope = createRouteScope();
    scope.setTimeout(() => {}, 500);
    scope.setInterval(() => {}, 500);
    scope.requestAnimationFrame(() => {});
    scope.URL.createObjectURL({});
    let removed = false;
    scope.document.body.appendChild({
      nodeType: 1,
      isConnected: false,
      remove() {
        removed = true;
      },
    });
    scope.dispose();
    scope.dispose();
    assert.equal(env.timers.size, 0);
    assert.equal(env.intervals.size, 0);
    assert.deepEqual(env.revoked, ['blob:example']);
    assert.equal(removed, true);
  } finally {
    env.restore();
  }
});
test('workflow redirects use the Next router and restore route commands', () => {
  const env = browser();
  try {
    const navigation = [];
    const scope = createRouteScope({
      router: {
        push: (href) => navigation.push(['push', href]),
        replace: (href) => navigation.push(['replace', href]),
      },
    });
    scope.location.href = '/person?id=aarav';
    scope.location.replace('/profile?tab=services');
    assert.deepEqual(navigation, [
      ['push', '/person?id=aarav'],
      ['replace', '/profile?tab=services'],
    ]);
    const drawer = [];
    env.window.addEventListener('counselor:person-drawer', (event) => {
      event.preventDefault();
      drawer.push(event.detail);
    });
    scope.location.href = '/person?id=aarav&from=chats';
    assert.deepEqual(drawer, ['?id=aarav&from=chats']);
    assert.equal(navigation.length, 2);
    env.window.command = 'before';
    scope.window.command = () => {};
    scope.dispose();
    assert.equal(env.window.command, 'before');
  } finally {
    env.restore();
  }
});
