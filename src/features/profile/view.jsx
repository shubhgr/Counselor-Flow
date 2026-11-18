'use client';
import { BADGES } from '@/features/badges/data';
import { memo } from 'react';
import { Glass } from 'glisse';
import { Check, History, Info, Pencil, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProgressiveBlur } from '@/components/ui/progressive-blur';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { PageActions } from '@/components/page-actions';
import { PublicProfileDetails } from '@/components/public-profile-details';
import { PreviewCommunityFeed, PreviewTabs, StudentPreview } from './student-preview';
import { CountrySelector } from './country-selector';
import { ProfileStrength } from './profile-strength';
import { StudentProfilePreview } from './student-profile-preview';
import { CommunitySummary } from './community-summary';

function PreviewProfileHero() {
  return (
    <header className="preview-community-hero">
      <div className="avatar lg preview-avatar" aria-hidden="true">
        PS
      </div>
      <div>
        <h2 className="preview-name">Priya Sharma</h2>
        <p className="preview-headline">Higher-education counselor</p>
        <p className="preview-bio">Helping students map pathways into top universities.</p>
        <p className="preview-cover-rating" data-verified-only="">
          ★ 4.8 · 126 sessions
        </p>
        <p className="preview-cover-rating" data-unverified-only="">
          Rating unavailable
        </p>
      </div>
    </header>
  );
}

