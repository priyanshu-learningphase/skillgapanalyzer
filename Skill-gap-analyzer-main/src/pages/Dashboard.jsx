/**
 * Dashboard — where you stand, what's holding you back and what to do this week.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Target, FileText, Github, ScanSearch, Route, RefreshCw, ArrowUpRight, Building2, CalendarCheck } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Stat from '../components/ui/Stat';
import ProgressBar from '../components/ui/ProgressBar';
import ScoreRing from '../components/ui/ScoreRing';
import LineChart from '../components/ui/LineChart';
import DistributionBar from '../components/ui/DistributionBar';
import PriorityBadge from '../components/ui/PriorityBadge';
import { EmptyState } from '../components/ui/States';
import WeekPlan from '../components/dashboard/WeekPlan';
import { readinessBand } from '../components/analysis/ReadinessCard';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { greetingFor } from '../lib/progress';
import { buildWeekPlan } from '../lib/weekPlan';
import { cx } from '../lib/cx';

const FLOW = [
  [Target, 'Choose a target career', 'Role and, optionally, a target company'],
  [FileText, 'Add your skills', 'Rate them yourself or import from your resume'],
  [Github, 'Analyze your GitHub', 'Optional — evidence from your real projects'],
  [ScanSearch, 'See your exact gaps', 'Readiness score and prioritised gaps'],
  [Route, 'Follow your roadmap', 'Learn → Practice → Build → Assess, week by week'],
];

const Welcome = ({ name }) => (
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">
      {greetingFor()}
      {name ? `, ${name}` : ''} 👋
    </h1>
    <p className="mt-1 text-sm text-muted">Let’s find out where you stand and what to learn next.</p>
    <Card className="mt-6 overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Start with a skill analysis</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Tell us the role you want and what you know. You’ll get a career readiness score, your exact gaps and a week-by-week roadmap — then prove progress with assessments.
          </p>
          <Button size="lg" to="/onboarding" iconRight={ArrowRight} className="mt-6">
            Analyze My Skills
          </Button>
        </div>
        <ol className="space-y-4 border-t border-line bg-slate-50/60 p-6 sm:p-8 lg:border-l lg:border-t-0">
          {FLOW.map(([Icon, title, body], i) => (
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

const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

const Dashboard = () => {
  const { userProfile } = useAuth();
  const { role, analysis, readinessDelta, readinessHistory, roadmap, roadmapState, stats, progress, isOnboarded, latestAssessments, actions } = useWorkspace();
  const firstName = userProfile?.name?.split(' ')[0];

  if (!isOnboarded) return <Welcome name={firstName} />;

  const band = readinessBand(analysis.readiness);
  const previous = readinessDelta != null ? analysis.readiness - readinessDelta : null;
  const blockers = analysis.blockers.slice(0, 3);
  const toNinety = Math.max(0, 90 - analysis.readiness);
  const projectsDone = Object.values(progress.projects || {}).filter((p) => p.status === 'completed').length;
  const assessments = Object.values(latestAssessments);
  const passedCount = assessments.filter((a) => a.pct >= 70).length;
  const weekItems = buildWeekPlan({ roadmap: roadmapState === 'role-changed' ? null : roadmap, completedTasks: progress.completedTasks, weekChecks: progress.weekChecks, analysis });
  const keySkills = [...analysis.items].sort((a, b) => b.weight - a.weight || b.gap - a.gap).slice(0, 6);
  const trend = readinessHistory.map((h) => ({ value: h.readiness_score, label: shortDate(h.createdAt) }));
  if (!trend.length || trend[trend.length - 1].value !== analysis.readiness) trend.push({ value: analysis.readiness, label: 'Now' });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greetingFor()}
            {firstName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            Target: <span className="font-medium text-ink">{role.name}</span>
            {role.company && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" aria-hidden /> {role.company.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" to="/jobs/simulator">
            Compare companies
          </Button>
          <Button variant="secondary" size="sm" to="/profile">
            Change goal
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Readiness */}
        <Card className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing value={analysis.readiness} tone={band.tone === 'muted' ? 'ink' : band.tone} label={`Career readiness ${analysis.readiness} out of 100`}>
              <span className="text-3xl font-semibold tracking-tight text-ink">{analysis.readiness}</span>
              <span className="text-xs text-muted">/ 100</span>
            </ScoreRing>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted">Career Readiness</p>
              <p className="mt-0.5 text-lg font-semibold text-ink">{band.label}</p>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Previous</dt>
                  <dd className="tabular mt-0.5 font-semibold text-ink">{previous ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Current</dt>
                  <dd className="tabular mt-0.5 font-semibold text-ink">{analysis.readiness}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Change</dt>
                  <dd className={cx('tabular mt-0.5 font-semibold', readinessDelta > 0 ? 'text-success-700' : readinessDelta < 0 ? 'text-danger-700' : 'text-ink')}>
                    {readinessDelta == null ? '—' : `${readinessDelta > 0 ? '+' : ''}${readinessDelta}`}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink">{toNinety ? `What’s keeping you from 90+` : 'You’re above 90 — keep your skills sharp'}</p>
            {toNinety > 0 && (
              <ul className="mt-3 space-y-2">
                {blockers.map((b) => (
                  <li key={b.key}>
                    <Link to={`/gap?skill=${b.skillId}`} className="group flex items-center gap-3 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
                      <PriorityBadge priority={b.priority} showLabel={false} />
                      <span className="flex-1 truncate text-ink">{b.skillName}</span>
                      <span className="tabular text-xs text-muted">
                        {b.current}% → {b.required}%
                      </span>
                      <span className="tabular w-14 text-right text-xs font-semibold text-success-700">+{b.pointsAvailable} pts</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Skill overview */}
        <Card>
          <CardHeader title="Skill overview" description={`${analysis.counts.met} of ${analysis.items.length} required skills at target level`} action={<Button variant="link" to="/gap">Details</Button>} />
          <CardBody>
            <DistributionBar
              segments={[
                { label: 'Mastered', value: analysis.counts.strong, color: 'bg-success' },
                { label: 'In progress', value: analysis.counts.improve, color: 'bg-warning' },
                { label: 'Missing', value: analysis.counts.missing, color: 'bg-slate-300' },
              ]}
            />
            <ul className="mt-5 space-y-3">
              {keySkills.map((item) => (
                <li key={item.key} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="truncate text-ink">{item.skillName}</span>
                  <ProgressBar value={item.current} marker={item.required} size="sm" tone={item.gap ? 'accent' : 'success'} label={`${item.skillName} level`} />
                  <span className="tabular text-right text-xs text-muted">{item.current}%</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Skills completed" value={analysis.counts.met} hint={`of ${analysis.items.length} required`} />
        <Stat label="Skills remaining" value={analysis.gaps.length} hint={analysis.counts.critical ? `${analysis.counts.critical} critical` : 'none critical'} />
        <Stat label="Roadmap progress" value={stats ? stats.pct : '—'} unit={stats ? '%' : ''} hint={stats ? `${stats.phasesDone}/${stats.phasesTotal} milestones` : 'No roadmap yet'} />
        <Stat label="Projects completed" value={projectsDone} hint={<Link to="/projects" className="hover:text-ink">View projects →</Link>} />
        <Stat label="Assessments passed" value={passedCount} hint={assessments.length ? `${assessments.length} taken` : <Link to="/assessments" className="hover:text-ink">Take one →</Link>} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* This week */}
        <Card>
          <CardHeader
            title="This week"
            icon={CalendarCheck}
            description={roadmap && roadmapState !== 'role-changed' ? `Sized to your ${roadmap.settings.weeklyHours}h weekly budget` : undefined}
            action={roadmap && <Button variant="link" to="/roadmap">Roadmap</Button>}
          />
          <CardBody>
            {!roadmap || roadmapState === 'role-changed' ? (
              <EmptyState
                compact
                icon={Route}
                title={roadmap ? `Your goal changed to ${role.name}` : 'No plan for this week yet'}
                description="Generate your roadmap to get a weekly action plan."
                action={
                  <Button to="/roadmap" state={{ autoGenerate: true }} icon={roadmap ? RefreshCw : undefined} iconRight={roadmap ? undefined : ArrowRight}>
                    {roadmap ? 'Generate new roadmap' : 'Generate My Roadmap'}
                  </Button>
                }
              />
            ) : roadmap.status === 'paused' ? (
              <EmptyState compact title="Your roadmap is paused" description="Resume it to see this week’s plan." action={<Button to="/roadmap">Open roadmap</Button>} />
            ) : weekItems.length ? (
              <>
                <WeekPlan items={weekItems} onToggleTask={actions.toggleTask} onToggleHabit={actions.toggleWeekCheck} />
                {roadmapState === 'stale' && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Your skills changed —{' '}
                    <Link to="/roadmap" state={{ autoGenerate: true }} className="font-medium text-ink hover:underline">
                      update your roadmap
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">Every roadmap task is done. Re-run your analysis or pick a more senior goal.</p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Career readiness over time" action={<Button variant="link" to="/progress">Progress</Button>} />
            <CardBody>
              {trend.length >= 2 ? (
                <LineChart points={trend} target={90} targetLabel="90 = job-ready" ariaLabel="Career readiness over time" format={(v) => `${v}/100`} />
              ) : (
                <p className="text-sm text-muted">Your trend appears after your next check-in, assessment or completed phase.</p>
              )}
            </CardBody>
          </Card>
          {stats && roadmapState !== 'role-changed' && (
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-ink">Roadmap completion</p>
                <Link to="/roadmap" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
                  Open <ArrowUpRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
              <DistributionBar
                className="mt-3"
                segments={[
                  { label: 'Completed', value: stats.doneTasks, color: 'bg-success' },
                  { label: 'Remaining', value: stats.totalTasks - stats.doneTasks, color: 'bg-slate-200' },
                ]}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
