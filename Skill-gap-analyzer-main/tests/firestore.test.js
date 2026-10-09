/**
 * Every document the app writes must be valid Firestore data: no nested
 * arrays, no empty or reserved field names, under the 1 MiB document limit
 * and the 40,000 index-entry limit. The documents are built from the real
 * planner and parsers, then run through the Firebase SDK's own write
 * validation (which happens locally, before anything is sent).
 */

import { readFileSync } from 'node:fs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { roleFor, buildCustomRole } from '../src/data/roles.js';
import { analyzeRole, toAnalysisSnapshot } from '../src/lib/analysis.js';
import { planRoadmap } from '../src/lib/roadmap.js';
import { emptyProgress, emptyInsights } from '../src/lib/progress.js';
import { parseResume } from '../src/lib/resume.js';
import { parseJobDescription, jobToCustomRole } from '../src/lib/jobDescription.js';
import { analyzeGithub } from '../src/lib/github.js';

const app = initializeApp({ projectId: 'demo-validate', apiKey: 'demo', appId: 'demo' }, 'firestore-shape-test');
const db = getFirestore(app);
after(() => deleteApp(app));

/** Same transform the repository applies before every write. */
const clean = (value) => JSON.parse(JSON.stringify(value ?? null));

const MAX_DOC_BYTES = 1_048_576;
const MAX_INDEX_ENTRIES = 40_000;

/** Fields with indexing turned off in firestore.indexes.json, per collection. */
const EXEMPT = JSON.parse(readFileSync(new URL('../firestore.indexes.json', import.meta.url))).fieldOverrides
  .filter((o) => !o.indexes.length)
  .reduce((map, o) => ({ ...map, [o.collectionGroup]: [...(map[o.collectionGroup] || []), o.fieldPath] }), {});

/** Firestore's documented size rules (strings = UTF-8 bytes + 1, numbers 8, …). */
const sizeOf = (value) => {
  if (value === null || typeof value === 'boolean') return 1;
  if (typeof value === 'number') return 8;
  if (typeof value === 'string') return Buffer.byteLength(value) + 1;
  if (Array.isArray(value)) return value.reduce((sum, v) => sum + sizeOf(v), 0);
  if (typeof value === 'object' && value.constructor === Object) {
    return Object.entries(value).reduce((sum, [k, v]) => sum + Buffer.byteLength(k) + 1 + sizeOf(v), 0);
  }
  return 16; // sentinels such as serverTimestamp()
};

/** Ascending + descending entry per field path, plus one per array element. */
const indexEntries = (value) => {
  if (Array.isArray(value)) return 2 + value.length + value.reduce((sum, v) => sum + (typeof v === 'object' && v ? indexEntries(v) : 0), 0);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.values(value).reduce((sum, v) => sum + 2 + (typeof v === 'object' && v ? indexEntries(v) : 0), 0);
  }
  return 0;
};

const assertWritable = (path, data) => {
  const payload = clean(data);
  // Throws synchronously on nested arrays, invalid field names, unsupported types.
  assert.doesNotThrow(() => writeBatch(db).set(doc(db, path), { ...payload, updatedAt: serverTimestamp() }), `${path} is not valid Firestore data`);
  const bytes = sizeOf(payload);
  assert.ok(bytes < MAX_DOC_BYTES, `${path} is ${bytes} bytes`);
  const exempt = new Set(EXEMPT[path.split('/')[0]] || []);
  const entries = indexEntries(Object.fromEntries(Object.entries(payload).filter(([key]) => !exempt.has(key))));
  assert.ok(entries < MAX_INDEX_ENTRIES, `${path} needs ~${entries} index entries`);
  return { bytes, entries };
};

// ── Realistic workspace ────────────────────────────────────────────────────

const SKILLS = [
  { id: 'javascript', name: 'JavaScript', level: 60 },
  { id: 'html', name: 'HTML', level: 70 },
  { id: 'git', name: 'Git', level: 60 },
  { id: 'nodejs', name: 'Node.js', level: 45 },
  { id: 'sql', name: 'SQL', level: 40 },
];
const company = { id: 'microsoft', name: 'Microsoft' };
const career = {
  targetRoleId: 'backend-developer',
  targetCompany: company,
  level: 'intermediate',
  skills: SKILLS,
  dailyMinutes: 90,
  timelineWeeks: 16,
  roadmapOverrides: {},
  onboardedAt: '2026-10-01T00:00:00.000Z',
};
const role = roleFor('backend-developer', company);
const analysis = analyzeRole(role, SKILLS);
const planned = planRoadmap({ role, profile: career, analysis, signals: { assessments: { docker: { skillId: 'docker', pct: 20 } } } });
const roadmap = {
  ...planned,
  id: 'rm_test',
  version: 3,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-05T00:00:00.000Z',
  status: 'active',
  aiStatus: { status: 'skipped' },
  history: [{ at: '2026-10-05T00:00:00.000Z', summary: 'Repeating Docker fundamentals after your assessment', source: 'rules', version: 3 }],
};

const RESUME = `Jane Doe
jane@example.com | github.com/jane
Experience
Software Engineer Intern, Acme Corp
- Built REST APIs with Node.js and Express serving 2,000 users
- Worked on PostgreSQL queries
Projects
Task Tracker
- React app with Redux and Jest tests
Education
B.Tech in Computer Science, Example University
Skills
JavaScript, TypeScript, Docker, Git
Certifications
AWS Certified Cloud Practitioner`;

