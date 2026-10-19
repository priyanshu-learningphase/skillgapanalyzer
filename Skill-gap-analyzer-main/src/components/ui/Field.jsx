import { cx } from '../../lib/cx';

/** aria-describedby value for a field's error or hint. */
export const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

/**
 * Form field wrapper: label, control, then an error (announced) or a hint.
 * Give the control the same `id` and `aria-describedby={describedBy(...)}`.
 */
const Field = ({ id, label, error, hint, optional, className, children }) => (
  <div className={className}>
    <label htmlFor={id} className="label">
      {label}
      {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} className="mt-1 text-xs text-danger-700" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
        {hint}
      </p>
    ) : null}
  </div>
);

/** Input class with an error state. */
export const inputClass = (error, className) => cx('input', error && 'border-danger focus:border-danger focus:ring-danger/20', className);

export default Field;
