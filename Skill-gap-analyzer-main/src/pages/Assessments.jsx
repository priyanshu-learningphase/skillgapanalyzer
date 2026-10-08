/**
 * Assessments — prove your level with short, auto-graded quizzes.
 */

import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import PriorityBadge from '../components/ui/PriorityBadge';
import { EmptyState } from '../components/ui/States';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { ASSESSMENT_SKILL_IDS, PASS_PCT } from '../data/assessments/index';
import { getSkill } from '../data/skills';
import { relativeTime } from '../lib/progress';
import { PRIORITY_ORDER } from '../lib/analysis';

// Gaps first (critical → optional), then skills already at target.
const rank = (item) => (item.priority ? PRIORITY_ORDER.indexOf(item.priority) : PRIORITY_ORDER.length);

const Assessments = () => {
  const { analysis, role, progress, latestAssessments } = useWorkspace();
  if (!analysis) return <NoAnalysisState title="No assessments yet" description="Analyze your skills first — we’ll recommend which skills to prove." />;

  const levels = analysis.levels;
  const roleItems = analysis.items
    .filter((i) => ASSESSMENT_SKILL_IDS.includes(i.skillId))
    .sort((a, b) => rank(a) - rank(b) || b.weight - a.weight || b.gap - a.gap);
  const roleIds = new Set(roleItems.map((i) => i.skillId));
  const others = ASSESSMENT_SKILL_IDS.filter((id) => !roleIds.has(id)).map((id) => ({ skillId: id, skillName: getSkill(id).name, current: levels[id]?.level ?? 0 }));
  const history = progress.assessments || [];
  const taken = Object.values(latestAssessments);
  const passedCount = taken.filter((a) => a.pct >= PASS_PCT).length;
  const weak = taken.filter((a) => a.pct < 60);

  const row = (item) => {
    const last = latestAssessments[item.skillId];
    return (
      <li key={item.skillId} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{item.skillName}</p>
          <p className="flex items-center gap-2 text-xs text-muted">
            {item.priority && <PriorityBadge priority={item.priority} />}
            {item.required ? `Target ${item.required}%` : '8 questions'}
          </p>
        </div>
        <div className="hidden sm:block">
          <ProgressBar value={item.current} marker={item.required} size="sm" label={`${item.skillName} level`} />
          <p className="tabular mt-1 text-xs text-muted">Level {item.current}%</p>
        </div>
        <div className="hidden text-xs sm:block">
          {last ? (
            <>
              <Badge tone={last.pct >= PASS_PCT ? 'success' : 'warning'}>{last.pct >= PASS_PCT ? 'Passed' : 'Not passed'} · {last.pct}%</Badge>
              <p className="mt-1 text-muted">{relativeTime(last.at)}</p>
            </>
          ) : (
            <span className="text-muted">Not taken</span>
          )}
        </div>
        <Button size="sm" variant={last ? 'secondary' : 'primary'} icon={last ? RotateCcw : undefined} to={`/assessments/${item.skillId}`}>
          {last ? 'Retake' : 'Start'}
        </Button>
      </li>
    );
  };

  return (
    <div>
      <PageHeader title="Assessments" description="8-question, auto-graded checks. Your score updates your skill level and adapts your roadmap." />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Taken', taken.length],
          ['Passed', passedCount],
          ['Pass mark', `${PASS_PCT}%`],
          ['Available', ASSESSMENT_SKILL_IDS.length],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-[13px] font-medium text-muted">{label}</p>
            <p className="tabular mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {weak.length > 0 && (
        <Card className="mb-4 border-warning-100 bg-warning-50/50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <AlertTriangle className="h-4 w-4 text-warning-600" aria-hidden /> Your roadmap is repeating fundamentals for {weak.map((w) => getSkill(w.skillId)?.name).join(', ')}
          </p>
          <p className="mt-1 text-sm text-muted">Scores under 60% bring the basics back into the roadmap. Retake once you’ve reviewed them.</p>
        </Card>
      )}

      <Card>
        <CardHeader title={`For ${role.name}`} description="Skills your target role requires, most urgent first." />
        <div className="mt-3">
          {roleItems.length ? (
            <ul className="divide-y divide-line border-t border-line">{roleItems.map(row)}</ul>
          ) : (
            <EmptyState compact icon={GraduationCap} title="No quizzes for these skills yet" description="Use topic check-ins on the Skill Gap page instead." action={<Button to="/gap">Open Skill Gap</Button>} />
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Other assessments" />
          <ul className="mt-3 divide-y divide-line border-t border-line">{others.map(row)}</ul>
        </Card>
        <Card>
          <CardHeader title="History" />
          <CardBody>
            {history.length ? (
              <ul className="space-y-3">
                {history.slice(0, 10).map((h) => (
                  <li key={h.id} className="flex items-start gap-3 text-sm">
                    {h.pct >= PASS_PCT ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success-600" aria-hidden /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-600" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">
                        {h.name} · {h.correct}/{h.total}
                      </p>
                      <p className="tabular text-xs text-muted">
                        Level {h.before}% → {h.after}% · {relativeTime(h.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={GraduationCap} title="No results yet" description="Take an assessment to turn self-ratings into evidence." action={roleItems[0] && <Button to={`/assessments/${roleItems[0].skillId}`} iconRight={ArrowRight}>Start with {roleItems[0].skillName}</Button>} />
            )}
          </CardBody>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">
        Don’t see a skill? Run a topic check-in from the <Link to="/gap" className="font-medium text-ink hover:underline">Skill Gap</Link> page.
      </p>
    </div>
  );
};

export default Assessments;
