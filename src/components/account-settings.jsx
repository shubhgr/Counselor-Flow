'use client';
import { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { useRuntime } from './runtime-provider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function AccountSettings({ open, onOpenChange }) {
  const photoInput = useRef(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const { account, ready } = useRuntime();
  const [form, setForm] = useState({ name: '', email: '', photo: '' });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [details, setDetails] = useState({ name: '', email: '', photo: '' });
  useEffect(() => {
    if (!ready) return;
    let draft;
    try {
      draft = JSON.parse(localStorage.getItem('counselor-account-details') || 'null');
    } catch {
      draft = null;
    }
    const initial = {
      photo: account?.photo ?? draft?.photo ?? '',
      name: account?.name || draft?.name || 'Priya Sharma',
      email: account?.email || draft?.email || 'priya.sharma@gmail.com',
    };
    setForm(initial);
    setDetails(initial);
  }, [ready, account]);
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('Choose an image smaller than 1 MB.');
      return;
    }
    setLoadingPhoto(true);
    setError('');
    try {
      const photo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = reject;
        image.src = photo;
      });
      setForm((previous) => ({ ...previous, photo }));
    } catch {
      setError('This image could not be opened. Try another file.');
    } finally {
      setLoadingPhoto(false);
    }
  }
  function save(event) {
    event.preventDefault();
    const details = { ...form, name: form.name.trim(), email: form.email.trim() };
    if (!details.name || !details.email) return;
    try {
      localStorage.setItem(
        'counselor-account-details',
        JSON.stringify({
          ...details,
          initials: details.name
            .split(/\s+/)
            .map((x) => x[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
        }),
      );
      if (account?.phone) {
        window.GradRightSession.set(account.phone, {
          ...account,
          ...details,
          initials: details.name
            .split(/\s+/)
            .map((x) => x[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
        });
      }
    } catch {
      setError('Unable to save changes. Check that browser storage is available and try again.');
      return;
    }
    window.dispatchEvent(new Event('gradright:session'));
    setError('');
    setDetails(details);
    onOpenChange(false);
    setSaved(true);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="account-edit-dialog">
        <DialogHeader>
          <DialogTitle>My account</DialogTitle>
          <DialogDescription>
            Update your private name and account email. Your sign-in mobile stays locked after
            verification.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="account-form" onChange={() => setSaved(false)}>
          <div className="account-photo-editor">
            <Avatar className="size-16">
              <AvatarImage src={form.photo || undefined} alt="Account photo preview" />
              <AvatarFallback>
                {form.name
                  .split(/\s+/)
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'PS'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loadingPhoto}
                  onClick={() => photoInput.current?.click()}
                >
                  {loadingPhoto ? 'Opening image…' : form.photo ? 'Replace photo' : 'Upload photo'}
                </Button>
                {form.photo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm((previous) => ({ ...previous, photo: '' }))}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="hint-text">
                JPG, PNG or WebP · up to 1 MB. Used for your account avatar.
              </p>
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              aria-label="Upload account photo"
              onChange={uploadPhoto}
            />
          </div>
          <div className="field">
            <Label htmlFor="account-name">Full name</Label>
            <Input
              id="account-name"
              autoComplete="name"
              maxLength={120}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="field">
            <Label htmlFor="account-email">Account email</Label>
            <Input
              id="account-email"
              type="email"
              maxLength={254}
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="hint-text">Used for account communication and updates.</p>
          </div>
          <div className="field">
            <Label htmlFor="account-phone">Sign-in mobile</Label>
            <Input id="account-phone" readOnly value={account?.phoneDisplay || 'Not linked'} />
            <p className="hint-text">Your sign-in number is locked after OTP verification.</p>
          </div>
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
                !ready ||
                loadingPhoto ||
                !form.name.trim() ||
                !form.email.trim() ||
                (form.name.trim() === details.name &&
                  form.email.trim() === details.email &&
                  form.photo === details.photo)
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
