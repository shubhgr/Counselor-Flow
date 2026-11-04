'use client';
import { memo } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PageActions } from '@/components/page-actions';
import { PublicProfileDetails } from '@/components/public-profile-details';
import { CountrySelector } from './country-selector';
import { ProfileStrength } from './profile-strength';
import { StudentProfilePreview } from './student-profile-preview';
import { CommunitySummary } from './community-summary';

function ProfileSectionTitle({ title, description, privateSection = false }) {
  return (
    <div className="profile-identity-heading">
      <h2>{title}</h2>
      {privateSection && <span className="hint-text">Private</span>}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="profile-identity-info"
              aria-label={`About ${title.toLowerCase()}`}
            >
              <Info aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="max-w-64">
            {description}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export const View = memo(function View() {
  const overview = (useSearchParams().get('tab') || 'edit') === 'edit';
  return (
    <>
      <PageActions>
        {overview && (
          <div className="profile-overview-tools">
            <span id="profile-save-status" className="hint-text" role="status" hidden>
              Saved just now
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile?tab=preview">View as student</Link>
            </Button>
          </div>
        )}
      </PageActions>
      <div className={'content gr-scroll'}>
        <div id={'panel-edit'}>
          <div className="profile-overview-body">
            <div className="profile-overview-sections">
              <form id="profile-form" autoComplete="off" className="profile-overview-form">
                <section className="panel overview-section" id="profile-identity">
                  <div className={'panel-head'}>
                    <ProfileSectionTitle
                      title="Identity"
                      description="The name and location shown to students on your counselor profile."
                    />
                    <span id="profile-identity-status" className="pill warn">
                      Needs photo
                    </span>
                  </div>
                  <div className="profile-identity-grid">
                    <div className="profile-hero profile-identity-summary">
                      <div className={'profile-hero-left'}>
                        <div className={'profile-hero-photo'}>
                          <Input
                            type={'file'}
                            id={'photo-input'}
                            accept={'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'}
                            hidden
                          />
                          <Button
                            type={'button'}
                            className={'photo-circle'}
                            id={'photo-zone'}
                            aria-label={'Upload profile photo'}
                            variant={'unstyled'}
                            size={'unstyled'}
                          >
                            <span className={'photo-circle-empty'} id={'photo-empty'}>
                              <Icon name="add_a_photo" className="app-icon" aria-hidden="true" />
                              <span>Add photo</span>
                            </span>
                            <img
                              id={'photo-preview-img'}
                              className={'photo-circle-img'}
                              alt={'Profile photo preview'}
                              hidden
                            />
                          </Button>
                          <div className={'photo-circle-actions'} id={'photo-preview'} hidden>
                            <Button
                              type={'button'}
                              className={''}
                              id={'photo-change'}
                              variant={'ghost'}
                              size={'sm'}
                            >
                              {'Change'}
                            </Button>
                            <Button
                              type={'button'}
                              className={''}
                              id={'photo-remove'}
                              variant={'ghost'}
                              size={'sm'}
                            >
                              {'Remove'}
                            </Button>
                          </div>
                          <span id={'photo-preview-name'} hidden>
                            {'photo.jpg'}
                          </span>
                        </div>
                        <div className={'profile-hero-copy'} hidden>
                          <span id="hero-name" hidden>
                            Priya Sharma
                          </span>
                          <h3>Profile photo</h3>
                          <p>Shown on your public profile.</p>
                          <div className={'missing-list'} id={'missing-list'}>
                            <span className={'pill warn'} data-miss={'photo'}>
                              {'Photo needed'}
                            </span>

                            <span className={'pill ok'} data-miss={'docs'}>
                              {'2 documents'}
                            </span>
                            <span className={'pill ok'} data-miss={'video'} hidden>
                              {'Intro video'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="profile-identity-fields">
                      <div className={'field-row'}>
                        <div className={'field'}>
                          <Label htmlFor={'field-name'}>{'Display name'}</Label>
                          <Input
                            id={'field-name'}
                            name={'name'}
                            type={'text'}
                            defaultValue={'Priya Sharma'}
                          />
                        </div>
                        <div className={'field'}>
                          <Label htmlFor={'field-address'}>{'Public location'}</Label>
                          <Input
                            id={'field-address'}
                            name={'address'}
                            defaultValue={'Bandra West, Mumbai, Maharashtra'}
                          />
                        </div>
                      </div>
                      <PublicProfileDetails editable embedded />
                    </div>
                  </div>
                </section>
                <section className="panel overview-section" id="profile-contact">
                  <div className="panel-head">
                    <ProfileSectionTitle
                      title="Public contact"
                      description="Choose what students can use to reach you. Verify a contact before showing it on your profile."
                    />
                    <span id="public-contact-status" className="pill warn">
                      2 not added
                    </span>
                  </div>

                  <div id="profile-contact-fields" />
                </section>
                <section className="panel overview-section" id="profile-background">
                  <div className={'panel-head'}>
                    <ProfileSectionTitle
                      title="Professional background"
                      description="The experience and expertise students see on your profile."
                    />
                    <span className="pill" id="profile-background-status">
                      Complete
                    </span>
                  </div>

                  <CountrySelector />
                  <div className={'field-row'}>
                    <div className={'field'}>
                      <Label htmlFor={'field-students'}>{'Students served'}</Label>
                      <Input
                        id={'field-students'}
                        name={'students'}
                        type={'number'}
                        defaultValue={'120'}
                      />
                    </div>
                    <div className={'field'}>
                      <Label htmlFor={'field-admits'}>{'Admits secured'}</Label>
                      <Input
                        id={'field-admits'}
                        name={'admits'}
                        type={'number'}
                        defaultValue={'85'}
                      />
                    </div>
                  </div>
                  <div className={'field'}>
                    <Label htmlFor={'field-bio'}>{'Bio'}</Label>
                    <Textarea
                      id={'field-bio'}
                      maxLength={300}
                      name={'bio'}
                      defaultValue={'Helping students map pathways into top universities.'}
                    />
                    <p className="hint-text" id="overview-bio-count">
                      52 / 300
                    </p>
                  </div>
                </section>
                <section className="panel overview-section" id="profile-introduction">
                  <div className={'panel-head'}>
                    <ProfileSectionTitle
                      title="Intro video"
                      description="A short clip students see on your profile. Record here or upload a file."
                    />
                    <span className="pill" id="profile-video-status">
                      Not added
                    </span>
                  </div>

                  <Input
                    type={'file'}
                    id={'video-input'}
                    accept={'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v'}
                    hidden
                  />
                  <div className="profile-video-presentation">
                    <div className="profile-video-slot">
                      <div
                        className="profile-video-placeholder"
                        id="video-placeholder"
                        aria-hidden="true"
                      >
                        <span className="profile-video-placeholder-mark">
                          <Icon name="videocam" className="app-icon" />
                        </span>
                        <span>No intro yet</span>
                      </div>
                      <div className="video-preview" id="video-preview" hidden>
                        <video id="video-preview-el" controls playsInline preload="metadata" />
                      </div>
                    </div>
                    <div className="profile-video-guidance">
                      <p>
                        A 30 to 60 second hello builds trust. Look at the camera and say what you
                        help with.
                      </p>
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
                            <span>{'Camera and mic · up to 2 min'}</span>
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
                            <span>{'MP4, MOV, or WEBM · 50 MB'}</span>
                          </span>
                        </Button>
                      </div>
                      <div className="video-preview-meta" id="video-details" hidden>
                        <strong id={'video-preview-name'}>{'intro.mp4'}</strong>
                        <span id={'video-preview-meta'}>
                          {'Ready · shown on your student profile'}
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
                      <p className="hint-text">Record up to 2 min · MP4, MOV or WEBM, 50 MB</p>
                    </div>
                  </div>
                </section>
                <section className="panel overview-section" id="profile-verification">
                  <div className={'panel-head'}>
                    <ProfileSectionTitle
                      title="Verification documents"
                      description="Private. Only used for account review. Upload an ID, certificate, or agency letter."
                      privateSection
                    />
                    <span className="pill" id="profile-documents-status">
                      2 on file
                    </span>
                  </div>

                  <Input
                    type={'file'}
                    id={'doc-input'}
                    accept={'.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'}
                    multiple
                    hidden
                  />
                  <div id={'doc-list'} />
                  <div
                    className={'media-drop'}
                    id={'doc-zone'}
                    role={'button'}
                    tabIndex={'0'}
                    aria-label={'Upload documents'}
                  >
                    <span className={'media-ico'} aria-hidden={'true'}>
                      <Icon name="upload_file" className={'app-icon'} />
                    </span>
                    <span className={'intro-video-copy'}>
                      <strong>{'Add another document'}</strong>
                      <span>{'PDF, JPG, or PNG · click or drop'}</span>
                    </span>
                  </div>
                </section>
              </form>
            </div>
            <aside className="profile-overview-aside" aria-label="Profile preview and community">
              <ProfileStrength />
              <StudentProfilePreview />
              <CommunitySummary />
            </aside>
          </div>
        </div>
        <div id={'panel-services'} hidden>
          <div className={'services-fee'}>
            <div>
              <div
                className={'label'}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                  fontWeight: '500',
                  marginBottom: '0.25rem',
                }}
              >
                {'Total amount students pay'}
              </div>
              <div className={'amount'} id={'fee-display'}>
                {'₹1,999'}
              </div>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--muted)',
                  marginTop: '0.35rem',
                  maxWidth: '28rem',
                }}
              >
                {'One fee covers access to your services — chat and meets unlock after payment.'}
              </p>
            </div>
            <div className={'field'} style={{ margin: '0', minWidth: '160px' }}>
              <Label htmlFor={'fee'}>{'Edit fee (₹)'}</Label>
              <Input id={'fee'} type={'number'} defaultValue={'1999'} />
            </div>
          </div>
          <Card className={'panel'} style={{ marginBottom: '1rem' }}>
            <div className={'panel-head'}>
              <h2>{'Services you offer'}</h2>
              <Button
                className={''}
                type={'button'}
                id={'toggle-new-service'}
                variant={'secondary'}
                size={'sm'}
              >
                {'+ Add service'}
              </Button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              {
                'Students see these on your profile. Each one is an event type. They pick only one when they book a call.'
              }
            </p>
            <div className={'modal-form'} id={'new-service'}>
              <div className={'field'}>
                <Label htmlFor={'service-name'}>{'Service name'}</Label>
                <Input id={'service-name'} type={'text'} placeholder={'e.g. Essay workshop'} />
              </div>
              <div className={'field'}>
                <Label htmlFor={'service-desc'}>{'Description'}</Label>
                <Textarea
                  id={'service-desc'}
                  placeholder={'What students get from this service'}
                  defaultValue={''}
                />
              </div>
            </div>
            <div className={'service-list'} id={'service-list'} />
          </Card>
        </div>
        <div id={'panel-testimonials'} hidden>
          <Card className={'panel'}>
            <div className={'panel-head'}>
              <h2>{'Testimonials'}</h2>
              <Button
                className={''}
                type={'button'}
                id={'toggle-new-testimonial'}
                variant={'secondary'}
                size={'sm'}
              >
                {'+ Add testimonial'}
              </Button>
            </div>
            <p className={'panel-lead'}>
              {
                'Add a quote or video on behalf of a student, parent, or university contact. Their name, photo, and college or designation show on your public profile.'
              }
            </p>
            <div className={'testi-list'} id={'testi-list'} />
          </Card>
        </div>
        <div id={'panel-preview'} hidden>
          <PublicProfileDetails />
          <div className={'pending-banner'} data-unverified-only={''}>
            <div className={'icon'}>
              <Icon name="visibility" />
            </div>
            <div>
              <h3>{'Preview · not live yet'}</h3>
              <p>
                {
                  'Students won’t see you in browse until admin verifies your account.\n                This tab shows how you’ll look once live.'
                }
              </p>
            </div>
            <Link
              className={'btn btn-secondary btn-sm'}
              href={'/counselor-public?preview=1'}
              prefetch={false}
            >
              {'Open full page'}
            </Link>
          </div>
          <section className={'preview-section'}>
            <div className={'preview-section-head'}>
              <div>
                <div className={'preview-title-row'}>
                  <h2>{'Browse cards'}</h2>
                  <span
                    className={'preview-info'}
                    tabIndex={'0'}
                    aria-label={
                      'Same card on desktop and mobile — tap the person to open their profile, Connect to pay and unlock chat.'
                    }
                  >
                    <Icon name="info" className={'app-icon'} aria-hidden={'true'} />
                    <span className={'preview-info-tip'}>
                      {
                        'Same card on desktop and mobile — tap the person to open their profile, Connect to pay & unlock chat.'
                      }
                    </span>
                  </span>
                </div>
              </div>
              <div className={'preview-live-chip'} data-verified-only={''}>
                {'Live for students · visible in browse & community'}
              </div>
              <div className={'preview-live-chip is-pending'} data-unverified-only={''}>
                {'Not live yet · hidden from student browse'}
              </div>
            </div>
            <div className={'preview-card-compare'}>
              <div className={'preview-device'}>
                <div className={'preview-device-label'}>{'Desktop'}</div>
                <div className={'preview-device-frame'}>
                  <article className={'counselor-card'}>
                    <Link
                      className={'card-profile-link'}
                      href={'/counselor-public'}
                      prefetch={false}
                    >
                      <div
                        className={'avatar lg preview-avatar'}
                        style={{ width: '48px', height: '48px', fontSize: '0.9rem' }}
                      >
                        {'PS'}
                      </div>
                      <div>
                        <h3 className={'preview-name'}>{'Priya Sharma'}</h3>
                        <div className={'meta-line preview-meta-line'}>
                          {'Mumbai · USA · UK · Canada'}
                        </div>
                        <div className={'rating'}>
                          <span data-verified-only={''}>{'★ 4.8 · 126 sessions'}</span>
                          <span data-unverified-only={''}>{'★ — · 0 sessions'}</span>
                        </div>
                      </div>
                    </Link>
                    <p className={'bio preview-bio'}>
                      {'Helping students map pathways into top universities.'}
                    </p>
                    <div className={'preview-card-stats'}>
                      <span>
                        <strong className={'preview-students'}>{'120+'}</strong>
                        {'students'}
                      </span>
                      <span>
                        <strong className={'preview-admits'}>{'85+'}</strong>
                        {'admits'}
                      </span>
                    </div>
                    <div className={'preview-card-services'} data-preview-services={''}>
                      <span className={'pill'}>{'College shortlisting'}</span>
                      <span className={'pill'}>{'SOP & essay review'}</span>
                      <span className={'pill'}>{'Visa readiness'}</span>
                    </div>
                    <div className={'card-foot'}>
                      <span className={'fee'}>{'₹1,999 connect'}</span>
                      <Link
                        className={'btn btn-primary btn-sm'}
                        href={'/counselor-public'}
                        data-verified-only={''}
                        prefetch={false}
                      >
                        {'Connect'}
                      </Link>
                      <span
                        className={'btn btn-secondary btn-sm'}
                        data-unverified-only={''}
                        style={{ opacity: '0.65', pointerEvents: 'none' }}
                      >
                        {'Connect'}
                      </span>
                    </div>
                  </article>
                </div>
              </div>
              <div className={'preview-device'}>
                <div className={'preview-device-label'}>{'Mobile'}</div>
                <div className={'preview-device-frame phone'}>
                  <div className={'preview-fullpage-chrome compact'}>
                    <span className={'chrome-url'}>{'Browse'}</span>
                  </div>
                  <article className={'counselor-card counselor-card-mobile'}>
                    <Link
                      className={'card-profile-link'}
                      href={'/counselor-public'}
                      prefetch={false}
                    >
                      <div className={'avatar preview-avatar'}>{'PS'}</div>
                      <div>
                        <h3 className={'preview-name'}>{'Priya Sharma'}</h3>
                        <div className={'meta-line preview-meta-line'}>
                          {'Mumbai · USA · UK · Canada'}
                        </div>
                        <div className={'rating'}>
                          <span data-verified-only={''}>{'★ 4.8 · 126 sessions'}</span>
                          <span data-unverified-only={''}>{'★ — · 0 sessions'}</span>
                        </div>
                      </div>
                    </Link>
                    <p className={'bio preview-bio'}>
                      {'Helping students map pathways into top universities.'}
                    </p>
                    <div className={'preview-card-stats'}>
                      <span>
                        <strong className={'preview-students'}>{'120+'}</strong>
                        {'students'}
                      </span>
                      <span>
                        <strong className={'preview-admits'}>{'85+'}</strong>
                        {'admits'}
                      </span>
                    </div>
                    <div className={'preview-card-services'} data-preview-services={''}>
                      <span className={'pill'}>{'College shortlisting'}</span>
                      <span className={'pill'}>{'SOP & essay review'}</span>
                      <span className={'pill'}>{'Visa readiness'}</span>
                    </div>
                    <div className={'card-foot'}>
                      <span className={'fee'}>{'₹1,999 connect'}</span>
                      <Link
                        className={'btn btn-primary btn-sm'}
                        href={'/counselor-public'}
                        data-verified-only={''}
                        prefetch={false}
                      >
                        {'Connect'}
                      </Link>
                      <span
                        className={'btn btn-secondary btn-sm'}
                        data-unverified-only={''}
                        style={{ opacity: '0.65', pointerEvents: 'none' }}
                      >
                        {'Connect'}
                      </span>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>
          <section className={'preview-section'}>
            <div className={'preview-section-head'}>
              <div>
                <div className={'preview-title-row'}>
                  <h2>{'Full profile page'}</h2>
                  <span
                    className={'preview-info'}
                    tabIndex={'0'}
                    aria-label={
                      'Opened when a student taps your name or Connect — experience, countries, services, and fee.'
                    }
                  >
                    <Icon name="info" className={'app-icon'} aria-hidden={'true'} />
                    <span className={'preview-info-tip'}>
                      {
                        'Opened when a student taps your name or Connect — experience, countries, services, and fee.'
                      }
                    </span>
                  </span>
                </div>
              </div>
              <Link className={'btn btn-ghost btn-sm'} href={'/counselor-public'} prefetch={false}>
                {'Open full view →'}
              </Link>
            </div>
            <div className={'preview-fullpage-compare'}>
              <div className={'preview-device'}>
                <div className={'preview-device-label'}>{'Desktop'}</div>
                <div className={'preview-fullpage-frame'}>
                  <div className={'preview-fullpage-chrome'}>
                    <span className={'chrome-dot'} />
                    <span className={'chrome-dot'} />
                    <span className={'chrome-dot'} />
                    <span className={'chrome-url'}>{'gradright.com/counselors/priya-sharma'}</span>
                  </div>
                  <div className={'public-layout preview-fullpage-body'}>
                    <div>
                      <div className={'public-hero'}>
                        <Link
                          className={'avatar lg preview-avatar'}
                          href={'/counselor-public'}
                          id={'preview-hero-avatar'}
                          style={{ display: 'grid' }}
                          prefetch={false}
                        >
                          {'PS'}
                        </Link>
                        <div>
                          <h1 style={{ fontSize: '1.25rem' }}>
                            <Link
                              className={'preview-name preview-name-link'}
                              href={'/counselor-public'}
                              id={'preview-hero-name'}
                              prefetch={false}
                            >
                              {'Priya Sharma'}
                            </Link>
                          </h1>
                          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                            {'Mumbai · Higher-education counselor'}
                          </p>
                          <div className={'preview-stat-row'}>
                            <div>
                              <strong data-verified-only={''}>{'4.8'}</strong>
                              <strong data-unverified-only={''}>{'—'}</strong>
                              <span>{'Rating'}</span>
                            </div>
                            <div>
                              <strong data-verified-only={''}>{'126'}</strong>
                              <strong data-unverified-only={''}>{'0'}</strong>
                              <span>{'Sessions'}</span>
                            </div>
                            <div>
                              <strong className={'preview-students'}>{'120+'}</strong>
                              <span>{'Students'}</span>
                            </div>
                            <div>
                              <strong className={'preview-admits'}>{'85+'}</strong>
                              <span>{'Admits'}</span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.35rem',
                              margin: '0.75rem 0 0',
                            }}
                          >
                            <span className={'pill'}>{'USA'}</span>
                            <span className={'pill'}>{'UK'}</span>
                            <span className={'pill'}>{'Canada'}</span>
                          </div>
                          <p
                            style={{
                              fontSize: '0.88rem',
                              maxWidth: '34rem',
                              lineHeight: '1.5',
                              color: 'var(--muted)',
                              marginTop: '0.75rem',
                            }}
                            className={'preview-hero-bio'}
                            id={'preview-hero-bio'}
                          >
                            {'Helping students map pathways into top universities.'}
                          </p>
                          <div className={'intro-video-embed preview-intro-video'} hidden>
                            <p className={'intro-video-label'}>{'Intro video'}</p>
                            <video
                              className={'preview-intro-video-el'}
                              controls
                              playsInline
                              preload={'metadata'}
                            />
                          </div>
                        </div>
                      </div>
                      <Card className={'panel'} style={{ marginTop: '1rem' }}>
                        <div className={'panel-head'}>
                          <h2>{'What students connect for'}</h2>
                        </div>
                        <div className={'list-item'}>
                          <div className={'meta'}>
                            <strong>{'College shortlisting'}</strong>
                            <span>{'Reach / match / safety lists'}</span>
                          </div>
                        </div>
                        <div className={'list-item'}>
                          <div className={'meta'}>
                            <strong>{'SOP & essay review'}</strong>
                            <span>{'Structure, voice, program fit'}</span>
                          </div>
                        </div>
                        <div className={'list-item'}>
                          <div className={'meta'}>
                            <strong>{'Visa readiness'}</strong>
                            <span>{'Docs & interview practice'}</span>
                          </div>
                        </div>
                      </Card>
                      <Card className={'panel'} style={{ marginTop: '1rem' }}>
                        <div className={'panel-head'}>
                          <h2>{'Testimonials'}</h2>
                        </div>
                        <div
                          className={'public-testi-list is-in-frame'}
                          id={'preview-full-testi'}
                        />
                      </Card>
                      <Card className={'panel'} style={{ marginTop: '1rem' }}>
                        <div className={'panel-head'}>
                          <h2>{'Reviews from GradRight students'}</h2>
                        </div>
                        <div className={'preview-reviews'}>
                          <div className={'review'}>
                            <div className={'stars'}>{'★★★★★'}</div>
                            <strong>{'Aarav Reddy'}</strong>
                            <p>
                              {
                                'Clear shortlist logic for USA CS. Explained reach vs match so my parents got it too.'
                              }
                            </p>
                          </div>
                          <div className={'review'}>
                            <div className={'stars'}>{'★★★★★'}</div>
                            <strong>{'Sana Iqbal'}</strong>
                            <p>
                              {
                                'SOP feedback was precise — finally sounded specific without sounding generic.'
                              }
                            </p>
                          </div>
                          <div className={'review'}>
                            <div className={'stars'}>{'★★★★☆'}</div>
                            <strong>{'Meera Kapoor'}</strong>
                            <p>{'Fee and intake timing were explained without the jargon.'}</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                    <aside className={'sticky-book'}>
                      <div
                        style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '500' }}
                      >
                        {'Connect fee'}
                      </div>
                      <div className={'price'} data-connect-fee={''}>
                        {'₹1,999'}
                      </div>
                      <p
                        style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}
                      >
                        {'Pay once to unlock chat & booking.'}
                      </p>
                      <Link
                        className={'btn btn-primary'}
                        href={'/counselor-public'}
                        data-verified-only={''}
                        prefetch={false}
                      >
                        {'Connect'}
                      </Link>
                      <Button
                        className={''}
                        type={'button'}
                        data-unverified-only={''}
                        disabled
                        style={{ opacity: '0.65', cursor: 'not-allowed', width: '100%' }}
                        variant={'default'}
                        size={'default'}
                      >
                        {'Connect'}
                      </Button>
                      <p
                        className={'hint-text'}
                        style={{ marginTop: '0.75rem', textAlign: 'center' }}
                        data-verified-only={''}
                      >
                        {'Next open · Tue 10:00 AM IST'}
                      </p>
                      <p
                        className={'hint-text'}
                        style={{ marginTop: '0.75rem', textAlign: 'center' }}
                        data-unverified-only={''}
                      >
                        {'Available after verification'}
                      </p>
                    </aside>
                  </div>
                </div>
              </div>
              <div className={'preview-device'}>
                <div className={'preview-device-label'}>{'Mobile'}</div>
                <div className={'preview-fullpage-frame phone-page'}>
                  <div className={'preview-fullpage-chrome compact'}>
                    <span className={'chrome-url'}>{'gradright.com/…/priya'}</span>
                  </div>
                  <div className={'preview-mobile-profile'}>
                    <Link
                      className={'avatar lg preview-avatar'}
                      href={'/counselor-public'}
                      style={{ display: 'grid' }}
                      prefetch={false}
                    >
                      {'PS'}
                    </Link>
                    <h2
                      className={'preview-name'}
                      style={{ fontSize: '1.1rem', margin: '0.65rem 0 0.15rem' }}
                    >
                      {'Priya Sharma'}
                    </h2>
                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '0' }}>
                      {'Mumbai · Higher-ed counselor'}
                    </p>
                    <div className={'preview-stat-row compact'}>
                      <div>
                        <strong data-verified-only={''}>{'4.8'}</strong>
                        <strong data-unverified-only={''}>{'—'}</strong>
                        <span>{'Rating'}</span>
                      </div>
                      <div>
                        <strong data-verified-only={''}>{'126'}</strong>
                        <strong data-unverified-only={''}>{'0'}</strong>
                        <span>{'Sessions'}</span>
                      </div>
                      <div>
                        <strong className={'preview-students'}>{'120+'}</strong>
                        <span>{'Students'}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.3rem',
                        justifyContent: 'center',
                        margin: '0.65rem 0',
                      }}
                    >
                      <span className={'pill'}>{'USA'}</span>
                      <span className={'pill'}>{'UK'}</span>
                      <span className={'pill'}>{'Canada'}</span>
                    </div>
                    <p
                      className={'preview-bio'}
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--muted)',
                        lineHeight: '1.45',
                        margin: '0 0 0.85rem',
                      }}
                    >
                      {'Helping students map pathways into top universities.'}
                    </p>
                    <div className={'intro-video-embed preview-intro-video'} hidden>
                      <p className={'intro-video-label'}>{'Intro video'}</p>
                      <video
                        className={'preview-intro-video-el'}
                        controls
                        playsInline
                        preload={'metadata'}
                      />
                    </div>
                    <div className={'preview-mobile-fee'}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {'Connect fee'}
                        </div>
                        <strong style={{ fontSize: '1.05rem' }} data-connect-fee={''}>
                          {'₹1,999'}
                        </strong>
                      </div>
                      <Link
                        className={'btn btn-primary btn-sm'}
                        href={'/counselor-public'}
                        data-verified-only={''}
                        prefetch={false}
                      >
                        {'Connect'}
                      </Link>
                      <span
                        className={'btn btn-secondary btn-sm'}
                        data-unverified-only={''}
                        style={{ opacity: '0.65' }}
                      >
                        {'Connect'}
                      </span>
                    </div>
                    <div className={'preview-mobile-services'}>
                      <p>{'College shortlisting'}</p>
                      <p>{'SOP & essay review'}</p>
                      <p>{'Visa readiness'}</p>
                    </div>
                    <div className={'preview-mobile-block'}>
                      <h3>{'Testimonials'}</h3>
                      <div
                        className={'public-testi-list is-in-frame'}
                        id={'preview-mobile-testi'}
                      />
                    </div>
                    <div className={'preview-mobile-block'}>
                      <h3>{'Reviews'}</h3>
                      <div className={'preview-reviews is-compact'}>
                        <div className={'review'}>
                          <div className={'stars'}>{'★★★★★'}</div>
                          <strong>{'Aarav Reddy'}</strong>
                          <p>{'Clear shortlist logic for USA CS.'}</p>
                        </div>
                        <div className={'review'}>
                          <div className={'stars'}>{'★★★★☆'}</div>
                          <strong>{'Sana Iqbal'}</strong>
                          <p>{'SOP feedback was precise and specific.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className={'preview-section'}>
            <div className={'preview-section-head'}>
              <div>
                <div className={'preview-title-row'}>
                  <h2>{'Testimonials'}</h2>
                  <span
                    className={'preview-info'}
                    tabIndex={'0'}
                    aria-label={
                      'Quotes and videos you add for students, parents, or college contacts.'
                    }
                  >
                    <Icon name="info" className={'app-icon'} aria-hidden={'true'} />
                    <span className={'preview-info-tip'}>
                      {'Quotes and videos you add for students, parents, or college contacts.'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className={'preview-testi-grid'} id={'preview-testi-list'} />
            <div className={'preview-reviews-panel'}>
              <h3>{'Reviews from GradRight students'}</h3>
              <div className={'preview-reviews'}>
                <div className={'review'}>
                  <div className={'stars'}>{'★★★★★'}</div>
                  <strong>{'Aarav Reddy'}</strong>
                  <p>
                    {
                      'Clear shortlist logic for USA CS. Explained reach vs match so my parents got it too.'
                    }
                  </p>
                </div>
                <div className={'review'}>
                  <div className={'stars'}>{'★★★★★'}</div>
                  <strong>{'Sana Iqbal'}</strong>
                  <p>
                    {
                      'SOP feedback was precise — finally sounded specific without sounding generic.'
                    }
                  </p>
                </div>
                <div className={'review'}>
                  <div className={'stars'}>{'★★★★☆'}</div>
                  <strong>{'Meera Kapoor'}</strong>
                  <p>{'Fee and intake timing were explained without the jargon.'}</p>
                </div>
              </div>
            </div>
          </section>
          <section className={'preview-section'}>
            <div className={'preview-section-head'}>
              <div>
                <div className={'preview-title-row'}>
                  <h2>{'Community'}</h2>
                  <span className={'preview-info'} tabIndex={'0'}>
                    <Icon name="info" className={'app-icon'} aria-hidden={'true'} />
                    <span className={'preview-info-tip'}>
                      {'Same post and profile panel students and counselors see in Community.'}
                    </span>
                  </span>
                </div>
              </div>
              <Link className={'btn btn-ghost btn-sm'} href={'/community'} prefetch={false}>
                {'Open community →'}
              </Link>
            </div>
            <div className={'preview-community-grid'}>
              <div>
                <div className={'preview-device-label'}>{'Post in feed'}</div>
                <article className={'c-post'}>
                  <div className={'c-post-meta'}>
                    <Link
                      className={'avatar preview-avatar'}
                      href={'/community'}
                      style={{ display: 'grid' }}
                      prefetch={false}
                    >
                      {'PS'}
                    </Link>
                    <div className={'c-post-who'}>
                      <div className={'c-name-row'}>
                        <Link
                          className={'c-name-btn preview-name'}
                          href={'/community'}
                          prefetch={false}
                        >
                          {'Priya Sharma'}
                        </Link>
                        <span className={'role-badge counselor'}>{'Counselor'}</span>
                      </div>
                      <span>{'2h ago · General'}</span>
                    </div>
                    <Button
                      type={'button'}
                      className={'c-follow'}
                      disabled
                      variant={'default'}
                      size={'sm'}
                    >
                      {'Follow'}
                    </Button>
                    <Button
                      type={'button'}
                      className={'icon-btn'}
                      disabled
                      title={'Save'}
                      aria-hidden={'true'}
                      variant={'unstyled'}
                      size={'unstyled'}
                    >
                      <Icon name="bookmark_border" className={'app-icon'} />
                    </Button>
                  </div>
                  <p className={'c-post-body'}>
                    {
                      'Sharing a short checklist I use for USA CS shortlists this season — reach vs match before parents join the meet.'
                    }
                  </p>
                  <div className={'c-post-actions'} style={{ pointerEvents: 'none' }}>
                    <Button
                      type={'button'}
                      className={'react-btn'}
                      disabled
                      variant={'unstyled'}
                      size={'unstyled'}
                    >
                      <Icon name="thumb_up" className={'app-icon'} />
                      {'12'}
                    </Button>
                    <Button
                      type={'button'}
                      className={'react-btn'}
                      disabled
                      variant={'unstyled'}
                      size={'unstyled'}
                    >
                      <span className={'app-icon'}>{'chat_bubble'}</span>
                      {'3'}
                    </Button>
                  </div>
                </article>
              </div>
              <div>
                <div className={'preview-device-label'}>{'Profile panel'}</div>
                <div className={'c-profile-sheet preview-community-sheet'}>
                  <div className={'avatar lg preview-avatar'}>{'PS'}</div>
                  <h2 className={'preview-name'}>{'Priya Sharma'}</h2>
                  <div className={'c-profile-badge-row'}>
                    <span className={'role-badge counselor'}>{'Counselor'}</span>
                  </div>
                  <p className={'c-profile-role'}>{'You · GradRight counselor'}</p>
                  <p className={'c-profile-bio preview-bio'}>
                    {'Helping students map pathways into top universities.'}
                  </p>
                  <div className={'c-profile-stats cpp-stats'}>
                    <div className={'cpp-stat'}>
                      <strong data-verified-only={''}>{'4'}</strong>
                      <strong data-unverified-only={''}>{'0'}</strong>
                      <span>{'Posts'}</span>
                    </div>
                    <div className={'cpp-stat'}>
                      <strong data-verified-only={''}>{'890'}</strong>
                      <strong data-unverified-only={''}>{'12'}</strong>
                      <span>{'Followers'}</span>
                    </div>
                    <div className={'cpp-stat'}>
                      <strong data-verified-only={''}>{'64'}</strong>
                      <strong data-unverified-only={''}>{'8'}</strong>
                      <span>{'Following'}</span>
                    </div>
                  </div>
                  <Link
                    className={'btn btn-secondary'}
                    href={'/counselor-public'}
                    data-verified-only={''}
                    prefetch={false}
                  >
                    {'View marketplace listing'}
                  </Link>
                  <span
                    className={'btn btn-secondary'}
                    data-unverified-only={''}
                    style={{ opacity: '0.65', pointerEvents: 'none' }}
                  >
                    {'Listing hidden until verified'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div className={'cal-modal testi-modal'} id={'testi-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-testi={''} />
        <div
          className={'cal-modal-card testi-modal-card'}
          role={'dialog'}
          aria-labelledby={'testi-modal-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 id={'testi-modal-title'}>{'Add testimonial'}</h2>
            <Button
              type={'button'}
              className={'icon-btn'}
              data-close-testi={''}
              aria-label={'Close'}
              variant={'unstyled'}
              size={'unstyled'}
            >
              <Icon name="close" className={'app-icon'} aria-hidden={'true'} />
            </Button>
          </div>
          <form className={'testi-form'} id={'new-testimonial'} autoComplete={'off'}>
            <div className={'testi-form-top'}>
              <div className={'testi-photo-field'}>
                <Input
                  type={'file'}
                  id={'testi-photo-input'}
                  accept={'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'}
                  hidden
                />
                <Button
                  type={'button'}
                  className={'photo-circle testi-photo'}
                  id={'testi-photo-zone'}
                  aria-label={'Upload their photo'}
                  variant={'unstyled'}
                  size={'unstyled'}
                >
                  <span className={'photo-circle-empty'} id={'testi-photo-empty'}>
                    <Icon name="add_a_photo" className={'app-icon'} aria-hidden={'true'} />
                    <span>{'Photo'}</span>
                  </span>
                  <img
                    id={'testi-photo-img'}
                    className={'photo-circle-img'}
                    alt={'Person photo'}
                    hidden
                  />
                </Button>
              </div>
              <div className={'testi-form-fields'}>
                <div className={'field'}>
                  <Label htmlFor={'testi-name'}>{'Name'}</Label>
                  <Input id={'testi-name'} type={'text'} placeholder={'e.g. Aarav Reddy'} />
                </div>
                <div className={'field'}>
                  <Label htmlFor={'testi-role'}>{'Designation or college'}</Label>
                  <Input
                    id={'testi-role'}
                    type={'text'}
                    placeholder={'e.g. Student · IIT Bombay'}
                  />
                </div>
              </div>
            </div>
            <div
              className={'auth-tabs testi-kind-tabs'}
              role={'tablist'}
              aria-label={'Testimonial type'}
            >
              <Button
                type={'button'}
                className={'auth-tab active'}
                data-testi-kind={'text'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Quote'}
              </Button>
              <Button
                type={'button'}
                className={'auth-tab'}
                data-testi-kind={'video'}
                variant={'unstyled'}
                size={'unstyled'}
              >
                {'Video'}
              </Button>
            </div>
            <div className={'field'} id={'testi-text-wrap'}>
              <Label htmlFor={'testi-text'}>{'What they said'}</Label>
              <Textarea
                id={'testi-text'}
                placeholder={'Write the testimonial in their words'}
                defaultValue={''}
              />
            </div>
            <div id={'testi-video-wrap'} hidden>
              <div className={'field'}>
                <Label htmlFor={'testi-youtube'}>{'YouTube link'}</Label>
                <Input
                  id={'testi-youtube'}
                  type={'url'}
                  placeholder={'https://www.youtube.com/watch?v=...'}
                />
              </div>
              <div className={'testi-yt'} id={'testi-yt-preview'} hidden>
                <iframe
                  id={'testi-yt-frame'}
                  title={'YouTube preview'}
                  allow={
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                  }
                  allowFullScreen
                />
              </div>
              <div className={'field'}>
                <Label htmlFor={'testi-video-input'}>{'Or upload a file'}</Label>
                <Input
                  id={'testi-video-input'}
                  type={'file'}
                  accept={'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov'}
                  hidden
                />
                <Button
                  type={'button'}
                  className={'upload-zone'}
                  id={'testi-video-zone'}
                  variant={'unstyled'}
                  size={'unstyled'}
                >
                  <strong id={'testi-video-label'}>{'Upload video'}</strong>
                  <span>{'MP4 or WebM · under 8 MB'}</span>
                </Button>
                <p className={'hint-text'} id={'testi-video-hint'} hidden />
                <video
                  id={'testi-video-preview'}
                  className={'testi-video-preview'}
                  controls
                  playsInline
                  hidden
                />
              </div>
            </div>
            <div className={'testi-form-actions'}>
              <Button
                className={''}
                type={'button'}
                id={'testi-cancel'}
                data-close-testi={''}
                variant={'secondary'}
                size={'default'}
              >
                {'Cancel'}
              </Button>
              <Button
                className={''}
                type={'submit'}
                id={'testi-save'}
                variant={'default'}
                size={'default'}
              >
                {'Save testimonial'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <div className={'doc-preview-overlay'} id={'doc-preview'} hidden>
        <div
          className={'doc-preview-sheet'}
          role={'dialog'}
          aria-modal={'true'}
          aria-labelledby={'doc-preview-title'}
        >
          <Button
            type={'button'}
            className={'doc-preview-close'}
            id={'doc-preview-close'}
            aria-label={'Close preview'}
            variant={'ghost'}
            size={'sm'}
          >
            {'✕'}
          </Button>
          <h3 id={'doc-preview-title'}>{'Document'}</h3>
          <p className={'hint-text'} id={'doc-preview-meta'} />
          <div className={'doc-preview-body'} id={'doc-preview-body'} />
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
