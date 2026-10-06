/**
 * AI roadmap contract
 *
 * Shared by the browser and the API server. The deterministic planner decides
 * WHAT to learn and in which order; the model only personalises each phase
 * (title, rationale, concrete tasks, practice, project, resource suggestions).
 * Every response is validated against the plan before it is used, and
 * anything malformed is rejected so the UI falls back to the rule-based plan.
 */

import { searchUrlFor, slugify } from '../data/skills.js';

export const RESOURCE_TYPES = ['docs', 'video', 'course', 'article', 'practice', 'project'];

const LIMITS = {
  title: 80,
  why: 480,
  task: 140,
  practice: 200,
  projectTitle: 120,
  projectDescription: 320,
  resourceTitle: 100,
  minTasks: 2,
  maxTasks: 10,
  maxResources: 4,
  minCoverage: 0.6,
};

/** Build the structured request body sent to /api/roadmap/enrich. */
export const buildEnrichmentRequest = ({ roadmap, analysis, profile }) => ({
  targetRole: roadmap.roleName,
  experienceLevel: profile.level,
  currentSkills: (profile.skills || []).map((s) => ({ name: s.name, level: Math.round(s.level) })),
  skillGaps: analysis.gaps.map((g) => ({ name: g.skillName, current: g.current, required: g.required, priority: g.priority })),
  dailyLearningTime: Math.round(((profile.dailyMinutes || 60) / 60) * 10) / 10,
  timelineWeeks: profile.timelineWeeks ?? null,
  // Completed phases carried over from an earlier plan don't need new content.
  plan: roadmap.phases.filter((phase) => !phase.carried).map((phase) => ({
    phaseId: phase.id,
    kind: phase.kind,
    weekStart: phase.weekStart,
    weekEnd: phase.weekEnd,
    phase: phase.title,
    skills: phase.skills.map((s) => ({ name: s.name, current: s.current, target: s.target, reason: s.reason })),
    estimatedHours: phase.estimatedHours,
    topics: phase.tasks.filter((t) => t.type === 'learn' || t.type === 'stretch').map((t) => t.title),
    alreadyKnown: phase.skippedTopics,
  })),
});

/** Lightweight validation of the request on the server. Returns an error string or null. */
export const validateEnrichmentRequest = (body) => {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';
  if (typeof body.targetRole !== 'string' || !body.targetRole.trim()) return 'targetRole is required.';
  if (!Array.isArray(body.plan) || body.plan.length === 0) return 'plan must be a non-empty array.';
  if (body.plan.length > 40) return 'plan is too large.';
  for (const phase of body.plan) {
    if (typeof phase?.phaseId !== 'string' || typeof phase?.phase !== 'string') return 'Each plan phase needs phaseId and phase.';
  }
  return null;
};

/** JSON schema handed to the model so it returns structured output. */
export const ENRICHMENT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    roadmap: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          phaseId: { type: 'string' },
          week: { type: 'integer' },
          phase: { type: 'string' },
          why: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' }, hours: { type: 'number' } },
              required: ['title'],
            },
          },
          estimatedHours: { type: 'number' },
          practice: { type: 'string' },
          project: {
            type: 'object',
            properties: { title: { type: 'string' }, description: { type: 'string' } },
            required: ['title'],
          },
          resources: {
            type: 'array',
            items: {
              type: 'object',
              properties: { type: { type: 'string', enum: RESOURCE_TYPES }, title: { type: 'string' } },
              required: ['type', 'title'],
            },
          },
        },
        required: ['phaseId', 'phase', 'why', 'tasks'],
      },
    },
  },
  required: ['roadmap'],
};

