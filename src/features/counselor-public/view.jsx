'use client';
import { PublicProfileDetails, usePublicIdentity } from '@/components/public-profile-details';
import { memo } from 'react';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const View = memo(function View() {
  const identity = usePublicIdentity();
  return (
    <>
      <div className={'market-shell'}>
        <header className={'market-top'}>
          <div className={'brand-mark'}>
            <img
              className={'brand-logo dark'}
              src={'/assets/gradright-logo-dark.png'}
              alt={'GradRight'}
            />
          </div>
          <p className={'switch'}>
            <Link href={'/marketplace'} prefetch={false}>
              {'← All counselors'}
            </Link>
            {'·'}
            <Link href={'/profile?tab=preview'} prefetch={false}>
              {'Counselor: profile preview'}
            </Link>
          </p>
        </header>
        <div className={'market-body'}>
          <div
            className={'pending-banner'}
            id={'preview-pending-banner'}
            hidden
            style={{ marginBottom: '1.25rem' }}
          >
            <div className={'icon'}>
              <Icon name="visibility" />
            </div>
            <div>
              <h3>{'Preview only · not live in marketplace'}</h3>
              <p>
                {
                  'Students won’t see this listing until you’re admin-verified. This page is a counselor preview.'
                }
              </p>
            </div>
            <Link
              className={'btn btn-secondary btn-sm'}
              href={'/profile?tab=preview'}
              prefetch={false}
            >
              {'Back to profile'}
            </Link>
          </div>
          <div className={'public-layout'}>
            <div>
              <div className={'public-hero'}>
                <div className={'avatar lg'}>{'PS'}</div>
                <div>
                  <h1>{identity.name || 'Priya Sharma'}</h1>
                  <PublicProfileDetails />
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                    {'Mumbai · Higher-education counselor'}
                  </p>
                  <div className={'preview-stat-row'} style={{ maxWidth: '28rem' }}>
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
                      <strong>{'120+'}</strong>
                      <span>{'Students'}</span>
                    </div>
                    <div>
                      <strong>{'85+'}</strong>
                      <span>{'Admits'}</span>
                    </div>
                  </div>
                  <div
                    className={'tags'}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      margin: '0.75rem 0 0',
                    }}
                  >
                    <span className={'pill warn'} data-unverified-only={''}>
                      {'Pending verify'}
                    </span>
                    <span className={'pill'}>{'USA'}</span>
                    <span className={'pill'}>{'UK'}</span>
                    <span className={'pill'}>{'Canada'}</span>
                  </div>
                  <p
                    style={{
                      fontSize: '0.92rem',
                      maxWidth: '36rem',
                      lineHeight: '1.55',
                      marginTop: '0.75rem',
                    }}
                  >
                    {
                      'Helping students map pathways into top US & UK universities — from shortlisting\n                to SOP & visa readiness.'
                    }
                  </p>
                </div>
              </div>
              <Card className={'panel'} style={{ marginTop: '1rem' }}>
                <div className={'panel-head'}>
                  <h2>{'What students connect for'}</h2>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'College shortlisting'}</strong>
                    <span>{'Reach / match / safety lists for your profile'}</span>
                  </div>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'SOP & essay review'}</strong>
                    <span>{'Structure, voice, and program fit'}</span>
                  </div>
                </div>
                <div className={'list-item'}>
                  <div className={'meta'}>
                    <strong>{'Visa readiness'}</strong>
                    <span>{'Docs checklist and interview practice'}</span>
                  </div>
                </div>
              </Card>
              <Card className={'panel'} style={{ marginTop: '1rem' }}>
                <div className={'panel-head'}>
                  <h2>{'Testimonials'}</h2>
                </div>
                <div className={'public-testi-list'} id={'public-testi-list'} />
              </Card>
              <Card className={'panel'} style={{ marginTop: '1rem' }} data-verified-only={''}>
                <div className={'panel-head'}>
                  <h2>{'Reviews from GradRight students'}</h2>
                </div>
                <div className={'review'}>
                  <div className={'stars'}>{'★★★★★'}</div>
                  <strong>{'Aarav Reddy'}</strong>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                    {
                      'Clear shortlist logic for USA CS. Explained reach vs match so my parents got it too.'
                    }
                  </p>
                </div>
                <div className={'review'}>
                  <div className={'stars'}>{'★★★★★'}</div>
                  <strong>{'Meera Kapoor'}</strong>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
                    {
                      'SOP feedback was precise — finally sounded specific without sounding generic.'
                    }
                  </p>
                </div>
              </Card>
              <Card className={'panel'} style={{ marginTop: '1rem' }} data-verified-only={''}>
                <div className={'panel-head'}>
                  <h2>{'Badges'}</h2>
                </div>
                <div className={'badge-row'}>
                  <div className={'badge'}>
                    <span className={'emoji'}>{'🎯'}</span>
                    {'Top mentor'}
                  </div>
                  <div className={'badge'}>
                    <span className={'emoji'}>{'🌍'}</span>
                    {'USA expert'}
                  </div>
                  <div className={'badge'}>
                    <span className={'emoji'}>{'⚡'}</span>
                    {'Fast reply'}
                  </div>
                  <div className={'badge'}>
                    <span className={'emoji'}>{'💯'}</span>
                    {'100+ sessions'}
                  </div>
                </div>
              </Card>
            </div>
            <aside className={'sticky-book'}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '500' }}>
                {'Connect fee'}
              </div>
              <div className={'price'}>{'₹1,999'}</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                {'Pay once to unlock chat & booking with Priya on GradRight.'}
              </p>
              <a
                className={'btn btn-primary'}
                href={'#'}
                data-verified-only={''}
                onClick={(event) => {
                  event.preventDefault();
                  alert('Pay the connect fee to unlock chat and booking');
                }}
              >
                {'Connect'}
              </a>
              <Button
                className={''}
                type={'button'}
                data-unverified-only={''}
                disabled
                style={{ opacity: '0.7', cursor: 'not-allowed', width: '100%' }}
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
                {'Next open slot · Tue 10:00 AM IST'}
              </p>
              <p
                className={'hint-text'}
                style={{ marginTop: '0.75rem', textAlign: 'center' }}
                data-unverified-only={''}
              >
                {'Live after admin verification'}
              </p>
              <hr
                style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '1rem 0' }}
              />
              <div className={'info-dl'} data-verified-only={''}>
                <div>
                  <dt>{'Sessions on GradRight'}</dt>
                  <dd>{'126'}</dd>
                </div>
                <div>
                  <dt>{'Response'}</dt>
                  <dd>{'Usually < 2 hrs'}</dd>
                </div>
                <div>
                  <dt>{'Availability'}</dt>
                  <dd>{'Mon–Fri · set slots'}</dd>
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }} data-unverified-only={''}>
                {'Stats and booking go live once admin verifies this counselor.'}
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
});
