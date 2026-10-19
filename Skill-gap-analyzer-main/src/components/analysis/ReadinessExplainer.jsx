import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, Calculator } from 'lucide-react';
import { Modal } from '../ui/Overlay';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import EvidenceBadge from '../skills/EvidenceBadge';
import { useWorkspace } from '../../context/WorkspaceContext';
import { explainReadiness, READINESS_DISCLAIMER } from '../../lib/readiness';
import { evidenceFor } from '../../lib/evidence';
import { cx } from '../../lib/cx';

const STANDING = {
  strong: { label: 'Matched', className: 'text-success-700' },
  improve: { label: 'Partial', className: 'text-warning-700' },
  missing: { label: 'Missing', className: 'text-danger-700' },
};

/** Modal body: how the readiness score is calculated, requirement by requirement. */
export const ReadinessBreakdown = ({ analysis, role, evidence }) => {
  const ex = explainReadiness(analysis, role);
  if (!ex) return null;
  return (
    <div className="space-y-5 text-sm">
      <section>
        <p className="text-ink">
          Your score is <span className="font-semibold">{ex.score}/100</span>. Each requirement is weighted by importance (
          {ex.weights.map((w, i) => (
            <span key={w.id}>
              {i > 0 && ', '}
              {w.label} ×{w.weight}
            </span>
          ))}
          ). You earn its points in proportion to how close your level is to the target, capped at 100%.
        </p>
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-ink-soft">score = Σ(weight × min(1, your level ÷ target)) ÷ Σ(weight) × 100</p>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Matched', ex.matched.length, 'At least 90% of the target', 'text-success-700'],
          ['Partial', ex.partial.length, 'Some experience, below target', 'text-warning-700'],
          ['Missing', ex.missing.length, 'Below 15%, or not on your profile', 'text-danger-700'],
        ].map(([label, n, hint, color]) => (
          <div key={label} className="rounded-lg border border-line p-2.5">
            <p className={cx('tabular text-xl font-semibold', color)}>{n}</p>
            <p className="text-xs font-medium text-ink">{label}</p>
            <p className="text-2xs text-muted">{hint}</p>
          </div>
        ))}
      </section>

      {ex.criticalMissing.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Critical gaps</h3>
          <p className="mt-1 text-ink">
            {ex.criticalMissing.map((r, i) => (
              <span key={r.key}>
                {i > 0 && ', '}
                <Link to={`/gap?skill=${r.skillId}`} className="font-medium underline-offset-2 hover:underline">
                  {r.skillName}
                </Link>{' '}
                <span className="text-muted">(+{r.pointsAvailable} pts)</span>
              </span>
            ))}
          </p>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Requirement by requirement</h3>
        <div className="mt-2 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Requirement</th>
                <th scope="col" className="px-2 py-2 text-left font-medium">Weight</th>
                <th scope="col" className="px-2 py-2 text-left font-medium">You / target</th>
                <th scope="col" className="hidden px-2 py-2 text-left font-medium sm:table-cell">Evidence</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ex.rows.map((r) => (
                <tr key={r.key} className="align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium text-ink">{r.label}</p>
                    <p className={cx('text-2xs', STANDING[r.standing].className)}>
                      {STANDING[r.standing].label}
                      {r.inferred && <span className="text-muted"> · inferred from {r.inferredFrom}</span>}
                      {(r.companyAdjusted || r.companyAdded) && <span className="text-muted"> · {r.companyAdded ? `added for ${r.companyAdded}` : 'company-adjusted'}</span>}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-ink">
                    {r.importanceLabel} ×{r.weight}
                  </td>
                  <td className="tabular px-2 py-2">
                    <span className="text-ink">
                      {r.current}% / {r.required}%
                    </span>
                    <ProgressBar value={r.current} max={100} marker={r.required} size="xs" className="mt-1 w-20" label={`${r.skillName}: ${r.current} of ${r.required}`} />
                  </td>
                  <td className="hidden px-2 py-2 sm:table-cell">
                    <EvidenceBadge level={evidenceFor(evidence, r.skillId).level} short />
                  </td>
                  <td className="tabular px-3 py-2 text-right text-ink">
                    {r.pointsEarned}
                    <span className="text-muted">/{r.pointsMax}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-line p-3 text-xs text-muted">
        <p className="font-medium text-ink">
          Role profile: {ex.profile.roleName}
          {ex.profile.company && ` · ${ex.profile.company}`}
        </p>
        <p className="mt-0.5">
          {ex.profile.requirements} requirements
          {ex.profile.companyAdjusted > 0 && ` · ${ex.profile.companyAdjusted} adjusted for ${ex.profile.company} (typical emphasis, not official criteria)`}
          {ex.profile.version && ` · version ${ex.profile.version}, last reviewed ${new Date(ex.profile.reviewedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </p>
        <p className="mt-1">{ex.profile.basis}</p>
      </section>

      <p className="flex items-start gap-2 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {READINESS_DISCLAIMER}
      </p>
    </div>
  );
};

/** "How is this calculated?" link that opens the breakdown. */
const ReadinessExplainer = ({ className, label = 'How is this calculated?' }) => {
  const { analysis, role, evidence } = useWorkspace();
  const [open, setOpen] = useState(false);
  if (!analysis) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cx('inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink', className)}>
        <Calculator className="h-3.5 w-3.5" aria-hidden /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} size="lg" title="How your readiness score works" description={`${analysis.roleName}${analysis.company ? ` · ${analysis.company.name}` : ''}`}>
        <ReadinessBreakdown analysis={analysis} role={role} evidence={evidence} />
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default ReadinessExplainer;
