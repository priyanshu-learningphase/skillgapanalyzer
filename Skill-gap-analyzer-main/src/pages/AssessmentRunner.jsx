/**
 * Take an assessment: intro → questions → results with an adaptive
 * recommendation and a full answer review.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X, RotateCcw, Route, Clock, ListChecks, TrendingUp, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import ScoreRing from '../components/ui/ScoreRing';
import { EmptyState } from '../components/ui/States';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { getAssessment, PASS_PCT } from '../data/assessments/index';
import { getSkill } from '../data/skills';
import { scoreAssessment } from '../lib/assessment';
import { cx } from '../lib/cx';

const TYPE_LABEL = { concept: 'Concept', code: 'Code', scenario: 'Scenario' };
const LETTERS = ['A', 'B', 'C', 'D'];

const AssessmentRunner = () => {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { analysis, latestAssessments, roadmap, roadmapState, actions } = useWorkspace();
  const questions = useMemo(() => getAssessment(skillId), [skillId]);
  const skill = getSkill(skillId);
  const [stage, setStage] = useState('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!skill || !questions.length) {
    return (
      <Card>
        <EmptyState
          title="No assessment for this skill yet"
          description="Use a topic check-in instead — it asks how confident you are in each topic."
          action={<Button to={skill ? `/gap?skill=${skillId}` : '/gap'}>Open check-in</Button>}
          secondaryAction={<Button variant="secondary" to="/assessments">All assessments</Button>}
        />
      </Card>
    );
  }

  const before = analysis?.levels[skillId]?.level ?? 0;
  const last = latestAssessments[skillId];
  const question = questions[index];
  const answered = Object.keys(answers).length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const scored = scoreAssessment(questions, answers);
      const outcome = await actions.submitAssessment({ skillId, result: scored });
      setResult({ ...scored, ...outcome });
      setStage('results');
      window.scrollTo({ top: 0 });
    } catch (error) {
      toast.error('Couldn’t save your result', { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setStage('questions');
  };

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <Link to="/assessments" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Assessments
        </Link>
        <Card className="p-6 sm:p-8">
          <p className="eyebrow">{skill.category}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{skill.name} assessment</h1>
          <p className="mt-2 text-sm text-muted">Concept, code-reading and scenario questions from basics to advanced.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              [ListChecks, `${questions.length} questions`, 'Multiple choice'],
              [Clock, '~5 minutes', 'No time limit'],
              [TrendingUp, `Pass at ${PASS_PCT}%`, 'Updates your level'],
            ].map(([Icon, title, body]) => (
              <li key={title} className="rounded-lg border border-line p-3">
                <Icon className="h-4 w-4 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-medium text-ink">{title}</p>
                <p className="text-xs text-muted">{body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-muted">
            Your current level is <span className="font-medium text-ink">{before}%</span>
            {last && (
              <>
                {' '}
                · last score <span className="font-medium text-ink">{last.pct}%</span>
              </>
            )}
            . Below 60% your roadmap brings the fundamentals back; 85%+ skips beginner content.
          </div>
          <Button size="lg" className="mt-6" iconRight={ArrowRight} onClick={() => setStage('questions')}>
            Start assessment
          </Button>
        </Card>
      </div>
    );
  }

  if (stage === 'results' && result) {
    const isPass = result.pct >= PASS_PCT;
    const tone = result.pct >= 85 ? 'success' : isPass ? 'accent' : result.pct >= 60 ? 'warning' : 'danger';
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/assessments" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Assessments
        </Link>
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <ScoreRing value={result.pct} tone={tone} size={128} label={`Score ${result.correct} of ${result.total}`}>
              <span className="text-3xl font-semibold tracking-tight text-ink">
                {result.correct}/{result.total}
              </span>
              <span className="text-xs text-muted">{result.pct}%</span>
            </ScoreRing>
            <div className="min-w-0 flex-1">
              <Badge tone={isPass ? 'success' : 'warning'}>{isPass ? 'Passed' : 'Not passed'}</Badge>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">{skill.name} assessment</h1>
              <div className="mt-4 grid max-w-sm grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted">Before</p>
                  <p className="tabular text-2xl font-semibold text-ink">{result.entry.before}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted">After</p>
                  <p className={cx('tabular text-2xl font-semibold', result.entry.after >= result.entry.before ? 'text-success-700' : 'text-danger-700')}>{result.entry.after}%</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recommended action</p>
            <p className="mt-1 font-medium text-ink">→ {result.recommendation.title}</p>
            <p className="mt-0.5 text-sm text-muted">{result.recommendation.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {roadmap && roadmapState !== 'role-changed' ? (
                <Button icon={RefreshCw} onClick={() => navigate('/roadmap', { state: { autoGenerate: true } })}>
                  Update my roadmap
                </Button>
              ) : (
                <Button icon={Route} onClick={() => navigate('/roadmap', { state: { autoGenerate: true } })}>
                  Generate my roadmap
                </Button>
              )}
              <Button variant="secondary" icon={RotateCcw} onClick={restart}>
                Retake
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Review your answers</h2>
          </div>
          <ol className="divide-y divide-line">
            {result.review.map(({ question: q, chosen, isCorrect }, i) => (
              <li key={q.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', isCorrect ? 'bg-success text-white' : 'bg-danger text-white')}>
                    {isCorrect ? <Check className="h-3 w-3" strokeWidth={3} aria-label="Correct" /> : <X className="h-3 w-3" strokeWidth={3} aria-label="Incorrect" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {i + 1}. {q.prompt}
                    </p>
                    {!isCorrect && (
                      <p className="mt-1 text-sm text-muted">
                        Your answer: <span className="text-danger-700">{chosen != null ? q.options[chosen] : 'No answer'}</span>
                      </p>
                    )}
                    <p className="mt-1 text-sm text-muted">
                      Correct: <span className="text-success-700">{q.options[q.answer]}</span>
                    </p>
                    <p className="mt-2 text-sm text-ink">{q.explanation}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/assessments" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <X className="h-3.5 w-3.5" aria-hidden /> Exit
        </Link>
        <span className="tabular text-sm text-muted">
          Question {index + 1} of {questions.length}
        </span>
      </div>
      <ProgressBar value={index + 1} max={questions.length} size="sm" label="Assessment progress" className="mb-6" />
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <Badge tone="outline">{TYPE_LABEL[question.type]}</Badge>
          <span className="text-xs capitalize text-muted">{question.level}</span>
        </div>
        <h1 className="mt-3 text-lg font-semibold leading-snug text-ink">{question.prompt}</h1>
        {question.code && <pre className="mt-4 overflow-x-auto rounded-lg bg-ink p-4 font-mono text-[13px] leading-relaxed text-slate-200">{question.code}</pre>}
        <div className="mt-5 space-y-2" role="radiogroup" aria-label="Answer options">
          {question.options.map((option, i) => {
            const selected = answers[question.id] === i;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAnswers((a) => ({ ...a, [question.id]: i }))}
                className={cx(
                  'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                  selected ? 'border-ink bg-slate-50 ring-1 ring-ink' : 'border-line hover:border-slate-300',
                )}
              >
                <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold', selected ? 'bg-ink text-white' : 'bg-slate-100 text-muted')}>{LETTERS[i]}</span>
                <span className="text-ink">{option}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Back
        </Button>
        {index < questions.length - 1 ? (
          <Button iconRight={ArrowRight} onClick={() => setIndex((i) => i + 1)} disabled={answers[question.id] == null}>
            Next
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting} disabled={answered < questions.length}>
            Submit ({answered}/{questions.length})
          </Button>
        )}
      </div>
    </div>
  );
};

export default AssessmentRunner;
