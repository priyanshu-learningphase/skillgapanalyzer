/**
 * Mock interview: answer questions from your plan against the clock, then
 * review each answer with automatic checks and, when the server has AI
 * configured, optional AI feedback.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Circle, Info, Lightbulb, RotateCcw, SkipForward, Sparkles, Timer } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Stat from '../components/ui/Stat';
import Segmented from '../components/ui/Segmented';
import ProgressBar from '../components/ui/ProgressBar';
import { ConfirmDialog } from '../components/ui/Overlay';
import { EmptyState, Notice } from '../components/ui/States';
import { NoAnalysisState } from '../components/common/WorkspaceEmpty';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { useInterviewPlan } from '../hooks/useInterviewPlan';
import { MAX_ANSWER_CHARS, MAX_MOCK_SESSIONS, MOCK_KINDS, MOCK_LENGTHS, MOCK_MINUTES, analyzeAnswer, formatDuration, pickMockQuestions, recentMockQuestionIds, summarizeMock } from '../lib/mockInterview';
import { buildFeedbackRequest, validateFeedback } from '../lib/interviewFeedbackSchema';
import { getAiStatus, getAnswerFeedback } from '../services/aiService';
import { cx } from '../lib/cx';

const fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const kindSummary = (questions) => {
  const counts = {};
  for (const q of questions) counts[q.kind] = (counts[q.kind] || 0) + 1;
  return Object.entries(counts)
    .map(([kind, n]) => `${n} ${MOCK_KINDS[kind].label.toLowerCase()}`)
    .join(', ');
};

const QuestionMeta = ({ q }) => (
  <>
    <Badge>{MOCK_KINDS[q.kind].label}</Badge>
    {q.skill && <span>{q.skill}</span>}
    {q.company && <Badge tone="accent">{q.company}</Badge>}
    {q.project && <span className="truncate">{q.project}</span>}
  </>
);

/* ------------------------------------------------------------------ */
/* Setup                                                              */
/* ------------------------------------------------------------------ */

