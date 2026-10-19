/**
 * Plain-language breakdown of the career readiness score.
 *
 * readiness = Σ(weight × min(1, level ÷ target)) ÷ Σ(weight) × 100
 * with weights Critical 4, High 3, Medium 2, Low 1.
 *
 * Each requirement can contribute `pointsMax` points; you earn
 * `pointsMax × coverage`. The points add up to the score.
 */

import { IMPORTANCE, ROLE_PROFILE_META } from '../data/roles.js';

export const READINESS_DISCLAIMER =
  'Readiness estimates how much of this role’s configured skill requirements your current levels cover. It is not the probability of getting an offer: interviews, projects, timing and competition also matter.';

export const explainReadiness = (analysis, role) => {
  if (!analysis) return null;
  const totalWeight = analysis.items.reduce((sum, i) => sum + i.weight, 0) || 1;
  const rows = analysis.items
    .map((item) => {
      const pointsMax = (item.weight / totalWeight) * 100;
      return {
        ...item,
        pointsMax: Math.round(pointsMax * 10) / 10,
        pointsEarned: Math.round(pointsMax * item.coverage * 10) / 10,
        coveragePct: Math.round(item.coverage * 100),
        importanceLabel: IMPORTANCE[item.importance]?.label || item.importance,
      };
    })
    .sort((a, b) => b.weight - a.weight || b.pointsMax - b.pointsEarned - (a.pointsMax - a.pointsEarned));

  const matched = rows.filter((r) => r.standing === 'strong');
  const partial = rows.filter((r) => r.standing === 'improve');
  const missing = rows.filter((r) => r.standing === 'missing');
  const criticalMissing = rows.filter((r) => r.gap > 0 && r.importance === 'critical').sort((a, b) => b.pointsAvailable - a.pointsAvailable);

  const fromJob = Boolean(role?.custom || role?.fromJob || role?.id === 'custom');
  return {
    score: analysis.readiness,
    totalWeight,
    rows,
    matched,
    partial,
    missing,
    criticalMissing,
    weights: Object.entries(IMPORTANCE).map(([id, v]) => ({ id, ...v })),
    profile: {
      roleName: analysis.roleName,
      company: analysis.company?.name || null,
      companyAdjusted: rows.filter((r) => r.companyAdjusted || r.companyAdded).length,
      requirements: rows.length,
      version: fromJob ? null : ROLE_PROFILE_META.version,
      reviewedAt: fromJob ? null : ROLE_PROFILE_META.reviewedAt,
      basis: fromJob ? 'Built from the job description you selected.' : ROLE_PROFILE_META.basis,
    },
  };
};
