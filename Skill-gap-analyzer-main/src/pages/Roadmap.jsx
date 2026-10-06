/**
 * Roadmap — generate, follow and adapt the personalised learning plan.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  RefreshCw,
  Pause,
  Play,
  Compass,
  AlertTriangle,
  Info,
  Sparkles,
  Cpu,
  ChevronRight,
  History,
  Plus,
  Route as RouteIcon,
  CalendarClock,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import PriorityBadge from '../components/ui/PriorityBadge';
import Popover from '../components/ui/Popover';
import { ConfirmDialog } from '../components/ui/Overlay';
import { ErrorState, Notice } from '../components/ui/States';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import GenerationProgress from '../components/roadmap/GenerationProgress';
import PhaseCard from '../components/roadmap/PhaseCard';
import PhaseDetail from '../components/roadmap/PhaseDetail';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { getAiStatus } from '../services/aiService';
import { dailyTimeLabel, timelineLabel, EXPERIENCE_LEVELS } from '../data/options';
import { weeklyHoursFor } from '../lib/roadmap';
import { relativeTime } from '../lib/progress';
import { cx } from '../lib/cx';

/** "6 months" → "6-month", "1 year" → "1-year". */
const timelineAdjective = (weeks) => timelineLabel(weeks).replace(/ (\w+?)s?$/, '-$1');

const fitText = (roadmap) => {
  const { fit, settings } = roadmap;
  if (fit.status === 'over') return `Needs ~${fit.weeksNeeded} weeks at your pace — ${fit.weeksOver} more than your ${settings.timelineWeeks}-week target`;
  if (fit.status === 'fits') {
    return fit.weeksSpare > 0
      ? `Fits your ${timelineAdjective(settings.timelineWeeks)} timeline with ${fit.weeksSpare} week${fit.weeksSpare === 1 ? '' : 's'} to spare`
      : `Fits your ${timelineAdjective(settings.timelineWeeks)} timeline`;
  }
  return `No deadline · about ${fit.weeksNeeded} weeks at your pace`;
};

