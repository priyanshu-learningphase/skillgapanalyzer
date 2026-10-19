import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, horizonFor, planSnapshot, missedSessions, validateEvent, validateAvailability, weekDates, weekdayOf, addDays, completedInRange, normalizeSchedule, suggestedAvailability, WEEKDAYS } from '../src/lib/schedule.js';
import { weeklyHoursFor } from '../src/lib/roadmap.js';
import { buildIcs, escapeText, foldLine } from '../src/lib/ics.js';

const TODAY = '2026-10-12'; // a Monday

const roadmap = {
  status: 'active',
  createdAt: '2026-10-12T08:00:00.000Z',
  settings: { timelineWeeks: 4 },
  phases: [
    { id: 'p1', title: 'SQL', tasks: [{ id: 'sql:joins', title: 'Joins', hours: 3, skillId: 'sql', type: 'learn' }, { id: 'sql:practice', title: 'Practice SQL', hours: 1, skillId: 'sql', type: 'practice' }] },
    { id: 'p2', title: 'Docker', tasks: [{ id: 'docker:basics', title: 'Docker basics', hours: 2, skillId: 'docker', type: 'learn' }, { id: 'docker:assess', title: 'Pass the Docker assessment', hours: 0.5, skillId: 'docker', type: 'assess' }] },
  ],
};

const schedule = (o = {}) => normalizeSchedule({ configured: true, availability: { mon: 2, tue: 0, wed: 1, thu: 0, fri: 0, sat: 3, sun: 0 }, maxSession: 2, ...o });
const day = (built, date) => built.days.find((d) => d.date === date);

test('sessions respect each day’s availability and the max session length', () => {
  const built = buildSchedule({ roadmap, schedule: schedule(), today: TODAY, horizonDays: 14 });
  assert.equal(weekdayOf(TODAY), 'mon');
  // Monday 2h: first 2h of Joins. Tuesday 0h. Wednesday 1h: last hour of Joins.
  assert.deepEqual(day(built, TODAY).sessions.map((s) => [s.taskId, s.hours]), [['sql:joins', 2]]);
  assert.equal(day(built, '2026-10-13').sessions.length, 0);
  assert.deepEqual(day(built, '2026-10-14').sessions.map((s) => [s.taskId, s.hours]), [['sql:joins', 1]]);
  // Saturday 3h with a 2h cap per session: practice (1h) then 2h of Docker.
  assert.deepEqual(day(built, '2026-10-17').sessions.map((s) => [s.taskId, s.hours]), [['sql:practice', 1], ['docker:basics', 2]]);
  for (const d of built.days) assert.ok(d.planned <= d.capacity, `${d.date} over capacity`);
  assert.equal(day(built, TODAY).sessions[0].parts, 2, 'split tasks know their part count');
  assert.equal(built.remainingHours, 6.5);
  assert.equal(built.unscheduled.length, 0);
  assert.equal(built.finishDate, '2026-10-19');
  assert.equal(built.targetDate, '2026-11-09');
  assert.equal(built.onTrack, true);
  assert.equal(built.weeklyCapacity, 6);
});

test('completed tasks are skipped and a paused roadmap schedules nothing', () => {
  const built = buildSchedule({ roadmap, completedTasks: { 'sql:joins': '2026-10-10T00:00:00Z' }, schedule: schedule(), today: TODAY, horizonDays: 7 });
  assert.equal(day(built, TODAY).sessions[0].taskId, 'sql:practice');
  assert.equal(buildSchedule({ roadmap: { ...roadmap, status: 'paused' }, schedule: schedule(), today: TODAY }).remainingHours, 0);
});

test('exams block the day and lighten the days before; assignments and interviews lighten their day', () => {
  const s = schedule({
    availability: { mon: 2, tue: 2, wed: 2, thu: 2, fri: 2, sat: 2, sun: 2 },
    events: [
      { id: 'e1', type: 'exam', title: 'DBMS mid-sem', date: '2026-10-16' },
      { id: 'e2', type: 'assignment', title: 'OS lab', date: '2026-10-19' },
      { id: 'e3', type: 'busy', title: 'Family trip', date: '2026-10-21', endDate: '2026-10-22' },
    ],
  });
  const built = buildSchedule({ roadmap, schedule: s, interviews: [{ id: 'iv1', title: 'Technical round — Acme', date: '2026-10-25', appId: 'app1' }], today: TODAY, horizonDays: 21 });
  assert.equal(day(built, '2026-10-16').capacity, 0, 'exam day blocked');
  for (const d of ['2026-10-13', '2026-10-14', '2026-10-15']) assert.equal(day(built, d).capacity, 1, `${d} revision`);
  assert.equal(day(built, TODAY).capacity, 2);
  assert.equal(day(built, '2026-10-18').capacity, 1, 'day before the assignment');
  assert.equal(day(built, '2026-10-19').capacity, 1, 'assignment day');
  assert.ok(['2026-10-21', '2026-10-22'].every((d) => day(built, d).capacity === 0), 'multi-day busy range');
  assert.equal(day(built, '2026-10-25').capacity, 1, 'interview day halved');
  assert.ok(day(built, '2026-10-23').sessions.some((x) => x.kind === 'prep' && /Technical round/.test(x.title)), 'prep two days before');
  assert.ok(day(built, '2026-10-24').sessions[0].kind === 'prep', 'prep comes first');
  assert.ok(day(built, '2026-10-16').reasons.some((r) => /DBMS/.test(r)));
});

