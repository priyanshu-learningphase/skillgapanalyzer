/**
 * Campus analytics for the placement cell.
 *
 * Built only from data admins can read under firestore.rules: student
 * profiles (users/{uid}) and analysis snapshots (skill_analysis). Roadmaps,
 * progress and resume/job/GitHub results stay private to each student.
 */

import { READINESS_BANDS, readinessBandFor } from './analysis.js';
import { ROLE_MAP } from '../data/roles.js';

/** No analysis for this many days counts as inactive. */
export const INACTIVE_DAYS = 30;
const DAY = 86_400_000;
const TREND_WEEKS = 12;

export const ATTENTION_REASONS = {
  'not-started': 'Not started',
  'low-readiness': 'Low readiness',
  inactive: `Inactive ${INACTIVE_DAYS}+ days`,
  dropping: 'Readiness dropping',
};

/** Accept ISO strings, Firestore Timestamps or { seconds }. */
export const toMillis = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return null;
};

const average = (values) => (values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null);

const targetRoleName = (career) => {
  if (!career?.targetRoleId) return null;
  if (career.targetRoleId === 'custom') return career.customRole?.name || 'Custom role';
  return ROLE_MAP[career.targetRoleId]?.name || null;
};

/** Older snapshots stored "Skill - reason"; keep only the skill name. */
const gapName = (value) => String(value).split(' - ')[0].trim();

const gapsOf = (snapshot) =>
  Array.isArray(snapshot?.gaps) && snapshot.gaps.length
    ? snapshot.gaps.map((g) => ({ name: g.skillName, priority: g.priority }))
    : (snapshot?.missing_skills || []).map((name) => ({ name: gapName(name), priority: null }));

/** One row per student, newest analysis first. */
const buildRows = (students, byUser, now) =>
  students.map((user) => {
    const history = byUser.get(user.id) || [];
    const latest = history[0] || null;
    // Only compare with a previous analysis for the same role, or a goal change reads as a drop.
    const previous = latest ? history.slice(1).find((a) => (a.role_id || a.career_role) === (latest.role_id || latest.career_role)) : null;
    const readiness = latest ? latest.readiness_score ?? 0 : null;
    const delta = latest && previous ? readiness - (previous.readiness_score ?? 0) : null;
    const lastActiveAt = latest ? latest.at : null;
    const gaps = latest ? gapsOf(latest) : [];

    const reasons = [];
    if (!latest) reasons.push('not-started');
    else {
      if (readiness < READINESS_BANDS.find((b) => b.id === 'building').min) reasons.push('low-readiness');
      if (now - lastActiveAt > INACTIVE_DAYS * DAY) reasons.push('inactive');
      if (delta != null && delta <= -5) reasons.push('dropping');
    }

    return {
      id: user.id,
      name: user.name || user.email || 'Unnamed student',
      email: user.email || '',
      roleName: latest?.career_role || targetRoleName(user.career),
      companyName: latest ? latest.company_name || null : user.career?.targetCompany?.name || null,
      readiness,
      delta,
      band: latest ? readinessBandFor(readiness) : null,
      gapCount: gaps.length,
      criticalGaps: gaps.filter((g) => g.priority === 'critical').map((g) => g.name),
      analyses: history.length,
      lastActiveAt,
      joinedAt: toMillis(user.createdAt),
      reasons,
      needsAttention: reasons.length > 0,
    };
  });

