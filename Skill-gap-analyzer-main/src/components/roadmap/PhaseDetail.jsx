import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Check, Clock, CircleDot, Circle, ClipboardCheck, CheckCircle2, FastForward } from 'lucide-react';
import { Drawer, ConfirmDialog } from '../ui/Overlay';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import TaskList from './TaskList';
import ResourceList from './ResourceList';
import SkillCheckIn from '../analysis/SkillCheckIn';
import { formatWeeks } from '../../lib/roadmap';

const Section = ({ title, children }) => (
  <section className="border-t border-line px-5 py-5 sm:px-6">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
    {children}
  </section>
);

/**
 * Detail panel for a roadmap phase: why it matters, prerequisites, levels,
 * tasks, resources, check-in and "Mark Complete".
 */
const PhaseDetail = ({ phase, stats, open, onClose, completed, levels, onToggleTask, onComplete, onCheckIn, paused, phasesById, statsById }) => {
  const [confirm, setConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checkInSkill, setCheckInSkill] = useState(null);
  if (!phase) return null;

  const isDone = stats?.status === 'completed';
  const remaining = phase.tasks.filter((t) => !completed[t.id]).length;

  const markComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(phase.id);
      setConfirm(false);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={phase.title}
      footer={
        <>
          <span className="mr-auto text-xs text-muted">{isDone ? 'All tasks complete' : `${remaining} task${remaining === 1 ? '' : 's'} remaining`}</span>
          {phase.skills.length > 0 && (
            <Button variant="secondary" icon={ClipboardCheck} onClick={() => setCheckInSkill(phase.skills[0])}>
              Check in
            </Button>
          )}
          <Button icon={CheckCircle2} onClick={() => setConfirm(true)} disabled={paused || (isDone && !phase.skills.some((s) => (levels[s.id]?.level ?? 0) < s.target))}>
            {isDone ? 'Update skill levels' : 'Mark Complete'}
          </Button>
        </>
      }
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="eyebrow">
            {formatWeeks(phase)} · {phase.category}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{phase.title}</h2>
        </div>
        <Button variant="ghost" size="xs" onClick={onClose} aria-label="Close" className="h-7 w-7 px-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs text-muted">Progress</p>
            <p className="mt-1 text-lg font-semibold text-ink">{stats?.pct ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Estimated time</p>
            <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-ink">
              <Clock className="h-4 w-4 text-muted-light" aria-hidden />
              {phase.estimatedHours}h
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Tasks</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {stats?.done ?? 0}/{stats?.total ?? phase.tasks.length}
            </p>
          </div>
          <ProgressBar value={stats?.pct ?? 0} className="col-span-3" tone={isDone ? 'success' : 'accent'} label="Phase progress" />
        </div>

        {phase.skills.length > 0 && (
          <Section title="Your level">
            <ul className="space-y-4">
              {phase.skills.map((skill) => {
                const now = levels[skill.id]?.level ?? skill.current;
                return (
                  <li key={skill.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{skill.name}</span>
                      <span className="tabular text-xs text-muted">
                        Current <span className="font-medium text-ink">{now}%</span> · Target <span className="font-medium text-ink">{skill.target}%</span>
                      </span>
                    </div>
                    <ProgressBar value={now} marker={skill.target} tone={now >= skill.target ? 'success' : 'accent'} label={`${skill.name} level`} />
                    {now !== skill.current && <p className="mt-1 text-xs text-muted">Was {skill.current}% when this roadmap was generated.</p>}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Why you’re learning this">
          <p className="text-sm leading-relaxed text-ink">{phase.why}</p>
        </Section>

        {phase.prerequisites.length > 0 && (
          <Section title="Prerequisites">
            <ul className="space-y-2">
              {phase.prerequisites.map((pre) => {
                const phaseStatus = pre.phaseId ? statsById[pre.phaseId]?.status : null;
                const met = pre.status === 'met' || phaseStatus === 'completed';
                return (
                  <li key={pre.skillId} className="flex items-center gap-2 text-sm">
                    {met ? (
                      <Check className="h-4 w-4 text-success-600" aria-hidden />
                    ) : phaseStatus === 'current' ? (
                      <CircleDot className="h-4 w-4 text-accent" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-300" aria-hidden />
                    )}
                    <span className="text-ink">{pre.name}</span>
                    <span className="ml-auto text-xs text-muted">
                      {met ? (pre.status === 'met' ? `You have ${pre.level}%` : 'Completed') : (
                        <Link to={`/roadmap/${pre.phaseId}`} className="hover:text-ink hover:underline">
                          In {phasesById[pre.phaseId]?.title || 'an earlier phase'}
                        </Link>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Tasks">
          <TaskList tasks={phase.tasks} completed={completed} onToggle={onToggleTask} disabled={paused} disabledReason="Resume your roadmap to track tasks" />
          {phase.skippedTopics.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
                <FastForward className="h-3.5 w-3.5" aria-hidden />
                {phase.skippedTopics.length} topic{phase.skippedTopics.length === 1 ? '' : 's'} skipped — you already know them
              </summary>
              <ul className="mt-2 space-y-1 pl-5 text-xs text-muted">
                {phase.skippedTopics.map((t) => (
                  <li key={t} className="list-disc">
                    {t}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Section>

        <Section title="Resources">
          <ResourceList resources={phase.resources} practice={phase.practice} project={phase.project} />
        </Section>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={markComplete}
        loading={completing}
        title={isDone ? 'Update your skill levels?' : `Mark “${phase.title}” complete?`}
        description={
          phase.skills.length
            ? `${isDone ? '' : 'All remaining tasks will be checked off. '}Your level in ${phase.skills.map((s) => `${s.name} (→ ${s.target}%)`).join(', ')} will be updated and your readiness recalculated.`
            : 'All remaining tasks in this phase will be checked off.'
        }
        confirmLabel={isDone ? 'Update levels' : 'Mark complete'}
      />

      <SkillCheckIn
        open={Boolean(checkInSkill)}
        onClose={() => setCheckInSkill(null)}
        skillId={checkInSkill?.id}
        skillName={checkInSkill?.name}
        currentLevel={checkInSkill ? levels[checkInSkill.id]?.level ?? checkInSkill.current : 0}
        targetLevel={checkInSkill?.target}
        onSave={(level, source) => onCheckIn(checkInSkill, level, source)}
      />
    </Drawer>
  );
};

export default PhaseDetail;