/** Strip markdown, control characters and excess whitespace; enforce a length. */
const cleanText = (value, max) => {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[*_`#>]+/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
};

/**
 * Validate a model response against the plan it was asked to enrich.
 *
 * @returns {{ ok: true, phases: Record<string, object> } | { ok: false, error: string }}
 */
export const validateEnrichment = (response, plan) => {
  if (!response || typeof response !== 'object' || !Array.isArray(response.roadmap)) {
    return { ok: false, error: 'Response is missing a roadmap array.' };
  }
  const planById = new Map(plan.map((phase) => [phase.phaseId, phase]));
  const phases = {};

  for (const entry of response.roadmap) {
    if (!entry || typeof entry !== 'object') continue;
    const planned = planById.get(entry.phaseId);
    if (!planned || phases[entry.phaseId]) continue;

    const known = new Set((planned.alreadyKnown || []).map((t) => t.split(': ').pop().toLowerCase()));
    const tasks = (Array.isArray(entry.tasks) ? entry.tasks : [])
      .map((task) => (typeof task === 'string' ? { title: task } : task))
      .map((task) => ({
        title: cleanText(task?.title, LIMITS.task),
        hours: Number.isFinite(task?.hours) && task.hours > 0 && task.hours <= 80 ? task.hours : null,
      }))
      .filter((task) => task.title.length >= 3 && !known.has(task.title.toLowerCase()))
      .slice(0, LIMITS.maxTasks);

    const why = cleanText(entry.why, LIMITS.why);
    if (tasks.length < LIMITS.minTasks || why.length < 20) continue;

    const project =
      entry.project && typeof entry.project === 'object' && cleanText(entry.project.title, LIMITS.projectTitle)
        ? {
            title: cleanText(entry.project.title, LIMITS.projectTitle),
            description: cleanText(entry.project.description, LIMITS.projectDescription),
          }
        : null;

    const resources = (Array.isArray(entry.resources) ? entry.resources : [])
      .filter((r) => r && RESOURCE_TYPES.includes(r.type) && cleanText(r.title, LIMITS.resourceTitle).length >= 3)
      .slice(0, LIMITS.maxResources)
      .map((r) => ({ type: r.type, title: cleanText(r.title, LIMITS.resourceTitle) }));

    phases[entry.phaseId] = {
      title: cleanText(entry.phase, LIMITS.title) || planned.phase,
      why,
      tasks,
      practice: cleanText(entry.practice, LIMITS.practice),
      project,
      resources,
    };
  }

  const coverage = Object.keys(phases).length / plan.length;
  if (coverage < LIMITS.minCoverage) {
    return { ok: false, error: `Response covered ${Math.round(coverage * 100)}% of phases; at least ${LIMITS.minCoverage * 100}% is required.` };
  }
  return { ok: true, phases };
};

const inferTaskType = (title) => {
  if (/\b(build|project|implement|deploy|ship|create)\b/i.test(title)) return 'build';
  if (/\b(solve|practi[cs]e|problems?|exercises?|drill|mock|labs?|challenges?)\b/i.test(title)) return 'practice';
  return 'learn';
};

const roundHalf = (value) => Math.round(value * 2) / 2;

/**
 * Apply validated enrichment to a planned roadmap. Ordering, weeks, hours and
 * prerequisites always come from the planner; task hours are rescaled so the
 * phase total stays the same.
 */
export const applyEnrichment = (roadmap, phases, meta = {}) => ({
  ...roadmap,
  source: 'ai',
  ai: { model: meta.model || null, enrichedAt: new Date().toISOString() },
  phases: roadmap.phases.map((phase) => {
    const enrichment = phases[phase.id];
    if (!enrichment) return phase;
    const rawHours = enrichment.tasks.map((t) => t.hours ?? 1);
    const rawTotal = rawHours.reduce((s, h) => s + h, 0) || 1;
    const scale = phase.estimatedHours / rawTotal;
    const skillFor = (title) =>
      phase.skills.find((s) => title.toLowerCase().includes(s.name.toLowerCase()))?.id || phase.skills[0]?.id || null;
    const seen = new Set();
    const tasks = enrichment.tasks
      .map((task, index) => {
        let id = `${phase.id}:ai:${slugify(task.title)}`;
        while (seen.has(id)) id = `${id}-${index}`;
        seen.add(id);
        return {
          id,
          title: task.title,
          type: inferTaskType(task.title),
          hours: Math.max(0.5, roundHalf(rawHours[index] * scale)),
          skillId: skillFor(task.title),
        };
      });
    const aiResources = enrichment.resources.map((r) => ({
      type: r.type,
      title: r.title,
      url: searchUrlFor(r.type, `${r.title} ${phase.title}`),
      suggested: true,
    }));
    return {
      ...phase,
      title: enrichment.title || phase.title,
      why: enrichment.why,
      tasks,
      practice: enrichment.practice || phase.practice,
      project: enrichment.project || phase.project,
      resources: [...phase.resources.slice(0, 3), ...aiResources].slice(0, 6),
    };
  }),
});
