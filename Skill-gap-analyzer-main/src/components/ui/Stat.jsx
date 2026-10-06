import { cx } from '../../lib/cx';

/**
 * Stat tile: label, value, optional delta and supporting line.
 * `deltaGood` decides whether a positive delta is shown as good news.
 */
const Stat = ({ label, value, unit, delta, deltaLabel, deltaGood = true, hint, icon: Icon, className, children }) => {
  const positive = delta > 0;
  const deltaTone =
    delta == null || delta === 0 ? 'text-muted' : positive === deltaGood ? 'text-success-700' : 'text-danger-700';
  return (
    <div className={cx('card flex flex-col p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-light" aria-hidden />}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
        {value}
        {unit && <span className="ml-0.5 text-base font-medium text-muted">{unit}</span>}
      </p>
      {(delta != null || hint) && (
        <p className="mt-1 text-xs text-muted">
          {delta != null && (
            <span className={cx('font-medium', deltaTone)}>
              {positive ? '+' : ''}
              {delta}
              {deltaLabel}
            </span>
          )}
          {delta != null && hint && ' '}
          {hint}
        </p>
      )}
      {children}
    </div>
  );
};

export default Stat;
