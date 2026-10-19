/**
 * Evidence behind each skill level, strongest first:
 *
 *   practical — passed a practical challenge in the verification lab
 *   quiz      — passed the skill's auto-graded assessment (70%+)
 *   project   — completed a portfolio project that uses the skill
 *   self      — self-rated, or imported from a resume/GitHub (unverified)
 *
 * Only `practical` and `quiz` count as verified. Imported levels are still
 * self-reported: they come from what the user wrote, not from a test.
 */

import { PROJECT_MAP } from '../data/projects.js';
import { PASS_PCT } from '../data/assessments/index.js';

export const EVIDENCE_LEVELS = {
  practical: { label: 'Practically assessed', short: 'Practical', rank: 4, verified: true, tone: 'success' },
  quiz: { label: 'Quiz-assessed', short: 'Quiz', rank: 3, verified: true, tone: 'accent' },
  project: { label: 'Project-supported', short: 'Project', rank: 2, verified: false, tone: 'neutral' },
  self: { label: 'Self-reported', short: 'Self-reported', rank: 1, verified: false, tone: 'outline' },
  none: { label: 'No evidence', short: 'None', rank: 0, verified: false, tone: 'outline' },
};

const SOURCE_LABEL = {
  onboarding: 'Rated during onboarding',
  'check-in': 'Topic check-in (self-rated)',
  import: 'Imported from your resume or GitHub',
  manual: 'Edited in My Skills',
  edit: 'Edited in My Skills',
};

/**
 * @returns {Record<string, { level, verified, items: Array<{ type, label, detail, at }> }>}
 */
export const buildEvidence = ({ career, progress, latestAssessments = {} }) => {
  const byId = {};
  const add = (skillId, item) => {
    if (!skillId) return;
    byId[skillId] ||= { items: [] };
    byId[skillId].items.push(item);
  };

  const lastSource = {};
  for (const h of progress?.skillHistory || []) lastSource[h.skillId] = h;
  for (const skill of career?.skills || []) {
    if (!(skill.level > 0)) continue;
    const h = lastSource[skill.id];
    const fromTest = h && ['quiz', 'project', 'practical'].includes(h.source);
    add(skill.id, {
      type: 'self',
      label: fromTest ? 'Current level (set by a result below)' : SOURCE_LABEL[h?.source] || 'Self-rated level',
      detail: `${skill.level}%`,
      at: h?.date || null,
    });
  }

  for (const [skillId, a] of Object.entries(latestAssessments)) {
    add(skillId, {
      type: a.pct >= PASS_PCT ? 'quiz' : 'quiz-attempt',
      label: a.pct >= PASS_PCT ? 'Passed the assessment' : 'Assessment attempted (below pass mark)',
      detail: `${a.correct}/${a.total} correct (${a.pct}%)`,
      at: a.at,
    });
  }

  for (const [projectId, p] of Object.entries(progress?.projects || {})) {
    if (p.status !== 'completed') continue;
    const skills = PROJECT_MAP[projectId]?.skills || (projectId.startsWith('skill-') ? [projectId.slice(6)] : []);
    for (const skillId of skills) add(skillId, { type: 'project', label: 'Completed project', detail: p.title || projectId, at: p.at });
  }

  for (const v of progress?.verifications || []) {
    if (!v.passed) continue;
    add(v.skillId, { type: 'practical', label: `Passed practical challenge (${v.difficulty})`, detail: v.title, at: v.at });
  }

  for (const entry of Object.values(byId)) {
    const types = new Set(entry.items.map((i) => i.type));
    entry.level = types.has('practical') ? 'practical' : types.has('quiz') ? 'quiz' : types.has('project') ? 'project' : types.has('self') || types.has('quiz-attempt') ? 'self' : 'none';
    entry.verified = EVIDENCE_LEVELS[entry.level].verified;
    entry.items.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }
  return byId;
};

export const evidenceFor = (evidence, skillId) => evidence[skillId] || { level: 'none', verified: false, items: [] };

/** Counts per evidence level across a list of skill ids. */
export const evidenceSummary = (evidence, skillIds) => {
  const counts = { practical: 0, quiz: 0, project: 0, self: 0, none: 0 };
  for (const id of skillIds) counts[evidenceFor(evidence, id).level] += 1;
  return counts;
};
