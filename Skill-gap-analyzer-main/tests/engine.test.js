import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_MAP } from '../src/data/skills.js';
import { ROLES, ROLE_MAP, buildCustomRole } from '../src/data/roles.js';
import { analyzeRole, buildSkillLevels, priorityFor, rankCareerMatches } from '../src/lib/analysis.js';
import { planRoadmap, roadmapStats, diffRoadmaps, preserveCompletedTasks } from '../src/lib/roadmap.js';
import { validateEnrichment, applyEnrichment, buildEnrichmentRequest } from '../src/lib/roadmapSchema.js';
import { currentStreak, improvedSkills } from '../src/lib/progress.js';

const baseSkills = [
  { id: 'cpp', name: 'C++', level: 82 },
  { id: 'html', name: 'HTML', level: 70 },
  { id: 'git', name: 'Git', level: 70 },
];

const profile = (overrides = {}) => ({
  targetRoleId: 'backend-developer',
  level: 'intermediate',
  dailyMinutes: 120,
  timelineWeeks: 12,
  skills: baseSkills,
  roadmapOverrides: {},
  ...overrides,
});

const plan = (p) => {
  const role = ROLE_MAP[p.targetRoleId];
  const analysis = analyzeRole(role, p.skills);
  return { role, analysis, roadmap: planRoadmap({ role, profile: p, analysis }) };
};

test('catalog: every prerequisite and role requirement references a known skill', () => {
  for (const skill of SKILLS) {
    for (const entry of skill.prerequisites) {
      for (const id of [].concat(entry)) assert.ok(SKILL_MAP[id], `${skill.id} -> unknown prereq ${id}`);
    }
    assert.ok(skill.topics.length >= 3, `${skill.id} needs topics`);
    assert.ok(skill.resources.every((r) => r.url.startsWith('https://')), `${skill.id} resources must be https`);
  }
  for (const role of ROLES) {
    for (const req of role.requirements) for (const id of req.skills) assert.ok(SKILL_MAP[id], `${role.id} -> ${id}`);
  }
});

test('catalog: prerequisite graph has no cycles', () => {
  const state = {};
  const visit = (id, path) => {
    if (state[id] === 'done') return;
    assert.notEqual(state[id], 'visiting', `cycle: ${[...path, id].join(' -> ')}`);
    state[id] = 'visiting';
    for (const entry of SKILL_MAP[id].prerequisites) for (const p of [].concat(entry)) visit(p, [...path, id]);
    state[id] = 'done';
  };
  for (const skill of SKILLS) visit(skill.id, []);
});

test('priority mapping matches product examples', () => {
  assert.equal(priorityFor(60, 'high'), 'critical'); // System Design 20 -> 80
  assert.equal(priorityFor(35, 'critical'), 'high'); // DSA 55 -> 90
  assert.equal(priorityFor(35, 'medium'), 'medium'); // SQL 40 -> 75
  assert.equal(priorityFor(10, 'high'), 'low'); // Git 70 -> 80
  assert.equal(priorityFor(0, 'critical'), null);
});

test('inference: knowing Express implies some Node.js and JavaScript', () => {
  const levels = buildSkillLevels([{ id: 'express', level: 80 }]);
  assert.equal(levels.nodejs.source, 'inferred');
  assert.equal(levels.nodejs.level, 60);
  assert.ok(levels.javascript.level > 0 && levels.javascript.level < 60);
});

test('analysis produces readiness and priority-sorted gaps', () => {
  const { analysis } = plan(profile());
  assert.ok(analysis.readiness >= 0 && analysis.readiness <= 100);
  assert.ok(analysis.gaps.length > 0);
  const ranks = analysis.gaps.map((g) => ['critical', 'high', 'medium', 'low'].indexOf(g.priority));
  assert.deepEqual(ranks, [...ranks].sort((x, y) => x - y));
});

test('roadmap respects dependencies: JS > Node > Express > REST > Auth', () => {
  const { roadmap } = plan(profile({ timelineWeeks: null }));
  const order = roadmap.phases.flatMap((ph) => ph.skills.map((s) => s.id));
  const idx = (id) => order.indexOf(id);
  const pairs = [
    ['javascript', 'nodejs'],
    ['nodejs', 'express'],
    ['express', 'rest-apis'],
    ['rest-apis', 'authentication'],
    ['sql', 'system-design'],
    ['rest-apis', 'system-design'],
  ];
  for (const [before, after] of pairs) {
    assert.ok(idx(before) >= 0 && idx(after) >= 0, `${before}/${after} present in ${order.join(' > ')}`);
    assert.ok(idx(before) < idx(after), `${before} should precede ${after}: ${order.join(' > ')}`);
  }
  assert.equal(new Set(order).size, order.length);
  for (let i = 1; i < roadmap.phases.length; i += 1) {
    assert.ok(roadmap.phases[i].weekStart >= roadmap.phases[i - 1].weekStart);
  }
  console.log('ORDER:', order.join(' > '), '| weeks', roadmap.totalWeeks, '| hours', roadmap.totalHours);
});

