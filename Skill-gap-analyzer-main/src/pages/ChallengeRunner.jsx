/**
 * Run and submit one practical challenge.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Send, Lightbulb, CheckCircle2, XCircle, ShieldCheck, Lock, EyeOff, Database, Info } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Segmented from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/States';
import CodeEditor from '../components/lab/CodeEditor';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../context/ToastContext';
import { CHALLENGE_MAP, DIFFICULTY_META, KIND_META } from '../data/challenges/index';
import { getSkill } from '../data/skills';
import { gradeCode, gradeHtml, gradeSql, gradeStructured, isPass } from '../lib/labGrading';
import { runJsInSandbox } from '../lib/jsSandbox';
import { runSql } from '../lib/sqlRunner';
import { getExecutionStatus, runPythonTests } from '../services/executionService';
import { cx } from '../lib/cx';

const DIFF_TONE = { easy: 'success', medium: 'warning', hard: 'danger' };
const show = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));

const ResultTable = ({ result }) =>
  result?.ok ? (
    <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-line">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 text-muted">
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} scope="col" className="px-2 py-1.5 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line font-mono">
          {result.rows.slice(0, 20).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1 text-ink">
                  {cell === null ? <span className="text-muted">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!result.rows.length && <p className="px-2 py-2 text-xs text-muted">No rows.</p>}
    </div>
  ) : null;

const Runner = ({ challengeId }) => {
  const challenge = CHALLENGE_MAP[challengeId];
  const { actions, progress } = useWorkspace();
  const toast = useToast();

  const languages = challenge?.kind === 'code' ? Object.keys(challenge.languages) : [];
  const [python, setPython] = useState(false);
  const [language, setLanguage] = useState(languages.includes('javascript') ? 'javascript' : languages[0]);
  const [code, setCode] = useState(() => Object.fromEntries(languages.map((l) => [l, challenge.languages[l].starter])));
  const [sql, setSql] = useState(challenge?.starter || '');
  const [html, setHtml] = useState(challenge?.starter || '');
  const [answers, setAnswers] = useState(() => (challenge?.steps || []).map((s) => (s.type === 'choice' ? null : '')));
  const [hints, setHints] = useState(0);
  const [busy, setBusy] = useState(null);
  const [outcome, setOutcome] = useState(null); // { mode, grade, logs, error, sqlResult, entry, passed }

  useEffect(() => {
    let alive = true;
    getExecutionStatus().then((s) => alive && setPython(s.languages.includes('python')));
    return () => {
      alive = false;
    };
  }, []);

  const history = useMemo(() => (progress.verifications || []).filter((v) => v.challengeId === challengeId), [progress.verifications, challengeId]);

  if (!challenge) {
    return (
      <Card>
        <EmptyState title="Challenge not found" action={<Button to="/assessments/lab" icon={ArrowLeft}>Back to the lab</Button>} />
      </Card>
    );
  }

  const unavailable = challenge.kind === 'code' && language === 'python' && !python;

  const evaluate = async (mode) => {
    const onlyVisible = mode === 'run';
    if (challenge.kind === 'code') {
      const run = language === 'python' ? await runPythonTests(challenge, code.python) : await runJsInSandbox({ code: code.javascript, functionName: challenge.languages.javascript.functionName, tests: challenge.tests });
      if (!run.ok) return { error: run.error, timedOut: run.timedOut };
      return { grade: gradeCode(challenge, run.results, { onlyVisible }), logs: run.logs };
    }
    if (challenge.kind === 'sql') {
      const datasets = onlyVisible ? challenge.datasets.slice(0, 1) : challenge.datasets;
      const run = await runSql({ datasets, queries: [sql, challenge.solution] });
      if (!run.ok) return { error: run.error, timedOut: run.timedOut };
      const runs = run.results.map(([user, expected]) => ({ user, expected }));
      return { grade: gradeSql(challenge, runs, { onlyVisible }), sqlResult: runs[0].user };
    }
    if (challenge.kind === 'html') {
      // DOMParser never executes scripts in the parsed document.
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return { grade: gradeHtml(challenge, doc) };
    }
    return { grade: gradeStructured(challenge, answers) };
  };

  const go = async (mode) => {
    setBusy(mode);
    try {
      const result = await evaluate(mode);
      if (mode === 'submit' && result.grade) {
        const passed = isPass(challenge, result.grade);
        const entry = await actions.submitVerification({ challenge, grade: result.grade, passed, language: challenge.kind === 'code' ? language : null, hintsUsed: hints });
        setOutcome({ mode, ...result, passed, entry });
        if (passed) toast.success(`Passed “${challenge.title}”`, { description: entry.after > entry.before ? `${getSkill(challenge.skillId)?.name}: ${entry.before}% → ${entry.after}%` : 'Recorded as practical evidence.' });
      } else {
        setOutcome({ mode, ...result });
      }
    } catch (err) {
      console.error(err);
      setOutcome({ mode, error: err.message || 'Something went wrong while running your solution.' });
    } finally {
      setBusy(null);
    }
  };

  const skill = getSkill(challenge.skillId);
  const grade = outcome?.grade;

  return (
    <div>
      <Link to="/assessments/lab" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Practical lab
      </Link>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="self-start">
          <CardBody className="space-y-4 py-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={DIFF_TONE[challenge.difficulty]}>{DIFFICULTY_META[challenge.difficulty].label}</Badge>
                <span className="text-xs text-muted">
                  {skill?.name} · {KIND_META[challenge.kind].label}
                </span>
              </div>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">{challenge.title}</h1>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{challenge.prompt}</p>

            {challenge.examples?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Examples</p>
                <ul className="mt-1.5 space-y-1.5">
                  {challenge.examples.map((ex, i) => (
                    <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-ink">
                      <span className="text-muted">in:</span> {ex.input}
                      <br />
                      <span className="text-muted">out:</span> {ex.output}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {challenge.tables && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Database className="h-3.5 w-3.5" aria-hidden /> Tables
                </p>
                <ul className="mt-1.5 space-y-1 font-mono text-xs">
                  {challenge.tables.map((t) => (
                    <li key={t.name}>
                      <span className="font-semibold text-ink">{t.name}</span> <span className="text-muted">({t.columns})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-2xs text-muted">Run explores the visible data. Submit also checks a hidden dataset with different rows.</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Hints</p>
                {hints < challenge.hints.length && (
                  <Button size="xs" variant="ghost" icon={Lightbulb} onClick={() => setHints((h) => h + 1)}>
                    Show hint {hints + 1} of {challenge.hints.length}
                  </Button>
                )}
              </div>
              {hints > 0 ? (
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                  {challenge.hints.slice(0, hints).map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-xs text-muted">Hints are recorded with your attempt.</p>
              )}
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {KIND_META[challenge.kind].grading}.
              {challenge.kind === 'code' && language === 'javascript' && ' No network or account access; stopped after 4 seconds.'}
            </p>
            {history.length > 0 && (
              <p className="text-xs text-muted">
                Your attempts: {history.length} · best {Math.max(...history.map((h) => h.pct))}%{history.some((h) => h.passed) ? ' · passed' : ''}
              </p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-3 py-4">
              {challenge.kind === 'code' && (
                <>
                  {languages.length > 1 && (
                    <Segmented
                      label="Language"
                      value={language}
                      onChange={(l) => {
                        setLanguage(l);
                        setOutcome(null);
                      }}
                      options={languages.map((l) => ({ value: l, label: l === 'javascript' ? 'JavaScript' : python ? 'Python' : 'Python (unavailable)' }))}
                    />
                  )}
                  {unavailable ? (
                    <div className="rounded-lg border border-dashed border-line p-4 text-sm">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <Lock className="h-4 w-4 text-muted" aria-hidden /> Python grading isn’t available
                      </p>
                      <p className="mt-1 text-muted">Python code can’t run safely in the browser, and no code-execution service is configured on this server{languages.includes('javascript') ? '. You can solve this one in JavaScript instead.' : ', so this challenge can’t be graded yet.'}</p>
                    </div>
                  ) : (
                    <CodeEditor id="lab-code" label={`${language === 'python' ? 'Python' : 'JavaScript'} solution`} value={code[language]} onChange={(v) => setCode((c) => ({ ...c, [language]: v }))} language={language} />
                  )}
                </>
              )}
              {challenge.kind === 'sql' && <CodeEditor id="lab-sql" label="SQL query" value={sql} onChange={setSql} rows={10} language="sql" />}
              {challenge.kind === 'html' && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <CodeEditor id="lab-html" label="HTML" value={html} onChange={setHtml} rows={14} language="html" />
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted">Preview (scripts disabled)</p>
                    <iframe title="Your HTML preview" sandbox="" srcDoc={html} className="h-[19rem] w-full rounded-lg border border-line bg-white" />
                  </div>
                </div>
              )}
              {challenge.kind === 'structured' && (
                <ol className="space-y-4">
                  {challenge.steps.map((step, i) => {
                    const row = outcome?.mode === 'submit' ? grade?.rows[i] : null;
                    return (
                      <li key={i}>
                        <p className="flex items-start gap-2 text-sm text-ink">
                          <span className="tabular font-semibold text-muted">{i + 1}.</span>
                          <span className="flex-1">{step.prompt}</span>
                          {row && (row.passed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" aria-label="Correct" /> : <XCircle className="h-4 w-4 shrink-0 text-danger-600" aria-label="Incorrect" />)}
                        </p>
                        {step.type === 'command' ? (
                          <>
                            <label htmlFor={`step-${i}`} className="sr-only">
                              Answer for step {i + 1}
                            </label>
                            <input
                              id={`step-${i}`}
                              value={answers[i]}
                              onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                              placeholder={step.placeholder}
                              spellCheck={false}
                              autoCapitalize="off"
                              className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[13px] text-slate-100 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                          </>
                        ) : (
                          <fieldset className="mt-1.5 space-y-1.5">
                            <legend className="sr-only">Options for step {i + 1}</legend>
                            {step.options.map((opt, oi) => (
                              <label key={oi} className={cx('flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm', answers[i] === oi ? 'border-accent bg-accent-50/50' : 'border-line hover:border-slate-300')}>
                                <input type="radio" name={`step-${i}`} checked={answers[i] === oi} onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? oi : x)))} className="mt-0.5" />
                                <span className="text-ink">{opt}</span>
                              </label>
                            ))}
                          </fieldset>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                {challenge.kind !== 'structured' && (
                  <Button variant="secondary" icon={Play} onClick={() => go('run')} loading={busy === 'run'} disabled={Boolean(busy) || unavailable}>
                    {challenge.kind === 'html' ? 'Check' : 'Run'}
                  </Button>
                )}
                <Button icon={Send} onClick={() => go('submit')} loading={busy === 'submit'} disabled={Boolean(busy) || unavailable}>
                  Submit
                </Button>
              </div>
            </CardBody>
          </Card>

          {outcome && (
            <Card aria-live="polite">
              <CardHeader
                title={outcome.error ? 'Couldn’t run your solution' : outcome.mode === 'submit' ? (outcome.passed ? 'Passed' : 'Not passed yet') : `${grade.passed}/${grade.total} ${challenge.kind === 'html' ? 'checks' : 'visible tests'} passing`}
                description={
                  outcome.error
                    ? null
                    : outcome.mode === 'submit'
                      ? `${grade.passed} of ${grade.total} ${challenge.kind === 'sql' ? 'datasets' : challenge.kind === 'structured' ? 'steps' : challenge.kind === 'html' ? 'checks' : 'tests'} passed${outcome.entry?.after > outcome.entry?.before ? ` · ${skill?.name} ${outcome.entry.before}% → ${outcome.entry.after}%` : ''}`
                      : 'Run checks the visible examples. Submit runs every test, including hidden ones.'
                }
              />
              <CardBody className="space-y-3">
                {outcome.error && <pre className="whitespace-pre-wrap rounded-lg bg-danger-50 px-3 py-2 font-mono text-xs text-danger-700">{outcome.error}</pre>}
                {grade && challenge.kind === 'code' && (
                  <ul className="space-y-1.5">
                    {grade.rows.map((r) => (
                      <li key={r.index} className={cx('rounded-lg border px-3 py-2 text-xs', r.passed ? 'border-success-100 bg-success-50/40' : 'border-danger-100 bg-danger-50/40')}>
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          {r.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-success-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-danger-600" aria-hidden />}
                          Test {r.index + 1}
                          {r.hidden && (
                            <span className="inline-flex items-center gap-1 font-normal text-muted">
                              <EyeOff className="h-3 w-3" aria-hidden /> hidden
                            </span>
                          )}
                        </p>
                        {!r.hidden && (
                          <p className="mt-1 break-all font-mono text-muted">
                            {r.args.map(show).join(', ')} → expected {show(r.expected)}
                            {!r.passed && (r.error ? `, error: ${r.error}` : `, got ${show(r.actual)}`)}
                          </p>
                        )}
                        {r.hidden && !r.passed && r.error && <p className="mt-1 font-mono text-muted">Error: {r.error}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {grade && challenge.kind === 'sql' && (
                  <>
                    <ul className="space-y-1 text-xs">
                      {grade.rows.map((r) => (
                        <li key={r.index} className="flex items-start gap-1.5">
                          {r.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-success-600" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-danger-600" aria-hidden />}
                          <span className="text-ink">{r.hidden ? 'Hidden dataset' : 'Visible dataset'}</span>
                          {!r.passed && <span className="text-muted">— {r.reason}</span>}
                        </li>
                      ))}
                    </ul>
                    {outcome.sqlResult && (
                      <div>
                        <p className="text-xs font-medium text-muted">Your result (visible data)</p>
                        {outcome.sqlResult.ok ? <ResultTable result={outcome.sqlResult} /> : <p className="mt-1 font-mono text-xs text-danger-700">{outcome.sqlResult.error}</p>}
                      </div>
                    )}
                  </>
                )}
                {grade && challenge.kind === 'html' && (
                  <ul className="space-y-1 text-sm">
                    {grade.rows.map((r) => (
                      <li key={r.id} className="flex items-center gap-2">
                        {r.passed ? <CheckCircle2 className="h-4 w-4 text-success-600" aria-label="Pass" /> : <XCircle className="h-4 w-4 text-danger-600" aria-label="Fail" />}
                        <span className="text-ink">{r.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {outcome.logs?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted">Console output</p>
                    <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">{outcome.logs.join('\n')}</pre>
                  </div>
                )}
                {outcome.mode === 'submit' && !outcome.error && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <Info className="h-3.5 w-3.5" aria-hidden /> Explanation
                    </p>
                    <p className="mt-1 text-ink-soft">{challenge.explanation}</p>
                  </div>
                )}
                {outcome.mode === 'submit' && outcome.passed && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" to="/assessments/lab">
                      Back to the lab
                    </Button>
                    <Button size="sm" variant="secondary" to={`/gap?skill=${challenge.skillId}`}>
                      See {skill?.name} evidence
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

/** Remount per challenge so editor state never carries over. */
const ChallengeRunner = () => {
  const { challengeId } = useParams();
  return <Runner key={challengeId} challengeId={challengeId} />;
};

export default ChallengeRunner;
