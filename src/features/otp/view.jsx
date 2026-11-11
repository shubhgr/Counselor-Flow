'use client';
import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useRuntime } from '@/components/runtime-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const RESEND_SECONDS = 30;

function formatResendWait(seconds) {
  return `0:${String(seconds).padStart(2, '0')}`;
}

function formatPhone(phone) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export const View = memo(function View() {
  const params = useSearchParams(),
    router = useRouter();
  const { ready } = useRuntime();
  const [value, setValue] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const phone = (params.get('phone') || '1234567890').replace(/\D/g, '').slice(-10);
  const email = (params.get('email') || 'priya.sharma@gmail.com').trim();
  const name = params.get('name') || 'Priya Sharma';
  const isLogin = params.get('mode') === 'login';
  const isEmail = params.get('channel') === 'email';
  const display = isEmail ? email : formatPhone(phone);
  const editHref = isLogin ? '/?mode=login' : '/';

  useEffect(() => {
    setValue('');
    setSecondsLeft(RESEND_SECONDS);
  }, [isEmail]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = window.setTimeout(() => setSecondsLeft((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  function sessionPayload(extras) {
    return {
      name,
      email,
      verified: isLogin,
      ...extras,
    };
  }

  function verify(event) {
    event.preventDefault();
    if (!ready || value.length !== 6) return;
    if (isLogin) {
      window.GradRightSession.set(phone, sessionPayload({ emailVerified: true }));
      router.push('/dashboard');
      return;
    }
    if (isEmail) {
      window.GradRightSession.set(phone, sessionPayload({ emailVerified: true }));
      router.push('/onboarding');
      return;
    }
    window.GradRightSession.set(phone, sessionPayload({ emailVerified: false }));
    const next = new URLSearchParams(params.toString());
    next.set('channel', 'email');
    router.push(`/otp?${next.toString()}`);
  }

  function resend() {
    if (secondsLeft > 0) return;
    setValue('');
    setSecondsLeft(RESEND_SECONDS);
  }

  return (
    <div className="onboard-page otp-page">
      <div className="otp-center">
        <Card className="panel otp-card">
          <h1>{isEmail ? 'Verify your email' : 'Verify your mobile'}</h1>
          <p className="otp-lead">Enter the 6-digit OTP sent to</p>
          <div className="otp-phone-row">
            <p className="otp-phone" id="otp-destination-label">
              {display}
            </p>
            <Button variant="unstyled" size="unstyled" className="otp-edit-number" asChild>
              <Link href={editHref} prefetch={false}>
                Edit
              </Link>
            </Button>
          </div>
          <form onSubmit={verify} className="otp-form">
            <Label htmlFor="verification-code">Verification code</Label>
            <InputOTP
              id="verification-code"
              value={value}
              onChange={setValue}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              autoFocus
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button type="submit" disabled={!ready || value.length !== 6}>
              Verify &amp; continue
            </Button>
          </form>
          <p className="auth-footer" aria-live="polite">
            {secondsLeft > 0 ? (
              <>Didn’t get it? Resend OTP in {formatResendWait(secondsLeft)}</>
            ) : (
              <>
                {'Didn’t get it? '}
                <Button type="button" variant="link" className="otp-resend" onClick={resend}>
                  Resend OTP
                </Button>
              </>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
});
