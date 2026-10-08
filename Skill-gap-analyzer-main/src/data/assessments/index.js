/**
 * Assessment banks by skill id. Skills without a bank fall back to the
 * self-reported topic check-in.
 */

import { WEB_BANK } from './web.js';
import { BACKEND_BANK } from './backend.js';
import { CS_BANK } from './cs.js';
import { INFRA_BANK } from './infra.js';
import { DATA_BANK } from './data.js';
import { SECURITY_BANK } from './security.js';

const BANKS = { ...WEB_BANK, ...BACKEND_BANK, ...CS_BANK, ...INFRA_BANK, ...DATA_BANK, ...SECURITY_BANK };

export const ASSESSMENT_SKILL_IDS = Object.keys(BANKS);

export const hasAssessment = (skillId) => Boolean(BANKS[skillId]?.length);

/** Small deterministic PRNG so option order is stable for a given question. */
const seeded = (seedText) => {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

/**
 * Shuffle options per question (seeded by its id) so the correct answer isn't
 * predictable by position, while staying identical across reloads.
 */
const shuffleOptions = (question, id) => {
  const random = seeded(id);
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...question, options: order.map((i) => question.options[i]), answer: order.indexOf(question.answer) };
};

/** Questions for a skill, each with a stable id. */
export const getAssessment = (skillId) =>
  (BANKS[skillId] || []).map((question, index) => {
    const id = `${skillId}-${index + 1}`;
    return { ...shuffleOptions(question, id), id };
  });

/** Passing score for an assessment. */
export const PASS_PCT = 70;
