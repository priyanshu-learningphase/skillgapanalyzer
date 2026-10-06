import { cx } from '../../lib/cx';

const TONES = {
  neutral: 'bg-slate-100 text-slate-700',
  outline: 'border border-line text-muted bg-white',
  accent: 'bg-accent-50 text-accent-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  dark: 'bg-ink text-white',
};

const Badge = ({ tone = 'neutral', icon: Icon, className, children }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium leading-4', TONES[tone], className)}>
    {Icon && <Icon className="h-3 w-3" aria-hidden />}
    {children}
  </span>
);

export default Badge;
