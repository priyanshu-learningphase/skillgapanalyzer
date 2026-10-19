/**
 * AI answer-feedback contract
 *
 * Shared by the browser and the API server. The request carries one question
 * and the user's typed answer; the reply is checked here before it is shown,
 * and anything malformed is rejected.
 */

import { MAX_ANSWER_CHARS, MOCK_KINDS } from './mockInterview.js';

export const FEEDBACK_VERDICTS = ['strong', 'solid', 'needs-work'];

const LIMITS = {
  role: 80,
  question: 400,
  point: 160,
  maxPoints: 6,
  minAnswerWords: 15,
  summary: 400,
  item: 240,
  maxItems: 3,
  opening: 300,
};

/** The request body for /api/interview/feedback. */
export const buildFeedbackRequest = ({ role, question }) => ({
  role: String(role || '').slice(0, LIMITS.role),
  kind: question.kind,
  question: question.question,
  points: (question.points || []).slice(0, LIMITS.maxPoints),
  answer: String(question.answer || '').slice(0, MAX_ANSWER_CHARS),
});

/** Server-side validation. Returns an error string or null. */
export const validateFeedbackRequest = (body) => {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';
  if (typeof body.role !== 'string' || !body.role.trim() || body.role.length > LIMITS.role) return 'role is required (up to 80 characters).';
  if (!MOCK_KINDS[body.kind]) return 'kind is not a known question type.';
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > LIMITS.question) return 'question is required (up to 400 characters).';
  if (!Array.isArray(body.points) || body.points.length > LIMITS.maxPoints || body.points.some((p) => typeof p !== 'string' || p.length > LIMITS.point)) {
    return 'points must be a short list of strings.';
  }
  if (typeof body.answer !== 'string' || body.answer.length > MAX_ANSWER_CHARS) return `answer is required (up to ${MAX_ANSWER_CHARS} characters).`;
  if (body.answer.trim().split(/\s+/).length < LIMITS.minAnswerWords) return `Write at least ${LIMITS.minAnswerWords} words to get feedback.`;
  return null;
};

/** Only the fields the model needs, so extra request properties never reach the prompt. */
export const feedbackPayload = (body) => ({ role: body.role, questionType: MOCK_KINDS[body.kind].label, question: body.question, strongAnswerCovers: body.points, answer: body.answer });

export const FEEDBACK_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: FEEDBACK_VERDICTS },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    strongerOpening: { type: 'string' },
  },
  required: ['verdict', 'summary', 'strengths', 'improvements'],
};

// Plain text only: strip markdown emphasis, headings and code ticks the model may add anyway.
const clean = (value, max) =>
  String(value || '')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const cleanList = (list) => (Array.isArray(list) ? list.map((item) => clean(item, LIMITS.item)).filter(Boolean).slice(0, LIMITS.maxItems) : []);

/** Validate and tidy a model reply. Returns { ok, feedback } or { ok: false, error }. */
export const validateFeedback = (raw) => {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Reply is not an object.' };
  if (!FEEDBACK_VERDICTS.includes(raw.verdict)) return { ok: false, error: 'Unknown verdict.' };
  const summary = clean(raw.summary, LIMITS.summary);
  if (!summary) return { ok: false, error: 'Missing summary.' };
  const strengths = cleanList(raw.strengths);
  const improvements = cleanList(raw.improvements);
  if (!strengths.length && !improvements.length) return { ok: false, error: 'No strengths or improvements.' };
  return { ok: true, feedback: { verdict: raw.verdict, summary, strengths, improvements, strongerOpening: clean(raw.strongerOpening, LIMITS.opening) || null } };
};
