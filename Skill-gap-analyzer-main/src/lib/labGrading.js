/**
 * Grading and progress logic for the practical verification lab. Pure — the
 * browser sandbox / SQL worker produce raw results, this decides pass/fail.
 */

import { CHALLENGES, CHALLENGE_MAP, DIFFICULTY_META } from '../data/challenges/index.js';
import { PRIORITY_ORDER } from './analysis.js';

export const deepEqual = (a, b) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
};

const summarize = (rows) => {
  const passed = rows.filter((r) => r.passed).length;
  return { rows, passed, total: rows.length, pct: rows.length ? Math.round((passed / rows.length) * 100) : 0, allPassed: rows.length > 0 && passed === rows.length };
};

/**
 * results: one { ok, value, error } per test, in order (from the sandbox or
 * the execution service). `onlyVisible` grades a "Run" instead of a submit.
 */
export const gradeCode = (challenge, results, { onlyVisible = false } = {}) => {
  const rows = [];
  challenge.tests.forEach((t, index) => {
    if (onlyVisible && t.hidden) return;
    const r = results[index] || { ok: false, error: 'No result' };
    rows.push({ index, hidden: Boolean(t.hidden), args: t.args, expected: t.expected, actual: r.ok ? r.value : undefined, error: r.ok ? null : r.error, passed: r.ok && deepEqual(r.value, t.expected) });
  });
  return summarize(rows);
};

const norm = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
const rowKey = (row) => JSON.stringify(row.map(norm));

/** Compare query output with the expected output. Column names are ignored (aliases vary). */
export const compareSql = (user, expected, ordered) => {
  if (!user.ok) return { match: false, reason: user.error };
  if (!expected.ok) return { match: false, reason: 'Reference query failed.' };
  if (user.columns.length !== expected.columns.length) return { match: false, reason: `Expected ${expected.columns.length} column${expected.columns.length === 1 ? '' : 's'}, got ${user.columns.length}.` };
  if (user.rows.length !== expected.rows.length) return { match: false, reason: `Expected ${expected.rows.length} row${expected.rows.length === 1 ? '' : 's'}, got ${user.rows.length}.` };
  const a = user.rows.map(rowKey);
  const b = expected.rows.map(rowKey);
  if (ordered) {
    const sameSet = [...a].sort().join('|') === [...b].sort().join('|');
    if (a.join('|') !== b.join('|')) return { match: false, reason: sameSet ? 'Right rows, wrong order.' : 'Rows don’t match.' };
  } else if ([...a].sort().join('|') !== [...b].sort().join('|')) return { match: false, reason: 'Rows don’t match.' };
  return { match: true, reason: null };
};

/** runs: one { user, expected } per dataset (visible first, then hidden). */
export const gradeSql = (challenge, runs, { onlyVisible = false } = {}) =>
  summarize(
    runs
      .map((run, index) => ({ index, hidden: index > 0, ...compareSql(run.user, run.expected, challenge.ordered), user: run.user }))
      .filter((r) => !(onlyVisible && r.hidden))
      .map((r) => ({ ...r, passed: r.match })),
  );

export const normalizeCommand = (s) => String(s || '').trim().replace(/\s+/g, ' ').replace(/;$/, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

export const gradeStructured = (challenge, answers) =>
  summarize(
    challenge.steps.map((step, index) => {
      const answer = answers[index];
      const passed = step.type === 'choice' ? answer === step.answer : step.accept.some((pattern) => new RegExp(pattern).test(normalizeCommand(answer)));
      return { index, passed, answer };
    }),
  );

/** `doc` is a parsed Document (DOMParser) — scripts in it never run. */
export const gradeHtml = (challenge, doc) =>
  summarize(
    challenge.checks.map((check, index) => {
      let passed = false;
      try {
        passed = Boolean(check.test(doc));
      } catch {
        passed = false;
      }
      return { index, id: check.id, description: check.description, passed };
    }),
  );

/** Pass rule per kind: every test/dataset/step/check must pass (HTML can set passRatio). */
export const isPass = (challenge, grade) => (challenge.kind === 'html' ? grade.total > 0 && grade.passed / grade.total >= (challenge.passRatio ?? 1) : grade.allPassed);

export const levelAfterPractical = (current, difficulty, passed) => (passed ? Math.max(current || 0, DIFFICULTY_META[difficulty].levelFloor) : current || 0);

// ── Python via an execution service ─────────────────────────────────────────

const RESULT_MARK = '__SKILLGAP_RESULTS__';

/** A Python program that runs every test and prints JSON results. */
export const buildPythonProgram = (challenge, code) => {
  const fn = challenge.languages.python.functionName;
  return `${code}

import json as __json
__tests = ${JSON.stringify(JSON.stringify(challenge.tests.map((t) => t.args)))}
__out = []
for __args in __json.loads(__tests):
    try:
        __out.append({"ok": True, "value": ${fn}(*__args)})
    except Exception as __e:
        __out.append({"ok": False, "error": type(__e).__name__ + ": " + str(__e)})
print("${RESULT_MARK}" + __json.dumps(__out))
`;
};

export const parsePythonOutput = (stdout) => {
  const line = String(stdout || '').split('\n').find((l) => l.startsWith(RESULT_MARK));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(RESULT_MARK.length));
  } catch {
    return null;
  }
};

// ── Progress ───────────────────────────────────────────────────────────────

export const labStats = (verifications = []) => {
  const byChallenge = {};
  for (const v of [...verifications].reverse()) {
    const s = (byChallenge[v.challengeId] ||= { attempts: 0, best: 0, first: v.pct, last: v.pct, passed: false });
    s.attempts += 1;
    s.best = Math.max(s.best, v.pct);
    s.last = v.pct;
    s.passed ||= v.passed;
  }
  const attempts = verifications.length;
  const improved = Object.values(byChallenge).filter((s) => s.attempts > 1 && s.best > s.first);
  return {
    attempts,
    passed: Object.values(byChallenge).filter((s) => s.passed).length,
    accuracy: attempts ? Math.round(verifications.reduce((sum, v) => sum + v.pct, 0) / attempts) : null,
    skillsVerified: [...new Set(verifications.filter((v) => v.passed).map((v) => v.skillId))],
    improved: improved.length,
    byChallenge,
  };
};

/**
 * Challenges for the user's gaps, most urgent first: skips passed ones and
 * steps up difficulty after a pass.
 */
export const recommendChallenges = ({ analysis, verifications = [], limit = 4, pythonAvailable = false }) => {
  const { byChallenge } = labStats(verifications);
  const passedDifficulty = {};
  for (const [id, s] of Object.entries(byChallenge)) {
    if (!s.passed) continue;
    const c = CHALLENGE_MAP[id];
    if (c) passedDifficulty[c.skillId] = Math.max(passedDifficulty[c.skillId] ?? -1, DIFFICULTY_META[c.difficulty].order);
  }
  const gaps = (analysis?.gaps || []).slice().sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || b.gap - a.gap);
  const out = [];
  for (const gap of gaps) {
    const options = CHALLENGES.filter((c) => c.skillId === gap.skillId && !byChallenge[c.id]?.passed && (pythonAvailable || !(c.kind === 'code' && !c.languages.javascript)))
      .filter((c) => DIFFICULTY_META[c.difficulty].order > (passedDifficulty[c.skillId] ?? -1))
      .sort((a, b) => DIFFICULTY_META[a.difficulty].order - DIFFICULTY_META[b.difficulty].order);
    if (options[0]) out.push({ challenge: options[0], gap });
    if (out.length >= limit) break;
  }
  return out;
};