const JD = `Backend Engineer
Requirements
- 3+ years building backend services with Node.js and JavaScript
- REST APIs and PostgreSQL
- Bachelor's degree in Computer Science
- Strong communication skills
Nice to have
- Docker, Kubernetes and AWS`;

const githubData = {
  user: { login: 'jane', name: 'Jane', avatar_url: '', html_url: 'https://github.com/jane', public_repos: 3, followers: 4, created_at: '2020-01-01' },
  repos: [
    { name: 'api', language: 'JavaScript', fork: false, stargazers_count: 3, pushed_at: '2026-09-20T00:00:00Z', html_url: 'https://github.com/jane/api', description: 'REST API', topics: ['nodejs', 'express'] },
    { name: 'site', language: 'HTML', fork: false, stargazers_count: 0, pushed_at: '2026-08-01T00:00:00Z', html_url: 'https://github.com/jane/site', description: '', topics: [] },
  ],
  events: [{ type: 'PushEvent', created_at: '2026-09-25T00:00:00Z', payload: { size: 4 } }],
  readmes: { api: '# API\n## Setup\nnpm install\n## Tests\nnpm test' },
};

const job = parseJobDescription(JD);
const insights = {
  ...emptyInsights(),
  resume: { parsed: parseResume(RESUME), fileName: 'resume.pdf', analyzedAt: '2026-10-02T00:00:00.000Z' },
  jobs: Array.from({ length: 10 }, (_, i) => ({ id: `job_${i}`, parsed: job, analyzedAt: '2026-10-03T00:00:00.000Z' })),
  github: { ...analyzeGithub(githubData, role, Date.parse('2026-10-01T00:00:00Z')), analyzedAt: '2026-10-04T00:00:00.000Z', roleId: role.id },
};

/** A heavy year of use: every list at or beyond what the app keeps. */
const heavyProgress = () => {
  const p = emptyProgress();
  const tasks = roadmap.phases.flatMap((phase) => phase.tasks);
  for (const task of tasks) p.completedTasks[task.id] = '2026-10-05T00:00:00.000Z';
  p.hoursLog = Array.from({ length: 1500 }, (_, i) => ({ id: `h_${i}`, date: '2026-10-05', hours: 1.5, taskId: `task-${i}`, skillId: 'sql', source: 'task' }));
  p.activeDates = Array.from({ length: 400 }, (_, i) => `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`);
  p.skillHistory = Array.from({ length: 1500 }, (_, i) => ({ date: '2026-10-05T00:00:00.000Z', skillId: 'sql', name: 'SQL', from: i % 100, to: (i + 5) % 100, source: 'quiz' }));
  p.activity = Array.from({ length: 60 }, (_, i) => ({ id: `act_${i}`, type: 'task', message: 'Completed “Practice SQL joins on a sample schema”', at: '2026-10-05T00:00:00.000Z' }));
  p.assessments = Array.from({ length: 100 }, (_, i) => ({ id: `as_${i}`, skillId: 'docker', name: 'Docker', correct: 5, total: 8, pct: 63, before: 30, after: 50, at: '2026-10-05T00:00:00.000Z' }));
  p.projects = { 'dockerized-rest-api': { status: 'completed', at: '2026-10-05T00:00:00.000Z', title: 'Dockerized REST API' } };
  p.interview = { practiced: { 'tech:rest-apis:0': '2026-10-05T00:00:00.000Z', 'sd:design-a-url-shortener': '2026-10-05T00:00:00.000Z' } };
  p.weekChecks = { '2026-W40:dsa': '2026-10-05T00:00:00.000Z' };
  return p;
};

// ── Tests ──────────────────────────────────────────────────────────────────

test('users document (career profile) is valid Firestore data', () => {
  assertWritable('users/u1', { career, career_interest: career.targetRoleId, skills: SKILLS.map((s) => s.name) });
  const custom = buildCustomRole(jobToCustomRole(job));
  assertWritable('users/u2', { career: { ...career, targetRoleId: 'custom', customRole: jobToCustomRole(job), targetCompany: null }, roleName: custom.name });
});

test('analysis snapshot is valid Firestore data', () => {
  assertWritable('skill_analysis/a1', { ...toAnalysisSnapshot(analysis, 'onboarding'), userId: 'u1' });
});

test('roadmap document is valid Firestore data', () => {
  assert.ok(roadmap.phases.length > 0);
  const { bytes } = assertWritable('roadmaps/u1', { roadmap });
  assert.ok(bytes < 400_000, `roadmap uses ${bytes} bytes`);
  // The largest plan: every software-engineer skill from zero, no deadline.
  const big = roleFor('software-engineer', { id: 'google', name: 'Google' });
  const bigPlan = planRoadmap({ role: big, profile: { ...career, skills: [], timelineWeeks: null, level: 'beginner' }, analysis: analyzeRole(big, []) });
  assertWritable('roadmaps/u2', { roadmap: bigPlan });
});

test('progress document stays valid after heavy use', () => {
  assertWritable('progress/u1', emptyProgress());
  const { bytes } = assertWritable('progress/u1', heavyProgress());
  assert.ok(bytes < 700_000, `heavy progress uses ${bytes} bytes`);
});

test('insights document (resume, jobs, GitHub) is valid Firestore data', () => {
  assertWritable('insights/u1', emptyInsights());
  assertWritable('insights/u1', insights);
});

test('the validator rejects data Firestore would reject', () => {
  assert.throws(() => writeBatch(db).set(doc(db, 'x/y'), { pairs: [['a', 1]] }));
  assert.throws(() => writeBatch(db).set(doc(db, 'x/y'), { '': 1 }));
});
