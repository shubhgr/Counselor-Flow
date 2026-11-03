'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollPanel } from '@/components/ui/scroll-panel';
import { DateRangePicker } from '@/components/date-range-picker';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions'}>
          <Input
            id="meets-search"
            type="search"
            placeholder="Search people…"
            aria-label="Search meetings"
            className="meets-search"
          />
          <DateRangePicker
            onApply={(range) =>
              window.dispatchEvent(new CustomEvent('counselor:meets-range', { detail: range }))
            }
          />
          <NativeSelect id="meets-filter" aria-label="Filter meetings by status">
            <NativeSelectOption value="all">All</NativeSelectOption>
            <NativeSelectOption value="ongoing">Ongoing</NativeSelectOption>
            <NativeSelectOption value="upcoming">Upcoming</NativeSelectOption>
            <NativeSelectOption value="completed">Completed</NativeSelectOption>
            <NativeSelectOption value="missed">Missed</NativeSelectOption>
          </NativeSelect>

          <Button
            className={''}
            type={'button'}
            hidden
            id={'join-next'}
            data-connect-action={''}
            data-verified-only={''}
            variant={'default'}
            size={'sm'}
          >
            {'Join next meet'}
          </Button>
        </div>
      </PageActions>
      <div className={'calls-workspace'} id={'calls-workspace'}>
        <div className={'content'}>
          <div className={'pending-banner'} data-unverified-only={''}>
            <div className={'icon'}>
              <Icon name="schedule" className={'app-icon'} aria-hidden={'true'} />
            </div>
            <div>
              <h3>{'Pending admin approval'}</h3>
              <p>{'Meets stay empty until GradRight verifies you. Bookings fill in after that.'}</p>
            </div>
            <Link className={'btn btn-secondary btn-sm'} href={'/dashboard'} prefetch={false}>
              {'Check status'}
            </Link>
          </div>
          <div className="calls-top">
            <Card className={'panel analytics-panel'}>
              <div className={'analytics-stats is-4'}>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Total meets'}</span>
                  <strong id={'stat-total'}>{'0'}</strong>
                  <span className={'hint trend'} id={'stat-total-trend'} />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Completed'}</span>
                  <strong id={'stat-done'}>{'0'}</strong>
                  <span className={'hint trend'} id={'stat-done-trend'} />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Today’s meets'}</span>
                  <strong id={'stat-missed'}>{'0'}</strong>
                  <span className={'hint trend'} id={'stat-missed-trend'} />
                </div>

                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Avg. duration'}</span>
                  <strong id={'stat-avg'}>{'—'}</strong>
                  <span className={'hint trend'} id={'stat-avg-trend'} />
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
                  id="dashboard-hover-visitors"
                  className="dashboard-hover-point visitors"
                  hidden
                />
                <span
                  id="dashboard-hover-connections"
                  className="dashboard-hover-point connections"
                  hidden
                />
                <div
                  id="dashboard-chart-axis"
                  className="dashboard-chart-axis"
                  aria-hidden="true"
                />
                <div
                  className="analytics-tip"
                  id="analytics-tip"
                  style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                  hidden
                />
              </div>
            </Card>
            <div className="calls-live-column">
              <Card className={'panel calls-ongoing-panel p-0'}>
                <ScrollPanel
                  head={
                    <>
                      <h2>{'Ongoing'}</h2>
                      <span className={'pill live'} id={'ongoing-pill'}>
                        {'Live'}
                      </span>
                    </>
                  }
                >
                  <div id={'ongoing-mount'} />
                </ScrollPanel>
              </Card>
              <Card className={'panel calls-col-panel p-0'}>
                <ScrollPanel
                  className={'dash-agenda-track'}
                  head={
                    <>
                      <h2>{'Upcoming'}</h2>
                      <span className={'calls-count'} id={'upcoming-count'} />
                    </>
                  }
                >
                  <div id={'upcoming-mount'} />
                </ScrollPanel>
              </Card>
            </div>
          </div>
          <Card className={'panel calls-col-panel p-0'}>
            <ScrollPanel
              className={'dash-agenda-track'}
              head={
                <>
                  <h2>{'History'}</h2>
                  <span className={'calls-count'} id={'recent-count'} />
                </>
              }
            >
              <div id={'recent-mount'} />
            </ScrollPanel>
          </Card>
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
