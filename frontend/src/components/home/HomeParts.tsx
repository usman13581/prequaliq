import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarClock, CheckCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/** Shared building blocks of the buyer and supplier Home screens. Sized to fit a laptop screen without scrolling. */

export type HomeTodo = {
  type: string;
  tab: string;
  title?: string;
  reference?: string | null;
  count?: number;
  date?: string | null;
};

export type HomeDeadline = { kind: string; date: string; title: string; reference?: string | null; tab: string };

const accents = {
  blue: 'bg-primary-50 text-primary-700',
  green: 'bg-emerald-50 text-emerald-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-700'
};

export function formatDay(date?: string | null): string {
  if (!date) return '—';
  return new Date(`${String(date).slice(0, 10)}T12:00:00`).toLocaleDateString();
}

/** Whole days from today to the date (0 = today). */
export function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${date.slice(0, 10)}T12:00:00`).getTime() - today.getTime()) / 86400000);
}

export function HomeHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>
        <p className="text-sm text-muted truncate">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'blue',
  onClick
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  accent?: keyof typeof accents;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group text-left rounded-xl border border-border bg-white px-3 py-2.5 flex items-center gap-3 min-w-0 transition-colors enabled:hover:border-primary-300 enabled:hover:bg-primary-50/30 disabled:cursor-default"
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accents[accent]}`}>
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted truncate">{label}</span>
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="text-xl font-bold text-foreground tabular-nums leading-tight">{value}</span>
          {hint ? <span className="text-xs text-muted truncate">{hint}</span> : null}
        </span>
      </span>
      {onClick ? <ChevronRight size={16} className="text-muted shrink-0 opacity-0 group-hover:opacity-100" aria-hidden /> : null}
    </button>
  );
}

export function HomePanel({
  title,
  action,
  children,
  className = ''
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-white flex flex-col min-w-0 ${className}`}>
      <header className="flex items-center justify-between gap-2 px-3 h-10 border-b border-border shrink-0">
        <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
        {action}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function PanelLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 shrink-0"
    >
      {label}
      <ArrowRight size={13} aria-hidden />
    </button>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-3 py-5 text-sm text-muted text-center">{children}</p>;
}

/** One clickable line in a Home list: main text, a second line, and something on the right. */
export function HomeRow({
  title,
  meta,
  right,
  onClick
}: {
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 flex items-center gap-3 min-w-0 border-b border-border last:border-b-0 hover:bg-surface transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground truncate">{title}</span>
        {meta ? <span className="block text-xs text-muted truncate">{meta}</span> : null}
      </span>
      {right ? <span className="shrink-0 flex items-center gap-2">{right}</span> : null}
    </button>
  );
}

export function TodoPanel({
  todos,
  total,
  onNavigate,
  limit = 5
}: {
  todos: HomeTodo[];
  total: number;
  onNavigate: (tab: string) => void;
  limit?: number;
}) {
  const { t } = useTranslation();
  const shown = todos.slice(0, limit);
  const more = total - shown.length;
  return (
    <HomePanel
      title={t('home.todoTitle')}
      action={
        total > 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tabular-nums">{total}</span>
        ) : null
      }
    >
      {shown.length === 0 ? (
        <p className="px-3 py-5 text-sm text-emerald-700 flex items-center justify-center gap-2">
          <CheckCircle size={16} aria-hidden />
          {t('home.todoEmpty')}
        </p>
      ) : (
        <>
          {shown.map((item, i) => (
            <HomeRow
              key={`${item.type}-${i}`}
              onClick={() => onNavigate(item.tab)}
              title={t(`home.todo.${item.type}`, { count: item.count ?? 0, date: formatDay(item.date) })}
              meta={item.title ? [item.reference, item.title].filter(Boolean).join(' · ') : undefined}
              right={<ChevronRight size={16} className="text-muted" aria-hidden />}
            />
          ))}
          {more > 0 ? <p className="px-3 py-1.5 text-xs text-muted">{t('home.todoMore', { count: more })}</p> : null}
        </>
      )}
    </HomePanel>
  );
}

export function DeadlinesPanel({
  deadlines,
  onNavigate,
  limit = 5
}: {
  deadlines: HomeDeadline[];
  onNavigate: (tab: string) => void;
  limit?: number;
}) {
  const { t } = useTranslation();
  return (
    <HomePanel title={t('home.deadlinesTitle')}>
      {deadlines.length === 0 ? (
        <EmptyRow>{t('home.deadlinesEmpty')}</EmptyRow>
      ) : (
        deadlines.slice(0, limit).map((d, i) => {
          const days = daysUntil(d.date);
          const when =
            days <= 0 ? t('home.today') : days === 1 ? t('home.tomorrow') : t('home.inDays', { count: days });
          return (
            <HomeRow
              key={`${d.kind}-${i}`}
              onClick={() => onNavigate(d.tab)}
              title={
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={14} className="text-muted shrink-0" aria-hidden />
                  {t(`home.deadline.${d.kind}`)}
                </span>
              }
              meta={[d.reference, d.title].filter(Boolean).join(' · ')}
              right={
                <span className="text-right">
                  <span className={`block text-xs font-bold ${days <= 2 ? 'text-amber-700' : 'text-foreground'}`}>{when}</span>
                  <span className="block text-xs text-muted tabular-nums">{formatDay(d.date)}</span>
                </span>
              }
            />
          );
        })
      )}
    </HomePanel>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true">
      <div className="h-10 w-64 bg-surface rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-white" />
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 h-72 rounded-xl border border-border bg-white" />
        <div className="lg:col-span-2 h-72 rounded-xl border border-border bg-white" />
      </div>
    </div>
  );
}
