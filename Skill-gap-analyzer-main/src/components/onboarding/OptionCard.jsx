import { Check } from 'lucide-react';
import { cx } from '../../lib/cx';

/** Radio-style selectable card used throughout onboarding and settings. */
const OptionCard = ({ selected, onSelect, title, description, icon: Icon, meta, className, compact = false }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onSelect}
    className={cx(
      'group relative flex w-full items-start gap-3 rounded-card border bg-white text-left transition-[border-color,box-shadow] duration-150',
      compact ? 'p-3' : 'p-4',
      selected ? 'border-ink shadow-raised ring-1 ring-ink' : 'border-line shadow-card hover:border-slate-300',
      className,
    )}
  >
    {Icon && (
      <span
        className={cx(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
          selected ? 'border-ink bg-ink text-white' : 'border-line bg-slate-50 text-muted group-hover:text-ink',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-ink">{title}</span>
      {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      {meta && <span className="mt-2 block">{meta}</span>}
    </span>
    <span
      className={cx(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
        selected ? 'border-ink bg-ink' : 'border-slate-300',
      )}
      aria-hidden
    >
      {selected && <Check className="h-2.5 w-2.5 text-white" />}
    </span>
  </button>
);

export default OptionCard;
