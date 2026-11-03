import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { OnboardingEmbed } from '@calcom/atoms';
import '@calcom/atoms/globals.min.css';

const SCOPES = [
  'PROFILE_READ',
  'SCHEDULE_READ',
  'SCHEDULE_WRITE',
  'EVENT_TYPE_READ',
  'EVENT_TYPE_WRITE',
  'BOOKING_READ',
  'BOOKING_WRITE',
  'APPS_READ',
  'APPS_WRITE',
];

async function generatePkce() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return { codeVerifier, codeChallenge };
}

function ConnectAtom() {
  const clientId = window.GR_CAL_CLIENT_ID || '';
  const redirectUri = window.GR_CAL_REDIRECT_URI || (location.origin + '/calendar.html');
  const state = useMemo(() => 'gr_' + Math.random().toString(36).slice(2), []);
  const [pkce, setPkce] = useState(null);

  useEffect(() => {
    generatePkce().then(setPkce);
  }, []);

  useEffect(() => {
    if (!pkce || !window.GradRightCal || !GradRightCal.rememberOAuthStart) return;
    GradRightCal.rememberOAuthStart({
      state: state,
      verifier: pkce.codeVerifier,
      redirectUri: redirectUri,
    });
  }, [pkce, state, redirectUri]);

  if (!clientId || !pkce) return null;

  return (
    <OnboardingEmbed
      oAuthClientId={clientId}
      theme="light"
      authorization={{
        scope: SCOPES,
        redirectUri: redirectUri,
        state: state,
        codeChallenge: pkce.codeChallenge,
      }}
      onAuthorizationAllowed={function (result) {
        if (!window.GradRightCal || !GradRightCal.completeOAuthCode) return;
        GradRightCal.completeOAuthCode(result.code).then(function () {
          window.dispatchEvent(new CustomEvent('gradright-cal-connected'));
        }).catch(function (err) {
          window.dispatchEvent(new CustomEvent('gradright-cal-connect-error', {
            detail: (err && err.message) || 'Could not finish Cal.com connect.',
          }));
        });
      }}
      onAuthorizationDenied={function () {}}
      onClose={function () {}}
      onError={function (error) {
        window.dispatchEvent(new CustomEvent('gradright-cal-connect-error', {
          detail: (error && error.message) || 'Cal.com onboarding failed.',
        }));
      }}
    />
  );
}

const mount = document.getElementById('cal-onboard-root');
if (mount) createRoot(mount).render(<ConnectAtom />);
