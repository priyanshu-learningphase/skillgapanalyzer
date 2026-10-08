/**
 * Career simulator: how ready you'd be for a role at a given company and how
 * long it would take to close the gap at your pace.
 */

import { roleFor } from '../data/roles.js';
import { analyzeRole } from './analysis.js';
import { planRoadmap } from './roadmap.js';

const WEEKS_PER_MONTH = 4.345;

export const prepLabel = (weeks) => {
  if (weeks <= 2) return '1–2 weeks';
  if (weeks < 5) return `${weeks - 1}–${weeks + 1} weeks`;
  const low = Math.max(1, Math.round((weeks * 0.85) / WEEKS_PER_MONTH));
  let high = Math.max(1, Math.round((weeks * 1.2) / WEEKS_PER_MONTH));
  if (high <= low) high = low + 1;
  return `${low}–${high} months`;
};

export const simulateCareer = ({ roleId, company = null, customRole = null, profile, signals = {} }) => {
  const role = roleFor(roleId, company, customRole);
  if (!role) return null;
  const skills = profile.skills || [];
  const analysis = analyzeRole(role, skills);
  // No deadline and default inclusion, so the estimate reflects the full gap.
  const plan = planRoadmap({ role, profile: { ...profile, timelineWeeks: null, roadmapOverrides: {} }, analysis, signals });
  return {
    role,
    company: role.company || null,
    analysis,
    match: analysis.readiness,
    missing: analysis.gaps.filter((g) => g.priority !== 'optional'),
    hours: plan.totalHours,
    weeks: plan.totalWeeks,
    weeklyHours: plan.settings.weeklyHours,
    prep: analysis.gaps.length ? prepLabel(plan.totalWeeks) : 'Ready now',
  };
};

/** The same role across several companies, for side-by-side comparison. */
export const compareCompanies = ({ roleId, companies, customRole, profile, signals }) =>
  companies.map((company) => simulateCareer({ roleId, company, customRole, profile, signals })).filter(Boolean);
