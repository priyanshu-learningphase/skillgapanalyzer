/**
 * Skill Gap — where you stand against your target role, skill by skill.
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, PencilLine, RefreshCw, Info, CheckCircle2, Route, Network, Building2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { Notice } from '../components/ui/States';
import PriorityBadge, { STANDING_DOT } from '../components/ui/PriorityBadge';
import ReadinessCard from '../components/analysis/ReadinessCard';
import GapChart from '../components/analysis/GapChart';
import SkillGapTable from '../components/analysis/SkillGapTable';
import SkillCheckIn from '../components/analysis/SkillCheckIn';
import EditSkillsModal from '../components/analysis/EditSkillsModal';
import SkillDetail from '../components/skills/SkillDetail';
import DependencyGraph from '../components/skills/DependencyGraph';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { getSkill } from '../data/skills';
import { PRIORITY_META, STANDING_META } from '../lib/analysis';
import { buildDependencyGraph } from '../lib/dependencyGraph';
import { cx } from '../lib/cx';

const StandingColumn = ({ standing, items, onSelect }) => (
  <div className="min-w-0">
    <div className="mb-3 flex items-center justify-between">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <span className={cx('h-2 w-2 rounded-full', STANDING_DOT[standing])} aria-hidden />
        {STANDING_META[standing].label}
      </p>
      <span className="tabular text-xs text-muted">{items.length}</span>
    </div>
    {items.length ? (
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key}>
            <button type="button" onClick={() => onSelect(item)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
              <span className="min-w-0 flex-1 truncate text-ink">{item.skillName}</span>
              {item.priority && <PriorityBadge priority={item.priority} showLabel={false} />}
              <span className="tabular w-12 shrink-0 text-right text-xs text-muted">
                {item.current}/{item.required}
              </span>
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-2 text-sm text-muted">None</p>
    )}
  </div>
);

const SkillGap = () => {
  const { career, role, analysis, readinessDelta, readinessHistory, roadmap, roadmapState, latestAssessments, actions } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [checkIn, setCheckIn] = useState(null);
  const [editing, setEditing] = useState(false);

  const suggestions = useMemo(
    () => (role ? [...new Set(role.requirements.flatMap((r) => r.skills))].map((id) => getSkill(id)).filter(Boolean) : []),
    [role],
  );
  const graph = useMemo(() => (role && analysis ? buildDependencyGraph(role, analysis) : null), [role, analysis]);

  if (!analysis) return <NoAnalysisState />;

  const overrides = career.roadmapOverrides || {};
  const selectedId = params.get('skill');
  const selected =
    analysis.items.find((i) => i.skillId === selectedId) ||
    (selectedId && getSkill(selectedId)
      ? (() => {
          const level = analysis.levels[selectedId]?.level ?? 0;
          const skill = getSkill(selectedId);
          return { key: selectedId, skillId: selectedId, skillName: skill.name, category: skill.category, current: level, required: Math.max(level, 60), gap: Math.max(0, 60 - level), standing: level >= 54 ? 'strong' : level < 15 ? 'missing' : 'improve', priority: null, pointsAvailable: 0 };
        })()
      : null);
  const openSkill = (skillId) => setParams((p) => {
    const next = new URLSearchParams(p);
    next.set('skill', skillId);
    return next;
  });
  const closeSkill = () => setParams((p) => {
    const next = new URLSearchParams(p);
    next.delete('skill');
    return next;
  });

  const toggleRoadmap = async (item, include) => {
    await actions.toggleRoadmapSkill(item.key, include);
    toast.success(include ? `${item.skillName} added to your roadmap plan` : `${item.skillName} removed from your roadmap plan`, {
      description: roadmap ? 'Update your roadmap to apply this change.' : undefined,
      action: roadmap ? { label: 'Go to roadmap', onClick: () => navigate('/roadmap') } : undefined,
    });
  };

  const saveLevel = async (level, source) => {
    const before = analysis.readiness;
    const next = await actions.setSkillLevel(checkIn.skillId, level, { source, name: checkIn.skillName });
    if (next) {
      const diff = next.readiness - before;
      toast.success(`${checkIn.skillName} updated to ${level}%`, { description: `Readiness ${diff >= 0 ? '+' : ''}${diff} → ${next.readiness}/100` });
    }
  };

  const byStanding = (standing) => analysis.items.filter((i) => i.standing === standing).sort((a, b) => b.weight - a.weight || b.gap - a.gap);
  const hasRoadmap = roadmap && roadmapState !== 'role-changed';

  return (
    <div>
      <PageHeader
        title="Skill Gap Analysis"
        description={
          <>
            Your skills against what {role.name} roles typically expect
            {role.company && (
              <>
                {' '}
                at <span className="font-medium text-ink">{role.company.name}</span>
              </>
            )}
            .
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon={PencilLine} onClick={() => setEditing(true)}>
              Update skills
            </Button>
            {hasRoadmap ? (
              roadmapState === 'stale' ? (
                <Button icon={RefreshCw} to="/roadmap" state={{ autoGenerate: true }}>
                  Update My Roadmap
                </Button>
              ) : (
                <Button icon={Route} to="/roadmap">
                  View My Roadmap
                </Button>
              )
            ) : (
              <Button iconRight={ArrowRight} onClick={() => navigate('/roadmap', { state: { autoGenerate: true } })} disabled={!analysis.gaps.length}>
                Generate My Roadmap
              </Button>
            )}
          </>
        }
      />

      {location.state?.fresh && (
        <Notice tone="success" icon={CheckCircle2} title="Analysis complete" className="mb-6">
          We compared {career.skills.length} skill{career.skills.length === 1 ? '' : 's'} against {role.requirements.length} requirements. Generate your roadmap when you’re ready.
        </Notice>
      )}
      {career.migrated && (
        <Notice tone="accent" icon={Info} title="We imported your skills from your previous analysis" className="mb-6" action={<Button size="sm" variant="secondary" to="/onboarding">Review</Button>}>
          They were set to Intermediate. Rate each one for a more accurate score.
        </Notice>
      )}
      {role.company && analysis.items.some((i) => i.companyAdjusted || i.companyAdded) && (
        <Notice icon={Building2} className="mb-6">
          Targets adjusted for {role.company.name}:{' '}
          {analysis.items
            .filter((i) => i.companyAdjusted || i.companyAdded)
            .map((i) => (i.companyAdded ? `${i.skillName} added` : `${i.skillName} ${i.baseLevel}% → ${i.required}%`))
            .join(' · ')}
          . <span className="text-muted-light">Typical emphasis, not official requirements.</span>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ReadinessCard analysis={analysis} delta={readinessDelta} history={readinessHistory} roleName={role.company ? `${role.name} · ${role.company.name}` : role.name} />
        <Card>
          <CardHeader title="Current vs required" description="Most urgent first. Select a skill for details." />
          <CardBody>
            {analysis.gaps.length ? (
              <GapChart items={analysis.gaps} onSelect={(item) => openSkill(item.skillId)} />
            ) : (
              <p className="text-sm text-muted">You meet every requirement for this role. Consider a more senior target or another company.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Where you stand"
          description={
            <>
              Priority:{' '}
              {Object.entries(PRIORITY_META)
                .map(([, meta]) => `${meta.label} — ${meta.description.toLowerCase()}`)
                .join('; ')}
              .
            </>
          }
        />
        <CardBody className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <StandingColumn standing="strong" items={byStanding('strong')} onSelect={(i) => openSkill(i.skillId)} />
          <StandingColumn standing="improve" items={byStanding('improve')} onSelect={(i) => openSkill(i.skillId)} />
          <StandingColumn standing="missing" items={byStanding('missing')} onSelect={(i) => openSkill(i.skillId)} />
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Skill gap breakdown" description="Every requirement for the role — sort, filter and add gaps to your roadmap." />
        <div className="mt-4">
          <SkillGapTable items={analysis.items} overrides={overrides} onToggle={toggleRoadmap} onEditLevel={(item) => openSkill(item.skillId)} />
        </div>
      </Card>

      {graph?.nodes.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            icon={Network}
            title="Prerequisite map"
            description="Foundations on the left. Your roadmap always teaches a skill after the ones it depends on — hover a skill to see its chain."
          />
          <CardBody>
            <DependencyGraph graph={graph} onSelect={openSkill} />
          </CardBody>
        </Card>
      )}

      <SkillDetail
        item={selected}
        analysis={analysis}
        roleId={role.id}
        overrides={overrides}
        latestAssessment={selected ? latestAssessments[selected.skillId] : null}
        onClose={closeSkill}
        onCheckIn={(item) => setCheckIn(item)}
        onToggleRoadmap={toggleRoadmap}
      />
      <SkillCheckIn
        open={Boolean(checkIn)}
        onClose={() => setCheckIn(null)}
        skillId={checkIn?.skillId}
        skillName={checkIn?.skillName}
        currentLevel={checkIn?.current ?? 0}
        targetLevel={checkIn?.required}
        onSave={saveLevel}
      />
      <EditSkillsModal
        open={editing}
        onClose={() => setEditing(false)}
        skills={career.skills}
        suggestions={suggestions}
        onSave={async (skills) => {
          const next = await actions.updateSkills(skills);
          if (next) toast.success('Skills updated', { description: `Readiness is now ${next.readiness}/100.` });
        }}
      />
    </div>
  );
};

export default SkillGap;
