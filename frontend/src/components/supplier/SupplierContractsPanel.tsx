import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Building2, Calendar, ChevronRight, Hash } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { SlideOver } from '../ui/SlideOver';
import { ContractThread, type ContractThreadMessage } from '../contracts/ContractThread';
import { DynamicFilterBar } from '../search/DynamicFilterBar';
import { StatusPills } from '../ui/StatusPills';
import { emptyFilters, filterValueAsString, type FilterFieldDef, type FilterValues } from '../search/filterTypes';

function contractStatusTone(status: string): 'green' | 'yellow' | 'red' | 'gray' | 'blue' {
  if (status === 'active') return 'green';
  if (status === 'expired') return 'yellow';
  if (status === 'terminated') return 'red';
  if (status === 'draft') return 'gray';
  return 'blue';
}

const CONTRACT_FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: 'keyword',
    type: 'keyword',
    labelKey: 'common.search',
    placeholderKey: 'contracts.searchPlaceholder'
  }
];

type Contract = {
  id: string;
  title: string;
  contractType: string;
  status: string;
  deliveryStatus?: string;
  contractNumber?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  notes?: string | null;
  messages?: ContractThreadMessage[];
  procuringEntity?: { entityName?: string } | null;
  procedure?: { id?: string; title?: string; referenceNumber?: string | null } | null;
  terminationReason?: string | null;
  terminatedAt?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'contracts.status.draft',
  active: 'contracts.status.active',
  expired: 'contracts.status.expired',
  terminated: 'contracts.status.terminated'
};

