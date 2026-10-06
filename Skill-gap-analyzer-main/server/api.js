/**
 * API routes
 *
 *   GET  /api/health          → { ok, ai: { enabled, model } }
 *   POST /api/roadmap/enrich  → { roadmap: [...] } validated against the plan
 *
 * Exposed as connect-style middleware so the same handler runs inside the
 * Vite dev server and in the standalone production server (server/index.js).
 */

import { aiConfigFrom } from './env.js';
import { AiProviderError, generateJson } from './gemini.js';
import { ROADMAP_SYSTEM_PROMPT } from './prompt.js';
import {
  ENRICHMENT_RESPONSE_SCHEMA,
  validateEnrichment,
  validateEnrichmentRequest,
} from '../src/lib/roadmapSchema.js';

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 12 };

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

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();

    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { ok: true, ai: { enabled: Boolean(ai.apiKey), model: ai.apiKey ? ai.model : null } });
      }

      if (url.pathname === '/api/roadmap/enrich') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });
        if (!ai.apiKey) {
          return sendJson(res, 503, { error: 'ai_unavailable', message: 'AI personalisation is not configured on the server.' });
        }
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
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

      return sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof AiProviderError) {
        return sendJson(res, error.status, { error: error.code, message: error.message });
      }
      if (error.status) return sendJson(res, error.status, { error: 'bad_request', message: error.message });
      console.error('[skillgap] API error', error);
      return sendJson(res, 500, { error: 'internal_error', message: 'Something went wrong on the server.' });
    }
  };
};
