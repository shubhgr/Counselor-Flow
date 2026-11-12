'use client';
import { ProfileNextBanner } from '@/components/profile-next-banner';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import { memo } from 'react';
import { Icon } from '@/components/icon';
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
              window.dispatchEvent(new CustomEvent('counselor:students-range', { detail: range }))
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
      <div className={'community-workspace'} id={'people-workspace'}>
        <div className={'community-primary'}>
          <div className={'content'}>
            <ProfileNextBanner />
            <Card className={'panel analytics-panel'}>
              <div className={'analytics-stats is-4'}>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Unique impressions'}</span>
                  <strong id={'stat-unique'}>{'0'}</strong>
                  <span className="hint trend" id="stat-unique-trend" />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Total impressions'}</span>
                  <strong id={'stat-total'}>{'0'}</strong>
                  <span className="hint trend" id="stat-total-trend" />
                </div>
                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Connections'}</span>
                  <strong id={'stat-connections'}>{'0'}</strong>
                  <span className="hint trend" id="stat-connections-trend" />
                </div>

                <div className={'analytics-stat'}>
                  <span className={'label'}>{'Avg. time spent'}</span>
                  <strong id={'stat-avg'}>{'0s'}</strong>
                  <span className="hint trend" id="stat-avg-trend" />
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
                  className="analytics-tip"
                  id="analytics-tip"
                  style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                  hidden
                />
              </div>
            </Card>
            <Card className={'panel people-panel p-0'}>
              <ScrollPanel
                toolbar
                className="people-table-scroll"
                viewportClassName="people-table-track gr-scroll"
                head={
                  <>
                    <h2>All people</h2>
                    <div className="actions people-table-actions">
                      <Input
                        type={'search'}
                        className={'people-search'}
                        id={'people-search'}
                        placeholder={'Search people…'}
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
                            data-view={'all'}
                            variant={'unstyled'}
                            size={'unstyled'}
                          >
                            {'All'}
                          </Button>
                          <Button
                            type={'button'}
                            className={'filter-option'}
                            data-view={'connected'}
                            variant={'unstyled'}
                            size={'unstyled'}
                          >
                            {'Connected'}
                          </Button>
                          <Button
                            type={'button'}
                            className={'filter-option'}
                            data-view={'unique'}
                            variant={'unstyled'}
                            size={'unstyled'}
                          >
                            {'Unique impression'}
                          </Button>
                          <Button
                            type={'button'}
                            className={'filter-option'}
                            data-view={'total'}
                            variant={'unstyled'}
                            size={'unstyled'}
                          >
                            {'Total impression'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                }
              >
                <Table className={'table people-table'}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{'Person'}</TableHead>
                      <TableHead>{'Source'}</TableHead>
                      <TableHead>{'Connected'}</TableHead>
                      <TableHead>{'Last viewed'}</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody id={'people-body'} />
                </Table>
                <p className={'people-empty'} id={'people-empty'} hidden>
                  {'No people match this filter.'}
                </p>
                <p className={'people-fetch'} id={'people-fetch'} hidden>
                  <span className={'people-fetch-spin'} aria-hidden={'true'} />
                  {'Fetching more people…'}
                </p>
                <div id={'people-sentinel'} aria-hidden={'true'} />
              </ScrollPanel>
            </Card>
          </div>
        </div>
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
      <div className={'people-toast'} id={'people-toast'} hidden />
    </>
  );
});