export function SupplierContractsPanel() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { enabled } = useEntitlement('contracts.repository');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [detail, setDetail] = useState<Contract | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(() => emptyFilters(CONTRACT_FILTER_FIELDS));

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const statusPills = useMemo(
    () =>
      ['all', 'draft', 'active', 'expired', 'terminated'].map((id) => ({
        id,
        label: id === 'all' ? t('common.all') : t(`contracts.status.${id}`),
        count: id === 'all' ? contracts.length : contracts.filter((c) => c.status === id).length
      })),
    [contracts, t]
  );

  const filtered = useMemo(() => {
    const q = filterValueAsString(filters, 'keyword').trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.title?.toLowerCase().includes(q) ||
        (c.contractNumber || '').toLowerCase().includes(q) ||
        (c.procuringEntity?.entityName || '').toLowerCase().includes(q) ||
        (c.procedure?.title || '').toLowerCase().includes(q)
      );
    });
  }, [contracts, filters, statusFilter]);

  const pager = useListPagination(filtered);

  /** silent: background refresh of an open contract (new messages) without the loading state. */
  const loadDetail = async (id: string, silent = false) => {
    try {
      if (!silent) setDetailLoading(true);
      const res = await api.get(`/contracts/${id}`, { silentBusy: true });
      setDetail(res.data.contract || null);
    } catch (error: any) {
      if (silent) return;
      showToast(error.response?.data?.message || t('msg.failedLoadContracts'), 'error');
      setDetail(null);
    } finally {
      if (!silent) setDetailLoading(false);
    }
  };

  const openContract = (c: Contract) => {
    setSelected(c);
    setDetail(null);
    loadDetail(c.id);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contracts/supplier-mine');
      setContracts(res.data.contracts || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadContracts'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted">
        {t('contracts.notEnabled')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-foreground">{t('contracts.supplierTitle')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('contracts.supplierSubtitle')}</p>
      </div>

      <DynamicFilterBar
        scope="supplier.contracts"
        fields={CONTRACT_FILTER_FIELDS}
        values={filters}
        onChange={setFilters}
      />

      <StatusPills pills={statusPills} value={statusFilter} onChange={setStatusFilter} />

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : contracts.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">
            {t('contracts.empty')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">
            {t('common.noResults')}
          </div>
        ) : (
          <>
            {pager.paginatedItems.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openContract(c)}
                className="w-full text-left rounded-2xl border border-border bg-white hover:border-primary-300 hover:shadow-md transition-all p-4 sm:p-5 group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={contractStatusTone(c.status)}>
                        {t(STATUS_LABEL[c.status] || 'contracts.status.draft')}
                      </StatusBadge>
                      <StatusBadge tone="blue">
                        {t(`contracts.types.${c.contractType}`, { defaultValue: c.contractType })}
                      </StatusBadge>
                      {c.contractNumber ? (
                        <span className="text-xs text-muted font-medium truncate inline-flex items-center gap-1">
                          <Hash size={12} className="shrink-0" />
                          {c.contractNumber}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary-700">
                      {c.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                      {c.procuringEntity?.entityName ? (
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <Building2 size={14} className="shrink-0" />
                          <span className="truncate">{c.procuringEntity.entityName}</span>
                        </span>
                      ) : null}
                      {c.procedure?.title ? (
                        <span className="truncate text-xs font-medium">{c.procedure.title}</span>
                      ) : null}
                      {c.endDate ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="shrink-0" />
                          {t('common.end')}: {c.endDate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                      {t('common.view')}
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
            <ListPagination
              page={pager.page}
              pageSize={pager.pageSize}
              total={pager.total}
              onPageChange={pager.setPage}
              onPageSizeChange={pager.setPageSize}
              itemLabel={t('contracts.nav').toLowerCase()}
            />
          </>
        )}
      </div>

      <SlideOver
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setDetail(null);
        }}
        title={selected?.title || ''}
        subtitle={selected?.procuringEntity?.entityName}
        widthClass="max-w-full lg:max-w-[62%]"
      >
        {selected ? (() => {
          const current = detail || selected;
          return (
            <div className="space-y-4 text-sm">
              {current.status === 'terminated' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-bold text-red-800 inline-flex items-center gap-1.5">
                    <Ban size={15} /> {t('contracts.end.endedTitle')}
                    {current.terminatedAt ? (
                      <span className="font-normal text-xs text-red-700">
                        · {new Date(current.terminatedAt).toLocaleDateString()}
                      </span>
                    ) : null}
                  </p>
                  {current.terminationReason ? (
                    <p className="mt-1 text-sm text-red-900 whitespace-pre-wrap">
                      <span className="font-semibold">{t('contracts.end.reasonLabel')}:</span> {current.terminationReason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <section className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('contracts.fixed.supplierTitle')}</p>
                  <StatusBadge tone={contractStatusTone(current.status)}>
                    {t(STATUS_LABEL[current.status] || 'contracts.status.draft')}
                  </StatusBadge>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    { label: t('contracts.number'), value: current.contractNumber },
                    {
                      label: t('common.type'),
                      value: t(`contracts.types.${current.contractType}`, { defaultValue: current.contractType })
                    },
                    { label: t('contracts.buyerField'), value: current.procuringEntity?.entityName },
                    {
                      label: t('procedures.nav'),
                      value: current.procedure?.title
                        ? [current.procedure.referenceNumber, current.procedure.title].filter(Boolean).join(' · ')
                        : null
                    },
                    { label: t('common.start'), value: current.startDate },
                    { label: t('common.end'), value: current.endDate }
                  ].map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className="text-xs text-muted">{row.label}</dt>
                      <dd className="text-sm font-semibold text-foreground break-words">{row.value || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {current.notes ? (
                  <p className="mt-3 pt-3 border-t border-border whitespace-pre-wrap text-foreground">{current.notes}</p>
                ) : null}
              </section>

              {detailLoading ? (
                <p className="text-sm text-muted">{t('common.loading')}</p>
              ) : detail ? (
                <ContractThread
                  contractId={detail.id}
                  messages={detail.messages || []}
                  deliveryStatus={detail.deliveryStatus || 'none'}
                  mode="supplier"
                  contractStatus={detail.status}
                  readOnly={detail.status !== 'active'}
                  onUpdated={() => {
                    loadDetail(detail.id, true);
                    load();
                  }}
                  onRefresh={() => loadDetail(detail.id, true)}
                />
              ) : null}
            </div>
          );
        })() : null}
      </SlideOver>
    </div>
  );
}
