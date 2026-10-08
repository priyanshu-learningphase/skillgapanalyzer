/**
 * Workspace persistence
 *
 * A "workspace" is everything one user owns: their career profile, analysis
 * history, active roadmap and progress. Two interchangeable implementations:
 *
 *  - Firestore (when Firebase is configured)
 *      users/{uid}.career          career profile (+ legacy fields)
 *      skill_analysis/{autoId}     analysis snapshots (also used by admin analytics)
 *      roadmaps/{uid}              active roadmap
 *      progress/{uid}              completed tasks, hours, streak, assessments, projects
 *      insights/{uid}              resume, job description and GitHub analyses
 *  - localStorage (local mode, no account required)
 */

import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, firebaseEnabled } from '../config/firebase';
import { normalizeInsights, normalizeProgress } from '../lib/progress';

const MAX_ANALYSES = 30;

/** Firestore rejects `undefined`; JSON round-tripping strips it. */
const clean = (value) => JSON.parse(JSON.stringify(value ?? null));

const toIso = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  return null;
};

// ── Firestore ──────────────────────────────────────────────────────────────

const firestoreRepository = {
  async load(uid) {
    const [userSnap, roadmapSnap, progressSnap, insightsSnap, analysesSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'roadmaps', uid)),
      getDoc(doc(db, 'progress', uid)),
      getDoc(doc(db, 'insights', uid)),
      // Filter only (no orderBy) so no composite index is required.
      getDocs(query(collection(db, 'skill_analysis'), where('userId', '==', uid))),
    ]);
    const user = userSnap.exists() ? userSnap.data() : {};
    const analyses = analysesSnap.docs
      .map((d) => ({ id: d.id, ...d.data(), createdAt: toIso(d.data().createdAt) }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, MAX_ANALYSES);
    return {
      career: user.career || null,
      legacy: { skills: user.skills || [], career_interest: user.career_interest || '' },
      analyses,
      roadmap: roadmapSnap.exists() ? roadmapSnap.data().roadmap || null : null,
      progress: normalizeProgress(progressSnap.exists() ? progressSnap.data() : null),
      insights: normalizeInsights(insightsSnap.exists() ? insightsSnap.data() : null),
    };
  },

  async saveCareer(uid, career) {
    await setDoc(
      doc(db, 'users', uid),
      {
        career: clean(career),
        // Legacy fields kept in sync for older reports.
        career_interest: career.targetRoleId || '',
        skills: (career.skills || []).map((s) => s.name),
      },
      { merge: true },
    );
  },

  async addAnalysis(uid, snapshot) {
    const ref = await addDoc(collection(db, 'skill_analysis'), {
      ...clean(snapshot),
      userId: uid,
      createdAt: serverTimestamp(),
    });
    return { id: ref.id, ...snapshot, userId: uid, createdAt: new Date().toISOString() };
  },

  async saveRoadmap(uid, roadmap) {
    if (!roadmap) {
      await deleteDoc(doc(db, 'roadmaps', uid));
      return;
    }
    await setDoc(doc(db, 'roadmaps', uid), { roadmap: clean(roadmap), updatedAt: serverTimestamp() });
  },

  async saveProgress(uid, progress) {
    await setDoc(doc(db, 'progress', uid), { ...clean(progress), updatedAt: serverTimestamp() });
  },

  async saveInsights(uid, insights) {
    await setDoc(doc(db, 'insights', uid), { ...clean(insights), updatedAt: serverTimestamp() });
  },

  async reset(uid) {
    const analyses = await getDocs(query(collection(db, 'skill_analysis'), where('userId', '==', uid)));
    await Promise.all([
      ...analyses.docs.map((d) => deleteDoc(d.ref)),
      deleteDoc(doc(db, 'roadmaps', uid)),
      deleteDoc(doc(db, 'progress', uid)),
      deleteDoc(doc(db, 'insights', uid)),
      setDoc(doc(db, 'users', uid), { career: deleteField(), career_interest: '', skills: [] }, { merge: true }),
    ]);
  },
};

// ── localStorage ───────────────────────────────────────────────────────────

const storageKey = (uid) => `skillgap.workspace.v1.${uid}`;

const readLocal = (uid) => {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(uid)) || '{}');
  } catch {
    return {};
  }
};

const writeLocal = (uid, patch) => {
  const next = { ...readLocal(uid), ...patch };
  try {
    window.localStorage.setItem(storageKey(uid), JSON.stringify(next));
  } catch (error) {
    throw new Error(
      error?.name === 'QuotaExceededError'
        ? 'Browser storage is full. Clear some space and try again.'
        : 'Browser storage is unavailable (private mode or blocked site data).',
    );
  }
};

const localRepository = {
  async load(uid) {
    const data = readLocal(uid);
    return {
      career: data.career || null,
      legacy: { skills: [], career_interest: '' },
      analyses: data.analyses || [],
      roadmap: data.roadmap || null,
      progress: normalizeProgress(data.progress),
      insights: normalizeInsights(data.insights),
    };
  },
  async saveCareer(uid, career) {
    writeLocal(uid, { career: clean(career) });
  },
  async addAnalysis(uid, snapshot) {
    const entry = {
      id: `a_${Date.now().toString(36)}`,
      ...clean(snapshot),
      userId: uid,
      createdAt: new Date().toISOString(),
    };
    writeLocal(uid, { analyses: [entry, ...(readLocal(uid).analyses || [])].slice(0, MAX_ANALYSES) });
    return entry;
  },
  async saveRoadmap(uid, roadmap) {
    writeLocal(uid, { roadmap: roadmap ? clean(roadmap) : null });
  },
  async saveProgress(uid, progress) {
    writeLocal(uid, { progress: clean(progress) });
  },
  async saveInsights(uid, insights) {
    writeLocal(uid, { insights: clean(insights) });
  },
  async reset(uid) {
    try {
      window.localStorage.removeItem(storageKey(uid));
    } catch {
      /* storage unavailable: nothing to clear */
    }
  },
};

export const workspaceRepository = firebaseEnabled ? firestoreRepository : localRepository;
