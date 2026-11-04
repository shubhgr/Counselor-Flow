'use client';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { useRuntime } from './runtime-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ContactEditor } from './contact-editor';

export function AccountSettings({ open, onOpenChange }) {
  const { account, ready } = useRuntime();
  const [form, setForm] = useState({ name: '', email: '' });
  const [initial, setInitial] = useState(form);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ready) return;
    const value = {
      name: account?.name || 'Priya Sharma',
      email: account?.email || 'priya.sharma@gmail.com',
    };
    setForm(value);
    setInitial(value);
  }, [ready, account]);
  function save(event) {
    event.preventDefault();
    const details = { ...form, name: form.name.trim() };
    if (!details.name) return;
    try {
      const previous = JSON.parse(localStorage.getItem('counselor-account-details') || '{}');
      const next = {
        ...previous,
        ...account,
        ...details,
        initials: details.name
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
      };
      localStorage.setItem('counselor-account-details', JSON.stringify(next));
      if (account?.phone) window.GradRightSession.set(account.phone, next);
      window.dispatchEvent(new Event('gradright:session'));
      onOpenChange(false);
    } catch {
      setError('Unable to save your account details. Try again.');
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="account-edit-dialog">
        <DialogHeader>
          <DialogTitle>My account</DialogTitle>
          <DialogDescription>
            Your onboarding name and account email. These details are private. Manage what others
            see in Profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="account-form">
          <div className="field">
            <Label htmlFor="account-name">Full name</Label>
            <Input
              id="account-name"
              autoComplete="name"
              required
              maxLength={120}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <ContactEditor
            label="Account email"
            kind="email"
            value={form.email}
            onVerified={(email) => setForm((previous) => ({ ...previous, email }))}
          />
          {error && (
            <p role="alert" className="account-save-error">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                !ready || !form.name.trim() || JSON.stringify(form) === JSON.stringify(initial)
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
