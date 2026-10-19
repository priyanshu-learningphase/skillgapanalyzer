/**
 * Adaptive study calendar — pure logic.
 *
 * buildSchedule() turns the roadmap's unfinished tasks (already ordered by
 * prerequisites and priority) into dated study sessions that fit each day's
 * real availability, around exams, assignments, interviews and busy days.
 *
 *  - exam:        day blocked; the 3 days before at half capacity (revision time)
 *  - assignment:  deadline day and the day before at half capacity
 *  - interview / placement: day at half capacity, plus 1h prep sessions on the
 *                 2 days before (interviews from the application tracker included)
 *  - busy:        day blocked
 *  - pins:        tasks the user moved to a specific date go there first
 */

import { dayKey } from './progress.js';

export const WEEKDAYS = [
  { id: 'mon', label: 'Mon', long: 'Monday' },
  { id: 'tue', label: 'Tue', long: 'Tuesday' },
  { id: 'wed', label: 'Wed', long: 'Wednesday' },
  { id: 'thu', label: 'Thu', long: 'Thursday' },
  { id: 'fri', label: 'Fri', long: 'Friday' },
  { id: 'sat', label: 'Sat', long: 'Saturday' },
  { id: 'sun', label: 'Sun', long: 'Sunday' },
];

export const EVENT_TYPES = [
  { id: 'exam', label: 'Exam', effect: 'Day blocked; lighter study load for 3 days before' },
  { id: 'assignment', label: 'Assignment deadline', effect: 'Lighter load on the day and the day before' },
  { id: 'interview', label: 'Interview', effect: 'Prep sessions on the 2 days before' },
  { id: 'placement', label: 'Placement drive', effect: 'Prep sessions on the 2 days before' },
  { id: 'busy', label: 'Busy / unavailable', effect: 'No study planned' },
];
export const EVENT_MAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.id, e]));

export const emptySchedule = () => ({
  configured: false,
  availability: { mon: 1.5, tue: 1.5, wed: 1.5, thu: 1.5, fri: 1, sat: 3, sun: 2 },
  maxSession: 2,
  startTime: '19:00',
  events: [],
  pins: {},
  plan: null,
});

/**
 * Starting hours for the availability form, from the daily time picked in
 * onboarding. Matches the roadmap's own pace (six study days a week), so the
 * calendar and the roadmap agree on when the plan finishes.
 */
export const suggestedAvailability = (dailyMinutes) => {
  const perDay = Math.round((Number(dailyMinutes) / 60) * 2) / 2;
  if (!(perDay > 0)) return emptySchedule().availability;
  return Object.fromEntries(WEEKDAYS.map((d) => [d.id, d.id === 'sun' ? 0 : Math.min(perDay, 14)]));
};

export const normalizeSchedule = (raw) => {
  const base = emptySchedule();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    availability: { ...base.availability, ...(raw.availability || {}) },
    events: Array.isArray(raw.events) ? raw.events : [],
    pins: raw.pins && typeof raw.pins === 'object' ? raw.pins : {},
  };
};

const DAY = 86_400_000;
const parseDay = (key) => new Date(`${key}T00:00:00`);
export const addDays = (key, n) => {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
};
export const weekdayOf = (key) => WEEKDAYS[(parseDay(key).getDay() + 6) % 7].id;
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / DAY);
const roundHalf = (n) => Math.round(n * 2) / 2;

export const validateEvent = (event) => {
  const errors = {};
  if (!EVENT_MAP[event.type]) errors.type = 'Choose a type.';
  if (!String(event.title || '').trim()) errors.title = 'Give it a name, e.g. “DBMS mid-sem”.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date || '')) errors.date = 'Pick a date.';
  if (event.endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(event.endDate) || event.endDate < event.date)) errors.endDate = 'End date must be on or after the start date.';
  return { ok: Object.keys(errors).length === 0, errors };
};

export const validateAvailability = (availability, maxSession) => {
  const errors = {};
  for (const d of WEEKDAYS) {
    const h = Number(availability[d.id]);
    if (!Number.isFinite(h) || h < 0 || h > 14) errors[d.id] = '0–14 hours';
  }
  if (!Object.keys(errors).length && WEEKDAYS.every((d) => !Number(availability[d.id]))) errors.all = 'Add study time to at least one day.';
  if (!(maxSession >= 0.5 && maxSession <= 6)) errors.maxSession = 'Between 0.5 and 6 hours.';
  return { ok: Object.keys(errors).length === 0, errors };
};

