import { useTranslation } from 'react-i18next';
import {
  Users, Building2, FileText, Clock, CheckCircle,
  AlertTriangle, UserPlus, Activity
} from 'lucide-react';
import type { AdminDashboardStats } from '../../lib/adminStats';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
import {
  EmptyRow, HomeHeader, HomePanel, HomeRow, HomeSkeleton, KpiTile, PanelLink, TodoPanel, formatDay, type HomeTodo
} from '../home/HomeParts';
import { AdminStatCard, AdminStatsGrid } from './AdminStatCards';

const ACCOUNT_TONE: Record<string, 'green' | 'yellow' | 'red' | 'orange'> = {
  approved: 'green',
  pending: 'yellow',
  rejected: 'red',
  requalification_required: 'orange'
};

/**
 * Platform admin Home: accounts waiting for a decision, the newest sign-ups on both sides and
 * the account mix. Same building blocks as the buyer and supplier Home, sized for a laptop screen.
 */
export function AdminHomeTab({
  stats,
  loading,
  onNavigate
}: {
  stats: AdminDashboardStats | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  const { t } = useTranslation();

  if (loading || !stats) return <HomeSkeleton />;

  const { suppliers, questionnaires } = stats;
  // Older API responses may leave the buyer breakdown out.
  const entities = {
    ...stats.entities,
    pending: stats.entities.pending ?? 0,
    approved: stats.entities.approved ?? 0,
    rejected: stats.entities.rejected ?? 0
  };
  const waiting = suppliers.pending + entities.pending;
  const inactive = suppliers.inactive + entities.inactive;

  const todos: HomeTodo[] = [];
  if (suppliers.pending > 0) todos.push({ type: 'admin_suppliers_pending', tab: 'suppliers', count: suppliers.pending });
  if (entities.pending > 0) todos.push({ type: 'admin_entities_pending', tab: 'entities', count: entities.pending });
  if (suppliers.requalification_required > 0) {
    todos.push({ type: 'admin_requalification', tab: 'suppliers', count: suppliers.requalification_required });
  }
  if (inactive > 0) todos.push({ type: 'admin_inactive', tab: suppliers.inactive > 0 ? 'suppliers' : 'entities', count: inactive });

  const statusLabel = (status: string) =>
    status === 'requalification_required' ? t('supplierPortal.requalificationTitle') : t(`common.${status}`);
  // Label on the left, one chip per status with accounts in it; chips wrap instead of squeezing the label.
  const mixRow = (label: string, parts: Array<[string, number]>, tab: string) => (
    <button
      type="button"
      onClick={() => onNavigate(tab)}
      className="w-full text-left px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border last:border-b-0 hover:bg-surface transition-colors"
    >
      <span className="text-sm font-semibold text-foreground w-20 shrink-0">{label}</span>
      <span className="flex flex-wrap gap-1.5 min-w-0">
        {parts
          .filter(([, n]) => n > 0)
          .map(([status, n]) => (
            <StatusBadge key={status} tone={ACCOUNT_TONE[status] || 'yellow'}>
              {statusLabel(status)} {n}
            </StatusBadge>
          ))}
      </span>
    </button>
  );

  return (
    <div className="space-y-3">
      <HomeHeader title={t('home.adminTitle')} subtitle={t('home.adminSubtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label={t('home.kpi.waiting')}
          value={waiting}
          icon={Clock}
          accent={waiting > 0 ? 'amber' : 'green'}
          onClick={() => onNavigate(suppliers.pending > 0 || entities.pending === 0 ? 'suppliers' : 'entities')}
        />
        <KpiTile
          label={t('home.kpi.suppliers')}
          value={suppliers.total}
          hint={t('home.kpi.newHint', { count: suppliers.newThisMonth })}
          icon={Users}
          accent="blue"
          onClick={() => onNavigate('suppliers')}
        />
        <KpiTile
          label={t('home.kpi.buyers')}
          value={entities.total}
          hint={t('home.kpi.newHint', { count: entities.newThisMonth })}
          icon={Building2}
          accent="slate"
          onClick={() => onNavigate('entities')}
        />
        <KpiTile
          label={t('home.kpi.questionnaires')}
          value={questionnaires.total}
          hint={questionnaires.overdue ? t('home.kpi.overdueHint', { count: questionnaires.overdue }) : undefined}
          icon={FileText}
          accent="violet"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-3 items-start">
        <div className="lg:col-span-3 space-y-3 min-w-0">
          <HomePanel
            title={t('home.recentSuppliers')}
            action={<PanelLink label={t('home.viewAll')} onClick={() => onNavigate('suppliers')} />}
          >
            {stats.recentSuppliers.length === 0 ? (
              <EmptyRow>{t('home.noneYet')}</EmptyRow>
            ) : (
              stats.recentSuppliers.slice(0, 4).map((s) => (
                <HomeRow
                  key={s.id}
                  onClick={() => onNavigate('suppliers')}
                  title={s.companyName}
                  meta={[[s.user?.firstName, s.user?.lastName].filter(Boolean).join(' '), s.user?.email, formatDay(s.createdAt)].filter(Boolean).join(' · ')}
                  right={<StatusBadge tone={ACCOUNT_TONE[s.status] || 'yellow'}>{statusLabel(s.status)}</StatusBadge>}
                />
              ))
            )}
          </HomePanel>

          <HomePanel
            title={t('home.recentBuyers')}
            action={<PanelLink label={t('home.viewAll')} onClick={() => onNavigate('entities')} />}
          >
            {stats.recentEntities.length === 0 ? (
              <EmptyRow>{t('home.noneYet')}</EmptyRow>
            ) : (
              stats.recentEntities.slice(0, 3).map((e) => (
                <HomeRow
                  key={e.id}
                  onClick={() => onNavigate('entities')}
                  title={e.entityName}
                  meta={[[e.user?.firstName, e.user?.lastName].filter(Boolean).join(' '), e.user?.email, formatDay(e.createdAt)].filter(Boolean).join(' · ')}
                  right={<StatusBadge tone={ACCOUNT_TONE[e.status || 'pending'] || 'yellow'}>{statusLabel(e.status || 'pending')}</StatusBadge>}
                />
              ))
            )}
          </HomePanel>
        </div>

        <div className="lg:col-span-2 space-y-3 min-w-0">
          <TodoPanel todos={todos} total={todos.length} onNavigate={onNavigate} limit={4} />
          <HomePanel title={t('home.accountMix')}>
            {mixRow(
              t('home.kpi.suppliers'),
              [
                ['approved', suppliers.approved],
                ['pending', suppliers.pending],
                ['requalification_required', suppliers.requalification_required],
                ['rejected', suppliers.rejected]
              ],
              'suppliers'
            )}
            {mixRow(
              t('home.kpi.buyers'),
              [
                ['approved', entities.approved],
                ['pending', entities.pending],
                ['rejected', entities.rejected]
              ],
              'entities'
            )}
          </HomePanel>
        </div>
      </div>
    </div>
  );
}

export function AdminSupplierStatsStrip({ stats }: { stats: ReturnType<typeof import('../../lib/adminStats').statsFromSuppliers> }) {
  const { t } = useTranslation();
  return (
    <AdminStatsGrid compact>
      <AdminStatCard compact label={t('nav.totalSuppliers')} value={stats.total} icon={Users} accent="blue" />
      <AdminStatCard compact label={t('common.approved')} value={stats.approved} icon={CheckCircle} accent="green" />
      <AdminStatCard compact label={t('common.pending')} value={stats.pending} icon={Clock} accent="amber" />
      <AdminStatCard
        compact
        label={t('adminPortal.requalification')}
        value={stats.requalification_required}
        icon={AlertTriangle}
        accent="orange"
      />
      <AdminStatCard compact label={t('common.rejected')} value={stats.rejected} icon={AlertTriangle} accent="red" />
      <AdminStatCard
        compact
        label={t('nav.active')}
        value={stats.active}
        hint={`${stats.inactive} ${t('common.inactive')}`}
        icon={UserPlus}
        accent="slate"
      />
      <AdminStatCard
        compact
        label={t('adminPortal.newThisMonth')}
        value={stats.newThisMonth}
        icon={Activity}
        accent="violet"
      />
    </AdminStatsGrid>
  );
}

export function AdminEntityStatsStrip({ stats }: { stats: ReturnType<typeof import('../../lib/adminStats').statsFromEntities> }) {
  const { t } = useTranslation();
  return (
    <AdminStatsGrid compact>
      <AdminStatCard compact label={t('nav.procuringEntities')} value={stats.total} icon={Building2} accent="slate" />
      <AdminStatCard compact label={t('nav.active')} value={stats.active} icon={CheckCircle} accent="green" />
      <AdminStatCard compact label={t('common.inactive')} value={stats.inactive} icon={Clock} accent="amber" />
      <AdminStatCard compact label={t('adminPortal.newThisMonth')} value={stats.newThisMonth} icon={Activity} accent="violet" />
    </AdminStatsGrid>
  );
}
