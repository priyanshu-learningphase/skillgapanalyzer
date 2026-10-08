/**
 * Circular meter for a 0–100 score. The track is a lighter step of the fill's
 * hue; the number in the centre carries the value. The fill animates with
 * CSS only, so it always lands on the right value (even in background tabs).
 */
const TONES = {
  accent: ['#6366F1', '#EEF2FF'],
  success: ['#22C55E', '#DCFCE7'],
  warning: ['#F59E0B', '#FEF3C7'],
  danger: ['#EF4444', '#FEE2E2'],
  ink: ['#111827', '#F1F5F9'],
};

const ScoreRing = ({ value, max = 100, size = 132, stroke = 10, tone = 'accent', label, children }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const [fill, track] = TONES[tone] || TONES.accent;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label || `${value} out of ${max}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            key={value}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className="animate-ring"
            style={{ '--ring-from': circumference }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

export default ScoreRing;
