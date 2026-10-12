import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCampusAnalytics, filterStudents, studentsToCsv, toMillis } from '../src/lib/campus.js';
import { readinessBandFor } from '../src/lib/analysis.js';

const NOW = Date.parse('2026-10-11T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();

const snap = (userId, days, readiness, extra = {}) => ({
  userId,
  createdAt: daysAgo(days),
  readiness_score: readiness,
  career_role: 'Backend Developer',
  role_id: 'backend-developer',
  company_name: null,
  gaps: [],
  ...extra,
});

const users = [
  { id: 'a', name: 'Asha', email: 'asha@uni.edu', role: 'student', createdAt: daysAgo(60) },
  { id: 'b', name: 'Bilal', email: 'bilal@uni.edu', role: 'student', createdAt: daysAgo(50) },
  { id: 'c', name: 'Chen', email: 'chen@uni.edu', role: 'student', createdAt: daysAgo(40), career: { targetRoleId: 'data-analyst' } },
  { id: 'd', name: 'Dee', email: 'dee@uni.edu', createdAt: { seconds: (NOW - 90 * 86_400_000) / 1000 } }, // legacy: no role field
  { id: 'admin', name: 'Placement Office', role: 'admin' },
];

const analyses = [
  // Asha: improving, job-ready, targets Google.
  snap('a', 40, 62, { company_name: 'Google', gaps: [{ skillName: 'System Design', priority: 'critical' }] }),
  snap('a', 3, 84, { company_name: 'Google', gaps: [{ skillName: 'System Design', priority: 'important' }] }),
  // Bilal: dropped for the same role, and a goal change before that must not count.
  snap('b', 45, 70, { career_role: 'Frontend Developer', role_id: 'frontend-developer' }),
  snap('b', 20, 55),
  snap('b', 5, 45, { gaps: [{ skillName: 'System Design', priority: 'critical' }, { skillName: 'Docker', priority: 'important' }] }),
  // Dee: old snapshot format, inactive, low readiness.
  { userId: 'd', createdAt: daysAgo(70), readiness_score: 20, career_role: 'Data Analyst', missing_skills: ['SQL - needed for queries', 'Excel'] },
  // Admin's own analysis is ignored.
  snap('admin', 1, 99),
];

const campus = buildCampusAnalytics({ users, analyses, now: NOW });
const row = (id) => campus.students.find((s) => s.id === id);

test('summary counts students, excludes admins and handles students with no analysis', () => {
  const s = campus.summary;
  assert.equal(s.registered, 4);
  assert.equal(s.analysed, 3);
  assert.equal(s.notStarted, 1);
  assert.equal(s.averageReadiness, Math.round((84 + 45 + 20) / 3));
  assert.equal(s.jobReady, 1);
  assert.equal(s.activeRecently, 2);
  assert.equal(s.totalAnalyses, 6);
  assert.ok(!campus.students.some((r) => r.id === 'admin'));
});

test('student rows use the latest analysis and only compare like with like', () => {
  assert.equal(row('a').readiness, 84);
  assert.equal(row('a').delta, 22);
  assert.equal(row('a').band.id, 'ready');
  assert.deepEqual(row('a').criticalGaps, []);
  assert.equal(row('a').companyName, 'Google');

  // 45 vs the previous Backend analysis (55), not the Frontend one (70).
  assert.equal(row('b').delta, -10);
  assert.deepEqual(row('b').reasons, ['dropping']);
  assert.deepEqual(row('b').criticalGaps, ['System Design']);

  assert.equal(row('c').readiness, null);
  assert.equal(row('c').roleName, 'Data Analyst');
  assert.deepEqual(row('c').reasons, ['not-started']);

  assert.deepEqual(row('d').reasons, ['low-readiness', 'inactive']);
  assert.equal(row('d').gapCount, 2);
  assert.equal(row('d').joinedAt, NOW - 90 * 86_400_000);
  assert.equal(campus.summary.needsAttention, 3);
});

test('distribution, gaps and groupings', () => {
  assert.deepEqual(
    campus.distribution.map((d) => [d.id, d.students]),
    [['foundations', 1], ['building', 1], ['close', 0], ['ready', 1]],
  );
  assert.deepEqual(campus.distribution.map((d) => d.range), ['0–34', '35–59', '60–79', '80–100']);

  const sd = campus.topGaps.find((g) => g.name === 'System Design');
  assert.deepEqual({ students: sd.students, critical: sd.critical }, { students: 2, critical: 1 });
  assert.ok(campus.topGaps.some((g) => g.name === 'SQL'), 'older "Skill - reason" format is parsed');

  const backend = campus.byRole.find((r) => r.name === 'Backend Developer');
  assert.deepEqual({ students: backend.students, avg: backend.averageReadiness }, { students: 2, avg: Math.round((84 + 45) / 2) });
  assert.deepEqual(campus.byCompany, [{ name: 'Google', students: 1, averageReadiness: 84, jobReady: 1 }]);
  assert.equal(campus.noCompany, 2);
});

test('weekly trend uses each student’s latest readiness as of that week', () => {
  const last = campus.trend[campus.trend.length - 1];
  assert.equal(last.label, 'Now');
  assert.equal(last.students, 3);
  assert.equal(last.value, campus.summary.averageReadiness);
  // Only Dee had analysed 11 weeks ago.
  assert.deepEqual([campus.trend[0].students, campus.trend[0].value], [1, 20]);
});

test('filtering, searching and sorting the student table', () => {
  assert.deepEqual(filterStudents(campus.students, { filter: 'attention', sort: 'name', dir: 'asc' }).map((r) => r.id), ['b', 'c', 'd']);
  assert.deepEqual(filterStudents(campus.students, { filter: 'ready' }).map((r) => r.id), ['a']);
  assert.deepEqual(filterStudents(campus.students, { filter: 'not-started' }).map((r) => r.id), ['c']);
  assert.deepEqual(filterStudents(campus.students, { search: 'google' }).map((r) => r.id), ['a']);
  assert.deepEqual(filterStudents(campus.students, { role: 'Data Analyst', sort: 'name', dir: 'asc' }).map((r) => r.id), ['c', 'd']);
  // Not-started students sort below everyone on readiness.
  assert.deepEqual(filterStudents(campus.students, { sort: 'readiness', dir: 'desc' }).map((r) => r.id), ['a', 'b', 'd', 'c']);
});

test('CSV export quotes values and neutralises spreadsheet formulas', () => {
  const rows = buildCampusAnalytics({
    users: [{ id: 'x', name: '=HYPERLINK("http://evil")', email: 'x@uni.edu', role: 'student' }],
    analyses: [snap('x', 1, 50), snap('x', 10, 60)],
    now: NOW,
  }).students;
  const [header, line] = studentsToCsv(rows).split('\r\n');
  assert.ok(header.startsWith('Name,Email,Target role'));
  assert.ok(line.startsWith(`"'=HYPERLINK(""http://evil"")"`), line);
  assert.ok(line.includes(',-10,'), 'negative numbers are not prefixed');
});

test('readiness bands and timestamp parsing', () => {
  assert.deepEqual([80, 79, 60, 59, 35, 34, 0].map((s) => readinessBandFor(s).id), ['ready', 'close', 'close', 'building', 'building', 'foundations', 'foundations']);
  assert.equal(toMillis({ seconds: 10 }), 10_000);
  assert.equal(toMillis({ toMillis: () => 5 }), 5);
  assert.equal(toMillis('not a date'), null);
  assert.equal(toMillis(null), null);
});
