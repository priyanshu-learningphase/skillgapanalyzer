import { Link } from 'react-router-dom';
import { X, Check, Circle, ClipboardCheck, Plus, FolderGit2, ArrowUpRight, GraduationCap } from 'lucide-react';
import { Drawer } from '../ui/Overlay';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import PriorityBadge, { StandingBadge } from '../ui/PriorityBadge';
import ResourceList from '../roadmap/ResourceList';
import { getSkill } from '../../data/skills';
import { projectForSkill } from '../../data/projects';
import { hasAssessment } from '../../data/assessments/index';
import { genericProjectFor } from '../../lib/projects';
import { isIncludedInRoadmap, levelName } from '../../lib/analysis';

const Section = ({ title, children }) => (
  <section className="border-t border-line px-5 py-5 sm:px-6">
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
    {children}
  </section>
);

/**
 * Everything about one skill gap: levels, why it matters, prerequisites,
 * resources, a project that proves it and its assessment status.
 */
const SkillDetail = ({ item, analysis, roleId, overrides, latestAssessment, onClose, onCheckIn, onToggleRoadmap }) => {
  if (!item) return null;
  const skill = getSkill(item.skillId, item.skillName);
  const levels = analysis.levels;
  const project = projectForSkill(item.skillId, roleId) || genericProjectFor(item.skillId, roleId);
  const quiz = hasAssessment(item.skillId);
  const included = isIncludedInRoadmap(item, overrides);

  const prerequisites = (skill?.prerequisites || []).map((entry) => {
    const ids = [].concat(entry);
    const best = [...ids].sort((a, b) => (levels[b]?.level ?? 0) - (levels[a]?.level ?? 0))[0];
    const level = levels[best]?.level ?? 0;
    return { id: best, name: ids.length > 1 ? ids.map((id) => getSkill(id)?.name).join(' or ') : getSkill(best)?.name, level, met: level >= 50 };
  });

  return (
    <Drawer open={Boolean(item)} onClose={onClose} title={item.skillName}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="eyebrow">{item.category}</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{item.skillName}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StandingBadge standing={item.standing} />
            <PriorityBadge priority={item.priority} />
            {item.companyAdjusted && <span className="text-xs text-muted">Raised for {item.companyAdjusted}</span>}
            {item.companyAdded && <span className="text-xs text-muted">Added for {item.companyAdded}</span>}
          </div>
        </div>
        <Button variant="ghost" size="xs" onClick={onClose} aria-label="Close" className="h-7 w-7 px-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs text-muted">Current level</p>
            <p className="mt-1 font-semibold text-ink">{levelName(item.current)}</p>
            <p className="tabular text-xs text-muted">{item.current}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Required level</p>
            <p className="mt-1 font-semibold text-ink">{levelName(item.required)}</p>
            <p className="tabular text-xs text-muted">{item.required}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Gap</p>
            <p className="mt-1 font-semibold text-ink">{item.gap ? `${item.gap}%` : 'None'}</p>
            {item.pointsAvailable > 0 && <p className="tabular text-xs text-muted">+{item.pointsAvailable} readiness pts</p>}
          </div>
          <ProgressBar value={item.current} marker={item.required} className="col-span-3" tone={item.gap ? 'accent' : 'success'} label={`${item.skillName} level`} />
          {item.inferred && <p className="col-span-3 text-xs text-muted">Inferred from {item.inferredFrom}. Run a check-in to set it precisely.</p>}
        </div>

        <Section title="Why it matters">
          <p className="text-sm leading-relaxed text-ink">{skill?.why}</p>
        </Section>

        {prerequisites.length > 0 && (
          <Section title="Prerequisites">
            <ul className="space-y-2">
              {prerequisites.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  {p.met ? <Check className="h-4 w-4 text-success-600" aria-hidden /> : <Circle className="h-4 w-4 text-slate-300" aria-hidden />}
                  <span className="text-ink">{p.name}</span>
                  <span className="tabular ml-auto text-xs text-muted">{p.level ? `${p.level}%` : 'Not started'}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Assessment">
          {latestAssessment ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm">
              <span>
                <span className="font-medium text-ink">Last score {latestAssessment.pct}%</span>
                <span className="text-muted"> · {latestAssessment.correct}/{latestAssessment.total} correct</span>
              </span>
              <span className={latestAssessment.pct >= 70 ? 'text-xs font-medium text-success-700' : 'text-xs font-medium text-warning-700'}>
                {latestAssessment.pct >= 70 ? 'Passed' : 'Not passed'}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted">{quiz ? 'Not taken yet. An 8-question assessment updates your level from evidence.' : 'No quiz for this skill yet — use a topic check-in to set your level.'}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {quiz && (
              <Button size="sm" icon={GraduationCap} to={`/assessments/${item.skillId}`}>
                {latestAssessment ? 'Retake assessment' : 'Take assessment'}
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={ClipboardCheck} onClick={() => onCheckIn(item)}>
              Topic check-in
            </Button>
          </div>
        </Section>

        {project && (
          <Section title="Recommended project">
            <Link to={`/projects/${project.id}`} className="group block rounded-lg border border-line p-3 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <FolderGit2 className="h-4 w-4 text-muted" aria-hidden />
                {project.title}
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-light group-hover:text-ink" aria-hidden />
              </p>
              <p className="mt-1 text-xs text-muted">
                {project.difficulty} · ~{project.hours}h · {project.stack.slice(0, 4).join(', ')}
              </p>
            </Link>
          </Section>
        )}

        <Section title="Resources">
          <ResourceList resources={(skill?.resources || []).slice(0, 4)} />
        </Section>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">
        {item.gap > 0 && (
          <Button variant={included ? 'secondary' : 'primary'} icon={included ? Check : Plus} onClick={() => onToggleRoadmap(item, !included)}>
            {included ? 'In your roadmap' : 'Add to roadmap'}
          </Button>
        )}
      </div>
    </Drawer>
  );
};

export default SkillDetail;
