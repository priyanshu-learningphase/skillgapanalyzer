/**
 * Practical verification lab: challenges by category and difficulty.
 */

import { SQL_CHALLENGES } from './sql.js';
import { CODE_CHALLENGES } from './code.js';
import { STRUCTURED_CHALLENGES } from './structured.js';
import { WEB_CHALLENGES } from './web.js';

export const LAB_CATEGORIES = [
  { id: 'dsa', label: 'Data structures & algorithms' },
  { id: 'sql', label: 'SQL & databases' },
  { id: 'languages', label: 'Programming languages' },
  { id: 'web', label: 'Web development' },
  { id: 'backend', label: 'Backend & APIs' },
  { id: 'git', label: 'Git & GitHub' },
];

/** A pass sets the skill to at least this level (never lowers it). */
export const DIFFICULTY_META = {
  easy: { label: 'Easy', levelFloor: 45, order: 0 },
  medium: { label: 'Medium', levelFloor: 60, order: 1 },
  hard: { label: 'Hard', levelFloor: 75, order: 2 },
};

export const KIND_META = {
  code: { label: 'Coding', grading: 'Test cases run in an isolated sandbox' },
  sql: { label: 'SQL', grading: 'Queries run on a real SQLite database (two datasets)' },
  structured: { label: 'Practical task', grading: 'Answers matched against accepted commands' },
  html: { label: 'Markup', grading: 'Structure and accessibility checks (no scripts run)' },
};

export const CHALLENGES = [...CODE_CHALLENGES, ...SQL_CHALLENGES, ...WEB_CHALLENGES, ...STRUCTURED_CHALLENGES];
export const CHALLENGE_MAP = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const challengesForSkill = (skillId) => CHALLENGES.filter((c) => c.skillId === skillId);
export const LAB_SKILL_IDS = [...new Set(CHALLENGES.map((c) => c.skillId))];
