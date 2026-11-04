'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readPublicIdentity } from '@/lib/domain/public-identity';
import { updateCommunityIdentity } from '@/lib/domain/community';
import { initializeRuntime } from '@/lib/runtime/initialize';
import { applyAccess, isVerified } from '@/lib/runtime/access';
const RuntimeContext = createContext({ ready: false, account: null, verified: true });
export function useRuntime() {
  return useContext(RuntimeContext);
}

export function RuntimeProvider({ children }) {
  const router = useRouter();
  const [state, setState] = useState({ ready: false, account: null, verified: true, error: null });
  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active) return;
      applyAccess();
      let draft = null;
      try {
        draft = JSON.parse(localStorage.getItem('counselor-account-details') || 'null');
      } catch {}
      const account = window.GradRightSession.get() || draft;
      const identity = readPublicIdentity();
      if (identity.name || identity.username) {
        const original = account?.communityOriginalName || account?.name || 'Priya Sharma';
        updateCommunityIdentity(original, identity.name || original, identity.username);
      }
      setState({
        ready: true,
        account,
        verified: isVerified(),
        error: null,
      });
    };
    initializeRuntime(router)
      .then(refresh)
      .catch((error) => {
        if (active) setState((s) => ({ ...s, error: error.message }));
      });
    window.addEventListener('gradright:session', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('gradright:public-profile', refresh);
    return () => {
      active = false;
      window.removeEventListener('gradright:session', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('gradright:public-profile', refresh);
    };
  }, [router]);
  function follow(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = event.target.closest('a[href]');
    if (
      !anchor ||
      anchor.target ||
      anchor.hasAttribute('download') ||
      anchor.getAttribute('href').startsWith('#')
    )
      return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/admitright')) return;
    event.preventDefault();
    if (url.pathname === '/account') {
      window.dispatchEvent(new Event('counselor:account'));
      return;
    }
    router.push(url.pathname + url.search + url.hash);
  }
  function submit(event) {
    if (event.defaultPrevented || event.target.method.toLowerCase() !== 'get') return;
    const form = event.target;
    if (!form.getAttribute('action') || form.getAttribute('action') === '#') return;
    const url = new URL(form.action, location.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    new FormData(form, event.nativeEvent.submitter).forEach((value, key) =>
      url.searchParams.set(key, String(value)),
    );
    router.push(url.pathname + url.search);
  }
  return (
    <RuntimeContext.Provider value={state}>
      <div data-runtime-root onClick={follow} onSubmit={submit}>
        {state.error ? (
          <main className="runtime-error" role="alert">
            <h1>Unable to load Counselor</h1>
            <p>{state.error}</p>
            <button onClick={() => location.reload()}>Try again</button>
          </main>
        ) : (
          children
        )}
      </div>
    </RuntimeContext.Provider>
  );
}