/** Dates an event covers (inclusive). */
const eventDates = (e) => {
  const out = [];
  const end = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
  for (let k = e.date; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
};

/**
 * @param {object} p
 * @param {object} p.roadmap        active roadmap (or null)
 * @param {object} p.completedTasks taskId → ISO date
 * @param {object} p.schedule       stored schedule settings
 * @param {Array}  p.interviews     [{ id, title, date }] from the application tracker
 * @param {string} p.today          YYYY-MM-DD
 * @param {number} p.horizonDays
 */
/** Days to plan: at least 9 weeks, through the roadmap target date (+2 weeks), at most 26 weeks. */
export const horizonFor = (roadmap, today = dayKey()) => {
  const target = roadmap?.settings?.timelineWeeks && roadmap.createdAt ? addDays(dayKey(new Date(roadmap.createdAt)), roadmap.settings.timelineWeeks * 7) : null;
  return Math.min(182, Math.max(63, target ? daysBetween(today, target) + 14 : 63));
};

export const buildSchedule = ({ roadmap, completedTasks = {}, schedule, interviews = [], today = dayKey(), horizonDays = horizonFor(roadmap, today) }) => {
  const s = normalizeSchedule(schedule);
  const maxSession = Math.max(0.5, Number(s.maxSession) || 2);
  const days = [];
  const byDate = new Map();
  for (let i = 0; i < horizonDays; i += 1) {
    const date = addDays(today, i);
    const base = Math.max(0, Number(s.availability[weekdayOf(date)]) || 0);
    const day = { date, base, factor: 1, blocked: false, reasons: [], events: [], sessions: [] };
    days.push(day);
    byDate.set(date, day);
  }

  // Events: user-entered plus interviews from the tracker (not duplicated).
  const events = [...s.events.map((e) => ({ ...e, source: 'user' })), ...interviews.filter((iv) => !s.events.some((e) => e.type === 'interview' && e.date === iv.date && e.title === iv.title)).map((iv) => ({ ...iv, type: 'interview', source: 'applications' }))];
  const prep = [];
  for (const e of events) {
    for (const date of eventDates(e)) {
      const day = byDate.get(date);
      if (!day) continue;
      day.events.push(e);
      if (e.type === 'exam' || e.type === 'busy') {
        day.blocked = true;
        day.reasons.push(`${EVENT_MAP[e.type].label}: ${e.title}`);
      } else if (e.type === 'assignment' || e.type === 'interview' || e.type === 'placement') {
        day.factor = Math.min(day.factor, 0.5);
        day.reasons.push(`${EVENT_MAP[e.type].label}: ${e.title}`);
      }
    }
    const lead = { exam: [1, 2, 3], assignment: [1], interview: [1, 2], placement: [1, 2] }[e.type] || [];
    for (const n of lead) {
      const day = byDate.get(addDays(e.date, -n));
      if (!day || day.blocked) continue;
      if (e.type === 'exam' || e.type === 'assignment') {
        day.factor = Math.min(day.factor, 0.5);
        day.reasons.push(`${e.type === 'exam' ? 'Revising for' : 'Finishing'} ${e.title}`);
      } else {
        prep.push({ date: day.date, event: e });
      }
    }
  }
  for (const day of days) day.capacity = day.blocked ? 0 : roundHalf(day.base * day.factor);
  const free = (day) => day.capacity - day.sessions.reduce((sum, x) => sum + x.hours, 0);

  // 1. Interview / placement prep comes before roadmap work on those days.
  for (const { date, event } of prep) {
    const day = byDate.get(date);
    const hours = Math.min(1, Math.max(0.5, free(day)));
    if (free(day) >= 0.5) {
      day.sessions.push({ id: `prep:${event.id || event.title}:${date}`, kind: 'prep', title: `Prepare for ${event.title}`, hours, link: event.appId ? `/applications/${event.appId}` : '/interview' });
    }
  }

  // Remaining roadmap work, in roadmap order.
  const live = roadmap && roadmap.status !== 'paused' ? roadmap : null;
  const queue = [];
  for (const phase of live?.phases || []) {
    for (const task of phase.tasks) {
      if (completedTasks[task.id]) continue;
      queue.push({ ...task, phaseId: phase.id, phaseTitle: phase.title, left: task.hours, part: 0 });
    }
  }
  const remainingHours = queue.reduce((sum, t) => sum + t.hours, 0);

  // 2. Pinned tasks go on their chosen day (may exceed capacity: flagged).
  for (const task of queue) {
    const pinned = s.pins[task.id];
    const day = pinned && byDate.get(pinned);
    if (!day) continue;
    day.sessions.push({ id: `${task.id}#pin`, kind: 'task', taskId: task.id, title: task.title, hours: task.left, phaseId: task.phaseId, phaseTitle: task.phaseTitle, skillId: task.skillId, type: task.type, pinned: true, part: 1, parts: 1 });
    task.left = 0;
  }

  // 3. Fill each day in order, splitting long tasks into sessions.
  let qi = 0;
  for (const day of days) {
    while (qi < queue.length && queue[qi].left <= 0) qi += 1;
    let room = free(day);
    let sessionsToday = 0;
    while (qi < queue.length && room >= 0.5) {
      const task = queue[qi];
      const hours = roundHalf(Math.min(task.left, room, maxSession));
      if (hours < 0.5) break;
      task.part += 1;
      day.sessions.push({ id: `${task.id}#${task.part}`, kind: 'task', taskId: task.id, title: task.title, hours, phaseId: task.phaseId, phaseTitle: task.phaseTitle, skillId: task.skillId, type: task.type, part: task.part });
      task.left = roundHalf(task.left - hours);
      room = roundHalf(room - hours);
      sessionsToday += 1;
      if (task.left <= 0) qi += 1;
      if (sessionsToday >= 4) break;
    }
  }
  // Number parts so the UI can say "part 1 of 3".
  const partsOf = {};
  for (const day of days) for (const x of day.sessions) if (x.taskId) partsOf[x.taskId] = (partsOf[x.taskId] || 0) + 1;
  for (const day of days) for (const x of day.sessions) if (x.taskId && !x.pinned) x.parts = partsOf[x.taskId];

  const unscheduled = queue.filter((t) => t.left > 0).map((t) => ({ taskId: t.id, title: t.title, hours: t.left }));
  for (const day of days) {
    day.planned = day.sessions.reduce((sum, x) => sum + x.hours, 0);
    day.overbooked = day.planned > day.capacity;
  }
  const lastDay = [...days].reverse().find((d) => d.sessions.some((x) => x.kind === 'task'));
  const targetDate = live?.settings?.timelineWeeks && live.createdAt ? addDays(dayKey(new Date(live.createdAt)), live.settings.timelineWeeks * 7) : null;
  const availableToTarget = targetDate ? days.filter((d) => d.date <= targetDate).reduce((sum, d) => sum + d.capacity, 0) : null;

  return {
    days,
    horizonDays,
    events,
    remainingHours,
    unscheduled,
    finishDate: unscheduled.length ? null : lastDay?.date || null,
    targetDate,
    onTrack: targetDate ? !unscheduled.length && (!lastDay || lastDay.date <= targetDate) : null,
    availableToTarget,
    weeklyCapacity: WEEKDAYS.reduce((sum, d) => sum + (Number(s.availability[d.id]) || 0), 0),
  };
};

/** Snapshot to store, so missed sessions can be found later. */
export const planSnapshot = (built, now = new Date()) => ({
  generatedAt: now.toISOString(),
  sessions: built.days.flatMap((d) => d.sessions.filter((x) => x.kind === 'task').map((x) => ({ date: d.date, taskId: x.taskId, title: x.title, hours: x.hours }))),
});

/** Sessions from the saved plan dated before today whose task isn't done. */
export const missedSessions = (plan, completedTasks = {}, today = dayKey()) => {
  if (!plan?.sessions) return [];
  const seen = new Set();
  return plan.sessions.filter((x) => {
    if (x.date >= today || completedTasks[x.taskId] || seen.has(x.taskId)) return false;
    seen.add(x.taskId);
    return true;
  });
};

/** Monday-based week containing `date`. */
export const weekDates = (date) => {
  const start = addDays(date, -((parseDay(date).getDay() + 6) % 7));
  return WEEKDAYS.map((_, i) => addDays(start, i));
};

/** Tasks completed in a date range (inclusive), with hours. */
export const completedInRange = (roadmap, completedTasks, from, to) => {
  const tasks = new Map((roadmap?.phases || []).flatMap((p) => p.tasks.map((t) => [t.id, t])));
  return Object.entries(completedTasks)
    .filter(([, at]) => {
      const day = dayKey(new Date(at));
      return day >= from && day <= to;
    })
    .map(([id, at]) => ({ id, at, title: tasks.get(id)?.title || id, hours: tasks.get(id)?.hours || 0 }));
};

export { daysBetween };
