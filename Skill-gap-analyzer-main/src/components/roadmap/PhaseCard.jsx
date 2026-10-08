import { Link } from 'react-router-dom';
import { Check, ChevronDown, Clock, ArrowUpRight, FolderGit2, RotateCcw, FastForward } from 'lucide-react';
import ProgressBar from '../ui/ProgressBar';
import PriorityBadge from '../ui/PriorityBadge';
import TaskList from './TaskList';
import { formatWeeks } from '../../lib/roadmap';
import { cx } from '../../lib/cx';

const StatusNode = ({ status }) => {
  if (status === 'completed') {
    return (
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-success text-white ring-4 ring-canvas">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === 'current') {
    return (
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-white ring-4 ring-canvas">
        <span className="h-2 w-2 rounded-full bg-accent" />
      </span>
    );
  }
  return <span className="relative z-10 flex h-6 w-6 rounded-full border-2 border-slate-200 bg-white ring-4 ring-canvas" />;
};

/**
 * One phase on the roadmap timeline. Collapsed it shows weeks, title, skills
 * and progress; expanded it shows the task checklist, practice and project.
 */
const PhaseCard = ({ phase, stats, expanded, onToggleExpand, completed, onToggleTask, paused, blockedBy, isLast, anchorId }) => {
  const primary = phase.skills[0];
  return (
    <li id={anchorId} className="relative flex scroll-mt-24 gap-4 sm:gap-5">
      {/* Rail */}
      <div className="flex flex-col items-center pt-4">
        <StatusNode status={stats.status} />
        {!isLast && <span className={cx('mt-1 w-px flex-1', stats.status === 'completed' ? 'bg-success/40' : 'bg-line')} aria-hidden />}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className={cx('card overflow-hidden transition-shadow', stats.status === 'current' && 'ring-1 ring-accent/30')}>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            aria-controls={`phase-${phase.id}`}
            className="flex w-full items-start gap-4 px-4 py-4 text-left sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="eyebrow">{formatWeeks(phase)}</span>
                {stats.status === 'current' && <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-600">Current focus</span>}
                {phase.kind !== 'skill' && <span className="text-[11px] font-medium text-muted">{phase.category}</span>}
              </div>
              <h3 className="mt-1 text-[15px] font-semibold text-ink">{phase.title}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                {phase.skills.length > 0 && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {phase.skills.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                        {s.name}
                        <span className="tabular text-muted-light">
                          {s.current}→{s.target}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden /> {phase.estimatedHours}h
                </span>
                {primary?.reason === 'prerequisite' && <span>Prerequisite for {primary.requiredBy.join(', ')}</span>}
                {primary?.priority && primary.reason === 'gap' && <PriorityBadge priority={primary.priority} />}
                {phase.assessmentBand === 'repeat' && (
                  <span className="inline-flex items-center gap-1 font-medium text-warning-700">
                    <RotateCcw className="h-3 w-3" aria-hidden /> Repeating fundamentals
                  </span>
                )}
                {phase.assessmentBand === 'advance' && (
                  <span className="inline-flex items-center gap-1 font-medium text-success-700">
                    <FastForward className="h-3 w-3" aria-hidden /> Beginner content skipped
                  </span>
                )}
              </div>
              {blockedBy && stats.status !== 'completed' && (
                <p className={cx('mt-2 text-xs', stats.done > 0 ? 'text-warning-700' : 'text-muted-light')}>
                  {stats.done > 0 ? `You started this before ${blockedBy} — it builds on that phase.` : `Requires ${blockedBy}`}
                </p>
              )}
            </div>
            <div className="hidden w-28 shrink-0 flex-col items-end gap-1.5 pt-5 sm:flex">
              <span className="tabular text-xs text-muted">
                {stats.done}/{stats.total} tasks
              </span>
              <ProgressBar value={stats.pct} size="sm" tone={stats.status === 'completed' ? 'success' : 'accent'} label={`${phase.title} progress`} />
            </div>
            <ChevronDown className={cx('mt-5 h-4 w-4 shrink-0 text-muted transition-transform duration-200', expanded && 'rotate-180')} aria-hidden />
          </button>

          <div className={cx('grid transition-[grid-template-rows] duration-200 ease-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
            <div id={`phase-${phase.id}`} className="overflow-hidden">
              <div className="border-t border-line px-4 pb-4 pt-2 sm:px-5">
                <div className="mb-1 flex items-center gap-3 sm:hidden">
                  <ProgressBar value={stats.pct} size="sm" label={`${phase.title} progress`} />
                  <span className="tabular shrink-0 text-xs text-muted">{stats.pct}%</span>
                </div>
                <TaskList
                  tasks={phase.tasks}
                  completed={completed}
                  onToggle={onToggleTask}
                  disabled={paused}
                  disabledReason="Resume your roadmap to track tasks"
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {phase.practice && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Practice</p>
                      <p className="mt-0.5 text-sm text-ink">{phase.practice}</p>
                    </div>
                  )}
                  {phase.project?.title &&
                    (phase.project.id ? (
                      <Link to={`/projects/${phase.project.id}`} className="group rounded-lg bg-slate-50 px-3 py-2.5 hover:bg-slate-100">
                        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                          <FolderGit2 className="h-3 w-3" aria-hidden /> Project
                          <ArrowUpRight className="ml-auto h-3 w-3 text-muted-light group-hover:text-ink" aria-hidden />
                        </p>
                        <p className="mt-0.5 text-sm text-ink">{phase.project.title}</p>
                      </Link>
                    ) : (
                      <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                          <FolderGit2 className="h-3 w-3" aria-hidden /> Project
                        </p>
                        <p className="mt-0.5 text-sm text-ink">{phase.project.title}</p>
                      </div>
                    ))}
                </div>
                <Link to={`/roadmap/${phase.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink hover:underline">
                  Open details & resources <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export default PhaseCard;
