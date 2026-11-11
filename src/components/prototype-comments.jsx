'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const PIN_KEY = 'gradright-prototype-comment-pin';
const UI_ATTR = 'data-proto-comments';
const POLL_MS = 15000;
const POPOVER_W = 300;

function stableId(id) {
  return id && !id.includes(':') && !id.startsWith('radix-');
}

function cssPath(element) {
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && node !== document.body) {
    if (stableId(node.id) && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      return parts.join(' > ');
    }
    let index = 1;
    for (
      let sibling = node.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    )
      if (sibling.localName === node.localName) index += 1;
    parts.unshift(`${node.localName}:nth-of-type(${index})`);
    node = node.parentElement;
  }
  parts.unshift('body');
  return parts.join(' > ');
}

function pickTarget(x, y) {
  const hit = document
    .elementsFromPoint(x, y)
    .find((element) => !element.closest(`[${UI_ATTR}]`) && element !== document.documentElement);
  if (!hit) return null;
  return hit.closest('svg') || hit;
}

function isShown(element) {
  if (!element) return false;
  if (element.checkVisibility && !element.checkVisibility()) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function anchorPoint(comment) {
  let element = null;
  try {
    element = document.querySelector(comment.selector);
  } catch {
    return null;
  }
  if (!isShown(element)) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + comment.offsetX * rect.width,
    y: rect.top + comment.offsetY * rect.height,
  };
}

function relativeTime(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function popoverStyle(point) {
  const left = Math.min(Math.max(12, point.x + 14), window.innerWidth - POPOVER_W - 12);
  const top = Math.min(Math.max(12, point.y - 12), window.innerHeight - 220);
  return { left, top, width: POPOVER_W };
}

async function request(pin, path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', 'x-comment-pin': pin, ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong');
    error.status = response.status;
    throw error;
  }
  return data;
}

function PinDialog({ open, onOpenChange, onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    try {
      await request(value.trim(), `/api/prototype-comments?page=${encodeURIComponent('/')}`);
      onUnlock(value.trim());
      setValue('');
    } catch (failure) {
      setError(failure.status === 401 ? 'That PIN is not right.' : failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="proto-pin-dialog" {...{ [UI_ATTR]: '' }}>
        <DialogHeader>
          <DialogTitle>Comment on this prototype</DialogTitle>
          <DialogDescription>Enter the review PIN to see and leave comments.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="proto-pin-form">
          <Input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN"
            aria-label="Review PIN"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError('');
            }}
          />
          {error ? (
            <p role="alert" className="proto-error">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !value.trim()}>
              {busy ? 'Checking…' : 'Unlock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Composer({ point, initial = '', label, onCancel, onSubmit }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(value.trim());
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <form
      className="proto-popover"
      style={popoverStyle(point)}
      onSubmit={submit}
      {...{ [UI_ATTR]: '' }}
    >
      <Textarea
        autoFocus
        rows={3}
        maxLength={2000}
        placeholder="Leave a comment…"
        aria-label="Comment"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit(event);
        }}
      />
      {error ? (
        <p role="alert" className="proto-error">
          {error}
        </p>
      ) : null}
      <div className="proto-popover-actions">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy || !value.trim()}>
          {busy ? 'Saving…' : label}
        </Button>
      </div>
    </form>
  );
}

