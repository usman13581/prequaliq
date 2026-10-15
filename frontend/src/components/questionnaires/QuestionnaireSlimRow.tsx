import type { ReactNode } from 'react';

type QuestionnaireSlimRowProps = {
  title: string;
  description?: string;
  meta?: ReactNode;
  trailing?: ReactNode;
  /** Dense row for nested pickers / admin tables. Default is Open-tenders-style card. */
  compact?: boolean;
  badges?: ReactNode;
};

/** List row used across portal management lists (questionnaires, procedures, contracts, …). */
export function QuestionnaireSlimRow({
  title,
  description,
  meta,
  trailing,
  compact = false,
  badges
}: QuestionnaireSlimRowProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-white rounded-lg border border-border hover:bg-surface/60 hover:shadow-sm transition-all min-h-[2.5rem]">
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate leading-snug">{title}</p>
            {description ? (
              <p className="text-xs text-muted truncate leading-snug sm:hidden">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted min-w-0 sm:justify-end sm:max-w-[55%]">
            {description ? (
              <span className="hidden sm:inline truncate max-w-[14rem]" title={description}>
                {description}
              </span>
            ) : null}
            {meta}
          </div>
        </div>
        {trailing ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {trailing}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white hover:border-primary-300 hover:shadow-md transition-all p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {badges ? (
            <div className="flex flex-wrap items-center gap-2">{badges}</div>
          ) : null}
          <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">{title}</h3>
          {description ? (
            <p className="text-sm text-muted line-clamp-2 leading-snug">{description}</p>
          ) : null}
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
              {meta}
            </div>
          ) : null}
        </div>
        {trailing ? (
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-1.5 shrink-0 max-w-full sm:max-w-[40%]">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = 'green'
}: {
  children: ReactNode;
  tone?: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'orange' | 'purple';
}) {
  const toneClass = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800'
  }[tone];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md uppercase tracking-wide leading-5 ${toneClass}`}>
      {children}
    </span>
  );
}

export function RowActionButton({
  onClick,
  children,
  variant = 'primary'
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'muted';
}) {
  const variantClass = {
    primary: 'btn-save',
    secondary: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    danger: 'btn-delete',
    muted: 'bg-surface hover:bg-gray-100 text-foreground border border-border'
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg transition-colors font-medium text-xs flex items-center gap-1.5 whitespace-nowrap ${variantClass}`}
    >
      {children}
    </button>
  );
}
