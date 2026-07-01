import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'orange' | 'slate' | 'violet';
  badge?: string;
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

export function AdminStatCard({ label, value, hint, icon: Icon, accent = 'blue', badge }: StatCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent/5 to-transparent rounded-bl-full pointer-events-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
          {badge && (
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-subtle text-accent">
              {badge}
            </span>
          )}
        </div>
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="text-white" size={22} />
        </div>
      </div>
    </div>
  );
}

type BreakdownItem = { key: string; label: string; value: number; color: string };

export function AdminStatusBreakdown({ title, items, total }: { title: string; items: BreakdownItem[]; total: number }) {
  const safeTotal = total || 1;
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-4">{title}</h3>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface mb-4">
        {items.filter((i) => i.value > 0).map((item) => (
          <div
            key={item.key}
            className={`${item.color} transition-all`}
            style={{ width: `${(item.value / safeTotal) * 100}%` }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
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

export function AdminStatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">{children}</div>;
}

export function AdminSectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
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
  renderItem: (item: unknown, index: number) => React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              {renderItem(item, i)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
