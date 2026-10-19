/**
 * Career market insights from real job ads (aggregation only — fetching
 * happens on the server, see server/market.js).
 *
 * Every number carries its sample size. Salaries are shown only from ads
 * that state one (not provider estimates) and only when enough ads do.
 */

import { detectTechnologies } from './textSkills.js';

export const MARKET_LOCATIONS = [
  { id: 'india', label: 'All India', where: '' },
  { id: 'bengaluru', label: 'Bengaluru', where: 'Bangalore' },
  { id: 'hyderabad', label: 'Hyderabad', where: 'Hyderabad' },
  { id: 'pune', label: 'Pune', where: 'Pune' },
  { id: 'chennai', label: 'Chennai', where: 'Chennai' },
  { id: 'mumbai', label: 'Mumbai', where: 'Mumbai' },
  { id: 'delhi-ncr', label: 'Delhi NCR', where: 'Delhi' },
  { id: 'gurugram', label: 'Gurugram', where: 'Gurgaon' },
  { id: 'noida', label: 'Noida', where: 'Noida' },
  { id: 'kolkata', label: 'Kolkata', where: 'Kolkata' },
];
export const MARKET_LOCATION_MAP = Object.fromEntries(MARKET_LOCATIONS.map((l) => [l.id, l]));

export const EXPERIENCE_LEVELS = [
  { id: 'all', label: 'All levels' },
  { id: 'internship', label: 'Internships' },
  { id: 'entry', label: 'Entry level' },
  { id: 'experienced', label: 'Experienced' },
];

export const MIN_SALARY_SAMPLES = 5;
export const MIN_SKILL_ADS = 2;

const INTERN = /\b(intern|internship|trainee|apprentice)\b/i;
const ENTRY = /\b(junior|jr\.?|entry[- ]level|fresher|freshers|graduate|grad|new grad|associate|0\s*-\s*[12]\s*(yrs?|years))\b/i;
const SENIOR = /\b(senior|sr\.?|lead|principal|staff|manager|architect|head of|director)\b/i;
const YEARS = /\b(\d{1,2})\s*\+?\s*(?:-|to)?\s*(?:\d{1,2})?\s*(?:years?|yrs?)\b/i;

/** Rough experience level from the ad title (and a years mention). A heuristic, labelled as such in the UI. */
export const classifyLevel = (ad) => {
  const title = ad.title || '';
  if (INTERN.test(title)) return 'internship';
  if (SENIOR.test(title)) return 'experienced';
  if (ENTRY.test(title)) return 'entry';
  const years = `${title} ${ad.description || ''}`.match(YEARS);
  if (years) return Number(years[1]) >= 3 ? 'experienced' : 'entry';
  if (/\bfreshers?\b/i.test(ad.description || '')) return 'entry';
  return 'unspecified';
};

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
};

/** Ads with a stated (not predicted) salary give a midpoint. */
const statedSalary = (ad) => {
  const predicted = ad.salary_is_predicted === '1' || ad.salary_is_predicted === 1 || ad.salary_is_predicted === true;
  if (predicted) return null;
  const lo = Number(ad.salary_min);
  const hi = Number(ad.salary_max) || lo;
  if (!(lo > 0)) return null;
  return (lo + hi) / 2;
};

/**
 * @param {Array} ads  provider job ads: { title, description, company, salary_min, salary_max, salary_is_predicted, created }
 * @param {{ level?: string }} options
 */
export const aggregateJobAds = (ads, { level = 'all' } = {}) => {
  const classified = ads.map((ad) => ({ ad, level: classifyLevel(ad) }));
  const levelCounts = { internship: 0, entry: 0, experienced: 0, unspecified: 0 };
  for (const x of classified) levelCounts[x.level] += 1;
  const filtered = level === 'all' ? classified : classified.filter((x) => x.level === level);

  const skillAds = new Map();
  for (const { ad } of filtered) {
    const found = detectTechnologies(`${ad.title || ''}\n${ad.description || ''}`);
    for (const s of found) {
      const entry = skillAds.get(s.id) || { id: s.id, name: s.name, category: s.category, ads: 0 };
      entry.ads += 1;
      skillAds.set(s.id, entry);
    }
  }
  const n = filtered.length;
  const topSkills = [...skillAds.values()]
    .filter((s) => s.ads >= MIN_SKILL_ADS)
    .map((s) => ({ ...s, share: n ? Math.round((s.ads / n) * 100) : 0 }))
    .sort((a, b) => b.ads - a.ads || a.name.localeCompare(b.name))
    .slice(0, 15);

  const salaries = filtered
    .map((x) => statedSalary(x.ad))
    .filter((v) => v != null)
    .sort((a, b) => a - b);
  const salary =
    salaries.length >= MIN_SALARY_SAMPLES
      ? { count: salaries.length, median: percentile(salaries, 0.5), p25: percentile(salaries, 0.25), p75: percentile(salaries, 0.75), currency: 'INR', period: 'year' }
      : { count: salaries.length, median: null };

  const dates = filtered.map((x) => x.ad.created).filter(Boolean).sort();
  return {
    sampleSize: n,
    analysedAds: ads.length,
    levelCounts,
    topSkills,
    salary,
    postedRange: dates.length ? { from: dates[0].slice(0, 10), to: dates[dates.length - 1].slice(0, 10) } : null,
  };
};

export const MARKET_LIMITATIONS = [
  'Based on a sample of recent ads from one provider, not the whole job market.',
  'Skills are detected from ad titles and description snippets, so mentions deeper in a full description can be missed.',
  'Experience level is estimated from ad titles and years mentioned; many ads don’t say.',
  'Salaries are shown only from ads that state one, and only when at least 5 do. Provider estimates are excluded.',
];

/** Compare current demand with the user's levels. */
export const marketGaps = (topSkills, levels = {}) =>
  topSkills.map((s) => {
    const level = levels[s.id]?.level ?? levels[s.id] ?? 0;
    return { ...s, level, missing: level < 40 };
  });

/** Store one snapshot per query per day (for trends over time). */
export const addSnapshot = (snapshots = [], key, result, today) => {
  const entry = { key, date: today, sampleSize: result.sampleSize, skills: Object.fromEntries(result.topSkills.map((s) => [s.id, s.share])) };
  const others = snapshots.filter((s) => !(s.key === key && s.date === today));
  const sameKey = others.filter((s) => s.key === key);
  const kept = [...others.filter((s) => s.key !== key), ...sameKey.slice(-11)];
  return [...kept, entry];
};

/** Share change per skill between the oldest and newest snapshot for a query. */
export const skillTrends = (snapshots = [], key) => {
  const series = snapshots.filter((s) => s.key === key).sort((a, b) => a.date.localeCompare(b.date));
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  return {
    from: first.date,
    to: last.date,
    points: series.length,
    skills: Object.keys(last.skills).map((id) => ({ id, before: first.skills[id] ?? 0, now: last.skills[id], change: last.skills[id] - (first.skills[id] ?? 0) })),
  };
};
