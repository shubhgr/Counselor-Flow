'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions'}>
          <Link
            className={'btn btn-secondary btn-sm btn-icon'}
            id={'chat-btn'}
            href={'/chats'}
            title={'Chat'}
            prefetch={false}
          >
            <Icon name="chat" className={'app-icon'} aria-hidden={'true'} />
            {'Chat'}
          </Link>
          <Link
            className={'btn btn-secondary btn-sm'}
            id={'profile-btn'}
            href={'/person'}
            prefetch={false}
          >
            {'Profile'}
          </Link>
        </div>
      </PageActions>
      <div className={'content'}>
        <div className={'call-stage'}>
          <div className={'call-avatar'} id={'call-avatar'}>
            {'AR'}
          </div>
          <h2 id={'call-name'}>{'Aarav Reddy'}</h2>
          <p className={'status'}>
            {'Connected ·'}
            <span data-live-elapsed={''} id={'call-elapsed'}>
              {'0:00'}
            </span>
          </p>
          <div className={'call-controls'}>
            <Button
              className={'call-btn'}
              type={'button'}
              title={'Mute'}
              id={'btn-mute'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="mic" className={'app-icon'} aria-hidden={'true'} />
            </Button>
            <Button
              className={'call-btn'}
              type={'button'}
              title={'Video'}
              id={'btn-video'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="videocam" className={'app-icon'} aria-hidden={'true'} />
            </Button>
            <Link
              className={'call-btn'}
              id={'btn-chat'}
              href={'/chats'}
              title={'Chat'}
              prefetch={false}
            >
              <Icon name="chat" className={'app-icon'} aria-hidden={'true'} />
            </Link>
            <Button
              className={'call-btn end'}
              type={'button'}
              id={'end-call'}
              title={'End meet'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="call_end" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <p className={'call-note'}>
            {'Session notes stay private · Student booked via GradRight app'}
          </p>
        </div>
      </div>
    </>
  );
});
