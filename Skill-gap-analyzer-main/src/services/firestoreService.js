/**
 * Firestore Service — campus analytics
 *
 * Admin-only reads over every user's profile and analysis snapshots
 * (allowed for admins by firestore.rules). Aggregation lives in
 * src/lib/campus.js; per-user reads and writes live in workspaceRepository.js.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Admin: every user profile and every analysis snapshot.
 * All users are fetched (not just role == 'student') so older accounts
 * without a role field are included; admins are filtered out later.
 *
 * @returns {Promise<{ users: object[], analyses: object[] }>}
 */
export const getCampusData = async () => {
  const [usersSnap, analysesSnap] = await Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'skill_analysis'))]);
  return {
    users: usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    analyses: analysesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
};

export default { getCampusData };
