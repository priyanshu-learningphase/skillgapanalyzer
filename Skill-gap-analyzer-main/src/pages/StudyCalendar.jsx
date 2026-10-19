/**
 * Adaptive study calendar: roadmap tasks scheduled into the user's real
 * availability, around exams, deadlines and interviews.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Download, Settings2, Plus, Trash2, RefreshCw, AlertTriangle, Check, CalendarClock, Clock, Route, MessagesSquare, Pin } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Stat from '../components/ui/Stat';
import Field, { describedBy, inputClass } from '../components/ui/Field';
import { Modal } from '../components/ui/Overlay';
import { EmptyState } from '../components/ui/States';
import { useStudySchedule } from '../hooks/useStudySchedule';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { WEEKDAYS, EVENT_TYPES, EVENT_MAP, addDays, validateAvailability, validateEvent, weekDates, completedInRange, suggestedAvailability } from '../lib/schedule';
import { buildIcs } from '../lib/ics';
import { upcomingItems } from '../lib/applications';
import { cx } from '../lib/cx';

const fmt = (date, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, opts);
const hrs = (n) => `${Math.round(n * 10) / 10}h`;

const AvailabilityForm = ({ initial, onSave, onCancel, saveLabel }) => {
  const [availability, setAvailability] = useState({ ...initial.availability });
  const [maxSession, setMaxSession] = useState(initial.maxSession);
  const [startTime, setStartTime] = useState(initial.startTime || '19:00');
  const [errors, setErrors] = useState({});
  const total = WEEKDAYS.reduce((s, d) => s + (Number(availability[d.id]) || 0), 0);

  const save = () => {
    const parsed = Object.fromEntries(WEEKDAYS.map((d) => [d.id, Number(availability[d.id]) || 0]));
    const result = validateAvailability(parsed, Number(maxSession));
    setErrors(result.errors);
    if (result.ok) onSave({ availability: parsed, maxSession: Number(maxSession), startTime });
  };

  return (
    <div>
      <fieldset>
        <legend className="label">Study hours you can give each day</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div key={d.id}>
              <label htmlFor={`av-${d.id}`} className="block text-center text-xs font-medium text-muted">
                {d.label}
              </label>
              <input
                id={`av-${d.id}`}
                type="number"
                min="0"
                max="14"
                step="0.5"
                inputMode="decimal"
                value={availability[d.id]}
                onChange={(e) => setAvailability((a) => ({ ...a, [d.id]: e.target.value }))}
                aria-invalid={Boolean(errors[d.id])}
                aria-label={`${d.long} study hours`}
                className={inputClass(errors[d.id], 'mt-1 px-2 text-center')}
              />
            </div>
          ))}
        </div>
        <p className={cx('mt-2 text-xs', errors.all ? 'text-danger-700' : 'text-muted')} role={errors.all ? 'alert' : undefined}>
          {errors.all || `${hrs(total)} a week. Use 0 for days you can’t study.`}
        </p>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="max-session" label="Longest session" error={errors.maxSession} hint="Longer tasks are split across days.">
          <select id="max-session" value={maxSession} onChange={(e) => setMaxSession(e.target.value)} className="input" aria-describedby={describedBy('max-session', errors.maxSession, 'hint')}>
            {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((h) => (
              <option key={h} value={h}>
                {h} hour{h === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </Field>
        <Field id="start-time" label="Usual start time" hint="Used for calendar export.">
          <input id="start-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" aria-describedby="start-time-hint" />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={save}>{saveLabel}</Button>
      </div>
    </div>
  );
};

const EventModal = ({ open, onClose, onSave }) => {
  const [v, setV] = useState({ type: 'exam', title: '', date: '', endDate: '' });
  const [errors, setErrors] = useState({});
  const set = (f) => (e) => setV((x) => ({ ...x, [f]: e.target.value }));
  const save = () => {
    const event = { ...v, endDate: v.endDate || null };
    const result = validateEvent(event);
    setErrors(result.errors);
    if (!result.ok) return;
    onSave(event);
    setV({ type: 'exam', title: '', date: '', endDate: '' });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add an event"
      description="Exams, deadlines and interviews change how much study is planned around them."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add event</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ev-type" label="Type" error={errors.type} hint={EVENT_MAP[v.type]?.effect} className="sm:col-span-2">
          <select id="ev-type" value={v.type} onChange={set('type')} className="input" aria-describedby={describedBy('ev-type', errors.type, 'hint')}>
            {EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ev-title" label="Name" error={errors.title} className="sm:col-span-2">
          <input id="ev-title" value={v.title} onChange={set('title')} maxLength={80} placeholder="e.g. DBMS mid-semester exam" className={inputClass(errors.title)} aria-invalid={Boolean(errors.title)} aria-describedby={describedBy('ev-title', errors.title)} />
        </Field>
        <Field id="ev-date" label="Date" error={errors.date}>
          <input id="ev-date" type="date" value={v.date} onChange={set('date')} className={inputClass(errors.date)} aria-invalid={Boolean(errors.date)} aria-describedby={describedBy('ev-date', errors.date)} />
        </Field>
        <Field id="ev-end" label="Ends" optional error={errors.endDate} hint="For multi-day exams or trips">
          <input id="ev-end" type="date" value={v.endDate} onChange={set('endDate')} className={inputClass(errors.endDate)} aria-describedby={describedBy('ev-end', errors.endDate, 'hint')} />
        </Field>
      </div>
    </Modal>
  );
};

const SessionItem = ({ session, done, onToggle, onMove, onUnpin, compact }) => {
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState('');
  if (session.kind === 'prep') {
    return (
      <li className="rounded-md border border-warning-100 bg-warning-50/60 px-2 py-1.5 text-xs">
        <Link to={session.link} className="flex items-start gap-1.5 font-medium text-ink hover:underline">
          <MessagesSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-600" aria-hidden />
          <span>{session.title}</span>
        </Link>
        <p className="mt-0.5 pl-5 text-muted">{hrs(session.hours)} · interview prep</p>
      </li>
    );
  }
  return (
    <li className={cx('rounded-md border px-2 py-1.5 text-xs', done ? 'border-success-100 bg-success-50/50' : 'border-line bg-white')}>
      <div className="flex items-start gap-1.5">
        <input type="checkbox" checked={done} onChange={onToggle} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-accent" aria-label={`Mark “${session.title}” ${done ? 'not done' : 'done'}`} />
        <span className="min-w-0 flex-1">
          <span className={cx('block font-medium', done ? 'text-muted line-through' : 'text-ink')}>{session.title}</span>
          <span className="block text-muted">
            {hrs(session.hours)}
            {session.parts > 1 && ` · part ${session.part} of ${session.parts}`}
            {!compact && session.phaseTitle && ` · ${session.phaseTitle}`}
          </span>
        </span>
        {session.pinned ? (
          <button type="button" onClick={onUnpin} className="rounded p-0.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label={`Unpin “${session.title}”`} title="Pinned to this day — click to unpin">
            <Pin className="h-3 w-3" aria-hidden />
          </button>
        ) : (
          !done && (
            <button type="button" onClick={() => setMoving((m) => !m)} className="rounded p-0.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label={`Move “${session.title}” to another day`} aria-expanded={moving}>
              <CalendarClock className="h-3 w-3" aria-hidden />
            </button>
          )
        )}
      </div>
      {moving && (
        <div className="mt-1.5 flex items-center gap-1 pl-5">
          <label htmlFor={`move-${session.id}`} className="sr-only">
            New date for {session.title}
          </label>
          <input id={`move-${session.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-w-0 flex-1 rounded border border-line px-1 py-0.5 text-xs" />
          <Button
            size="xs"
            disabled={!date}
            onClick={() => {
              onMove(date);
              setMoving(false);
            }}
          >
            Move
          </Button>
        </div>
      )}
    </li>
  );
};

const StudyCalendar = () => {
  const cal = useStudySchedule();
  const { tracker, progress, career } = useWorkspace();
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(() => weekDates(cal.today)[0]);
  const [editing, setEditing] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const { schedule, built, roadmap } = cal;

  const week = useMemo(() => weekDates(weekStart), [weekStart]);
  const dayMap = useMemo(() => new Map(built.days.map((d) => [d.date, d])), [built.days]);
  const thisWeek = weekDates(cal.today);
  const weekPlanned = thisWeek.reduce((s, d) => s + (dayMap.get(d)?.planned || 0), 0);
  const weekCapacity = thisWeek.reduce((s, d) => s + (dayMap.get(d)?.capacity || 0), 0);
  const doneThisWeek = completedInRange(roadmap, progress.completedTasks, thisWeek[0], thisWeek[6]);

  const deadlines = useMemo(() => {
    const items = [
      ...built.events.filter((e) => e.date >= cal.today).map((e) => ({ id: `ev:${e.id || e.title}:${e.date}`, date: e.date, title: e.title, label: EVENT_MAP[e.type]?.label || 'Event', link: e.appId ? `/applications/${e.appId}` : null })),
      ...upcomingItems(tracker.applications, { days: 30 })
        .filter((i) => i.kind === 'deadline' && i.date)
        .map((i) => ({ id: i.id, date: i.date, title: i.title, label: 'Application deadline', link: `/applications/${i.appId}` })),
    ];
    if (built.targetDate && built.targetDate >= cal.today) items.push({ id: 'target', date: built.targetDate, title: 'Roadmap target date', label: 'Goal', link: '/roadmap' });
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  }, [built, tracker.applications, cal.today]);

  const exportIcs = () => {
    const ics = buildIcs({ days: built.days, events: built.events, startTime: schedule.startTime });
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'skillgap-study-plan.ics' });
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const save = async (patch, message) => {
    await cal.saveSettings(patch);
    if (message) toast.success(message);
  };

  if (!schedule.configured) {
    const dailyMinutes = career?.dailyMinutes;
    const initial = dailyMinutes ? { ...schedule, availability: suggestedAvailability(dailyMinutes) } : schedule;
    return (
      <div>
        <PageHeader title="Study calendar" description="Turn your roadmap into a weekly timetable that fits your real week — and adapts around exams, deadlines and interviews." />
        <Card className="max-w-3xl p-6">
          <h2 className="text-[15px] font-semibold text-ink">When can you study?</h2>
          <p className="mt-1 text-sm text-muted">
            {dailyMinutes
              ? `Filled in from the ${dailyMinutes >= 60 ? `${dailyMinutes / 60} hour${dailyMinutes === 60 ? '' : 's'}` : `${dailyMinutes} minutes`} a day you chose, the pace your roadmap is sized for. Adjust any day: weekdays during semester and weekends rarely look the same.`
              : 'Set different hours for each day. Weekdays during semester and weekends rarely look the same.'}
          </p>
          <div className="mt-5">
            <AvailabilityForm initial={initial} onSave={(patch) => save(patch, 'Your study calendar is ready')} saveLabel="Create my schedule" />
          </div>
          {!roadmap && <p className="mt-4 text-xs text-muted">You don’t have a roadmap yet: sessions appear once you generate one.</p>}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Study calendar"
        description="Your roadmap scheduled into the hours you actually have."
        actions={
          <>
            <Button variant="secondary" icon={Settings2} onClick={() => setEditing(true)}>
              Availability
            </Button>
            <Button variant="secondary" icon={Download} onClick={exportIcs} disabled={!built.days.some((d) => d.sessions.length) && !built.events.length}>
              Export .ics
            </Button>
          </>
        }
      />

      {cal.missed.length > 0 && (
        <Card className="mb-4 border-warning-100 bg-warning-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden />
              <span>
                <span className="font-medium">
                  {cal.missed.length} planned session{cal.missed.length === 1 ? '' : 's'} missed
                </span>{' '}
                — e.g. “{cal.missed[0].title}” on {fmt(cal.missed[0].date)}.
              </span>
            </p>
            <Button
              size="sm"
              icon={RefreshCw}
              onClick={async () => {
                await cal.reschedule();
                toast.success('Rescheduled from today', { description: 'Missed work moved into your next available sessions.' });
              }}
            >
              Reschedule from today
            </Button>
          </div>
        </Card>
      )}

      {!roadmap ? (
        <Card className="mb-4">
          <EmptyState compact icon={Route} title="No roadmap to schedule" description="Generate your roadmap and its tasks will be planned into your week." action={<Button to="/roadmap" state={{ autoGenerate: true }}>Generate roadmap</Button>} />
        </Card>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Planned this week" icon={CalendarDays} value={hrs(weekPlanned)} hint={`of ${hrs(weekCapacity)} available`} />
          <Stat label="Completed this week" icon={Check} value={doneThisWeek.length} hint={`${hrs(doneThisWeek.reduce((s, d) => s + d.hours, 0))} of roadmap work`} />
          <Stat label="Remaining workload" icon={Clock} value={hrs(built.remainingHours)} hint={`${hrs(built.weeklyCapacity)} a week available`} />
          <Stat
            label="Finish"
            icon={Route}
            value={built.finishDate ? fmt(built.finishDate, { day: 'numeric', month: 'short' }) : '—'}
            hint={built.unscheduled.length ? `Not within ${Math.round(built.horizonDays / 7)} weeks at this pace` : built.onTrack === false ? `Behind your ${fmt(built.targetDate, { day: 'numeric', month: 'short' })} target` : built.targetDate ? `On track for ${fmt(built.targetDate, { day: 'numeric', month: 'short' })}` : 'No target date set'}
          />
        </div>
      )}

      {built.unscheduled.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden />
          {hrs(built.unscheduled.reduce((s, t) => s + t.hours, 0))} of roadmap work doesn’t fit in the next {Math.round(built.horizonDays / 7)} weeks{built.targetDate ? ', past your target date' : ''}. Add study time or extend your timeline in Settings.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
            <h2 className="text-[15px] font-semibold text-ink">
              Week of {fmt(week[0], { day: 'numeric', month: 'long' })}
            </h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setWeekStart((w) => addDays(w, -7))} disabled={weekStart <= thisWeek[0]} aria-label="Previous week" />
              <Button size="sm" variant="secondary" onClick={() => setWeekStart(thisWeek[0])} disabled={weekStart === thisWeek[0]}>
                This week
              </Button>
              <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => setWeekStart((w) => addDays(w, 7))} disabled={!dayMap.has(addDays(weekStart, 7))} aria-label="Next week" />
            </div>
          </div>
          <CardBody>
            <ol className="grid gap-2 md:grid-cols-7">
              {week.map((date) => {
                const d = dayMap.get(date);
                const past = date < cal.today;
                const isToday = date === cal.today;
                return (
                  <li key={date} className={cx('flex flex-col rounded-lg border p-2 md:min-h-[9rem]', isToday ? 'border-accent bg-accent-50/40' : 'border-line', past && 'opacity-60')}>
                    <div className="flex items-baseline justify-between gap-1">
                      <p className={cx('text-xs font-semibold', isToday ? 'text-accent-700' : 'text-ink')}>
                        {fmt(date, { weekday: 'short', day: 'numeric' })}
                        {isToday && <span className="sr-only"> (today)</span>}
                      </p>
                      {d && !past && <span className="tabular text-2xs text-muted">{d.blocked ? 'blocked' : `${hrs(d.planned)}/${hrs(d.capacity)}`}</span>}
                    </div>
                    {d?.reasons.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {[...new Set(d.reasons)].map((r) => (
                          <li key={r} className="truncate rounded bg-slate-100 px-1 py-0.5 text-2xs text-ink-soft" title={r}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                    {d?.overbooked && <p className="mt-1 text-2xs font-medium text-warning-700">Over your hours</p>}
                    <ul className="mt-1.5 flex-1 space-y-1">
                      {(d?.sessions || []).map((s) => (
                        <SessionItem
                          key={s.id}
                          session={s}
                          compact
                          done={Boolean(s.taskId && progress.completedTasks[s.taskId])}
                          onToggle={() => cal.toggleTask(s.taskId)}
                          onMove={(to) => cal.pinTask(s.taskId, to).then(() => toast.success('Moved', { description: `“${s.title}” is now on ${fmt(to)}.` }))}
                          onUnpin={() => cal.unpinTask(s.taskId)}
                        />
                      ))}
                    </ul>
                    {d && !past && !d.sessions.length && <p className="mt-1 text-2xs text-muted-light">{d.blocked ? '' : d.capacity ? 'Free' : 'Rest day'}</p>}
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming deadlines" icon={CalendarClock} />
            <CardBody>
              {deadlines.length ? (
                <ul className="space-y-2">
                  {deadlines.map((x) => {
                    const body = (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ink">{x.title}</span>
                          <span className="block text-xs text-muted">{x.label}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted">{fmt(x.date, { day: 'numeric', month: 'short' })}</span>
                      </>
                    );
                    return (
                      <li key={x.id}>
                        {x.link ? (
                          <Link to={x.link} className="flex items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50">
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-start gap-2 px-1 py-0.5 text-sm">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">No deadlines coming up.</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Exams & events"
              action={
                <Button size="sm" variant="ghost" icon={Plus} onClick={() => setAddingEvent(true)}>
                  Add
                </Button>
              }
            />
            <CardBody>
              {schedule.events.length ? (
                <ul className="space-y-2">
                  {schedule.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">{e.title}</span>
                        <span className="block text-xs text-muted">
                          {EVENT_MAP[e.type]?.label} · {fmt(e.date, { day: 'numeric', month: 'short' })}
                          {e.endDate && e.endDate !== e.date ? `–${fmt(e.endDate, { day: 'numeric', month: 'short' })}` : ''}
                        </span>
                      </span>
                      <Button size="xs" variant="ghost" icon={Trash2} onClick={() => cal.removeEvent(e.id)} aria-label={`Remove ${e.title}`} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Add exams, assignment deadlines and busy days so your plan works around them.</p>
              )}
              {cal.interviews.length > 0 && (
                <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                  {cal.interviews.length} interview{cal.interviews.length === 1 ? '' : 's'} from your applications are included automatically.
                </p>
              )}
            </CardBody>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-ink">Your week</p>
            <ul className="mt-2 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((d) => (
                <li key={d.id}>
                  <p className="text-2xs text-muted">{d.label}</p>
                  <p className="tabular text-xs font-medium text-ink">{schedule.availability[d.id] ? hrs(schedule.availability[d.id]) : '—'}</p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Sessions up to {hrs(schedule.maxSession)} · prerequisites first, then your biggest gaps.
            </p>
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} size="lg" title="Study availability">
        <AvailabilityForm
          initial={schedule}
          saveLabel="Save & re-plan"
          onCancel={() => setEditing(false)}
          onSave={async (patch) => {
            await save(patch, 'Schedule updated');
            setEditing(false);
          }}
        />
      </Modal>
      <EventModal open={addingEvent} onClose={() => setAddingEvent(false)} onSave={(e) => cal.addEvent(e).then(() => toast.success('Event added', { description: EVENT_MAP[e.type].effect }))} />
    </div>
  );
};

export default StudyCalendar;
