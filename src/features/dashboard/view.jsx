'use client';
import { ProfileNextBanner } from '@/components/profile-next-banner';
import { memo, useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { area, curveMonotoneX, line } from 'd3-shape';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollPanel } from '@/components/ui/scroll-panel';
import { SourceBreakdown } from '@/components/source-breakdown';
import { DateRangePicker } from '@/components/date-range-picker';
import { PageActions } from '@/components/page-actions';

const FUNNEL_STAGES = [
  { label: 'Impressions', key: 'impressions', icon: 'visibility' },
  { label: 'Profile open', key: 'profile', icon: 'account_circle' },
  { label: 'Booking started', key: 'booking', icon: 'assignment' },
  { label: 'Session booked', key: 'session', icon: 'event_available' },
];

function FunnelTrend({ activity, label, share, estimated }) {
  const gradient = useId();
  const [activeIndex, setActiveIndex] = useState(null);
  let cumulative = 0;
  const values = activity.map(({ count }) => {
    const previous = Math.round(cumulative * share);
    cumulative += count;
    return Math.round(cumulative * share) - previous;
  });
  const points = values.length === 1 ? [values[0], values[0]] : values;
  const peak = Math.max(1, ...points);
  const x = (_, index) => (index / Math.max(1, points.length - 1)) * 100;
  const y = (value) => 29 - (value / peak) * 26;
  const active = activity[activeIndex];
  const position = values.length === 1 ? 50 : x(null, activeIndex);

  return (
    <div
      className="dashboard-funnel-chart"
      tabIndex={0}
      aria-label={label + ' activity'}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const fraction = (event.clientX - bounds.left) / bounds.width;
        setActiveIndex(
          Math.min(values.length - 1, Math.max(0, Math.round(fraction * (values.length - 1)))),
        );
      }}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex(0)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        setActiveIndex((index) => Math.min(values.length - 1, Math.max(0, (index ?? 0) + step)));
      }}
    >
      <svg
        className="dashboard-funnel-line"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradient} x2="0" y2="1">
            <stop stopColor="var(--funnel-stage-color)" stopOpacity=".25" />
            <stop offset="100%" stopColor="var(--funnel-stage-color)" stopOpacity=".02" />
          </linearGradient>
        </defs>
        <path
          d={area().x(x).y0(32).y1(y).curve(curveMonotoneX)(points)}
          fill={`url(#${gradient})`}
        />
        <path
          className="dashboard-funnel-stroke"
          d={line().x(x).y(y).curve(curveMonotoneX)(points)}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {active && (
        <>
          <span
            className="dashboard-funnel-point"
            style={{ left: `${position}%`, top: `${(y(values[activeIndex]) / 32) * 100}%` }}
            aria-hidden="true"
          />
          <span
            className="dashboard-funnel-tooltip"
            data-align-end={position > 50}
            style={{ left: `${position}%` }}
            role="status"
          >
            <strong>{active.date}</strong>
            <span>
              {estimated ? 'Est. ' : ''}
              {label} · {values[activeIndex].toLocaleString('en-IN')}
            </span>
          </span>
        </>
      )}
    </div>
  );
}

