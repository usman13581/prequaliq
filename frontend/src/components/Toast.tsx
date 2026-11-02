import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const STYLES: Record<
  ToastType,
  { icon: typeof CheckCircle2; iconClass: string; bar: string; accent: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-700 bg-emerald-50',
    bar: 'bg-emerald-500',
    accent: 'border-l-emerald-500',
    label: 'Success'
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-700 bg-red-50',
    bar: 'bg-red-500',
    accent: 'border-l-red-500',
    label: 'Error'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-700 bg-amber-50',
    bar: 'bg-amber-500',
    accent: 'border-l-amber-500',
    label: 'Warning'
  },
  info: {
    icon: Info,
    iconClass: 'text-accent bg-accent-subtle',
    bar: 'bg-accent',
    accent: 'border-l-accent',
    label: 'Info'
  }
};

const Toast = ({ message, type, onClose, duration = 10000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const style = STYLES[type];
  const Icon = style.icon;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="toast-viewport pointer-events-none"
    >
      <div
        className={`toast-card pointer-events-auto border-l-[3px] ${style.accent}`}
        style={{ animationDuration: '220ms' }}
      >
        <div className="flex items-start gap-3 px-3.5 pt-3 pb-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${style.iconClass}`}
          >
            <Icon size={16} strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted leading-none mb-1">
              {style.label}
            </p>
            <p className="text-[0.8125rem] font-medium text-foreground leading-snug break-words">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 -mr-0.5 -mt-0.5 rounded-md p-1 text-muted hover:bg-surface hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <div className="h-0.5 w-full bg-surface overflow-hidden">
          <div
            className={`h-full ${style.bar} toast-progress`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Toast;
