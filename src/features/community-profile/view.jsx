'use client';
import { memo } from 'react';
import Link from 'next/link';

export const View = memo(function View() {
  return (
    <>
      <div className={'market-shell'}>
        <header className={'market-top'}>
          <div className={'brand-mark'}>
            <img
              className={'brand-logo dark'}
              src={'/assets/gradright-logo-dark.png'}
              alt={'GradRight'}
            />
          </div>
          <p className={'switch'}>
            <Link href={'/community'} prefetch={false}>
              {'← Back to community'}
            </Link>
          </p>
        </header>
        <div className={'market-body'}>
          <div className={'c-public'} id={'profile-root'}>
            <p className={'hint-text'}>{'Loading profile…'}</p>
          </div>
        </div>
      </div>
    </>
  );
});
