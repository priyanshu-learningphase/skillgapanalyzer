import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button';
import { cx } from '../../lib/cx';

/** Shown when there's nothing to display yet, with a single clear next step. */
export const EmptyState = ({ icon: Icon, title, description, action, secondaryAction, className, compact = false }) => (
  <div className={cx('flex flex-col items-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
    {Icon && (
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white shadow-card">
        <Icon className="h-5 w-5 text-muted" aria-hidden />
      </div>
    )}
    <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
    {(action || secondaryAction) && (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {action}
        {secondaryAction}
      </div>
    )}
  </div>
);

/** Recoverable error with a retry. */
export const ErrorState = ({ title = 'Something went wrong', description, onRetry, retryLabel = 'Try again', className }) => (
  <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)} role="alert">
    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50">
      <AlertTriangle className="h-5 w-5 text-danger-600" aria-hidden />
    </div>
    <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
    {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
    {onRetry && (
      <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRetry} className="mt-5">
        {retryLabel}
      </Button>
    )}
  </div>
);

/** Inline banner for notices inside a page. */
export const Notice = ({ tone = 'neutral', icon: Icon, title, children, action, className }) => {
  const tones = {
    neutral: 'border-line bg-white',
    accent: 'border-accent-100 bg-accent-50/60',
    warning: 'border-warning-100 bg-warning-50',
    danger: 'border-danger-100 bg-danger-50',
    success: 'border-success-100 bg-success-50',
  };
  const iconTones = {
    neutral: 'text-muted',
    accent: 'text-accent-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
    success: 'text-success-600',
  };
  return (
    <div className={cx('flex flex-col gap-3 rounded-card border px-4 py-3 sm:flex-row sm:items-center', tones[tone], className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon && <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', iconTones[tone])} aria-hidden />}
        <div className="min-w-0 text-sm">
          {title && <p className="font-medium text-ink">{title}</p>}
          {children && <div className="text-muted">{children}</div>}
        </div>
      </div>
      {action && <div className="flex shrink-0 gap-2 sm:ml-auto">{action}</div>}
    </div>
  );
};
