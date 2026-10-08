import { Link } from 'react-router-dom';
import { Check, ArrowUpRight, GraduationCap, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import { cx } from '../../lib/cx';

/**
 * "This week" checklist. Roadmap tasks and the weekly practice habit are
 * checkable; assessments link to the quiz and tick themselves when passed.
 */
const WeekPlan = ({ items, onToggleTask, onToggleHabit, paused }) => (
  <ul className="divide-y divide-line">
    {items.map((item) => {
      const checkable = item.kind === 'task' || item.kind === 'habit';
      const toggle = () => (item.kind === 'habit' ? onToggleHabit(item.id) : onToggleTask(item.id));
      return (
        <li key={item.id} className="flex items-start gap-3 py-2.5">
          {checkable ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.title}
              disabled={paused && item.kind === 'task'}
              onClick={toggle}
              className={cx(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                item.done ? 'border-success bg-success' : 'border-slate-300 bg-white hover:border-slate-400',
              )}
            >
              {item.done && <Check className="h-3 w-3 text-white animate-pop" strokeWidth={3} />}
            </button>
          ) : (
            <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded', item.done ? 'bg-success text-white' : 'bg-accent-50 text-accent-600')} aria-hidden>
              {item.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <GraduationCap className="h-3 w-3" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className={cx('text-sm', item.done ? 'text-muted line-through decoration-slate-300' : 'text-ink')}>{item.title}</p>
            <p className="text-xs text-muted">
              {item.phaseTitle || 'Weekly practice'}
              {item.hours ? ` · ~${item.hours}h` : ''}
            </p>
          </div>
          {item.kind === 'assessment' && !item.done && item.link && (
            <Button size="xs" variant="secondary" to={item.link}>
              Start
            </Button>
          )}
          {item.kind !== 'assessment' && item.link && (
            item.external ? (
              <a href={item.link} target="_blank" rel="noreferrer" className="mt-0.5 rounded p-1 text-muted-light hover:bg-slate-100 hover:text-ink" aria-label="Open practice platform">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link to={item.link} className="mt-0.5 rounded p-1 text-muted-light hover:bg-slate-100 hover:text-ink" aria-label="Open">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )
          )}
        </li>
      );
    })}
  </ul>
);

export default WeekPlan;
