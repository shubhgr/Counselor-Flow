'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShieldCheck, CircleHelp, Flag, Users, ArrowUpRight } from 'lucide-react';
import { useRuntime } from '@/components/runtime-provider';
import { PreferenceSwitch } from '@/components/preference-switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
const sections = [
  ['notifications', 'Notifications', Bell],
  ['safety', 'Privacy & safety', ShieldCheck],
  ['help', 'Help & support', CircleHelp],
];
const preferences = [
  ['bookings', 'Booking requests', 'When a student books one of your services.', true],
  ['messages', 'Chat messages', 'Updates about new messages from your connections.', true],
  ['meets', 'Meeting reminders', 'Reminders for upcoming and incoming meetings.', true],
  [
    'community',
    'Community activity',
    'Replies and activity on your community contributions.',
    false,
  ],
  ['approval', 'Verification updates', 'Updates about your counselor profile approval.', true],
];
export function View() {
  const { ready } = useRuntime();
  const [tab, setTab] = useState('notifications');
  const [blocked, setBlocked] = useState([]);
  const [reports, setReports] = useState([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [report, setReport] = useState({ name: '', reason: 'other', details: '' });
  useEffect(() => {
    const syncHash = () => {
      const key = location.hash.slice(1);
      setTab(
        ['block', 'report'].includes(key)
          ? 'safety'
          : sections.some(([id]) => id === key)
            ? key
            : 'notifications',
      );
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const refresh = () => {
      setBlocked(window.GradRightSafety?.list() || []);
      setReports(window.GradRightSafety?.reports() || []);
    };
    refresh();
    document.addEventListener('gradright:safety', refresh);
    return () => document.removeEventListener('gradright:safety', refresh);
  }, [ready]);
  function submit(event) {
    event.preventDefault();
    if (!report.name.trim() || !report.details.trim() || !ready) return;
    window.GradRightSafety.report(
      { id: `c:${report.name.trim()}`, name: report.name.trim() },
      report.reason,
      report.details.trim(),
    );
    setOpen(false);
    setReport({ name: '', reason: 'other', details: '' });
    setStatus('Report saved in this prototype. No report has been sent to support.');
  }
  return (
    <div className="content settings-workspace">
      <div className="settings-single-panel">
        <div className="settings-main">
          <section hidden={tab !== 'notifications'} aria-label="Notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose which updates you want to receive. Preferences save automatically on this
                  browser.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {preferences.map(([name, label, description, defaultChecked]) => (
                  <div key={name} className="settings-preference-row">
                    <div>
                      <strong>{label}</strong>
                      <p>{description}</p>
                    </div>
                    <PreferenceSwitch name={name} label={label} defaultChecked={defaultChecked} />
                  </div>
                ))}
                <p className="settings-note">
                  These preferences are saved for the prototype; they do not change system or email
                  delivery.
                </p>
              </CardContent>
            </Card>
          </section>
          <section
            hidden={tab !== 'safety'}
            aria-label="Privacy and safety"
            className="settings-panel-stack"
          >
            <Card>
              <CardHeader>
                <CardTitle>Blocked people</CardTitle>
                <CardDescription>
                  Blocked people cannot message you or book a meeting. You can unblock them here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!blocked.length ? (
                  <div className="settings-empty">
                    <Users size={24} />
                    <strong>No blocked people</strong>
                    <p>People you block from chats or profiles will appear here.</p>
                  </div>
                ) : (
                  blocked.map((person) => (
                    <div className="settings-preference-row" key={person.id}>
                      <div>
                        <strong>{person.name}</strong>
                        <p>{window.GradRightSafety.roleLabel(person.role)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.GradRightSafety.unblock(person.id);
                          setStatus(`${person.name} unblocked.`);
                        }}
                      >
                        Unblock
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>
                  Keep track of concerns about inappropriate behavior.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled={!ready} onClick={() => setOpen(true)}>
                  <Flag size={16} />
                  Report a concern
                </Button>
                {!reports.length ? (
                  <p className="settings-note">You have not submitted any reports.</p>
                ) : (
                  <ul className="settings-report-list">
                    {reports.map((item, index) => (
                      <li key={`${item.reportedAt}-${index}`}>
                        <strong>{item.name}</strong>
                        <span>{window.GradRightSafety.reasonLabel(item.reason)}</span>
                        <p>{item.details}</p>
                        <small>
                          Saved locally ·{' '}
                          {new Date(item.reportedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </small>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
          <section hidden={tab !== 'help'} aria-label="Help and support">
            <Card>
              <CardHeader>
                <CardTitle>Help & support</CardTitle>
                <CardDescription>
                  Answers to common questions about your counselor workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <details className="settings-guide">
                  <summary>How does counselor verification work?</summary>
                  <p>
                    Complete your counselor profile and add your verification documents. GradRight
                    reviews your profile before your listing goes live.
                  </p>
                  <Link href="/profile">Open counselor profile →</Link>
                </details>
                <details className="settings-guide">
                  <summary>How do I manage availability and bookings?</summary>
                  <p>
                    Set your available days and hours in Calendar. Manage upcoming meetings and
                    booking requests in Meet.
                  </p>
                  <div className="flex gap-4">
                    <Link href="/calendar">Open Calendar →</Link>
                    <Link href="/calls">Open Meet →</Link>
                  </div>
                </details>
                <details className="settings-guide">
                  <summary>Where do I change my email or mobile number?</summary>
                  <p>
                    Your private contact information is in My account. Your verified sign-in number
                    is locked; your public counselor profile is managed separately.
                  </p>
                  <Link href="/account">Open My account →</Link>
                </details>
                <div className="settings-support">
                  <div>
                    <strong>Need more help?</strong>
                    <p>Contact the counselor support team.</p>
                  </div>
                  <Button asChild variant="outline">
                    <a href="mailto:counselor-support@gradright.com">Email support</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
          <p className="settings-status" role="status">
            {status}
          </p>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="settings-report-dialog">
          <DialogHeader>
            <DialogTitle>Report a concern</DialogTitle>
            <DialogDescription>
              Describe what happened. Reports are stored locally in this prototype.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="account-form">
            <div className="field">
              <Label htmlFor="report-name">Person’s name</Label>
              <Input
                id="report-name"
                required
                maxLength={120}
                value={report.name}
                onChange={(e) => setReport({ ...report, name: e.target.value })}
              />
            </div>
            <div className="field">
              <Label htmlFor="report-reason">Reason</Label>
              <NativeSelect
                id="report-reason"
                value={report.reason}
                onChange={(e) => setReport({ ...report, reason: e.target.value })}
              >
                <NativeSelectOption value="other">Something else</NativeSelectOption>
                <NativeSelectOption value="harassment">Harassment or abuse</NativeSelectOption>
                <NativeSelectOption value="spam">Spam or scam</NativeSelectOption>
                <NativeSelectOption value="inappropriate">Inappropriate content</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="field">
              <Label htmlFor="report-details">What happened?</Label>
              <Textarea
                id="report-details"
                required
                maxLength={2000}
                rows={4}
                value={report.details}
                onChange={(e) => setReport({ ...report, details: e.target.value })}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={!ready || !report.name.trim() || !report.details.trim()}
              >
                Save report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