function Thread({ comment, number, point, onClose, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (editing)
    return (
      <Composer
        point={point}
        initial={comment.body}
        label="Save"
        onCancel={() => setEditing(false)}
        onSubmit={async (body) => {
          await onEdit(body);
          setEditing(false);
        }}
      />
    );

  return (
    <div className="proto-popover" style={popoverStyle(point)} {...{ [UI_ATTR]: '' }}>
      <div className="proto-thread-head">
        <span className="proto-thread-number">{number}</span>
        <span className="proto-thread-time">{relativeTime(comment.createdAt)}</span>
        <button
          type="button"
          className="proto-icon-btn"
          aria-label="Close comment"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <p className="proto-thread-body">{comment.body}</p>
      {confirming ? (
        <div className="proto-popover-actions">
          <span className="proto-confirm">Delete this comment?</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Keep
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete().catch(() => setBusy(false));
            }}
          >
            Delete
          </Button>
        </div>
      ) : (
        <div className="proto-popover-actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Edit
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

export function PrototypeComments() {
  const pathname = usePathname() || '/';
  const [pin, setPin] = useState(null);
  const [askPin, setAskPin] = useState(false);
  const [comments, setComments] = useState([]);
  const [positions, setPositions] = useState({});
  const [placing, setPlacing] = useState(false);
  const [hover, setHover] = useState(null);
  const [draft, setDraft] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState('');
  const commentsRef = useRef(comments);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    setPin(localStorage.getItem(PIN_KEY));
  }, []);

  useEffect(() => {
    if (!openId) return undefined;
    const close = (event) => {
      if (!event.target.closest?.(`[${UI_ATTR}]`)) setOpenId(null);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [openId]);

  const lock = useCallback(() => {
    localStorage.removeItem(PIN_KEY);
    setPin(null);
    setComments([]);
    setPlacing(false);
    setDraft(null);
    setOpenId(null);
  }, []);

  const load = useCallback(async () => {
    if (!pin) return;
    try {
      const data = await request(
        pin,
        `/api/prototype-comments?page=${encodeURIComponent(pathname)}`,
      );
      setComments(data.comments);
      setNotice('');
    } catch (failure) {
      if (failure.status === 401) lock();
      else setNotice(failure.message);
    }
  }, [pin, pathname, lock]);

  useEffect(() => {
    setOpenId(null);
    setDraft(null);
    load();
    if (!pin) return undefined;
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load, pin]);

  useEffect(() => {
    const shortcut = (event) => {
      if (event.key.toLowerCase() !== 'c' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.repeat || askPin || draft) return;
      const target = event.target;
      if (target.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"]'))
        return;
      event.preventDefault();
      setOpenId(null);
      if (!pin) setAskPin(true);
      else setPlacing((value) => !value);
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [pin, askPin, draft]);

  useEffect(() => {
    if (!pin) return undefined;
    let frame = 0;
    let last = '';
    const tick = () => {
      const next = {};
      for (const comment of commentsRef.current) {
        const point = anchorPoint(comment);
        if (point) next[comment.id] = point;
      }
      const signature = JSON.stringify(next);
      if (signature !== last) {
        last = signature;
        setPositions(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pin]);

  useEffect(() => {
    if (!placing) return undefined;
    document.documentElement.classList.add('proto-commenting');
    const insideUi = (event) => event.target.closest?.(`[${UI_ATTR}]`);
    const block = (event) => {
      if (insideUi(event)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const move = (event) => {
      if (insideUi(event)) return setHover(null);
      const target = pickTarget(event.clientX, event.clientY);
      if (!target) return setHover(null);
      const rect = target.getBoundingClientRect();
      setHover({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    };
    const click = (event) => {
      if (insideUi(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const target = pickTarget(event.clientX, event.clientY);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      setDraft({
        point: { x: event.clientX, y: event.clientY },
        selector: cssPath(target),
        offsetX: rect.width ? (event.clientX - rect.left) / rect.width : 0.5,
        offsetY: rect.height ? (event.clientY - rect.top) / rect.height : 0.5,
        pageX: event.pageX,
        pageY: event.pageY,
      });
      setPlacing(false);
    };
    const key = (event) => {
      if (event.key === 'Escape') setPlacing(false);
    };
    const blocked = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'dblclick'];
    blocked.forEach((type) => document.addEventListener(type, block, true));
    document.addEventListener('pointermove', move, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.documentElement.classList.remove('proto-commenting');
      blocked.forEach((type) => document.removeEventListener(type, block, true));
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      setHover(null);
    };
  }, [placing]);

  async function create(body) {
    const data = await request(pin, '/api/prototype-comments', {
      method: 'POST',
      body: JSON.stringify({
        page: pathname,
        view: window.location.search,
        selector: draft.selector,
        offsetX: draft.offsetX,
        offsetY: draft.offsetY,
        pageX: draft.pageX,
        pageY: draft.pageY,
        viewportW: window.innerWidth,
        body,
      }),
    });
    setComments((current) => [...current, data.comment]);
    setDraft(null);
  }

  async function edit(id, body) {
    const data = await request(pin, `/api/prototype-comments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
    setComments((current) => current.map((item) => (item.id === id ? data.comment : item)));
  }

  async function remove(id) {
    await request(pin, `/api/prototype-comments/${id}`, { method: 'DELETE' });
    setComments((current) => current.filter((item) => item.id !== id));
    setOpenId(null);
  }

  const open = comments.find((item) => item.id === openId);

  return (
    <>
      {pin && (placing || notice) ? (
        <p className="proto-notice" role="status" {...{ [UI_ATTR]: '' }}>
          {notice || 'Click anywhere to comment · Esc to cancel'}
        </p>
      ) : null}

      {placing && hover ? (
        <div className="proto-hover" style={hover} aria-hidden="true" {...{ [UI_ATTR]: '' }} />
      ) : null}

      {pin
        ? comments.map((comment, index) =>
            positions[comment.id] ? (
              <button
                key={comment.id}
                type="button"
                className={`proto-pin${openId === comment.id ? ' is-open' : ''}`}
                style={{ left: positions[comment.id].x, top: positions[comment.id].y }}
                aria-label={`Comment ${index + 1}`}
                onClick={() => {
                  setDraft(null);
                  setOpenId((current) => (current === comment.id ? null : comment.id));
                }}
                {...{ [UI_ATTR]: '' }}
              >
                {index + 1}
              </button>
            ) : null,
          )
        : null}

      {draft ? (
        <>
          <span
            className="proto-pin is-draft"
            style={{ left: draft.point.x, top: draft.point.y }}
            aria-hidden="true"
            {...{ [UI_ATTR]: '' }}
          >
            {comments.length + 1}
          </span>
          <Composer
            point={draft.point}
            label="Post"
            onCancel={() => setDraft(null)}
            onSubmit={create}
          />
        </>
      ) : null}

      {open && positions[open.id] ? (
        <Thread
          key={open.id}
          comment={open}
          number={comments.indexOf(open) + 1}
          point={positions[open.id]}
          onClose={() => setOpenId(null)}
          onEdit={(body) => edit(open.id, body)}
          onDelete={() => remove(open.id)}
        />
      ) : null}

      <PinDialog
        open={askPin}
        onOpenChange={setAskPin}
        onUnlock={(value) => {
          localStorage.setItem(PIN_KEY, value);
          setPin(value);
          setAskPin(false);
          setPlacing(true);
        }}
      />
    </>
  );
}
