'use client';
import { memo } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { Card } from '@/components/ui/card';
import { ScrollPanel } from '@/components/ui/scroll-panel';
import { BADGES } from './data';

export const View = memo(function View() {
  return (
    <div className="content">
      <div className="pending-banner" data-unverified-only="">
        <div className="icon">
          <Icon name="schedule" className="app-icon" aria-hidden="true" />
        </div>
        <div>
          <h3>{'Pending admin approval'}</h3>
          <p>{'Badges stay locked until GradRight verifies you. Earned badges will show here after that.'}</p>
        </div>
        <Link className="btn btn-secondary btn-sm" href="/profile?tab=preview" prefetch={false}>
          {'Student preview'}
        </Link>
      </div>
      <Card className="panel rev-side-panel p-0">
        <ScrollPanel
          className="rev-badge-scroll"
          head={<h2>{'Your badges'}</h2>}
          footer={
            <p className="rev-side-note">
              {'Badges appear on your public counselor card in the GradRight student app.'}
            </p>
          }
        >
          <div className="rev-badge-grid">
            {BADGES.map((badge) => (
              <div
                key={badge.label}
                className={badge.locked ? 'rev-badge is-locked' : 'rev-badge'}
              >
                <Icon name={badge.icon} className="app-icon" aria-hidden="true" />
                <strong>{badge.label}</strong>
                {badge.locked ? <small>{'Locked'}</small> : null}
              </div>
            ))}
          </div>
        </ScrollPanel>
      </Card>
    </div>
  );
});
