'use client';
import { useEffect, useState } from 'react';
import { useRuntime } from './runtime-provider';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ContactEditor } from './contact-editor';
import { readPublicIdentity, savePublicIdentity } from '@/lib/domain/public-identity';

export function usePublicIdentity() {
  const [identity, setIdentity] = useState({});
  useEffect(() => {
    const refresh = () => setIdentity(readPublicIdentity());
    refresh();
    window.addEventListener('gradright:public-profile', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('gradright:public-profile', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return identity;
}

export function PublicProfileDetails({ editable = false }) {
  const identity = usePublicIdentity();
  const { account, ready } = useRuntime();
  const [form, setForm] = useState({ username: '', email: '', phone: '' });
  const [status, setStatus] = useState('');
  useEffect(() => {
    setForm({
      username:
        identity.username ||
        account?.username ||
        (account?.communityOriginalName || account?.name || 'Priya Sharma')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.|\.$/g, ''),
      email: identity.email || '',
      phone: identity.phone || '',
    });
  }, [identity, account]);
  if (!editable)
    return identity.username || identity.email || identity.phone ? (
      <div className="cpp-section">
        {identity.username && <p className="c-profile-username">@{identity.username}</p>}
        {identity.email && (
          <p>
            <a href={`mailto:${identity.email}`}>{identity.email}</a>
          </p>
        )}
        {identity.phone && (
          <p>
            <a href={`tel:+91${identity.phone}`}>+91 {identity.phone}</a>
          </p>
        )}
      </div>
    ) : null;
  function save() {
    if (!/^[a-z0-9][a-z0-9._]{2,29}$/.test(form.username)) {
      setStatus('Use 3–30 lowercase letters, numbers, dots or underscores.');
      return;
    }
    try {
      savePublicIdentity(form);
      setStatus('Public details saved.');
    } catch {
      setStatus('Unable to save. Try again.');
    }
  }
  return (
    <Card className="panel profile-community-summary">
      <div className="panel-head">
        <h2>Public contact details</h2>
      </div>
      <p className="panel-lead">
        Your username and any contact details you add here are visible to other users. Your account
        email and sign-in number stay private.
      </p>
      <div className="account-form">
        <div className="field">
          <Label htmlFor="public-username">Username</Label>
          <Input
            id="public-username"
            value={form.username}
            maxLength={30}
            onChange={(event) => {
              setStatus('');
              setForm({ ...form, username: event.target.value.toLowerCase() });
            }}
          />
        </div>
        <ContactEditor
          label="Public email"
          kind="email"
          value={form.email}
          onVerified={(email) => {
            setStatus('');
            setForm((previous) => ({ ...previous, email }));
          }}
        />
        {form.email && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setForm({ ...form, email: '' })}
          >
            Remove public email
          </Button>
        )}
        <ContactEditor
          label="Public contact number"
          kind="tel"
          value={form.phone}
          onVerified={(phone) => {
            setStatus('');
            setForm((previous) => ({ ...previous, phone }));
          }}
        />
        {form.phone && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setForm({ ...form, phone: '' })}
          >
            Remove public number
          </Button>
        )}
        <div>
          <Button type="button" disabled={!ready} onClick={save}>
            Save public details
          </Button>
        </div>
        {status && (
          <p role="status" className="hint-text">
            {status}
          </p>
        )}
      </div>
    </Card>
  );
}
