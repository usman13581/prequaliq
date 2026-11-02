import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'slate' | 'violet';
  badge?: string;
  /** Dense strip tiles (supplier / entity list pages) */
  compact?: boolean;
};

const accentMap = {
  blue: 'from-primary-500 to-primary-700',
  green: 'from-emerald-500 to-emerald-700',
  amber: 'from-amber-400 to-amber-600',
  red: 'from-red-500 to-red-600',
  orange: 'from-orange-500 to-orange-600',
  slate: 'from-slate-500 to-slate-700',
  violet: 'from-violet-500 to-violet-700'
};

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'blue',
  badge,
  compact = false
}: StatCardProps) {
  if (compact) {
    return (
      <div className="rounded-md border border-border bg-card px-2.5 py-1.5 min-h-[2.5rem] flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-md bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shrink-0`}
        >
          <Icon className="text-white" size={13} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold text-muted uppercase tracking-wide truncate leading-none">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <p className="text-base font-bold text-foreground tabular-nums leading-none">{value}</p>
            {hint ? <p className="text-[0.65rem] text-muted truncate">{hint}</p> : null}
          </div>
        </div>
        {badge ? <span className="status-chip status-chip--open shrink-0">{badge}</span> : null}
      </div>
    );
  }

  return (
    <div className="panel-card relative p-4 overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold text-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums leading-tight">{value}</p>
          {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
          {badge && (
            <span className="status-chip status-chip--open mt-2">{badge}</span>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shadow-sm shrink-0`}>
          <Icon className="text-white" size={18} />
        </div>
      </div>
    </div>
  );
}

type BreakdownItem = { key: string; label: string; value: number; color: string };

export function AdminStatusBreakdown({ title, items, total }: { title: string; items: BreakdownItem[]; total: number }) {
  const safeTotal = total || 1;
  return (
    <div className="panel-card p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-surface mb-3">
        {items.filter((i) => i.value > 0).map((item) => (
          <div
            key={item.key}
            className={`${item.color} transition-all`}
            style={{ width: `${(item.value / safeTotal) * 100}%` }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
            <div className="min-w-0">
              <p className="text-xs text-muted truncate">{item.label}</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminStatsGrid({
  children,
  compact = false
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(9.25rem, 1fr))' }}
      >
        {children}
      </div>
    );
  }
  return <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{children}</div>;
}

export function AdminSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="page-title">{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export function AdminRecentList({
  title,
  emptyLabel,
  items,
  renderItem
}: {
  title: string;
  emptyLabel: string;
  items: unknown[];
  renderItem: (item: unknown, index: number) => ReactNode;
}) {
  return (
    <div className="panel-card p-4">
      <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={i} className="py-2.5 first:pt-0 last:pb-0">
              {renderItem(item, i)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
