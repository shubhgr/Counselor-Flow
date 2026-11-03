'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SourceBreakdown } from '@/components/source-breakdown';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <DateRangePicker
          onApply={(range) =>
            window.dispatchEvent(new CustomEvent('counselor:dashboard-range', { detail: range }))
          }
        />
      </PageActions>
      <div className={'calls-workspace'} id={'dash-workspace'}>
        <div className={'content'}>
          <div className={'pending-banner'} data-unverified-only={''}>
            <div className={'icon'}>
              <Icon name="schedule" className={'app-icon'} aria-hidden={'true'} />
            </div>
            <div>
              <h3>{'Pending admin approval'}</h3>
              <p>
                {
                  'Your listing stays hidden until GradRight verifies you. Stats, meets, and connects stay empty until then.'
                }
              </p>
            </div>
            <Link
              className={'btn btn-secondary btn-sm'}
              href={'/profile?tab=preview'}
              prefetch={false}
            >
              {'Student preview'}
            </Link>
          </div>
          <div className={'dash-top'}>
            <Card className={'panel analytics-panel'}>
              <div className={'analytics-stats is-4'}>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Impressions'}</span>
                  <strong id={'stat-visitors'}>{'0'}</strong>
                  <span className={'hint'} id={'stat-visitors-hint'}>
                    {'0 unique'}
                  </span>
                  <span className={'hint trend'} id={'stat-visitors-trend'} />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Connects'}</span>
                  <strong id={'stat-connects'}>{'0'}</strong>
                  <span className={'hint'} id={'stat-connects-hint'}>
                    {'All paid connections'}
                  </span>
                  <span className={'hint trend'} id={'stat-connects-trend'} />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Earnings'}</span>
                  <strong id={'stat-earnings'}>{'₹0'}</strong>
                  <span className={'hint'} id={'stat-earnings-hint'}>
                    {'Across 0 connections'}
                  </span>
                  <span className={'hint trend'} id={'stat-earnings-trend'} />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Reviews'}</span>
                  <strong className={'analytics-rating'}>
                    <span id={'stat-reviews'}>{'—'}</span>
                    <Icon name="star" className={'app-icon analytics-star'} aria-hidden={'true'} />
                  </strong>
                  <span className={'hint'} id={'stat-reviews-hint'}>
                    {'0 reviews received'}
                  </span>
                  <span className={'hint trend'} id={'stat-reviews-trend'} />
                </div>
              </div>
              <div className={'analytics-chart-wrap'}>
                <svg
                  className={'analytics-chart'}
                  id={'analytics-chart'}
                  viewBox={'0 0 760 180'}
                  preserveAspectRatio={'none'}
                />
                <span
                  className="dashboard-hover-point visitors"
                  id="dashboard-hover-visitors"
                  hidden
                />
                <span
                  className="dashboard-hover-point connections"
                  id="dashboard-hover-connections"
                  hidden
                />
                <div
                  id="dashboard-chart-axis"
                  className="dashboard-chart-axis"
                  aria-hidden="true"
                />
                <div
                  className={'analytics-tip'}
                  id={'analytics-tip'}
                  style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                  hidden
                />
              </div>
            </Card>
            <Card className={'panel source-panel'}>
              <SourceBreakdown />
            </Card>
          </div>
          <div className={'grid-2 dash-grid'}>
            <Card className={'panel dash-calls-panel'}>
              <div className={'panel-head'}>
                <h2 id={'dash-calls-title'}>{'Today’s meets'}</h2>
                <Link href={'/calls'} prefetch={false}>
                  {'All →'}
                </Link>
              </div>
              <div className={'dash-agenda-track gr-scroll'} id={'today-calls'} />
            </Card>
            <Card className={'panel dash-connects-panel'}>
              <div className={'panel-head'}>
                <h2 id={'dash-connects-title'}>{'Today’s connects'}</h2>
                <Link href={'/students?view=connected'} prefetch={false}>
                  {'All →'}
                </Link>
              </div>
              <div className={'dash-connect-list gr-scroll'} id={'recent-connects'} />
            </Card>
          </div>
        </div>
        <aside
          className={'community-profile-panel'}
          id={'call-panel'}
          hidden
          aria-label={'Meet profile'}
        >
          <div className={'cpp-toolbar'}>
            <strong className={'cpp-title'} id={'call-panel-title'}>
              {'Meet'}
            </strong>
            <Button
              type={'button'}
              className={'icon-btn'}
              id={'call-panel-close'}
              title={'Close'}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <div className={'cpp-body'} id={'call-panel-body'} />
        </aside>
      </div>
      <div className={'cal-modal'} id={'cancel-call-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-cancel={''} />
        <div
          className={'cal-modal-card'}
          role={'dialog'}
          aria-labelledby={'cancel-call-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 id={'cancel-call-title'}>{'Cancel meet'}</h2>
            <Button
              type={'button'}
              className={'icon-btn'}
              data-close-cancel={''}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <p className={'cal-modal-label'}>
            {'Cancel this meet with'}
            <strong id={'cancel-call-name'}>{'this person'}</strong>
            {'? They’ll be notified. This can’t be undone.'}
          </p>
          <div className={'dash-cancel-actions'}>
            <Button
              type={'button'}
              className={''}
              data-close-cancel={''}
              variant={'secondary'}
              size={'default'}
            >
              {'Keep meet'}
            </Button>
            <Button
              type={'button'}
              className={'dash-cancel-confirm'}
              id={'confirm-cancel-call'}
              variant={'default'}
              size={'default'}
            >
              {'Cancel meet'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});
