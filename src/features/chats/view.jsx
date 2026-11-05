'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const View = memo(function View() {
  return (
    <>
      <div className={'content content-chat'}>
        <div className={'pending-banner'} data-unverified-only={''}>
          <div className={'icon'}>
            <Icon name="schedule" className={'app-icon'} aria-hidden={'true'} />
          </div>
          <div>
            <h3>{'Pending admin approval'}</h3>
            <p>
              {
                'Chats stay empty until GradRight verifies you. Threads appear after students connect.'
              }
            </p>
          </div>
          <Link className={'btn btn-secondary btn-sm'} href={'/dashboard'} prefetch={false}>
            {'Check status'}
          </Link>
        </div>
        <div className={'chat-layout'} id={'chat-workspace'}>
          <aside className={'chat-list'}>
            <div className={'chat-list-head'}>
              <Input
                type={'search'}
                className={'people-search'}
                id={'chat-search'}
                placeholder={'Search conversations…'}
              />
              <div className={'filter-menu-wrap'} id={'chat-filter-wrap'}>
                <Button
                  type={'button'}
                  className={'chip-btn chip-btn-icon'}
                  id={'chat-filter-btn'}
                  title={'Filter'}
                  aria-expanded={'false'}
                  variant={'unstyled'}
                  size={'unstyled'}
                >
                  <Icon name="tune" className={'app-icon'} aria-hidden={'true'} />
                </Button>
                <div className={'filter-menu people-filter-menu'} id={'chat-filter-menu'} hidden>
                  <Button
                    type={'button'}
                    className={'filter-option active'}
                    data-role={'all'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'All'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-role={'student'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Students'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-role={'parent'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Parents'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="chat-quick-filters" role="group" aria-label="Conversation filters">
              {[
                ['all', 'All'],
                ['unread', 'Unread'],
                ['student', 'Initiated by student'],
                ['me', 'Initiated by you'],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  data-chat-quick-filter={key}
                  aria-pressed={key === 'all'}
                >
                  {label}
                  <span data-chat-filter-count={key}>0</span>
                </button>
              ))}
            </div>
            <div className={'chat-threads gr-scroll'} id={'chat-threads'} />
          </aside>
          <section className={'chat-pane'}>
            <div className={'chat-pane-head'}>
              <Button
                type={'button'}
                className={'chat-peer'}
                id={'open-student'}
                title={'View student details'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                <div className={'avatar'} id={'pane-avatar'}>
                  {'AR'}
                </div>
                <div className={'meta'}>
                  <strong id={'pane-name'}>{'Aarav Reddy'}</strong>
                  <span id={'pane-sub'}>{'Student'}</span>
                </div>
                <Icon
                  name="chevron_right"
                  className={'app-icon chat-peer-chevron'}
                  aria-hidden={'true'}
                />
              </Button>
              <div className={'chat-empty-head'} id={'chat-empty-head'} hidden>
                <strong>{'Chats'}</strong>
                <span>{'No conversation yet'}</span>
              </div>
            </div>
            <div className={'chat-booking-bar'} id={'chat-booking-bar'} hidden />
            <div className={'messages gr-scroll'} id={'pane-messages'} />
            <form
              className={'chat-compose'}
              id={'chat-compose'}
              action={'#'}
              onSubmit={(event) => event.preventDefault()}
            >
              <Input
                type={'text'}
                id={'compose-input'}
                placeholder={'Write a message…'}
                data-connect-action={''}
                data-locked-placeholder={'Messaging unlocks after verification'}
              />
              <Button
                className={'btn-icon'}
                type={'submit'}
                data-connect-action={''}
                variant={'default'}
                size={'sm'}
              >
                <Icon name="send" className={'app-icon'} aria-hidden={'true'} />
                {'Send'}
              </Button>
            </form>
          </section>
          <aside
            className={'community-profile-panel'}
            id={'person-panel'}
            hidden
            aria-label={'Person profile'}
          >
            <div className={'cpp-toolbar'}>
              <strong className={'cpp-title'} id={'person-panel-title'}>
                {'Profile'}
              </strong>
              <Button
                type={'button'}
                className={'icon-btn'}
                id={'person-panel-close'}
                title={'Close'}
                aria-label={'Close'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
              </Button>
            </div>
            <div className={'cpp-body'} id={'person-panel-body'} />
          </aside>
        </div>
      </div>
    </>
  );
});
