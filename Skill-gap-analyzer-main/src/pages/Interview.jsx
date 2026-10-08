/**
 * Interview Prep — questions built from your role, company, gaps, results
 * and your own projects. Mark questions as practised to track readiness.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ExternalLink, AlertTriangle, Code2, Layers, MessagesSquare, FolderGit2, BookOpenCheck } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Segmented from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/States';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { buildInterviewPlan } from '../lib/interview';
import { PROJECT_MAP } from '../data/projects';
import { cx } from '../lib/cx';

const PracticeToggle = ({ done, onToggle, label }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={done}
    aria-label={`Mark “${label}” as practised`}
    onClick={onToggle}
    className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors', done ? 'border-success bg-success' : 'border-slate-300 bg-white hover:border-slate-400')}
  >
    {done && <Check className="h-3 w-3 text-white animate-pop" strokeWidth={3} />}
  </button>
);

const QuestionRow = ({ item, done, onToggle, meta }) => {
  const [open, setOpen] = useState(false);
  const hasPoints = item.points?.length > 0;
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <PracticeToggle done={done} onToggle={onToggle} label={item.question} />
        <div className="min-w-0 flex-1">
          <p className={cx('text-sm', done ? 'text-muted' : 'text-ink')}>{item.question}</p>
          {meta && <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div>}
          {hasPoints && open && (
            <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted animate-fade-in">
              {item.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-light" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasPoints && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-muted hover:bg-slate-100 hover:text-ink">
            What to cover
            <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
};

const Interview = () => {
  const { role, analysis, latestAssessments, progress, insights, actions } = useWorkspace();
  const [section, setSection] = useState('technical');

  const projectTitles = useMemo(() => {
    const completed = Object.entries(progress.projects || {})
      .filter(([, p]) => p.status === 'completed')
      .map(([id, p]) => PROJECT_MAP[id]?.title || p.title);
    const resume = insights.resume?.parsed?.projects?.map((p) => p.title) || [];
    const github = insights.github?.repos?.slice(0, 2).map((r) => r.name) || [];
    return [...completed, ...resume, ...github];
  }, [progress.projects, insights]);

  const plan = useMemo(
    () => (role && analysis ? buildInterviewPlan({ role, analysis, company: role.company, latestAssessments, projectTitles }) : null),
    [role, analysis, latestAssessments, projectTitles],
  );

  if (!plan) return <NoAnalysisState title="No interview plan yet" description="Pick a target role and add your skills to get questions tailored to it." />;

  const practiced = progress.interview?.practiced || {};
  const isDone = (id) => Boolean(practiced[id]);
  const count = (items) => items.filter((i) => isDone(i.id)).length;
  const sections = {
    technical: { label: 'Technical', icon: BookOpenCheck, items: plan.technical },
    coding: { label: 'Coding', icon: Code2, items: plan.coding },
    design: { label: 'System design', icon: Layers, items: plan.systemDesign },
    behavioral: { label: 'Behavioral', icon: MessagesSquare, items: plan.behavioral },
    projects: { label: 'Projects', icon: FolderGit2, items: plan.projects },
  };
  const all = Object.values(sections).flatMap((s) => s.items);
  const totalDone = count(all);
  const current = sections[section];

  return (
    <div>
      <PageHeader
        title="Interview Prep"
        description={`Tailored to ${role.name}${role.company ? ` at ${role.company.name}` : ''}, your gaps, your results and your projects.`}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-ink">Practice progress</p>
            <p className="tabular text-sm text-muted">
              <span className="font-semibold text-ink">{totalDone}</span> / {all.length} practised
            </p>
          </div>
          <ProgressBar value={totalDone} max={Math.max(1, all.length)} className="mt-3" label="Interview practice progress" />
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-5">
            {Object.entries(sections).map(([key, s]) => (
              <div key={key}>
                <p className="text-muted">{s.label}</p>
                <p className="tabular font-medium text-ink">
                  {count(s.items)}/{s.items.length}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Focus areas" icon={AlertTriangle} />
          <CardBody>
            {plan.weakAreas.length ? (
              <ul className="space-y-2">
                {plan.weakAreas.slice(0, 5).map((w) => (
                  <li key={w.skillId}>
                    <Link to={w.link} className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50">
                      <span className="truncate font-medium text-ink">{w.name}</span>
                      <span className="shrink-0 text-xs text-muted">{w.reason}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No focus areas yet. Take assessments to sharpen this list.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Segmented
          size="md"
          label="Question type"
          value={section}
          onChange={setSection}
          options={Object.entries(sections).map(([value, s]) => ({ value, label: s.label, icon: s.icon, count: s.items.length }))}
        />
      </div>

      <Card className="mt-4">
        <div className="px-5">
          {current.items.length === 0 ? (
            <EmptyState
              compact
              icon={FolderGit2}
              title="No project questions yet"
              description="Complete a project, analyse your resume or GitHub, and we’ll generate questions about your own work."
            />
          ) : section === 'coding' ? (
            <ul className="divide-y divide-line">
              {current.items.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <PracticeToggle done={isDone(p.id)} onToggle={() => actions.toggleInterviewPracticed(p.id)} label={p.title} />
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-sm', isDone(p.id) ? 'text-muted' : 'text-ink')}>{p.title}</p>
                    <p className="text-xs text-muted">{p.pattern}</p>
                  </div>
                  <Badge tone={p.difficulty === 'Easy' ? 'success' : p.difficulty === 'Medium' ? 'warning' : 'danger'}>{p.difficulty}</Badge>
                  <a
                    href={`https://leetcode.com/problemset/?search=${encodeURIComponent(p.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1 text-muted-light hover:bg-slate-100 hover:text-ink"
                    aria-label={`Find ${p.title} on LeetCode`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-line">
              {current.items.map((item) => (
                <QuestionRow
                  key={item.id}
                  item={item}
                  done={isDone(item.id)}
                  onToggle={() => actions.toggleInterviewPracticed(item.id)}
                  meta={
                    <>
                      {item.skill && <span className="text-xs text-muted">{item.skill}</span>}
                      {item.weak && <Badge tone="warning">Focus area</Badge>}
                      {item.company && <Badge tone="accent">{item.company}</Badge>}
                      {item.project && <span className="text-xs text-muted">{item.project}</span>}
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Interview;
