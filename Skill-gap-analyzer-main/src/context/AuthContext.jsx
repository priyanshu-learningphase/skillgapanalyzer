/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the app using
 * Firebase Auth, with the account profile in Firestore (users/{uid}).
 * Without Firebase configuration the app shows a setup screen instead.
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
import FirebaseSetup from '../components/common/FirebaseSetup';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  // Sign up with email and password
  const signup = async (email, password, name, role = 'student') => {
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  // Sign out
  const logout = async () => {
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
    isAdmin: userProfile?.role === 'admin',
    isStudent: userProfile?.role !== 'admin',
  };

  if (!firebaseEnabled) {
    return <FirebaseSetup />;
  }

  // Show loading spinner while initializing
  if (loading) {
    return <FullPageSpinner label="Loading your workspace" />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
