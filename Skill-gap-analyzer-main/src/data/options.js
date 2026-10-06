/**
 * Option lists used across onboarding and settings.
 */

export const EXPERIENCE_LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    description: 'New to the field or still learning the fundamentals.',
    paceFactor: 1.15,
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    description: 'Comfortable building projects; filling specific gaps.',
    paceFactor: 1,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Working professionally; preparing for a step up or a switch.',
    paceFactor: 0.85,
  },
];

/** Self-assessed proficiency for a single skill, mapped to a 0–100 level. */
export const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', value: 30, hint: 'Know the basics, need guidance' },
  { id: 'intermediate', label: 'Intermediate', value: 60, hint: 'Can build things independently' },
  { id: 'advanced', label: 'Advanced', value: 85, hint: 'Deep, production experience' },
];

export const levelLabel = (value) => {
  if (value >= 80) return 'Advanced';
  if (value >= 50) return 'Intermediate';
  if (value > 0) return 'Beginner';
  return 'None';
};

export const nearestSkillLevel = (value) =>
  SKILL_LEVELS.reduce((best, level) =>
    Math.abs(level.value - value) < Math.abs(best.value - value) ? level : best,
  );

export const DAILY_TIME_OPTIONS = [
  { minutes: 30, label: '30 min/day', hint: 'Light, steady progress' },
  { minutes: 60, label: '1 hour/day', hint: 'A solid default' },
  { minutes: 120, label: '2 hours/day', hint: 'Serious upskilling' },
  { minutes: 180, label: '3+ hours/day', hint: 'Intensive, near full-time' },
];

export const TIMELINE_OPTIONS = [
  { weeks: 4, label: '1 month' },
  { weeks: 12, label: '3 months' },
  { weeks: 26, label: '6 months' },
  { weeks: 52, label: '1 year' },
  { weeks: null, label: 'No deadline' },
];

export const timelineLabel = (weeks) =>
  TIMELINE_OPTIONS.find((option) => option.weeks === weeks)?.label ||
  (weeks ? `${weeks} weeks` : 'No deadline');

export const dailyTimeLabel = (minutes) =>
  DAILY_TIME_OPTIONS.find((option) => option.minutes === minutes)?.label || `${minutes} min/day`;

/** Kept from the original student profile so existing data still renders. */
export const BRANCHES = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Other',
];

export const YEARS = [1, 2, 3, 4];