const Setup = ({ plan, recent, onStart }) => {
  const [count, setCount] = useState(5);
  const [minutes, setMinutes] = useState(3);
  const questions = useMemo(() => pickMockQuestions(plan, { count, recent }), [plan, count, recent]);

  return (
    <div>
      <PageHeader
        eyebrow="Interview Prep"
        title="Mock interview"
        description="Answer questions from your plan against the clock, the way you would in the room. Then review every answer."
        actions={
          <Button variant="secondary" to="/interview">
            Back to Interview Prep
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardBody className="space-y-5 py-5">
          <fieldset>
            <legend className="label">Questions</legend>
            <Segmented label="Number of questions" value={count} onChange={setCount} options={MOCK_LENGTHS.map((n) => ({ value: n, label: `${n}` }))} />
          </fieldset>
          <fieldset>
            <legend className="label">Time per question</legend>
            <Segmented label="Minutes per question" value={minutes} onChange={setMinutes} options={MOCK_MINUTES.map((m) => ({ value: m, label: `${m} min` }))} />
          </fieldset>
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-ink">
              {questions.length} questions · about {questions.length * minutes} minutes
            </p>
            <p className="mt-0.5 text-muted">{kindSummary(questions)}. Focus areas from your gaps come first.</p>
          </div>
          <ul className="space-y-1.5 text-sm text-muted">
            {['Type your answer as you would say it out loud.', 'The timer is a guide: you can keep going past it.', 'What a strong answer covers stays hidden until the review.'].map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button icon={Timer} onClick={() => onStart({ questions, minutes })} disabled={!questions.length}>
              Start interview
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Running                                                            */
/* ------------------------------------------------------------------ */

const Runner = ({ run, setRun, onFinish }) => {
  const [now, setNow] = useState(() => Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef(null);
  const q = run.questions[run.index];
  const limit = run.minutes * 60;
  const elapsed = Math.max(0, (now - run.questionStart) / 1000);
  const remaining = limit - elapsed;
  const isLast = run.index === run.questions.length - 1;
  const words = q.answer.trim() ? q.answer.trim().split(/\s+/).length : 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
    setAnnouncement('');
  }, [run.index]);

  // Screen readers hear two cues per question instead of every tick.
  useEffect(() => {
    if (remaining <= 0 && !announcement.startsWith('Time')) setAnnouncement('Time is up. Finish your thought and move on.');
    else if (remaining <= 30 && remaining > 0 && !announcement) setAnnouncement('30 seconds left.');
  }, [remaining, announcement]);

  // Warn before closing the tab mid-interview.
  useEffect(() => {
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const setAnswer = (answer) => setRun((r) => ({ ...r, questions: r.questions.map((x, i) => (i === r.index ? { ...x, answer } : x)) }));

  const advance = useCallback(
    (endNow = false) => {
      const spent = Math.round((Date.now() - run.questionStart) / 1000);
      const questions = run.questions.map((x, i) => (i === run.index ? { ...x, seconds: spent } : x));
      if (endNow || run.index === run.questions.length - 1) {
        onFinish({ ...run, questions });
        return;
      }
      setRun({ ...run, questions, index: run.index + 1, questionStart: Date.now() });
      setNow(Date.now());
    },
    [run, setRun, onFinish],
  );

  const onKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      advance();
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          Question {run.index + 1} <span className="text-muted">of {run.questions.length}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={() => setConfirmEnd(true)}>
          End interview
        </Button>
      </div>
      <ProgressBar value={run.index} max={run.questions.length} className="mt-2" label="Interview progress" />

      <Card className="mt-4">
        <CardBody className="py-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <QuestionMeta q={q} />
            <span
              className={cx('tabular ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-semibold', remaining < 0 ? 'bg-warning-50 text-warning-700' : remaining <= 30 ? 'text-warning-700' : 'text-ink')}
              aria-label={remaining < 0 ? `${formatDuration(-remaining)} over time` : `${formatDuration(remaining)} left`}
            >
              <Timer className="h-4 w-4" aria-hidden />
              {remaining < 0 ? `+${formatDuration(-remaining)}` : formatDuration(remaining)}
            </span>
          </div>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-ink sm:text-xl">{q.question}</h1>
          <label htmlFor="mock-answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="mock-answer"
            ref={inputRef}
            value={q.answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_ANSWER_CHARS}
            rows={10}
            placeholder="Type your answer as you would say it…"
            className="input mt-4 resize-y leading-relaxed"
            aria-describedby="mock-answer-hint"
          />
          <p id="mock-answer-hint" className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
            <span>
              {words} word{words === 1 ? '' : 's'}
            </span>
            <span className="hidden sm:inline">Ctrl + Enter for the next question</span>
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {!words && !isLast && (
              <Button variant="secondary" icon={SkipForward} onClick={() => advance()}>
                Skip
              </Button>
            )}
            <Button iconRight={isLast ? undefined : ArrowRight} onClick={() => advance()}>
              {isLast ? 'Finish and review' : 'Next question'}
            </Button>
          </div>
        </CardBody>
      </Card>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <ConfirmDialog
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          advance(true);
        }}
        title="End the interview now?"
        description="You’ll review what you’ve answered so far. Questions you haven’t reached count as skipped."
        confirmLabel="End and review"
      />
    </div>
  );
};

const NewMock = () => {
  const { role, progress, actions } = useWorkspace();
  const plan = useInterviewPlan();
  const navigate = useNavigate();
  const toast = useToast();
  const [run, setRun] = useState(null);
  const sessions = progress.interview?.mocks;
  const recent = useMemo(() => recentMockQuestionIds(sessions || []), [sessions]);

  if (!plan) return <NoAnalysisState page="Mock interview" title="No interview plan yet" description="Pick a target role and add your skills, and we’ll build questions for your mock interview." />;

  const start = ({ questions, minutes }) => {
    setRun({
      id: `mock_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      minutes,
      index: 0,
      questionStart: Date.now(),
      questions: questions.map((q) => ({ ...q, answer: '', seconds: 0 })),
    });
  };

  const finish = async (done) => {
    const questions = done.questions.map(({ id, kind, question, points, skill, company, project, answer, seconds }) => ({
      id,
      kind,
      question,
      points,
      skill,
      company,
      project,
      answer: answer.trim().slice(0, MAX_ANSWER_CHARS),
      seconds,
    }));
    if (!questions.some((q) => q.answer)) {
      setRun(null);
      toast.info('Nothing to review yet', { description: 'Answer at least one question to save a mock interview.' });
      return;
    }
    const session = { id: done.id, at: done.at, role: role.name, minutes: done.minutes, questions };
    try {
      await actions.saveMockInterview(session);
    } catch (error) {
      toast.error('Couldn’t save this interview', { description: error.message });
    }
    navigate(`/interview/mock/${session.id}`, { replace: true });
  };

  if (!run) return <Setup plan={plan} recent={recent} onStart={start} />;
  return <Runner run={run} setRun={setRun} onFinish={finish} />;
};

/* ------------------------------------------------------------------ */
/* Review                                                             */
/* ------------------------------------------------------------------ */

const VERDICT = { strong: ['Strong', 'success'], solid: ['Solid', 'accent'], 'needs-work': ['Needs work', 'warning'] };

const AiFeedback = ({ feedback }) => {
  const [label, tone] = VERDICT[feedback.verdict] || VERDICT.solid;
  return (
    <section className="mt-4 rounded-lg border border-accent-100 bg-accent-50/40 px-4 py-3" aria-label="AI feedback">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-accent-600" aria-hidden /> AI feedback
        </h3>
        <Badge tone={tone}>{label}</Badge>
        {feedback.model && <span className="ml-auto text-2xs text-muted-light">{feedback.model}</span>}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{feedback.summary}</p>
      <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
        {feedback.strengths.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Working well</h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-ink-soft">
              {feedback.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.improvements.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">To improve</h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-ink-soft">
              {feedback.improvements.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {feedback.strongerOpening && (
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">A stronger first line:</span> “{feedback.strongerOpening}”
        </p>
      )}
      <p className="mt-2 text-2xs text-muted">Practice feedback from an AI model. It can be wrong, so weigh it against the points above.</p>
    </section>
  );
};

const AnswerReview = ({ index, q, role, limit, aiEnabled, onSaveAi }) => {
  const result = useMemo(() => analyzeAnswer(q), [q]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const over = q.seconds > limit;

  const askAi = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await getAnswerFeedback(buildFeedbackRequest({ role, question: q }));
      const checked = validateFeedback(data.feedback);
      if (!checked.ok) throw new Error('The AI reply didn’t pass our checks. Try again.');
      await onSaveAi({ ...checked.feedback, model: data.model || null, at: new Date().toISOString() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <Card>
        <div className="px-5 pt-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-medium text-ink">Question {index + 1}</span>
            <QuestionMeta q={q} />
            <span className={cx('tabular ml-auto', over && 'font-medium text-warning-700')}>
              {formatDuration(q.seconds)}
              {over && ' · over time'}
            </span>
          </div>
          <h2 className="mt-2 text-[15px] font-semibold text-ink">{q.question}</h2>
        </div>
        <CardBody>
          {result.status === 'empty' ? (
            <>
              <p className="text-sm text-muted">Skipped.</p>
              {q.points.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">A strong answer covers</h3>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                    {q.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-ink-soft">{q.answer}</div>
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                {result.coverage && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">What a strong answer covers</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {result.coverage.items.map((c) => (
                        <li key={c.point} className="flex gap-2">
                          {c.covered ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-light" aria-hidden />}
                          <span className={c.covered ? 'text-ink' : 'text-muted'}>
                            {c.point}
                            <span className="sr-only">{c.covered ? ' (mentioned)' : ' (not mentioned)'}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Checks</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {result.checks.map((c) => (
                      <li key={c.id} className="flex gap-2">
                        {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" aria-hidden />}
                        <span>
                          <span className="font-medium text-ink">{c.label}</span>
                          <span className="sr-only">{c.ok ? ': looks good.' : ': worth a look.'}</span>
                          <span className="block text-xs text-muted">{c.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              {result.tips.length > 0 && (
                <section className="mt-4">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Try next time
                  </h3>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                    {result.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </section>
              )}
              {q.ai ? (
                <AiFeedback feedback={q.ai} />
              ) : (
                aiEnabled &&
                result.status === 'ok' && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button variant="secondary" size="sm" icon={Sparkles} loading={busy} onClick={askAi}>
                      Get AI feedback
                    </Button>
                    {error && (
                      <p className="text-xs text-danger-700" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                )
              )}
            </>
          )}
        </CardBody>
      </Card>
    </li>
  );
};

const SavedReview = ({ id }) => {
  const { progress, actions } = useWorkspace();
  const session = progress.interview?.mocks?.find((m) => m.id === id);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    let live = true;
    getAiStatus().then((status) => live && setAiEnabled(status.enabled));
    return () => {
      live = false;
    };
  }, []);

  if (!session) {
    return (
      <div>
        <PageHeader eyebrow="Interview Prep" title="Mock interview" />
        <Card>
          <EmptyState
            icon={Timer}
            title="This mock interview isn’t saved"
            description={`Only your last ${MAX_MOCK_SESSIONS} mock interviews are kept.`}
            action={
              <Button to="/interview/mock" icon={Timer}>
                Start a mock interview
              </Button>
            }
            secondaryAction={
              <Button variant="secondary" to="/interview">
                Back to Interview Prep
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const summary = summarizeMock(session);
  const limit = session.minutes * 60;
  const overTime = session.questions.filter((q) => q.seconds > limit).length;

  return (
    <div>
      <PageHeader
        eyebrow="Mock interview"
        title="Your answers, reviewed"
        description={`${session.role} · ${fmtDateTime(session.at)} · ${session.minutes} min per question`}
        actions={
          <>
            <Button variant="secondary" to="/interview">
              Interview Prep
            </Button>
            <Button to="/interview/mock" icon={RotateCcw}>
              Practise again
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Answered" value={`${summary.answered}/${summary.asked}`} hint="questions" />
        <Stat label="Key points" value={summary.pointsTotal ? `${summary.pointsCovered}/${summary.pointsTotal}` : '—'} hint="mentioned in your answers" />
        <Stat label="Time" value={formatDuration(summary.seconds)} hint={`${formatDuration(limit * summary.asked)} planned`} />
        <Stat label="Over time" value={overTime} hint={overTime === 1 ? 'question' : 'questions'} />
      </div>
      <Notice className="mt-4" icon={Info} title="How these checks work">
        They look for key terms, structure and length, so a point you made in other words can show as not mentioned. Treat them as prompts, not a grade.
        {aiEnabled && ' For a second opinion, ask for AI feedback on any answer.'}
      </Notice>
      <ol className="mt-4 space-y-4">
        {session.questions.map((q, i) => (
          <AnswerReview key={q.id} index={i} q={q} role={session.role} limit={limit} aiEnabled={aiEnabled} onSaveAi={(ai) => actions.saveMockFeedback(session.id, q.id, ai)} />
        ))}
      </ol>
    </div>
  );
};

const MockInterview = () => {
  const { sessionId } = useParams();
  return sessionId ? <SavedReview id={sessionId} /> : <NewMock />;
};

export default MockInterview;
