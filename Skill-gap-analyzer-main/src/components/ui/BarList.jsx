import { cx } from '../../lib/cx';

/**
 * Ranked horizontal bars: label, thin single-colour bar, value and an
 * optional detail line. Values are always printed, so nothing relies on
 * bar length or colour alone.
 */
const BarList = ({ rows, max, ariaLabel, className }) => {
  const scale = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className={cx('space-y-3', className)} aria-label={ariaLabel}>
      {rows.map((row) => (
        <li key={row.key || row.label} className="grid grid-cols-[minmax(0,9rem)_minmax(4rem,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,11rem)_minmax(5rem,1fr)_auto]" title={row.title}>
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{row.label}</p>
            {row.detail && <p className="truncate text-xs text-muted">{row.detail}</p>}
          </div>
          <div className="h-2 rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out animate-grow" style={{ width: `${Math.min(100, (row.value / scale) * 100)}%` }} />
          </div>
          <span className="tabular min-w-[2.5rem] text-right text-sm font-medium text-ink">{row.valueLabel ?? row.value}</span>
        </li>
      ))}
    </ol>
  );
};

export default BarList;
