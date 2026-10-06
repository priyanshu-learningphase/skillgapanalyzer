import { cx } from '../../lib/cx';

/** Compact segmented control for filters and view switches. */
const Segmented = ({ options, value, onChange, label, size = 'sm', className }) => (
  <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-lg border border-line bg-slate-50 p-0.5', className)}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(option.value)}
          className={cx(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
            active ? 'bg-white text-ink shadow-card ring-1 ring-line' : 'text-muted hover:text-ink',
          )}
        >
          {option.icon && <option.icon className="h-3.5 w-3.5" aria-hidden />}
          {option.label}
          {option.count != null && <span className="tabular text-muted-light">{option.count}</span>}
        </button>
      );
    })}
  </div>
);

export default Segmented;
