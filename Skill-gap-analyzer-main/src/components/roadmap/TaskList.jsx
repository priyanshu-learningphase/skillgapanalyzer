import { Link } from 'react-router-dom';
import { Check, ArrowUpRight } from 'lucide-react';
import { hasAssessment } from '../../data/assessments/index';
import { cx } from '../../lib/cx';

export const TASK_TYPES = {
  learn: { label: 'Learn', className: 'text-muted' },
  stretch: { label: 'Advanced', className: 'text-accent-600' },
  practice: { label: 'Practice', className: 'text-warning-700' },
  build: { label: 'Build', className: 'text-success-700' },
  assess: { label: 'Assess', className: 'text-accent-600' },
};

const STAGES = [
  { id: 'learn', label: 'Learn', types: ['learn', 'stretch'] },
  { id: 'practice', label: 'Practice', types: ['practice'] },
  { id: 'build', label: 'Build', types: ['build'] },
  { id: 'assess', label: 'Assess', types: ['assess'] },
];

const TaskRow = ({ task, done, onToggle, disabled, disabledReason }) => {
  const type = TASK_TYPES[task.type] || TASK_TYPES.learn;
  const quizLink = task.type === 'assess' && task.skillId && hasAssessment(task.skillId) ? `/assessments/${task.skillId}` : task.type === 'assess' && task.skillId ? `/gap?skill=${task.skillId}` : null;
  const projectLink = task.projectId ? `/projects/${task.projectId}` : null;
  const link = quizLink || projectLink;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <label className={cx('flex min-w-0 flex-1 items-start gap-3', disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')} title={disabled ? disabledReason : undefined}>
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
      </label>
      {task.type === 'stretch' && <span className={cx('hidden shrink-0 text-[11px] font-medium uppercase tracking-wide sm:inline', type.className)}>{type.label}</span>}
      {link && !done && (
        <Link to={link} className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-accent-600 hover:text-accent-700">
          {quizLink ? (hasAssessment(task.skillId) ? 'Start' : 'Check in') : 'Brief'} <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      )}
      <span className="tabular w-10 shrink-0 text-right text-xs text-muted">{task.hours}h</span>
    </li>
  );
};

/**
 * Roadmap tasks grouped Learn → Practice → Build → Assess. Toggling records
 * completion and hours.
 */
const TaskList = ({ tasks, completed, onToggle, disabled, disabledReason }) => {
  const groups = STAGES.map((stage) => ({ ...stage, tasks: tasks.filter((t) => stage.types.includes(t.type)) })).filter((g) => g.tasks.length);
  return (
    <div className="space-y-1">
      {groups.map((group, index) => {
        const done = group.tasks.filter((t) => completed[t.id]).length;
        return (
          <div key={group.id}>
            <p className={cx('flex items-center justify-between pt-3 text-[11px] font-semibold uppercase tracking-wide', TASK_TYPES[group.id].className)}>
              <span>
                <span className="tabular mr-1.5 text-muted-light">{index + 1}</span>
                {group.label}
              </span>
              <span className="tabular font-medium normal-case tracking-normal text-muted-light">
                {done}/{group.tasks.length}
              </span>
            </p>
            <ul className="divide-y divide-line">
              {group.tasks.map((task) => (
                <TaskRow key={task.id} task={task} done={Boolean(completed[task.id])} onToggle={onToggle} disabled={disabled} disabledReason={disabledReason} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default TaskList;
