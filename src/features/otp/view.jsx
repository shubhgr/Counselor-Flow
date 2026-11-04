'use client';
import { memo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useRuntime } from '@/components/runtime-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export const View = memo(function View() {
  const params = useSearchParams(),
    router = useRouter();
  const { ready } = useRuntime();
  const [value, setValue] = useState('');
  const phone = (params.get('phone') || '1234567890').replace(/\D/g, '').slice(-10);
  const isLogin = params.get('mode') === 'login';
  const display = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  function verify(event) {
    event.preventDefault();
    if (!ready || value.length !== 6) return;
    window.GradRightSession.set(phone, {
      name: params.get('name') || 'Priya Sharma',
      email: params.get('email') || 'priya.sharma@gmail.com',
      verified: isLogin,
    });
    router.push(isLogin ? '/dashboard' : '/onboarding');
  }
  return (
    <div className="onboard-page otp-page">
      <div className="otp-center">
        <Card className="panel otp-card">
          <h1>Verify your mobile</h1>
          <p className="otp-lead">Enter the 6-digit OTP sent to</p>
          <p className="otp-phone" id="phone-label">
            {display}
          </p>
          <p className="hint-text" id="account-hint">
            {isLogin
              ? 'Log in opens the live counselor dashboard.'
              : 'New accounts stay pending until admin approval.'}
          </p>
          <form onSubmit={verify} className="otp-form">
            <Label htmlFor="verification-code">Verification code</Label>
            <InputOTP
              id="verification-code"
              value={value}
              onChange={setValue}
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              aria-describedby="otp-code-hint"
              autoFocus
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="hint-text" id="otp-code-hint">
              Enter a six-digit verification code.
            </p>
            <Button type="submit" disabled={!ready || value.length !== 6}>
              Verify &amp; continue
            </Button>
          </form>
          <p className="auth-footer">
            <Link href="/">Change number</Link>
          </p>
        </Card>
      </div>
    </div>
  );
});
