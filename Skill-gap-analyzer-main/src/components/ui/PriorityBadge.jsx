import { cx } from '../../lib/cx';
import { PRIORITY_META, STANDING_META } from '../../lib/analysis';

const TEXT = {
  critical: 'text-danger-700',
  important: 'text-warning-700',
  optional: 'text-muted',
};

const BAR = {
  important: 'bg-warning',
  optional: 'bg-slate-400',
};

/**
 * Priority signal: a filled square with "!" for Critical, otherwise ascending
 * bars. Always paired with a text label so it never relies on colour alone.
 */
export const PriorityIcon = ({ priority, className }) => {
  if (priority === 'critical') {
    return (
      <span className={cx('inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-danger text-[10px] font-bold leading-none text-white', className)} aria-hidden>
        !
      </span>
    );
  }
  const filled = { important: 2, optional: 1 }[priority] || 0;
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
    <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', TEXT[priority], className)} title={PRIORITY_META[priority].description}>
      <PriorityIcon priority={priority} />
      {showLabel && PRIORITY_META[priority].label}
    </span>
  );
};

export const STANDING_DOT = { strong: 'bg-success', improve: 'bg-warning', missing: 'bg-slate-300' };

export const StandingBadge = ({ standing, className }) => {
  if (!standing) return null;
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium text-ink', className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', STANDING_DOT[standing])} aria-hidden />
      {STANDING_META[standing].label}
    </span>
  );
};

export default PriorityBadge;
