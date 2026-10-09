/**
 * Firebase configuration
 *
 * Firebase is required: accounts use Firebase Auth and every piece of user
 * data (profile, career goal, analyses, roadmap, progress, resume / job /
 * GitHub results) is stored in Firestore. If the VITE_FIREBASE_* variables are
 * missing, the app shows a setup screen instead of running.
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

const ENV_NAMES = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
};

const looksConfigured = (value) => typeof value === 'string' && value.length > 0 && !value.startsWith('your_');

/** Variables that must be set for sign-in and Firestore to work. */
export const missingFirebaseEnv = Object.entries(ENV_NAMES)
  .filter(([key]) => !looksConfigured(firebaseConfig[key]))
  .map(([, name]) => name);

let app = null;
let auth = null;
let db = null;
let firebaseInitError = null;

if (!missingFirebaseEnv.length) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase failed to initialise.', error);
    firebaseInitError = error;
    app = null;
    auth = null;
    db = null;
  }
}

export const firebaseEnabled = Boolean(app);
export { auth, db, firebaseInitError };
export default app;