/** Average of each student's latest readiness as of the end of each week. */
const weeklyTrend = (byUser, now) => {
  const points = [];
  for (let w = TREND_WEEKS - 1; w >= 0; w -= 1) {
    const end = now - w * 7 * DAY;
    const scores = [];
    for (const history of byUser.values()) {
      const asOf = history.find((a) => a.at <= end);
      if (asOf) scores.push(asOf.readiness_score ?? 0);
    }
    if (scores.length) {
      points.push({
        value: average(scores),
        students: scores.length,
        label: w === 0 ? 'Now' : new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
  }
  return points;
};

const groupBy = (rows, key) => {
  const groups = new Map();
  for (const row of rows) {
    const name = row[key];
    if (!name) continue;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  return [...groups.entries()]
    .map(([name, members]) => ({
      name,
      students: members.length,
      averageReadiness: average(members.map((m) => m.readiness)),
      jobReady: members.filter((m) => m.band?.id === 'ready').length,
    }))
    .sort((a, b) => b.students - a.students || b.averageReadiness - a.averageReadiness);
};

/**
 * @param {{ users: object[], analyses: object[], now?: number }} input
 *   users: users/{uid} documents with `id`; admins are excluded.
 *   analyses: skill_analysis documents with `userId` and `createdAt`.
 */
export const buildCampusAnalytics = ({ users = [], analyses = [], now = Date.now() }) => {
  const students = users.filter((u) => u.role !== 'admin');
  const studentIds = new Set(students.map((s) => s.id));

  const byUser = new Map();
  for (const analysis of analyses) {
    if (!studentIds.has(analysis.userId)) continue;
    const at = toMillis(analysis.createdAt);
    if (at == null) continue;
    if (!byUser.has(analysis.userId)) byUser.set(analysis.userId, []);
    byUser.get(analysis.userId).push({ ...analysis, at });
  }
  for (const history of byUser.values()) history.sort((a, b) => b.at - a.at);

  const rows = buildRows(students, byUser, now);
  const analysed = rows.filter((r) => r.readiness != null);

  const gapCounts = new Map();
  for (const userId of byUser.keys()) {
    for (const gap of gapsOf(byUser.get(userId)[0])) {
      const entry = gapCounts.get(gap.name) || { name: gap.name, students: 0, critical: 0 };
      entry.students += 1;
      if (gap.priority === 'critical') entry.critical += 1;
      gapCounts.set(gap.name, entry);
    }
  }

  return {
    summary: {
      registered: students.length,
      analysed: analysed.length,
      notStarted: rows.length - analysed.length,
      averageReadiness: average(analysed.map((r) => r.readiness)),
      jobReady: analysed.filter((r) => r.band.id === 'ready').length,
      activeRecently: analysed.filter((r) => now - r.lastActiveAt <= INACTIVE_DAYS * DAY).length,
      needsAttention: rows.filter((r) => r.needsAttention).length,
      totalAnalyses: [...byUser.values()].reduce((sum, h) => sum + h.length, 0),
    },
    // Lowest band first, so the chart reads left to right.
    distribution: [...READINESS_BANDS].reverse().map((band) => ({
      id: band.id,
      label: band.label,
      range: band.id === 'ready' ? `${band.min}–100` : `${band.min}–${READINESS_BANDS[READINESS_BANDS.indexOf(band) - 1].min - 1}`,
      students: analysed.filter((r) => r.band.id === band.id).length,
    })),
    trend: weeklyTrend(byUser, now),
    topGaps: [...gapCounts.values()].sort((a, b) => b.students - a.students || b.critical - a.critical).slice(0, 10),
    byRole: groupBy(analysed, 'roleName'),
    byCompany: groupBy(analysed, 'companyName'),
    noCompany: analysed.filter((r) => !r.companyName).length,
    students: rows,
  };
};

// ── Table helpers ──────────────────────────────────────────────────────────

export const STUDENT_FILTERS = {
  all: () => true,
  attention: (row) => row.needsAttention,
  ready: (row) => row.band?.id === 'ready',
  'not-started': (row) => row.readiness == null,
};

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name),
  readiness: (a, b) => (a.readiness ?? -1) - (b.readiness ?? -1),
  delta: (a, b) => (a.delta ?? -Infinity) - (b.delta ?? -Infinity),
  gaps: (a, b) => a.criticalGaps.length - b.criticalGaps.length || a.gapCount - b.gapCount,
  active: (a, b) => (a.lastActiveAt ?? 0) - (b.lastActiveAt ?? 0),
};

export const filterStudents = (rows, { filter = 'all', role = '', search = '', sort = 'readiness', dir = 'desc' } = {}) => {
  const needle = search.trim().toLowerCase();
  const list = rows.filter(
    (row) =>
      (STUDENT_FILTERS[filter] || STUDENT_FILTERS.all)(row) &&
      (!role || row.roleName === role) &&
      (!needle || `${row.name} ${row.email} ${row.roleName || ''} ${row.companyName || ''}`.toLowerCase().includes(needle)),
  );
  const compare = SORTERS[sort] || SORTERS.readiness;
  return list.sort((a, b) => (dir === 'asc' ? compare(a, b) : compare(b, a)) || a.name.localeCompare(b.name));
};

/** Spreadsheet apps run cells starting with these as formulas. */
const FORMULA_START = /^[=+\-@\t\r]/;

const csvCell = (value) => {
  let text = value == null ? '' : String(value);
  // Neutralise text (names, roles) that a spreadsheet would execute; numbers like -5 stay numbers.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const isoDay = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

export const studentsToCsv = (rows) => {
  const header = ['Name', 'Email', 'Target role', 'Target company', 'Readiness', 'Change', 'Band', 'Critical gaps', 'Total gaps', 'Needs attention', 'Last analysis', 'Joined'];
  const lines = rows.map((r) => [
    r.name,
    r.email,
    r.roleName || '',
    r.companyName || '',
    r.readiness ?? '',
    r.delta ?? '',
    r.band?.label || 'Not started',
    r.criticalGaps.join('; '),
    r.gapCount,
    r.reasons.map((reason) => ATTENTION_REASONS[reason]).join('; '),
    isoDay(r.lastActiveAt),
    isoDay(r.joinedAt),
  ]);
  return [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n');
};
