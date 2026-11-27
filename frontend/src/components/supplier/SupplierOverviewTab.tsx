import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, FileCheck, ScrollText, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { requestOpenRecord } from '../../lib/openRecord';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
import {
  DeadlinesPanel, EmptyRow, HomeHeader, HomePanel, HomeRow, HomeSkeleton, KpiTile, PanelLink, TodoPanel, formatDay,
  type HomeDeadline, type HomeTodo
} from '../home/HomeParts';
import { SupplierQualificationCertificate } from './SupplierQualificationCertificate';

type DashboardData = {
  status: string;
  completeness: {
    percent: number;
    readyToSubmit: boolean;
    blockers: string[];
    documents: { expiringCount: number; expiredCount: number; missingCount: number };
  };
  openQuestionnaires: number;
  nearestDeadline?: string | null;
  qualification: {
    qualifiedAt?: string;
    qualificationExpiresAt?: string;
    profileSubmittedAt?: string;
    rejectionReason?: string;
  };
  nextAction: { labelKey?: string; label?: string; tab: string | null };
  companyName?: string;
};

type SupplierHomeData = {
  counts: { openTenders: number; invited: number; bidsDraft: number; bidsSubmitted: number; contractsActive: number };
  todo: HomeTodo[];
  todoTotal: number;
  tenders: Array<{
    id: string;
    title: string;
    reference?: string | null;
    buyer?: string | null;
    bidDeadline?: string | null;
    invited: boolean;
    bid: 'none' | 'draft' | 'submitted';
    espd: boolean;
  }>;
  contracts: Array<{
    id: string;
    title: string;
    reference?: string | null;
    buyer?: string | null;
    endDate?: string | null;
    deliveryStatus: string;
  }>;
  deadlines: HomeDeadline[];
};

const STATUS_TONE: Record<string, 'green' | 'yellow' | 'red' | 'orange'> = {
  approved: 'green',
  pending: 'yellow',
  rejected: 'red',
  requalification_required: 'orange'
};

/**
 * Supplier Home: what needs the supplier now (profile, complements, bids, deliveries), the tenders open
 * for bids, the contracts in progress and the next dates. Sized to fit a laptop screen without scrolling.
 */
