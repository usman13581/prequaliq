import { useTranslation } from 'react-i18next';
import {
  Users, Building2, FileText, ClipboardList, Clock, CheckCircle,
  AlertTriangle, UserPlus, Activity
} from 'lucide-react';
import type { AdminDashboardStats } from '../../lib/adminStats';
import {
  AdminStatCard, AdminStatsGrid, AdminStatusBreakdown, AdminSectionTitle, AdminRecentList
} from './AdminStatCards';

export function AdminHomeTab({
  stats,
  loading
}: {
  stats: AdminDashboardStats | null;
  loading: boolean;
}) {
  const { t } = useTranslation();

  if (loading || !stats) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-muted text-sm">{t('sections.loadingData')}</p>
      </div>
    );
  }

  const { suppliers, entities, questionnaires, responses, pendingSubmissions } = stats;

  const supplierBreakdown = [
    { key: 'approved', label: t('common.approved'), value: suppliers.approved, color: 'bg-emerald-500' },
    { key: 'pending', label: t('common.pending'), value: suppliers.pending, color: 'bg-amber-400' },
    { key: 'requalification_required', label: t('adminPortal.requalification'), value: suppliers.requalification_required, color: 'bg-orange-500' },
    { key: 'rejected', label: t('common.rejected'), value: suppliers.rejected, color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-6">
      <AdminSectionTitle
        title={t('adminPortal.homeTitle')}
        subtitle={t('adminPortal.homeSubtitle')}
      />

      {/* Platform overview */}
      <AdminStatsGrid>
        <AdminStatCard
          label={t('nav.totalSuppliers')}
          value={suppliers.total}
          hint={`${suppliers.active} ${t('nav.active')} · ${suppliers.newThisMonth} ${t('adminPortal.newThisMonth')}`}
          icon={Users}
          accent="blue"
        />
        <AdminStatCard
          label={t('nav.procuringEntities')}
          value={entities.total}
          hint={`${entities.active} ${t('nav.active')} · ${entities.newThisMonth} ${t('adminPortal.newThisMonth')}`}
          icon={Building2}
          accent="slate"
        />
        <AdminStatCard
          label={t('adminPortal.questionnaires')}
          value={questionnaires.total}
          hint={`${questionnaires.active} ${t('adminPortal.activeNow')} · ${questionnaires.overdue} ${t('adminPortal.overdue')}`}
          icon={FileText}
          accent="violet"
        />
        <AdminStatCard
          label={t('adminPortal.pendingReview')}
          value={pendingSubmissions}
          hint={t('adminPortal.pendingReviewHint')}
          icon={ClipboardList}
          accent="amber"
          badge={pendingSubmissions > 0 ? t('adminPortal.actionNeeded') : undefined}
        />
      </AdminStatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminStatusBreakdown
          title={t('adminPortal.supplierStatusMix')}
          items={supplierBreakdown}
          total={suppliers.total}
        />
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">{t('adminPortal.platformActivity')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface/80">
              <div className="flex items-center gap-3">
                <Activity className="text-accent" size={20} />
                <span className="text-sm font-medium">{t('adminPortal.questionnaireResponses')}</span>
              </div>
              <span className="text-lg font-bold tabular-nums">{responses.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/80">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={20} />
                <span className="text-sm font-medium">{t('adminPortal.submittedResponses')}</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-green-800">{responses.submitted}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80">
              <div className="flex items-center gap-3">
                <Clock className="text-amber-600" size={20} />
                <span className="text-sm font-medium">{t('adminPortal.draftResponses')}</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-amber-800">{responses.draft}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/80">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-600" size={20} />
                <span className="text-sm font-medium">{t('adminPortal.inactiveAccounts')}</span>
              </div>
              <span className="text-lg font-bold tabular-nums text-orange-800">
                {suppliers.inactive + entities.inactive}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
            <Users size={14} className="text-primary-600" />
            {t('nav.suppliers')}
          </p>
        <AdminRecentList
          title={t('adminPortal.recentSuppliers')}
          emptyLabel={t('sections.noSuppliersFound')}
          items={stats.recentSuppliers}
          renderItem={(item) => {
            const s = item as AdminDashboardStats['recentSuppliers'][0];
            return (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.companyName}</p>
                  <p className="text-xs text-muted">{s.user?.email}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  s.status === 'approved' ? 'bg-green-100 text-green-800' :
                  s.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  s.status === 'requalification_required' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {s.status === 'requalification_required' ? t('adminPortal.requalification') : t(`common.${s.status}`)}
                </span>
              </div>
            );
          }}
        />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-primary-600" />
            {t('nav.entities')}
          </p>
        <AdminRecentList
          title={t('adminPortal.recentEntities')}
          emptyLabel={t('adminPortal.noEntities')}
          items={stats.recentEntities}
          renderItem={(item) => {
            const e = item as AdminDashboardStats['recentEntities'][0];
            return (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.entityName}</p>
                  <p className="text-xs text-muted">{e.user?.email}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  e.user?.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {e.user?.isActive !== false ? t('common.active') : t('common.inactive')}
                </span>
              </div>
            );
          }}
        />
        </div>
      </div>
    </div>
  );
}

export function AdminSupplierStatsStrip({ stats }: { stats: ReturnType<typeof import('../../lib/adminStats').statsFromSuppliers> }) {
  const { t } = useTranslation();
  return (
    <AdminStatsGrid>
      <AdminStatCard label={t('nav.totalSuppliers')} value={stats.total} icon={Users} accent="blue" />
      <AdminStatCard label={t('common.approved')} value={stats.approved} icon={CheckCircle} accent="green" />
      <AdminStatCard label={t('common.pending')} value={stats.pending} icon={Clock} accent="amber" />
      <AdminStatCard
        label={t('adminPortal.requalification')}
        value={stats.requalification_required}
        icon={AlertTriangle}
        accent="orange"
      />
      <AdminStatCard label={t('common.rejected')} value={stats.rejected} icon={AlertTriangle} accent="red" />
      <AdminStatCard
        label={t('nav.active')}
        value={stats.active}
        hint={`${stats.inactive} ${t('common.inactive')}`}
        icon={UserPlus}
        accent="slate"
      />
      <AdminStatCard
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <AdminStatCard label={t('nav.procuringEntities')} value={stats.total} icon={Building2} accent="slate" />
      <AdminStatCard label={t('nav.active')} value={stats.active} icon={CheckCircle} accent="green" />
      <AdminStatCard label={t('common.inactive')} value={stats.inactive} icon={Clock} accent="amber" />
      <AdminStatCard label={t('adminPortal.newThisMonth')} value={stats.newThisMonth} icon={Activity} accent="violet" />
    </div>
  );
}
