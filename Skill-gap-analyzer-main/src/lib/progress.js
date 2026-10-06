/**
 * Progress tracking helpers: streaks, hours, skill improvements and the
 * activity feed. Dates are stored as local calendar days (YYYY-MM-DD).
 */

export const MAX_ACTIVITY = 60;

export const emptyProgress = () => ({
  completedTasks: {},
  hoursLog: [],
  activeDates: [],
  skillHistory: [],
  activity: [],
  lastSeenActivityAt: null,
});

/** Accept partial/legacy documents and always return the full shape. */
export const normalizeProgress = (raw) => ({ ...emptyProgress(), ...(raw || {}) });

export const dayKey = (date = new Date()) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

const parseDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (key, days) => {
  const date = parseDay(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
};

/** Consecutive active days ending today (or yesterday, so a streak survives until midnight). */
export const currentStreak = (activeDates = [], today = dayKey()) => {
  const days = new Set(activeDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

export const totalHours = (hoursLog = []) =>
  Math.round(hoursLog.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0) * 10) / 10;

/** Hours per week for the last `weeks` weeks (Monday-based), oldest first. */
export const weeklyHours = (hoursLog = [], weeks = 8, today = new Date()) => {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday of this week
  const buckets = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - i * 7);
    buckets.push({ start: weekStart, key: dayKey(weekStart), hours: 0 });
  }
  for (const entry of hoursLog) {
    const date = parseDay(entry.date);
    for (let i = buckets.length - 1; i >= 0; i -= 1) {
      if (date >= buckets[i].start) {
        const end = new Date(buckets[i].start);
        end.setDate(end.getDate() + 7);
        if (date < end) buckets[i].hours += Number(entry.hours) || 0;
        break;
      }
    }
  }
  return buckets.map((b) => ({ ...b, hours: Math.round(b.hours * 10) / 10 }));
};

/**
 * Skills whose level is now higher than their baseline. Levels entered during
 * onboarding, or skills added by hand, are a baseline — not growth.
 */
export const improvedSkills = (skillHistory = []) => {
  const first = new Map();
  const last = new Map();
  for (const entry of skillHistory) {
    if (!first.has(entry.skillId)) {
      const isBaseline = entry.source === 'onboarding' || (entry.source === 'manual' && !entry.from);
      first.set(entry.skillId, isBaseline ? entry.to : entry.from);
    }
    last.set(entry.skillId, entry);
  }
  return [...last.values()]
    .filter((entry) => entry.to > first.get(entry.skillId))
    .map((entry) => ({ skillId: entry.skillId, name: entry.name, from: first.get(entry.skillId), to: entry.to }));
};

export const greetingFor = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const makeActivity = (type, message, meta = {}) => ({
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  type,
  message,
  at: new Date().toISOString(),
  ...meta,
});

export const pushActivity = (progress, activity) => ({
  ...progress,
  activity: [activity, ...(progress.activity || [])].slice(0, MAX_ACTIVITY),
});

export const markActive = (progress, date = dayKey()) =>
  progress.activeDates.includes(date) ? progress : { ...progress, activeDates: [...progress.activeDates, date].slice(-400) };

export const relativeTime = (iso, now = Date.now()) => {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
