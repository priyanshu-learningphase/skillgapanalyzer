/**
 * API routes
 *
 *   GET  /api/health          → { ok, ai: { enabled, model } }
 *   POST /api/roadmap/enrich  → { roadmap: [...] } validated against the plan
 *   POST /api/interview/feedback → { feedback } on one mock-interview answer
 *   POST /api/execute         → run Python on a configured Judge0 service
 *   GET  /api/market          → skill demand from real job ads (Adzuna), aggregated
 *
 * Exposed as connect-style middleware so the same handler runs inside the
 * Vite dev server and in the standalone production server (server/index.js).
 */

import { aiConfigFrom } from './env.js';
import { AiProviderError, generateJson } from './gemini.js';
import { ROADMAP_SYSTEM_PROMPT } from './prompt.js';
import { INTERVIEW_FEEDBACK_SYSTEM_PROMPT } from './interviewPrompt.js';
import { ExecutionError, executeCode, executionConfigFrom, validateExecutionRequest } from './execute.js';
import { MarketError, createMarketFetcher, isMarketConfigured, marketConfigFrom } from './market.js';
import { aggregateJobAds, EXPERIENCE_LEVELS, MARKET_LIMITATIONS, MARKET_LOCATION_MAP } from '../src/lib/market.js';
import { ROLE_MAP } from '../src/data/roles.js';
import {
  ENRICHMENT_RESPONSE_SCHEMA,
  validateEnrichment,
  validateEnrichmentRequest,
} from '../src/lib/roadmapSchema.js';
import { FEEDBACK_RESPONSE_SCHEMA, feedbackPayload, validateFeedback, validateFeedbackRequest } from '../src/lib/interviewFeedbackSchema.js';

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 12 };
const EXECUTE_LIMIT = { windowMs: 10 * 60 * 1000, max: 40 };
const MARKET_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 };
const FEEDBACK_LIMIT = { windowMs: 10 * 60 * 1000, max: 30 };

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });

/** Fixed-window, in-memory rate limiter per client IP. */
const createRateLimiter = ({ windowMs, max }) => {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= max;
  };
};

