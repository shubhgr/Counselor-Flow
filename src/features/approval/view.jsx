'use client';
import { memo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

export const View = memo(function View() {
  return (
    <>
      <div className={'onboard-wrap'} style={{ paddingTop: '3rem' }}>
        <Card className={'panel'} style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div className={'avatar lg'} style={{ margin: '0 auto 1rem' }}>
            {'PS'}
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: '650',
              letterSpacing: '-0.03em',
              marginBottom: '0.4rem',
            }}
          >
            {'Ready for the marketplace — waiting on admin'}
          </h1>
          <p
            style={{
              color: 'var(--muted)',
              maxWidth: '28rem',
              margin: '0 auto 1.5rem',
              fontSize: '0.92rem',
            }}
          >
            {
              'After verification your listing goes live: students browse, get recommended you,\n        and pay your connect fee. Until then the marketplace card stays hidden.'
            }
          </p>
          <p className={'hint-text'} style={{ marginBottom: '1.25rem' }}>
            {'Log in to view your dashboard, or sign up to begin approval'}
          </p>
          <div
            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link
              className={'btn btn-secondary btn-sm'}
              href={'/profile?tab=preview'}
              prefetch={false}
            >
              {'Student preview'}
            </Link>
            <Link className={'btn btn-secondary btn-sm'} href={'/marketplace'} prefetch={false}>
              {'Student browse'}
            </Link>
            <a className={'btn btn-primary btn-sm'} href={'#'} id={'simulate-approval'}>
              {'Simulate approval → Listed'}
            </a>
          </div>
        </Card>
      </div>
    </>
  );
});
