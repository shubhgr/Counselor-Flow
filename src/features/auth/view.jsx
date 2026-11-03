'use client';
import { memo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const View = memo(function View() {
  return (
    <>
      <div className={'auth-shell'}>
        <aside className={'auth-visual'}>
          <div className={'brand-mark'}>
            <img className={'brand-logo'} src={'/assets/gradright-logo.png'} alt={'GradRight'} />
          </div>
          <div className={'auth-copy'}>
            <h1>{'Join the GradRight counselor marketplace.'}</h1>
            <p>
              {
                'Get listed, recommended to students on the GradRight app, and earn when they\n          pay to connect — shortlisting, SOP, visas, country pathways.'
              }
            </p>
          </div>
          <ul className={'auth-flow-hint'}>
            <li>
              <span className={'dot'} />
              {'Mobile OTP verification'}
            </li>
            <li>
              <span className={'dot'} />
              {'Build your marketplace profile'}
            </li>
            <li>
              <span className={'dot'} />
              {'Admin verifies → you get listed'}
            </li>
            <li>
              <span className={'dot'} />
              {'Students discover, connect & book'}
            </li>
          </ul>
        </aside>
        <main className={'auth-panel'}>
          <div className={'auth-card'}>
            <div className={'auth-tabs'} role={'tablist'}>
              <Button
                type={'button'}
                className={'auth-tab active'}
                id={'tab-signup'}
                onClick={(event) => {
                  window.showAuth?.('signup');
                }}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Sign up'}
              </Button>
              <Button
                type={'button'}
                className={'auth-tab'}
                id={'tab-login'}
                onClick={(event) => {
                  window.showAuth?.('login');
                }}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Log in'}
              </Button>
            </div>
            <div id={'panel-signup'}>
              <h2>{'Create counselor account'}</h2>
              <p className={'sub'}>
                {'We’ll send an OTP to your mobile. Email can be verified later from profile.'}
              </p>
              <form action={'/otp'} method={'get'}>
                <div className={'field'}>
                  <Label htmlFor={'su-name'}>{'Full name'}</Label>
                  <Input
                    id={'su-name'}
                    name={'name'}
                    type={'text'}
                    defaultValue={'Priya Sharma'}
                    required
                  />
                </div>
                <div className={'field'}>
                  <Label htmlFor={'su-phone'}>{'Mobile number'}</Label>
                  <Input
                    id={'su-phone'}
                    name={'phone'}
                    type={'tel'}
                    defaultValue={'1234567890'}
                    required
                  />
                  <p className={'hint-text'}>
                    {'Any number · sign up stays pending until admin approval'}
                  </p>
                </div>
                <div className={'field'}>
                  <Label htmlFor={'su-email'}>{'Email'}</Label>
                  <Input
                    id={'su-email'}
                    name={'email'}
                    type={'email'}
                    defaultValue={'priya.sharma@gmail.com'}
                    required
                  />
                  <p className={'hint-text'}>
                    {'Saved now · not verified yet · verify anytime from profile'}
                  </p>
                </div>
                <Button className={''} type={'submit'} variant={'default'} size={'default'}>
                  {'Send OTP'}
                </Button>
              </form>
            </div>
            <div id={'panel-login'} hidden>
              <h2>{'Welcome back'}</h2>
              <p className={'sub'}>{'Log in with your mobile number.'}</p>
              <form action={'/otp'} method={'get'}>
                <Input type={'hidden'} name={'mode'} defaultValue={'login'} />
                <div className={'field'}>
                  <Label htmlFor={'li-phone'}>{'Mobile number'}</Label>
                  <Input id={'li-phone'} name={'phone'} type={'tel'} defaultValue={'0987654321'} />
                  <p className={'hint-text'}>{'Any number · log in as a verified counselor'}</p>
                </div>
                <Button className={''} type={'submit'} variant={'default'} size={'default'}>
                  {'Send OTP'}
                </Button>
              </form>
              <p className={'auth-footer'}>
                {'Still waiting for approval?'}
                <Link href={'/dashboard'} prefetch={false}>
                  {'Open pending dashboard'}
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
});
