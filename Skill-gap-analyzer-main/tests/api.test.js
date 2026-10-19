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
  assert.deepEqual(off.body, { ok: true, ai: { enabled: false, model: null }, execution: { enabled: false, languages: [] }, market: { enabled: false, provider: null } });
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

test('code execution reports "not configured" without a service', async () => {
  const api = createApiMiddleware({});
  const health = await call(api, { url: '/api/health' });
  assert.deepEqual(health.body.execution, { enabled: false, languages: [] });
  const res = await call(api, { method: 'POST', url: '/api/execute', body: { language: 'python', code: 'print(1)' } });
  assert.equal(res.status, 501);
  assert.equal(res.body.error, 'not_configured');
});

test('code execution validates input and relays the Judge0 result', async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, init, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ status: { description: 'Accepted' }, stdout: 'hi\n', stderr: null, time: '0.01' }) };
  };
  const api = createApiMiddleware({ JUDGE0_URL: 'https://judge.example.com/', JUDGE0_KEY: 'k', JUDGE0_AUTH_HEADER: 'X-RapidAPI-Key' });
  const health = await call(api, { url: '/api/health' });
  assert.deepEqual(health.body.execution, { enabled: true, languages: ['python'] });
  assert.equal((await call(api, { method: 'POST', url: '/api/execute', body: { language: 'ruby', code: 'x' } })).status, 400);
  assert.equal((await call(api, { method: 'POST', url: '/api/execute', body: { language: 'python', code: 'x'.repeat(20001) } })).status, 400);
  const res = await call(api, { method: 'POST', url: '/api/execute', body: { language: 'python', code: 'print("hi")' } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'Accepted', stdout: 'hi\n', stderr: '', time: '0.01' });
  assert.equal(sent.url, 'https://judge.example.com/submissions?base64_encoded=false&wait=true');
  assert.equal(sent.init.headers['X-RapidAPI-Key'], 'k');
  assert.equal(sent.body.language_id, 71);
});

test('market insights report "not configured" without provider keys', async () => {
  const api = createApiMiddleware({});
  const res = await call(api, { url: '/api/market?role=backend-developer&location=india' });
  assert.equal(res.status, 501);
  assert.equal(res.body.configured, false);
});

test('market insights aggregate real provider ads and cache them', async () => {
  const calls = [];
  const ad = (title, description, salary = null) => ({ title, description, created: '2026-10-10T00:00:00Z', company: { display_name: 'Acme' }, salary_min: salary, salary_max: salary, salary_is_predicted: salary ? '0' : '1' });
  globalThis.fetch = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        count: 1234,
        results: [
          ad('Backend Developer (Node.js)', 'Node.js, SQL and Docker. 0-2 years', 600000),
          ad('Senior Backend Engineer', 'Java, SQL, Kubernetes', 2400000),
          ad('Backend Intern', 'Python and SQL basics'),
          ad('Backend Developer', 'Node.js, REST APIs, SQL'),
        ],
      }),
    };
  };
  const api = createApiMiddleware({ ADZUNA_APP_ID: 'id', ADZUNA_APP_KEY: 'key' });
  assert.equal((await call(api, { url: '/api/market?role=nope' })).status, 400);
  assert.equal((await call(api, { url: '/api/market?role=backend-developer&location=mars' })).status, 400);
  const res = await call(api, { url: '/api/market?role=backend-developer&location=bengaluru' });
  assert.equal(res.status, 200);
  assert.equal(res.body.provider, 'Adzuna');
  assert.equal(res.body.location, 'Bengaluru');
  assert.equal(res.body.totalMatching, 1234);
  assert.equal(res.body.sampleSize, 4);
  assert.equal(res.body.topSkills[0].id, 'sql');
  assert.equal(res.body.topSkills[0].share, 100);
  assert.equal(res.body.salary.median, null, 'only 2 stated salaries: not enough to show');
  assert.ok(res.body.limitations.length >= 3);
  assert.match(calls[0], /api\.adzuna\.com\/v1\/api\/jobs\/in\/search\/1/);
  assert.match(calls[0], /where=Bangalore/);
  assert.match(calls[0], /what=backend\+developer/);
  // Second request for the same query is served from the cache.
  const again = await call(api, { url: '/api/market?role=backend-developer&location=bengaluru&level=internship' });
  assert.equal(calls.length, 1);
  assert.equal(again.body.cached, true);
  assert.equal(again.body.sampleSize, 1);
});

const feedbackBody = () => ({
  role: 'Frontend Developer',
  kind: 'behavioral',
  question: 'Describe a time you disagreed with a teammate.',
  points: ['Listen first', 'Data over opinions'],
  answer: 'In my final year project I disagreed with a teammate about the database. I listened to his reasons, then I built a small benchmark and we chose Postgres together.',
});

test('interview feedback returns 503 without AI and validates the request', async () => {
  const off = await call(createApiMiddleware({}), { method: 'POST', url: '/api/interview/feedback', body: feedbackBody() });
  assert.equal(off.status, 503);
  assert.equal(off.body.error, 'ai_unavailable');

  const short = await call(createApiMiddleware({ GEMINI_API_KEY: 'k' }), { method: 'POST', url: '/api/interview/feedback', body: { ...feedbackBody(), answer: 'Too short.' } });
  assert.equal(short.status, 400);
  assert.equal(short.body.error, 'invalid_request');

  const wrongMethod = await call(createApiMiddleware({ GEMINI_API_KEY: 'k' }), { url: '/api/interview/feedback' });
  assert.equal(wrongMethod.status, 405);
});

test('interview feedback sends only the needed fields and returns a cleaned reply', async () => {
  let sent = null;
  globalThis.fetch = async (url, init) => {
    assert.ok(!String(url).includes('k-9'), 'key is sent as a header, not in the URL');
    assert.equal(init.headers['x-goog-api-key'], 'k-9');
    sent = JSON.parse(JSON.parse(init.body).contents[0].parts[0].text);
    return geminiReply({ verdict: 'solid', summary: '**Clear** story.', strengths: ['You name your own action'], improvements: ['Add the result in numbers'], strongerOpening: '' });
  };
  const result = await call(createApiMiddleware({ GEMINI_API_KEY: 'k-9' }), { method: 'POST', url: '/api/interview/feedback', body: { ...feedbackBody(), userId: 'u1' } });
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(sent), ['role', 'questionType', 'question', 'strongAnswerCovers', 'answer']);
  assert.equal(sent.questionType, 'Behavioral');
  assert.equal(result.body.feedback.summary, 'Clear story.');
  assert.equal(result.body.feedback.strongerOpening, null);
});

test('interview feedback rejects malformed model output without leaking it', async () => {
  globalThis.fetch = async () => geminiReply({ verdict: 'hired', summary: 'secret internal note', strengths: [], improvements: [] });
  const result = await call(createApiMiddleware({ GEMINI_API_KEY: 'k' }), { method: 'POST', url: '/api/interview/feedback', body: feedbackBody() });
  assert.equal(result.status, 502);
  assert.equal(result.body.error, 'ai_invalid_response');
  assert.ok(!JSON.stringify(result.body).includes('secret'));
});
