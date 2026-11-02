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
      <div className="flex items-center gap-2 sm:gap-3 px-2.5 py-1 bg-white rounded-md border border-border hover:bg-surface/60 transition-all min-h-[2.15rem]">
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
    <div className="panel-card hover:border-primary-300 transition-all p-3.5 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          {badges ? (
            <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
          ) : null}
          <h3 className="text-sm sm:text-[0.95rem] font-bold text-foreground leading-snug">{title}</h3>
          {description ? (
            <p className="text-[0.8125rem] text-muted line-clamp-2 leading-snug">{description}</p>
          ) : null}
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
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
  const family = {
    green: 'status-chip--done',
    yellow: 'status-chip--warn',
    red: 'status-chip--danger',
    gray: 'status-chip--draft',
    blue: 'status-chip--open',
    orange: 'status-chip--warn',
    purple: 'status-chip--open'
  }[tone];

  return <span className={`status-chip ${family}`}>{children}</span>;
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
    primary: 'btn-primary !min-h-8 !text-xs !px-2.5',
    secondary: 'btn-ghost !min-h-8 !text-xs !px-2.5 !text-accent !border-accent/30',
    danger: 'btn-danger !min-h-8 !text-xs !px-2.5',
    muted: 'btn-ghost !min-h-8 !text-xs !px-2.5'
  }[variant];

  return (
    <button type="button" onClick={onClick} className={`whitespace-nowrap ${variantClass}`}>
      {children}
    </button>
  );
}
