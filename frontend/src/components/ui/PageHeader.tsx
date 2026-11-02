import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  count?: number;
  countLabel?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

/** List/record page header: display title left, optional primary action right. */
export function PageHeader({ title, subtitle, count, countLabel, action, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon ? <span className="text-accent shrink-0">{icon}</span> : null}
          <h1 className="page-title truncate">{title}</h1>
          {typeof count === 'number' ? (
            <span className="status-chip status-chip--draft shrink-0">
              {count}
              {countLabel ? ` ${countLabel}` : ''}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2 shrink-0">{action}</div> : null}
    </div>
  );
}
