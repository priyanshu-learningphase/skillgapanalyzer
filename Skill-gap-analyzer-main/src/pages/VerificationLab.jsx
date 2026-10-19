/**
 * Practical verification lab — hands-on challenges that prove a skill.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, CheckCircle2, ShieldCheck, Target, TrendingUp, Lock, ArrowRight, CircleDashed, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Stat from '../components/ui/Stat';
import Segmented from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/States';
import AssessmentTabs from '../components/lab/AssessmentTabs';
import { useWorkspace } from '../context/WorkspaceContext';
import { CHALLENGES, DIFFICULTY_META, KIND_META, LAB_CATEGORIES } from '../data/challenges/index';
import { getSkill } from '../data/skills';
import { labStats, recommendChallenges } from '../lib/labGrading';
import { getExecutionStatus } from '../services/executionService';
import { relativeTime } from '../lib/progress';
import { cx } from '../lib/cx';

const DIFF_TONE = { easy: 'success', medium: 'warning', hard: 'danger' };

export const needsService = (c) => c.kind === 'code' && !c.languages.javascript;

const ChallengeRow = ({ challenge, stat, pythonAvailable, gap }) => {
  const locked = needsService(challenge) && !pythonAvailable;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/assessments/lab/${challenge.id}`} className="text-sm font-medium text-ink hover:underline">
            {challenge.title}
          </Link>
          <Badge tone={DIFF_TONE[challenge.difficulty]}>{DIFFICULTY_META[challenge.difficulty].label}</Badge>
          {gap && <span className="text-2xs font-medium text-warning-700">Closes {gap.priority === 'important' || gap.priority === 'optional' ? 'an' : 'a'} {gap.priority} gap</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {getSkill(challenge.skillId)?.name} · {KIND_META[challenge.kind].label}
          {challenge.kind === 'code' && ` · ${Object.keys(challenge.languages).map((l) => (l === 'javascript' ? 'JavaScript' : 'Python')).join(' or ')}`}
        </p>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        {stat ? (
          <span className={cx('inline-flex items-center gap-1 text-xs font-medium', stat.passed ? 'text-success-700' : 'text-warning-700')}>
            {stat.passed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <CircleDashed className="h-3.5 w-3.5" aria-hidden />}
            {stat.passed ? 'Passed' : `Best ${stat.best}%`} · {stat.attempts} attempt{stat.attempts === 1 ? '' : 's'}
          </span>
        ) : locked ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted" title="Python needs a code-execution service configured on the server">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Needs execution service
          </span>
        ) : null}
        <Button size="sm" variant={stat?.passed ? 'secondary' : 'primary'} to={`/assessments/lab/${challenge.id}`}>
          {stat ? (stat.passed ? 'Review' : 'Retry') : 'Start'}
        </Button>
      </div>
    </li>
  );
};

const VerificationLab = () => {
  const { analysis, progress } = useWorkspace();
  const [category, setCategory] = useState('all');
  const [python, setPython] = useState(false);
  const verifications = progress.verifications || [];
  const stats = useMemo(() => labStats(verifications), [verifications]);

  useEffect(() => {
    let alive = true;
    getExecutionStatus().then((s) => alive && setPython(s.languages.includes('python')));
    return () => {
      alive = false;
    };
  }, []);

  const recs = useMemo(() => recommendChallenges({ analysis, verifications, limit: 3, pythonAvailable: python }), [analysis, verifications, python]);
  const gapBySkill = useMemo(() => Object.fromEntries((analysis?.gaps || []).map((g) => [g.skillId, g])), [analysis]);
  const visible = CHALLENGES.filter((c) => category === 'all' || c.category === category);

  return (
    <div>
      <PageHeader title="Assessments" description="Quizzes check what you know. Practical challenges prove you can do it — and count as the strongest evidence for a skill." />
      <AssessmentTabs />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Challenges passed" icon={CheckCircle2} value={stats.passed} hint={`of ${CHALLENGES.length}`} />
        <Stat label="Skills practically verified" icon={ShieldCheck} value={stats.skillsVerified.length} hint={stats.skillsVerified.length ? stats.skillsVerified.map((id) => getSkill(id)?.name).join(', ') : 'None yet'} />
        <Stat label="Accuracy" icon={Target} value={stats.accuracy ?? '—'} unit={stats.accuracy != null ? '%' : undefined} hint={`${stats.attempts} attempt${stats.attempts === 1 ? '' : 's'} · tests passed`} />
        <Stat label="Improved on retry" icon={TrendingUp} value={stats.improved} hint="Challenges with a better retry score" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Recommended for you" description="Challenges for your most important skill gaps, at the next difficulty you haven’t passed." />
        <CardBody>
          {recs.length ? (
            <ul className="grid gap-3 md:grid-cols-3">
              {recs.map(({ challenge, gap }) => (
                <li key={challenge.id} className="flex flex-col rounded-lg border border-line p-3">
                  <p className="text-xs text-muted">
                    {gap.skillName} · {gap.current}% → {gap.required}%
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{challenge.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={DIFF_TONE[challenge.difficulty]}>{DIFFICULTY_META[challenge.difficulty].label}</Badge>
                    <span className="text-2xs text-muted">
                      {DIFFICULTY_META[challenge.difficulty].levelFloor > gap.current ? `A pass raises ${gap.skillName} to ${DIFFICULTY_META[challenge.difficulty].levelFloor}%` : `A pass verifies your ${gap.current}%`}
                    </span>
                  </div>
                  <Button size="sm" className="mt-3 self-start" iconRight={ArrowRight} to={`/assessments/lab/${challenge.id}`}>
                    Start
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{analysis ? 'No lab challenges match your open gaps right now. Browse all challenges below.' : 'Analyse your skills to get recommendations.'}</p>
          )}
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="All challenges" description={`${CHALLENGES.length} challenges across ${LAB_CATEGORIES.length} categories and three difficulty levels.`} />
        <div className="overflow-x-auto px-5 pt-3">
          <Segmented
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: 'all', label: 'All', count: CHALLENGES.length }, ...LAB_CATEGORIES.map((c) => ({ value: c.id, label: c.label.split(' & ')[0].replace('Data structures', 'DSA'), count: CHALLENGES.filter((x) => x.category === c.id).length }))]}
          />
        </div>
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {[...visible]
            .sort((a, b) => LAB_CATEGORIES.findIndex((c) => c.id === a.category) - LAB_CATEGORIES.findIndex((c) => c.id === b.category) || DIFFICULTY_META[a.difficulty].order - DIFFICULTY_META[b.difficulty].order)
            .map((c) => (
              <ChallengeRow key={c.id} challenge={c} stat={stats.byChallenge[c.id]} pythonAvailable={python} gap={gapBySkill[c.skillId]} />
            ))}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader title="History" />
          <CardBody>
            {verifications.length ? (
              <ul className="space-y-2.5">
                {verifications.slice(0, 12).map((v) => (
                  <li key={v.id} className="flex items-start gap-3 text-sm">
                    {v.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-label="Passed" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-label="Not passed" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">
                        {v.title} <span className="text-muted">· {DIFFICULTY_META[v.difficulty]?.label}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {v.testsPassed}/{v.testsTotal} passed{v.language ? ` · ${v.language === 'python' ? 'Python' : 'JavaScript'}` : ''}
                        {v.after > v.before ? ` · ${getSkill(v.skillId)?.name} ${v.before}% → ${v.after}%` : ''} · {relativeTime(v.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={FlaskConical} title="No attempts yet" description="Pick a recommended challenge to start building verified evidence." />
            )}
          </CardBody>
        </Card>
        <Card className="p-4 text-sm">
          <p className="font-medium text-ink">How grading works</p>
          <ul className="mt-2 space-y-2 text-xs text-muted">
            <li>
              <span className="font-medium text-ink">JavaScript</span> runs in an isolated sandbox in your browser: no network, no access to your account, stopped after a few seconds.
            </li>
            <li>
              <span className="font-medium text-ink">SQL</span> runs on a real SQLite database, against a visible and a hidden dataset.
            </li>
            <li>
              <span className="font-medium text-ink">Git, API and HTML tasks</span> are checked structurally: nothing you type is executed.
            </li>
            <li>
              <span className="font-medium text-ink">Python</span> {python ? 'runs on the server’s code-execution service.' : 'needs a code-execution service on the server, which isn’t configured, so Python challenges can’t be graded yet.'}
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default VerificationLab;