test('every role: planned skills never precede their prerequisites', () => {
  for (const role of ROLES) {
    const { roadmap } = plan(profile({ targetRoleId: role.id, skills: [], level: 'beginner', timelineWeeks: null }));
    for (const phase of roadmap.phases) {
      for (const pre of phase.prerequisites) {
        assert.notEqual(pre.status, 'partial', `${role.id}: ${phase.title} has unmet prereq ${pre.name}`);
      }
    }
  }
});

test('equal-priority ties go to the skill that unblocks the most', () => {
  const custom = { name: 'Game Developer', skills: [{ id: 'cpp', name: 'C++' }, { id: 'algorithms', name: 'Algorithms' }, { id: 'custom:unity', name: 'Unity' }] };
  const p = profile({ targetRoleId: 'custom', customRole: custom, skills: [], level: 'beginner', timelineWeeks: null });
  const role = buildCustomRole(custom);
  const order = planRoadmap({ role, profile: p, analysis: analyzeRole(role, []) }).phases.flatMap((ph) => ph.skills.map((s) => s.id));
  assert.equal(order[0], 'programming-fundamentals', order.join(' > '));
});

test('tight timeline defers lower-priority skills and warns', () => {
  const { roadmap } = plan(profile({ dailyMinutes: 30, timelineWeeks: 4 }));
  assert.ok(roadmap.deferred.length > 0 || roadmap.fit.status === 'over');
  assert.ok(roadmap.warnings.length > 0);
});

test('known basics are skipped for partially known skills', () => {
  const { roadmap } = plan(profile({ skills: [...baseSkills, { id: 'sql', name: 'SQL', level: 55 }] }));
  const sqlPhase = roadmap.phases.find((ph) => ph.skills.some((s) => s.id === 'sql'));
  assert.ok(sqlPhase.skippedTopics.length >= 2, 'SQL basics should be skipped at 55%');
});

test('adaptation: raising a skill to target removes it from the roadmap', () => {
  const r1 = plan(profile({ timelineWeeks: null })).roadmap;
  const r2 = plan(profile({ timelineWeeks: null, skills: [...baseSkills, { id: 'sql', name: 'SQL', level: 80 }] })).roadmap;
  const diff = diffRoadmaps(r1, r2);
  assert.ok(diff.removed.includes('SQL'));
  assert.ok(diff.hoursDelta < 0);
});

test('adaptation keeps completed phases as history instead of dropping them', () => {
  const p1 = profile({ timelineWeeks: null });
  const r1 = plan(p1).roadmap;
  const jsPhase = r1.phases.find((ph) => ph.skills.some((s) => s.id === 'javascript'));
  const completed = Object.fromEntries(jsPhase.tasks.map((t) => [t.id, '2026-10-01']));
  const p2 = profile({ timelineWeeks: null, skills: [...baseSkills, { id: 'javascript', name: 'JavaScript', level: 60 }] });
  const role = ROLE_MAP[p2.targetRoleId];
  const r2 = planRoadmap({ role, profile: p2, analysis: analyzeRole(role, p2.skills), carryOver: [jsPhase] });
  assert.equal(r2.phases[0].id, jsPhase.id);
  assert.equal(r2.phases[0].carried, true);
  assert.equal(new Set(r2.phases.map((ph) => ph.id)).size, r2.phases.length, 'phase ids stay unique');
  const stats = roadmapStats(r2, completed);
  assert.equal(stats.byId[jsPhase.id].status, 'completed');
  assert.equal(stats.doneTasks, jsPhase.tasks.length);
  const diff = diffRoadmaps(r1, r2);
  assert.ok(diff.removed.includes('JavaScript'));
  assert.ok(diff.hoursDelta < 0);
  const req = buildEnrichmentRequest({ roadmap: r2, analysis: analyzeRole(role, p2.skills), profile: p2 });
  assert.ok(!req.plan.some((ph) => ph.phaseId === jsPhase.id), 'carried phases are not sent to the AI');
});

