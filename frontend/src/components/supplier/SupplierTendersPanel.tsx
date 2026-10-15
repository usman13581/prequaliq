import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Building2, Calendar, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { StatusBadge, RowActionButton } from '../questionnaires/QuestionnaireSlimRow';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { SlideOver } from '../ui/SlideOver';
import { ProcedureQaChat } from '../procedures/ProcedureQaChat';
import { ComplementHistoryThread } from '../procedures/ComplementHistoryThread';
import { procedureStatusLabelKey } from '../../utils/procedureStatus';
import { DynamicFilterBar } from '../search/DynamicFilterBar';
import { emptyFilters, filterValueAsString, type FilterFieldDef, type FilterValues } from '../search/filterTypes';

type TenderCategory =
  | 'all'
  | 'invited'
  | 'watching'
  | 'bidding'
  | 'qa'
  | 'evaluation'
  | 'awarded'
  | 'standstill'
  | 'closed';

function statusTone(status: string): 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'orange' | 'purple' {
  if (status === 'awarded') return 'green';
  if (status === 'standstill') return 'orange';
  if (status === 'closed' || status === 'cancelled') return 'gray';
  if (status === 'evaluation') return 'purple';
  if (status === 'qa_open') return 'yellow';
  if (status === 'bidding' || status === 'published') return 'blue';
  return 'gray';
}

export const SUPPLIER_COMPLEMENT_NAV_KEY = 'prequaliq_supplier_complement_nav';

export type SupplierComplementNavMeta = {
  procedureId?: string;
  complementId?: string;
};

type Procedure = {
  id: string;
  title: string;
  status: string;
  bidDeadline?: string | null;
  referenceNumber?: string | null;
  procuringEntity?: { entityName?: string; city?: string; country?: string };
  questionnaire?: {
    id: string;
    title: string;
    cpvCodeId?: string;
    cpvCode?: { id: string; code: string; description?: string };
  } | null;
  watching?: boolean;
  invited?: boolean;
  awardDecision?: { winner?: { companyName?: string } | null } | null;
  procedureType?: string;
  questionnaireId?: string;
  description?: string;
  qaMessages?: any[];
  myEspd?: {
    id: string;
    submitted?: boolean;
    submittedAt?: string | null;
    exclusionGroundsOk?: boolean;
    declarationText?: string | null;
  } | null;
};

function tenderFilterFields(isHistory: boolean): FilterFieldDef[] {
  const statusOptions = isHistory
    ? [
        { value: 'awarded', labelKey: procedureStatusLabelKey('awarded') },
        { value: 'standstill', labelKey: procedureStatusLabelKey('standstill') },
        { value: 'closed', labelKey: procedureStatusLabelKey('closed') }
      ]
    : [
        { value: 'published', labelKey: procedureStatusLabelKey('published') },
        { value: 'qa_open', labelKey: procedureStatusLabelKey('qa_open') },
        { value: 'bidding', labelKey: procedureStatusLabelKey('bidding') },
        { value: 'evaluation', labelKey: procedureStatusLabelKey('evaluation') }
      ];

  return [
    {
      key: 'keyword',
      type: 'keyword',
      labelKey: 'common.search',
      placeholderKey: 'procedures.searchTenders'
    },
    { key: 'cpvCodeId', type: 'cpv', labelKey: 'savedSearch.cpv' },
    { key: 'nutsCodeId', type: 'nuts', labelKey: 'savedSearch.nuts' },
    { key: 'status', type: 'select', labelKey: 'common.status', options: statusOptions }
  ];
}

type Complement = {
  id: string;
  message: string;
  status: string;
  deadline?: string | null;
  responseText?: string | null;
  procedure?: { id: string; title: string };
  messages?: any[];
  history?: any[];
  createdAt?: string;
};

function pendingComplementsForProcedure(complements: Complement[], procedureId: string) {
  return complements.filter((c) => c.procedure?.id === procedureId && c.status === 'open');
}

