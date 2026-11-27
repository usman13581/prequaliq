import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { procedureStatusLabelKey } from '../../utils/procedureStatus';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
import {
  DeadlinesPanel, EmptyRow, HomeHeader, HomePanel, HomeRow, HomeSkeleton, KpiTile, PanelLink, TodoPanel, formatDay,
  type HomeDeadline, type HomeTodo
} from '../home/HomeParts';
import {
  FileText, Clock, CheckCircle, AlertTriangle, Activity, Plus, ClipboardList, Send, Scale, ScrollText
} from 'lucide-react';
import { AdminStatCard, AdminStatsGrid } from '../admin/AdminStatCards';

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

type BuyerHomeData = {
  status: string;
  entityName?: string;
  counts: { preparing: number; open: number; evaluation: number; awarded: number; contractsActive: number; questionnaires: number };
  todo: HomeTodo[];
  todoTotal: number;
  procedures: Array<{
    id: string;
    title: string;
    reference?: string | null;
    status: string;
    bidDeadline?: string | null;
    bidCount: number;
    sealed: boolean;
    winner?: string | null;
  }>;
  contracts: Array<{
    id: string;
    title: string;
    reference?: string | null;
    status: string;
    supplier?: string | null;
    endDate?: string | null;
    deliveryStatus: string;
  }>;
  deadlines: HomeDeadline[];
};

const PROCEDURE_TONE: Record<string, 'green' | 'yellow' | 'gray' | 'blue' | 'purple'> = {
  draft: 'gray', planned: 'gray', underlag_ready: 'gray',
  published: 'blue', qa_open: 'blue', bidding: 'blue',
  evaluation: 'purple', awarded: 'green', standstill: 'yellow', closed: 'gray', cancelled: 'gray'
};

/**
 * Buyer Home: what needs the buyer now (questions, unsealing, scoring, deliveries), the procedures in
 * progress, the contracts in progress and the next dates. Sized to fit a laptop screen without scrolling.
 */
export function ProcuringEntityHomeTab({
  onNavigate
}: {
  stats?: EntityDashboardStats | null;
  loading?: boolean;
  onNavigate: (tab: string) => void;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<BuyerHomeData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/procuring-entity/home')
      .then((res) => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) return <EmptyRow>{t('home.loadFailed')}</EmptyRow>;
  if (!data) return <HomeSkeleton />;

  const { counts } = data;
  const approved = data.status === 'approved';

  return (
    <div className="space-y-3">
      <HomeHeader
        title={data.entityName || t('home.buyerTitle')}
        subtitle={t('home.buyerSubtitle')}
        action={
          <button
            type="button"
            disabled={!approved}
            onClick={() => onNavigate('procedures')}
            className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <Plus size={14} aria-hidden /> {t('procedures.create')}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label={t('home.kpi.preparing')} value={counts.preparing} icon={ClipboardList} accent="slate" onClick={() => onNavigate('procedures')} />
        <KpiTile label={t('home.kpi.open')} value={counts.open} icon={Send} accent="blue" onClick={() => onNavigate('procedures')} />
        <KpiTile
          label={t('home.kpi.evaluation')}
          value={counts.evaluation}
          hint={counts.awarded ? t('home.kpi.awardedHint', { count: counts.awarded }) : undefined}
          icon={Scale}
          accent="violet"
          onClick={() => onNavigate('procedures')}
        />
        <KpiTile label={t('home.kpi.contractsActive')} value={counts.contractsActive} icon={ScrollText} accent="green" onClick={() => onNavigate('contracts')} />
      </div>

      <div className="grid lg:grid-cols-5 gap-3 items-start">
        <div className="lg:col-span-3 space-y-3 min-w-0">
          <HomePanel
            title={t('home.proceduresTitle')}
            action={<PanelLink label={t('home.viewAll')} onClick={() => onNavigate('procedures')} />}
          >
            {data.procedures.length === 0 ? (
              <EmptyRow>{t('home.proceduresEmpty')}</EmptyRow>
            ) : (
              data.procedures.slice(0, 5).map((p) => (
                <HomeRow
                  key={p.id}
                  onClick={() => onNavigate('procedures')}
                  title={p.title}
                  meta={[
                    p.reference,
                    p.bidDeadline ? t('home.deadlineOn', { date: formatDay(p.bidDeadline) }) : null,
                    p.winner
                      ? t('home.winner', { name: p.winner })
                      : p.bidCount || p.sealed
                        ? `${t('home.bids', { count: p.bidCount })}${p.sealed ? ` · ${t('home.sealed')}` : ''}`
                        : null
                  ].filter(Boolean).join(' · ')}
                  right={<StatusBadge tone={PROCEDURE_TONE[p.status] || 'gray'}>{t(procedureStatusLabelKey(p.status))}</StatusBadge>}
                />
              ))
            )}
          </HomePanel>

          <HomePanel
            title={t('home.contractsTitle')}
            action={<PanelLink label={t('home.viewAll')} onClick={() => onNavigate('contracts')} />}
          >
            {data.contracts.length === 0 ? (
              <EmptyRow>{t('home.contractsEmpty')}</EmptyRow>
            ) : (
              data.contracts.slice(0, 3).map((c) => (
                <HomeRow
                  key={c.id}
                  onClick={() => onNavigate('contracts')}
                  title={c.title}
                  meta={[c.reference, c.supplier, c.endDate ? t('home.endsOn', { date: formatDay(c.endDate) }) : null].filter(Boolean).join(' · ')}
                  right={
                    <StatusBadge tone={c.deliveryStatus === 'marked_done' ? 'yellow' : c.deliveryStatus === 'accepted' ? 'green' : c.status === 'draft' ? 'gray' : 'blue'}>
                      {c.status === 'draft' ? t('contracts.status.draft') : t(`home.delivery.${c.deliveryStatus}`)}
                    </StatusBadge>
                  }
                />
              ))
            )}
          </HomePanel>
        </div>

        <div className="lg:col-span-2 space-y-3 min-w-0">
          <TodoPanel todos={data.todo} total={data.todoTotal} onNavigate={onNavigate} limit={4} />
          <DeadlinesPanel deadlines={data.deadlines} onNavigate={onNavigate} limit={3} />
        </div>
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
    <AdminStatsGrid compact>
      <AdminStatCard label={t('nav.questionnaires')} value={total} icon={FileText} accent="blue" compact />
      <AdminStatCard label={t('entityPortal.activeNow')} value={active} icon={CheckCircle} accent="green" compact />
      <AdminStatCard label={t('entityPortal.open')} value={open} icon={Clock} accent="violet" compact />
      <AdminStatCard label={t('entityPortal.overdue')} value={overdue} icon={AlertTriangle} accent="amber" compact />
      <AdminStatCard
        label={t('entityPortal.withResponses')}
        value={withResponses}
        icon={Activity}
        accent="slate"
        compact
      />
    </AdminStatsGrid>
  );
}
