import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  busy?: boolean;
  busyLabel: ReactNode;
  idleIcon?: ReactNode;
  children: ReactNode;
};

/**
 * Violet AI action button with a stable loading state.
 * Idle and busy labels never paint at the same time (avoids ghosted/overlapping text).
 */
export function AiBusyButton({
  busy = false,
  busyLabel,
  idleIcon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  const isDisabled = Boolean(disabled) || busy;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      className={`relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shrink-0 whitespace-nowrap transition-colors disabled:cursor-not-allowed ${
        disabled && !busy ? 'opacity-50' : ''
      } ${busy ? 'cursor-wait' : ''} ${className}`}
      {...rest}
    >
      <span
        className={`inline-flex items-center justify-center gap-1.5 ${busy ? 'invisible' : ''}`}
        aria-hidden={busy || undefined}
      >
        {idleIcon}
        {children}
      </span>
      {busy ? (
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 px-3.5 pointer-events-none">
          <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
          <span>{busyLabel}</span>
        </span>
      ) : null}
    </button>
  );
}
