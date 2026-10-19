import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateJobAds, classifyLevel, marketGaps, addSnapshot, skillTrends, MIN_SALARY_SAMPLES } from '../src/lib/market.js';

const ad = (title, description = '', salary = null, predicted = false) => ({ title, description, salary_min: salary, salary_max: salary ? salary * 1.2 : null, salary_is_predicted: predicted ? '1' : '0', created: '2026-10-01T00:00:00Z' });

test('experience level comes from the title, then years mentioned', () => {
  assert.equal(classifyLevel(ad('Software Engineering Intern')), 'internship');
  assert.equal(classifyLevel(ad('Sr. Data Analyst')), 'experienced');
  assert.equal(classifyLevel(ad('Graduate Engineer Trainee')), 'internship');
  assert.equal(classifyLevel(ad('Junior Frontend Developer')), 'entry');
  assert.equal(classifyLevel(ad('Backend Developer', 'We need 5+ years of Java')), 'experienced');
  assert.equal(classifyLevel(ad('Backend Developer', '1-2 years experience')), 'entry');
  assert.equal(classifyLevel(ad('Backend Developer', 'Freshers welcome')), 'entry');
  assert.equal(classifyLevel(ad('Backend Developer')), 'unspecified');
});

test('skill demand counts each ad once and needs at least two ads', () => {
  const r = aggregateJobAds([ad('Python developer', 'Python, Python, SQL'), ad('Data engineer', 'Python and Spark'), ad('Analyst', 'Excel only')]);
  const python = r.topSkills.find((s) => s.id === 'python');
  assert.equal(python.ads, 2);
  assert.equal(python.share, 67);
  assert.ok(!r.topSkills.some((s) => s.id === 'sql'), 'one ad is not a trend');
  assert.equal(r.sampleSize, 3);
});

test('salary needs enough stated (not predicted) salaries', () => {
  const few = aggregateJobAds([ad('Dev', '', 500000), ad('Dev', '', 700000, true)]);
  assert.equal(few.salary.median, null);
  assert.equal(few.salary.count, 1);
  const many = aggregateJobAds(Array.from({ length: MIN_SALARY_SAMPLES }, (_, i) => ad('Dev', '', 500000 + i * 100000)));
  assert.equal(many.salary.count, MIN_SALARY_SAMPLES);
  assert.equal(many.salary.median, 770000);
  assert.ok(many.salary.p25 < many.salary.median && many.salary.median < many.salary.p75);
});

test('level filter, gaps and snapshot trends', () => {
  const ads = [ad('Intern', 'SQL'), ad('Intern trainee', 'SQL and Git'), ad('Senior dev', 'SQL')];
  const interns = aggregateJobAds(ads, { level: 'internship' });
  assert.equal(interns.sampleSize, 2);
  assert.deepEqual(interns.levelCounts, { internship: 2, entry: 0, experienced: 1, unspecified: 0 });
  const gaps = marketGaps(interns.topSkills, { sql: { level: 70 } });
  assert.equal(gaps.find((g) => g.id === 'sql').missing, false);

  let snaps = addSnapshot([], 'k', { sampleSize: 10, topSkills: [{ id: 'sql', share: 40 }] }, '2026-10-01');
  snaps = addSnapshot(snaps, 'k', { sampleSize: 10, topSkills: [{ id: 'sql', share: 45 }] }, '2026-10-01');
  assert.equal(snaps.length, 1, 'one snapshot per day');
  assert.equal(skillTrends(snaps, 'k'), null, 'a trend needs two days');
  snaps = addSnapshot(snaps, 'k', { sampleSize: 12, topSkills: [{ id: 'sql', share: 60 }] }, '2026-10-08');
  const t = skillTrends(snaps, 'k');
  assert.deepEqual(t.skills, [{ id: 'sql', before: 45, now: 60, change: 15 }]);
  for (let i = 0; i < 20; i += 1) snaps = addSnapshot(snaps, 'k', { sampleSize: 1, topSkills: [] }, `2026-11-${String(i + 1).padStart(2, '0')}`);
  assert.ok(snaps.filter((s) => s.key === 'k').length <= 12, 'history is capped');
});
