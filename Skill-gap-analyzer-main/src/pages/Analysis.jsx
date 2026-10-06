/**
 * Skill Analysis — readiness, strengths, gaps and the detailed gap table.
 */

import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, PencilLine, RefreshCw, Info, CheckCircle2, Route } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import { Notice } from '../components/ui/States';
import ReadinessCard from '../components/analysis/ReadinessCard';
import GapChart, { StrengthsList } from '../components/analysis/GapChart';
import SkillGapTable from '../components/analysis/SkillGapTable';
import SkillCheckIn from '../components/analysis/SkillCheckIn';
import EditSkillsModal from '../components/analysis/EditSkillsModal';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { getSkill } from '../data/skills';

const Analysis = () => {
  const { career, role, analysis, readinessDelta, readinessHistory, roadmap, roadmapState, actions } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkIn, setCheckIn] = useState(null);
  const [editing, setEditing] = useState(false);

  const suggestions = useMemo(
    () => (role ? [...new Set(role.requirements.flatMap((r) => r.skills))].map((id) => getSkill(id)).filter(Boolean) : []),
    [role],
  );

  if (!analysis) return <NoAnalysisState />;

  const overrides = career.roadmapOverrides || {};

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
      toast.success(`${checkIn.skillName} updated to ${level}%`, {
        description: `Readiness ${diff >= 0 ? '+' : ''}${diff}% → ${next.readiness}%`,
      });
    }
  };

  const hasRoadmap = roadmap && roadmapState !== 'role-changed';
  const primaryCta = hasRoadmap ? (
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
  );

  return (
    <div>
      <PageHeader
        eyebrow="Skill analysis"
        title="Your Career Readiness"
        description={`How your current skills compare with what ${role.name} roles typically expect.`}
        actions={
          <>
            <Button variant="secondary" icon={PencilLine} onClick={() => setEditing(true)}>
              Update skills
            </Button>
            {primaryCta}
          </>
        }
      />

      {location.state?.fresh && (
        <Notice tone="success" icon={CheckCircle2} title="Analysis complete" className="mb-6">
          We compared {career.skills.length} skill{career.skills.length === 1 ? '' : 's'} against {role.requirements.length} {role.name} requirements. Generate your roadmap when you’re ready.
        </Notice>
      )}
      {career.migrated && (
        <Notice
          tone="accent"
          icon={Info}
          title="We imported your skills from your previous analysis"
          className="mb-6"
          action={
            <Button size="sm" variant="secondary" to="/onboarding">
              Review
            </Button>
          }
        >
          They were set to Intermediate. Rate each one for a more accurate score.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ReadinessCard analysis={analysis} delta={readinessDelta} history={readinessHistory} roleName={role.name} />

        <Card>
          <CardHeader title="Skill gaps" description="Your level against the role target, most urgent first." />
          <CardBody>
            {analysis.gaps.length ? (
              <GapChart items={analysis.gaps} onSelect={(item) => setCheckIn(item)} />
            ) : (
              <p className="text-sm text-muted">You meet every requirement for this role. Consider a more senior target or explore other career paths.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card>
          <CardHeader title="Strengths" description="Requirements you already meet or nearly meet." />
          <CardBody>
            <StrengthsList items={analysis.strengths} transferable={analysis.transferable} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recommended next skills" description="Biggest impact on your readiness, considering gap size and importance." />
          <CardBody>
            {analysis.recommended.length ? (
              <ol className="grid gap-3 sm:grid-cols-2">
                {analysis.recommended.map((item, index) => {
                  const skill = getSkill(item.skillId, item.skillName);
                  return (
                    <li key={item.key} className="flex gap-3 rounded-lg border border-line p-3">
                      <span className="tabular mt-0.5 text-xs font-semibold text-muted-light">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{item.skillName}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{skill?.why}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted">Nothing to recommend — you’ve covered this role.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Skill gap breakdown"
          description="Every requirement for the role. Select a skill to check in and update your level."
        />
        <div className="mt-4">
          <SkillGapTable items={analysis.items} overrides={overrides} onToggle={toggleRoadmap} onEditLevel={(item) => setCheckIn(item)} />
        </div>
      </Card>

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
          if (next) toast.success('Skills updated', { description: `Readiness is now ${next.readiness}%.` });
        }}
      />
    </div>
  );
};

export default Analysis;
