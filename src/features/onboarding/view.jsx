'use client';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

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
            </div>
            <section className={'step'} id={'step-1'}>
              <h1>{'Tell us who you are'}</h1>
              <p className={'lead'}>
                {'Mobile is locked after OTP. Email can be verified later from your profile.'}
              </p>
              <div className={'field'}>
                <Label htmlFor={'name'}>{'Full name'}</Label>
                <Input id={'name'} type={'text'} defaultValue={'Priya Sharma'} />
              </div>
              <div className={'field'}>
                <Label htmlFor={'phone'}>{'Mobile number'}</Label>
                <div className={'input-with-action'}>
                  <Input
                    id={'phone'}
                    className={'input-locked'}
                    type={'tel'}
                    defaultValue={'+91 12345 67890'}
                    readOnly
                  />
                  <span className={'verified-inline'}>{'Verified'}</span>
                </div>
              </div>
              <div className={'field'}>
                <Label htmlFor={'email'}>{'Email'}</Label>
                <div className={'input-with-action'}>
                  <Input id={'email'} type={'email'} defaultValue={'priya.sharma@gmail.com'} />
                  <Button
                    className={'btn-verify-inline'}
                    type={'button'}
                    id={'verify-email-btn'}
                    onClick={(event) => {
                      window.verifyEmail?.();
                    }}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Verify'}
                  </Button>
                </div>
                <p className={'hint-text'} id={'email-hint'}>
                  {'Not verified yet · optional for now'}
                </p>
              </div>
              <div className={'field'}>
                <Label htmlFor={'address'}>{'Address'}</Label>
                <Textarea id={'address'} defaultValue={'Bandra West, Mumbai, Maharashtra'} />
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
              <h1>{'Counseling background'}</h1>
              <p className={'lead'}>
                {
                  'Optional. Skip if you prefer. Helps students and admins understand your track record.'
                }
              </p>
              <div className={'field'}>
                <Label>{'Countries you give guidance for'}</Label>
                <div className={'chip-select'} id={'countries'}>
                  <Button
                    type={'button'}
                    className={'chip selected'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'USA'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip selected'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'UK'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip selected'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Canada'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Germany'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Australia'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Ireland'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Netherlands'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'France'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Singapore'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'New Zealand'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'UAE'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Sweden'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Italy'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Japan'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'India'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'China'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Hong Kong'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Switzerland'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Spain'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Denmark'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'South Korea'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Malaysia'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Qatar'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Poland'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Austria'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Belgium'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Finland'}
                  </Button>
                  <Button
                    type={'button'}
                    className={'chip'}
                    onClick={(event) => event.currentTarget.classList.toggle('selected')}
                    variant={'unstyled'}
                    size={'unstyled'}
                  >
                    {'Norway'}
                  </Button>
                </div>
                <div className={'custom-country'}>
                  <Input
                    id={'custom-country'}
                    type={'text'}
                    placeholder={'Add a custom country…'}
                  />
                  <Button
                    className={''}
                    type={'button'}
                    onClick={(event) => {
                      window.addCountry?.();
                    }}
                    variant={'secondary'}
                    size={'sm'}
                  >
                    {'Add'}
                  </Button>
                </div>
              </div>
              <div className={'field-row'}>
                <div className={'field'}>
                  <Label htmlFor={'students-served'}>{'Students served till now'}</Label>
                  <Input id={'students-served'} type={'number'} placeholder={'e.g. 120'} />
                </div>
                <div className={'field'}>
                  <Label htmlFor={'admits'}>{'Admits across these countries'}</Label>
                  <Input id={'admits'} type={'number'} placeholder={'e.g. 85'} />
                </div>
              </div>
              <div className={'field'}>
                <Label htmlFor={'bio'}>{'Short bio (optional)'}</Label>
                <Textarea
                  id={'bio'}
                  placeholder={'How you help students get into colleges and countries…'}
                  defaultValue={''}
                />
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
                    <span id={'review-meta'}>{'+91 12345 67890 · email pending verify'}</span>
                  </div>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'Background'}</strong>
                    <span id={'review-background'}>
                      {'Countries, students served, and admits (if filled)'}
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
                    window.goStep?.(3);
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
