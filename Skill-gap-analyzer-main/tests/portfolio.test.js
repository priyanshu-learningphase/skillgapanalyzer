import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPortfolio, emptyPortfolioSettings, validatePortfolioSettings, validateSlug, validateCertificate, suggestSlug, portfolioHash } from '../src/lib/portfolio.js';
import { roleFor } from '../src/data/roles.js';
import { analyzeRole } from '../src/lib/analysis.js';
import { buildEvidence } from '../src/lib/evidence.js';

const career = { skills: [{ id: 'javascript', name: 'JavaScript', level: 70 }, { id: 'sql', name: 'SQL', level: 60 }, { id: 'git', name: 'Git', level: 50 }] };
const progress = {
  completedTasks: { 'sql:joins': '2026-10-02T00:00:00Z', 'sql:practice': '2026-10-03T00:00:00Z' },
  projects: { 'dockerized-rest-api': { status: 'completed', at: '2026-10-05T00:00:00Z', title: 'Dockerized REST API' }, 'task-manager-spa': { status: 'started' } },
  verifications: [{ challengeId: 'sql-revenue-per-customer', skillId: 'sql', title: 'Revenue per customer', difficulty: 'medium', passed: true, at: '2026-10-06T00:00:00Z' }],
  skillHistory: [],
};
const latestAssessments = { javascript: { skillId: 'javascript', pct: 88, correct: 7, total: 8, at: '2026-10-04T00:00:00Z' }, git: { skillId: 'git', pct: 40, correct: 3, total: 8, at: '2026-10-04T00:00:00Z' } };
const role = roleFor('backend-developer');
const analysis = analyzeRole(role, career.skills);
const evidence = buildEvidence({ career, progress, latestAssessments });
const roadmap = { phases: [{ id: 'p1', title: 'SQL', tasks: [{ id: 'sql:joins' }, { id: 'sql:practice' }] }, { id: 'p2', title: 'Docker', tasks: [{ id: 'docker:basics' }] }] };
const github = { username: 'ananya', score: 61, profile: { url: 'https://github.com/ananya' }, languages: [{ name: 'JavaScript' }], repos: [{ name: 'api', url: 'https://github.com/ananya/api', description: 'REST API' }] };

const settings = (o = {}) => ({ ...emptyPortfolioSettings(), displayName: 'Ananya S.', headline: 'Backend developer in training', ...o });

test('portfolio includes visible sections with evidence, and nothing private', () => {
  const p = buildPortfolio({ settings: settings(), role, analysis, evidence, career, progress, github, roadmap, latestAssessments });
  assert.equal(p.displayName, 'Ananya S.');
  assert.equal(p.role.readiness, analysis.readiness);
  assert.match(p.role.note, /not a hiring prediction/);
  // Strongest evidence first: practical SQL, then the quiz-verified JavaScript.
  assert.deepEqual(p.skills.slice(0, 2).map((s) => [s.name, s.evidence]), [['SQL', 'practical'], ['JavaScript', 'quiz']]);
  assert.equal(p.skills.find((s) => s.name === 'Git').verified, false, 'a failed quiz does not verify');
  assert.deepEqual(p.assessments.quizzes.map((q) => q.skill), ['JavaScript']);
  assert.equal(p.assessments.practical[0].title, 'Revenue per customer');
  assert.deepEqual(p.projects.map((x) => x.title), ['Dockerized REST API']);
  assert.deepEqual(p.milestones.map((m) => m.title), ['SQL']);
  assert.equal(p.github, undefined, 'GitHub is off by default');
  assert.equal(p.contact, undefined, 'contact is off by default');
  const text = JSON.stringify(p);
  for (const secret of ['completedTasks', 'skillHistory', 'resume', 'applications', 'notes']) assert.ok(!text.includes(secret), `leaked ${secret}`);
});

test('visibility toggles remove sections; certificates are labelled self-reported', () => {
  const p = buildPortfolio({
    settings: settings({
      visibility: { readiness: false, skills: false, assessments: false, projects: false, github: true, milestones: false, certificates: true, contact: true },
      certificates: [{ id: 'c1', name: 'AWS Cloud Practitioner', issuer: 'AWS', date: '2025-06', url: 'https://aws.amazon.com/verify/1' }],
      links: { linkedin: 'https://linkedin.com/in/ananya', github: '', website: '', email: '' },
    }),
    role,
    analysis,
    evidence,
    career,
    progress,
    github,
    roadmap,
    latestAssessments,
  });
  assert.deepEqual(Object.keys(p).filter((k) => !['version', 'displayName', 'headline', 'bio', 'generatedAt'].includes(k)).sort(), ['certificates', 'contact', 'github']);
  assert.equal(p.certificates[0].selfReported, true);
  assert.deepEqual(p.contact, { linkedin: 'https://linkedin.com/in/ananya' }, 'empty links are dropped; email is never added implicitly');
  assert.equal(p.github.repos[0].name, 'api');
});

test('validation and slugs', () => {
  assert.ok(validatePortfolioSettings({ ...emptyPortfolioSettings() }).errors.displayName);
  assert.ok(validatePortfolioSettings(settings({ links: { linkedin: 'linkedin.com/in/x', github: '', website: '', email: 'nope' } })).errors.linkedin);
  assert.ok(validatePortfolioSettings(settings({ links: { linkedin: '', github: '', website: 'http://insecure.dev', email: '' } })).errors.website, 'https only');
  assert.equal(validatePortfolioSettings(settings()).ok, true);
  assert.equal(validateSlug('ananya-s'), null);
  assert.ok(validateSlug('-bad'));
  assert.ok(validateSlug('ab'));
  assert.ok(validateSlug('Has Caps'));
  assert.equal(suggestSlug('Ananyā Sharma!'), 'ananya-sharma');
  assert.ok(validateCertificate({ name: '' }).errors.name);
  assert.ok(validateCertificate({ name: 'X', url: 'ftp://x' }).errors.url);
  const a = buildPortfolio({ settings: settings(), role, analysis, evidence, career, progress, roadmap, latestAssessments, now: new Date('2026-10-01') });
  const b = buildPortfolio({ settings: settings(), role, analysis, evidence, career, progress, roadmap, latestAssessments, now: new Date('2026-10-09') });
  assert.equal(portfolioHash(a), portfolioHash(b), 'hash ignores the generation time');
  assert.notEqual(portfolioHash(a), portfolioHash({ ...b, headline: 'Changed' }));
});

test('readiness report PDF contains the score breakdown as real text', async () => {
  const { buildReadinessReport } = await import('../src/lib/reportPdf.js');
  const portfolio = buildPortfolio({ settings: settings(), role, analysis, evidence, career, progress, roadmap, latestAssessments });
  const bytes = new Uint8Array(await buildReadinessReport({ name: 'Ananya S.', role, analysis, evidence, portfolio, now: new Date('2026-10-14') }));
  assert.equal(String.fromCharCode(...bytes.slice(0, 5)), '%PDF-');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: bytes, disableFontFace: true, useSystemFonts: true });
  const doc = await task.promise;
  let text = '';
  for (let n = 1; n <= doc.numPages; n += 1) text += (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ');
  await task.destroy();
  assert.match(text, /Career readiness report/);
  assert.match(text, new RegExp(`Readiness: ${analysis.readiness}/100`));
  assert.match(text, /Backend Developer/);
  assert.match(text, /Dockerized REST API/);
  assert.match(text, /Practical: Revenue per customer/);
  assert.match(text, /not the probability of getting an offer/);
});
