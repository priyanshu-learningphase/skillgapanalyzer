/**
 * Skill gap analysis
 *
 * Pure functions: given a role and the user's skills, compute readiness,
 * strengths, gaps and priorities. Deterministic, so the same inputs always
 * produce the same analysis and the roadmap can be recalculated whenever
 * skills change.
 */

import { getSkill } from '../data/skills.js';
import { IMPORTANCE, ROLES, requirementLabel } from '../data/roles.js';

export const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

export const PRIORITY_META = {
  critical: { label: 'Critical', rank: 0 },
  high: { label: 'High', rank: 1 },
  medium: { label: 'Medium', rank: 2 },
  low: { label: 'Low', rank: 3 },
};

/** Inferred levels decay per prerequisite hop and never exceed this. */
const INFERENCE_DECAY = 0.75;
const INFERENCE_CAP = 75;

/** A skill counts as a strength when the user is within 10% of the target. */
const STRENGTH_RATIO = 0.9;

/**
 * Map every skill id to the user's level. Self-reported levels always win;
 * otherwise a level is inferred from skills that depend on it (knowing
 * Express implies some Node.js and JavaScript).
 */
export const buildSkillLevels = (userSkills = []) => {
  const levels = {};
  for (const entry of userSkills) {
    levels[entry.id] = { level: clamp(Math.round(entry.level), 0, 100), source: 'self' };
  }

  const infer = (skillId, level, fromId, depth, seen) => {
    const skill = getSkill(skillId);
    if (!skill || depth > 4) return;
    for (const prerequisite of skill.prerequisites) {
      // An "any of" group can't tell us which option the user knows.
      if (Array.isArray(prerequisite) || seen.has(prerequisite)) continue;
      const inferred = Math.min(INFERENCE_CAP, Math.round(level * INFERENCE_DECAY));
      const existing = levels[prerequisite];
      if (!existing || (existing.source === 'inferred' && existing.level < inferred)) {
        levels[prerequisite] = { level: inferred, source: 'inferred', from: fromId };
      }
      seen.add(prerequisite);
      infer(prerequisite, inferred, fromId, depth + 1, seen);
    }
  };

  for (const entry of userSkills) {
    infer(entry.id, entry.level, entry.id, 1, new Set([entry.id]));
  }
  return levels;
};

const levelOf = (levels, id) => levels[id]?.level ?? 0;

/**
 * Every skill reachable through a skill's hard prerequisites. "Any of" groups
 * are skipped: they say nothing about which concrete stack a skill belongs to.
 */
const closureCache = new Map();
const prerequisiteClosure = (skillId) => {
  if (closureCache.has(skillId)) return closureCache.get(skillId);
  const result = new Set();
  const walk = (id) => {
    for (const prereq of getSkill(id)?.prerequisites || []) {
      if (Array.isArray(prereq) || result.has(prereq)) continue;
      result.add(prereq);
      walk(prereq);
    }
  };
  walk(skillId);
  closureCache.set(skillId, result);
  return result;
};

/** Baseline pull of a role's own stack on "any of" choices. */
const ROLE_STACK_WEIGHT = 40;

/**
 * Resolve every "any of" requirement in a role to one concrete skill so the
 * resulting stack is coherent:
 *   1. If the user already knows an option, use the strongest one.
 *   2. Otherwise prefer the option most connected (through prerequisites) to
 *      what the user knows and to the rest of the role's stack — e.g. a
 *      Node.js runtime pulls Express over FastAPI.
 *   3. Ties fall back to the role's default order.
 */
export const resolveRequirementSkills = (role, levels) => {
  const anchors = new Map();
  const anchor = (id, weight) => anchors.set(id, Math.max(anchors.get(id) || 0, weight));
  for (const [id, entry] of Object.entries(levels)) if (entry.source === 'self') anchor(id, entry.level);
  for (const requirement of role.requirements) {
    if (requirement.skills.length === 1) anchor(requirement.skills[0], ROLE_STACK_WEIGHT);
  }

  const resolved = {};
  const multi = role.requirements.filter((r) => r.skills.length > 1);
  for (const requirement of role.requirements) {
    if (requirement.skills.length === 1) resolved[requirement.key] = requirement.skills[0];
  }

  for (const requirement of multi) {
    const best = [...requirement.skills].sort((a, b) => levelOf(levels, b) - levelOf(levels, a))[0];
    if (levelOf(levels, best) > 0) {
      resolved[requirement.key] = best;
      anchor(best, Math.max(levelOf(levels, best), ROLE_STACK_WEIGHT));
    }
  }

  for (const requirement of multi) {
    if (resolved[requirement.key]) continue;
    let pick = requirement.skills[0];
    let pickScore = -1;
    for (const option of requirement.skills) {
      const closure = prerequisiteClosure(option);
      let score = 0;
      for (const [id, weight] of anchors) {
        if (id === option) continue;
        if (closure.has(id) || prerequisiteClosure(id).has(option)) score = Math.max(score, weight);
      }
      if (score > pickScore) {
        pick = option;
        pickScore = score;
      }
    }
    resolved[requirement.key] = pick;
    anchor(pick, ROLE_STACK_WEIGHT);
  }
  return resolved;
};

