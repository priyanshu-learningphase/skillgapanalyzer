import { Link } from 'react-router-dom';
import { Check, X, Info, CheckCircle2, AlertTriangle, CircleDashed, Wand2, PenLine } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ScoreRing from '../ui/ScoreRing';
import { Highlighted } from './ResumePreview';
import { ATS_DISCLAIMER } from '../../lib/ats';
import { cx } from '../../lib/cx';

const STATUS = {
  good: { label: 'Good', tone: 'success', icon: CheckCircle2, color: 'text-success-600' },
  improve: { label: 'Needs work', tone: 'warning', icon: AlertTriangle, color: 'text-warning-600' },
  missing: { label: 'Missing', tone: 'danger', icon: CircleDashed, color: 'text-danger-600' },
};

const KeywordGroup = ({ title, rows }) => (
  <div>
    <p className="text-xs font-medium text-muted">
      {title} · {rows.filter((r) => r.found).length}/{rows.length} found
    </p>
    {rows.length ? (
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to={`/gap?skill=${r.id}`}
              className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium', r.found ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700')}
              title={r.found ? (r.evidence === 'listed' ? 'Only listed in skills' : `Shown in ${r.evidence}`) : 'Not found on your resume'}
            >
              {r.found ? <Check className="h-3 w-3" aria-label="Found" /> : <X className="h-3 w-3" aria-label="Missing" />}
              {r.name}
              {r.found && r.evidence === 'listed' && <span className="font-normal opacity-80">(listed only)</span>}
            </Link>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-1 text-sm text-muted">None in this job description.</p>
    )}
  </div>
);

const AtsReport = ({ report, suggestions, job, hasSummary, onApply, onDismiss, onInsertSummary, onOpenEditor }) => (
  <div className="space-y-4">
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <ScoreRing value={report.score} size={116} tone={report.score >= 75 ? 'success' : report.score >= 50 ? 'accent' : 'warning'} label={`Estimated ATS match ${report.score} out of 100`}>
          <span className="text-3xl font-semibold text-ink">{report.score}</span>
          <span className="text-2xs text-muted">est. / 100</span>
        </ScoreRing>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Estimated ATS match for</p>
          <h2 className="text-lg font-semibold text-ink">{job.title}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
            {[
              ['Keywords', report.parts.keywords, 50],
              ['Structure', report.parts.structure, 20],
              ['Impact', report.parts.impact, 15],
              ['Contact & format', report.parts.format, 15],
            ].map(([label, value, max]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="tabular font-semibold text-ink">
                  {value}
                  <span className="font-normal text-muted">/{max}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <p className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {ATS_DISCLAIMER}
      </p>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Keyword coverage" description={report.keywordCoverage == null ? 'No skill keywords detected in this job.' : `${report.keywordCoverage}% of the job’s skill keywords (required count double).`} />
        <CardBody className="space-y-4">
          <KeywordGroup title="Required" rows={report.required} />
          <KeywordGroup title="Preferred" rows={report.preferred} />
          {report.softSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted">Soft skills the job mentions</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {report.softSkills.map((s) => (
                  <li key={s.name} className={cx('rounded-md px-2 py-1 text-xs', s.found ? 'bg-slate-100 text-ink' : 'border border-dashed border-line text-muted')}>
                    {s.found ? '✓ ' : ''}
                    {s.name}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-2xs text-muted">Shown through your bullets (e.g. “led”, “collaborated”), not by listing the words.</p>
            </div>
          )}
          {report.missingRequired.length > 0 && (
            <p className="rounded-lg border border-warning-100 bg-warning-50/60 px-3 py-2 text-xs text-ink">
              Only add a missing keyword if you genuinely have that skill. Otherwise, close the gap first:{' '}
              <Link to="/assessments" className="font-medium underline">
                prove a skill
              </Link>{' '}
              or{' '}
              <Link to="/roadmap" className="font-medium underline">
                learn it
              </Link>
              .
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Relevant experience" description="Bullets that already show this job’s skills in practice." />
        <CardBody>
          {report.relevant.length ? (
            <ul className="space-y-2.5">
              {report.relevant.map((r, i) => (
                <li key={i} className="text-sm">
                  <p className="text-ink">{r.text}</p>
                  <p className="text-xs text-muted">
                    {r.section}
                    {r.entry ? ` · ${r.entry}` : ''} · {r.skills.join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">None of your bullets mention this job’s skills yet.</p>
          )}
          {report.experience.requiredYears != null && (
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
              Job asks for {report.experience.requiredYears}+ years. Your listed roles span about {report.experience.months} month{report.experience.months === 1 ? '' : 's'} (estimated from the dates on your resume).
            </p>
          )}
        </CardBody>
      </Card>
    </div>

    <Card>
      <CardHeader title="Section feedback" />
      <CardBody>
        <ul className="grid gap-3 md:grid-cols-2">
          {report.sections.map((s) => {
            const meta = STATUS[s.status];
            return (
              <li key={s.key} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    <meta.icon className={cx('h-4 w-4', meta.color)} aria-hidden /> {s.title}
                  </p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                {s.issues.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    {s.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">Looks good.</p>
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>

    <Card>
      <CardHeader
        title="Suggested wording"
        icon={Wand2}
        description="Rewordings of your own bullets. Keep a suggestion only if it’s accurate, and replace every highlighted [placeholder] with a real detail."
        action={
          <Button size="sm" variant="secondary" icon={PenLine} onClick={onOpenEditor}>
            Open editor
          </Button>
        }
      />
      <CardBody>
        {!hasSummary && (
          <div className="mb-4 rounded-lg border border-dashed border-line p-3">
            <p className="text-sm font-medium text-ink">No summary yet</p>
            <p className="mt-0.5 text-sm text-muted">Insert a template built only from skills already on your resume, then fill in the bracketed parts.</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={onInsertSummary}>
              Insert summary template
            </Button>
          </div>
        )}
        {suggestions.length ? (
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li key={s.id} className="rounded-lg border border-line p-3">
                <p className="text-xs text-muted">
                  {s.section}
                  {s.entry ? ` · ${s.entry}` : ''}
                </p>
                <p className="mt-1 text-sm text-muted">
                  <span className="mr-1 text-2xs font-semibold uppercase tracking-wide text-muted-light">You wrote</span>
                  {s.original}
                </p>
                {s.changed && (
                  <p className="mt-1 text-sm text-ink">
                    <span className="mr-1 text-2xs font-semibold uppercase tracking-wide text-accent-700">Suggested</span>
                    <Highlighted text={s.suggested} />
                  </p>
                )}
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
                  {s.reasons.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.changed && (
                    <Button size="xs" onClick={() => onApply(s)}>
                      {s.needsInput ? 'Use & fill in placeholder' : 'Use suggestion'}
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" onClick={() => onDismiss(s.id)}>
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No wording suggestions: your bullets start with action verbs and include results.</p>
        )}
      </CardBody>
    </Card>
  </div>
);

export default AtsReport;