export function SupplierTendersPanel({
  onOpenQuestionnaire,
  accountApproved = true,
  mode = 'open'
}: {
  onOpenQuestionnaire?: (questionnaireId: string, procedureId: string) => void;
  accountApproved?: boolean;
  /** open = active tenders; history = awarded / standstill / closed */
  mode?: 'open' | 'history';
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { enabled } = useEntitlement('tender.search_watch');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [myComplements, setMyComplements] = useState<Complement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [complementFocus, setComplementFocus] = useState<{ procedureId: string; title: string } | null>(null);
  const [qaBody, setQaBody] = useState('');
  const [category, setCategory] = useState<TenderCategory>('all');
  const [espdSaving, setEspdSaving] = useState(false);
  const isHistory = mode === 'history';
  const savedSearchScope = isHistory ? 'supplier.tenders.history' : 'supplier.tenders';
  const filterFields = useMemo(() => tenderFilterFields(isHistory), [isHistory]);
  const [filters, setFilters] = useState<FilterValues>(() => emptyFilters(filterFields));

  useEffect(() => {
    setFilters(emptyFilters(tenderFilterFields(isHistory)));
    setCategory('all');
  }, [isHistory]);

  const load = async (activeFilters: FilterValues = filters) => {
    try {
      setLoading(true);
      const params: Record<string, string> = { scope: isHistory ? 'history' : 'open' };
      const keyword = filterValueAsString(activeFilters, 'keyword').trim();
      const cpvCodeId = filterValueAsString(activeFilters, 'cpvCodeId');
      const status = filterValueAsString(activeFilters, 'status');
      if (keyword) params.q = keyword;
      if (cpvCodeId) params.cpvCodeId = cpvCodeId;
      if (status) params.status = status;

      const [res, cRes] = await Promise.all([
        api.get('/procedures/published', { params }),
        api.get('/procedures/complements/mine').catch(() => ({ data: { complements: [] } }))
      ]);
      setProcedures(res.data.procedures || []);
      setMyComplements(cRes.data.complements || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadProcedures'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    const handle = window.setTimeout(() => {
      load(filters);
    }, 280);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode, filters.keyword, filters.cpvCodeId, filters.status]);

  useEffect(() => {
    if (!enabled || loading) return;

    const consumeComplementNav = () => {
      const raw = sessionStorage.getItem(SUPPLIER_COMPLEMENT_NAV_KEY);
      if (!raw) return;
      let meta: SupplierComplementNavMeta;
      try {
        meta = JSON.parse(raw);
      } catch {
        sessionStorage.removeItem(SUPPLIER_COMPLEMENT_NAV_KEY);
        return;
      }
      const procedureId =
        meta.procedureId ||
        myComplements.find((c) => c.id === meta.complementId)?.procedure?.id;
      if (!procedureId) return;
      sessionStorage.removeItem(SUPPLIER_COMPLEMENT_NAV_KEY);
      const match = myComplements.find((c) => c.procedure?.id === procedureId);
      setComplementFocus({
        procedureId,
        title: match?.procedure?.title || procedures.find((p) => p.id === procedureId)?.title || ''
      });
    };

    consumeComplementNav();
    const onNav = () => consumeComplementNav();
    window.addEventListener('supplier-complement-nav', onNav);
    return () => window.removeEventListener('supplier-complement-nav', onNav);
  }, [enabled, loading, myComplements, procedures, t]);

  useEffect(() => {
    if (!selected?.id) return;
    let cancelled = false;
    const refreshQa = async () => {
      try {
        const res = await api.get(`/procedures/${selected.id}`);
        if (cancelled) return;
        const qaMessages = res.data.procedure?.qaMessages;
        setSelected((prev: any) => (prev && prev.id === selected.id ? { ...prev, qaMessages } : prev));
      } catch {
        /* ignore polling errors */
      }
    };
    const intervalId = window.setInterval(refreshQa, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selected?.id]);

  const open = async (id: string) => {
    try {
      const res = await api.get(`/procedures/${id}`);
      setSelected(res.data.procedure);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadProcedure'), 'error');
    }
  };

  const openComplementSlideOver = (procedureId: string, title?: string) => {
    const proc = procedures.find((p) => p.id === procedureId);
    setComplementFocus({
      procedureId,
      title: title || proc?.title || t('procedures.complementRequests')
    });
  };

  const postQa = async () => {
    if (!selected || !qaBody.trim()) return;
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      return;
    }
    try {
      await api.post(`/procedures/${selected.id}/qa`, { body: qaBody.trim() });
      setQaBody('');
      showToast(t('msg.qaPosted'), 'success');
      open(selected.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedPostQa'), 'error');
    }
  };

  const toggleFollow = async () => {
    if (!selected) return;
    try {
      const res = await api.post(`/procedures/${selected.id}/watch`);
      const watching = Boolean(res.data.watching);
      setSelected((prev: any) => (prev ? { ...prev, watching } : prev));
      setProcedures((prev) =>
        prev.map((p) => (p.id === selected.id ? { ...p, watching } : p))
      );
      showToast(watching ? t('procedures.watchingOn') : t('procedures.watchingOff'), 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateProcedure'), 'error');
    }
  };

  const submitEspd = async () => {
    if (!selected) return;
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      return;
    }
    try {
      setEspdSaving(true);
      const res = await api.put(`/procedures/${selected.id}/espd`, {
        exclusionGroundsOk: true,
        declarationText: t('procedures.espdDefaultDeclaration')
      });
      const espd = res.data.espd;
      setSelected((prev: any) =>
        prev
          ? {
              ...prev,
              myEspd: espd
                ? {
                    id: espd.id,
                    submitted: Boolean(espd.submittedAt),
                    submittedAt: espd.submittedAt,
                    exclusionGroundsOk: espd.exclusionGroundsOk,
                    declarationText: espd.declarationText
                  }
                : {
                    id: 'local',
                    submitted: true,
                    submittedAt: new Date().toISOString(),
                    exclusionGroundsOk: true
                  }
            }
          : prev
      );
      showToast(t('procedures.espdSaved'), 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
    } finally {
      setEspdSaving(false);
    }
  };

  const replyComplement = async (complementId: string, message: string, files: File[]) => {
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      throw new Error('blocked');
    }
    try {
      const form = new FormData();
      if (message) form.append('responseText', message);
      if (message) form.append('message', message);
      files.forEach((f) => form.append('files', f));
      try {
        await api.post(`/procedures/complements/${complementId}/messages`, form);
      } catch {
        await api.put(`/procedures/complements/${complementId}/respond`, form);
      }
      showToast(t('procedures.complementResponded'), 'success');
      await load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
      throw error;
    }
  };

  const filtered = useMemo(() => {
    return procedures.filter((p) => {
      if (category === 'invited' && !p.invited) return false;
      if (category === 'watching' && !p.watching) return false;
      if (category === 'bidding' && !['published', 'bidding'].includes(p.status)) return false;
      if (category === 'qa' && p.status !== 'qa_open') return false;
      if (category === 'evaluation' && p.status !== 'evaluation') return false;
      if (category === 'awarded' && p.status !== 'awarded') return false;
      if (category === 'standstill' && p.status !== 'standstill') return false;
      if (category === 'closed' && p.status !== 'closed') return false;
      return true;
    });
  }, [procedures, category]);

  const pager = useListPagination(filtered);

  const categoryChips: { id: TenderCategory; label: string; count: number }[] = isHistory
    ? [
        { id: 'all', label: t('procedures.categoryAll'), count: procedures.length },
        {
          id: 'awarded',
          label: t(procedureStatusLabelKey('awarded')),
          count: procedures.filter((p) => p.status === 'awarded').length
        },
        {
          id: 'standstill',
          label: t(procedureStatusLabelKey('standstill')),
          count: procedures.filter((p) => p.status === 'standstill').length
        },
        {
          id: 'closed',
          label: t(procedureStatusLabelKey('closed')),
          count: procedures.filter((p) => p.status === 'closed').length
        }
      ]
    : [
        { id: 'all', label: t('procedures.categoryAll'), count: procedures.length },
        { id: 'invited', label: t('procedures.invitedBadge'), count: procedures.filter((p) => p.invited).length },
        { id: 'watching', label: t('procedures.watchingBadge'), count: procedures.filter((p) => p.watching).length },
        {
          id: 'bidding',
          label: t(procedureStatusLabelKey('bidding')),
          count: procedures.filter((p) => ['published', 'bidding'].includes(p.status)).length
        },
        {
          id: 'qa',
          label: t(procedureStatusLabelKey('qa_open')),
          count: procedures.filter((p) => p.status === 'qa_open').length
        },
        {
          id: 'evaluation',
          label: t(procedureStatusLabelKey('evaluation')),
          count: procedures.filter((p) => p.status === 'evaluation').length
        }
      ];

  const complementButton = (procedureId: string, title?: string) => {
    if (pendingComplementsForProcedure(myComplements, procedureId).length === 0) return null;
    return (
      <button
        type="button"
        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-white animate-pulse shadow-sm hover:bg-amber-600"
        onClick={(e) => {
          e.stopPropagation();
          openComplementSlideOver(procedureId, title);
        }}
      >
        {t('procedures.complementRequests')}
      </button>
    );
  };

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted">
        {t('procedures.notEnabled')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isHistory ? (
        <div>
          <h2 className="text-base font-bold text-foreground">{t('procedures.supplierTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('procedures.supplierSubtitle')}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-base font-bold text-foreground">{t('procedures.historyTendersTitle')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('procedures.historyTendersSubtitle')}</p>
        </div>
      )}

      <DynamicFilterBar
        scope={savedSearchScope}
        fields={filterFields}
        values={filters}
        onChange={setFilters}
      />

      <div className="flex flex-wrap gap-2">
        {categoryChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setCategory(chip.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              category === chip.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-foreground border-border hover:bg-surface'
            }`}
          >
            {chip.label}
            <span className={category === chip.id ? 'opacity-90' : 'text-muted'}>{chip.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">
            {isHistory ? t('procedures.emptyHistoryTenders') : t('procedures.emptyPublished')}
          </div>
        ) : (
          <>
            {pager.paginatedItems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p.id)}
                className="w-full text-left rounded-2xl border border-border bg-white hover:border-primary-300 hover:shadow-md transition-all p-4 sm:p-5 group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(p.status)}>{t(procedureStatusLabelKey(p.status))}</StatusBadge>
                      {p.invited ? <StatusBadge tone="purple">{t('procedures.invitedBadge')}</StatusBadge> : null}
                      {p.watching ? <StatusBadge tone="green">{t('procedures.watchingBadge')}</StatusBadge> : null}
                      {p.referenceNumber ? (
                        <span className="text-xs text-muted font-medium truncate">{p.referenceNumber}</span>
                      ) : null}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary-700">
                      {p.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                      {p.procuringEntity?.entityName ? (
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <Building2 size={14} className="shrink-0" />
                          <span className="truncate">{p.procuringEntity.entityName}</span>
                        </span>
                      ) : null}
                      {p.bidDeadline ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="shrink-0" />
                          {t('columns.deadline')}: {p.bidDeadline}
                        </span>
                      ) : null}
                      {isHistory && p.awardDecision?.winner?.companyName ? (
                        <span className="text-xs font-medium text-green-800">
                          {t('procedures.winner')}: {p.awardDecision.winner.companyName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {complementButton(p.id, p.title)}
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
              itemLabel={t('procedures.navTenders').toLowerCase()}
            />
          </>
        )}
      </div>

      <SlideOver
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ''}
        subtitle={selected?.procuringEntity?.entityName}
        widthClass="max-w-2xl"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-foreground whitespace-pre-wrap flex-1 min-w-0">
                {selected.description || selected.procuringEntity?.entityName || '—'}
              </p>
              <RowActionButton
                variant={selected.watching ? 'secondary' : 'muted'}
                onClick={() => toggleFollow()}
              >
                {selected.watching ? <Bell className="w-3.5 h-3.5 fill-current" /> : <BellOff className="w-3.5 h-3.5" />}
                {selected.watching ? t('procedures.unfollow') : t('procedures.follow')}
              </RowActionButton>
            </div>
            {pendingComplementsForProcedure(myComplements, selected.id).length > 0 ? (
              <div>{complementButton(selected.id, selected.title)}</div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {selected.questionnaireId && onOpenQuestionnaire ? (
                <button
                  type="button"
                  className="btn-save px-4 py-2 rounded-xl text-sm font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!accountApproved) {
                      showToast(t('accountStatus.actionBlocked'), 'warning');
                      return;
                    }
                    onOpenQuestionnaire(selected.questionnaireId, selected.id);
                    setSelected(null);
                  }}
                >
                  {t('procedures.openBid')}
                </button>
              ) : null}
              {selected.myEspd?.submitted ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">✓</span>
                    <span>
                      {t('procedures.espdSubmitted')}
                      {selected.myEspd.submittedAt
                        ? ` · ${t('procedures.espdSubmittedAt', {
                            date: new Date(selected.myEspd.submittedAt).toLocaleString()
                          })}`
                        : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-cancel px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    disabled={espdSaving}
                    onClick={(e) => {
                      e.stopPropagation();
                      submitEspd();
                    }}
                  >
                    {t('procedures.espdResubmit')}
                  </button>
                  <p className="text-xs text-muted sm:max-w-xs">{t('procedures.espdSubmittedHint')}</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-approve px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  disabled={espdSaving}
                  onClick={(e) => {
                    e.stopPropagation();
                    submitEspd();
                  }}
                >
                  {espdSaving ? t('common.loading') : t('procedures.submitEspd')}
                </button>
              )}
              {selected.procedureType === 'dis' ? (
                <button
                  type="button"
                  className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                  disabled={!accountApproved}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await api.post(`/contracts/dis/${selected.id}/apply`);
                      showToast(t('procedures.disApplied'), 'success');
                    } catch (error: any) {
                      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                    }
                  }}
                >
                  {t('procedures.applyDis')}
                </button>
              ) : null}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold">{t('procedures.tabs.qa')}</h4>
              <ProcedureQaChat
                mode="supplier"
                messages={selected.qaMessages || []}
                body={qaBody}
                onBodyChange={setQaBody}
                onSend={() => {
                  if (!accountApproved) {
                    showToast(t('accountStatus.actionBlocked'), 'warning');
                    return;
                  }
                  postQa();
                }}
              />
            </div>
          </div>
        ) : null}
      </SlideOver>

      <SlideOver
        open={!!complementFocus}
        onClose={() => setComplementFocus(null)}
        title={t('procedures.complementRequests')}
        subtitle={complementFocus?.title}
        widthClass="max-w-2xl"
      >
        {complementFocus ? (
          <ComplementHistoryThread
            mode="supplier"
            complements={myComplements.filter((c) => c.procedure?.id === complementFocus.procedureId)}
            onReply={replyComplement}
            disabled={!accountApproved}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}
