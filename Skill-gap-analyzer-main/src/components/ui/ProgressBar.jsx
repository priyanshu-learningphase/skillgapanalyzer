import { useEffect, useState } from 'react';
import { cx } from '../../lib/cx';

// Fill and a lighter step of the same ramp for the track.
const TONES = {
  accent: ['bg-accent', 'bg-accent-50'],
  success: ['bg-success', 'bg-success-50'],
  warning: ['bg-warning', 'bg-warning-50'],
  danger: ['bg-danger', 'bg-danger-50'],
  ink: ['bg-ink', 'bg-slate-100'],
  muted: ['bg-slate-400', 'bg-slate-100'],
};

const SIZES = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' };

/**
 * Horizontal meter. `marker` draws a target tick (e.g. the required level).
 */
const ProgressBar = ({ value = 0, max = 100, tone = 'accent', size = 'md', marker, label, className }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);
  const [fill, track] = TONES[tone] || TONES.accent;

  return (
    <div
      className={cx('relative w-full rounded-full', track, SIZES[size], className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-700 ease-out', fill)}
        style={{ width: `${width}%` }}
      />
      {marker != null && (
        <span
          className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink"
          style={{ left: `calc(${Math.max(0, Math.min(100, (marker / max) * 100))}% - 1px)` }}
          aria-hidden
        />
      )}
    </div>
  );
};

export default ProgressBar;
