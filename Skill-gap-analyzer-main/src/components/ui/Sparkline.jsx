import { useState } from 'react';

/**
 * Tiny trend line with an end dot. Single series, so no legend; hover shows
 * the value of the nearest point.
 */
const Sparkline = ({ values, labels = [], width = 120, height = 32, format = (v) => v, className }) => {
  const [hover, setHover] = useState(null);
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 4;
  const span = max - min || 1;
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v) => height - pad - ((v - min) / span) * (height - pad * 2);
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  const active = hover ?? last;

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(last, Math.round(ratio * last))));
  };

  return (
    <div className={className} style={{ position: 'relative', width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Trend: ${values.map(format).join(', ')}`}
      >
        <path d={path} fill="none" stroke="#C7D2FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(active)} cy={y(values[active])} r="4" fill="#6366F1" stroke="#fff" strokeWidth="2" />
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-pop"
          style={{ left: x(hover) }}
        >
          {labels[hover] ? `${labels[hover]} · ` : ''}
          {format(values[hover])}
        </div>
      )}
    </div>
  );
};

export default Sparkline;
