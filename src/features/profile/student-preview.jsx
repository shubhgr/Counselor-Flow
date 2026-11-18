'use client';

import { createContext, useContext, useState } from 'react';
import { Bookmark, Heart, PencilLine, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PreviewNavigation = createContext(null);

const listingViews = [
  ['browse', 'Counselors'],
  ['connected', 'Connected'],
];
const profileViews = [
  ['profile', 'Counselor profile'],
  ['community', 'Community profile'],
];

export function PreviewTabs({ listing = false }) {
  const { view, setView } = useContext(PreviewNavigation);
  return (
    <nav
      className="student-preview-nav"
      aria-label={listing ? 'Counselor listings' : 'Profile views'}
    >
      {(listing ? listingViews : profileViews).map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => setView(value)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

const communityViews = [
  ['Posts', PencilLine],
  ['Reactions', Heart],
  ['Saved', Bookmark],
  ['About', UserRound],
];

export function PreviewCommunityFeed() {
  const [section, setSection] = useState('Posts');
  return (
    <div className="preview-community-feed">
      <nav
        className="student-preview-nav preview-community-actions"
        aria-label="Community sections"
      >
        {communityViews.map(([label, Icon]) => (
          <button
            key={label}
            type="button"
            aria-pressed={section === label}
            onClick={() => setSection(label)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div hidden={section !== 'Posts'} data-preview-community-posts="" />
      {section === 'Reactions' && <p className="hint-text">No public reactions to show.</p>}
      {section === 'Saved' && <p className="hint-text">Saved posts are private.</p>}
      {section === 'About' && (
        <p className="panel preview-community-about preview-bio">
          Helping students map pathways into top universities.
        </p>
      )}
    </div>
  );
}

const exampleCalls = [
  ['10 AM', '3 Nov 2026', 'Upcoming call'],
  ['3 PM', '26 Oct 2026', 'Call cancelled'],
  ['12 PM', '1 Oct 2026', 'Call completed'],
  ['7:15 PM', '15 Sept 2026', 'Call missed'],
];

export function StudentPreview({
  desktopBrowse,
  mobileBrowse,
  desktopProfile,
  mobileProfile,
  community,
}) {
  return (
    <div className="student-preview preview-card-compare">
      <PreviewScreen
        device="desktop"
        browse={desktopBrowse}
        profile={desktopProfile}
        community={community}
      />
      <PreviewScreen
        device="mobile"
        browse={mobileBrowse}
        profile={mobileProfile}
        community={community}
      />
    </div>
  );
}

function PreviewScreen({ device, browse, profile, community }) {
  const [view, setView] = useState('profile');

  function openCounselor(event) {
    const link = event.target.closest('a[href="/counselor-public"]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setView('profile');
  }

  return (
    <section aria-label={device === 'desktop' ? 'Desktop preview' : 'Mobile preview'}>
      <h2 className="preview-device-label">{device === 'desktop' ? 'Desktop' : 'Mobile'}</h2>
      <div className="student-preview-screen" data-device={device}>
        <PreviewNavigation.Provider value={{ view, setView }}>
          <div
            className="student-preview-listing"
            hidden={view !== 'browse' && view !== 'connected'}
          >
            <h3>Talk to a counselor</h3>
            <PreviewTabs listing />
            <div hidden={view !== 'browse'} onClickCapture={openCounselor}>
              {browse}
            </div>
            <section hidden={view !== 'connected'} aria-label="Connected preview">
              <p className="hint-text">Example calls</p>
              <div className="student-preview-calls">
                {exampleCalls.map(([time, date, status]) => (
                  <article className="panel student-preview-call" key={date}>
                    <div>
                      <span>
                        {time} · {date}
                      </span>
                      <span className="pill">{status}</span>
                    </div>
                    <h3 className="preview-name">Priya Sharma</h3>
                    <Button size="sm" onClick={() => setView('profile')}>
                      View counselor profile
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          </div>
          <div hidden={view !== 'profile'}>{profile}</div>
          <div hidden={view !== 'community'}>{community}</div>
        </PreviewNavigation.Provider>
      </div>
    </section>
  );
}
