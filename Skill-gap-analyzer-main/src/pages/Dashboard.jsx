/**
 * Dashboard — everything at a glance and the single next step.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Target, ScanSearch, Route, ListOrdered, Flame, Clock, TrendingUp, Play, RefreshCw } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Stat from '../components/ui/Stat';
import ProgressBar from '../components/ui/ProgressBar';
import PriorityBadge from '../components/ui/PriorityBadge';
import ActivityFeed from '../components/progress/ActivityFeed';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { currentStreak, greetingFor, improvedSkills, totalHours } from '../lib/progress';
import { formatWeeks } from '../lib/roadmap';
import { roleIcon } from '../components/careers/roleIcons';

const Welcome = ({ name }) => (
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">
      {greetingFor()}
      {name ? `, ${name}` : ''} 👋
    </h1>
    <p className="mt-1 text-sm text-muted">Let’s find out where you stand.</p>
    <Card className="mt-6 overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1fr]">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Start with a skill analysis</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Tell us the role you want and the skills you have. You’ll get a readiness score, your exact gaps and a personalised roadmap — in about three minutes.
          </p>
          <Button size="lg" to="/onboarding" iconRight={ArrowRight} className="mt-6">
            Analyze My Skills
          </Button>
        </div>
        <ol className="space-y-4 border-t border-line bg-slate-50/60 p-6 sm:p-8 lg:border-l lg:border-t-0">
          {[
            [Target, 'Choose a target role', '12 career paths or your own'],
            [ScanSearch, 'Rate your current skills', 'Beginner, intermediate or advanced'],
            [ListOrdered, 'See prioritised gaps', 'What matters most for the role'],
            [Route, 'Get your roadmap', 'Sized to your schedule and deadline'],
          ].map(([Icon, title, body], i) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-white">
                <Icon className="h-3.5 w-3.5 text-ink" aria-hidden />
              </span>
              <span className="text-sm">
                <span className="block font-medium text-ink">
                  {i + 1}. {title}
                </span>
                <span className="block text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  </div>
);

const Dashboard = () => {
  const { userProfile } = useAuth();
  const { role, analysis, readinessDelta, roadmap, roadmapState, stats, progress, isOnboarded } = useWorkspace();
  const firstName = userProfile?.name?.split(' ')[0];

  if (!isOnboarded) return <Welcome name={firstName} />;

  const streak = currentStreak(progress.activeDates);
  const hours = totalHours(progress.hoursLog);
  const improved = improvedSkills(progress.skillHistory);
  const RoleIcon = roleIcon(role.id);
  const focus = stats?.currentPhase;
  const focusStats = stats?.currentPhaseStats;
  const nextTask = stats?.upNext?.[0];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greetingFor()}
          {firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p className="text-sm text-muted">Here’s where your {role.name} journey stands.</p>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/careers" className="card-interactive flex flex-col p-4">
          <p className="text-[13px] font-medium text-muted">Your current goal</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white">
              <RoleIcon className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-[15px] font-semibold leading-tight text-ink">{role.name}</span>
          </div>
          <span className="mt-auto pt-3 text-xs text-muted">Compare career matches →</span>
        </Link>
        <Stat label="Career readiness" value={analysis.readiness} unit="%" delta={readinessDelta ?? undefined} deltaLabel="%" hint={readinessDelta != null ? 'since last analysis' : 'first analysis'}>
          <ProgressBar value={analysis.readiness} size="sm" className="mt-3" label="Career readiness" />
        </Stat>
        <Stat
          label="Current skill gaps"
          value={analysis.gaps.length}
          hint={analysis.counts.critical ? `${analysis.counts.critical} critical · ${analysis.counts.high} high` : `${analysis.counts.high} high priority`}
        />
        <Stat label="Roadmap progress" value={stats ? stats.pct : '—'} unit={stats ? '%' : ''} hint={stats ? `${stats.phasesDone} of ${stats.phasesTotal} milestones` : 'No roadmap yet'}>
          {stats && <ProgressBar value={stats.pct} size="sm" className="mt-3" tone="ink" label="Roadmap progress" />}
        </Stat>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Focus */}
        <Card className="flex flex-col p-6">
          {!roadmap ? (
            <>
              <p className="eyebrow">Next step</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">Turn your gaps into a plan</h2>
              <p className="mt-1 max-w-md text-sm text-muted">
                You have {analysis.gaps.length} skill gaps for {role.name}. Generate a roadmap ordered by prerequisites and sized to your schedule.
              </p>
              <div className="mt-auto pt-6">
                <Button to="/roadmap" state={{ autoGenerate: true }} iconRight={ArrowRight}>
                  Generate My Roadmap
                </Button>
              </div>
            </>
          ) : roadmapState === 'role-changed' ? (
            <>
              <p className="eyebrow">Roadmap</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">Your goal changed to {role.name}</h2>
              <p className="mt-1 text-sm text-muted">Your current roadmap targets {roadmap.roleName}. Generate a new one to match.</p>
              <div className="mt-auto pt-6">
                <Button to="/roadmap" state={{ autoGenerate: true }} icon={RefreshCw}>
                  Generate new roadmap
                </Button>
              </div>
            </>
          ) : focus ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">Current focus · {formatWeeks(focus)}</p>
                {roadmap.status === 'paused' && <span className="text-xs font-medium text-warning-700">Paused</span>}
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{focus.title}</h2>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={focusStats.pct} label="Current phase progress" />
                <span className="tabular shrink-0 text-xs text-muted">
                  {focusStats.total - focusStats.done} task{focusStats.total - focusStats.done === 1 ? '' : 's'} remaining
                </span>
              </div>
              {nextTask && (
                <div className="mt-5 rounded-lg border border-line bg-slate-50/70 px-4 py-3">
                  <p className="text-xs text-muted">Next task</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{nextTask.title}</p>
                  <p className="mt-0.5 text-xs text-muted">~{nextTask.hours}h</p>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                <Button to={`/roadmap/${focus.id}`} iconRight={roadmap.status === 'paused' ? undefined : ArrowRight} icon={roadmap.status === 'paused' ? Play : undefined}>
                  {roadmap.status === 'paused' ? 'Open roadmap' : 'Continue Roadmap'}
                </Button>
                {roadmapState === 'stale' && (
                  <Button variant="secondary" to="/roadmap" state={{ autoGenerate: true }} icon={RefreshCw}>
                    Update roadmap
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">Roadmap complete</p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight">You finished every phase 🎉</h2>
              <p className="mt-1 text-sm text-muted">Re-run your analysis to see your new readiness, or pick a more senior goal.</p>
              <div className="mt-auto flex gap-2 pt-6">
                <Button to="/analysis">View analysis</Button>
                <Button variant="secondary" to="/careers">
                  Explore careers
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Gaps */}
        <Card>
          <CardHeader title="Top skill gaps" action={<Button variant="link" to="/analysis">View all</Button>} />
          <CardBody>
            {analysis.gaps.length ? (
              <ul className="space-y-3">
                {analysis.gaps.slice(0, 5).map((gap) => (
                  <li key={gap.key}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-ink">{gap.skillName}</span>
                      <PriorityBadge priority={gap.priority} />
                    </div>
                    <ProgressBar value={gap.current} marker={gap.required} size="sm" label={`${gap.skillName} level`} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No gaps — you meet every requirement.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Learning streak" icon={Flame} value={streak} unit={streak === 1 ? ' day' : ' days'} hint={streak ? 'Keep it going today' : 'Complete a task to start one'} />
        <Stat label="Hours learned" icon={Clock} value={hours} unit="h" hint={`${progress.hoursLog.length} sessions logged`} />
        <Stat label="Skills improved" icon={TrendingUp} value={improved.length ? `+${improved.length}` : 0} hint={improved.length ? improved.slice(0, 2).map((s) => s.name).join(', ') : 'Check in after learning'} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Up next" action={roadmap && <Button variant="link" to="/roadmap">Roadmap</Button>} />
          <CardBody>
            {stats?.upNext?.length ? (
              <ul className="divide-y divide-line">
                {stats.upNext.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{task.title}</span>
                      <span className="block text-xs text-muted">{task.phaseTitle}</span>
                    </span>
                    <span className="tabular shrink-0 text-xs text-muted">{task.hours}h</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{roadmap ? 'Nothing left — great work.' : 'Generate a roadmap to see your next tasks.'}</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent activity" action={<Button variant="link" to="/progress">Progress</Button>} />
          <CardBody>
            <ActivityFeed items={progress.activity} limit={5} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
