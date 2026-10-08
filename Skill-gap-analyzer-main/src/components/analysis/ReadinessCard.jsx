import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import Sparkline from '../ui/Sparkline';
import { cx } from '../../lib/cx';

export const readinessBand = (score) => {
  if (score >= 80) return { label: 'Job-ready', dot: 'bg-success', tone: 'success' };
  if (score >= 60) return { label: 'Getting close', dot: 'bg-accent', tone: 'accent' };
  if (score >= 35) return { label: 'Building momentum', dot: 'bg-warning', tone: 'warning' };
  return { label: 'Laying foundations', dot: 'bg-slate-400', tone: 'muted' };
};

/** Hero figure for the analysis: readiness score, change and trend. */
const ReadinessCard = ({ analysis, delta, history = [], roleName }) => {
  const band = readinessBand(analysis.readiness);
  const values = history.map((h) => h.readiness_score);
  const labels = history.map((h) => (h.createdAt ? new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''));

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Career Readiness</p>
          <p className="mt-0.5 text-xs text-muted-light">{roleName}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink">
          <span className={cx('h-1.5 w-1.5 rounded-full', band.dot)} aria-hidden />
          {band.label}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="text-6xl font-semibold leading-none tracking-tight text-ink">
          {analysis.readiness}
          <span className="ml-1 text-2xl font-medium text-muted-light">/ 100</span>
        </p>
        {values.length >= 2 && <Sparkline values={values} labels={labels} format={(v) => `${v}/100`} width={112} height={36} />}
      </div>

      <p className="mt-3 text-sm text-muted">
        {delta == null ? (
          'Your first analysis for this role.'
        ) : delta === 0 ? (
          'No change since your last analysis.'
        ) : (
          <>
            <span className={cx('font-medium', delta > 0 ? 'text-success-700' : 'text-danger-700')}>
              {delta > 0 ? '+' : ''}
              {delta}
            </span>{' '}
            since your last analysis
          </>
        )}
      </p>

      <ProgressBar value={analysis.readiness} className="mt-5" tone={band.tone === 'muted' ? 'ink' : band.tone} label="Career readiness" />

      <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
        <div>
          <dt className="text-xs text-muted">Strengths</dt>
          <dd className="mt-0.5 text-lg font-semibold text-ink">{analysis.strengths.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Skill gaps</dt>
          <dd className="mt-0.5 text-lg font-semibold text-ink">{analysis.gaps.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Critical</dt>
          <dd className="mt-0.5 text-lg font-semibold text-ink">{analysis.counts.critical}</dd>
        </div>
      </dl>
    </Card>
  );
};

export default ReadinessCard;
