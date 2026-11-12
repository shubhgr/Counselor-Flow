'use client';
import { ProfileNextBanner } from '@/components/profile-next-banner';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import { Card } from '@/components/ui/card';
import { ScrollPanel } from '@/components/ui/scroll-panel';
import { BADGES } from './data';

export const View = memo(function View() {
  return (
    <div className="content">
      <ProfileNextBanner />
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
              <div key={badge.label} className={badge.locked ? 'rev-badge is-locked' : 'rev-badge'}>
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
