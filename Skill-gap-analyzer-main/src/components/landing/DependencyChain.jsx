import { Check, ChevronDown, FastForward } from 'lucide-react';
import { cx } from '../../lib/cx';

const CHAIN = [
  { name: 'JavaScript', status: 'known', note: 'You have this — skipped' },
  { name: 'Node.js', status: 'partial', note: 'Basics known — 3 topics skipped' },
  { name: 'Express', status: 'learn', note: 'Week 1–2' },
  { name: 'REST APIs', status: 'learn', note: 'Week 2–3' },
  { name: 'Authentication', status: 'learn', note: 'Week 4' },
  { name: 'Databases (SQL)', status: 'learn', note: 'Week 5–6' },
  { name: 'System Design', status: 'learn', note: 'Week 7–9' },
];

/** Illustrates how the planner orders skills by prerequisite. */
const DependencyChain = () => (
  <ol className="card p-5" aria-label="Example dependency chain">
    {CHAIN.map((step, index) => (
      <li key={step.name}>
        <div className="flex items-center gap-3">
          <span
            className={cx(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
              step.status === 'known' && 'border-success-100 bg-success-50 text-success-700',
              step.status === 'partial' && 'border-accent-100 bg-accent-50 text-accent-700',
              step.status === 'learn' && 'border-line bg-white text-muted',
            )}
            aria-hidden
          >
            {step.status === 'known' ? <Check className="h-3.5 w-3.5" /> : step.status === 'partial' ? <FastForward className="h-3 w-3" /> : index - 1}
          </span>
          <span className={cx('flex-1 text-sm font-medium', step.status === 'known' ? 'text-muted line-through decoration-slate-300' : 'text-ink')}>
            {step.name}
          </span>
          <span className="text-xs text-muted">{step.note}</span>
        </div>
        {index < CHAIN.length - 1 && (
          <div className="flex h-5 w-7 items-center justify-center" aria-hidden>
            <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
          </div>
        )}
      </li>
    ))}
  </ol>
);

export default DependencyChain;
