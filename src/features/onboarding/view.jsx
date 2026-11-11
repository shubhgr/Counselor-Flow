'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AddressPicker } from './address-picker';
import { CountryStats } from './country-stats';

export const View = memo(function View() {
  return (
    <>
      <div className={'onboard-page'}>
        <Button
          className={'onboard-skip'}
          type={'button'}
          id={'skip-btn'}
          hidden
          variant={'unstyled'}
          size={'unstyled'}
        >
          {'Skip'}
        </Button>
        <div className={'onboard-wrap'}>
          <div className={'onboard-card'}>
            <div className={'onboard-progress'} id={'progress'}>
              <div className={'bar done'} data-step={'1'} />
              <div className={'bar'} data-step={'2'} />
              <div className={'bar'} data-step={'3'} />
              <div className={'bar'} data-step={'4'} />
              <div className={'bar'} data-step={'5'} />
            </div>
            <section className={'step'} id={'step-1'}>
              <h1>{'Where you counsel from'}</h1>
              <p className={'lead'}>
                {'Add one or more locations. Type any address, pick a suggestion, or choose it on the map.'}
              </p>
              <AddressPicker />
              <div className={'onboard-actions'}>
                <span />
                <Button
                  className={''}
                  type={'button'}
                  style={{ width: 'auto' }}
                  onClick={(event) => {
                    window.goStep?.(2);
                  }}
                  variant={'default'}
                  size={'default'}
                >
                  {'Continue'}
                </Button>
              </div>
            </section>
            <section className={'step'} id={'step-2'} hidden>
              <h1>{'Introduce yourself'}</h1>
              <p className={'lead'}>
                {'Optional. A short bio and clip help students get to know you before they connect.'}
              </p>
              <div className={'field'}>
                <Label htmlFor={'bio'}>{'Short bio'}</Label>
                <Textarea
                  id={'bio'}
                  placeholder={'How you help students get into colleges and countries…'}
                  defaultValue={''}
                />
              </div>
              <div className={'field'}>
                <Label>{'Intro video'}</Label>
                <Input
                  type={'file'}
                  id={'video-input'}
                  accept={'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'}
                  hidden
                />
                <div className={'intro-video-chooser'} id={'video-zone'}>
                  <Button
                    type={'button'}
                    className={'intro-video-choice'}
                    id={'video-record-btn'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    <span className={'media-ico'} aria-hidden={'true'}>
                      <Icon name="videocam" className={'app-icon'} />
                    </span>
                    <span className={'intro-video-copy'}>
                      <strong>{'Record'}</strong>
                      <span>{'Optional · camera and mic · 2 min'}</span>
                    </span>
                  </Button>
                  <Button
                    type={'button'}
                    className={'intro-video-choice'}
                    id={'video-upload-btn'}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    <span className={'media-ico'} aria-hidden={'true'}>
                      <Icon name="upload" className={'app-icon'} />
                    </span>
                    <span className={'intro-video-copy'}>
                      <strong>{'Upload'}</strong>
                      <span>{'Optional · MP4, MOV, or WEBM'}</span>
                    </span>
                  </Button>
                </div>
                <div className={'video-preview'} id={'video-preview'} hidden>
                  <video id={'video-preview-el'} controls playsInline preload={'metadata'} />
                  <div className={'video-preview-meta'}>
                    <strong id={'video-preview-name'}>{'intro.mp4'}</strong>
                    <span id={'video-preview-meta'}>
                      {'Ready · you can change this later from profile'}
                    </span>
                    <div className={'video-preview-actions'}>
                      <Button
                        type={'button'}
                        className={''}
                        id={'video-record-again'}
                        variant={'ghost'}
                        size={'sm'}
                      >
                        {'Record'}
                      </Button>
                      <Button
                        type={'button'}
                        className={''}
                        id={'video-change'}
                        variant={'ghost'}
                        size={'sm'}
                      >
                        {'Upload'}
                      </Button>
                      <Button
                        type={'button'}
                        className={''}
                        id={'video-remove'}
                        variant={'ghost'}
                        size={'sm'}
                      >
                        {'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className={'onboard-actions'}>
                <Button
                  className={''}
                  type={'button'}
                  onClick={(event) => {
                    window.goStep?.(1);
                  }}
                  variant={'ghost'}
                  size={'default'}
                >
                  {'Back'}
                </Button>
                <Button
                  className={''}
                  type={'button'}
                  style={{ width: 'auto' }}
                  onClick={(event) => {
                    window.goStep?.(3);
                  }}
                  variant={'default'}
                  size={'default'}
                >
                  {'Continue'}
                </Button>
              </div>
            </section>
            <section className={'step'} id={'step-3'} hidden>
              <h1>{'Counseling background'}</h1>
              <p className={'lead'}>
                {
                  'Optional. Add each country you guide students for, with your students served and admits there.'
                }
              </p>
              <CountryStats />
              <div className={'onboard-actions'}>
                <Button
                  className={''}
                  type={'button'}
                  onClick={(event) => {
                    window.goStep?.(2);
                  }}
                  variant={'ghost'}
                  size={'default'}
                >
                  {'Back'}
                </Button>
                <Button
                  className={''}
                  type={'button'}
                  style={{ width: 'auto' }}
                  onClick={(event) => {
                    window.goStep?.(4);
                  }}
                  variant={'default'}
                  size={'default'}
                >
                  {'Continue'}
                </Button>
              </div>
            </section>
            <section className={'step'} id={'step-4'} hidden>
              <h1>{'Verification documents'}</h1>
              <p className={'lead'}>
                {
                  'Optional but recommended. Makes admin approval faster (ID, certificates, agency letter, etc.).'
                }
              </p>
              <Input
                type={'file'}
                id={'doc-input'}
                accept={'.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'}
                multiple
                hidden
              />
              <div
                className={'upload-zone'}
                id={'upload-zone'}
                role={'button'}
                tabIndex={'0'}
                aria-label={'Upload documents'}
              >
                <strong>{'Upload documents'}</strong>
                <span>{'PDF, JPG, PNG · up to 10 MB each · click or drop files here'}</span>
              </div>
              <div id={'doc-list'} />
              <div className={'onboard-actions'}>
                <Button
                  className={''}
                  type={'button'}
                  onClick={(event) => {
                    window.goStep?.(3);
                  }}
                  variant={'ghost'}
                  size={'default'}
                >
                  {'Back'}
                </Button>
                <Button
                  className={''}
                  type={'button'}
                  style={{ width: 'auto' }}
                  onClick={(event) => {
                    window.goStep?.(5);
                  }}
                  variant={'default'}
                  size={'default'}
                >
                  {'Continue'}
                </Button>
              </div>
            </section>
            <section className={'step'} id={'step-5'} hidden>
              <h1>{'Submit for admin approval'}</h1>
              <p className={'lead'}>
                {
                  'You’ll land in your dashboard next. Earnings and transactions stay at zero until you’re verified. You can still see leads, setup, and calendar.'
                }
              </p>
              <Card className={'panel'} style={{ marginBottom: '1rem' }}>
                <div className={'list-item'}>
                  <div className={'avatar'} id={'review-avatar'}>
                    {'PS'}
                  </div>
                  <div className={'meta'}>
                    <strong id={'review-name'}>{'Priya Sharma'}</strong>
                    <span id={'review-meta'}>{'+91 12345 67890 · email verified'}</span>
                  </div>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'Background'}</strong>
                    <span id={'review-background'}>
                      {'Countries with students served and admits (if filled)'}
                    </span>
                  </div>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'Intro video'}</strong>
                    <span id={'review-video'}>
                      {'Optional. Add a short clip so students know you.'}
                    </span>
                  </div>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'Documents'}</strong>
                    <span id={'review-docs'}>
                      {'Upload if you have them. It speeds up verification.'}
                    </span>
                  </div>
                </div>
              </Card>
              <div className={'onboard-actions'}>
                <Button
                  className={''}
                  type={'button'}
                  onClick={(event) => {
                    window.goStep?.(4);
                  }}
                  variant={'ghost'}
                  size={'default'}
                >
                  {'Back'}
                </Button>
                <Link
                  className={'btn btn-primary'}
                  href={'/dashboard'}
                  id={'submit-dashboard'}
                  style={{ width: 'auto' }}
                  prefetch={false}
                >
                  {'Submit & open dashboard'}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
});
