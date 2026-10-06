import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cx } from '../lib/cx';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const ICON_TONES = { success: 'text-success-600', error: 'text-danger-600', info: 'text-accent-600' };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    ({ title, description, tone = 'info', action, duration }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((list) => [...list.slice(-3), { id, title, description, tone, action }]);
      const ms = duration ?? (tone === 'error' ? 8000 : 3500);
      timers.current[id] = setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (title, opts) => show({ ...opts, title, tone: 'success' }),
      error: (title, opts) => show({ ...opts, title, tone: 'error' }),
      info: (title, opts) => show({ ...opts, title, tone: 'info' }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-line bg-white p-3.5 shadow-pop animate-fade-in"
            >
              <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', ICON_TONES[toast.tone])} aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-ink">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-muted">{toast.description}</p>}
                {toast.action && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-accent-600 hover:text-accent-700"
                    onClick={() => {
                      toast.action.onClick();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-muted-light hover:text-ink" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