export const createApiMiddleware = (env = process.env) => {
  const ai = aiConfigFrom(env);
  const allow = createRateLimiter(RATE_LIMIT);
  const execution = executionConfigFrom(env);
  const allowExecute = createRateLimiter(EXECUTE_LIMIT);
  const market = marketConfigFrom(env);
  const fetchMarket = createMarketFetcher(market);
  const allowMarket = createRateLimiter(MARKET_LIMIT);
  const allowFeedback = createRateLimiter(FEEDBACK_LIMIT);
  const clientIpOf = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();

    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          ok: true,
          ai: { enabled: Boolean(ai.apiKey), model: ai.apiKey ? ai.model : null },
          execution: { enabled: Boolean(execution.url), languages: execution.url ? Object.keys(execution.languages) : [] },
          market: { enabled: isMarketConfigured(market), provider: isMarketConfigured(market) ? 'Adzuna' : null },
        });
      }

      if (url.pathname === '/api/roadmap/enrich') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
        if (!ai.apiKey) {
          return sendJson(res, 503, { error: 'ai_unavailable', message: 'AI personalisation is not configured on the server.' });
        }
        const clientIp = clientIpOf(req);
        if (!allow(clientIp)) {
          return sendJson(res, 429, { error: 'rate_limited', message: 'Too many roadmap requests. Try again in a few minutes.' });
        }

        const body = await readJsonBody(req);
        const invalid = validateEnrichmentRequest(body);
        if (invalid) return sendJson(res, 400, { error: 'invalid_request', message: invalid });

        const raw = await generateJson({
          apiKey: ai.apiKey,
          model: ai.model,
          timeoutMs: ai.timeoutMs,
          systemPrompt: ROADMAP_SYSTEM_PROMPT,
          payload: body,
          schema: ENRICHMENT_RESPONSE_SCHEMA,
        });

        const result = validateEnrichment(raw, body.plan);
        if (!result.ok) {
          console.warn(`[skillgap] Rejected AI roadmap: ${result.error}`);
          return sendJson(res, 502, { error: 'ai_invalid_response', message: 'The AI response did not pass validation.' });
        }
        // Respond in the same contract shape the model uses, so the browser can
        // re-validate it with the same function.
        return sendJson(res, 200, {
          model: ai.model,
          roadmap: Object.entries(result.phases).map(([phaseId, { title, ...phase }]) => ({ phaseId, phase: title, ...phase })),
        });
      }

      if (url.pathname === '/api/interview/feedback') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
        if (!ai.apiKey) return sendJson(res, 503, { error: 'ai_unavailable', message: 'AI feedback is not configured on the server.' });
        if (!allowFeedback(clientIpOf(req))) return sendJson(res, 429, { error: 'rate_limited', message: 'Too many feedback requests. Try again in a few minutes.' });
        const body = await readJsonBody(req);
        const invalid = validateFeedbackRequest(body);
        if (invalid) return sendJson(res, 400, { error: 'invalid_request', message: invalid });
        const raw = await generateJson({
          apiKey: ai.apiKey,
          model: ai.model,
          timeoutMs: ai.timeoutMs,
          systemPrompt: INTERVIEW_FEEDBACK_SYSTEM_PROMPT,
          payload: feedbackPayload(body),
          schema: FEEDBACK_RESPONSE_SCHEMA,
        });
        const result = validateFeedback(raw);
        if (!result.ok) {
          console.warn(`[skillgap] Rejected AI feedback: ${result.error}`);
          return sendJson(res, 502, { error: 'ai_invalid_response', message: 'The AI response did not pass validation.' });
        }
        return sendJson(res, 200, { model: ai.model, feedback: result.feedback });
      }

      if (url.pathname === '/api/execute') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
        if (!execution.url) {
          return sendJson(res, 501, { error: 'not_configured', message: 'No code-execution service is configured on the server.' });
        }
        if (!allowExecute(clientIpOf(req))) return sendJson(res, 429, { error: 'rate_limited', message: 'Too many runs. Try again in a few minutes.' });
        const body = await readJsonBody(req);
        const invalid = validateExecutionRequest(body, execution);
        if (invalid) return sendJson(res, 400, { error: 'invalid_request', message: invalid });
        return sendJson(res, 200, await executeCode(execution, body));
      }

      if (url.pathname === '/api/market') {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
        if (!isMarketConfigured(market)) {
          return sendJson(res, 501, { configured: false, error: 'not_configured', message: 'No job-market data provider is configured on the server.' });
        }
        const role = ROLE_MAP[url.searchParams.get('role')];
        const location = MARKET_LOCATION_MAP[url.searchParams.get('location') || 'india'];
        const level = url.searchParams.get('level') || 'all';
        if (!role) return sendJson(res, 400, { error: 'invalid_request', message: 'Unknown role.' });
        if (!location) return sendJson(res, 400, { error: 'invalid_request', message: 'Unknown location.' });
        if (!EXPERIENCE_LEVELS.some((l) => l.id === level)) return sendJson(res, 400, { error: 'invalid_request', message: 'Unknown experience level.' });
        if (!allowMarket(clientIpOf(req))) return sendJson(res, 429, { error: 'rate_limited', message: 'Too many requests. Try again in a few minutes.' });
        const query = role.name.toLowerCase();
        const data = await fetchMarket({ query, where: location.where });
        return sendJson(res, 200, {
          configured: true,
          provider: 'Adzuna',
          providerUrl: 'https://www.adzuna.in',
          query,
          role: role.id,
          location: location.label,
          level,
          fetchedAt: data.fetchedAt,
          cached: data.cached,
          totalMatching: data.total,
          ...aggregateJobAds(data.ads, { level }),
          limitations: MARKET_LIMITATIONS,
        });
      }

      return sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof MarketError) return sendJson(res, error.status, { error: error.code, message: error.message });
      if (error instanceof ExecutionError) return sendJson(res, error.status, { error: error.code, message: error.message });
      if (error instanceof AiProviderError) {
        return sendJson(res, error.status, { error: error.code, message: error.message });
      }
      if (error.status) return sendJson(res, error.status, { error: 'bad_request', message: error.message });
      console.error('[skillgap] API error', error);
      return sendJson(res, 500, { error: 'internal_error', message: 'Something went wrong on the server.' });
    }
  };
};
