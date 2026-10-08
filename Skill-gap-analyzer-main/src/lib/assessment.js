/**
 * Assessment scoring and how results move skill levels.
 */

import { PASS_PCT } from '../data/assessments/index.js';

export const scoreAssessment = (questions, answers) => {
  let correct = 0;
  const byLevel = {};
  const review = questions.map((question) => {
    const chosen = answers[question.id];
    const isCorrect = chosen === question.answer;
    if (isCorrect) correct += 1;
    byLevel[question.level] ||= { correct: 0, total: 0 };
    byLevel[question.level].total += 1;
    if (isCorrect) byLevel[question.level].correct += 1;
    return { question, chosen, isCorrect };
  });
  const total = questions.length;
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0, byLevel, review };
};

/**
 * Blend the previous level with the score so one quiz doesn't swing a level
 * wildly. e.g. 48% before and 8/10 → 67%.
 */
export const levelAfterAssessment = (before, pct) => {
  const next = before > 0 ? 0.4 * before + 0.6 * pct : 0.8 * pct;
  return Math.max(0, Math.min(95, Math.round(next)));
};

export const passed = (pct) => pct >= PASS_PCT;

/** What the roadmap does next with this result. */
export const recommendationFor = (pct, skillName) => {
  if (pct < 60) {
    return {
      action: 'repeat',
      title: `Repeat ${skillName} fundamentals`,
      detail: 'Your roadmap will bring back the basics before moving on.',
    };
  }
  if (pct >= 85) {
    return {
      action: 'advance',
      title: 'Skip beginner content',
      detail: `Your roadmap will move you to advanced ${skillName} topics.`,
    };
  }
  return {
    action: 'continue',
    title: passed(pct) ? 'Keep going' : 'Review the topics you missed',
    detail: passed(pct) ? 'You passed — continue with the next roadmap phase.' : `Revisit the explanations below, then retake to reach ${PASS_PCT}%.`,
  };
};

/** Latest result per skill from the history list. */
export const latestBySkill = (history = []) => {
  const map = {};
  for (const entry of history) {
    if (!map[entry.skillId] || entry.at > map[entry.skillId].at) map[entry.skillId] = entry;
  }
  return map;
};
