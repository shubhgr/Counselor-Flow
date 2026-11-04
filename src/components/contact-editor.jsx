'use client';

import { useEffect, useId, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

function normalizeContact(kind, raw) {
  const text = String(raw || '');
  return kind === 'email' ? text.trim().toLowerCase() : text.replace(/\D/g, '');
}

export function ContactEditor({
  label,
  kind,
  value,
  onVerified,
  excludedValue,
  labelAction,
}) {
  const id = useId();
  const [candidate, setCandidate] = useState(value || '');
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) return;
    setCandidate(value || '');
    setError('');
  }, [value, open]);

  const normalizedCandidate = normalizeContact(kind, candidate);
  const normalizedValue = normalizeContact(kind, value);
  const isVerifiedCurrent =
    Boolean(normalizedValue) && normalizedCandidate === normalizedValue && !open;
  const contactNoun = kind === 'email' ? 'email' : 'number';

  function validationError(next = normalizedCandidate) {
    if (kind === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) : !/^\d{10}$/.test(next)) {
      return kind === 'email'
        ? 'Enter a valid email address.'
        : 'Enter a 10-digit Indian mobile number.';
    }
    if (next === normalizedValue || next === normalizeContact(kind, excludedValue)) {
      return 'This contact is already linked. Enter a different one.';
    }
    return '';
  }

  function openVerification(next = normalizedCandidate) {
    const issue = validationError(next);
    if (issue) {
      setError(issue);
      return;
    }
    if (!next || next === normalizedValue) return;
    setPending(next);
    setCode('');
    setDialogError('');
    setError('');
    setOpen(true);
  }

  function closeVerification(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPending(null);
      setCode('');
      setDialogError('');
    }
  }

  function verify() {
    if (!pending || !/^\d{6}$/.test(code)) {
      setDialogError('Enter a six-digit verification code.');
      return;
    }
    onVerified(pending);
    setPending(null);
    setCode('');
    setDialogError('');
    setOpen(false);
  }

  return (
    <div className="field contact-editor">
      {labelAction ? (
        <div className="contact-editor-heading">
          <Label htmlFor={`${id}-contact`}>{label}</Label>
          {labelAction}
        </div>
      ) : (
        <Label htmlFor={`${id}-contact`}>{label}</Label>
      )}
      <div className="contact-editor-compose">
        <div className={`contact-editor-input${isVerifiedCurrent ? ' is-verified' : ''}`}>
          <Input
            id={`${id}-contact`}
            aria-label={label}
            type={kind}
            value={candidate}
            maxLength={kind === 'email' ? 254 : 20}
            placeholder={kind === 'email' ? 'you@example.com' : '10-digit mobile number'}
            onChange={(event) => {
              const next = event.target.value;
              setCandidate(next);
              setError('');
              if (value && !normalizeContact(kind, next)) onVerified('');
            }}
            onBlur={() => {
              if (!normalizedCandidate || normalizedCandidate === normalizedValue) return;
              openVerification();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              openVerification();
            }}
          />
          {isVerifiedCurrent ? <span className="pill ok">Verified</span> : null}
        </div>
        {error ? (
          <p role="alert" className="account-save-error">
            {error}
          </p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={closeVerification}>
        <DialogContent className="contact-verify-dialog" showCloseButton>
          <DialogHeader>
            <DialogTitle>Verify {contactNoun}</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to <strong>{pending}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="contact-verify-body">
            <Label htmlFor={`${id}-code`}>Verification code</Label>
            <Input
              id={`${id}-code`}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={code}
              placeholder="6-digit code"
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, ''));
                setDialogError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  verify();
                }
              }}
            />
            {dialogError ? (
              <p role="alert" className="account-save-error">
                {dialogError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => closeVerification(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={verify} disabled={code.length !== 6}>
              Verify {contactNoun}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
