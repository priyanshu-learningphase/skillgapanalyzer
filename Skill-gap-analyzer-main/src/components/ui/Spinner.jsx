import { cx } from '../../lib/cx';

export const Spinner = ({ className }) => (
  <span
    className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-ink', className)}
    role="status"
    aria-label="Loading"
  />
);

export const FullPageSpinner = ({ label = 'Loading' }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas">
    <div className="flex items-center gap-3 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  </div>
);

export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} aria-hidden />;

export default Spinner;
