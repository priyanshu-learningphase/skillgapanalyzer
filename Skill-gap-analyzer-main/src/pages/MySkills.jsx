/**
 * My Skills — your skill inventory, and the resume analyzer.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PencilLine, FileText, Github, GraduationCap, Puzzle, Plus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Tabs from '../components/ui/Tabs';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import Badge from '../components/ui/Badge';
import { EmptyState } from '../components/ui/States';
import EditSkillsModal from '../components/analysis/EditSkillsModal';
import ResumeAnalyzer from '../components/skills/ResumeAnalyzer';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { getSkill, SKILL_CATEGORIES } from '../data/skills';
import { hasAssessment } from '../data/assessments/index';
import { levelName } from '../lib/analysis';

const SkillInventory = () => {
  const { career, role, analysis, latestAssessments, actions } = useWorkspace();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const required = useMemo(() => new Map(analysis.items.map((i) => [i.skillId, i])), [analysis]);
  const groups = useMemo(() => {
    const byCategory = new Map();
    for (const s of career.skills) {
      const category = getSkill(s.id, s.name)?.category || 'Custom';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(s);
    }
    return SKILL_CATEGORIES.filter((c) => byCategory.has(c)).map((c) => [c, byCategory.get(c).sort((a, b) => b.level - a.level)]);
  }, [career.skills]);
  const missingRequired = analysis.items.filter((i) => !career.skills.some((s) => s.id === i.skillId));
  const suggestions = [...new Set(role.requirements.flatMap((r) => r.skills))].map((id) => getSkill(id)).filter(Boolean);

  const addSkill = async (item) => {
    const result = await actions.importSkills([{ id: item.skillId, name: item.skillName, level: Math.max(item.current, 30) }], { label: 'suggestions' });
    if (result.added) toast.success(`${item.skillName} added at ${levelName(Math.max(item.current, 30))} level`, { description: 'Take the assessment or a check-in to set it precisely.' });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Skills tracked', career.skills.length],
          ['Advanced', career.skills.filter((s) => s.level >= 80).length],
          ['Role skills covered', `${analysis.items.filter((i) => i.current > 0).length}/${analysis.items.length}`],
          ['Assessed', Object.keys(latestAssessments).length],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-[13px] font-medium text-muted">{label}</p>
            <p className="tabular mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Your skills"
          description="Levels drive your readiness score and roadmap. Assessments turn estimates into evidence."
          action={
            <Button variant="secondary" size="sm" icon={PencilLine} onClick={() => setEditing(true)}>
              Edit skills
            </Button>
          }
        />
        <CardBody>
          {groups.length === 0 ? (
            <EmptyState
              compact
              icon={Puzzle}
              title="No skills yet"
              description="Add the skills you have, or import them from your resume or GitHub."
              action={<Button onClick={() => setEditing(true)} icon={Plus}>Add skills</Button>}
              secondaryAction={<Button variant="secondary" to="/skills/resume" icon={FileText}>Import from resume</Button>}
            />
          ) : (
            <div className="space-y-6">
              {groups.map(([category, skills]) => (
                <div key={category}>
                  <p className="eyebrow mb-2">{category}</p>
                  <ul className="divide-y divide-line rounded-lg border border-line">
                    {skills.map((s) => {
                      const req = required.get(s.id);
                      const assessment = latestAssessments[s.id];
                      return (
                        <li key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,12rem)_1fr_7rem_9rem]">
                          <div className="min-w-0">
                            <Link to={`/gap?skill=${s.id}`} className="block truncate text-sm font-medium text-ink hover:underline">
                              {s.name}
                            </Link>
                            {req && <p className="text-xs text-muted">Required · {req.required}%</p>}
                          </div>
                          <span className="tabular text-right text-xs text-muted md:order-3 md:text-left">
                            <span className="font-medium text-ink">{s.level}%</span> · {levelName(s.level)}
                          </span>
                          <div className="col-span-2 md:order-2 md:col-span-1">
                            <ProgressBar value={s.level} marker={req?.required} size="sm" tone={req && s.level >= req.required ? 'success' : 'accent'} label={`${s.name} level`} />
                          </div>
                          <div className="col-span-2 md:order-4 md:col-span-1 md:text-right">
                            {assessment ? (
                              <Badge tone={assessment.pct >= 70 ? 'success' : 'warning'} icon={GraduationCap}>
                                Assessed {assessment.pct}%
                              </Badge>
                            ) : hasAssessment(s.id) ? (
                              <Link to={`/assessments/${s.id}`} className="text-xs font-medium text-accent-600 hover:text-accent-700">
                                Take assessment →
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-light">Self-rated</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {missingRequired.length > 0 && (
        <Card>
          <CardHeader title={`Needed for ${role.name}`} description="Role skills you haven’t added. Add the ones you have some experience with." />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {missingRequired.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => addSkill(item)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] text-ink hover:border-slate-400"
                >
                  <Plus className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {item.skillName}
                  {item.inferred && <span className="text-[11px] text-muted-light">~{item.current}%</span>}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/skills/resume" className="card-interactive flex items-start gap-3 p-5">
          <FileText className="mt-0.5 h-5 w-5 text-ink" aria-hidden />
          <span>
            <span className="block text-sm font-semibold text-ink">Import from your resume</span>
            <span className="block text-sm text-muted">Detect skills and see how your resume reads for {role.name}.</span>
          </span>
        </Link>
        <Link to="/github" className="card-interactive flex items-start gap-3 p-5">
          <Github className="mt-0.5 h-5 w-5 text-ink" aria-hidden />
          <span>
            <span className="block text-sm font-semibold text-ink">Analyse your GitHub</span>
            <span className="block text-sm text-muted">Find skills your projects already prove.</span>
          </span>
        </Link>
      </div>

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

const MySkills = ({ tab = 'skills' }) => {
  const { isOnboarded, insights } = useWorkspace();
  if (!isOnboarded) return <NoAnalysisState />;
  return (
    <div>
      <PageHeader title="My Skills" description="Everything you know, how well you know it, and the evidence behind it." />
      <Tabs
        items={[
          { to: '/skills', label: 'Skill inventory', icon: Puzzle, end: true },
          { to: '/skills/resume', label: 'Resume analyzer', icon: FileText, badge: insights.resume ? 'Analysed' : null },
        ]}
      />
      {tab === 'resume' ? <ResumeAnalyzer /> : <SkillInventory />}
    </div>
  );
};

export default MySkills;