function PreviewBadges() {
  return (
    <Card className="panel preview-badges" data-verified-only="">
      <h3>Badges</h3>
      <ul>
        {BADGES.filter(({ locked }) => !locked)
          .slice(0, 4)
          .map(({ icon, label }) => (
            <li key={label}>
              <Icon name={icon} aria-hidden="true" />
              {label}
            </li>
          ))}
      </ul>
    </Card>
  );
}

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
  const activeTab = useSearchParams().get('tab') || 'edit';
  const overview = activeTab === 'edit';
  return (
    <>
      <PageActions>
        {overview && (
          <div className="profile-overview-tools">
            <span id="profile-save-status" className="hint-text" role="status" hidden>
              Saved just now
            </span>
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
                </section>
                <section className="panel overview-section" id="profile-introduction">
                  <div className={'panel-head'}>
                    <ProfileSectionTitle
                      title="About you"
                      description="Introduce yourself to students with a short bio and an intro video."
                    />
                  </div>

                  <div className="field">
                    <Label htmlFor="field-headline">Headline (optional)</Label>
                    <Textarea
                      id="field-headline"
                      name="headline"
                      rows={2}
                      maxLength={220}
                      placeholder="Summarize how you help students"
                      aria-describedby="field-headline-limit"
                    />
                    <p className="hint-text" id="field-headline-limit">
                      Up to 220 characters
                    </p>
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
                  <div className="profile-field-heading">
                    <Label htmlFor="video-input">Intro video</Label>
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
          <div className="services-fee-wrap">
            <Card className="panel services-fee">
              <div className="services-fee-summary">
                <p className="hint-text">Total amount students pay</p>
                <div className="amount services-fee-amount">
                  <span aria-hidden="true">₹</span>
                  <span
                    id="fee-display"
                    role="spinbutton"
                    aria-label="Connect fee in rupees"
                    aria-valuemin="1"
                    aria-valuemax="9900000"
                    tabIndex={-1}
                  >
                    1,999
                  </span>
                  <input id="fee" type="hidden" defaultValue="1999" />
                </div>
                <p className="hint-text services-fee-description" id="connection-fee-help">
                  One fee covers access to your services.
                </p>
              </div>
              <div className="services-fee-input">
                <div className="services-fee-controls">
                  <Button
                    type="button"
                    id="fee-edit-trigger"
                    variant="outline"
                    size="sm"
                    aria-label="Edit fee"
                  >
                    <span id="fee-edit-label">Edit</span>
                    <span id="fee-save-label" hidden>
                      Save
                    </span>
                  </Button>
                  <Button
                    type="button"
                    id="fee-history-trigger"
                    variant="outline"
                    size="sm"
                    aria-label="View price history"
                    aria-controls="fee-history-panel"
                    aria-expanded="false"
                  >
                    Price history
                  </Button>
                </div>
              </div>
            </Card>
            <div className="services-fee-history-backdrop" id="fee-history-panel" hidden>
              <ProgressiveBlur position="right" className="fee-history-progressive-blur" />
              <div className="fee-history-backdrop-tint" aria-hidden="true" />
              <section
                className="services-fee-history"
                role="dialog"
                aria-modal="true"
                aria-labelledby="fee-history-title"
              >
                <header className="services-fee-history-head">
                  <h2 id="fee-history-title">Price history</h2>
                  <Button
                    type="button"
                    id="fee-history-close"
                    className="notification-close-button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close price history"
                  >
                    <Icon name="close" />
                  </Button>
                </header>
                <ul id="fee-history-list" aria-live="polite" />
              </section>
            </div>
          </div>
          <section className="services-offered" aria-labelledby="services-offered-title">
            <div className="panel-head">
              <h2 id="services-offered-title">Services you offer</h2>
              <Button type="button" id="toggle-new-service" variant="secondary" size="sm">
                <Plus size={16} aria-hidden="true" />
                New service
              </Button>
            </div>
            <dialog
              id="service-dialog"
              className="service-dialog profile-decorated-popup"
              aria-labelledby="service-dialog-title"
            >
              <h2 id="service-dialog-title" className="sr-only">
                New service
              </h2>
              <div className="modal-form" id="new-service">
                <div className={'field'}>
                  <Label htmlFor={'service-name'}>{'Service name'}</Label>
                  <Input
                    id={'service-name'}
                    type={'text'}
                    placeholder={'e.g. Essay workshop'}
                    required
                    aria-required="true"
                  />
                </div>
                <div className={'field'}>
                  <Label htmlFor={'service-desc'}>{'Description'}</Label>
                  <Textarea
                    id={'service-desc'}
                    placeholder={'What students get from this service'}
                    defaultValue={''}
                    rows={2}
                    required
                    aria-required="true"
                  />
                </div>
                <CountrySelector service />
              </div>
              <div className="service-dialog-actions">
                <Button type="button" id="service-dialog-cancel" variant="outline">
                  Cancel
                </Button>
                <Button type="button" id="service-dialog-apply">
                  Create service
                </Button>
              </div>
            </dialog>
            <div className={'service-list'} id={'service-list'} />
          </section>
        </div>
        <div id={'panel-testimonials'} hidden>
          <section className="services-offered" aria-labelledby="testimonials-title">
            <div className="panel-head">
              <h2 id="testimonials-title">Testimonials</h2>
              <Button type="button" id="toggle-new-testimonial" variant="secondary" size="sm">
                <Plus size={16} aria-hidden="true" />
                Add testimonial
              </Button>
            </div>
            <div className={'testi-list'} id={'testi-list'} />
          </section>
        </div>
        <div id={'panel-preview'} hidden>
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
          <StudentPreview
            desktopBrowse={
              <div className={'preview-device-frame'}>
                <article className="counselor-card preview-desktop-listing">
                  <Link className={'card-profile-link'} href={'/counselor-public'} prefetch={false}>
                    <div className="avatar lg preview-avatar">{'PS'}</div>
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
                  <h4>Services</h4>
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
            }
            mobileBrowse={
              <div className={'preview-device-frame phone'}>
                <div className={'preview-fullpage-chrome compact'}>
                  <span className={'chrome-url'}>{'Browse'}</span>
                </div>
                <article className={'counselor-card counselor-card-mobile'}>
                  <Link className={'card-profile-link'} href={'/counselor-public'} prefetch={false}>
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
                  <h4 className="preview-mobile-skills">Services</h4>
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
            }
            desktopProfile={
              <div className={'preview-fullpage-frame'}>
                <div className={'preview-fullpage-chrome'}>
                  <span className={'chrome-dot'} />
                  <span className={'chrome-dot'} />
                  <span className={'chrome-dot'} />
                  <span className={'chrome-url'}>{'gradright.com/counselors/priya-sharma'}</span>
                </div>
                <div className={'public-layout preview-fullpage-body'}>
                  <div>
                    <PreviewProfileHero />
                    <PreviewTabs />
                    <div className="preview-desktop-overview">
                      <div className={'preview-stat-row'}>
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
                      <div
                        className="preview-profile-countries"
                        data-preview-profile-countries=""
                      />
                      <div className="preview-profile-availability">
                        <p className="hint-text">Available on</p>
                        <span className="pill">Chat</span>
                        <span className="pill">Phone call</span>
                        <span className="pill">Video call</span>
                      </div>
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
                    <Card className={'panel'} style={{ marginTop: '1rem' }}>
                      <div className={'panel-head'}>
                        <h2>{'What students connect for'}</h2>
                      </div>
                      <ul className="preview-profile-services" data-preview-profile-services="" />
                    </Card>
                    <Card className={'panel'} style={{ marginTop: '1rem' }}>
                      <div className={'panel-head'}>
                        <h2>{'Testimonials'}</h2>
                      </div>
                      <div className={'public-testi-list is-in-frame'} id={'preview-full-testi'} />
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
                  <aside className="preview-community-rail">
                    <div className="sticky-book">
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
                    </div>
                    <PreviewBadges />
                  </aside>
                </div>
              </div>
            }
            mobileProfile={
              <div className={'preview-fullpage-frame phone-page'}>
                <div className="preview-mobile-profile">
                  <PreviewProfileHero />
                  <PreviewTabs />
                  <section className="preview-mobile-block preview-mobile-identity">
                    <h3 className="preview-name">Priya Sharma</h3>
                    <p className="preview-headline">Higher-education counselor</p>
                  </section>
                  <section className="preview-mobile-overview">
                    <div className="preview-stat-row compact">
                      <div>
                        <strong data-verified-only="">126</strong>
                        <strong data-unverified-only="">0</strong>
                        <span>Sessions</span>
                      </div>
                      <div>
                        <strong className="preview-students">120+</strong>
                        <span>Students</span>
                      </div>
                      <div>
                        <strong className="preview-admits">85+</strong>
                        <span>Admits</span>
                      </div>
                    </div>
                    <p className="preview-bio">
                      Helping students map pathways into top universities.
                    </p>
                    <div className="preview-profile-countries" data-preview-profile-countries="" />
                    <div className="preview-profile-availability">
                      <p className="hint-text">Available on</p>
                      <span className="pill">Chat</span>
                      <span className="pill">Phone call</span>
                      <span className="pill">Video call</span>
                    </div>
                  </section>
                  <div className={'intro-video-embed preview-intro-video'} hidden>
                    <p className={'intro-video-label'}>{'Intro video'}</p>
                    <video
                      className={'preview-intro-video-el'}
                      controls
                      playsInline
                      preload={'metadata'}
                    />
                  </div>
                  <section className="preview-mobile-block">
                    <h3>What students connect for</h3>
                    <ul className="preview-profile-services" data-preview-profile-services="" />
                  </section>
                  <div className={'preview-mobile-block'}>
                    <h3>{'Testimonials'}</h3>
                    <div className={'public-testi-list is-in-frame'} id={'preview-mobile-testi'} />
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
                  <PreviewBadges />
                </div>
              </div>
            }
            community={
              <div className="preview-community-grid">
                <div className="preview-community-main">
                  <PreviewProfileHero />
                  <PreviewTabs />
                  <PreviewCommunityFeed />
                </div>
                <aside className="preview-community-rail">
                  <Card className="panel preview-community-account">
                    <h3 className="preview-name">Priya Sharma</h3>
                    <p data-preview-community-handle="" hidden />
                    <p data-preview-community-counts="" />
                    <Link className="btn btn-secondary btn-sm" href="/community" prefetch={false}>
                      View community
                    </Link>
                  </Card>
                  <PreviewBadges />
                </aside>
              </div>
            }
          />
        </div>
      </div>
      <div className={'cal-modal testi-modal'} id={'testi-modal'} hidden>
        <div className={'cal-modal-backdrop'} data-close-testi={''} />
        <div
          className={'cal-modal-card testi-modal-card profile-decorated-popup'}
          role={'dialog'}
          aria-labelledby={'testi-modal-title'}
          aria-modal={'true'}
        >
          <div className={'cal-modal-head'}>
            <h2 className="sr-only" id={'testi-modal-title'}>
              {'Add testimonial'}
            </h2>
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
                <Button type="button" id="testi-photo-remove" variant="ghost" size="sm" hidden>
                  Remove
                </Button>
                <p id="testi-photo-hint" className="hint-text" role="status" hidden />
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
            <div className={'field'} id={'testi-text-wrap'}>
              <Label htmlFor={'testi-text'}>{'Quote'}</Label>
              <Textarea
                id={'testi-text'}
                placeholder={'Write the testimonial in their words'}
                defaultValue={''}
              />
            </div>
            <div id={'testi-video-wrap'}>
              <div className={'field'}>
                <Label htmlFor={'testi-youtube'}>{'Video link'}</Label>
                <Input id={'testi-youtube'} type={'url'} placeholder={'https://…'} />
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
                  <span>{'MP4, WebM or MOV · under 50 MB'}</span>
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
        <Glass className="unsaved-bar-inner counselor-save-glass" data-theme="dark">
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
        </Glass>
      </div>
    </>
  );
});
