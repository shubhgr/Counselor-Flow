'use client';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions people-top-actions'}>
          <DateRangePicker
            onApply={(range) =>
              window.dispatchEvent(
                new CustomEvent('counselor:transactions-range', { detail: range }),
              )
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
                'Earnings and payouts stay empty until GradRight verifies you. Connect fees land here after that.'
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
        <div className={'dash-top txn-top'}>
          <Card className={'panel analytics-panel'}>
            <div className={'analytics-stats is-3'}>
              <div className={'analytics-stat'}>
                <span className={'label'}>{'Total earnings'}</span>
                <strong id={'stat-earned'}>{'₹0'}</strong>
                <span className={'hint'} id={'stat-earned-hint'}>
                  {'From 0 successful connects'}
                </span>
              </div>
              <div className={'analytics-stat'}>
                <span className={'label'}>{'Total withdrawn'}</span>
                <strong id={'stat-withdrawn'}>{'₹0'}</strong>
                <span className={'hint'} id={'stat-withdrawn-hint'}>
                  {'0 payouts to bank'}
                </span>
              </div>
              <div className={'analytics-stat available-earnings'}>
                <span className={'label'}>{'Available earnings'}</span>
                <strong id={'stat-available'}>{'₹0'}</strong>
                <span className={'hint'} id={'stat-available-hint'}>
                  {'Left to withdraw'}
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
              <div
                className="analytics-tip"
                id="analytics-tip"
                style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                hidden
              />
            </div>
          </Card>
          <Card className={'panel source-panel bank-panel'}>
            <div className={'panel-head'}>
              <h2>{'Banks'}</h2>
              <div className={'bank-head-actions'}>
                <Button
                  type={'button'}
                  className={''}
                  id={'add-bank-btn'}
                  variant={'secondary'}
                  size={'sm'}
                >
                  {'Add bank'}
                </Button>
                <Button
                  type={'button'}
                  className={''}
                  id={'withdraw-btn'}
                  variant={'default'}
                  size={'sm'}
                >
                  {'Withdraw'}
                </Button>
              </div>
            </div>
            <div className={'source-list gr-scroll'} id={'bank-list'} />
          </Card>
        </div>
        <Card className={'panel txn-panel'}>
          <div className={'panel-head txn-head'}>
            <h2>{'All transactions'}</h2>
            <div className="actions txn-table-actions">
              <Input
                type={'search'}
                className={'people-search'}
                id={'txn-search'}
                placeholder={'Search transactions…'}
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
                  <span id={'filter-label'}>{'All'}</span>
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
                    {'All'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-filter={'success'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Success'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-filter={'processing'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Processing'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-filter={'failed'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Failed'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-filter={'refunded'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Refunded'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'filter-option'}
                    data-filter={'withdrawal'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Withdrawal'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className={'txn-table-track gr-scroll'}>
            <Table className={'table txn-table'}>
              <colgroup>
                <col className={'txn-col-date'} />
                <col className={'txn-col-type'} />
                <col className={'txn-col-detail'} />
                <col className={'txn-col-id'} />
                <col className={'txn-col-method'} />
                <col className={'txn-col-amt'} />
                <col className={'txn-col-status'} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>{'Date'}</TableHead>
                  <TableHead>{'Type'}</TableHead>
                  <TableHead>{'Detail'}</TableHead>
                  <TableHead>{'Txn ID'}</TableHead>
                  <TableHead>{'Method'}</TableHead>
                  <TableHead>{'Amount'}</TableHead>
                  <TableHead>{'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody id={'txn-body'} />
            </Table>
            <p className={'people-empty'} id={'txn-empty'} hidden>
              {'No transactions match this filter.'}
            </p>
          </div>
        </Card>
      </div>
      <div className={'cal-modal'} id={'bank-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-bank={''} />
        <div
          className={'cal-modal-card bank-modal-card'}
          role={'dialog'}
          aria-labelledby={'bank-modal-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 id={'bank-modal-title'}>{'Add bank'}</h2>
            <Button
              type={'button'}
              className={'icon-btn'}
              data-close-bank={''}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <div id={'bank-modal-body'} />
          <div className={'bank-modal-actions'} id={'bank-modal-actions'} />
        </div>
      </div>
    </>
  );
});
