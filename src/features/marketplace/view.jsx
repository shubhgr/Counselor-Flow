'use client';
import { memo } from 'react';
import Link from 'next/link';

export const View = memo(function View() {
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
            {'Viewing as student (app browse)\n        ·'}
            <Link href={'/'} prefetch={false}>
              {'Counselor desktop →'}
            </Link>
          </p>
        </header>
        <div className={'market-body'}>
          <div className={'market-hero'}>
            <h1>{'Counselors who can get you in'}</h1>
            <p>
              {
                'Browse and connect with verified higher-ed counselors for countries and colleges.\n          GradRight recommends matches — you pay once to connect, then chat and book.'
              }
            </p>
          </div>
          <div className={'recommend-banner'}>
            <div>
              <strong>{'Recommended for you · USA · CS Masters'}</strong>
              <span>
                {
                  'Based on your profile in the GradRight app — Priya and 2 others fit your pathway.'
                }
              </span>
            </div>
            <Link className={'btn btn-primary btn-sm'} href={'/counselor-public'} prefetch={false}>
              {'See top match'}
            </Link>
          </div>
          <div className={'market-filters'}>
            <a className={'chip selected'} href={'#'}>
              {'All'}
            </a>
            <a className={'chip'} href={'#'}>
              {'USA'}
            </a>
            <a className={'chip'} href={'#'}>
              {'UK'}
            </a>
            <a className={'chip'} href={'#'}>
              {'Canada'}
            </a>
            <a className={'chip'} href={'#'}>
              {'Germany'}
            </a>
            <a className={'chip'} href={'#'}>
              {'SOP help'}
            </a>
            <a className={'chip'} href={'#'}>
              {'Visa'}
            </a>
            <a className={'chip'} href={'#'}>
              {'Under ₹2,000'}
            </a>
          </div>
          <div className={'counselor-grid'}>
            <article className={'counselor-card'}>
              <Link className={'card-profile-link'} href={'/counselor-public'} prefetch={false}>
                <div
                  className={'avatar lg'}
                  style={{ width: '48px', height: '48px', fontSize: '0.9rem' }}
                >
                  {'PS'}
                </div>
                <div>
                  <h3>{'Priya Sharma'}</h3>
                  <div className={'meta-line'}>{'Mumbai · USA · UK · Canada'}</div>
                  <div className={'rating'}>{'★ 4.8 · 126 sessions'}</div>
                </div>
              </Link>
              <p className={'bio'}>
                {
                  'Helping students map pathways into top US & UK universities — shortlisting to SOP & visa.'
                }
              </p>
              <div className={'card-foot'}>
                <span className={'fee'}>{'₹1,999 connect'}</span>
                <Link
                  className={'btn btn-primary btn-sm'}
                  href={'/counselor-public'}
                  prefetch={false}
                >
                  {'Connect'}
                </Link>
              </div>
            </article>
            <article className={'counselor-card'}>
              <Link className={'card-profile-link'} href={'/counselor-public'} prefetch={false}>
                <div
                  className={'avatar lg amber'}
                  style={{ width: '48px', height: '48px', fontSize: '0.9rem' }}
                >
                  {'RK'}
                </div>
                <div>
                  <h3>{'Rohan Kulkarni'}</h3>
                  <div className={'meta-line'}>{'Pune · Canada · Germany'}</div>
                  <div className={'rating'}>{'★ 4.9 · 98 sessions'}</div>
                </div>
              </Link>
              <p className={'bio'}>
                {'Canada SDS & Germany pathways — admits-focused guidance for STEM profiles.'}
              </p>
              <div className={'card-foot'}>
                <span className={'fee'}>{'₹2,499 connect'}</span>
                <Link
                  className={'btn btn-primary btn-sm'}
                  href={'/counselor-public'}
                  prefetch={false}
                >
                  {'Connect'}
                </Link>
              </div>
            </article>
            <article className={'counselor-card'}>
              <Link className={'card-profile-link'} href={'/counselor-public'} prefetch={false}>
                <div
                  className={'avatar lg'}
                  style={{ width: '48px', height: '48px', fontSize: '0.9rem' }}
                >
                  {'AL'}
                </div>
                <div>
                  <h3>{'Ananya Lal'}</h3>
                  <div className={'meta-line'}>{'Delhi · UK · Ireland'}</div>
                  <div className={'rating'}>{'★ 4.7 · 74 sessions'}</div>
                </div>
              </Link>
              <p className={'bio'}>
                {'Design & humanities portfolios for UK schools — essay voice that sounds human.'}
              </p>
              <div className={'card-foot'}>
                <span className={'fee'}>{'₹1,499 connect'}</span>
                <Link
                  className={'btn btn-primary btn-sm'}
                  href={'/counselor-public'}
                  prefetch={false}
                >
                  {'Connect'}
                </Link>
              </div>
            </article>
            <article className={'counselor-card'}>
              <Link className={'card-profile-link'} href={'/counselor-public'} prefetch={false}>
                <div
                  className={'avatar lg amber'}
                  style={{ width: '48px', height: '48px', fontSize: '0.9rem' }}
                >
                  {'VS'}
                </div>
                <div>
                  <h3>{'Vikram Singh'}</h3>
                  <div className={'meta-line'}>{'Bangalore · USA · Singapore'}</div>
                  <div className={'rating'}>{'★ 4.6 · 210 sessions'}</div>
                </div>
              </Link>
              <p className={'bio'}>
                {'CS / AI admits across US & Singapore — GRE strategy and lab-fit storytelling.'}
              </p>
              <div className={'card-foot'}>
                <span className={'fee'}>{'₹2,999 connect'}</span>
                <Link
                  className={'btn btn-primary btn-sm'}
                  href={'/counselor-public'}
                  prefetch={false}
                >
                  {'Connect'}
                </Link>
              </div>
            </article>
          </div>
          <p
            style={{
              marginTop: '2rem',
              fontSize: '0.8rem',
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            {'Only'}
            <strong>{'admin-verified'}</strong>
            {
              'counselors appear in this marketplace.\n        Unverified profiles stay hidden from students.'
            }
          </p>
        </div>
      </div>
    </>
  );
});