export const priorityFor = (gap, importance) => {
  if (gap <= 0) return null;
  const weight = IMPORTANCE[importance]?.weight ?? 2;
  if (weight >= 3 && gap >= 45) return 'critical';
  if ((weight >= 3 && gap >= 25) || (weight === 2 && gap >= 50) || (weight === 4 && gap >= 15)) return 'high';
  if (gap >= 20) return 'medium';
  return 'low';
};

/** Default roadmap inclusion: every gap except LOW, unless the user overrode it. */
export const isIncludedInRoadmap = (item, overrides = {}) => {
  if (!item.priority) return false;
  const override = overrides[item.key];
  if (override === 'include') return true;
  if (override === 'exclude') return false;
  return item.priority !== 'low';
};

export const suggestedAction = (item) => {
  if (!item.gap) return 'met';
  return item.gap >= 20 ? 'add' : 'review';
};

/**
 * Analyse one role against the user's skills.
 * Returns null if the role has no requirements.
 */
export const analyzeRole = (role, userSkills = [], precomputedLevels) => {
  if (!role?.requirements?.length) return null;
  const levels = precomputedLevels || buildSkillLevels(userSkills);

  let weightedCoverage = 0;
  let totalWeight = 0;
  const resolved = resolveRequirementSkills(role, levels);

  const items = role.requirements.map((requirement) => {
    const skillId = resolved[requirement.key];
    const skill = getSkill(skillId, requirement.skillNames?.[skillId]);
    const entry = levels[skillId];
    const current = entry?.level ?? 0;
    const required = requirement.level;
    const gap = Math.max(0, required - current);
    const weight = IMPORTANCE[requirement.importance]?.weight ?? 2;
    const coverage = required ? Math.min(1, current / required) : 1;
    const priority = priorityFor(gap, requirement.importance);

    weightedCoverage += coverage * weight;
    totalWeight += weight;

    return {
      key: requirement.key,
      label: requirementLabel(requirement),
      skillId,
      skillName: skill?.name || skillId,
      category: skill?.category || 'Custom',
      options: requirement.skills.length > 1 ? requirement.skills : null,
      current,
      required,
      gap,
      coverage,
      importance: requirement.importance,
      weight,
      priority,
      priorityScore: gap * weight,
      inferred: entry?.source === 'inferred',
      inferredFrom: entry?.source === 'inferred' ? getSkill(entry.from)?.name || entry.from : null,
      status: gap === 0 ? 'met' : current >= required * STRENGTH_RATIO ? 'close' : 'gap',
    };
  });

  const readiness = totalWeight ? Math.round((weightedCoverage / totalWeight) * 100) : 0;

  const byPriority = (a, b) =>
    PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank || b.priorityScore - a.priorityScore;

  const strengths = items
    .filter((item) => item.current > 0 && item.current >= item.required * STRENGTH_RATIO)
    .sort((a, b) => b.current - a.current);
  const gaps = items.filter((item) => item.gap > 0).sort(byPriority);

  const requiredIds = new Set(items.map((item) => item.skillId));
  const transferable = userSkills
    .filter((entry) => !requiredIds.has(entry.id))
    .map((entry) => ({ ...entry, name: entry.name || getSkill(entry.id)?.name || entry.id }));

  const counts = { met: items.length - gaps.length, gaps: gaps.length };
  for (const priority of PRIORITY_ORDER) counts[priority] = gaps.filter((g) => g.priority === priority).length;

  return {
    roleId: role.id,
    roleName: role.name,
    readiness,
    items,
    strengths,
    gaps,
    priorityGaps: gaps.filter((g) => g.priority === 'critical' || g.priority === 'high'),
    recommended: [...gaps].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5),
    transferable,
    counts,
    levels,
  };
};

/** Rank every role (plus an optional custom role) by readiness. */
export const rankCareerMatches = (userSkills = [], extraRoles = []) => {
  const levels = buildSkillLevels(userSkills);
  return [...ROLES, ...extraRoles]
    .map((role) => ({ role, analysis: analyzeRole(role, userSkills, levels) }))
    .filter((match) => match.analysis)
    .sort((a, b) => b.analysis.readiness - a.analysis.readiness);
};

/**
 * Compact record for history and campus analytics. Keeps the field names the
 * original app wrote so existing admin reports keep working.
 */
export const toAnalysisSnapshot = (analysis, reason = 'analysis') => ({
  career_role: analysis.roleName,
  role_id: analysis.roleId,
  readiness_score: analysis.readiness,
  matched_skills: analysis.strengths.map((item) => item.skillName),
  missing_skills: analysis.gaps.map((item) => item.skillName),
  recommended_skills: analysis.recommended.map((item) => item.skillName),
  gaps: analysis.gaps.map(({ key, skillId, skillName, current, required, gap, priority }) => ({
    key,
    skillId,
    skillName,
    current,
    required,
    gap,
    priority,
  })),
  reason,
});

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