const Roadmap = () => {
  const { phaseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { career, role, analysis, roadmap, roadmapState, stats, progress, actions } = useWorkspace();

  const [gen, setGen] = useState({ running: false, stage: null, error: null });
  const [aiEnabled, setAiEnabled] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [confirmRegen, setConfirmRegen] = useState(null);
  const autoRef = useRef(false);

  useEffect(() => {
    getAiStatus().then((status) => setAiEnabled(status.enabled));
  }, []);

  // Expand the current phase by default.
  const currentId = stats?.currentPhase?.id;
  useEffect(() => {
    if (currentId) setExpanded((prev) => (prev.size ? prev : new Set([currentId])));
  }, [currentId]);

  const run = useCallback(
    async ({ useAi = true } = {}) => {
      setGen({ running: true, stage: 'analyze', error: null });
      try {
        const result = await actions.generateRoadmap({ useAi, onStage: (stage) => setGen((g) => ({ ...g, stage })) });
        setGen({ running: false, stage: null, error: null });
        setExpanded(new Set());
        const updated = result.diff ? result.summary : null;
        if (result.ai.status === 'failed') {
          toast.error('Roadmap ready, but AI personalisation failed', {
            description: `${result.ai.message} You’re seeing the rule-based plan.`,
            action: { label: 'Retry with AI', onClick: () => run({ useAi: true }) },
          });
        } else {
          toast.success(updated ? 'Roadmap updated' : 'Your roadmap is ready', {
            description: updated || (result.ai.status === 'applied' ? 'Personalised with AI and validated against your plan.' : 'Built by the dependency-aware planner.'),
          });
        }
      } catch (error) {
        setGen({ running: false, stage: null, error: error.message || 'Roadmap generation failed.' });
      }
    },
    [actions, toast],
  );

  // "Generate My Roadmap" elsewhere in the app lands here with autoGenerate.
  useEffect(() => {
    if (autoRef.current || !location.state?.autoGenerate) return;
    autoRef.current = true;
    navigate(location.pathname, { replace: true, state: null });
    if (analysis && roadmapState !== 'current') run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phasesById = useMemo(() => Object.fromEntries((roadmap?.phases || []).map((p) => [p.id, p])), [roadmap]);
  const selectedPhase = phaseId ? phasesById[phaseId] : null;

  // Phase links can go stale after the roadmap adapts (phases merge or drop out).
  useEffect(() => {
    if (phaseId && roadmap && !phasesById[phaseId]) {
      toast.info('That phase isn’t in your current roadmap', { description: 'It may have changed when your roadmap was updated.' });
      navigate('/roadmap', { replace: true });
    }
  }, [phaseId, roadmap, phasesById, navigate, toast]);

  if (!analysis) {
    return (
      <div>
        <PageHeader eyebrow="Roadmap" title="Your Roadmap" />
        <NoAnalysisState title="No roadmap yet" description="Analyze your skills first to generate a personalized roadmap." />
      </div>
    );
  }

  if (gen.running) {
    return (
      <div className="mx-auto max-w-xl pt-6">
        <GenerationProgress stage={gen.stage} aiEnabled={aiEnabled} />
      </div>
    );
  }

  const header = (
    <PageHeader
      eyebrow={roadmap ? `${roadmap.totalWeeks}-week ${roadmap.roleName} roadmap` : 'Roadmap'}
      title="Your Roadmap"
      description={roadmap ? fitText(roadmap) : `A plan to close your ${role.name} skill gaps, built around your schedule.`}
      actions={
        roadmap && (
          <>
            <Button variant="secondary" icon={roadmap.status === 'paused' ? Play : Pause} onClick={() => actions.setRoadmapStatus(roadmap.status === 'paused' ? 'active' : 'paused')}>
              {roadmap.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Popover
              trigger={({ toggle, open }) => (
                <Button variant="secondary" icon={RefreshCw} onClick={toggle} aria-expanded={open}>
                  Regenerate
                </Button>
              )}
              panelClassName="w-72 p-1.5"
            >
              {(close) => (
                <div>
                  <MenuItem
                    icon={Sparkles}
                    title={aiEnabled ? 'Regenerate with AI' : 'Regenerate'}
                    description="Uses your latest skills. Completed tasks that remain are kept."
                    onClick={() => {
                      close();
                      setConfirmRegen({ useAi: true });
                    }}
                  />
                  {aiEnabled && (
                    <MenuItem
                      icon={Cpu}
                      title="Rule-based only"
                      description="Skip AI personalisation for a faster, deterministic plan."
                      onClick={() => {
                        close();
                        setConfirmRegen({ useAi: false });
                      }}
                    />
                  )}
                  <MenuItem
                    icon={Compass}
                    title="Change target career"
                    description="Compare matches and switch your goal."
                    onClick={() => {
                      close();
                      navigate('/careers');
                    }}
                  />
                </div>
              )}
            </Popover>
          </>
        )
      }
    />
  );

  if (gen.error) {
    return (
      <div>
        {header}
        <Card>
          <ErrorState title="We couldn’t generate your roadmap" description={gen.error} onRetry={() => run()} />
        </Card>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div>
        {header}
        <GeneratePanel role={role} analysis={analysis} career={career} aiEnabled={aiEnabled} onGenerate={() => run()} />
      </div>
    );
  }

  const toggleTask = async (taskId) => {
    const result = await actions.toggleTask(taskId);
    if (result?.phaseDone) {
      const phase = roadmap.phases.find((p) => p.tasks.some((t) => t.id === taskId));
      toast.success(`${phase.title} — all tasks done`, {
        description: phase.skills.length ? 'Mark it complete to update your skill levels.' : undefined,
        action: phase.skills.length ? { label: 'Open phase', onClick: () => navigate(`/roadmap/${phase.id}`) } : undefined,
      });
    }
  };

  const completePhase = async (id) => {
    const result = await actions.completePhase(id);
    toast.success('Phase complete', {
      description: result?.changes?.length
        ? `${result.changes.map((c) => `${c.name} → ${c.to}%`).join(', ')}. Update your roadmap to re-plan what’s left.`
        : undefined,
    });
  };

  const checkIn = async (skill, level, source) => {
    const next = await actions.setSkillLevel(skill.id, level, { source, name: skill.name });
    toast.success(`${skill.name} set to ${level}%`, {
      description: next ? `Readiness is now ${next.readiness}%. Update your roadmap to adapt it.` : undefined,
    });
  };

  const prereqBlocker = (phase) => {
    const pending = phase.prerequisites.filter((p) => p.phaseId && stats.byId[p.phaseId]?.status !== 'completed');
    return pending.length ? pending.map((p) => phasesById[p.phaseId]?.title || p.name).join(', ') : null;
  };

  const paused = roadmap.status === 'paused';

  return (
    <div>
      {header}

      <div className="mb-6 space-y-3">
        {roadmapState === 'role-changed' && (
          <Notice
            tone="warning"
            icon={AlertTriangle}
            title={`This roadmap is for ${roadmap.roleName}`}
            action={
              <Button size="sm" onClick={() => setConfirmRegen({ useAi: true })}>
                Generate for {role.name}
              </Button>
            }
          >
            Your goal is now {role.name}. Generate a new roadmap — completed tasks that carry over stay completed.
          </Notice>
        )}
        {roadmapState === 'stale' && (
          <Notice
            tone="accent"
            icon={RefreshCw}
            title="Your skills or preferences changed"
            action={
              <Button size="sm" onClick={() => run()}>
                Update roadmap
              </Button>
            }
          >
            Recalculate to skip what you now know, re-prioritise gaps and fit your schedule. Your progress is kept.
          </Notice>
        )}
        {paused && (
          <Notice
            icon={Pause}
            title="Roadmap paused"
            action={
              <Button size="sm" variant="secondary" icon={Play} onClick={() => actions.setRoadmapStatus('active')}>
                Resume
              </Button>
            }
          >
            Task tracking is on hold. Resume whenever you’re ready.
          </Notice>
        )}
        {roadmap.aiStatus?.status === 'failed' && (
          <Notice
            tone="warning"
            icon={AlertTriangle}
            title="AI personalisation failed for this roadmap"
            action={
              aiEnabled && (
                <Button size="sm" variant="secondary" onClick={() => run({ useAi: true })}>
                  Retry with AI
                </Button>
              )
            }
          >
            {roadmap.aiStatus.message} You’re seeing the rule-based plan, which is complete and dependency-ordered.
          </Notice>
        )}
        {roadmap.warnings.length > 0 && (
          <Notice
            tone="warning"
            icon={CalendarClock}
            title={roadmap.fit.status === 'over' ? 'This plan is longer than your timeline' : 'Some skills were deferred to fit your timeline'}
            action={
              <Button size="sm" variant="secondary" to="/settings">
                Adjust schedule
              </Button>
            }
          >
            <ul className="mt-1 space-y-1">
              {roadmap.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Notice>
        )}
      </div>

      {/* Overview */}
      <Card className="mb-6 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex-1">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <p className="text-sm font-medium text-ink">Overall progress</p>
              <p className="tabular text-sm text-muted">
                <span className="font-semibold text-ink">{stats.doneTasks}</span> / {stats.totalTasks} tasks · {stats.phasesDone}/{stats.phasesTotal} milestones
              </p>
            </div>
            <ProgressBar value={stats.pct} className="mt-2.5" size="lg" tone={stats.pct === 100 ? 'success' : 'accent'} label="Roadmap progress" />
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-line pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <dt className="text-xs text-muted">Total effort</dt>
              <dd className="mt-0.5 font-semibold text-ink">{roadmap.totalHours}h</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Weekly pace</dt>
              <dd className="mt-0.5 font-semibold text-ink">{roadmap.settings.weeklyHours}h</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Generated by</dt>
              <dd className="mt-0.5">
                {roadmap.source === 'ai' ? (
                  <Badge tone="accent" icon={Sparkles}>
                    AI · validated
                  </Badge>
                ) : (
                  <Badge tone="neutral" icon={Cpu}>
                    Planner
                  </Badge>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Journey strip */}
        <ol className="-mx-1 mt-5 flex items-center gap-1 overflow-x-auto border-t border-line px-1 pt-4" aria-label="Roadmap phases">
          {roadmap.phases.map((phase, index) => {
            const s = stats.byId[phase.id];
            return (
              <li key={phase.id} className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded((prev) => new Set(prev).add(phase.id));
                    document.getElementById(`card-${phase.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={cx(
                    'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                    s.status === 'completed' && 'bg-success-50 text-success-700',
                    s.status === 'current' && 'bg-accent-50 text-accent-700',
                    s.status === 'upcoming' && 'text-muted hover:bg-slate-100',
                  )}
                >
                  <span className="tabular text-[10px] opacity-70">{index + 1}</span>
                  {phase.title}
                </button>
                {index < roadmap.phases.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        {/* Timeline */}
        <ol aria-label="Roadmap timeline">
          {roadmap.phases.map((phase, index) => (
              <PhaseCard
                key={phase.id}
                anchorId={`card-${phase.id}`}
                phase={phase}
                stats={stats.byId[phase.id]}
                expanded={expanded.has(phase.id)}
                onToggleExpand={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(phase.id)) next.delete(phase.id);
                    else next.add(phase.id);
                    return next;
                  })
                }
                completed={progress.completedTasks}
                onToggleTask={toggleTask}
                paused={paused}
                blockedBy={prereqBlocker(phase)}
                isLast={index === roadmap.phases.length - 1}
              />
          ))}
        </ol>

        {/* Side panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Plan inputs" />
            <CardBody className="space-y-2.5 text-sm">
              <Row label="Target" value={roadmap.roleName} />
              <Row label="Level" value={EXPERIENCE_LEVELS.find((l) => l.id === roadmap.settings.level)?.label} />
              <Row label="Daily time" value={dailyTimeLabel(roadmap.settings.dailyMinutes)} />
              <Row label="Timeline" value={timelineLabel(roadmap.settings.timelineWeeks)} />
              <Row label="Generated" value={relativeTime(roadmap.updatedAt)} />
              <Button variant="link" to="/settings" className="pt-1">
                Change preferences
              </Button>
            </CardBody>
          </Card>

          {(roadmap.deferred.length > 0 || roadmap.excluded.length > 0) && (
            <Card>
              <CardHeader title="Not in this roadmap" description="Deferred or low-priority gaps." />
              <CardBody>
                <ul className="space-y-2.5">
                  {roadmap.deferred.map((d) => (
                    <li key={d.skillId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-ink">{d.name}</span>
                      <span className="shrink-0 text-xs text-muted">Deferred · time</span>
                    </li>
                  ))}
                  {roadmap.excluded.map((e) => (
                    <li key={e.key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <PriorityBadge priority={e.priority} showLabel={false} />
                        <span className="truncate text-ink">{e.name}</span>
                      </span>
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={Plus}
                        onClick={async () => {
                          await actions.toggleRoadmapSkill(e.key, true);
                          toast.info(`${e.name} will be included next time you update your roadmap`);
                        }}
                      >
                        Add
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {roadmap.history?.length > 0 && (
            <Card>
              <CardHeader title="History" icon={History} />
              <CardBody>
                <ol className="space-y-3">
                  {roadmap.history.slice(0, 5).map((h) => (
                    <li key={`${h.version}-${h.at}`} className="text-sm">
                      <p className="text-ink">{h.summary}</p>
                      <p className="text-xs text-muted">
                        v{h.version} · {relativeTime(h.at)} · {h.source === 'ai' ? 'AI' : 'Planner'}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <PhaseDetail
        phase={selectedPhase}
        stats={selectedPhase ? stats.byId[selectedPhase.id] : null}
        open={Boolean(selectedPhase)}
        onClose={() => navigate('/roadmap')}
        completed={progress.completedTasks}
        levels={analysis.levels}
        onToggleTask={toggleTask}
        onComplete={completePhase}
        onCheckIn={checkIn}
        paused={paused}
        phasesById={phasesById}
        statsById={stats.byId}
      />

      <ConfirmDialog
        open={Boolean(confirmRegen)}
        onClose={() => setConfirmRegen(null)}
        onConfirm={() => {
          const opts = confirmRegen;
          setConfirmRegen(null);
          run(opts);
        }}
        title="Regenerate your roadmap?"
        description="We’ll rebuild the plan from your latest skills and preferences. Tasks you’ve completed stay completed wherever they still apply, and your logged hours are kept."
        confirmLabel="Regenerate"
      />
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted">{label}</span>
    <span className="truncate font-medium text-ink">{value || '—'}</span>
  </div>
);

const MenuItem = ({ icon: Icon, title, description, onClick }) => (
  <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-slate-50">
    <Icon className="mt-0.5 h-4 w-4 text-muted" aria-hidden />
    <span>
      <span className="block text-sm font-medium text-ink">{title}</span>
      <span className="block text-xs text-muted">{description}</span>
    </span>
  </button>
);

/** Shown before the first roadmap: what will be considered, and the CTA. */
const GeneratePanel = ({ role, analysis, career, aiEnabled, onGenerate }) => {
  const included = analysis.gaps.filter((g) => g.priority !== 'low' || career.roadmapOverrides?.[g.key] === 'include');
  return (
    <Card className="overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_20rem]">
        <div className="p-6 sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-slate-50">
            <RouteIcon className="h-5 w-5 text-ink" aria-hidden />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">Generate your personalised roadmap</h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            We’ll order your {included.length} skill gap{included.length === 1 ? '' : 's'} by prerequisites and priority, skip topics you already know, and
            schedule everything around {dailyTimeLabel(career.dailyMinutes).replace('/day', ' a day')} ({weeklyHoursFor(career.dailyMinutes)} h/week).
          </p>
          {analysis.gaps.length === 0 ? (
            <p className="mt-6 text-sm text-ink">You already meet every requirement for {role.name} — there’s nothing to plan. Try a more senior role from Career Paths.</p>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" iconRight={ArrowRight} onClick={onGenerate}>
                Generate My Roadmap
              </Button>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                {aiEnabled ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : <Info className="h-3.5 w-3.5" aria-hidden />}
                {aiEnabled ? 'AI personalisation on' : 'Dependency-aware planner (AI not configured)'}
              </span>
            </div>
          )}
        </div>
        <div className="border-t border-line bg-slate-50/60 p-6 lg:border-l lg:border-t-0">
          <p className="eyebrow">Priority gaps</p>
          <ul className="mt-3 space-y-2.5">
            {included.slice(0, 7).map((g) => (
              <li key={g.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink">{g.skillName}</span>
                <PriorityBadge priority={g.priority} />
              </li>
            ))}
            {included.length > 7 && <li className="text-xs text-muted">+{included.length - 7} more</li>}
          </ul>
          <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">Timeline</dt>
              <dd className="font-medium text-ink">{timelineLabel(career.timelineWeeks)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Level</dt>
              <dd className="font-medium text-ink">{EXPERIENCE_LEVELS.find((l) => l.id === career.level)?.label}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  );
};

export default Roadmap;
