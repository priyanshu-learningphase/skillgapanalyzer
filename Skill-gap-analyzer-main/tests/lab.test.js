import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
import { CHALLENGES, CHALLENGE_MAP, LAB_CATEGORIES, DIFFICULTY_META } from '../src/data/challenges/index.js';
import { SKILL_MAP } from '../src/data/skills.js';
import { gradeCode, gradeSql, gradeStructured, compareSql, isPass, levelAfterPractical, buildPythonProgram, parsePythonOutput, labStats, recommendChallenges, deepEqual, normalizeCommand } from '../src/lib/labGrading.js';
import { analyzeRole } from '../src/lib/analysis.js';
import { roleFor } from '../src/data/roles.js';

/** Run a JS solution against a challenge's tests in an isolated VM context. */
const runJs = (challenge, code) => {
  const fn = challenge.languages.javascript.functionName;
  return challenge.tests.map((t) => {
    try {
      const context = vm.createContext({ args: structuredClone(t.args) });
      const value = vm.runInContext(`${code}\n;${fn}(...args)`, context, { timeout: 1000 });
      return { ok: true, value: JSON.parse(JSON.stringify(value)) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
};

test('every challenge is well-formed and maps to a real skill', () => {
  const ids = new Set();
  for (const c of CHALLENGES) {
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`);
    ids.add(c.id);
    assert.ok(SKILL_MAP[c.skillId], `${c.id}: unknown skill ${c.skillId}`);
    assert.ok(LAB_CATEGORIES.some((cat) => cat.id === c.category), `${c.id}: unknown category`);
    assert.ok(DIFFICULTY_META[c.difficulty], `${c.id}: bad difficulty`);
    assert.ok(c.title && c.prompt && c.explanation && c.hints?.length, `${c.id}: missing text`);
  }
  // Every requested category has at least two difficulty levels.
  for (const cat of LAB_CATEGORIES) {
    const levels = new Set(CHALLENGES.filter((c) => c.category === cat.id).map((c) => c.difficulty));
    assert.ok(levels.size >= 2, `${cat.id} has ${levels.size} difficulty level(s)`);
  }
});

test('JavaScript reference solutions pass every test, including hidden ones', () => {
  for (const c of CHALLENGES.filter((x) => x.kind === 'code' && x.languages.javascript)) {
    assert.ok(c.solutions?.javascript, `${c.id}: no reference solution`);
    assert.ok(c.tests.some((t) => t.hidden) && c.tests.some((t) => !t.hidden), `${c.id}: needs visible and hidden tests`);
    const grade = gradeCode(c, runJs(c, c.solutions.javascript));
    assert.ok(grade.allPassed, `${c.id}: ${JSON.stringify(grade.rows.filter((r) => !r.passed))}`);
    assert.ok(isPass(c, grade));
  }
});

test('a wrong or hard-coded solution fails the hidden tests', () => {
  const c = CHALLENGE_MAP['dsa-two-sum'];
  const hardCoded = 'function twoSum(nums, target) { if (target === 9) return [0, 1]; if (target === 6) return [1, 2]; return [0, 0]; }';
  const visible = gradeCode(c, runJs(c, hardCoded), { onlyVisible: true });
  const full = gradeCode(c, runJs(c, hardCoded));
  assert.ok(visible.allPassed, 'passes the examples');
  assert.ok(!full.allPassed, 'but not the hidden tests');
  assert.ok(!isPass(c, full));
  const looping = runJs(c, 'function twoSum() { while (true) {} }');
  assert.ok(looping.every((r) => !r.ok && /timed out/i.test(r.error)));
});

test('SQL solutions run on both datasets and the hidden data differs', async () => {
  const SQL = await initSqlJs();
  const run = (schema, query) => {
    const db = new SQL.Database();
    try {
      db.exec(schema);
      const out = db.exec(query);
      const last = out[out.length - 1] || { columns: [], values: [] };
      return { ok: true, columns: last.columns, rows: last.values };
    } catch (e) {
      return { ok: false, error: e.message };
    } finally {
      db.close();
    }
  };
  for (const c of CHALLENGES.filter((x) => x.kind === 'sql')) {
    const results = c.datasets.map((d) => run(d, c.solution));
    results.forEach((r, i) => assert.ok(r.ok && r.rows.length > 0, `${c.id} dataset ${i}: ${r.error || 'empty'}`));
    assert.notDeepEqual(results[0].rows, results[1].rows, `${c.id}: hidden data gives the same answer`);
    const grade = gradeSql(c, results.map((r) => ({ user: r, expected: r })));
    assert.ok(grade.allPassed && isPass(c, grade));
  }
  // A query that ignores the cancelled filter fails on the hidden data.
  const c = CHALLENGE_MAP['sql-revenue-per-customer'];
  const naive = 'SELECT c.name, SUM(oi.quantity * p.price) AS total FROM customers c JOIN orders o ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id GROUP BY c.id ORDER BY total DESC;';
  const grade = gradeSql(c, c.datasets.map((d) => ({ user: run(d, naive), expected: run(d, c.solution) })));
  assert.ok(!grade.allPassed);
  // Syntax errors are reported, not thrown.
  assert.match(compareSql(run(c.datasets[0], 'SELEC 1'), run(c.datasets[0], c.solution), true).reason, /syntax error/);
});

test('SQL comparison: ordering matters only when asked, numbers are rounded', () => {
  const exp = { ok: true, columns: ['a', 'b'], rows: [['x', 1], ['y', 2.0]] };
  assert.equal(compareSql({ ok: true, columns: ['p', 'q'], rows: [['y', 2], ['x', 1]] }, exp, false).match, true);
  assert.equal(compareSql({ ok: true, columns: ['p', 'q'], rows: [['y', 2], ['x', 1]] }, exp, true).reason, 'Right rows, wrong order.');
  assert.equal(compareSql({ ok: true, columns: ['a', 'b'], rows: [['x', 1.0000001], ['y', 2]] }, exp, true).match, true);
  assert.match(compareSql({ ok: true, columns: ['a'], rows: [['x'], ['y']] }, exp, true).reason, /Expected 2 columns/);
});

test('structured tasks accept equivalent commands and reject wrong ones', () => {
  const c = CHALLENGE_MAP['git-feature-branch'];
  const right = gradeStructured(c, ['git switch -c feature/login', 'git add .', 'git commit -m "Add login page"', 'git push -u origin feature/login']);
  assert.ok(right.allPassed);
  const alt = gradeStructured(c, ['  git checkout -b   feature/login ', 'git add -A', "git commit -m 'Add login page';", 'git push --set-upstream origin feature/login']);
  assert.ok(alt.allPassed, 'whitespace, quotes and a trailing semicolon are tolerated');
  const wrong = gradeStructured(c, ['git branch feature/login', 'git add .', 'git commit', 'git push']);
  assert.equal(wrong.passed, 1);
  const choice = CHALLENGE_MAP['git-fix-mistakes'];
  assert.equal(gradeStructured(choice, ['git reset --soft HEAD~1', 'git restore app.js', 'git blame server.js', 1]).allPassed, true);
  assert.equal(normalizeCommand('git commit -m “Add login page”'), 'git commit -m "Add login page"');
});

test('Python programs are generated and their output parsed', () => {
  const c = CHALLENGE_MAP['dsa-two-sum'];
  const program = buildPythonProgram(c, 'def two_sum(nums, target):\n    return [0, 1]');
  assert.match(program, /two_sum\(\*__args\)/);
  assert.match(program, /__SKILLGAP_RESULTS__/);
  assert.deepEqual(parsePythonOutput('debug line\n__SKILLGAP_RESULTS__[{"ok": true, "value": [0, 1]}]\n'), [{ ok: true, value: [0, 1] }]);
  assert.equal(parsePythonOutput('Traceback ...'), null);
});

test('levels, stats and recommendations', () => {
  assert.equal(levelAfterPractical(30, 'medium', true), 60);
  assert.equal(levelAfterPractical(80, 'easy', true), 80, 'never lowers a level');
  assert.equal(levelAfterPractical(30, 'hard', false), 30);
  const v = [
    { challengeId: 'dsa-two-sum', skillId: 'dsa', pct: 100, passed: true, at: '2026-10-03' },
    { challengeId: 'sql-revenue-per-customer', skillId: 'sql', pct: 50, passed: false, at: '2026-10-02' },
    { challengeId: 'sql-revenue-per-customer', skillId: 'sql', pct: 0, passed: false, at: '2026-10-01' },
  ];
  const s = labStats(v);
  assert.equal(s.attempts, 3);
  assert.equal(s.passed, 1);
  assert.equal(s.accuracy, 50);
  assert.deepEqual(s.skillsVerified, ['dsa']);
  assert.equal(s.improved, 1);
  assert.ok(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }) && !deepEqual([1, 2], [2, 1]));

  const analysis = analyzeRole(roleFor('software-engineer'), [{ id: 'javascript', name: 'JavaScript', level: 60 }]);
  const recs = recommendChallenges({ analysis, verifications: v, limit: 10 });
  assert.ok(recs.length > 0);
  assert.ok(!recs.some((r) => r.challenge.id === 'dsa-two-sum'), 'passed challenges are skipped');
  const dsa = recs.find((r) => r.challenge.skillId === 'dsa');
  if (dsa) assert.notEqual(dsa.challenge.difficulty, 'easy', 'steps up after an easy pass');
  assert.ok(!recs.some((r) => r.challenge.id === 'py-top-words'), 'Python-only tasks need an execution service');
});
