/**
 * Jobs — paste a job description, see how you match and get a targeted plan.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Trash2, Briefcase, Target, Route, GraduationCap, Clock, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ScoreRing from '../components/ui/ScoreRing';
import PriorityBadge from '../components/ui/PriorityBadge';
import { EmptyState } from '../components/ui/States';
import { ConfirmDialog } from '../components/ui/Overlay';
import JobsTabs from '../components/careers/JobsTabs';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { buildCustomRole } from '../data/roles';
import { analyzeRole } from '../lib/analysis';
import { parseJobDescription, matchJob, jobToCustomRole } from '../lib/jobDescription';
import { relativeTime } from '../lib/progress';
import { cx } from '../lib/cx';

const SAMPLE_JD = `Backend Engineer — Payments Platform

About the role
You'll design and scale the APIs that move money for millions of customers.

Requirements
- 2+ years of experience building backend services
- Strong JavaScript or TypeScript with Node.js
- Experience designing REST APIs and working with PostgreSQL
- Solid understanding of authentication and security best practices
- Familiar with Git-based workflows and writing automated tests
- Bachelor's degree in Computer Science or equivalent experience
- Clear communication and strong collaboration skills

Nice to have
- Docker and Kubernetes
- Experience with AWS
- Exposure to system design for high-traffic services`;

const Jobs = () => {
  const { analysis, career, insights, actions } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(false);
  const [busy, setBusy] = useState(false);

  const jobs = insights.jobs || [];
  const job = jobs.find((j) => j.id === selectedId) || jobs[0] || null;

  const match = useMemo(() => (job && analysis ? matchJob(job.parsed, analysis.levels) : null), [job, analysis]);
  const targeted = useMemo(() => {
    if (!job || !analysis || !job.parsed.required.length) return null;
    return analyzeRole(buildCustomRole(jobToCustomRole(job.parsed)), career.skills);
  }, [job, analysis, career]);

  if (!analysis) return <NoAnalysisState title="Add your skills first" description="We compare job descriptions against your skill profile." />;

  const analyze = async () => {
    const parsed = parseJobDescription(text);
    if (text.trim().length < 120) {
      setError('Paste the full job description — at least a few lines.');
      return;
    }
    if (!parsed.required.length && !parsed.preferred.length) {
      setError('We couldn’t find any recognisable skills in that text. Make sure it’s a technical job description.');
      return;
    }
    setError('');
    const entry = { id: `job_${Date.now().toString(36)}`, parsed, analyzedAt: new Date().toISOString() };
    await actions.saveJob(entry);
    setSelectedId(entry.id);
    setText('');
  };

  const targetThisJob = async () => {
    setBusy(true);
    try {
      await actions.targetJob(job);
      toast.success(`Your goal is now “${job.parsed.title}”`, { description: 'Generating a roadmap for this job.' });
      navigate('/roadmap', { state: { autoGenerate: true } });
    } finally {
      setBusy(false);
      setConfirmTarget(false);
    }
  };

  return (
    <div>
      <PageHeader title="Jobs" description="Check a real job against your profile, then target it directly." />
      <JobsTabs />

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="p-5">
          <label htmlFor="jd" className="text-sm font-semibold text-ink">
            Paste a job description
          </label>
          <textarea
            id="jd"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="Paste the full job post — title, responsibilities, requirements and nice-to-haves…"
            className="input mt-2 resize-y text-[13px]"
          />
          {error && (
            <p className="mt-2 text-sm text-danger-700" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => setText(SAMPLE_JD)} className="text-sm font-medium text-muted hover:text-ink">
              Try a sample job description
            </button>
            <Button onClick={analyze} disabled={!text.trim()}>
              Analyze job
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Saved jobs" />
          <CardBody>
            {jobs.length ? (
              <ul className="space-y-1">
                {jobs.map((j) => {
                  const m = matchJob(j.parsed, analysis.levels).match;
                  return (
                    <li key={j.id} className="group flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedId(j.id)}
                        className={cx('flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm', job?.id === j.id ? 'bg-slate-100' : 'hover:bg-slate-50')}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-ink">{j.parsed.title}</span>
                          <span className="block text-xs text-muted">{relativeTime(j.analyzedAt)}</span>
                        </span>
                        <span className="tabular text-xs font-semibold text-ink">{m}%</span>
                      </button>
                      <button type="button" onClick={() => actions.removeJob(j.id)} className="rounded p-1 text-muted-light opacity-0 hover:bg-slate-100 hover:text-danger-600 focus:opacity-100 group-hover:opacity-100" aria-label={`Delete ${j.parsed.title}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Analysed jobs appear here.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {job && match ? (
        <div className="mt-4 space-y-4">
          <Card className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <ScoreRing value={match.match} size={120} tone={match.match >= 75 ? 'success' : match.match >= 50 ? 'accent' : 'warning'} label={`Job match ${match.match}%`}>
                <span className="text-3xl font-semibold tracking-tight text-ink">{match.match}%</span>
                <span className="text-[11px] text-muted">job match</span>
              </ScoreRing>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted">Your profile vs</p>
                <h2 className="text-lg font-semibold text-ink">{job.parsed.title}</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 text-muted-light" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted">Experience</dt>
                      <dd className="text-ink">{job.parsed.experience ? `${job.parsed.experience.min}${job.parsed.experience.max ? `–${job.parsed.experience.max}` : '+'} years` : 'Not specified'}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 h-4 w-4 text-muted-light" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted">Education</dt>
                      <dd className="line-clamp-2 text-ink">{job.parsed.education || 'Not specified'}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 text-muted-light" aria-hidden />
                    <div>
                      <dt className="text-xs text-muted">Soft skills</dt>
                      <dd className="text-ink">{job.parsed.softSkills.length ? job.parsed.softSkills.slice(0, 3).join(', ') : 'Not specified'}</dd>
                    </div>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-2 md:items-end">
                <Button icon={Target} onClick={() => setConfirmTarget(true)} disabled={!job.parsed.required.length}>
                  Target this job
                </Button>
                <span className="text-xs text-muted">Builds a roadmap for exactly these skills</span>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Your profile vs job" description={`${match.have.length} of ${match.rows.length} skills at or near the level the job needs.`} />
              <CardBody>
                <ul className="divide-y divide-line">
                  {match.rows.map((row) => (
                    <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
                      {row.has ? <Check className="h-4 w-4 shrink-0 text-success-600" aria-label="Have" /> : <X className="h-4 w-4 shrink-0 text-danger" aria-label="Missing" />}
                      <span className="min-w-0 flex-1 truncate text-ink">{row.name}</span>
                      <span className={cx('text-xs', row.kind === 'required' ? 'font-medium text-ink' : 'text-muted')}>{row.kind === 'required' ? 'Required' : 'Preferred'}</span>
                      <span className="tabular w-16 text-right text-xs text-muted">
                        {row.level}/{row.target}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Targeted skill gap" description="What to close for this specific job, by priority." />
              <CardBody>
                {targeted && targeted.gaps.length ? (
                  <>
                    <ul className="space-y-2.5">
                      {targeted.gaps.slice(0, 8).map((gap) => (
                        <li key={gap.key} className="flex items-center gap-3 text-sm">
                          <PriorityBadge priority={gap.priority} showLabel={false} />
                          <span className="min-w-0 flex-1 truncate text-ink">{gap.skillName}</span>
                          <span className="tabular text-xs text-muted">
                            {gap.current}% → {gap.required}%
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button variant="secondary" icon={Route} className="mt-5" onClick={() => setConfirmTarget(true)}>
                      Generate targeted roadmap
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted">{targeted ? 'You already meet every skill this job lists.' : 'No required skills were detected in this description.'}</p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="mt-4">
          <EmptyState icon={Briefcase} title="No job analysed yet" description="Paste a job post above to see your match and exactly what to learn for it." />
        </Card>
      )}

      <ConfirmDialog
        open={confirmTarget}
        onClose={() => setConfirmTarget(false)}
        onConfirm={targetThisJob}
        loading={busy}
        title="Target this job?"
        description={`Your goal becomes “${job?.parsed.title}” and we’ll generate a roadmap for its required and preferred skills. Your skills and progress are kept, and you can switch back any time from Profile.`}
        confirmLabel="Target & generate"
      />
    </div>
  );
};

export default Jobs;
