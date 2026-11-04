'use client';
import { useEffect } from 'react';
import { Check, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useLiveProfile } from './student-profile-preview';

export function ProfileStrength() {
  const profile = useLiveProfile();
  const steps = [
    {
      label: 'Name and location',
      done: Boolean(profile.name?.trim() && profile.address?.trim()),
      weight: 25,
      target: 'profile-identity',
    },
    { label: 'Bio', done: Boolean(profile.bio?.trim()), weight: 20, target: 'profile-background' },
    {
      label: 'Verification documents',
      done: profile.documents > 0,
      weight: 25,
      target: 'profile-verification',
    },
    {
      label: 'Add a profile photo',
      done: Boolean(profile.photo),
      weight: 10,
      target: 'profile-identity',
    },
    {
      label: 'Add an intro video',
      done: Boolean(profile.video),
      weight: 10,
      target: 'profile-introduction',
    },
    {
      label: 'Add a public email',
      done: Boolean(profile.email),
      weight: 5,
      target: 'profile-contact',
    },
    {
      label: 'Add a public number',
      done: Boolean(profile.phone),
      weight: 5,
      target: 'profile-contact',
    },
  ];
  const score = steps.reduce((sum, step) => sum + (step.done ? step.weight : 0), 0);
  const remaining = steps.filter((step) => !step.done).length;
  useEffect(() => {
    const identity = document.getElementById('profile-identity-status');
    if (identity) {
      const done = Boolean(profile.photo && profile.name?.trim() && profile.address?.trim());
      identity.textContent = done ? 'Complete' : !profile.photo ? 'Needs photo' : 'Needs details';
      identity.className = 'pill ' + (done ? 'ok' : 'warn');
    }
    window.dispatchEvent(new CustomEvent('gradright:profile-completeness', { detail: score }));
  }, [score, profile.photo, profile.name, profile.address]);
  return (
    <Card className="panel profile-strength">
      <div className="profile-strength-header">
        <div
          className="profile-strength-ring"
          role="meter"
          aria-label="Profile strength"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={score}
          style={{ '--profile-strength': `${score}%` }}
        >
          <span>{score}%</span>
        </div>
        <div>
          <h2>Profile strength</h2>
          <p>
            {remaining ? `Finish ${remaining} steps to reach 100%` : 'Your profile is complete'}
          </p>
        </div>
      </div>
      <ul>
        {steps.map((step) => (
          <li key={step.label}>
            <a href={`#${step.target}`} className={step.done ? 'is-complete' : ''}>
              {step.done ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
              <span>{step.label}</span>
              {!step.done && <strong>+{step.weight}%</strong>}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
