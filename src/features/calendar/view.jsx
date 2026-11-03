'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { PageActions } from '@/components/page-actions';

export const View = memo(function View() {
  return (
    <>
      <PageActions>
        <div className={'actions'}></div>
      </PageActions>
      <div className={'content gr-scroll'} id={'calendar-root'}>
        <section className={'cal-connect'} id={'cal-connect'}>
          <div className={'cal-connect-card'}>
            <h2>{'Connect Cal.com'}</h2>
            <p>
              {
                'Students book from your live hours. Hours, event types, and calendars stay in this page.'
              }
            </p>
            <p className={'cal-auth-error'} id={'cal-auth-error'} hidden />
            <Button
              type={'button'}
              className={'cal-continue-btn'}
              id={'cal-continue'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              {'Continue with Cal.com'}
            </Button>
          </div>
        </section>
        <div id={'cal-workspace'} hidden>
          <div className={'cal-workspace-bar'}>
            <div className={'cal-connected-chip'} id={'cal-connected-chip'}>
              <span className={'cal-dot'} aria-hidden={'true'} />
              <a
                className={'cal-connected-link'}
                id={'cal-profile-link'}
                href={'https://cal.com/shubhanshu-singh-qb543g'}
                target={'_blank'}
                rel={'noreferrer'}
              >
                {'cal.com/shubhanshu-singh-qb543g'}
              </a>
              <Button
                type={'button'}
                className={'cal-chip-disconnect'}
                id={'cal-disconnect'}
                aria-label={'Disconnect Cal.com'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                <Icon name="link_off" className={'app-icon'} aria-hidden={'true'} />
              </Button>
            </div>
            <div
              className={'auth-tabs cal-inner-tabs'}
              role={'tablist'}
              aria-label={'Calendar tools'}
            >
              <Button
                type={'button'}
                className={'auth-tab active'}
                data-cal-tab={'availability'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Availability'}
              </Button>
              <Button
                type={'button'}
                className={'auth-tab'}
                data-cal-tab={'events'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Event types'}
              </Button>
              <Button
                type={'button'}
                className={'auth-tab'}
                data-cal-tab={'calendars'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Calendars'}
              </Button>
            </div>
          </div>
          <div id={'tab-availability'} className={'cal-page-stack cal-page-stack-hours'}>
            <Card className={'panel sched-card'} id={'panel-schedule'}>
              <div className={'sched-card-head atom-head'}>
                <div className={'atom-title'}>
                  <Input
                    type={'text'}
                    id={'schedule-name'}
                    defaultValue={'Working Hours'}
                    data-track={''}
                    aria-label={'Schedule name'}
                  />
                </div>
              </div>
              <Label className={'sched-day-row sched-tz-row'} htmlFor={'timezone'}>
                <strong>{'Timezone'}</strong>
                <NativeSelect id={'timezone'} data-track={''} defaultValue={'Asia/Kolkata'}>
                  <option value={'Asia/Kolkata'} data-default-selected={''}>
                    {'(GMT+5:30) Chennai, Kolkata, Mumbai, New Delhi'}
                  </option>
                  <option value={'Asia/Dubai'}>{'(GMT+4:00) Dubai'}</option>
                  <option value={'Europe/London'}>{'(GMT+0:00) London'}</option>
                  <option value={'America/New_York'}>{'(GMT-5:00) New York'}</option>
                  <option value={'America/Los_Angeles'}>{'(GMT-8:00) Los Angeles'}</option>
                </NativeSelect>
              </Label>
              <div className={'sched-days gr-scroll'} id={'week-hours'} />
            </Card>
            <aside className={'panel sched-block'}>
              <div className={'sched-card-head'}>
                <h2>{'Date overrides'}</h2>
                <span
                  className={'cal-info'}
                  title={
                    'Pick a date you are available and set hours, or mark the day unavailable. Past overrides are removed automatically.'
                  }
                  aria-label={
                    'Pick a date you are available and set hours, or mark the day unavailable. Past overrides are removed automatically.'
                  }
                >
                  {'i'}
                </span>
              </div>
              <div className={'sched-block-body'}>
                <p className={'hint-text'}>
                  {'Special hours for one day. After that date passes, the override is deleted.'}
                </p>
                <Button
                  type={'button'}
                  className={''}
                  id={'open-block-dates'}
                  variant={'secondary'}
                  size={'default'}
                >
                  {'Add date override'}
                </Button>
                <ul className={'sched-blocked-list'} id={'blocked-dates-list'} />
              </div>
            </aside>
          </div>
          <div id={'tab-events'} className={'cal-events'} hidden>
            <Card className={'panel cal-events-list'}>
              <div className={'sched-card-head'}>
                <h2>{'Event types'}</h2>
                <Link
                  className={'btn btn-secondary btn-sm'}
                  href={'/profile?tab=services'}
                  prefetch={false}
                >
                  {'Services & fee'}
                </Link>
              </div>
              <p className={'hint-text'} id={'event-type-hint'}>
                {'Students pick one of these when they book a call.'}
              </p>
              <ul className={'event-type-list'} id={'event-type-list'} />
            </Card>
            <Card className={'panel cal-event-settings'} id={'event-settings-panel'}>
              <div className={'sched-card-head'}>
                <h2 id={'event-settings-title'}>{'Meet setup'}</h2>
              </div>
              <div className={'cal-event-body'} id={'event-settings-empty'}>
                <p className={'hint-text'}>
                  {
                    'These are your services. Students pick one when they book a call. Duration, notice, buffer, and booking window live here.'
                  }
                </p>
              </div>
              <form className={'cal-event-body'} id={'event-settings-form'} hidden>
                <p className={'hint-text'} id={'ev-from-service'} />
                <div className={'booker-field'}>
                  <span>{'Duration'}</span>
                  <div className={'duration-pills'} id={'ev-durations'}>
                    <Button
                      type={'button'}
                      data-value={'15'}
                      variant={'unstyled'}
                      size={'unstyled'}
                      className={''}
                    >
                      {'15 min'}
                    </Button>
                    <Button
                      type={'button'}
                      data-value={'30'}
                      variant={'unstyled'}
                      size={'unstyled'}
                      className={''}
                    >
                      {'30 min'}
                    </Button>
                    <Button
                      type={'button'}
                      data-value={'45'}
                      variant={'unstyled'}
                      size={'unstyled'}
                      className={''}
                    >
                      {'45 min'}
                    </Button>
                    <Button
                      type={'button'}
                      data-value={'60'}
                      variant={'unstyled'}
                      size={'unstyled'}
                      className={''}
                    >
                      {'60 min'}
                    </Button>
                  </div>
                </div>
                <Label className={'booker-field'}>
                  <span>{'Location'}</span>
                  <NativeSelect id={'ev-location'}>
                    <option value={'gradright-meet'}>{'GradRight Meet'}</option>
                    <option value={'google-meet'}>{'Google Meet'}</option>
                    <option value={'zoom'}>{'Zoom'}</option>
                  </NativeSelect>
                </Label>
                <Label className={'booker-field'}>
                  <span>{'Minimum notice'}</span>
                  <div className={'cal-notice'}>
                    <Input type={'number'} id={'ev-notice-value'} min={'0'} defaultValue={'240'} />
                    <NativeSelect id={'ev-notice-unit'} defaultValue={'Minutes'}>
                      <option data-default-selected={''}>{'Minutes'}</option>
                      <option>{'Hours'}</option>
                      <option>{'Days'}</option>
                    </NativeSelect>
                  </div>
                </Label>
                <Label className={'booker-field'}>
                  <span>{'Buffer after session'}</span>
                  <NativeSelect id={'ev-buffer'} defaultValue={'10'}>
                    <option value={'0'}>{'0 min'}</option>
                    <option value={'10'} data-default-selected={''}>
                      {'10 min'}
                    </option>
                    <option value={'15'}>{'15 min'}</option>
                    <option value={'30'}>{'30 min'}</option>
                  </NativeSelect>
                </Label>
                <Label className={'booker-field'}>
                  <span>{'Booking window'}</span>
                  <NativeSelect id={'ev-booking-period'} defaultValue={'60'}>
                    <option value={'7'}>{'1 Week'}</option>
                    <option value={'14'}>{'2 Weeks'}</option>
                    <option value={'21'}>{'3 Weeks'}</option>
                    <option value={'28'}>{'4 Weeks'}</option>
                    <option value={'60'} data-default-selected={''}>
                      {'2 Months'}
                    </option>
                    <option value={'90'}>{'3 Months'}</option>
                  </NativeSelect>
                </Label>
                <div className={'booker-field'}>
                  <span>{'Reschedule'}</span>
                  <Button
                    type={'button'}
                    className={''}
                    id={'open-reschedule'}
                    variant={'secondary'}
                    size={'sm'}
                  >
                    {'Update policy'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
          <div id={'tab-calendars'} className={'cal-integrations'} hidden>
            <Card className={'panel'}>
              <div className={'sched-card-head'}>
                <h2>{'Connected calendars'}</h2>
              </div>
              <div className={'cal-booker-body'}>
                <p className={'hint-text'}>
                  {
                    'Check these for conflicts so a student can’t book over a busy hour. New meets go to the destination calendar.'
                  }
                </p>
                <div className={'cal-app-list'} id={'calendar-apps'} />
                <Label className={'booker-field'} id={'destination-wrap'}>
                  <span>{'Add booked meets to'}</span>
                  <NativeSelect id={'calendar-destination'} />
                </Label>
              </div>
            </Card>
            <Card className={'panel'}>
              <div className={'sched-card-head'}>
                <h2>{'Conferencing'}</h2>
              </div>
              <div className={'cal-booker-body'}>
                <p className={'hint-text'}>
                  {
                    'Where the meet happens. GradRight Meet is always on; add Zoom or Google Meet if you use them.'
                  }
                </p>
                <div className={'cal-app-list'} id={'conferencing-apps'} />
              </div>
            </Card>
          </div>
        </div>
      </div>
      <div className={'cal-oauth-modal'} id={'cal-oauth-modal'} hidden>
        <div className={'cal-oauth-backdrop'} data-close-oauth={''} />
        <div
          className={'cal-oauth-card'}
          role={'dialog'}
          aria-labelledby={'cal-oauth-title'}
          aria-modal={'true'}
        >
          <Button
            type={'button'}
            className={'cal-oauth-x'}
            data-close-oauth={''}
            aria-label={'Close'}
            variant={'unstyled'}
            size={'unstyled'}
          >
            <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
          </Button>
          <div className={'cal-oauth-logo'} aria-hidden={'true'}>
            <span className={'cal-oauth-mark'}>{'+'}</span>
            <strong>{'Cal'}</strong>
          </div>
          <h2 id={'cal-oauth-title'}>{'GR wants to access your Cal.com account'}</h2>
          <p className={'cal-oauth-signed'}>
            <span className={'cal-oauth-avatar'} aria-hidden={'true'}>
              {'S'}
            </span>
            {'Signed in as Shubhanshu Singh'}
          </p>
          <p className={'cal-oauth-lead'}>{'This will allow GR to'}</p>
          <ul className={'cal-oauth-perms'}>
            <li>{'View personal info and primary email address'}</li>
            <li>{'Create, read, update, and delete booking links'}</li>
            <li>{'Create, read, update, and delete bookings'}</li>
            <li>{'Create, read, update, and delete availability'}</li>
            <li>{'View, connect, and disconnect apps'}</li>
          </ul>
          <div className={'cal-oauth-actions'}>
            <Button
              type={'button'}
              className={'cal-oauth-deny'}
              id={'cal-oauth-deny'}
              onClick={(event) => {
                window.gradRightDenyCal && window.gradRightDenyCal();
              }}
              variant={'unstyled'}
              size={'unstyled'}
            >
              {'Deny'}
            </Button>
            <Button
              type={'button'}
              className={'cal-oauth-allow'}
              id={'cal-oauth-allow'}
              onClick={(event) => {
                window.gradRightAllowCal && window.gradRightAllowCal(event);
              }}
              variant={'unstyled'}
              size={'unstyled'}
            >
              {'Allow'}
            </Button>
          </div>
        </div>
      </div>
      <div className={'cal-modal'} id={'cal-disconnect-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-disconnect={''} />
        <div
          className={'cal-modal-card cal-disconnect-card'}
          role={'dialog'}
          aria-labelledby={'cal-disconnect-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 id={'cal-disconnect-title'}>{'Disconnect Cal.com?'}</h2>
            <Button
              type={'button'}
              className={'icon-btn'}
              data-close-disconnect={''}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <p className={'cal-disconnect-warn'}>
            {
              'Students will not be able to book from your live hours until you connect again. Hours saved on this page stay here.'
            }
          </p>
          <div className={'cal-disconnect-actions'}>
            <Button
              type={'button'}
              className={''}
              data-close-disconnect={''}
              variant={'secondary'}
              size={'default'}
            >
              {'Cancel'}
            </Button>
            <Button
              type={'button'}
              className={''}
              id={'cal-disconnect-confirm'}
              variant={'destructive'}
              size={'default'}
            >
              {'Disconnect'}
            </Button>
          </div>
        </div>
      </div>
      <div className={'cal-modal'} id={'reschedule-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-reschedule={''} />
        <div
          className={'cal-modal-card'}
          role={'dialog'}
          aria-labelledby={'reschedule-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 id={'reschedule-title'}>{'Reschedule policy'}</h2>
            <Button
              type={'button'}
              className={'icon-btn'}
              data-close-reschedule={''}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <div className={'cal-modal-section'}>
            <p className={'cal-modal-label'}>{'How can students initiate a reschedule'}</p>
            <div className={'cal-choice-row'} id={'reschedule-mode'}>
              <Button
                type={'button'}
                className={'cal-choice active'}
                data-value={'request'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Request reschedule'}
              </Button>
              <Button
                type={'button'}
                className={'cal-choice'}
                data-value={'direct'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Directly reschedule'}
              </Button>
            </div>
          </div>
          <div className={'cal-modal-section'}>
            <p className={'cal-modal-label'}>{'Minimum notice before rescheduling a meet'}</p>
            <div className={'cal-choice-row'} id={'reschedule-notice'}>
              <Button
                type={'button'}
                className={'cal-choice'}
                data-value={'30m'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'30 mins'}
              </Button>
              <Button
                type={'button'}
                className={'cal-choice'}
                data-value={'8h'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'8 hrs'}
              </Button>
              <Button
                type={'button'}
                className={'cal-choice active'}
                data-value={'24h'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'24 hrs'}
              </Button>
              <Button
                type={'button'}
                className={'cal-choice'}
                data-value={'anytime'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Anytime'}
              </Button>
            </div>
          </div>
          <Button
            type={'button'}
            className={''}
            id={'update-policy'}
            variant={'default'}
            size={'default'}
          >
            {'Update Policy'}
          </Button>
        </div>
      </div>
      <div className={'cal-modal'} id={'block-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-block={''} />
        <div
          className={'cal-modal-card cal-modal-card-wide'}
          role={'dialog'}
          aria-labelledby={'block-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 id={'block-title'}>{'Date override'}</h2>
            <Button
              type={'button'}
              className={'icon-btn'}
              data-close-block={''}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <div className={'block-cal-toolbar'}>
            <Button
              type={'button'}
              className={'icon-btn'}
              id={'block-prev'}
              aria-label={'Previous month'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="chevron_left" className={'app-icon'} aria-hidden={'true'} />
            </Button>
            <strong id={'block-month-label'}>{'September 2026'}</strong>
            <Button
              type={'button'}
              className={'icon-btn'}
              id={'block-next'}
              aria-label={'Next month'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="chevron_right" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <div className={'block-cal'} id={'block-cal'} />
          <div className={'cal-modal-section'}>
            <p className={'cal-modal-label'}>{'On selected dates'}</p>
            <div className={'cal-choice-row'} id={'override-mode'}>
              <Button
                type={'button'}
                className={'cal-choice active'}
                data-value={'unavailable'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Unavailable'}
              </Button>
              <Button
                type={'button'}
                className={'cal-choice'}
                data-value={'hours'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Set hours'}
              </Button>
            </div>
            <div className={'sched-slot override-hours'} id={'override-hours'} hidden />
          </div>
          <div className={'block-modal-actions'}>
            <Button
              type={'button'}
              className={''}
              data-close-block={''}
              variant={'secondary'}
              size={'sm'}
            >
              {'Cancel'}
            </Button>
            <Button
              type={'button'}
              className={''}
              id={'confirm-block-dates'}
              variant={'default'}
              size={'sm'}
            >
              {'Add override'}
            </Button>
          </div>
        </div>
      </div>
      <div className={'unsaved-bar'} id={'unsaved-bar'} hidden>
        <div className={'unsaved-bar-inner'}>
          <div className={'unsaved-bar-text'}>
            <strong>{'You have unsaved changes'}</strong>
            <span>
              {'Discard restores your last saved profile and cancels edits still in progress.'}
            </span>
          </div>
          <div className={'unsaved-bar-actions'}>
            <Button type={'button'} className={''} id={'discard-btn'} variant={'ghost'} size={'sm'}>
              {'Discard changes'}
            </Button>
            <Button type={'button'} className={''} id={'save-btn'} variant={'default'} size={'sm'}>
              {'Save'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});
