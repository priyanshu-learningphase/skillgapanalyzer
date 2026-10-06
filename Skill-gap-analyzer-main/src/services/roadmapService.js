/**
 * Roadmap generation pipeline
 *
 *   1. planRoadmap()  — deterministic, dependency-aware plan (always runs)
 *   2. AI enrichment  — optional; personalises each phase via /api
 *   3. validation     — the AI output is re-validated in the browser too
 *
 * If AI is unavailable or fails, the rule-based plan is returned along with
 * the reason, so the UI can say so honestly and offer a retry.
 */

import { planRoadmap } from '../lib/roadmap';
import { applyEnrichment, buildEnrichmentRequest, validateEnrichment } from '../lib/roadmapSchema';
import { enrichRoadmap, getAiStatus } from './aiService';

export const GENERATION_STAGES = [
  { id: 'analyze', label: 'Analysing your skill gaps' },
  { id: 'order', label: 'Ordering skills by prerequisites' },
  { id: 'schedule', label: 'Fitting it to your schedule' },
  { id: 'ai', label: 'Personalising each phase' },
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateRoadmap = async ({ role, profile, analysis, carryOver = [], useAi = true, onStage, signal }) => {
  onStage?.('analyze');
  await pause(250);
  onStage?.('order');
  const planned = planRoadmap({ role, profile, analysis, carryOver });
  await pause(250);
  onStage?.('schedule');
  await pause(200);

  if (!useAi) return { roadmap: planned, ai: { status: 'skipped' } };

  const status = await getAiStatus();
  if (!status.enabled) {
    return { roadmap: planned, ai: { status: 'unavailable', reachable: status.reachable } };
  }

  onStage?.('ai');
  try {
    const request = buildEnrichmentRequest({ roadmap: planned, analysis, profile });
    const data = await enrichRoadmap(request, { signal });
    const validation = validateEnrichment({ roadmap: data.roadmap }, request.plan);
    if (!validation.ok) {
      return { roadmap: planned, ai: { status: 'failed', message: 'The AI response failed validation.' } };
    }
    return { roadmap: applyEnrichment(planned, validation.phases, { model: data.model }), ai: { status: 'applied', model: data.model } };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return { roadmap: planned, ai: { status: 'failed', message: error.message, code: error.code } };
  }
};
