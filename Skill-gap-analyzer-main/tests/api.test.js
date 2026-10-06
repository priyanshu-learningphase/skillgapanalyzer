import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createApiMiddleware } from '../server/api.js';
import { ROLE_MAP } from '../src/data/roles.js';
import { analyzeRole } from '../src/lib/analysis.js';
import { planRoadmap } from '../src/lib/roadmap.js';
import { buildEnrichmentRequest, validateEnrichment } from '../src/lib/roadmapSchema.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Invoke the middleware with a fake request and capture the response. */
const call = (middleware, { method = 'GET', url, body }) =>
  new Promise((resolve) => {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    Object.assign(req, { method, url, headers: {}, socket: { remoteAddress: '127.0.0.1' } });
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k] = v;
      },
      end(payload) {
        resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(payload) });
      },
    };
    middleware(req, res, () => resolve({ status: 'next' }));
  });

const samplePlan = () => {
  const profile = {
    targetRoleId: 'backend-developer',
    level: 'intermediate',
    dailyMinutes: 120,
    timelineWeeks: 12,
    skills: [{ id: 'cpp', name: 'C++', level: 82 }],
  };
  const role = ROLE_MAP[profile.targetRoleId];
  const analysis = analyzeRole(role, profile.skills);
  const roadmap = planRoadmap({ role, profile, analysis });
  return buildEnrichmentRequest({ roadmap, analysis, profile });
};

const geminiReply = (json) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }),
});

test('health reports AI disabled without a key and never leaks it', async () => {
  const off = await call(createApiMiddleware({}), { url: '/api/health' });
  assert.deepEqual(off.body, { ok: true, ai: { enabled: false, model: null } });
  const on = await call(createApiMiddleware({ GEMINI_API_KEY: 'secret-key' }), { url: '/api/health' });
  assert.equal(on.body.ai.enabled, true);
  assert.ok(!JSON.stringify(on.body).includes('secret-key'));
});

test('non-API routes fall through to the next handler', async () => {
  const result = await call(createApiMiddleware({}), { url: '/dashboard' });
  assert.equal(result.status, 'next');
});

test('enrich returns 503 when AI is not configured', async () => {
  const result = await call(createApiMiddleware({}), { method: 'POST', url: '/api/roadmap/enrich', body: samplePlan() });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, 'ai_unavailable');
});

test('enrich validates the request body', async () => {
  const result = await call(createApiMiddleware({ GEMINI_API_KEY: 'k' }), { method: 'POST', url: '/api/roadmap/enrich', body: { plan: [] } });
  assert.equal(result.status, 400);
});

test('enrich returns validated, sanitised phases from a well-formed model reply', async () => {
  const request = samplePlan();
  let sentKey = null;
  globalThis.fetch = async (url, init) => {
    sentKey = init.headers['x-goog-api-key'];
    assert.ok(!String(url).includes('k-123'), 'key is sent as a header, not in the URL');
    const body = JSON.parse(init.body);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.generationConfig.responseSchema.type, 'OBJECT');
    return geminiReply({
      roadmap: request.plan.map((phase) => ({
        phaseId: phase.phaseId,
        phase: `**${phase.phase}**`,
        why: 'This matters because backend interviews and day-to-day work depend on it.',
        tasks: [
          { title: 'Read the official guide', hours: 2 },
          { title: 'Build a small service', hours: 3 },
        ],
        resources: [{ type: 'docs', title: 'Official documentation', url: 'https://evil.example' }],
      })),
    });
  };
  const result = await call(createApiMiddleware({ GEMINI_API_KEY: 'k-123' }), { method: 'POST', url: '/api/roadmap/enrich', body: request });
  assert.equal(result.status, 200);
  assert.equal(sentKey, 'k-123');
  assert.equal(result.body.roadmap.length, request.plan.length);
  assert.ok(!result.body.roadmap[0].phase.includes('*'), 'markdown stripped');
  assert.ok(!JSON.stringify(result.body).includes('evil.example'), 'model URLs are dropped');

  // The browser re-validates the server response with the same contract.
  const revalidated = validateEnrichment({ roadmap: result.body.roadmap }, request.plan);
  assert.equal(revalidated.ok, true);
  assert.equal(Object.values(revalidated.phases)[0].title, request.plan[0].phase, 'AI title survives the round trip');
});

test('enrich rejects malformed model output and upstream errors without leaking details', async () => {
  const request = samplePlan();
  globalThis.fetch = async () => geminiReply({ roadmap: [{ phaseId: 'made-up', phase: 'x', why: 'short', tasks: [] }] });
  const invalid = await call(createApiMiddleware({ GEMINI_API_KEY: 'k' }), { method: 'POST', url: '/api/roadmap/enrich', body: request });
  assert.equal(invalid.status, 502);
  assert.equal(invalid.body.error, 'ai_invalid_response');

  globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'internal provider trace with key=k' });
  const upstream = await call(createApiMiddleware({ GEMINI_API_KEY: 'k' }), { method: 'POST', url: '/api/roadmap/enrich', body: request });
  assert.equal(upstream.status, 502);
  assert.ok(!JSON.stringify(upstream.body).includes('trace'));
});
