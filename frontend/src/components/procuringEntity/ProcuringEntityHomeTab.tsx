import { useTranslation } from 'react-i18next';
import {
  FileText, Users, Clock, CheckCircle, AlertTriangle, Calendar, Activity
} from 'lucide-react';
import {
  AdminStatCard, AdminStatsGrid, AdminSectionTitle, AdminRecentList
} from '../admin/AdminStatCards';

export type EntityDashboardStats = {
  entityName?: string;
  questionnaires: {
    total: number;
    active: number;
    overdue: number;
    open: number;
  };
  responses: {
    submitted: number;
    draft: number;
    total: number;
  };
  matchingSuppliers: number;
  nearestDeadline?: string | null;
  nearestDeadlineTitle?: string | null;
  recentQuestionnaires: Array<{
    id: string;
    title: string;
    deadline: string;
    isActive?: boolean;
    cpvCode?: { code: string; description?: string };
  }>;
  nextAction: { labelKey?: string; tab: string | null };
};

function HomeTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 bg-surface rounded-lg" />
        <div className="h-4 w-72 bg-surface rounded mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-border p-5 h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border h-64" />
        <div className="bg-white rounded-2xl border border-border h-64" />
      </div>
    </div>
  );
}

export function ProcuringEntityHomeTab({
  stats,
  loading,
  onNavigate
}: {
  stats: EntityDashboardStats | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  const { t } = useTranslation();

  if (loading || !stats) {
    return <HomeTabSkeleton />;
  }

  const { questionnaires, responses, matchingSuppliers } = stats;
  const nextKey = stats.nextAction.labelKey || 'allSet';
  const nextLabel = t(`entityPortal.nextActions.${nextKey}`);
  const hasAction = Boolean(stats.nextAction.tab);

  return (
    <div className="space-y-6">
      <AdminSectionTitle
        title={t('entityPortal.homeTitle')}
        subtitle={t('entityPortal.homeSubtitle')}
      />

      <AdminStatsGrid>
        <AdminStatCard
          label={t('nav.questionnaires')}
          value={questionnaires.total}
          hint={`${questionnaires.active} ${t('entityPortal.activeNow')} · ${questionnaires.open} ${t('entityPortal.open')}`}
          icon={FileText}
          accent="blue"
        />
        <AdminStatCard
          label={t('entityPortal.submittedResponses')}
          value={responses.submitted}
          hint={`${responses.draft} ${t('entityPortal.draftResponses')}`}
          icon={CheckCircle}
          accent="green"
        />
        <AdminStatCard
          label={t('entityPortal.matchingSuppliers')}
          value={matchingSuppliers}
          hint={t('entityPortal.matchingSuppliersHint')}
          icon={Users}
          accent="violet"
        />
        <AdminStatCard
          label={t('entityPortal.overdue')}
          value={questionnaires.overdue}
          hint={
            stats.nearestDeadline
              ? `${t('entityPortal.nearestDeadline')}: ${new Date(stats.nearestDeadline).toLocaleDateString()}`
              : undefined
          }
          icon={AlertTriangle}
          accent="amber"
          badge={questionnaires.overdue > 0 ? t('entityPortal.actionNeeded') : undefined}
        />
      </AdminStatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-foreground mb-4">{t('entityPortal.activitySummary')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface/80">
              <span className="text-sm font-medium flex items-center gap-2">
                <Activity size={18} className="text-accent" />
                {t('entityPortal.totalResponses')}
              </span>
              <span className="text-lg font-bold tabular-nums">{responses.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/80">
              <span className="text-sm font-medium flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                {t('entityPortal.submittedResponses')}
              </span>
              <span className="text-lg font-bold text-green-800 tabular-nums">{responses.submitted}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80">
              <span className="text-sm font-medium flex items-center gap-2">
                <Clock size={18} className="text-amber-600" />
                {t('entityPortal.draftResponses')}
              </span>
              <span className="text-lg font-bold text-amber-800 tabular-nums">{responses.draft}</span>
            </div>
            {stats.nearestDeadlineTitle && (
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-primary-50/60">
                <span className="text-sm font-medium flex items-center gap-2 min-w-0">
                  <Calendar size={18} className="text-primary-600 shrink-0" />
                  <span className="truncate">{stats.nearestDeadlineTitle}</span>
                </span>
                <span className="text-xs font-semibold text-primary-800 shrink-0">
                  {new Date(stats.nearestDeadline!).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl p-6 border shadow-sm flex flex-col justify-center gap-4 ${
            hasAction ? 'bg-white border-border' : 'bg-green-50/80 border-green-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {!hasAction && <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={22} />}
            <div>
              <p className="text-sm text-muted">{t('supplierPortal.nextAction')}</p>
              <p className={`text-lg font-semibold mt-0.5 ${hasAction ? 'text-foreground' : 'text-green-800'}`}>
                {nextLabel}
              </p>
            </div>
          </div>
          {hasAction && (
            <button
              type="button"
              onClick={() => onNavigate(stats.nextAction.tab!)}
              className="btn-save self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
          <FileText size={14} className="text-primary-600" />
          {t('nav.questionnaires')}
        </p>
        <AdminRecentList
          title={t('entityPortal.recentQuestionnaires')}
          emptyLabel={t('dashboard.noQuestionnaires')}
          items={stats.recentQuestionnaires}
          renderItem={(item) => {
            const q = item as EntityDashboardStats['recentQuestionnaires'][0];
            const overdue = new Date(q.deadline) < new Date();
            return (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{q.title}</p>
                  <p className="text-xs text-muted">
                    {q.cpvCode?.code}
                    {q.cpvCode?.description ? ` · ${q.cpvCode.description}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  !q.isActive ? 'bg-gray-100 text-gray-600' :
                  overdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {!q.isActive ? t('common.inactive') : overdue ? t('entityPortal.overdue') : t('entityPortal.open')}
                </span>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

export function EntityQuestionnaireStatsStrip({
  questionnaires
}: {
  questionnaires: Array<{ isActive?: boolean; deadline: string; responses?: unknown[] }>;
}) {
  const { t } = useTranslation();
  const now = new Date();
  const total = questionnaires.length;
  const active = questionnaires.filter((q) => q.isActive !== false).length;
  const overdue = questionnaires.filter(
    (q) => q.isActive !== false && new Date(q.deadline) < now
  ).length;
  const open = questionnaires.filter(
    (q) => q.isActive !== false && new Date(q.deadline) >= now
  ).length;
  const withResponses = questionnaires.filter((q) => (q.responses?.length || 0) > 0).length;

  return (
    <AdminStatsGrid>
      <AdminStatCard label={t('nav.questionnaires')} value={total} icon={FileText} accent="blue" />
      <AdminStatCard label={t('entityPortal.activeNow')} value={active} icon={CheckCircle} accent="green" />
      <AdminStatCard label={t('entityPortal.open')} value={open} icon={Clock} accent="violet" />
      <AdminStatCard label={t('entityPortal.overdue')} value={overdue} icon={AlertTriangle} accent="amber" />
      <AdminStatCard
        label={t('entityPortal.withResponses')}
        value={withResponses}
        icon={Activity}
        accent="slate"
      />
    </AdminStatsGrid>
  );
}
