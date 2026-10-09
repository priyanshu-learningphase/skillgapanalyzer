/**
 * Firestore Service — campus analytics
 *
 * Admin-only aggregate queries over all users' analysis snapshots. Per-user
 * reads and writes live in workspaceRepository.js.
 */

import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Admin: Get all analyses for campus-wide insights
 *
 * @returns {Promise<object[]>} - All analyses
 */
export const getAllAnalyses = async () => {
  const snapshot = await getDocs(query(collection(db, 'skill_analysis'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Admin: Get aggregated campus analytics. Uses each student's most recent
 * analysis so repeated re-analyses don't skew averages.
 *
 * @returns {Promise<object>} - Aggregated analytics data
 */
export const getCampusAnalytics = async () => {
  const analyses = await getAllAnalyses();

  const latestByUser = new Map();
  for (const analysis of analyses) {
    if (!latestByUser.has(analysis.userId)) latestByUser.set(analysis.userId, analysis);
  }
  const latest = [...latestByUser.values()];

  if (latest.length === 0) {
    return { totalStudents: 0, totalAnalyses: 0, averageReadiness: 0, topMissingSkills: [], roleWiseStats: [] };
  }

  const totalScore = latest.reduce((sum, a) => sum + (a.readiness_score || 0), 0);

  const skillCount = {};
  for (const analysis of latest) {
    for (const skill of analysis.missing_skills || []) {
      // Older snapshots stored "Skill - reason"; keep only the skill name.
      const name = String(skill).split(' - ')[0];
      skillCount[name] = (skillCount[name] || 0) + 1;
    }
  }
  const topMissingSkills = Object.entries(skillCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  const roleStats = {};
  for (const analysis of latest) {
    const role = analysis.career_role || 'Unknown';
    roleStats[role] ||= { totalScore: 0, count: 0 };
    roleStats[role].totalScore += analysis.readiness_score || 0;
    roleStats[role].count += 1;
  }
  const roleWiseStats = Object.entries(roleStats)
    .map(([role, stats]) => ({
      role,
      averageScore: Math.round(stats.totalScore / stats.count),
      studentCount: stats.count,
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  return {
    totalStudents: latest.length,
    totalAnalyses: analyses.length,
    averageReadiness: Math.round(totalScore / latest.length),
    topMissingSkills,
    roleWiseStats,
  };
};

/**
 * Get all students (for admin view)
 *
 * @returns {Promise<object[]>} - Array of student profiles
 */
export const getAllStudents = async () => {
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export default { getAllAnalyses, getCampusAnalytics, getAllStudents };
