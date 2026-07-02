import type { ReactNode } from 'react';

type QuestionnaireSlimRowProps = {
  title: string;
  description?: string;
  meta: ReactNode;
  trailing: ReactNode;
};

export function QuestionnaireSlimRow({
  title,
  description,
  meta,
  trailing
}: QuestionnaireSlimRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 bg-white rounded-xl border border-border hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        {description ? (
          <p className="text-xs text-muted truncate mt-0.5">{description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted mt-1">
          {meta}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">
        {trailing}
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
    <span className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full uppercase tracking-wide ${toneClass}`}>
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
