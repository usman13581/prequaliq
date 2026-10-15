import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, MessageSquare, Trophy, ClipboardList, AlertCircle, Calendar, ChevronRight, Hash } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { QuestionnaireSlimRow, StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { SlideOver, CenterModal } from '../ui/SlideOver';
import { ProcedureQaChat } from '../procedures/ProcedureQaChat';
import { ComplementHistoryThread } from '../procedures/ComplementHistoryThread';
import { procedureStatusLabelKey } from '../../utils/procedureStatus';
import { DateOnlyPicker } from '../DateOnlyPicker';
import { BrandSelect } from '../ui/BrandSelect';

type Procedure = {
  id: string;
  title: string;
  referenceNumber?: string | null;
  procedureType: string;
  status: string;
  bidDeadline?: string | null;
  qaDeadline?: string | null;
  description?: string | null;
  questionnaireId?: string | null;
  questionnaire?: { id: string; title: string } | null;
  awardDecision?: { winner?: { companyName: string } | null; standstillEndsAt?: string | null } | null;
  isSealed?: boolean;
  announcementText?: string | null;
};

type QaMessage = {
  id: string;
  body: string;
  authorRole: string;
  author?: { firstName?: string; lastName?: string };
  createdAt: string;
  threadSupplierId?: string | null;
};

type Evaluation = {
  id: string;
  supplierId: string;
  score?: number | string | null;
  notes?: string | null;
  supplier?: { id: string; companyName: string };
};

type Complement = {
  id: string;
  message: string;
  status: string;
  deadline?: string | null;
  responseText?: string | null;
  supplier?: { id: string; companyName: string };
  messages?: any[];
  history?: any[];
  createdAt?: string;
};

const UNDERLAG_EDIT_STATUSES = ['draft', 'planned', 'underlag_ready'];
const UNPUBLISHABLE_STATUSES = ['published', 'qa_open', 'bidding'];

const STATUS_TONE: Record<string, 'gray' | 'blue' | 'yellow' | 'green' | 'orange' | 'purple' | 'red'> = {
  draft: 'gray',
  planned: 'blue',
  underlag_ready: 'blue',
  published: 'green',
  qa_open: 'purple',
  bidding: 'yellow',
  evaluation: 'orange',
  awarded: 'green',
  standstill: 'orange',
  closed: 'gray',
  cancelled: 'red'
};

export function ProceduresPanel({ accountApproved = true }: { accountApproved?: boolean }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { enabled } = useEntitlement('tender.procedure_setup');
  const { enabled: canPublish } = useEntitlement('tender.publish');
  const { enabled: canAward } = useEntitlement('tender.award');
  const { enabled: canEval } = useEntitlement('evaluation.scoring');
  const { enabled: canComplements } = useEntitlement('tender.complements');
  const { enabled: canRequirements } = useEntitlement('tender.requirements');
  const { enabled: canQa } = useEntitlement('tender.qa');
  const { enabled: canAiQa } = useEntitlement('ai.qa_draft_replies');
  const { enabled: canAiEval } = useEntitlement('ai.evaluation_copilot');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState<'plan' | 'underlag' | 'qa' | 'eval' | 'award' | 'complements'>('plan');
  const [form, setForm] = useState({
    title: '',
    referenceNumber: '',
    procedureType: 'open',
    description: '',
    bidDeadline: '',
    qaDeadline: '',
    plannedPublishAt: ''
  });
  const [qaBody, setQaBody] = useState('');
  const [qaThreadSupplierId, setQaThreadSupplierId] = useState<string | null>(null);
  const [evalForm, setEvalForm] = useState({ supplierId: '', score: '', notes: '' });
  const [awardForm, setAwardForm] = useState({ winnerSupplierId: '', decisionMemo: '', standstillEndsAt: '' });
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; companyName: string; email?: string | null; cpvMatched?: boolean }>
  >([]);
  const [inviteSupplierIds, setInviteSupplierIds] = useState<string[]>([]);
  const [inviteShowAll, setInviteShowAll] = useState(false);
  const [inviteCpvId, setInviteCpvId] = useState<string | null>(null);
  const [complements, setComplements] = useState<Complement[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    total
  } = useListPagination(procedures);

  const load = async () => {
    try {
      setLoading(true);
      const [procRes, qRes] = await Promise.all([
        api.get('/procedures/mine'),
        api.get('/questionnaires')
      ]);
      setProcedures(procRes.data.procedures || []);
      setQuestionnaires((qRes.data.questionnaires || []).map((q: any) => ({ id: q.id, title: q.title })));
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadProcedures'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!detail?.id || tab !== 'qa') return;
    let cancelled = false;
    const refreshQa = async () => {
      try {
        const res = await api.get(`/procedures/${detail.id}`);
        if (cancelled) return;
        const procedure = res.data.procedure;
        setDetail((prev: any) =>
          prev && prev.id === procedure.id
            ? { ...prev, qaMessages: procedure.qaMessages, qaThreads: procedure.qaThreads }
            : prev
        );
      } catch {
        /* ignore polling errors */
      }
    };
    const intervalId = window.setInterval(refreshQa, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [detail?.id, tab]);

  const loadInviteCandidates = async (cpvCodeId: string | null, showAll: boolean, preselectMatched: boolean) => {
    try {
      const params: Record<string, string> = {};
      if (cpvCodeId && !showAll) params.cpvCodeId = cpvCodeId;
      const sRes = await api.get('/procuring-entity/suppliers-invite-candidates', { params });
      const matched = Boolean(cpvCodeId && !showAll);
      const list = (sRes.data.suppliers || []).map((s: any) => ({
        id: s.id,
        companyName: s.companyName,
        email: s.email,
        cpvMatched: matched
      }));
      setSuppliers(list);
      if (preselectMatched && matched && list.length) {
        setInviteSupplierIds(list.map((s: { id: string }) => s.id));
      }
      if (matched && list.length === 0) {
        // Fall back to all approved so buyer can still invite
        const allRes = await api.get('/procuring-entity/suppliers-invite-candidates');
        setSuppliers(
          (allRes.data.suppliers || []).map((s: any) => ({
            id: s.id,
            companyName: s.companyName,
            email: s.email,
            cpvMatched: false
          }))
        );
        setInviteShowAll(true);
      }
    } catch {
      setSuppliers([]);
    }
  };

  const openDetail = async (id: string, preferTab?: typeof tab) => {
    try {
      const res = await api.get(`/procedures/${id}`);
      const procedure = res.data.procedure;
      setDetail(procedure);
      setTab(preferTab || 'plan');
      setInviteSupplierIds([]);
      setInviteShowAll(false);
      setQaBody('');
      const threads = procedure.qaThreads || [];
      setQaThreadSupplierId((prev) => {
        if (prev && threads.some((th: any) => th.supplierId === prev)) return prev;
        return threads[0]?.supplierId || null;
      });
      const cpvFromUnderlag = procedure.questionnaire?.cpvCodeId || procedure.questionnaire?.cpvCode?.id || null;
      setInviteCpvId(cpvFromUnderlag);
      await loadInviteCandidates(cpvFromUnderlag, false, Boolean(cpvFromUnderlag));
      try {
        const cRes = await api.get(`/procedures/${id}/complements`);
        setComplements(cRes.data.complements || []);
      } catch {
        setComplements([]);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadProcedure'), 'error');
    }
  };

  const create = async () => {
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      return;
    }
    if (!form.title.trim()) return;
    try {
      const res = await api.post('/procedures', form);
      showToast(t('msg.procedureCreated'), 'success');
      setForm({
        title: '',
        referenceNumber: '',
        procedureType: 'open',
        description: '',
        bidDeadline: '',
        qaDeadline: '',
        plannedPublishAt: ''
      });
      setCreateOpen(false);
      await load();
      openDetail(res.data.procedure.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateProcedure'), 'error');
    }
  };

  const savePlan = async () => {
    if (!detail) return;
    try {
      await api.put(`/procedures/${detail.id}`, {
        title: detail.title,
        referenceNumber: detail.referenceNumber,
        procedureType: detail.procedureType,
        description: detail.description,
        bidDeadline: detail.bidDeadline,
        qaDeadline: detail.qaDeadline,
        plannedPublishAt: detail.plannedPublishAt,
        status: detail.status === 'draft' ? 'planned' : detail.status
      });
      showToast(t('msg.procedureUpdated'), 'success');
      load();
      openDetail(detail.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateProcedure'), 'error');
    }
  };

  const linkUnderlag = async (questionnaireId: string) => {
    if (!detail) return;
    try {
      await api.put(`/procedures/${detail.id}/underlag`, { questionnaireId: questionnaireId || null });
      showToast(t('msg.underlagLinked'), 'success');
      openDetail(detail.id);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLinkUnderlag'), 'error');
    }
  };

  const postQa = async () => {
    if (!detail || !qaBody.trim() || !qaThreadSupplierId) return;
    try {
      await api.post(`/procedures/${detail.id}/qa`, {
        body: qaBody.trim(),
        threadSupplierId: qaThreadSupplierId
      });
      setQaBody('');
      showToast(t('msg.qaPosted'), 'success');
      openDetail(detail.id, 'qa');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedPostQa'), 'error');
    }
  };

  const saveEval = async () => {
    if (!detail || !evalForm.supplierId) return;
    try {
      await api.put(`/procedures/${detail.id}/evaluations`, {
        supplierId: evalForm.supplierId,
        score: evalForm.score === '' ? null : Number(evalForm.score),
        notes: evalForm.notes
      });
      showToast(t('msg.evaluationSaved'), 'success');
      setEvalForm({ supplierId: '', score: '', notes: '' });
      openDetail(detail.id, 'eval');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSaveEvaluation'), 'error');
    }
  };

  const saveAward = async () => {
    if (!detail) return;
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      return;
    }
    try {
      const res = await api.put(`/procedures/${detail.id}/award`, {
        winnerSupplierId: awardForm.winnerSupplierId || null,
        decisionMemo: awardForm.decisionMemo,
        standstillEndsAt: awardForm.standstillEndsAt || null
      });
      showToast(
        res.data.contract ? t('contracts.createdFromAward') : t('msg.awardSaved'),
        'success'
      );
      openDetail(detail.id);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSaveAward'), 'error');
    }
  };

  const publishMissingRequirements = (proc: Procedure | null | undefined): string[] => {
    if (!proc) return [];
    const missing: string[] = [];
    if (!proc.questionnaireId) missing.push(t('procedures.publishNeedsUnderlag'));
    if (!proc.bidDeadline) missing.push(t('procedures.publishNeedsBidDeadline'));
    if (proc.procedureType !== 'direct' && !proc.qaDeadline) {
      missing.push(t('procedures.publishNeedsQaDeadline'));
    }
    return missing;
  };

  const publishBlockedReason = detail
    ? (() => {
        const missing = publishMissingRequirements(detail);
        if (missing.length) return missing.join('. ');
        if (detail.procedureType === 'direct' && inviteSupplierIds.length === 0) {
          return t('procedures.directInformRequired');
        }
        if (!accountApproved) return t('accountStatus.actionBlocked');
        return '';
      })()
    : '';
  const canClickPublish = !!detail && !publishBlockedReason;

  const unpublish = async () => {
    if (!detail) return;
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      return;
    }
    try {
      await api.post(`/procedures/${detail.id}/unpublish`);
      showToast(t('procedures.unpublished'), 'success');
      openDetail(detail.id);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateProcedure'), 'error');
    }
  };

  const publish = async () => {
    if (!detail) return;
    if (!accountApproved) {
      showToast(t('accountStatus.actionBlocked'), 'warning');
      return;
    }
    const missing = publishMissingRequirements(detail);
    if (missing.length) {
      showToast(missing[0], 'warning');
      return;
    }
    if (detail.procedureType === 'direct' && inviteSupplierIds.length === 0) {
      showToast(t('procedures.directInformRequired'), 'warning');
      return;
    }
    try {
      const res = await api.post(`/procedures/${detail.id}/publish`, {
        announcementText: detail.announcementText || detail.description || '',
        isSealed: true,
        supplierIds: inviteSupplierIds
      });
      showToast(
        res.data.invitedCount
          ? t('procedures.publishedWithInvites', { count: res.data.invitedCount })
          : t('msg.procedureUpdated'),
        'success'
      );
      openDetail(detail.id);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateProcedure'), 'error');
    }
  };

  const refreshComplements = async (procedureId: string) => {
    const cRes = await api.get(`/procedures/${procedureId}/complements`);
    setComplements(cRes.data.complements || []);
  };

  useEffect(() => {
    if (!detail?.id || tab !== 'complements') return;
    const refresh = () => {
      refreshComplements(detail.id).catch(() => {});
    };
    refresh();
    const intervalId = window.setInterval(refresh, 15000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.id, tab]);

  const requestComplement = async (payload: {
    supplierId: string;
    message: string;
    deadline: string;
    files: File[];
  }) => {
    if (!detail) return;
    try {
      const form = new FormData();
      form.append('supplierId', payload.supplierId);
      form.append('message', payload.message);
      if (payload.deadline) form.append('deadline', payload.deadline);
      payload.files.forEach((f) => form.append('files', f));
      await api.post(`/procedures/${detail.id}/complements`, form);
      showToast(t('procedures.complementRequested'), 'success');
      await refreshComplements(detail.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
      throw error;
    }
  };

  const replyComplement = async (complementId: string, message: string, files: File[]) => {
    if (!detail) return;
    try {
      const form = new FormData();
      if (message) form.append('message', message);
      files.forEach((f) => form.append('files', f));
      await api.post(`/procedures/complements/${complementId}/messages`, form);
      showToast(t('procedures.complementResponded'), 'success');
      await refreshComplements(detail.id);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
      throw error;
    }
  };

  const toggleInviteSupplier = (id: string) => {
    setInviteSupplierIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted">
        {t('procedures.notEnabled')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">{t('procedures.title')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('procedures.subtitle')}</p>
        </div>
        <button
          type="button"
          disabled={!accountApproved}
          onClick={() => setCreateOpen(true)}
          className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          <Plus size={14} /> {t('procedures.create')}
        </button>
      </div>

      {!accountApproved ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2 items-start text-sm text-amber-900">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          {t('accountStatus.actionBlocked')}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : procedures.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">{t('procedures.empty')}</div>
        ) : (
          <>
            {paginatedItems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openDetail(p.id)}
                className="w-full text-left rounded-2xl border border-border bg-white hover:border-primary-300 hover:shadow-md transition-all p-4 sm:p-5 group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={STATUS_TONE[p.status] || 'gray'}>
                        {t(procedureStatusLabelKey(p.status))}
                      </StatusBadge>
                      {p.procedureType ? (
                        <StatusBadge tone="blue">
                          {t(`procedures.types.${p.procedureType}`, { defaultValue: p.procedureType })}
                        </StatusBadge>
                      ) : null}
                      {p.referenceNumber ? (
                        <span className="text-xs text-muted font-medium truncate inline-flex items-center gap-1">
                          <Hash size={12} className="shrink-0" />
                          {p.referenceNumber}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary-700">
                      {p.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                      {p.bidDeadline ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="shrink-0" />
                          {t('columns.deadline')}: {p.bidDeadline}
                        </span>
                      ) : null}
                      {p.awardDecision?.winner?.companyName ? (
                        <span className="text-xs font-medium text-green-800">
                          {t('procedures.winner')}: {p.awardDecision.winner.companyName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                      {t('buttons.edit')}
                      <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
            <ListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel={t('procedures.nav').toLowerCase()}
            />
          </>
        )}
      </div>

      <CenterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('procedures.create')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</button>
            <button type="button" onClick={create} disabled={!accountApproved} className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{t('procedures.create')}</button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.titleField')}</label>
            <input className="input-brand" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.reference')}</label>
            <input className="input-brand" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.procedureType')}</label>
            <BrandSelect value={form.procedureType} onChange={(e) => setForm({ ...form, procedureType: e.target.value })}>
              {['open', 'restricted', 'negotiated', 'direct', 'framework', 'dis', 'other'].map((v) => (
                <option key={v} value={v}>{t(`procedures.types.${v}`)}</option>
              ))}
            </BrandSelect>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.bidDeadline')}</label>
            <DateOnlyPicker className="input-brand w-full" value={form.bidDeadline} onChange={(bidDeadline) => setForm({ ...form, bidDeadline })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.description')}</label>
            <textarea className="input-brand" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </CenterModal>

      <SlideOver
        open={!!detail}
        onClose={() => { setDetail(null); }}
        title={detail?.title || t('procedures.title')}
        subtitle={detail ? t(procedureStatusLabelKey(detail.status)) : undefined}
        widthClass="max-w-2xl"
        footer={
          detail ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {canPublish && UNDERLAG_EDIT_STATUSES.includes(detail.status) ? (
                <button
                  type="button"
                  className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  disabled={!canClickPublish}
                  title={publishBlockedReason || undefined}
                  onClick={publish}
                >
                  {t('procedures.publish')}
                </button>
              ) : null}
              {canPublish && UNPUBLISHABLE_STATUSES.includes(detail.status) ? (
                <button
                  type="button"
                  className="btn-reject px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                  disabled={!accountApproved}
                  onClick={unpublish}
                >
                  {t('procedures.unpublish')}
                </button>
              ) : null}
              {detail.isSealed ? (
                <button
                  type="button"
                  className="btn-approve px-3 py-1.5 rounded-lg text-xs font-semibold"
                  onClick={async () => {
                    try {
                      await api.post(`/procedures/${detail.id}/unseal`);
                      showToast(t('msg.procedureUpdated'), 'success');
                      openDetail(detail.id);
                      load();
                    } catch (error: any) {
                      showToast(error.response?.data?.message || t('msg.failedUpdateProcedure'), 'error');
                    }
                  }}
                >
                  {t('procedures.unseal')}
                </button>
              ) : null}
              {detail.status !== 'closed' && detail.status !== 'cancelled' ? (
                <button
                  type="button"
                  className="btn-cancel px-3 py-1.5 rounded-lg text-xs font-semibold"
                  onClick={async () => {
                    try {
                      await api.post(`/procedures/${detail.id}/close`, { afterAnnounceText: '' });
                      showToast(t('msg.procedureUpdated'), 'success');
                      openDetail(detail.id);
                      load();
                    } catch (error: any) {
                      showToast(error.response?.data?.message || t('msg.failedUpdateProcedure'), 'error');
                    }
                  }}
                >
                  {t('procedures.close')}
                </button>
              ) : null}
            </div>
          ) : null
        }
      >
        {detail ? (
          <>
          <div
            className="flex gap-1 overflow-x-auto overscroll-x-contain scrollbar-thin mb-4 pb-0.5 -mx-1 px-1"
            role="tablist"
            aria-label={t('procedures.title')}
          >
            {[
              { id: 'plan' as const, label: t('procedures.tabs.plan'), icon: ClipboardList, show: true },
              { id: 'underlag' as const, label: t('procedures.tabs.underlag'), icon: FileText, show: canRequirements },
              { id: 'qa' as const, label: t('procedures.tabs.qa'), icon: MessageSquare, show: canQa },
              { id: 'eval' as const, label: t('procedures.tabs.eval'), icon: ClipboardList, show: canEval },
              { id: 'award' as const, label: t('procedures.tabs.award'), icon: Trophy, show: canAward },
              { id: 'complements' as const, label: t('procedures.tabs.complements'), icon: AlertCircle, show: canComplements }
            ].filter((x) => x.show).map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                    isActive
                      ? 'bg-primary-50 text-primary-800 border-primary-200 shadow-sm'
                      : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={15} className="shrink-0" aria-hidden />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {tab === 'plan' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.titleField')}</label>
                  <input className="input-brand" value={detail.title || ''} onChange={(e) => setDetail({ ...detail, title: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.reference')}</label>
                    <input className="input-brand" value={detail.referenceNumber || ''} onChange={(e) => setDetail({ ...detail, referenceNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.procedureType')}</label>
                    <BrandSelect value={detail.procedureType} onChange={(e) => setDetail({ ...detail, procedureType: e.target.value })}>
                      {['open', 'restricted', 'negotiated', 'direct', 'framework', 'dis', 'other'].map((v) => (
                        <option key={v} value={v}>{t(`procedures.types.${v}`)}</option>
                      ))}
                    </BrandSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.bidDeadline')}</label>
                    <DateOnlyPicker className="input-brand w-full" value={detail.bidDeadline || ''} onChange={(bidDeadline) => setDetail({ ...detail, bidDeadline })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.qaDeadline')}</label>
                    <DateOnlyPicker className="input-brand w-full" value={detail.qaDeadline || ''} onChange={(qaDeadline) => setDetail({ ...detail, qaDeadline })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('procedures.description')}</label>
                  <textarea className="input-brand" rows={3} value={detail.description || ''} onChange={(e) => setDetail({ ...detail, description: e.target.value })} />
                </div>
                {['draft', 'planned', 'underlag_ready'].includes(detail.status) ? (
                  <div className="rounded-xl border border-border p-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{t('procedures.directInform')}</p>
                    <p className="text-xs text-muted">
                      {detail.procedureType === 'direct'
                        ? t('procedures.directInformRequired')
                        : t('procedures.directInformHint')}
                    </p>
                    {inviteCpvId ? (
                      <p className="text-xs text-primary-700">{t('procedures.directInformCpvHint')}</p>
                    ) : (
                      <p className="text-xs text-amber-700">{t('procedures.directInformNoMatch')}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {inviteCpvId ? (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-white hover:bg-slate-50"
                          onClick={() => {
                            const next = !inviteShowAll;
                            setInviteShowAll(next);
                            loadInviteCandidates(inviteCpvId, next, !next);
                          }}
                        >
                          {inviteShowAll ? t('procedures.directInformShowMatched') : t('procedures.directInformShowAll')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-white hover:bg-slate-50"
                        onClick={() => setInviteSupplierIds(suppliers.map((s) => s.id))}
                      >
                        {t('procedures.directInformSelectMatched')}
                      </button>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-white hover:bg-slate-50"
                        onClick={() => setInviteSupplierIds([])}
                      >
                        {t('procedures.directInformClear')}
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {suppliers.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded-lg hover:bg-surface/60">
                          <input
                            type="checkbox"
                            checked={inviteSupplierIds.includes(s.id)}
                            onChange={() => toggleInviteSupplier(s.id)}
                          />
                          <span className="flex-1 min-w-0">
                            <span className="font-medium">{s.companyName}</span>
                            {s.email ? <span className="block text-xs text-muted truncate">{s.email}</span> : null}
                          </span>
                          {s.cpvMatched ? (
                            <span className="text-xs font-semibold uppercase text-primary-700 shrink-0">
                              {t('procedures.directInformMatchedBadge')}
                            </span>
                          ) : null}
                        </label>
                      ))}
                      {suppliers.length === 0 ? <p className="text-xs text-muted">{t('procedures.noSuppliers')}</p> : null}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 items-center">
                  <button type="button" className="btn-save px-4 py-2 rounded-xl text-sm font-semibold" onClick={savePlan}>{t('common.save')}</button>
                  {canPublish && ['draft', 'planned', 'underlag_ready'].includes(detail.status) ? (
                    <>
                      <button
                        type="button"
                        className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                        disabled={!canClickPublish}
                        title={publishBlockedReason || undefined}
                        onClick={publish}
                      >
                        {t('procedures.publish')}
                      </button>
                      {!canClickPublish && publishBlockedReason ? (
                        <p className="text-xs text-muted w-full sm:w-auto">
                          {publishMissingRequirements(detail).length
                            ? t('procedures.publishRequirementsHint', {
                                qaPart: detail.procedureType !== 'direct'
                                  ? t('procedures.publishRequirementsQaPart')
                                  : ''
                              })
                            : publishBlockedReason}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-muted self-center">
                      {t('procedures.alreadyPublishedHint', { status: t(procedureStatusLabelKey(detail.status)) })}
                    </p>
                  )}
                </div>
              </>
            )}

            {tab === 'underlag' && (
              <>
                <p className="text-sm text-muted">{t('procedures.underlagHint')}</p>
                {!UNDERLAG_EDIT_STATUSES.includes(detail.status) ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {t('procedures.underlagReadOnly')}
                  </p>
                ) : null}
                <BrandSelect
                  className="disabled:cursor-not-allowed"
                  value={detail.questionnaireId || ''}
                  disabled={!UNDERLAG_EDIT_STATUSES.includes(detail.status)}
                  onChange={(e) => linkUnderlag(e.target.value)}
                >
                  <option value="">{t('procedures.selectQuestionnaire')}</option>
                  {questionnaires.map((q) => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </BrandSelect>
                {detail.questionnaire ? (
                  <p className="text-sm font-medium text-foreground">{t('procedures.linked')}: {detail.questionnaire.title}</p>
                ) : null}
              </>
            )}

            {tab === 'qa' && (
              <ProcedureQaChat
                mode="buyer"
                messages={(detail.qaMessages as QaMessage[]) || []}
                threads={detail.qaThreads || []}
                selectedSupplierId={qaThreadSupplierId}
                onSelectThread={setQaThreadSupplierId}
                startableSuppliers={suppliers}
                body={qaBody}
                onBodyChange={setQaBody}
                onSend={postQa}
                onAiDraft={
                  canAiQa
                    ? async () => {
                        try {
                          const threadMsgs = ((detail.qaMessages as QaMessage[]) || []).filter(
                            (m) => m.threadSupplierId === qaThreadSupplierId
                          );
                          const lastQ = [...threadMsgs].reverse().find((m) => m.authorRole === 'supplier');
                          const res = await api.post('/ai-extras/qa-draft', {
                            question: lastQ?.body || qaBody,
                            context: detail.description || detail.title
                          });
                          setQaBody(res.data.draft || '');
                          showToast(t('procedures.aiDraftReady'), 'success');
                        } catch (error: any) {
                          showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                        }
                      }
                    : undefined
                }
              />
            )}

            {tab === 'eval' && (
              <>
                {['awarded', 'standstill', 'closed'].includes(detail.status) ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {t('procedures.evalReadOnlyAfterAward')}
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  {(detail.evaluations as Evaluation[] | undefined)?.map((ev) => (
                    <QuestionnaireSlimRow
                      key={ev.id}
                      compact
                      title={ev.supplier?.companyName || '—'}
                      description={ev.notes || undefined}
                      meta={
                        <StatusBadge tone={ev.score != null ? 'blue' : 'gray'}>
                          {ev.score != null ? `${t('procedures.score')}: ${ev.score}` : '—'}
                        </StatusBadge>
                      }
                    />
                  ))}
                </div>
                {!['awarded', 'standstill', 'closed'].includes(detail.status) ? (
                  <>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <BrandSelect value={evalForm.supplierId} onChange={(e) => setEvalForm({ ...evalForm, supplierId: e.target.value })}>
                        <option value="">{t('procedures.selectSupplier')}</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.companyName}</option>
                        ))}
                      </BrandSelect>
                      <input className="input-brand" type="number" placeholder={t('procedures.score')} value={evalForm.score} onChange={(e) => setEvalForm({ ...evalForm, score: e.target.value })} />
                      <input className="input-brand" placeholder={t('procedures.notes')} value={evalForm.notes} onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-save px-4 py-2 rounded-xl text-sm font-semibold" onClick={saveEval}>{t('procedures.saveEval')}</button>
                      {canAiEval ? (
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/ai-extras/evaluation/${detail.id}`);
                            showToast(res.data.summary?.slice(0, 180) || t('procedures.aiDraftReady'), 'info');
                          } catch (error: any) {
                            showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                          }
                        }}
                      >
                        {t('procedures.aiEvalSummary')}
                      </button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </>
            )}

            {tab === 'award' && (
              <>
                {detail.isSealed ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {t('procedures.sealedActionsBlocked')}
                  </p>
                ) : null}
                {detail.awardDecision || ['awarded', 'standstill', 'closed'].includes(detail.status) ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {t('procedures.awardReadOnlyAfterSave')}
                  </p>
                ) : null}
                {detail.awardDecision ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                    {t('procedures.winner')}: {detail.awardDecision.winner?.companyName || '—'}
                    {detail.awardDecision.standstillEndsAt ? (
                      <span className="block text-xs mt-1">{t('procedures.standstillUntil')}: {detail.awardDecision.standstillEndsAt}</span>
                    ) : null}
                    {detail.awardDecision.decisionMemo ? (
                      <span className="block text-xs mt-2 whitespace-pre-wrap opacity-90">{detail.awardDecision.decisionMemo}</span>
                    ) : null}
                  </div>
                ) : null}
                {!(detail.awardDecision || ['awarded', 'standstill', 'closed'].includes(detail.status)) ? (
                  <>
                    <BrandSelect disabled={detail.isSealed} value={awardForm.winnerSupplierId} onChange={(e) => setAwardForm({ ...awardForm, winnerSupplierId: e.target.value })}>
                      <option value="">{t('procedures.selectSupplier')}</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </BrandSelect>
                    <textarea className="input-brand disabled:opacity-60" rows={3} disabled={detail.isSealed} placeholder={t('procedures.decisionMemo')} value={awardForm.decisionMemo} onChange={(e) => setAwardForm({ ...awardForm, decisionMemo: e.target.value })} />
                    <DateOnlyPicker className="input-brand w-full disabled:opacity-60" disabled={detail.isSealed} value={awardForm.standstillEndsAt} onChange={(standstillEndsAt) => setAwardForm({ ...awardForm, standstillEndsAt })} />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-approve px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" disabled={!accountApproved || detail.isSealed} onClick={saveAward}>{t('procedures.saveAward')}</button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/ai-extras/award-memo/${detail.id}`);
                            setAwardForm((prev) => ({ ...prev, decisionMemo: res.data.draft || prev.decisionMemo }));
                            showToast(t('procedures.aiDraftReady'), 'success');
                          } catch (error: any) {
                            showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                          }
                        }}
                      >
                        {t('procedures.aiAwardMemo')}
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-50 text-violet-700 border border-violet-200"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/ai-extras/announcement/${detail.id}`);
                            setDetail({ ...detail, announcementText: res.data.draft });
                            showToast(t('procedures.aiDraftReady'), 'success');
                          } catch (error: any) {
                            showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                          }
                        }}
                      >
                        {t('procedures.aiAnnonsDraft')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-50 text-violet-700 border border-violet-200"
                      onClick={async () => {
                        try {
                          const res = await api.get(`/ai-extras/announcement/${detail.id}`);
                          setDetail({ ...detail, announcementText: res.data.draft });
                          showToast(t('procedures.aiDraftReady'), 'success');
                        } catch (error: any) {
                          showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                        }
                      }}
                    >
                      {t('procedures.aiAnnonsDraft')}
                    </button>
                  </div>
                )}
              </>
            )}

            {tab === 'complements' && (
              <>
                {detail.isSealed ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
                    {t('procedures.sealedActionsBlocked')}
                  </p>
                ) : null}
                <ComplementHistoryThread
                  mode="buyer"
                  complements={complements}
                  suppliers={suppliers}
                  onCreateRequest={requestComplement}
                  onReply={replyComplement}
                  disabled={!accountApproved || detail.isSealed}
                />
              </>
            )}
          </div>
          </>
        ) : null}
      </SlideOver>
    </div>
  );
}
