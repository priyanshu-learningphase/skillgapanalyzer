import { useMemo, useRef, useState } from 'react';

/**
 * Single-series line chart on a 0–100 scale (e.g. readiness over time).
 * 2px line, end dot, hairline gridlines, crosshair + tooltip on hover, and a
 * screen-reader table with the same data.
 */
const LineChart = ({ points, height = 180, format = (v) => `${v}%`, target, targetLabel, ariaLabel = 'Trend' }) => {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const width = 600;
  const pad = { top: 12, right: 16, bottom: 26, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / 100) * innerH;
  const path = useMemo(() => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' '), [points]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!points.length) return null;
  const last = points.length - 1;
  const active = hover ?? last;

  const onMove = (event) => {
    const rect = ref.current.getBoundingClientRect();
    const ratio = ((event.clientX - rect.left) / rect.width) * width;
    const index = points.length === 1 ? 0 : Math.round(((ratio - pad.left) / innerW) * last);
    setHover(Math.max(0, Math.min(last, index)));
  };

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={ariaLabel}
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? '#CBD5E1' : '#F1F5F9'} strokeWidth="1" />
            <text x={pad.left - 8} y={y(tick) + 3.5} textAnchor="end" fontSize="10" fill="#94A3B8" className="tabular">
              {tick}
            </text>
          </g>
        ))}
        {target != null && (
          <g>
            <line x1={pad.left} x2={width - pad.right} y1={y(target)} y2={y(target)} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" />
            <text x={width - pad.right} y={y(target) - 5} textAnchor="end" fontSize="10" fill="#64748B">
              {targetLabel}
            </text>
          </g>
        )}
        <path d={`${path} L${x(last)},${y(0)} L${x(0)},${y(0)} Z`} fill="#6366F1" opacity="0.08" />
        <path d={path} fill="none" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} stroke="#CBD5E1" strokeWidth="1" />}
        <circle cx={x(active)} cy={y(points[active].value)} r="4.5" fill="#6366F1" stroke="#fff" strokeWidth="2" />
        {points.map((p, i) =>
          i % labelEvery === 0 || i === last ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94A3B8">
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      <div
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-pop"
        style={{ left: `${(x(active) / width) * 100}%`, top: Math.max(0, (y(points[active].value) / height) * 100 - 22) + '%' }}
        aria-hidden
      >
        {points[active].label} · {format(points[active].value)}
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LineChart;
