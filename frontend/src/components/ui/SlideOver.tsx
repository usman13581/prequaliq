import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
};

/** Right-side slide-over panel for edit/detail forms */
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = 'max-w-3xl'
}: SlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" style={{ isolation: 'isolate' }}>
      {/* Backdrop — behind panel only; never covers panel hit-testing */}
      <div
        role="presentation"
        className="absolute inset-0 bg-black/50"
        style={{ zIndex: 1 }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 right-0 w-full ${widthClass} h-full bg-white shadow-2xl border-l border-border flex flex-col`}
        style={{ zIndex: 2, pointerEvents: 'auto' }}
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0 bg-white">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{title}</h2>
            {subtitle ? <p className="text-sm text-muted mt-0.5 truncate">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-surface text-muted flex items-center justify-center shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-white relative text-sm text-foreground" style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
        {footer ? (
          <div className="px-5 py-4 border-t border-border shrink-0 bg-white">{footer}</div>
        ) : null}
      </aside>
    </div>,
    document.body
  );
}

/** Centered modal for shorter forms */
export function CenterModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidthClass = 'max-w-lg'
}: SlideOverProps & { maxWidthClass?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
      <div
        role="presentation"
        className="absolute inset-0 bg-black/50"
        style={{ zIndex: 1 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${maxWidthClass} max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden`}
        style={{ zIndex: 2, pointerEvents: 'auto' }}
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {subtitle ? <p className="text-sm text-muted mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-surface text-muted flex items-center justify-center shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-foreground">{children}</div>
        {footer ? (
          <div className="px-5 py-4 border-t border-border shrink-0">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
