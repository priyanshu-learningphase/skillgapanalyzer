import { useEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx';

/**
 * Click-to-open popover anchored to its trigger. Closes on outside click and
 * Escape. `children` may be a function receiving `close`.
 */
const Popover = ({ trigger, children, align = 'right', className, panelClassName, onOpenChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const setOpenState = (value) => {
    setOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpenState(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenState(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => setOpenState(false);

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      {trigger({ open, toggle: () => setOpenState(!open) })}
      {open && (
        <div
          className={cx(
            'absolute top-full z-50 mt-2 rounded-card border border-line bg-white shadow-pop animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
};

export default Popover;
