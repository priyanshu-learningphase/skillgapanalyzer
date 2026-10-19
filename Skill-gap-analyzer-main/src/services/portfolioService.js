/**
 * Publishing portfolios. Public pages live at portfolios/{slug} in Firestore
 * and are readable by anyone only while `published` is true (see
 * firestore.rules). In local mode (no Firebase) publishing isn't possible:
 * there's no server to host the page.
 */

import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from '../config/firebase';

export const canPublish = firebaseEnabled;

export class PortfolioError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export const publishPortfolio = async ({ uid, slug, previousSlug, snapshot }) => {
  if (!firebaseEnabled) throw new PortfolioError('Publishing needs an account.', 'needs_account');
  try {
    await setDoc(doc(db, 'portfolios', slug), { ...JSON.parse(JSON.stringify(snapshot)), slug, ownerId: uid, published: true, updatedAt: serverTimestamp() });
  } catch (error) {
    if (error.code === 'permission-denied') throw new PortfolioError('That link is already taken. Choose a different one.', 'slug_taken');
    throw error;
  }
  if (previousSlug && previousSlug !== slug) await deleteDoc(doc(db, 'portfolios', previousSlug)).catch(() => {});
};

export const unpublishPortfolio = async (slug) => {
  if (!firebaseEnabled || !slug) return;
  await deleteDoc(doc(db, 'portfolios', slug));
};

/** A published portfolio, or null if it doesn't exist / isn't public. */
export const getPublicPortfolio = async (slug) => {
  if (!firebaseEnabled) throw new PortfolioError('Public portfolios aren’t available on this deployment.', 'needs_account');
  try {
    const snap = await getDoc(doc(db, 'portfolios', slug));
    return snap.exists() && snap.data().published ? snap.data() : null;
  } catch (error) {
    // Rules deny reads of missing or unpublished pages.
    if (error.code === 'permission-denied') return null;
    throw error;
  }
};
