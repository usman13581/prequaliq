import type { ReactNode } from 'react';

type SlimCheckRowProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description?: string;
  disabled?: boolean;
  hint?: ReactNode;
  /** Emphasize master / section lead rows */
  emphasis?: boolean;
};

/**
 * Dense checkbox list row — used by AI controls, preferences, entitlements.
 */
export function SlimCheckRow({
  checked,
  onChange,
  title,
  description,
  disabled = false,
  hint,
  emphasis = false
}: SlimCheckRowProps) {
  return (
    <label
      className={`slim-check-row flex items-center gap-2.5 px-2.5 py-1.5 min-h-[2.25rem] cursor-pointer transition-colors ${
        disabled ? 'opacity-55 cursor-not-allowed' : 'hover:bg-surface/70'
      } ${emphasis ? 'bg-surface/40' : ''}`}
    >
      <input
        type="checkbox"
        className="field-check shrink-0"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
        <span
          className={`text-[0.8125rem] leading-snug truncate ${
            emphasis ? 'font-semibold text-foreground' : 'font-medium text-foreground'
          }`}
        >
          {title}
        </span>
        {description ? (
          <span className="text-xs text-muted truncate sm:ml-auto sm:max-w-[55%] sm:text-right" title={description}>
            {description}
          </span>
        ) : null}
      </span>
      {hint ? <span className="shrink-0 text-[0.68rem] font-medium text-amber-700">{hint}</span> : null}
    </label>
  );
}

/** Bordered list shell for slim check rows */
export function SlimCheckList({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
      {children}
    </div>
  );
}
