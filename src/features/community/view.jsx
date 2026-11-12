'use client';
import { ProfileNextBanner } from '@/components/profile-next-banner';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions people-top-actions'}>
          <span
            className={'pill warn community-read-only'}
            data-unverified-only={''}
            title={'Posting and reacting unlock after verification'}
          >
            {'Read-only'}
          </span>
          <Input
            type={'search'}
            className={'people-search'}
            id={'community-search'}
            placeholder={'Search posts…'}
          />
          <div className={'filter-menu-wrap'} id={'filter-wrap'}>
            <Button
              type={'button'}
              className={'chip-btn'}
              id={'filter-btn'}
              aria-expanded={'false'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <span id={'filter-label'}>{'Recent'}</span>
              <Icon name="expand_more" className={'app-icon'} aria-hidden={'true'} />
            </Button>
            <div className={'filter-menu people-filter-menu'} id={'filter-menu'} hidden>
              <Button
                type={'button'}
                className={'filter-option active'}
                data-filter={'recent'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Recent'}
              </Button>
              <Button
                type={'button'}
                className={'filter-option'}
                data-filter={'top'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Top'}
              </Button>
              <Button
                type={'button'}
                className={'filter-option'}
                data-filter={'following'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Following'}
              </Button>
            </div>
          </div>
          <Button
            className={''}
            type={'button'}
            id={'open-composer'}
            data-verified-only={''}
            data-connect-action={''}
            variant={'default'}
            size={'sm'}
          >
            {'New post'}
          </Button>
          <Button
            type={'button'}
            className={'community-me'}
            id={'open-my-profile'}
            title={'Your profile'}
            aria-label={'Your profile'}
            variant={'unstyled'}
            size={'unstyled'}
          >
            <span className={'avatar sm'} id={'me-avatar'}>
              {'PS'}
            </span>
          </Button>
        </div>
      </PageActions>
      <div className={'community-workspace'} id={'community-workspace'}>
        <div className={'community-primary gr-scroll'}>
          <div className={'content'}>
            <ProfileNextBanner />
            <Card className={'community-compose-panel panel'} id={'composer'} hidden>
              <Textarea
                id={'compose-text'}
                rows={'3'}
                placeholder={'Write your message…'}
                maxLength={'2000'}
                defaultValue={''}
              />
              <div className={'community-compose-actions'}>
                <Button
                  className={''}
                  type={'button'}
                  id={'cancel-composer'}
                  variant={'ghost'}
                  size={'sm'}
                >
                  {'Cancel'}
                </Button>
                <Button
                  className={''}
                  type={'button'}
                  id={'submit-post'}
                  data-connect-action={''}
                  variant={'default'}
                  size={'sm'}
                >
                  {'Post'}
                </Button>
              </div>
            </Card>
            <div className={'community-feed'} id={'community-feed'} />
            <p className={'community-empty'} id={'community-empty'} hidden>
              {'No posts match this filter.'}
            </p>
          </div>
        </div>
        <aside
          className={'community-rail gr-scroll'}
          id={'community-rail'}
          aria-label={'Community sidebar'}
        >
          <Card className={'panel community-rail-panel'}>
            <div className={'panel-head'}>
              <h2>{'For you'}</h2>
            </div>
            <div className={'community-foryou'} id={'community-foryou'} />
          </Card>
          <Card className={'panel community-rail-panel'}>
            <div className={'panel-head'}>
              <h2>{'Trending topics'}</h2>
            </div>
            <div className={'community-trending'} id={'community-trending'} />
            <p className={'community-rail-note'}>
              {'Topics students are asking about in Community right now.'}
            </p>
          </Card>
        </aside>
        <aside
          className={'community-profile-panel'}
          id={'profile-panel'}
          hidden
          aria-label={'Profile'}
        >
          <div className={'cpp-toolbar'}>
            <Button
              type={'button'}
              className={'btn-back btn-back-icon'}
              id={'profile-back'}
              hidden
              aria-label={'Back'}
              variant={'ghost'}
              size={'sm'}
            >
              <Icon name="arrow_back" className={'app-icon'} aria-hidden={'true'} />
            </Button>
            <strong className={'cpp-title'} id={'profile-panel-title'}>
              {'Profile'}
            </strong>
            <Button
              type={'button'}
              className={'icon-btn'}
              id={'profile-panel-close'}
              title={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <div className={'cpp-body'} id={'profile-panel-body'} />
        </aside>
      </div>
    </>
  );
});
