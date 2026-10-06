import { cx } from '../../lib/cx';
import { PRIORITY_META } from '../../lib/analysis';

const TEXT = {
  critical: 'text-danger-700',
  high: 'text-orange-700',
  medium: 'text-warning-700',
  low: 'text-muted',
};

const BAR = {
  high: 'bg-orange-500',
  medium: 'bg-warning',
  low: 'bg-slate-400',
};

/**
 * Priority signal: a filled square with "!" for critical, otherwise 1–3
 * ascending bars. Always paired with a text label so it never relies on color.
 */
export const PriorityIcon = ({ priority, className }) => {
  if (priority === 'critical') {
    return (
      <span className={cx('inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-danger text-[10px] font-bold leading-none text-white', className)} aria-hidden>
        !
      </span>
    );
  }
  const filled = { high: 3, medium: 2, low: 1 }[priority] || 0;
  return (
    <span className={cx('inline-flex h-3.5 items-end gap-[2px]', className)} aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cx('w-[3px] rounded-[1px]', i <= filled ? BAR[priority] : 'bg-slate-200')} style={{ height: `${4 + i * 3}px` }} />
      ))}
    </span>
  );
};

const PriorityBadge = ({ priority, showLabel = true, className }) => {
  if (!priority) return <span className="text-xs text-muted">—</span>;
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', TEXT[priority], className)}>
      <PriorityIcon priority={priority} />
      {showLabel && PRIORITY_META[priority].label}
    </span>
  );
};

export default PriorityBadge;
