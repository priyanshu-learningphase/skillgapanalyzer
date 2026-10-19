import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleFor, buildCustomRole } from '../src/data/roles.js';
import { analyzeRole } from '../src/lib/analysis.js';
import { explainReadiness } from '../src/lib/readiness.js';
import { buildEvidence, evidenceFor, evidenceSummary } from '../src/lib/evidence.js';
import { jobToCustomRole, parseJobDescription } from '../src/lib/jobDescription.js';

const skills = [
  { id: 'javascript', name: 'JavaScript', level: 72 },
  { id: 'nodejs', name: 'Node.js', level: 40 },
  { id: 'sql', name: 'SQL', level: 10 },
];

test('readiness breakdown adds up to the score', () => {
  const role = roleFor('backend-developer');
  const analysis = analyzeRole(role, skills);
  const ex = explainReadiness(analysis, role);
  const earned = ex.rows.reduce((sum, r) => sum + r.pointsEarned, 0);
  const max = ex.rows.reduce((sum, r) => sum + r.pointsMax, 0);
  assert.ok(Math.abs(earned - analysis.readiness) <= 1.5, `${earned} vs ${analysis.readiness}`);
  assert.ok(Math.abs(max - 100) <= 1.5);
  assert.equal(ex.matched.length + ex.partial.length + ex.missing.length, ex.rows.length);
  // Highest-weight requirements come first.
  assert.ok(ex.rows[0].weight >= ex.rows[ex.rows.length - 1].weight);
  assert.ok(ex.criticalMissing.every((r) => r.importance === 'critical' && r.gap > 0));
  assert.equal(ex.profile.version, '2026.10');
  assert.match(ex.profile.basis, /not computed from live job-market data/);
});

test('job-based roles say where their requirements came from', () => {
  const job = parseJobDescription('Backend Engineer\nRequirements\n- Node.js\n- SQL\n- Docker');
  const role = buildCustomRole(jobToCustomRole(job));
  const ex = explainReadiness(analyzeRole(role, skills), role);
  assert.equal(ex.profile.version, null);
  assert.match(ex.profile.basis, /job description/);
});

test('evidence ranks practical > quiz > project > self and only verified levels count as verified', () => {
  const evidence = buildEvidence({
    career: { skills: [...skills, { id: 'docker', name: 'Docker', level: 50 }, { id: 'git', name: 'Git', level: 60 }] },
    progress: {
      skillHistory: [{ skillId: 'git', source: 'import', date: '2026-10-01T00:00:00Z', to: 60 }],
      projects: { 'dockerized-rest-api': { status: 'completed', at: '2026-10-05T00:00:00Z', title: 'Dockerized REST API' }, 'skill-git': { status: 'started' } },
      verifications: [
        { skillId: 'sql', passed: true, difficulty: 'medium', title: 'Top customers query', at: '2026-10-06T00:00:00Z' },
        { skillId: 'docker', passed: false, difficulty: 'easy', title: 'Failed one', at: '2026-10-06T00:00:00Z' },
      ],
    },
    latestAssessments: {
      javascript: { skillId: 'javascript', pct: 88, correct: 7, total: 8, at: '2026-10-04T00:00:00Z' },
      nodejs: { skillId: 'nodejs', pct: 38, correct: 3, total: 8, at: '2026-10-04T00:00:00Z' },
    },
  });
  assert.equal(evidenceFor(evidence, 'sql').level, 'practical');
  assert.equal(evidenceFor(evidence, 'javascript').level, 'quiz');
  assert.equal(evidenceFor(evidence, 'javascript').verified, true);
  assert.equal(evidenceFor(evidence, 'nodejs').level, 'project', 'a failed quiz does not verify, but the project counts');
  assert.equal(evidenceFor(evidence, 'docker').level, 'project', 'a failed practical attempt does not count');
  assert.equal(evidenceFor(evidence, 'git').level, 'self');
  assert.equal(evidenceFor(evidence, 'git').items[0].label, 'Imported from your resume or GitHub');
  assert.equal(evidenceFor(evidence, 'git').verified, false);
  assert.equal(evidenceFor(evidence, 'kubernetes').level, 'none');
  assert.deepEqual(evidenceSummary(evidence, ['sql', 'javascript', 'git', 'kubernetes']), { practical: 1, quiz: 1, project: 0, self: 1, none: 1 });
});
