'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollPanel } from '@/components/ui/scroll-panel';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions people-top-actions'}>
          <DateRangePicker
            onApply={(range) =>
              window.dispatchEvent(new CustomEvent('counselor:reviews-range', { detail: range }))
            }
          />
          <div hidden aria-hidden="true" className="legacy-range-adapter">
            <div className={'range-pair'} id={'range-wrap'}>
              <div className={'range-wrap'}>
                <Button
                  type={'button'}
                  className={'chip-btn'}
                  id={'preset-btn'}
                  aria-expanded={'false'}
                  variant={'unstyled'}
                  size={'unstyled'}
                >
                  <span id={'preset-label'}>{'Last 30 days'}</span>
                  <Icon name="expand_more" className={'app-icon'} aria-hidden={'true'} />
                </Button>
                <div className={'range-menu'} id={'preset-menu'} hidden>
                  <Button
                    type={'button'}
                    className={'range-preset'}
                    data-range={'today'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Today'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'range-preset'}
                    data-range={'yesterday'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Yesterday'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'range-preset'}
                    data-range={'7'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Last 7 days'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'range-preset active'}
                    data-range={'30'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Last 30 days'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'range-preset'}
                    data-range={'all'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'All time'}
                  </Button>
                </div>
              </div>
              <div className={'dates-chip'} id={'dates-chip'}>
                <Button
                  type={'button'}
                  className={'chip-btn dates-half'}
                  id={'start-btn'}
                  aria-expanded={'false'}
                  variant={'unstyled'}
                  size={'unstyled'}
                >
                  <span id={'start-label'}>{'25 Aug'}</span>
                </Button>
                <span className={'dates-sep'}>{'–'}</span>
                <Button
                  type={'button'}
                  className={'chip-btn dates-half'}
                  id={'end-btn'}
                  aria-expanded={'false'}
                  variant={'unstyled'}
                  size={'unstyled'}
                >
                  <span id={'end-label'}>{'23 Sep'}</span>
                </Button>
                <div className={'range-cal-pop'} id={'cal-start-menu'} hidden>
                  <div className={'range-cal'} data-side={'start'}>
                    <div className={'range-cal-toolbar'}>
                      <Button
                        type={'button'}
                        className={'icon-btn'}
                        data-cal-nav={'-1'}
                        data-side={'start'}
                        aria-label={'Previous month'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        <Icon name="chevron_left" className={'app-icon'} aria-hidden={'true'} />
                      </Button>
                      <strong id={'cal-label-start'}>{'August 2026'}</strong>
                      <Button
                        type={'button'}
                        className={'icon-btn'}
                        data-cal-nav={'1'}
                        data-side={'start'}
                        aria-label={'Next month'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        <Icon name="chevron_right" className={'app-icon'} aria-hidden={'true'} />
                      </Button>
                    </div>
                    <div className={'range-cal-grid'} id={'cal-grid-start'} />
                  </div>
                </div>
                <div className={'range-cal-pop'} id={'cal-end-menu'} hidden>
                  <div className={'range-cal'} data-side={'end'}>
                    <div className={'range-cal-toolbar'}>
                      <Button
                        type={'button'}
                        className={'icon-btn'}
                        data-cal-nav={'-1'}
                        data-side={'end'}
                        aria-label={'Previous month'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        <Icon name="chevron_left" className={'app-icon'} aria-hidden={'true'} />
                      </Button>
                      <strong id={'cal-label-end'}>{'September 2026'}</strong>
                      <Button
                        type={'button'}
                        className={'icon-btn'}
                        data-cal-nav={'1'}
                        data-side={'end'}
                        aria-label={'Next month'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        <Icon name="chevron_right" className={'app-icon'} aria-hidden={'true'} />
                      </Button>
                    </div>
                    <div className={'range-cal-grid'} id={'cal-grid-end'} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageActions>
      <div className={'content'}>
        <div className={'pending-banner'} data-unverified-only={''}>
          <div className={'icon'}>
            <Icon name="schedule" className={'app-icon'} aria-hidden={'true'} />
          </div>
          <div>
            <h3>{'Pending admin approval'}</h3>
            <p>
              {
                'Reviews stay empty until GradRight verifies you. Student feedback lands here after that.'
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
        <div className="reviews-top">
          <Card className={'panel analytics-panel'}>
            <div className={'analytics-stats is-3'}>
              <div className={'analytics-stat'}>
                <span className={'label'}>{'Average rating'}</span>
                <strong className={'analytics-rating'}>
                  <span id={'stat-rating'}>{'—'}</span>
                  <Icon name="star" className={'app-icon analytics-star'} aria-hidden={'true'} />
                </strong>
                <span className={'hint'} id={'stat-rating-hint'}>
                  {'From 0 reviews'}
                </span>
              </div>
              <div className={'analytics-stat'}>
                <span className={'label'}>{'Reviews'}</span>
                <strong id={'stat-count'}>{'0'}</strong>
                <span className={'hint'} id={'stat-count-hint'}>
                  {'In this period'}
                </span>
              </div>
              <div className={'analytics-stat'}>
                <span className={'label'}>{'Would recommend'}</span>
                <strong id={'stat-recommend'}>{'—'}</strong>
                <span className={'hint'} id={'stat-recommend-hint'}>
                  {'Rated 4 stars or higher'}
                </span>
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
              <div id="dashboard-chart-axis" className="dashboard-chart-axis" aria-hidden="true" />
              <div className={'analytics-tip'} id={'analytics-tip'} hidden />
            </div>
          </Card>
        </div>
        <Card className={'panel rev-list-panel p-0'}>
          <ScrollPanel
            className={'rev-list-scroll'}
            toolbar
            head={
              <>
                <h2 id={'rev-list-title'}>{'Student reviews'}</h2>
                <div className="review-list-actions">
                  <Input
                    type={'search'}
                    className={'people-search'}
                    id={'rev-search'}
                    placeholder={'Search reviews…'}
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
                      <span id={'filter-label'}>{'All ratings'}</span>
                      <Icon name="expand_more" className={'app-icon'} aria-hidden={'true'} />
                    </Button>
                    <div className={'filter-menu people-filter-menu'} id={'filter-menu'} hidden>
                      <Button
                        type={'button'}
                        className={'filter-option active'}
                        data-filter={'all'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        {'All ratings'}
                      </Button>
                      <Button
                        type={'button'}
                        className={'filter-option'}
                        data-filter={'5'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        {'5 stars'}
                      </Button>
                      <Button
                        type={'button'}
                        className={'filter-option'}
                        data-filter={'4'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        {'4 stars'}
                      </Button>
                      <Button
                        type={'button'}
                        className={'filter-option'}
                        data-filter={'3'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        {'3 stars'}
                      </Button>
                      <Button
                        type={'button'}
                        className={'filter-option'}
                        data-filter={'2'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        {'2 stars'}
                      </Button>
                      <Button
                        type={'button'}
                        className={'filter-option'}
                        data-filter={'1'}
                        variant={'unstyled'}
                        size={'unstyled'}
                      >
                        {'1 star'}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            }
            footer={
              <p className={'people-empty'} id={'rev-empty'} hidden>
                {'No reviews match this filter.'}
              </p>
            }
          >
            <div className={'rev-list gr-scroll'} id={'rev-list'} />
          </ScrollPanel>
        </Card>
      </div>
    </>
  );
});