export function SupplierOverviewTab({
  data,
  loading,
  onNavigate
}: {
  data: DashboardData | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  const { t } = useTranslation();
  const [home, setHome] = useState<SupplierHomeData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/supplier/home')
      .then((res) => { if (alive) setHome(res.data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) return <EmptyRow>{t('home.loadFailed')}</EmptyRow>;
  if (loading || !data || !home) return <HomeSkeleton />;

  const approved = data.status === 'approved';
  const docs = data.completeness.documents;
  const statusLabel =
    data.status === 'requalification_required' ? t('supplierPortal.requalificationTitle') : t(`common.${data.status}`);

  // Profile matters come first: without an approved profile no tender can be answered.
  const profileTodos: HomeTodo[] = [];
  if (data.status === 'rejected') profileTodos.push({ type: 'profile_rejected', tab: 'profile' });
  else if (data.status === 'requalification_required') profileTodos.push({ type: 'profile_requalify', tab: 'profile' });
  else if (data.status === 'pending' && !data.qualification.profileSubmittedAt) {
    profileTodos.push({ type: data.completeness.readyToSubmit ? 'profile_submit' : 'profile_complete', tab: 'profile', count: data.completeness.percent });
  }
  if (docs.expiredCount > 0) profileTodos.push({ type: 'docs_expired', tab: 'profile', count: docs.expiredCount });
  if (docs.expiringCount > 0) profileTodos.push({ type: 'docs_expiring', tab: 'profile', count: docs.expiringCount });
  const todos = [...profileTodos, ...home.todo];
  const todoTotal = profileTodos.length + home.todoTotal;

  const { counts } = home;

  return (
    <div className="space-y-3">
      <HomeHeader
        title={data.companyName || t('home.supplierTitle')}
        subtitle={t('home.supplierSubtitle')}
        action={
          approved || data.status === 'requalification_required' ? (
            <SupplierQualificationCertificate
              companyName={data.companyName}
              qualificationExpiresAt={data.qualification.qualificationExpiresAt}
              canDownload
            />
          ) : null
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label={t('home.kpi.qualification')}
          value={<StatusBadge tone={STATUS_TONE[data.status] || 'yellow'}>{statusLabel}</StatusBadge>}
          hint={
            approved && data.qualification.qualificationExpiresAt
              ? t('home.validUntil', { date: formatDay(data.qualification.qualificationExpiresAt) })
              : t('home.profilePercent', { percent: data.completeness.percent })
          }
          icon={ShieldCheck}
          accent={approved ? 'green' : 'amber'}
          onClick={() => onNavigate('profile')}
        />
        <KpiTile
          label={t('home.kpi.openTenders')}
          value={counts.openTenders}
          hint={counts.invited ? t('home.kpi.invitedHint', { count: counts.invited }) : undefined}
          icon={Briefcase}
          accent="blue"
          onClick={() => onNavigate('tenders')}
        />
        <KpiTile
          label={t('home.kpi.bids')}
          value={counts.bidsSubmitted}
          hint={counts.bidsDraft ? t('home.kpi.draftsHint', { count: counts.bidsDraft }) : t('home.kpi.submittedHint')}
          icon={FileCheck}
          accent="violet"
          onClick={() => onNavigate('tenders')}
        />
        <KpiTile label={t('home.kpi.contractsActive')} value={counts.contractsActive} icon={ScrollText} accent="green" onClick={() => onNavigate('contracts')} />
      </div>

      <div className="grid lg:grid-cols-5 gap-3 items-start">
        <div className="lg:col-span-3 space-y-3 min-w-0">
          <HomePanel
            title={t('home.tendersTitle')}
            action={<PanelLink label={t('home.viewAll')} onClick={() => onNavigate('tenders')} />}
          >
            {home.tenders.length === 0 ? (
              <EmptyRow>{approved ? t('home.tendersEmpty') : t('home.tendersLocked')}</EmptyRow>
            ) : (
              home.tenders.slice(0, 5).map((p) => (
                <HomeRow
                  key={p.id}
                  onClick={() => {
                    requestOpenRecord('tender', p.id);
                    onNavigate('tenders');
                  }}
                  title={p.title}
                  meta={[
                    p.reference,
                    p.buyer,
                    p.bidDeadline ? t('home.deadlineOn', { date: formatDay(p.bidDeadline) }) : null
                  ].filter(Boolean).join(' · ')}
                  right={
                    <>
                      {p.invited ? <StatusBadge tone="blue">{t('home.invited')}</StatusBadge> : null}
                      <StatusBadge tone={p.bid === 'submitted' ? 'green' : p.bid === 'draft' ? 'yellow' : 'gray'}>
                        {t(`home.bid.${p.bid}`)}
                      </StatusBadge>
                    </>
                  }
                />
              ))
            )}
          </HomePanel>

          <HomePanel
            title={t('home.contractsTitle')}
            action={<PanelLink label={t('home.viewAll')} onClick={() => onNavigate('contracts')} />}
          >
            {home.contracts.length === 0 ? (
              <EmptyRow>{t('home.contractsEmpty')}</EmptyRow>
            ) : (
              home.contracts.slice(0, 3).map((c) => (
                <HomeRow
                  key={c.id}
                  onClick={() => {
                    requestOpenRecord('supplierContract', c.id);
                    onNavigate('contracts');
                  }}
                  title={c.title}
                  meta={[c.reference, c.buyer, c.endDate ? t('home.endsOn', { date: formatDay(c.endDate) }) : null].filter(Boolean).join(' · ')}
                  right={
                    <StatusBadge tone={c.deliveryStatus === 'changes_requested' ? 'yellow' : c.deliveryStatus === 'accepted' ? 'green' : 'blue'}>
                      {t(`home.delivery.${c.deliveryStatus}`)}
                    </StatusBadge>
                  }
                />
              ))
            )}
          </HomePanel>
        </div>

        <div className="lg:col-span-2 space-y-3 min-w-0">
          <TodoPanel
            todos={todos}
            total={todoTotal}
            onNavigate={onNavigate}
            onOpen={(item) => {
              if (item.procedureId) requestOpenRecord('tender', item.procedureId);
              else if (item.contractId) requestOpenRecord('supplierContract', item.contractId);
            }}
            limit={4}
          />
          <DeadlinesPanel deadlines={home.deadlines} onNavigate={onNavigate} limit={3} />
        </div>
      </div>
    </div>
  );
}
