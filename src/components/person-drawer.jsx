'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { initialize } from '@/features/person/controller';
import { createRouteScope } from '@/lib/runtime/route-scope';
import { PERSON_DRAWER_EVENT, requestPersonDrawer } from '@/lib/runtime/person-navigation';
import { useRuntime } from './runtime-provider';
import { Button } from './ui/button';
import { ProgressiveBlur } from './ui/progressive-blur';
import { Sheet, SheetClose, SheetContent, SheetTitle } from './ui/sheet';

function PersonDetails({ search }) {
  const { ready } = useRuntime();
  const root = useRef(null);
  const title = useRef(null);
  const actions = useRef(null);

  useLayoutEffect(() => {
    if (!ready) return;
    const scope = createRouteScope({ global: true });
    initialize(scope, {
      search,
      root: root.current,
      title: title.current,
      actions: actions.current,
    });
    return () => scope.dispose();
  }, [ready, search]);

  return (
    <>
      <header className="notification-header notification-heading">
        <SheetTitle ref={title}>Profile</SheetTitle>
        <div className="person-drawer-actions" ref={actions} />
        <SheetClose asChild>
          <Button
            className="notification-close-button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close profile"
          >
            <XIcon />
          </Button>
        </SheetClose>
      </header>
      <div className="person-page person-drawer-body gr-scroll" ref={root}>
        <p className="hint-text">Loading profile…</p>
      </div>
    </>
  );
}

export function PersonDrawer() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const opener = useRef(null);

  useEffect(() => {
    function show(event) {
      event.preventDefault();
      opener.current = document.activeElement;
      setSearch(event.detail);
      setOpen(true);
    }
    function followProfileLink(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self'))
        return;
      if (requestPersonDrawer(window, new URL(link.href))) event.preventDefault();
    }
    window.addEventListener(PERSON_DRAWER_EVENT, show);
    document.addEventListener('click', followProfileLink, true);
    return () => {
      window.removeEventListener(PERSON_DRAWER_EVENT, show);
      document.removeEventListener('click', followProfileLink, true);
    };
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="notification-drawer person-drawer"
        showCloseButton={false}
        aria-describedby={undefined}
        overlayClassName="notification-blur-overlay"
        overlayChildren={
          <ProgressiveBlur position="right" className="notification-progressive-blur" />
        }
        onEscapeKeyDown={(event) => {
          if (document.querySelector('.person-drawer .safety-modal:not([hidden])')) {
            event.preventDefault();
          }
        }}
        onCloseAutoFocus={(event) => {
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus({ preventScroll: true });
        }}
      >
        <PersonDetails key={search} search={search} />
      </SheetContent>
    </Sheet>
  );
}