function DashboardFunnel({ counts, trends, activity }) {
  const impressions = counts[0];

  return (
    <section className="dashboard-funnel" aria-label="Booking funnel">
      <ol className="dashboard-funnel-stages" aria-live="polite">
        {FUNNEL_STAGES.map(({ label, key, icon }, index) => {
          const count = counts[index];
          const trend = trends[index];
          const previousCount = counts[index - 1];
          const share = impressions ? count / impressions : 0;
          return (
            <li className="dashboard-funnel-stage" data-stage={key} key={key}>
              <div className="dashboard-funnel-stage-heading">
                <span className="dashboard-funnel-icon" aria-hidden="true">
                  <Icon name={icon} />
                </span>
                <div className="dashboard-funnel-label">
                  <strong>{label}</strong>
                  {previousCount > 0 && (
                    <span>{Math.round((count / previousCount) * 100)}% of previous stage</span>
                  )}
                </div>
              </div>
              {activity.length > 0 && (
                <FunnelTrend
                  activity={activity}
                  label={label}
                  share={share}
                  estimated={index > 0}
                />
              )}
              <div className="dashboard-funnel-values">
                <strong>{count.toLocaleString('en-IN')}</strong>
                {trend && (
                  <span className="dashboard-funnel-trend" data-direction={trend.cls}>
                    {trend.text}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export const View = memo(function View() {
  const [peopleExpanded, setPeopleExpanded] = useState(false);
  const [connectsExpanded, setConnectsExpanded] = useState(false);
  const listAnimations = useRef(new WeakMap());

  function toggleList(event, expanded, setExpanded) {
    const button = event.currentTarget;
    const card = button.closest('[data-slot="card"]');
    const previous = card.getBoundingClientRect();
    listAnimations.current.get(card)?.cancel();
    flushSync(() => setExpanded(!expanded));

    const next = card.getBoundingClientRect();
    const animate = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    button.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: animate ? 'smooth' : 'instant',
    });

    if (animate) {
      const animation = card.animate(
        [
          {
            height: `${previous.height}px`,
            width: `${previous.width}px`,
            translate: `${previous.left - next.left}px ${previous.top - next.top}px`,
          },
          { height: `${next.height}px`, width: `${next.width}px`, translate: '0 0' },
        ],
        { duration: 260, easing: 'ease-out' },
      );
      listAnimations.current.set(card, animation);
    }
  }

  const [showFunnel, setShowFunnel] = useState(true);
  const [funnel, setFunnel] = useState({ counts: [0, 0, 0, 0], trends: [], activity: [] });

  useEffect(() => {
    const update = (event) => setFunnel(event.detail);
    window.addEventListener('counselor:dashboard-funnel', update);
    return () => window.removeEventListener('counselor:dashboard-funnel', update);
  }, []);
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
        <div
          className={'content'}
          data-people-expanded={peopleExpanded}
          data-connects-expanded={connectsExpanded}
        >
          <ProfileNextBanner />
          <div className={'dash-top'}>
            <Card className="panel analytics-panel dashboard-analytics" data-funnel={showFunnel}>
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
                  <span className="label">Avg. time spent</span>
                  <strong id="stat-time-spent">—</strong>
                  <span className="hint">Per profile visit</span>
                  <span className="hint trend" id="stat-time-spent-trend" hidden />
                </div>
                <div className="analytics-stat dashboard-reviews-stat">
                  <div className="dashboard-reviews-header">
                    {showFunnel ? (
                      <h2 className="dashboard-funnel-title">Funnel</h2>
                    ) : (
                      <span className="label">Reviews</span>
                    )}
                    <label className="source-view-toggle">
                      <Switch
                        checked={showFunnel}
                        onCheckedChange={setShowFunnel}
                        aria-label="Show booking funnel"
                      />
                      <span>Funnel</span>
                    </label>
                  </div>
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
              <div className="dashboard-analytics-overview" hidden={showFunnel}>
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
              </div>
              {showFunnel && <DashboardFunnel {...funnel} />}
            </Card>
            <Card className={'panel source-panel p-0'} hidden>
              <SourceBreakdown />
            </Card>
          </div>
          <div className={'grid-2 dash-grid'}>
            <Card className="panel dash-connects-panel dash-student-connects-panel p-0">
              <ScrollPanel
                className={'dash-connect-list'}
                head={
                  <>
                    <h2>Student connects</h2>
                    <Button
                      type="button"
                      variant="unstyled"
                      size="unstyled"
                      className="dash-list-toggle"
                      aria-expanded={connectsExpanded}
                      aria-controls="recent-connects"
                      onClick={(event) => toggleList(event, connectsExpanded, setConnectsExpanded)}
                    >
                      {connectsExpanded && (
                        <Icon name="close" className="size-3" strokeWidth={1.5} />
                      )}
                      {connectsExpanded ? 'View less' : 'View more'}
                    </Button>
                  </>
                }
              >
                <div id={'recent-connects'} />
              </ScrollPanel>
            </Card>
            <Card className={'panel dash-calls-panel p-0'}>
              <ScrollPanel
                className={'dash-agenda-track'}
                head={
                  <>
                    <h2>Upcoming meets</h2>
                    <Link href={'/calls'} prefetch={false}>
                      {'All →'}
                    </Link>
                  </>
                }
              >
                <div id={'today-calls'} />
              </ScrollPanel>
            </Card>
            <div className="dash-people-column">
              <Card
                id="dashboard-first-post"
                className="panel dashboard-first-post"
                data-verified-only=""
                hidden
              >
                <div id="dashboard-first-post-prompt">
                  <h2>Make your first post</h2>
                  <p>Share an admissions tip in Community.</p>
                  <Link
                    className="btn btn-primary btn-sm"
                    href="/community?compose=1"
                    prefetch={false}
                  >
                    Write a post
                  </Link>
                </div>
                <ScrollPanel
                  id="dashboard-recent-posts"
                  hidden
                  head={
                    <>
                      <h2>Recent posts</h2>
                      <Link
                        id="dashboard-view-community"
                        className="dash-list-toggle"
                        href="/community"
                        prefetch={false}
                      >
                        View community
                      </Link>
                    </>
                  }
                >
                  <ul aria-label="Latest Community posts" />
                </ScrollPanel>
              </Card>
              <Card className="panel dash-connects-panel dash-people-panel p-0">
                <ScrollPanel
                  className="dash-connect-list"
                  head={
                    <>
                      <h2>Recent activity</h2>
                      <Button
                        type="button"
                        variant="unstyled"
                        size="unstyled"
                        className="dash-list-toggle"
                        aria-expanded={peopleExpanded}
                        aria-controls="dashboard-people"
                        onClick={(event) => toggleList(event, peopleExpanded, setPeopleExpanded)}
                      >
                        {peopleExpanded && (
                          <Icon name="close" className="size-3" strokeWidth={1.5} />
                        )}
                        {peopleExpanded ? 'View less' : 'View more'}
                      </Button>
                    </>
                  }
                >
                  <div id="dashboard-people" />
                </ScrollPanel>
              </Card>
            </div>
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
