import { useState } from 'react';
import PriorityBadge, { PriorityIcon } from '../ui/PriorityBadge';
import { cx } from '../../lib/cx';

/**
 * Current level vs required level for each gap. One bar per skill: the fill
 * is the current level, the dark tick is what the role expects. Hover a row
 * for exact numbers.
 */
const GapChart = ({ items, limit = 8, onSelect }) => {
  const [hover, setHover] = useState(null);
  const rows = items.slice(0, limit);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-accent" /> Your level
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 rounded-full bg-ink" /> Role target
        </span>
      </div>
      <ul className="space-y-1">
        {rows.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect?.(item)}
              onMouseEnter={() => setHover(item.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(item.key)}
              onBlur={() => setHover(null)}
              className="group relative grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50 sm:grid-cols-[minmax(0,11rem)_1fr_5.5rem]"
              aria-label={`${item.skillName}: ${item.current}% of ${item.required}% required, ${item.priority} priority`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <PriorityIcon priority={item.priority} />
                <span className="truncate text-[13px] font-medium text-ink">{item.skillName}</span>
              </span>
              <span className="relative h-2 rounded-full bg-accent-50">
                <span className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-700" style={{ width: `${item.current}%` }} />
                <span className="absolute -bottom-1 -top-1 w-0.5 rounded-full bg-ink" style={{ left: `calc(${item.required}% - 1px)` }} />
              </span>
              <span className="tabular text-right text-xs text-muted">
                <span className="font-medium text-ink">{item.current}</span> / {item.required}
              </span>
              {hover === item.key && (
                <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-pop">
                  {item.current}% now · {item.required}% target · gap {item.gap}%
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {items.length > limit && <p className={cx('mt-2 px-2 text-xs text-muted')}>+{items.length - limit} more in the table below</p>}
    </div>
  );
};

export const StrengthsList = ({ items, transferable = [] }) => (
  <div>
    {items.length === 0 ? (
      <p className="text-sm text-muted">No strengths yet for this role — your roadmap will build them.</p>
    ) : (
      <ul className="space-y-2.5">
        {items.slice(0, 8).map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-100 text-[10px] font-bold text-success-700" aria-hidden>
                ✓
              </span>
              <span className="truncate font-medium text-ink">{item.skillName}</span>
              {item.inferred && <span className="text-[11px] text-muted-light">inferred</span>}
            </span>
            <span className="tabular text-xs text-muted">{item.current}%</span>
          </li>
        ))}
      </ul>
    )}
    {transferable.length > 0 && (
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs text-muted">Also in your toolkit</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {transferable.slice(0, 10).map((s) => (
            <span key={s.id} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              {s.name}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
);

export const GapList = ({ items }) => (
  <ul className="space-y-2.5">
    {items.slice(0, 6).map((item) => (
      <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-ink">{item.skillName}</span>
        <PriorityBadge priority={item.priority} />
      </li>
    ))}
  </ul>
);

export default GapChart;
