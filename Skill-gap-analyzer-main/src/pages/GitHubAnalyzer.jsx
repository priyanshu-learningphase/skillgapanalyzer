/**
 * GitHub Analyzer — scores a public GitHub profile as a portfolio and finds
 * what it proves (and doesn't) for the target role.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, RefreshCw, Star, Plus, ExternalLink, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScoreRing from '../components/ui/ScoreRing';
import ProgressBar from '../components/ui/ProgressBar';
import DistributionBar from '../components/ui/DistributionBar';
import { ErrorState, EmptyState } from '../components/ui/States';
import { Skeleton } from '../components/ui/Spinner';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { fetchGithubData } from '../services/githubService';
import GithubForm from '../components/skills/GithubForm';
import { analyzeGithub } from '../lib/github';
import { recommendProjects } from '../lib/projects';
import { relativeTime } from '../lib/progress';

const LANGUAGE_COLORS = ['bg-accent', 'bg-success', 'bg-warning', 'bg-slate-400', 'bg-accent-200', 'bg-slate-300'];

const GitHubAnalyzer = () => {
  const { role, career, analysis, insights, actions } = useWorkspace();
  const toast = useToast();
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState(null);
  const [importing, setImporting] = useState(false);
  const result = insights.github;

  const owned = new Set((career?.skills || []).map((s) => s.id));
  const newSkills = result ? result.detectedSkills.filter((s) => !owned.has(s.id)) : [];
  const projectRecs = useMemo(() => {
    if (!result || !analysis) return [];
    const missingIds = new Set(result.roleMissing.map((m) => m.skillId));
    const portfolioGaps = { ...analysis, gaps: analysis.gaps.filter((g) => missingIds.has(g.skillId)) };
    return recommendProjects({ analysis: portfolioGaps, roleId: role.id, level: career.level, limit: 3 });
  }, [result, analysis, role, career]);

  if (!analysis) return <NoAnalysisState title="Set a goal first" description="We score your GitHub against your target role." />;

  const save = async (next) => {
    await actions.saveInsight('github', next);
    toast.success(`Analysed @${next.username}`, { description: `GitHub profile score ${next.score}/100.` });
  };

  const rerun = async () => {
    setRerunning(true);
    setRerunError(null);
    try {
      const data = await fetchGithubData(result.username);
      await save({ ...analyzeGithub(data, role), analyzedAt: new Date().toISOString(), roleId: role.id });
    } catch (error) {
      setRerunError(error);
    } finally {
      setRerunning(false);
    }
  };

  const importSkills = async () => {
    setImporting(true);
    try {
      const added = await actions.importSkills(
        newSkills.slice(0, 12).map((s) => ({ id: s.id, name: s.name, level: Math.min(60, 35 + s.weight * 3) })),
        { label: 'GitHub' },
      );
      if (added.added) toast.success(`Added ${added.added} skill${added.added === 1 ? '' : 's'} from GitHub`, { description: 'Levels are estimates — confirm them with assessments.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <PageHeader title="GitHub Analyzer" description={`Score your public portfolio and see what it proves for ${role.name}.`} />

      {!result ? (
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-ink">Analyse your GitHub profile</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">We look at your repositories, languages, activity, READMEs and testing signals, then compare what you’ve built with what {role.name} roles need.</p>
          <div className="mt-5 max-w-xl">
            <GithubForm onResult={save} />
          </div>
        </Card>
      ) : rerunning ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-40" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rerunError && (
            <Card>
              <ErrorState title="Couldn’t refresh from GitHub" description={rerunError.message} onRetry={rerun} />
            </Card>
          )}
          <Card className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4 md:w-72">
                {result.profile.avatarUrl ? (
                  <img src={result.profile.avatarUrl} alt="" className="h-14 w-14 rounded-full border border-line" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <Github className="h-6 w-6 text-muted" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{result.profile.name}</p>
                  <a href={result.profile.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
                    @{result.username} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                  <p className="text-xs text-muted">
                    {result.profile.publicRepos} public repos · {result.profile.followers} followers
                  </p>
                </div>
              </div>
              <ScoreRing value={result.score} size={120} tone={result.score >= 75 ? 'success' : result.score >= 50 ? 'accent' : 'warning'} label={`GitHub profile score ${result.score} out of 100`}>
                <span className="text-3xl font-semibold tracking-tight text-ink">{result.score}</span>
                <span className="text-[11px] text-muted">/ 100</span>
              </ScoreRing>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium text-ink">GitHub Profile Score</p>
                {result.dimensions.map((d) => (
                  <div key={d.id} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-xs" title={d.detail}>
                    <span className="truncate text-muted">{d.label}</span>
                    <ProgressBar value={d.value} max={d.max} size="sm" tone={d.pct >= 70 ? 'success' : d.pct >= 40 ? 'accent' : 'warning'} label={d.label} />
                    <span className="tabular text-right text-muted">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
              <span>
                Analysed {relativeTime(result.analyzedAt)}
                {result.roleId && result.roleId !== role.id ? ' for a different target role' : ''}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={RefreshCw} onClick={rerun}>
                  Re-analyse
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.saveInsight('github', null)}>
                  Use a different account
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Strengths" icon={CheckCircle2} />
              <CardBody>
                {result.strengths.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.strengths.map((s) => (
                      <Badge key={s} tone="success">
                        {s}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Nothing stands out yet — that’s what the recommendations below are for.</p>
                )}
                {result.roleMatches.length > 0 && (
                  <p className="mt-4 text-sm text-muted">
                    Visible role skills: <span className="text-ink">{result.roleMatches.join(', ')}</span>
                  </p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Needs work" icon={AlertTriangle} />
              <CardBody>
                {result.needsWork.length ? (
                  <ul className="space-y-2.5">
                    {result.needsWork.map((n) => (
                      <li key={n.label} className="text-sm">
                        <p className="font-medium text-ink">{n.label}</p>
                        <p className="text-muted">{n.detail}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">No weak dimensions — nice portfolio.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Detected skills"
                action={
                  newSkills.length > 0 && (
                    <Button size="sm" icon={Plus} onClick={importSkills} loading={importing}>
                      Add {Math.min(12, newSkills.length)} to profile
                    </Button>
                  )
                }
              />
              <CardBody>
                {result.languages.length > 0 && (
                  <DistributionBar className="mb-4" segments={result.languages.slice(0, 6).map((l, i) => ({ label: l.name, value: l.count, color: LANGUAGE_COLORS[i] }))} />
                )}
                {result.detectedSkills.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {result.detectedSkills.map((s) => (
                      <span key={s.id} className={owned.has(s.id) ? 'rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700' : 'rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-xs text-ink'}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No recognisable technologies found in public repositories.</p>
                )}
                {newSkills.length > 0 && <p className="mt-3 text-xs text-muted">Dashed skills aren’t in your profile yet.</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Projects to add to your portfolio" description="Based on role skills your GitHub doesn’t show yet." />
              <CardBody>
                {projectRecs.length ? (
                  <ul className="space-y-2">
                    {projectRecs.map(({ project, reason }) => (
                      <li key={project.id}>
                        <Link to={`/projects/${project.id}`} className="block rounded-lg border border-line px-3 py-2.5 text-sm hover:border-slate-300 hover:bg-slate-50">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-ink">{project.title}</span>
                            <Badge tone="outline">{project.difficulty}</Badge>
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">{reason}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact title="Your portfolio covers the role" description="Keep shipping and documenting." />
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Top repositories" />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-y border-line">
                    <th scope="col" className="px-5 py-2.5 font-medium">Repository</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Language</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Stars</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">README</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.repos.map((r) => (
                    <tr key={r.name}>
                      <td className="max-w-xs px-5 py-3">
                        <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
                          {r.name}
                        </a>
                        {r.description && <p className="truncate text-xs text-muted">{r.description}</p>}
                      </td>
                      <td className="px-3 py-3 text-muted">{r.language || '—'}</td>
                      <td className="tabular px-3 py-3 text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3" aria-hidden /> {r.stars}
                        </span>
                      </td>
                      <td className="tabular px-3 py-3 text-muted">{r.readme == null ? 'Not checked' : `${r.readme}/100`}</td>
                      <td className="px-5 py-3 text-right text-muted">{relativeTime(r.pushedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.repos.length === 0 && <p className="px-5 py-6 text-sm text-muted">No public, original repositories yet.</p>}
            </div>
            <p className="flex items-start gap-2 px-5 py-4 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Score uses public data only (repos, languages, recent activity, README quality, testing/CI mentions) and checks READMEs for up to 6 repositories.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GitHubAnalyzer;
