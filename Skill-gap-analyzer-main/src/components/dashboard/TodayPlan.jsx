import { Link } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import { cx } from '../../lib/cx';

const fmt = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

/** Today's study sessions from the calendar (or the next day that has some). */
const TodayPlan = ({ built, today, completedTasks, onToggleTask, missedCount }) => {
  const next = built.days.find((d) => d.date >= today && d.sessions.length);
  const isToday = next?.date === today;
  return (
    <div>
      {missedCount > 0 && (
        <p className="mb-3 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
          {missedCount} missed session{missedCount === 1 ? '' : 's'} —{' '}
          <Link to="/calendar" className="font-medium underline">
            reschedule
          </Link>
        </p>
      )}
      {next ? (
        <>
          <p className="mb-2 text-xs font-medium text-muted">{isToday ? 'Today' : `Next study day: ${fmt(next.date)}`}</p>
          <ul className="space-y-1.5">
            {next.sessions.map((s) => {
              if (s.kind === 'prep') {
                return (
                  <li key={s.id}>
                    <Link to={s.link} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-slate-50">
                      <MessagesSquare className="h-4 w-4 text-warning-600" aria-hidden />
                      <span className="flex-1 text-ink">{s.title}</span>
                      <span className="tabular text-xs text-muted">{s.hours}h</span>
                    </Link>
                  </li>
                );
              }
              const done = Boolean(completedTasks[s.taskId]);
              return (
                <li key={s.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm">
                  <input type="checkbox" checked={done} onChange={() => onToggleTask(s.taskId)} className="h-4 w-4 accent-accent" aria-label={`Mark “${s.title}” ${done ? 'not done' : 'done'}`} />
                  <span className={cx('min-w-0 flex-1 truncate', done ? 'text-muted line-through' : 'text-ink')}>{s.title}</span>
                  <span className="tabular shrink-0 text-xs text-muted">
                    {s.hours}h{s.parts > 1 ? ` · ${s.part}/${s.parts}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted">Nothing scheduled in the next few weeks.</p>
      )}
    </div>
  );
};

export default TodayPlan;
