'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export function useLiveProfile() {
  const [profile, setProfile] = useState({
    name: 'Priya Sharma',
    address: '',
    countries: [],
    students: '120',
    admits: '85',
    headline: '',
    bio: '',
    photo: '',
    username: '',
    email: '',
    phone: '',
  });
  useEffect(() => {
    const form = document.getElementById('profile-form');
    if (!form) return;
    const read = () => {
      const value = (id) => document.getElementById(id)?.value || '';
      const photo = document.getElementById('photo-preview-img');
      const contact = window.GradRightPublicProfileDraft?.get() || {};
      const counter = document.getElementById('overview-bio-count');
      if (counter) counter.textContent = `${value('field-bio').length} / 300`;
      setProfile({
        name: value('field-name'),
        address: value('field-address'),
        countries: window.GradRightCountriesDraft?.get() || [],
        students: value('field-students'),
        admits: value('field-admits'),
        headline: value('field-headline'),
        bio: value('field-bio'),
        photo: photo && !photo.hidden ? photo.getAttribute('src') : '',
        video: Boolean(document.getElementById('video-preview-el')?.getAttribute('src')),
        documents: document.querySelectorAll('#doc-list .doc-file').length,
        ...contact,
      });
    };
    const observer = new MutationObserver(read);
    observer.observe(form, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'src', 'hidden'],
    });
    const documents = document.getElementById('doc-list');
    if (documents) observer.observe(documents, { childList: true });
    form.addEventListener('input', read);
    form.addEventListener('change', read);
    window.addEventListener('gradright:public-draft', read);
    window.addEventListener('gradright:public-profile', read);
    const frame = requestAnimationFrame(read);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      form.removeEventListener('input', read);
      form.removeEventListener('change', read);
      window.removeEventListener('gradright:public-draft', read);
      window.removeEventListener('gradright:public-profile', read);
    };
  }, []);
  return profile;
}

export function StudentProfilePreview() {
  const profile = useLiveProfile();
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <Card className="panel student-profile-summary">
      <div className="student-preview-heading">
        <h2>How students see you</h2>
      </div>
      <div className="student-profile-summary-person">
        <div className="avatar">
          {profile.photo ? <img src={profile.photo} alt="Profile" /> : initials || 'PS'}
        </div>
        <div>
          <div className="profile-person-name">
            <h3>{profile.name || 'Your name'}</h3>
            <span className="pill profile-community-role">Counselor</span>
          </div>
          <p>{profile.address || 'Your public location'}</p>
        </div>
      </div>
      <div className="student-profile-summary-countries">
        {profile.countries.map((country) => (
          <span className="pill" key={country}>
            {country}
          </span>
        ))}
      </div>
      <div className="student-profile-summary-stats">
        <div>
          <strong>{profile.students || '0'}</strong>
          <span>Students served</span>
        </div>
        <div>
          <strong>{profile.admits || '0'}</strong>
          <span>Admits secured</span>
        </div>
      </div>
      {profile.headline.trim() && <strong className="block break-words">{profile.headline}</strong>}
      <p className="student-profile-summary-bio">{profile.bio || 'Your bio will appear here.'}</p>
      {(profile.email || profile.phone) && (
        <div className="student-profile-summary-contact">
          {profile.email && profile.showEmail !== false && <p>{profile.email}</p>}
          {profile.phone && profile.showPhone !== false && <p>+91 {profile.phone}</p>}
        </div>
      )}
    </Card>
  );
}
