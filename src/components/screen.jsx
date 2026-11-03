'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRuntime } from './runtime-provider';
import { createRouteScope } from '@/lib/runtime/route-scope';
import { applyAccess } from '@/lib/runtime/access';
import routes from '@/lib/routes.json';

export function Screen({ name, View, initialize }) {
  const { ready } = useRuntime();
  const router = useRouter();
  const search = useSearchParams().toString();
  const [error, setError] = useState(null);
  useLayoutEffect(() => {
    document.body.dataset.page = routes[name].dataPage;
    document.body.classList.remove('has-unsaved', 'cal-modal-open', 'nav-open');
  }, [name]);
  useEffect(() => {
    if (!ready) return;
    const scope = createRouteScope({ router });
    // Header action portals commit before workflow subscriptions are attached.
    scope.requestAnimationFrame(() => {
      try {
        initialize(scope);
        window.GradRightShell.applySessionFields();
        applyAccess();
        window.GradRightLiveCall?.mount();
        setError(null);
      } catch (error) {
        console.error(`Unable to initialize ${name}`, error);
        setError(error.message);
      }
    });
    return () => scope.dispose();
  }, [ready, name, initialize, router, search]);

  return (
    <div className="route-screen" data-screen={name} aria-busy={!ready}>
      {error && (
        <div className="screen-error" role="alert">
          This screen could not initialize: {error}
        </div>
      )}
      <View />
    </div>
  );
}
