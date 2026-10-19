/**
 * Job application tracker — pure logic.
 *
 * Applications live in the workspace `tracker` slice ({ applications: [] }).
 * Job matching reuses the existing engine: parseJobDescription + matchJob for
 * the job match %, and jobToCustomRole + analyzeRole for prioritised gaps.
 */

import { parseJobDescription, matchJob, jobToCustomRole } from './jobDescription.js';
import { analyzeRole } from './analysis.js';
import { buildCustomRole } from '../data/roles.js';
import { dayKey } from './progress.js';

export const APPLICATION_STATUSES = [
  { id: 'saved', label: 'Saved', tone: 'neutral', description: 'Interested, not applied yet' },
  { id: 'applied', label: 'Applied', tone: 'accent', description: 'Application submitted' },
  { id: 'assessment', label: 'Assessment', tone: 'accent', description: 'Online test or take-home' },
  { id: 'interview', label: 'Interview', tone: 'warning', description: 'Interviews in progress' },
  { id: 'offer', label: 'Offer', tone: 'success', description: 'Offer received' },
  { id: 'rejected', label: 'Rejected', tone: 'danger', description: 'Not moving forward' },
  { id: 'withdrawn', label: 'Withdrawn', tone: 'neutral', description: 'You withdrew' },
];
export const STATUS_MAP = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.id, s]));
export const ACTIVE_STATUSES = ['saved', 'applied', 'assessment', 'interview'];
const SUBMITTED = ['applied', 'assessment', 'interview', 'offer', 'rejected'];
const RESPONDED = ['assessment', 'interview', 'offer'];

