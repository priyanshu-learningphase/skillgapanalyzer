/**
 * Project recommendations ranked against the user's gaps and target role.
 */

import { PROJECTS, projectForSkill } from '../data/projects.js';
import { getSkill } from '../data/skills.js';

const PRIORITY_WEIGHT = { critical: 3, important: 2, optional: 1 };
const DIFFICULTY_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };

/** A generic project for skills the catalog doesn't cover yet. */
export const genericProjectFor = (skillId, roleId) => {
  const skill = getSkill(skillId);
  if (!skill) return null;
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: `skill-${skillId.replace(/[^a-z0-9-]/gi, '-')}`,
    title: skill.project,
    difficulty: 'Intermediate',
    hours: Math.max(6, Math.round(skill.hours * 0.25)),
    skills: [skillId],
    primary: [skillId],
    roles: roleId ? [roleId] : [],
    problem: `Prove your ${skill.name} skills with a focused, portfolio-ready project.`,
    features: (skill.topics || []).slice(-3).map((topic) => `Apply ${topic.charAt(0).toLowerCase()}${topic.slice(1)}`).concat('Clear README with setup steps and screenshots'),
    stack: [skill.name],
    outcome: `A public repository that shows practical ${skill.name} experience.`,
    demonstrates: [skill.name],
    structure: [`${slug}-project/`, '├── src/', '├── tests/', '├── docs/', '└── README.md'].join('\n'),
    generated: true,
  };
};

/**
 * Rank projects for a user.
 * @returns {Array<{ project, score, covers: string[], reason: string }>}
 */
export const recommendProjects = ({ analysis, roleId, level = 'intermediate', statuses = {}, limit = 6 }) => {
  if (!analysis) return [];
  const gapWeight = new Map();
  for (const gap of analysis.gaps) gapWeight.set(gap.skillId, { weight: PRIORITY_WEIGHT[gap.priority] || 1, name: gap.skillName, priority: gap.priority });
  const userRank = LEVEL_RANK[level] ?? 1;

  const scored = PROJECTS.map((project) => {
    const covers = project.skills.filter((id) => gapWeight.has(id));
    let score = covers.reduce((sum, id) => sum + gapWeight.get(id).weight * (project.primary.includes(id) ? 1.5 : 1), 0);
    if (project.roles.includes(roleId)) score += 2;
    const fit = DIFFICULTY_RANK[project.difficulty] - userRank;
    if (fit > 1) score -= 2;
    else if (fit < -1) score -= 1;
    return { project, score, covers };
  }).filter((entry) => entry.covers.length > 0 || entry.project.roles.includes(roleId));

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.filter((entry) => statuses[entry.project.id] !== 'completed').slice(0, limit);

  // Every critical/important gap should have at least one project.
  const covered = new Set(picked.flatMap((entry) => entry.covers));
  for (const gap of analysis.gaps) {
    if (gap.priority === 'optional' || covered.has(gap.skillId)) continue;
    const project = projectForSkill(gap.skillId, roleId) || genericProjectFor(gap.skillId, roleId);
    if (!project || picked.some((entry) => entry.project.id === project.id) || statuses[project.id] === 'completed') continue;
    picked.push({ project, score: PRIORITY_WEIGHT[gap.priority], covers: [gap.skillId] });
    covered.add(gap.skillId);
  }

  return picked.map((entry) => {
    const names = entry.covers.map((id) => gapWeight.get(id)?.name || getSkill(id)?.name).filter(Boolean);
    const critical = entry.covers.filter((id) => gapWeight.get(id)?.priority === 'critical').map((id) => gapWeight.get(id).name);
    return {
      ...entry,
      covers: names,
      reason: critical.length ? `Closes critical gaps: ${critical.join(', ')}` : names.length ? `Builds ${names.slice(0, 3).join(', ')}` : 'Strong portfolio piece for your target role',
    };
  });
};
