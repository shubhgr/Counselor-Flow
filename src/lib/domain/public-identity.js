export const PUBLIC_IDENTITY_KEY = 'counselor-public-identity';
export function readPublicIdentity() {
  try {
    return JSON.parse(localStorage.getItem(PUBLIC_IDENTITY_KEY) || '{}');
  } catch {
    return {};
  }
}
export function savePublicIdentity(details) {
  const previous = readPublicIdentity();
  const next = { ...previous, ...details };
  localStorage.setItem(PUBLIC_IDENTITY_KEY, JSON.stringify(next));
  const account = window.GradRightSession?.get();
  const original = account?.communityOriginalName || account?.name || 'Priya Sharma';
  updateCommunityIdentity(previous.name || original, next.name || original, next.username);
  window.dispatchEvent(new Event('gradright:public-profile'));
}
import { updateCommunityIdentity } from './community.js';
