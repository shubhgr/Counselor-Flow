'use client';
import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icon';
import { useRuntime } from './runtime-provider';
import { createNotifications } from '@/lib/domain/notifications';
import { groupNotifications } from '@/lib/notification-groups';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './ui/sheet';
import { ProgressiveBlur } from './ui/progressive-blur';
import { Button } from './ui/button';

const TYPES = {
  meet: ['Meetings', 'videocam'],
  chat: ['Messages', 'chat'],
  connect: ['Connections', 'person_add'],
  refund: ['Refunds', 'undo'],
  withdrawal: ['Withdrawals', 'account_balance'],
  community: ['Community', 'community'],
};
export function Notifications() {
  const id = useId();
  const { ready } = useRuntime();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [scrollElement, setScrollElement] = useState(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const [version, setVersion] = useState(0);
  const model = useMemo(() => (ready ? createNotifications() : null), [ready]);
  const items = useMemo(() => model?.all() || [], [model, version, open]);
  const groups = useMemo(() => groupNotifications(items), [items]);
  const unread = items.filter((item) => item.unread).length;
  useEffect(() => {
    if (!scrollElement) return;
    const update = () => {
      const top = scrollElement.scrollTop > 2;
      const bottom =
        scrollElement.scrollHeight - scrollElement.clientHeight - scrollElement.scrollTop > 2;
      setEdges((previous) =>
        previous.top === top && previous.bottom === bottom ? previous : { top, bottom },
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(scrollElement);
    if (scrollElement.firstElementChild) observer.observe(scrollElement.firstElementChild);
    scrollElement.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      scrollElement.removeEventListener('scroll', update);
    };
  }, [scrollElement]);
  function toggle(key) {
    setExpanded((previous) => (previous === key ? null : key));
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="notif-bell"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Icon name="notifications" />
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="notification-drawer"
        showCloseButton={false}
        overlayClassName="notification-blur-overlay"
        overlayChildren={
          <ProgressiveBlur position="right" className="notification-progressive-blur" />
        }
      >
        <header className="notification-header">
          <div className="notification-heading">
            <SheetTitle>Notifications</SheetTitle>
            <Button
              className="notification-mark-read"
              variant="ghost"
              size="sm"
              disabled={!unread}
              onClick={() => {
                model?.markAllRead();
                setVersion((value) => value + 1);
              }}
            >
              {unread ? 'Mark all as read' : 'All read'}
            </Button>
            <SheetClose asChild>
              <Button
                className="notification-close-button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close notifications"
              >
                <Icon name="close" />
              </Button>
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            Notifications grouped by type. Select a group to expand its notifications.
          </SheetDescription>
        </header>
        <div
          className="notification-scroll-viewport"
          data-scroll-top={edges.top}
          data-scroll-bottom={edges.bottom}
        >
          <div
            ref={setScrollElement}
            className="notification-items"
            aria-label="Notification groups"
          >
            <div className="notification-groups">
              {groups.length === 0 && <p className="notification-empty">You’re all caught up.</p>}
              {groups.map((group) => {
                const [label, icon] = TYPES[group.key] || ['Updates', 'notifications'];
                const isExpanded = expanded === group.key;
                const first = group.items[0];
                const controls = `${id}-${group.key}`;
                return (
                  <section
                    key={group.key}
                    className="notification-group"
                    data-expanded={isExpanded}
                  >
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      className="notification-group-trigger"
                      id={`${controls}-trigger`}
                      aria-expanded={isExpanded}
                      aria-controls={controls}
                      onClick={() => toggle(group.key)}
                    >
                      <span className="notification-group-icon">
                        <Icon name={icon} />
                      </span>
                      <span className="notification-group-copy">
                        <span className="notification-group-title">
                          <strong>{label}</strong>
                          <span className="notification-group-count">{group.items.length}</span>
                          {group.unread > 0 && (
                            <span
                              className="notification-unread-dot"
                              aria-label={`${group.unread} unread`}
                            />
                          )}
                        </span>
                        <span className="notification-group-summary" aria-hidden={isExpanded}>
                          <span>
                            <span className="notification-group-preview">{first.body}</span>
                            <small>{model.formatWhen(first.at)}</small>
                          </span>
                        </span>
                      </span>
                      <Icon name="expand_more" className="notification-group-chevron" />
                    </Button>
                    <div
                      id={controls}
                      inert={!isExpanded}
                      className="notification-group-items"
                      role="region"
                      aria-label={`${label} notifications`}
                    >
                      <div>
                        {group.items.map((item) => (
                          <Link
                            prefetch={false}
                            key={item.id}
                            href={item.href}
                            className="notification-item"
                            onClick={() => {
                              model.markRead(item.id);
                              setVersion((value) => value + 1);
                              setOpen(false);
                            }}
                          >
                            <div>
                              <strong>{item.title}</strong>
                              <p>{item.body}</p>
                              <small>{model.formatWhen(item.at)}</small>
                            </div>
                            {item.unread && (
                              <span className="notification-unread-dot" aria-label="Unread" />
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
