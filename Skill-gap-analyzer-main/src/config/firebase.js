/**
 * Firebase configuration
 *
 * Firebase is optional. When the VITE_FIREBASE_* variables are present the app
 * uses Firebase Auth + Firestore (accounts, cross-device sync, campus
 * analytics). Without them it runs in local mode and stores data in the
 * browser, so the product still works end-to-end for development and demos.
 *
 * Note: Firebase web config values are public identifiers, not secrets —
 * access is enforced by firestore.rules.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const looksConfigured = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('your_');

export const isFirebaseConfigured =
  looksConfigured(firebaseConfig.apiKey) &&
  looksConfigured(firebaseConfig.projectId) &&
  looksConfigured(firebaseConfig.appId);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase failed to initialise; falling back to local mode.', error);
    app = null;
    auth = null;
    db = null;
  }
}

export const firebaseEnabled = Boolean(app);
export { auth, db };
export default app;