test('regenerating a phase keeps tasks the user already completed', () => {
  const p = profile({ timelineWeeks: null });
  const { analysis, roadmap } = plan(p);
  const first = roadmap.phases[0];
  const done = { [first.tasks[0].id]: '2026-10-01' };
  const req = buildEnrichmentRequest({ roadmap, analysis, profile: p });
  const enriched = applyEnrichment(
    roadmap,
    validateEnrichment(
      { roadmap: req.plan.map((ph) => ({ phaseId: ph.phaseId, phase: ph.phase, why: 'A sufficiently long reason for this phase.', tasks: ['Brand new task one', 'Brand new task two'] })) },
      req.plan,
    ).phases,
  );
  const merged = preserveCompletedTasks(roadmap, enriched, done);
  assert.equal(merged.phases[0].tasks[0].id, first.tasks[0].id);
  assert.equal(roadmapStats(merged, done).doneTasks, 1);
});

test('stats and AI enrichment validation', () => {
  const p = profile({ targetRoleId: 'software-engineer' });
  const { analysis, roadmap } = plan(p);
  const first = roadmap.phases[0];
  const stats = roadmapStats(roadmap, { [first.tasks[0].id]: '2026-01-01' });
  assert.equal(stats.doneTasks, 1);
  assert.equal(stats.currentPhase.id, first.id);

  const req = buildEnrichmentRequest({ roadmap, analysis, profile: p });
  const good = {
    roadmap: req.plan.map((ph) => ({
      phaseId: ph.phaseId,
      phase: `**${ph.phase}** deep dive`,
      why: 'Because this is important for your goals and interviews.',
      tasks: [{ title: 'Do thing one', hours: 2 }, { title: 'Build a project', hours: 3 }],
      resources: [{ type: 'video', title: 'Some playlist' }, { type: 'bogus', title: 'x' }],
    })),
  };
  const v = validateEnrichment(good, req.plan);
  assert.equal(v.ok, true);
  const merged = applyEnrichment(roadmap, v.phases, { model: 'test' });
  assert.equal(merged.source, 'ai');
  assert.ok(!merged.phases[0].title.includes('*'));
  assert.equal(merged.phases[0].resources.filter((x) => x.suggested).length, 1);
  assert.equal(merged.phases.map((x) => x.id).join(), roadmap.phases.map((x) => x.id).join(), 'order preserved');

  assert.equal(validateEnrichment({ roadmap: [] }, req.plan).ok, false);
  assert.equal(validateEnrichment('nope', req.plan).ok, false);
  const unknownOnly = { roadmap: [{ phaseId: 'unknown', phase: 'x', why: 'y'.repeat(30), tasks: ['aaa', 'bbb'] }] };
  assert.equal(validateEnrichment(unknownOnly, req.plan).ok, false);
});

test('any-of requirements resolve to a coherent stack', () => {
  const stackFor = (skills) => {
    const items = analyzeRole(ROLE_MAP['backend-developer'], skills).items;
    const pick = (key) => items.find((i) => i.key === key).skillId;
    return [pick('server-runtime'), pick('backend-framework')];
  };
  assert.deepEqual(stackFor(baseSkills), ['nodejs', 'express']);
  assert.deepEqual(stackFor([{ id: 'python', level: 70 }]), ['python', 'fastapi']);
  assert.deepEqual(stackFor([{ id: 'django', level: 60 }]), ['python', 'django']);
  assert.deepEqual(stackFor([{ id: 'java', level: 60 }]), ['java', 'spring-boot']);
  const mobile = analyzeRole(ROLE_MAP['mobile-developer'], [{ id: 'react', level: 70 }]).items;
  assert.equal(mobile.find((i) => i.key === 'mobile-framework').skillId, 'react-native');
});

test('career matching ranks all roles', () => {
  const matches = rankCareerMatches(baseSkills);
  assert.equal(matches.length, ROLES.length);
  for (let i = 1; i < matches.length; i += 1) {
    assert.ok(matches[i - 1].analysis.readiness >= matches[i].analysis.readiness);
  }
});

test('skill improvements ignore onboarding baselines', () => {
  const history = [
    { skillId: 'cpp', name: 'C++', from: 0, to: 85, source: 'onboarding' },
    { skillId: 'sql', name: 'SQL', from: 0, to: 30, source: 'onboarding' },
    { skillId: 'sql', name: 'SQL', from: 30, to: 70, source: 'assessment' },
    { skillId: 'javascript', name: 'JavaScript', from: 0, to: 60, source: 'completion' },
    { skillId: 'go', name: 'Go', from: 0, to: 50, source: 'manual' },
  ];
  assert.deepEqual(improvedSkills(history).map((s) => s.skillId).sort(), ['javascript', 'sql']);
});

test('streak counts consecutive days ending today or yesterday', () => {
  assert.equal(currentStreak(['2026-10-04', '2026-10-05', '2026-10-06'], '2026-10-06'), 3);
  assert.equal(currentStreak(['2026-10-04', '2026-10-05'], '2026-10-06'), 2);
  assert.equal(currentStreak(['2026-10-03'], '2026-10-06'), 0);
});
