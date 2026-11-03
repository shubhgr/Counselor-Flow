import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import './styles.css';
import '../js/session.js';
import '../js/testimonials.js';
import '../js/intro-recorder.js';
import { Profile } from './pages/profile';
import { initializeProfile } from './pages/profile-behavior';

// Mount before binding the compatibility controller to the existing field IDs.
// Do not enable StrictMode until the controller's subscriptions have cleanup.
flushSync(() => createRoot(document.getElementById('root')).render(<Profile />));
initializeProfile();
await import('./shell-entry.jsx');
