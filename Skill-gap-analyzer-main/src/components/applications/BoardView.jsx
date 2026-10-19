import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { APPLICATION_STATUSES } from '../../lib/applications';
import { MatchBadge, nextUp } from './parts';
import { cx } from '../../lib/cx';

/**
 * Kanban board. Cards can be dragged between columns; every card also has a
 * status menu so moving works with a keyboard and on touch screens.
 */
const BoardView = ({ applications, matchPct, onMove }) => {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[1180px] grid-cols-7 gap-3">
        {APPLICATION_STATUSES.map((status) => {
          const cards = applications.filter((a) => a.status === status.id);
          return (
            <section
              key={status.id}
              aria-label={`${status.label} (${cards.length})`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOver(status.id);
              }}
              onDragLeave={() => setOver((o) => (o === status.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) onMove(dragId, status.id);
                setDragId(null);
                setOver(null);
              }}
              className={cx('flex min-h-[18rem] flex-col rounded-card border bg-slate-50/70 p-2 transition-colors', over === status.id ? 'border-accent bg-accent-50/60' : 'border-line')}
            >
              <header className="mb-2 flex items-center justify-between px-1.5 pt-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{status.label}</h3>
                <span className="tabular rounded bg-white px-1.5 text-xs font-medium text-muted ring-1 ring-line">{cards.length}</span>
              </header>
              <ul className="flex-1 space-y-2">
                {cards.map((app) => {
                  const next = nextUp(app);
                  return (
                    <li
                      key={app.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(app.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      className={cx('rounded-lg border border-line bg-white p-2.5 shadow-card', dragId === app.id && 'opacity-50')}
                    >
                      <Link to={`/applications/${app.id}`} className="block rounded focus-visible:ring-2">
                        <p className="truncate text-sm font-semibold text-ink">{app.company}</p>
                        <p className="line-clamp-2 text-xs text-muted">{app.role}</p>
                      </Link>
                      {app.location && (
                        <p className="mt-1 flex items-center gap-1 truncate text-2xs text-muted-light">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {app.location}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <MatchBadge value={matchPct[app.id]} />
                      </div>
                      {next && <p className={cx('mt-2 line-clamp-2 text-xs', next.overdue ? 'font-medium text-danger-700' : next.urgent ? 'font-medium text-ink' : 'text-muted')}>{next.label}</p>}
                      <label className="sr-only" htmlFor={`move-${app.id}`}>
                        Move {app.company} to
                      </label>
                      <select
                        id={`move-${app.id}`}
                        value={app.status}
                        onChange={(e) => onMove(app.id, e.target.value)}
                        className="mt-2 w-full rounded-md border border-line bg-white px-1.5 py-1 text-xs text-muted hover:border-slate-300 focus:border-accent focus:outline-none"
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id === app.status ? `${s.label} (current)` : `Move to ${s.label}`}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
              {!cards.length && <p className="px-1.5 pb-2 text-center text-xs text-muted-light">{dragId ? 'Drop here' : 'None'}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default BoardView;
