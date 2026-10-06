/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app.
 * Handles Firebase Auth and user role management. When Firebase isn't
 * configured, runs in local mode: a single local profile stored in this
 * browser, so every feature still works without an account.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseEnabled } from '../config/firebase';
import { FullPageSpinner } from '../components/ui/Spinner';

const AuthContext = createContext();

const LOCAL_USER = { uid: 'local', email: null, isLocal: true };
const LOCAL_PROFILE_KEY = 'skillgap.localProfile';

const readLocalProfile = () => {
  try {
    return { name: '', role: 'student', ...JSON.parse(window.localStorage.getItem(LOCAL_PROFILE_KEY) || '{}') };
  } catch {
    return { name: '', role: 'student' };
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(firebaseEnabled ? null : LOCAL_USER);
  const [userProfile, setUserProfile] = useState(firebaseEnabled ? null : readLocalProfile());
  const [loading, setLoading] = useState(firebaseEnabled);

  // Sign up with email and password
  const signup = async (email, password, name, role = 'student') => {
    if (!firebaseEnabled) throw new Error('Accounts are unavailable in local mode.');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Create user profile in Firestore
    const profile = {
      name,
      email,
      role,
      branch: '',
      year: null,
      career_interest: '',
      skills: [],
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', userCredential.user.uid), profile);
    setUserProfile({ id: userCredential.user.uid, ...profile });

    return userCredential.user;
  };

  // Sign in with email and password
  const login = async (email, password) => {
    if (!firebaseEnabled) throw new Error('Accounts are unavailable in local mode.');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  // Sign out
  const logout = async () => {
    if (!firebaseEnabled) return;
    await signOut(auth);
    setUserProfile(null);
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  };

  // Update the account-level profile (name, branch, year…)
  const updateUserProfile = useCallback(async (uid, data) => {
    if (!firebaseEnabled) {
      const next = { ...readLocalProfile(), ...data };
      window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(next));
      setUserProfile(next);
      return next;
    }
    await setDoc(doc(db, 'users', uid), data, { merge: true });
    const updatedProfile = await fetchUserProfile(uid);
    setUserProfile(updatedProfile);
    return updatedProfile;
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    let unsubscribe;

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          setCurrentUser(user);

          if (user) {
            try {
              const profile = await fetchUserProfile(user.uid);
              setUserProfile(profile);
            } catch (err) {
              console.error('Error fetching user profile:', err);
            }
          } else {
            setUserProfile(null);
          }

          setLoading(false);
        },
        (error) => {
          console.error('Auth state error:', error);
          setLoading(false);
        },
      );
    } catch (error) {
      console.error('Firebase initialization error:', error);
      setLoading(false);
    }

    return () => unsubscribe && unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    mode: firebaseEnabled ? 'firebase' : 'local',
    isLocalMode: !firebaseEnabled,
    isAdmin: userProfile?.role === 'admin',
    isStudent: userProfile?.role !== 'admin',
  };

  // Show loading spinner while initializing
  if (loading) {
    return <FullPageSpinner label="Loading your workspace" />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
