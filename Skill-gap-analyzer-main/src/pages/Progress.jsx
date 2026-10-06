/**
 * Progress — journey completion, streaks, hours and skill growth.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Clock, TrendingUp, Flag, Trash2, Route, ArrowUpRight } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Stat from '../components/ui/Stat';
import ProgressBar from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/States';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import WeeklyHoursChart from '../components/progress/WeeklyHoursChart';
import LogTimeForm from '../components/progress/LogTimeForm';
import ActivityFeed from '../components/progress/ActivityFeed';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { currentStreak, greetingFor, improvedSkills, totalHours } from '../lib/progress';
import { getSkill } from '../data/skills';

const Progress = () => {
  const { role, career, roadmap, roadmapState, stats, progress, isOnboarded, actions } = useWorkspace();
  const toast = useToast();

  if (!isOnboarded) return <NoAnalysisState title="No progress yet" description="Analyze your skills and generate a roadmap to start tracking progress." />;

  const streak = currentStreak(progress.activeDates);
  const hours = totalHours(progress.hoursLog);
  const improved = improvedSkills(progress.skillHistory);
  const skillOptions = roadmap
    ? roadmap.phases.flatMap((p) => p.skills.map((s) => ({ id: s.id, name: s.name })))
    : career.skills.map((s) => ({ id: s.id, name: s.name }));
  const focus = stats?.currentPhase;
  const focusStats = stats?.currentPhaseStats;
  const recentLog = [...progress.hoursLog].sort((a, b) => (b.date + (b.id || '')).localeCompare(a.date + (a.id || ''))).slice(0, 8);
  const taskTitles = new Map((roadmap?.phases || []).flatMap((p) => p.tasks.map((t) => [t.id, t.title])));
  const sessionLabel = (entry) =>
    entry.note ||
    (entry.taskId ? taskTitles.get(entry.taskId) || 'Roadmap task' : entry.skillId ? getSkill(entry.skillId)?.name || 'Study' : 'General study');

  return (
    <div>
      <PageHeader eyebrow="Progress" title={`${greetingFor()} 👋`} description={`Your ${role.name} journey so far.`} />

      {/* Journey */}
      <Card className="p-6">
        {roadmap && roadmapState !== 'role-changed' ? (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-sm font-medium text-muted">{roadmap.roleName} Journey</p>
              <p className="mt-1 text-5xl font-semibold tracking-tight text-ink">{stats.pct}%</p>
              <ProgressBar value={stats.pct} size="lg" className="mt-4" tone={stats.pct === 100 ? 'success' : 'accent'} label="Journey progress" />
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-ink">
                  {stats.phasesDone} / {stats.phasesTotal}
                </span>{' '}
                milestones completed · {stats.doneTasks} of {stats.totalTasks} tasks
              </p>
            </div>
            <div className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              {focus ? (
                <>
                  <p className="text-xs text-muted">Current focus</p>
                  <Link to={`/roadmap/${focus.id}`} className="group mt-1 inline-flex items-center gap-1 text-lg font-semibold text-ink">
                    {focus.title}
                    <ArrowUpRight className="h-4 w-4 text-muted-light group-hover:text-ink" aria-hidden />
                  </Link>
                  <p className="text-sm text-muted">
                    {focusStats.total - focusStats.done} task{focusStats.total - focusStats.done === 1 ? '' : 's'} remaining
                  </p>
                  {stats.upNext.length > 0 && (
                    <>
                      <p className="mt-4 text-xs text-muted">Up next</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {stats.upNext.slice(0, 3).map((t) => (
                          <li key={t.id} className="flex items-start gap-2 text-sm text-ink">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-light" aria-hidden />
                            {t.title}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col justify-center">
                  <Flag className="h-5 w-5 text-success-600" aria-hidden />
                  <p className="mt-2 font-semibold text-ink">Every milestone complete</p>
                  <p className="text-sm text-muted">Re-run your analysis to see how far you’ve come.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            compact
            icon={Route}
            title={roadmap ? `Your goal changed to ${role.name}` : 'No roadmap yet'}
            description={roadmap ? 'Generate a roadmap for your new goal to keep tracking milestones.' : 'Generate a roadmap to track milestones and tasks.'}
            action={
              <Button to="/roadmap" state={{ autoGenerate: true }} iconRight={ArrowRight}>
                {roadmap ? 'Generate new roadmap' : 'Generate My Roadmap'}
              </Button>
            }
          />
        )}
      </Card>

      {/* Stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Learning streak"
          icon={Flame}
          value={streak}
          unit={streak === 1 ? ' day' : ' days'}
          hint={`${progress.activeDates.length} active day${progress.activeDates.length === 1 ? '' : 's'} in total`}
        />
        <Stat label="Hours learned" icon={Clock} value={hours} unit="h" hint={roadmap ? `of ~${roadmap.totalHours}h planned` : undefined} />
        <Stat label="Skills improved" icon={TrendingUp} value={improved.length ? `+${improved.length}` : 0} hint="since you started" />
        <Stat label="Roadmap completion" icon={Route} value={stats ? stats.pct : 0} unit="%" hint={stats ? `${stats.doneTasks}/${stats.totalTasks} tasks` : 'No roadmap'} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Hours per week" description="Completed tasks log their estimated time automatically." />
          <CardBody>
            {progress.hoursLog.length ? (
              <WeeklyHoursChart hoursLog={progress.hoursLog} target={roadmap?.settings.weeklyHours} />
            ) : (
              <EmptyState compact icon={Clock} title="No hours logged yet" description="Complete a roadmap task or log time to see your weekly trend." />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Log time" description="Track study that isn’t a roadmap task." />
          <CardBody>
            <LogTimeForm
              skills={skillOptions}
              onSubmit={async (entry) => {
                await actions.logHours(entry);
                toast.success(`Logged ${entry.hours}h`);
              }}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Skill growth" />
          <CardBody>
            {improved.length ? (
              <ul className="space-y-3">
                {improved.map((s) => (
                  <li key={s.skillId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{s.name}</span>
                      <span className="tabular text-xs text-muted">
                        {s.from}% → <span className="font-medium text-success-700">{s.to}%</span>
                      </span>
                    </div>
                    <ProgressBar value={s.to} size="sm" tone="success" label={`${s.name} level`} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Complete a phase or run a skill check-in to record growth.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent sessions" />
          <CardBody>
            {recentLog.length ? (
              <ul className="divide-y divide-line">
                {recentLog.map((entry) => (
                  <li key={entry.id} className="group flex items-center gap-3 py-2 text-sm">
                    <span className="tabular w-10 shrink-0 font-medium text-ink">{entry.hours}h</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{sessionLabel(entry)}</span>
                      <span className="block text-xs text-muted">
                        {new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {entry.source === 'task' ? ' · from task' : ''}
                      </span>
                    </span>
                    {entry.source !== 'task' && (
                      <button
                        type="button"
                        onClick={() => actions.removeHoursEntry(entry.id)}
                        className="rounded p-1 text-muted-light opacity-0 hover:bg-slate-100 hover:text-danger-600 focus:opacity-100 group-hover:opacity-100"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No sessions yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Activity" />
          <CardBody>
            <ActivityFeed items={progress.activity} limit={8} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Progress;
