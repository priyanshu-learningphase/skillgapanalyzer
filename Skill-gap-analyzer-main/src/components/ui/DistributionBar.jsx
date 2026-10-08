import { cx } from '../../lib/cx';

/**
 * Proportional stacked bar with a legend (identity never relies on colour
 * alone — every segment is labelled with its count in the legend).
 */
const DistributionBar = ({ segments, className }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className={cx('h-full first:rounded-l-full last:rounded-r-full', s.color)} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5 text-muted">
            <span className={cx('h-2 w-2 rounded-full', s.color)} aria-hidden />
            {s.label}
            <span className="tabular font-medium text-ink">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DistributionBar;
