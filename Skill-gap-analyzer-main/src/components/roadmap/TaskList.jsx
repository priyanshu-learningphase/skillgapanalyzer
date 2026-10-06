import { Check } from 'lucide-react';
import { cx } from '../../lib/cx';

export const TASK_TYPES = {
  learn: { label: 'Learn', className: 'text-muted' },
  stretch: { label: 'Advanced', className: 'text-accent-600' },
  practice: { label: 'Practice', className: 'text-warning-700' },
  build: { label: 'Build', className: 'text-success-700' },
};

/** Checklist of roadmap tasks. Toggling records completion and hours. */
const TaskList = ({ tasks, completed, onToggle, disabled, disabledReason }) => (
  <ul className="divide-y divide-line">
    {tasks.map((task) => {
      const done = Boolean(completed[task.id]);
      const type = TASK_TYPES[task.type] || TASK_TYPES.learn;
      return (
        <li key={task.id}>
          <label
            className={cx('flex items-start gap-3 py-2.5', disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}
            title={disabled ? disabledReason : undefined}
          >
            <input type="checkbox" className="peer sr-only" checked={done} disabled={disabled} onChange={() => onToggle(task.id)} />
            <span
              className={cx(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/60 peer-focus-visible:ring-offset-2',
                done ? 'border-success bg-success' : 'border-slate-300 bg-white',
              )}
              aria-hidden
            >
              {done && <Check className="h-3 w-3 text-white animate-pop" strokeWidth={3} />}
            </span>
            <span className={cx('flex-1 text-sm', done ? 'text-muted line-through decoration-slate-300' : 'text-ink')}>{task.title}</span>
            <span className={cx('hidden shrink-0 text-[11px] font-medium uppercase tracking-wide sm:inline', type.className)}>{type.label}</span>
            <span className="tabular w-10 shrink-0 text-right text-xs text-muted">{task.hours}h</span>
          </label>
        </li>
      );
    })}
  </ul>
);

export default TaskList;
