import { Link } from 'react-router-dom';
import { CalendarClock, AlertCircle, MessagesSquare, ListTodo } from 'lucide-react';
import Badge from '../ui/Badge';
import { STATUS_MAP, daysUntil } from '../../lib/applications';
import { cx } from '../../lib/cx';

export const StatusBadge = ({ status, className }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.saved;
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
};

/** Job match chip; null when the job description has no recognisable skills. */
export const MatchBadge = ({ value, className }) =>
  value == null ? null : (
    <span
      className={cx('tabular inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', value >= 75 ? 'bg-success-50 text-success-700' : value >= 50 ? 'bg-accent-50 text-accent-700' : 'bg-warning-50 text-warning-700', className)}
      title="Job match: your skills against this job’s required and preferred skills"
    >
      {value}% match
    </span>
  );

export const formatDate = (date) => (date ? new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');

export const relativeDay = (days) => {
  if (days == null) return 'No date';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days < 0 ? `${-days} days overdue` : `In ${days} days`;
};

const KIND_ICON = { deadline: CalendarClock, interview: MessagesSquare, action: ListTodo };

/** Deadlines, interviews and next actions. Used on the tracker and dashboard. */
export const UpcomingList = ({ items, limit = 6, empty = 'Nothing due in the next two weeks.' }) =>
  items.length ? (
    <ul className="space-y-1">
      {items.slice(0, limit).map((item) => {
        const Icon = item.overdue ? AlertCircle : KIND_ICON[item.kind];
        return (
          <li key={item.id}>
            <Link to={`/applications/${item.appId}`} className="flex items-start gap-3 rounded-md px-1.5 py-2 text-sm hover:bg-slate-50">
              <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', item.overdue ? 'text-danger-600' : 'text-muted')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{item.title}</span>
                <span className="block truncate text-xs text-muted">
                  {item.kind === 'interview' ? 'Interview' : item.kind === 'deadline' ? 'Application deadline' : `${item.company} · next action`}
                </span>
              </span>
              <span className={cx('shrink-0 text-xs', item.overdue ? 'font-medium text-danger-700' : item.days != null && item.days <= 2 ? 'font-medium text-ink' : 'text-muted')}>
                {relativeDay(item.days)}
                {item.time && ` · ${item.time}`}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-sm text-muted">{empty}</p>
  );

/** One-line "what's next" for a card or row. */
export const nextUp = (app) => {
  const interview = (app.interviews || []).find((i) => i.outcome === 'scheduled' && i.date && daysUntil(i.date) >= 0);
  if (interview) return { label: `${interview.round} · ${formatDate(interview.date)}`, urgent: daysUntil(interview.date) <= 2 };
  if (app.nextAction && !app.nextAction.done) {
    const d = app.nextAction.due ? daysUntil(app.nextAction.due) : null;
    return { label: app.nextAction.text, urgent: d != null && d <= 0, overdue: d != null && d < 0 };
  }
  if (app.deadline && app.status === 'saved') {
    const d = daysUntil(app.deadline);
    return { label: `Apply by ${formatDate(app.deadline)}`, urgent: d <= 3, overdue: d < 0 };
  }
  return null;
};
