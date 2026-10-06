import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/cx';
import Button from './Button';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Open overlays, innermost last. Only the top one responds to the keyboard.
const overlayStack = [];

/** Escape to close, focus trap, scroll lock and focus restore for overlays. */
const useOverlay = (open, onCloseProp) => {
  const panelRef = useRef(null);
  // Keep the latest callback without re-running the effect (which would steal focus).
  const onCloseRef = useRef(onCloseProp);
  onCloseRef.current = onCloseProp;
  useEffect(() => {
    const onClose = () => onCloseRef.current?.();
    if (!open) return undefined;
    const token = {};
    overlayStack.push(token);
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector(FOCUSABLE);
      (target || panelRef.current)?.focus();
    });
    const onKey = (event) => {
      if (overlayStack[overlayStack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
      if (event.key === 'Tab' && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      overlayStack.splice(overlayStack.indexOf(token), 1);
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);
  return panelRef;
};

export const Modal = ({ open, onClose, title, description, children, footer, size = 'md' }) => {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/30 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx('relative flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white shadow-pop animate-fade-in sm:rounded-card', widths[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="xs" onClick={onClose} aria-label="Close" className="-mr-1 h-7 w-7 px-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

/** Right-hand panel on desktop, full-screen sheet on mobile. */
export const Drawer = ({ open, onClose, title, children, footer, width = 'max-w-xl' }) => {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx('relative flex h-full w-full flex-col border-l border-line bg-white shadow-pop animate-slide-in-right', width)}
      >
        {children}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export const ConfirmDialog = ({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'primary', loading }) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-muted">{description}</p>
  </Modal>
);
