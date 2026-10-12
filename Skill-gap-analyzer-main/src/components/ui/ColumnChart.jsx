import { useState } from 'react';
import { cx } from '../../lib/cx';

/**
 * Single-series column chart for a handful of ordered categories (e.g.
 * students per readiness band). One colour for every bar, value labels on
 * top, a hover/focus tooltip, and a screen-reader table with the same data.
 */
const ColumnChart = ({ bars, height = 160, ariaLabel, formatValue = (v) => v, tooltip }) => {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <figure aria-label={ariaLabel}>
      <div className="relative flex items-end gap-2 border-b border-line" style={{ height }} aria-hidden>
        {bars.map((bar, i) => {
          const pct = (bar.value / max) * 100;
          return (
            <div
              key={bar.id || bar.label}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {active === i && tooltip && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 w-max max-w-[12rem] rounded-md bg-ink px-2 py-1 text-center text-xs text-white shadow-pop">
                  {tooltip(bar)}
                </div>
              )}
              <span className="tabular mb-1 text-xs font-medium text-ink">{formatValue(bar.value)}</span>
              <div
                className={cx('w-full max-w-[3.5rem] rounded-t transition-[height] duration-700 ease-out', bar.value ? 'bg-accent' : 'bg-transparent', active === i && 'bg-accent-600')}
                style={{ height: `calc(${pct}% - 1.25rem)`, minHeight: bar.value ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        {bars.map((bar) => (
          <div key={bar.id || bar.label} className="min-w-0 flex-1 text-center">
            <p className="text-balance text-xs font-medium leading-4 text-ink">{bar.label}</p>
            {bar.sublabel && <p className="tabular text-2xs text-muted">{bar.sublabel}</p>}
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {bars.map((bar) => (
            <tr key={bar.id || bar.label}>
              <th scope="row">
                {bar.label} {bar.sublabel}
              </th>
              <td>{formatValue(bar.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

export default ColumnChart;
