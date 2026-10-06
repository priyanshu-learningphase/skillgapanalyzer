import { useState } from 'react';
import { weeklyHours } from '../../lib/progress';
import { cx } from '../../lib/cx';

/**
 * Hours learned per week. Single series (no legend); the current week is in
 * the accent, earlier weeks a lighter step of the same hue. Hover for values;
 * a screen-reader table carries the same data.
 */
const WeeklyHoursChart = ({ hoursLog, weeks = 8, target }) => {
  const data = weeklyHours(hoursLog, weeks);
  const [hover, setHover] = useState(null);
  const max = Math.max(1, target || 0, ...data.map((d) => d.hours));
  const niceMax = Math.ceil(max / 2) * 2;
  const label = (d) => d.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="relative h-40">
        {/* gridlines */}
        {[0, 0.5, 1].map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${t * 100}%` }} aria-hidden>
            <span className="tabular w-6 -translate-y-1/2 text-right text-[10px] text-muted-light">{Math.round(niceMax * t)}</span>
            <span className={cx('h-px flex-1', t === 0 ? 'bg-slate-300' : 'bg-line-soft')} />
          </div>
        ))}
        {target ? (
          <div className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(target / niceMax) * 100}%` }} aria-hidden>
            <span className="w-6" />
            <span className="h-0 flex-1 border-t border-dashed border-slate-300" />
            <span className="absolute right-0 -translate-y-3 text-[10px] text-muted">{target}h goal</span>
          </div>
        ) : null}
        <div className="absolute inset-0 left-8 flex items-end justify-around gap-1">
          {data.map((d, i) => {
            const current = i === data.length - 1;
            return (
              <div
                key={d.key}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className={cx('w-full max-w-[24px] rounded-t transition-[height] duration-700', current ? 'bg-accent' : 'bg-accent-200', hover === i && 'opacity-80')}
                  style={{ height: `${(d.hours / niceMax) * 100}%`, minHeight: d.hours ? 2 : 0 }}
                />
                {hover === i && (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-pop">
                    Week of {label(d)} · {d.hours}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-around gap-1" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className={cx('flex-1 text-center text-[10px]', i === data.length - 1 ? 'font-medium text-ink' : 'text-muted-light')}>
            {i === data.length - 1 ? 'This wk' : label(d)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Hours learned per week</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">Week of {label(d)}</th>
              <td>{d.hours} hours</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WeeklyHoursChart;