test('pinned tasks go on their chosen date, and the rest flows around them', () => {
  const built = buildSchedule({ roadmap, schedule: schedule({ pins: { 'docker:basics': '2026-10-14' } }), today: TODAY, horizonDays: 14 });
  const wed = day(built, '2026-10-14');
  assert.ok(wed.sessions.some((x) => x.taskId === 'docker:basics' && x.pinned));
  assert.equal(wed.overbooked, true, 'pinning can exceed capacity and is flagged');
  assert.ok(!built.days.some((d) => d.sessions.some((x) => x.taskId === 'docker:basics' && !x.pinned)));
});

test('work that doesn’t fit the horizon is reported, not squeezed in', () => {
  const built = buildSchedule({ roadmap, schedule: schedule({ availability: { mon: 0.5, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 } }), today: TODAY, horizonDays: 14 });
  assert.ok(built.unscheduled.length > 0);
  assert.equal(built.finishDate, null);
  assert.equal(built.onTrack, false);
});

test('missed sessions are found from the saved plan', () => {
  const built = buildSchedule({ roadmap, schedule: schedule(), today: TODAY, horizonDays: 14 });
  const plan = planSnapshot(built, new Date('2026-10-12T09:00:00Z'));
  assert.ok(plan.sessions.length >= 4);
  // Two days later, nothing done: Monday's Joins session is missed (once per task).
  const missed = missedSessions(plan, {}, '2026-10-14');
  assert.deepEqual(missed.map((m) => m.taskId), ['sql:joins']);
  assert.deepEqual(missedSessions(plan, { 'sql:joins': '2026-10-13T00:00:00Z' }, '2026-10-14'), []);
});

test('the planning window reaches the roadmap target date', () => {
  assert.equal(horizonFor(null, TODAY), 63, 'at least 9 weeks');
  assert.equal(horizonFor({ ...roadmap, settings: { timelineWeeks: 16 } }, TODAY), 16 * 7 + 14, 'target plus two weeks');
  assert.equal(horizonFor({ ...roadmap, settings: { timelineWeeks: 52 } }, TODAY), 182, 'capped at 26 weeks');
});

test('validation, weeks and completed work', () => {
  assert.ok(validateEvent({ type: 'exam', title: '', date: '' }).errors.title);
  assert.ok(validateEvent({ type: 'exam', title: 'X', date: '2026-10-20', endDate: '2026-10-19' }).errors.endDate);
  assert.ok(validateEvent({ type: 'exam', title: 'X', date: '2026-10-20' }).ok);
  assert.ok(validateAvailability({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }, 2).errors.all);
  assert.ok(validateAvailability({ mon: 20, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 }, 2).errors.mon);
  assert.deepEqual(weekDates('2026-10-15'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  const done = completedInRange(roadmap, { 'sql:joins': '2026-10-13T10:00:00', 'docker:basics': '2026-10-01T10:00:00' }, '2026-10-12', '2026-10-18');
  assert.deepEqual(done.map((d) => [d.id, d.hours]), [['sql:joins', 3]]);
});

test('.ics export follows RFC 5545', () => {
  const built = buildSchedule({ roadmap, schedule: schedule({ events: [{ id: 'e1', type: 'exam', title: 'DBMS, mid-sem; hall 3', date: '2026-10-20' }] }), today: TODAY, horizonDays: 14 });
  const ics = buildIcs({ days: built.days, events: built.events, startTime: '23:30', now: new Date('2026-10-12T00:00:00Z') });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'CRLF line endings only');
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  // Monday 2h from 23:30 crosses midnight.
  assert.match(ics, /DTSTART:20261012T233000\r\nDTEND:20261013T013000/);
  assert.match(ics, /SUMMARY:Exam: DBMS\\, mid-sem\\; hall 3/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021/);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `long line: ${line}`);
  assert.equal(escapeText('a\\b\nc'), 'a\\\\b\\nc');
  const folded = foldLine(`SUMMARY:${'x'.repeat(100)}`);
  assert.ok(folded.includes('\r\n '));
  assert.equal(folded.replace(/\r\n /g, ''), `SUMMARY:${'x'.repeat(100)}`);
});

test('suggested availability matches the weekly hours the roadmap is sized for', () => {
  for (const minutes of [30, 60, 120, 180]) {
    const availability = suggestedAvailability(minutes);
    const total = WEEKDAYS.reduce((sum, d) => sum + availability[d.id], 0);
    assert.equal(total, weeklyHoursFor(minutes), `${minutes} min/day`);
    assert.equal(availability.sun, 0);
    assert.ok(validateAvailability(availability, 2).ok);
  }
  assert.deepEqual(suggestedAvailability(undefined), normalizeSchedule(null).availability);
  assert.deepEqual(suggestedAvailability(0), normalizeSchedule(null).availability);
});