export const INTERVIEW_TYPES = [
  { id: 'phone', label: 'Phone screen' },
  { id: 'technical', label: 'Technical' },
  { id: 'coding', label: 'Coding' },
  { id: 'system-design', label: 'System design' },
  { id: 'hr', label: 'HR / behavioural' },
  { id: 'managerial', label: 'Managerial' },
  { id: 'onsite', label: 'Onsite / final' },
  { id: 'other', label: 'Other' },
];
export const INTERVIEW_OUTCOMES = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'awaiting', label: 'Awaiting result' },
  { id: 'passed', label: 'Passed' },
  { id: 'failed', label: 'Not passed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const LIMITS = { company: 120, role: 120, notes: 5000, description: 20000, url: 500, nextAction: 200 };
export const MAX_APPLICATIONS = 300;

export const emptyTracker = () => ({ applications: [] });
export const normalizeTracker = (raw) => ({ ...emptyTracker(), ...(raw || {}), applications: Array.isArray(raw?.applications) ? raw.applications : [] });

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (value) => DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
const trimTo = (value, max) => String(value ?? '').trim().slice(0, max);

/** Whole days from today to a YYYY-MM-DD date (negative = past). */
export const daysUntil = (date, now = new Date()) => {
  if (!date) return null;
  const target = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  const today = new Date(`${dayKey(now)}T00:00:00`);
  return Math.round((target - today) / 86_400_000);
};

/** Field-level validation for the add/edit form. */
export const validateApplication = (input) => {
  const errors = {};
  if (!String(input.company || '').trim()) errors.company = 'Enter the company name.';
  else if (String(input.company).trim().length > LIMITS.company) errors.company = `Keep it under ${LIMITS.company} characters.`;
  if (!String(input.role || '').trim()) errors.role = 'Enter the role title.';
  else if (String(input.role).trim().length > LIMITS.role) errors.role = `Keep it under ${LIMITS.role} characters.`;
  if (input.url && !/^https?:\/\/\S+\.\S+/i.test(String(input.url).trim())) errors.url = 'Use a full link starting with https://';
  for (const field of ['appliedOn', 'deadline']) {
    if (input[field] && !isValidDate(input[field])) errors[field] = 'Use a valid date.';
  }
  if (input.nextActionDue && !isValidDate(input.nextActionDue)) errors.nextActionDue = 'Use a valid date.';
  if (input.description && String(input.description).length > LIMITS.description) errors.description = `Job descriptions are limited to ${LIMITS.description.toLocaleString()} characters.`;
  if (!STATUS_MAP[input.status || 'saved']) errors.status = 'Choose a status.';
  return { ok: Object.keys(errors).length === 0, errors };
};

const parseIfJd = (text) => (text && text.trim().length >= 40 ? parseJobDescription(text) : null);

/** Build a new application from form input. Validate first. */
export const createApplication = (input, now = new Date()) => {
  const at = now.toISOString();
  const status = input.status || 'saved';
  const description = trimTo(input.description, LIMITS.description);
  return {
    id: newId('app'),
    company: trimTo(input.company, LIMITS.company),
    role: trimTo(input.role, LIMITS.role),
    url: trimTo(input.url, LIMITS.url),
    location: trimTo(input.location, 120),
    description,
    parsed: input.parsed || parseIfJd(description),
    status,
    appliedOn: input.appliedOn || (status !== 'saved' && status !== 'withdrawn' ? dayKey(now) : null),
    deadline: input.deadline || null,
    nextAction: input.nextActionText ? { text: trimTo(input.nextActionText, LIMITS.nextAction), due: input.nextActionDue || null, done: false } : null,
    notes: trimTo(input.notes, LIMITS.notes),
    contacts: [],
    interviews: [],
    jobId: input.jobId || null,
    history: [{ at, status, note: 'Added' }],
    createdAt: at,
    updatedAt: at,
  };
};

/** Apply form edits. Re-parses the job description when it changes. */
export const updateApplication = (app, input, now = new Date()) => {
  const at = now.toISOString();
  const next = { ...app, updatedAt: at };
  for (const field of ['company', 'role', 'url', 'location', 'notes']) {
    if (field in input) next[field] = trimTo(input[field], LIMITS[field] || 120);
  }
  for (const field of ['appliedOn', 'deadline']) if (field in input) next[field] = input[field] || null;
  if ('description' in input && input.description !== app.description) {
    next.description = trimTo(input.description, LIMITS.description);
    next.parsed = parseIfJd(next.description);
  }
  if ('nextActionText' in input) {
    next.nextAction = input.nextActionText ? { text: trimTo(input.nextActionText, LIMITS.nextAction), due: input.nextActionDue || null, done: false } : null;
  }
  if (input.status && input.status !== app.status) return setStatus(next, input.status, '', now);
  return next;
};

/** Move to a status, recording it in the history. */
export const setStatus = (app, status, note = '', now = new Date()) => {
  if (!STATUS_MAP[status] || status === app.status) return app;
  const at = now.toISOString();
  return {
    ...app,
    status,
    appliedOn: app.appliedOn || (SUBMITTED.includes(status) ? dayKey(now) : null),
    history: [...(app.history || []), { at, status, note: trimTo(note, 300) }],
    updatedAt: at,
  };
};

export const completeNextAction = (app, now = new Date()) => (app.nextAction ? { ...app, nextAction: { ...app.nextAction, done: true, doneAt: now.toISOString() }, updatedAt: now.toISOString() } : app);

const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

export const saveInterview = (app, round, now = new Date()) => {
  const item = {
    id: round.id || newId('int'),
    round: trimTo(round.round, 120) || 'Interview',
    type: INTERVIEW_TYPES.some((t) => t.id === round.type) ? round.type : 'other',
    date: round.date && isValidDate(round.date.slice(0, 10)) ? round.date : null,
    time: /^\d{2}:\d{2}$/.test(round.time || '') ? round.time : '',
    outcome: INTERVIEW_OUTCOMES.some((o) => o.id === round.outcome) ? round.outcome : 'scheduled',
    notes: trimTo(round.notes, 2000),
  };
  let next = { ...app, interviews: upsert(app.interviews || [], item).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999')), updatedAt: now.toISOString() };
  // Scheduling an interview moves an earlier-stage application forward.
  if (['saved', 'applied', 'assessment'].includes(next.status) && item.outcome !== 'cancelled') next = setStatus(next, 'interview', `Interview: ${item.round}`, now);
  return next;
};

export const removeInterview = (app, id, now = new Date()) => ({ ...app, interviews: (app.interviews || []).filter((i) => i.id !== id), updatedAt: now.toISOString() });

export const saveContact = (app, contact, now = new Date()) => {
  const item = {
    id: contact.id || newId('ct'),
    name: trimTo(contact.name, 120),
    title: trimTo(contact.title, 120),
    email: trimTo(contact.email, 200),
    phone: trimTo(contact.phone, 40),
    link: trimTo(contact.link, LIMITS.url),
    notes: trimTo(contact.notes, 1000),
  };
  return { ...app, contacts: upsert(app.contacts || [], item), updatedAt: now.toISOString() };
};

export const validateContact = (contact) => {
  const errors = {};
  if (!String(contact.name || '').trim()) errors.name = 'Enter a name.';
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = 'Enter a valid email.';
  if (contact.link && !/^https?:\/\/\S+\.\S+/i.test(contact.link.trim())) errors.link = 'Use a full link starting with https://';
  return { ok: Object.keys(errors).length === 0, errors };
};

export const removeContact = (app, id, now = new Date()) => ({ ...app, contacts: (app.contacts || []).filter((c) => c.id !== id), updatedAt: now.toISOString() });

// ── Derived views ──────────────────────────────────────────────────────────

const isActive = (app) => ACTIVE_STATUSES.includes(app.status);

/**
 * Deadlines, interviews and next actions in the coming `days`, plus anything
 * overdue. Sorted soonest first.
 */
export const upcomingItems = (apps, { now = new Date(), days = 14 } = {}) => {
  const items = [];
  for (const app of apps) {
    const base = { appId: app.id, company: app.company, role: app.role };
    if (app.deadline && app.status === 'saved') {
      const d = daysUntil(app.deadline, now);
      if (d <= days) items.push({ ...base, id: `${app.id}:deadline`, kind: 'deadline', title: `Apply to ${app.company}`, date: app.deadline, days: d, overdue: d < 0 });
    }
    if (app.nextAction && !app.nextAction.done && isActive(app)) {
      const d = app.nextAction.due ? daysUntil(app.nextAction.due, now) : null;
      if (d == null || d <= days) items.push({ ...base, id: `${app.id}:action`, kind: 'action', title: app.nextAction.text, date: app.nextAction.due, days: d, overdue: d != null && d < 0 });
    }
    for (const round of app.interviews || []) {
      // Closed applications (offer, rejected, withdrawn) need no reminders.
      if (!isActive(app) || round.outcome !== 'scheduled' || !round.date) continue;
      const d = daysUntil(round.date, now);
      if (d >= 0 && d <= days) items.push({ ...base, id: `${app.id}:${round.id}`, kind: 'interview', title: `${round.round} — ${app.company}`, date: round.date, time: round.time, days: d, overdue: false, interviewType: round.type });
    }
  }
  return items.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.days ?? 999) - (b.days ?? 999));
};

