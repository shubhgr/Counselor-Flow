'use client';

import { useId, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ContactEditor({ label, kind, value, onVerified, excludedValue }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  function requestCode() {
    const next = kind === 'email' ? candidate.trim().toLowerCase() : candidate.replace(/\D/g, '');
    if (kind === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) : !/^\d{10}$/.test(next)) {
      setError(
        kind === 'email'
          ? 'Enter a valid email address.'
          : 'Enter a 10-digit Indian mobile number.',
      );
      return;
    }
    if (next === value?.toLowerCase() || next === excludedValue?.toLowerCase()) {
      setError('This contact is already linked. Enter a different one.');
      return;
    }
    setPending(next);
    setCode('');
    setError('');
  }
  function verify() {
    if (!pending || !/^\d{6}$/.test(code)) {
      setError('Enter a six-digit verification code.');
      return;
    }
    onVerified(pending);
    setPending(null);
    setEditing(false);
    setError('');
  }
  return (
    <div className="field">
      <Label htmlFor={`${id}-contact`}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all text-sm">{value || 'Not added'}</span>
        {value && <span className="pill ok">Verified</span>}
        {!editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(true);
              setCandidate('');
            }}
          >
            {value ? 'Change' : kind === 'email' ? 'Add email' : 'Add number'}
          </Button>
        )}
      </div>
      {editing && (
        <>
          <Input
            id={`${id}-contact`}
            aria-label={`New ${label.toLowerCase()}`}
            type={kind}
            value={candidate}
            maxLength={kind === 'email' ? 254 : 20}
            placeholder={kind === 'email' ? 'you@example.com' : '10-digit mobile number'}
            onChange={(event) => {
              setCandidate(event.target.value);
              setPending(null);
              setCode('');
              setError('');
            }}
          />
          {pending ? (
            <>
              <p className="hint-text">Enter a six-digit code to verify {pending}.</p>
              <Label htmlFor={`${id}-code`}>Verification code</Label>
              <Input
                id={`${id}-code`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={verify}
                disabled={code.length !== 6}
              >
                Verify {kind === 'email' ? 'email' : 'number'}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={requestCode}>
              Continue to verification
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setPending(null);
              setError('');
            }}
          >
            Cancel change
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="account-save-error">
          {error}
        </p>
      )}
    </div>
  );
}
