'use client';
import { createPortal } from 'react-dom';
import { Switch } from './ui/switch';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRuntime } from './runtime-provider';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ContactEditor } from './contact-editor';
import { readPublicIdentity } from '@/lib/domain/public-identity';
import { AUTHORS } from '@/lib/domain/community';
import { usernameStatus } from '@/lib/domain/usernames';
import { CheckCircle2, CircleAlert } from 'lucide-react';

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

export function PublicProfileDetails({ editable = false, embedded = false }) {
  const identity = usePublicIdentity();
  const { account } = useRuntime();
  const [form, setForm] = useState({ username: '', email: '', phone: '' });
  const [contactHost, setContactHost] = useState(null);
  useEffect(() => {
    if (embedded) setContactHost(document.getElementById('profile-contact-fields'));
  }, [embedded]);
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  const draft = useRef(form);
  const owners = useRef([]);
  owners.current = [
    identity.name,
    account?.name,
    account?.communityOriginalName || 'Priya Sharma',
  ].filter(Boolean);
  const availability = usernameStatus(form.username, AUTHORS, owners.current);
  function updateForm(value) {
    const next = typeof value === 'function' ? value(draft.current) : value;
    draft.current = next;
    setForm(next);
  }
  useEffect(() => {
    updateForm({
      username:
        identity.username ||
        account?.username ||
        (account?.communityOriginalName || account?.name || 'Priya Sharma')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/^\.|\.$/g, ''),
      email: identity.email ?? account?.email ?? 'priya.sharma@gmail.com',
      phone: identity.phone || '',
      showEmail: Boolean(identity.email) && identity.showEmail !== false,
      showPhone: identity.showPhone !== false,
    });
  }, [identity, account]);
  useLayoutEffect(() => {
    if (!editable) return;
    const api = {
      get: () => ({ ...draft.current }),
      validate: () => {
        const result = usernameStatus(draft.current.username, AUTHORS, owners.current);
        const valid = result === 'available';
        setStatus(
          valid
            ? ''
            : result === 'taken'
              ? 'This username is already in use. Choose another one.'
              : 'Use 3–30 lowercase letters, numbers, dots or underscores.',
        );
        if (!valid) document.getElementById('public-username')?.focus();
        return valid;
      },
      restore: (value) => {
        updateForm(value);
        setStatus('');
        setRevision((value) => value + 1);
      },
    };
    window.GradRightPublicProfileDraft = api;
    return () => {
      if (window.GradRightPublicProfileDraft === api) delete window.GradRightPublicProfileDraft;
    };
  }, [editable]);
  useEffect(() => {
    if (editable) {
      const status = document.getElementById('public-contact-status');
      const missing = Number(!form.email) + Number(!form.phone);
      if (status) {
        status.textContent = missing ? `${missing} not added` : 'Added';
        status.className = 'pill ' + (missing ? 'warn' : 'ok');
      }
      window.GradRightProfileDirty?.edit?.();
      window.dispatchEvent(new Event('gradright:public-draft'));
    }
  }, [editable, form]);
  if (!editable)
    return identity.username || identity.email || identity.phone ? (
      <div className="cpp-section">
        {identity.username && <p className="c-profile-username">@{identity.username}</p>}
        {identity.email && identity.showEmail !== false && (
          <p>
            <a href={`mailto:${identity.email}`}>{identity.email}</a>
          </p>
        )}
        {identity.phone && identity.showPhone !== false && (
          <p>
            <a href={`tel:+91${identity.phone}`}>+91 {identity.phone}</a>
          </p>
        )}
      </div>
    ) : null;
  const contacts = (
    <div className="profile-public-form profile-contact-grid">
      {' '}
      <div className="profile-public-contact-field">
        <ContactEditor
          inline
          key={`email:${revision}`}
          labelAction={
            <div className="profile-contact-visibility">
              <Label htmlFor="visibility-email">Show on profile</Label>
              <Switch
                id="visibility-email"
                checked={Boolean(form.email && form.showEmail)}
                disabled={!form.email}
                onCheckedChange={(checked) =>
                  updateForm((previous) => ({ ...previous, showEmail: checked }))
                }
              />
            </div>
          }
          label="Public email"
          kind="email"
          value={form.email}
          onVerified={(email) => {
            setStatus('');
            updateForm((previous) => ({
              ...previous,
              email,
              showEmail: email ? true : false,
            }));
          }}
        />
      </div>
      <div className="profile-public-contact-field">
        <ContactEditor
          inline
          key={`phone:${revision}`}
          labelAction={
            <div className="profile-contact-visibility">
              <Label htmlFor="visibility-phone">Show on profile</Label>
              <Switch
                id="visibility-phone"
                checked={Boolean(form.phone && form.showPhone)}
                disabled={!form.phone}
                onCheckedChange={(checked) =>
                  updateForm((previous) => ({ ...previous, showPhone: checked }))
                }
              />
            </div>
          }
          label="Public contact number"
          kind="tel"
          value={form.phone}
          onVerified={(phone) => {
            setStatus('');
            updateForm((previous) => ({
              ...previous,
              phone,
              showPhone: phone ? true : false,
            }));
          }}
        />
      </div>
    </div>
  );
  const Container = embedded ? 'section' : Card;
  return (
    <Container
      className={embedded ? 'profile-public-details is-embedded' : 'panel profile-public-details'}
    >
      <div className="account-form profile-public-form">
        <div className="field">
          <div className="profile-username-heading">
            <Label htmlFor="public-username">Username</Label>
            <span id="public-username-hint" className="hint-text">
              Shown on community posts
            </span>
          </div>
          <div
            className="profile-username-input"
            data-invalid={availability === 'taken' || availability === 'invalid'}
          >
            <span className="profile-username-prefix" aria-hidden="true">
              @
            </span>
            <Input
              id="public-username"
              value={form.username}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="public-username-hint public-username-availability"
              aria-invalid={availability === 'taken' || availability === 'invalid'}
              onChange={(event) => {
                setStatus('');
                updateForm({ ...form, username: event.target.value.toLowerCase() });
              }}
            />
            <span
              id="public-username-availability"
              className={`profile-username-availability is-${availability}`}
              role="status"
              title={
                availability === 'available' ? 'Available in the current community data' : undefined
              }
            >
              {availability === 'available' ? (
                <>
                  <CheckCircle2 aria-hidden="true" />
                  Available
                </>
              ) : availability === 'taken' ? (
                <>
                  <CircleAlert aria-hidden="true" />
                  Taken
                </>
              ) : availability === 'invalid' ? (
                'Invalid format'
              ) : null}
            </span>
          </div>
        </div>
        {contactHost ? createPortal(contacts, contactHost) : !embedded ? contacts : null}
        {status && (
          <p role="status" className="hint-text">
            {status}
          </p>
        )}
      </div>
    </Container>
  );
}