export const applicationStats = (apps) => {
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s.id, 0]));
  for (const app of apps) if (byStatus[app.status] != null) byStatus[app.status] += 1;
  // Count what an application reached, not only where it is now.
  const reached = (app, statuses) => statuses.includes(app.status) || (app.history || []).some((h) => statuses.includes(h.status));
  const submitted = apps.filter((a) => reached(a, SUBMITTED)).length;
  const responded = apps.filter((a) => reached(a, RESPONDED)).length;
  const interviewed = apps.filter((a) => reached(a, ['interview', 'offer']) || (a.interviews || []).length > 0).length;
  return {
    total: apps.length,
    active: apps.filter(isActive).length,
    byStatus,
    submitted,
    responseRate: submitted ? Math.round((responded / submitted) * 100) : null,
    interviewRate: submitted ? Math.round((interviewed / submitted) * 100) : null,
    offers: byStatus.offer,
  };
};

const SORTERS = {
  updated: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''),
  company: (a, b) => a.company.localeCompare(b.company),
  deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
  applied: (a, b) => (b.appliedOn || '').localeCompare(a.appliedOn || ''),
  status: (a, b) => APPLICATION_STATUSES.findIndex((s) => s.id === a.status) - APPLICATION_STATUSES.findIndex((s) => s.id === b.status),
};

export const filterApplications = (apps, { search = '', status = 'all', sort = 'updated', matches = {} } = {}) => {
  const needle = search.trim().toLowerCase();
  const list = apps.filter(
    (app) =>
      (status === 'all' || (status === 'active' ? isActive(app) : app.status === status)) &&
      (!needle || `${app.company} ${app.role} ${app.location || ''} ${app.notes || ''}`.toLowerCase().includes(needle)),
  );
  const compare = sort === 'match' ? (a, b) => (matches[b.id] ?? -1) - (matches[a.id] ?? -1) : SORTERS[sort] || SORTERS.updated;
  return list.sort((a, b) => compare(a, b) || a.company.localeCompare(b.company));
};

/**
 * How the user's current skills match this job (existing engine). Returns
 * null when the description has no recognisable skills.
 */
export const matchApplication = (app, levels, careerSkills = []) => {
  if (!app.parsed || (!app.parsed.required.length && !app.parsed.preferred.length)) return null;
  const job = matchJob(app.parsed, levels);
  const targeted = app.parsed.required.length || app.parsed.preferred.length ? analyzeRole(buildCustomRole(jobToCustomRole({ ...app.parsed, title: app.role || app.parsed.title })), careerSkills) : null;
  return {
    match: job.match,
    rows: job.rows,
    have: job.have,
    missing: job.missing,
    criticalMissing: targeted ? targeted.gaps.filter((g) => g.priority === 'critical') : [],
    gaps: targeted ? targeted.gaps : [],
  };
};
