/**
 * Projects — portfolio work that proves the skills your target role needs.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X, Clock, Play, CheckCircle2, RotateCcw, Copy, Check, FolderGit2, Target } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Segmented from '../components/ui/Segmented';
import { Drawer, ConfirmDialog } from '../components/ui/Overlay';
import { EmptyState } from '../components/ui/States';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { PROJECTS, PROJECT_MAP } from '../data/projects';
import { getSkill } from '../data/skills';
import { recommendProjects, genericProjectFor } from '../lib/projects';
import { cx } from '../lib/cx';

const DIFFICULTY_TONE = { Beginner: 'success', Intermediate: 'accent', Advanced: 'warning' };
const STATUS_LABEL = { started: 'In progress', completed: 'Completed' };

const projectById = (id) => PROJECT_MAP[id] || (id?.startsWith('skill-') ? genericProjectFor(id.slice(6)) : null);

const ProjectCard = ({ entry, status, gapIds, onOpen }) => {
  const { project } = entry;
  return (
    <button type="button" onClick={onOpen} className="card-interactive flex h-full flex-col p-5 text-left">
      <div className="flex items-center gap-2">
        <Badge tone={DIFFICULTY_TONE[project.difficulty]}>{project.difficulty}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3 w-3" aria-hidden /> ~{project.hours}h
        </span>
        {status && (
          <span className={cx('ml-auto text-xs font-medium', status === 'completed' ? 'text-success-700' : 'text-accent-600')}>{STATUS_LABEL[status]}</span>
        )}
      </div>
      <h3 className="mt-3 text-[15px] font-semibold text-ink">{project.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{project.problem}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.skills.slice(0, 5).map((id) => (
          <span key={id} className={cx('rounded-md px-1.5 py-0.5 text-xs', gapIds.has(id) ? 'bg-accent-50 text-accent-700' : 'bg-slate-100 text-slate-700')}>
            {getSkill(id)?.name}
          </span>
        ))}
      </div>
      {entry.reason && <p className="mt-auto pt-4 text-xs text-muted">{entry.reason}</p>}
    </button>
  );
};

const ProjectDetail = ({ project, status, gapIds, onClose, onStatus }) => {
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!project) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(project.structure);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const update = async (next) => {
    setSaving(true);
    try {
      await onStatus(project, next);
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={project.title}
      footer={
        <>
          {status && (
            <Button variant="ghost" icon={RotateCcw} onClick={() => update(null)} disabled={saving} className="mr-auto">
              Reset
            </Button>
          )}
          {status !== 'started' && status !== 'completed' && (
            <Button variant="secondary" icon={Play} onClick={() => update('started')} loading={saving}>
              Start project
            </Button>
          )}
          {status !== 'completed' && (
            <Button icon={CheckCircle2} onClick={() => setConfirm(true)}>
              Mark complete
            </Button>
          )}
          {status === 'completed' && <span className="text-sm font-medium text-success-700">Completed</span>}
        </>
      }
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={DIFFICULTY_TONE[project.difficulty]}>{project.difficulty}</Badge>
            <span className="text-xs text-muted">~{project.hours} hours</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">{project.title}</h2>
        </div>
        <Button variant="ghost" size="xs" onClick={onClose} aria-label="Close" className="h-7 w-7 px-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
        <section>
          <h3 className="eyebrow mb-2">Problem</h3>
          <p className="text-sm leading-relaxed text-ink">{project.problem}</p>
        </section>
        <section>
          <h3 className="eyebrow mb-2">Features to build</h3>
          <ul className="space-y-1.5 text-sm text-ink">
            {project.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-light" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>
        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="eyebrow mb-2">Tech stack</h3>
            <div className="flex flex-wrap gap-1.5">
              {project.stack.map((t) => (
                <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          </section>
          <section>
            <h3 className="eyebrow mb-2">Skills it proves</h3>
            <div className="flex flex-wrap gap-1.5">
              {project.skills.map((id) => (
                <Link key={id} to={`/gap?skill=${id}`} className={cx('rounded-md px-1.5 py-0.5 text-xs', gapIds.has(id) ? 'bg-accent-50 text-accent-700' : 'bg-slate-100 text-slate-700')}>
                  {getSkill(id)?.name}
                </Link>
              ))}
            </div>
          </section>
        </div>
        <section>
          <h3 className="eyebrow mb-2">Expected outcome</h3>
          <p className="text-sm text-ink">{project.outcome}</p>
          <p className="mt-2 text-sm text-muted">Demonstrates: {project.demonstrates.join(', ')}.</p>
        </section>
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="eyebrow">GitHub-ready structure</h3>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
              {copied ? <Check className="h-3.5 w-3.5 text-success-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-ink p-4 font-mono text-[12.5px] leading-relaxed text-slate-200">{project.structure}</pre>
          <p className="mt-2 text-xs text-muted">Include a README with the problem, setup steps, screenshots and what you’d improve next.</p>
        </section>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => update('completed')}
        loading={saving}
        title="Mark this project complete?"
        description={`Completing it counts as evidence: ${project.primary.map((id) => getSkill(id)?.name).join(', ')} will go up by up to 10 points, and related roadmap tasks will be checked off.`}
        confirmLabel="Mark complete"
      />
    </Drawer>
  );
};

const Projects = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, career, analysis, progress, actions } = useWorkspace();
  const [filter, setFilter] = useState('recommended');

  const statuses = useMemo(() => Object.fromEntries(Object.entries(progress.projects || {}).map(([id, p]) => [id, p.status])), [progress.projects]);
  const recommendations = useMemo(
    () => (analysis ? recommendProjects({ analysis, roleId: role.id, level: career.level, statuses, limit: 9 }) : []),
    [analysis, role, career, statuses],
  );

  if (!analysis) return <NoAnalysisState title="No projects yet" description="Analyze your skills to get projects that close your exact gaps." />;

  const gapIds = new Set(analysis.gaps.map((g) => g.skillId));
  const tracked = Object.keys(statuses)
    .map((id) => ({ project: projectById(id), reason: null }))
    .filter((e) => e.project);
  const all = PROJECTS.filter((p) => p.roles.includes(role.id) || p.skills.some((id) => gapIds.has(id))).map((project) => ({ project, reason: null }));

  const lists = {
    recommended: recommendations,
    started: tracked.filter((e) => statuses[e.project.id] === 'started'),
    completed: tracked.filter((e) => statuses[e.project.id] === 'completed'),
    all,
  };
  const shown = lists[filter];
  const selected = projectId ? projectById(projectId) : null;

  const onStatus = async (project, status) => {
    const result = await actions.setProjectStatus(project.id, status);
    if (status === 'completed') {
      toast.success('Project completed', {
        description: result?.changes?.length ? `${result.changes.map((c) => `${c.name} → ${c.to}%`).join(', ')}. Update your roadmap to adapt it.` : 'Nice work — add it to your resume and GitHub.',
      });
    } else if (status === 'started') {
      toast.info(`Started “${project.title}”`);
    }
  };

  return (
    <div>
      <PageHeader title="Projects" description={`Portfolio projects ranked by how much they close your ${role.name} gaps.`} />

      <div className="mb-4 overflow-x-auto">
        <Segmented
          size="md"
          label="Filter projects"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'recommended', label: 'Recommended', count: lists.recommended.length },
            { value: 'started', label: 'In progress', count: lists.started.length },
            { value: 'completed', label: 'Completed', count: lists.completed.length },
            { value: 'all', label: 'All for your role', count: lists.all.length },
          ]}
        />
      </div>

      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((entry) => (
            <ProjectCard key={entry.project.id} entry={entry} status={statuses[entry.project.id]} gapIds={gapIds} onOpen={() => navigate(`/projects/${entry.project.id}`)} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={filter === 'completed' ? CheckCircle2 : filter === 'started' ? FolderGit2 : Target}
            title={filter === 'completed' ? 'No completed projects yet' : filter === 'started' ? 'No projects in progress' : 'No projects match'}
            description={filter === 'recommended' ? 'You have no gaps left for this role.' : 'Start a recommended project to track it here.'}
            action={filter !== 'recommended' && <Button onClick={() => setFilter('recommended')}>See recommendations</Button>}
          />
        </Card>
      )}

      {projectId && !selected && (
        <p className="mt-4 text-sm text-muted">
          That project couldn’t be found. <Link to="/projects" className="font-medium text-ink hover:underline">Back to projects</Link>
        </p>
      )}
      <ProjectDetail project={selected} status={selected ? statuses[selected.id] : null} gapIds={gapIds} onClose={() => navigate('/projects')} onStatus={onStatus} />
    </div>
  );
};

export default Projects;
