import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, MessageSquare, Trophy, ClipboardList, AlertCircle, Calendar, ChevronRight, Hash, X, Loader2, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { StatusBadge } from '../questionnaires/QuestionnaireSlimRow';
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
  const { t, i18n } = useTranslation();
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
  const { enabled: canAiAwardMemo } = useEntitlement('ai.award_memo');
  const { enabled: canAiAnnouncement } = useEntitlement('ai.announcement_draft');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [questionnaires, setQuestionnaires] = useState<
    Array<{
      id: string;
      title: string;
      description?: string | null;
      inUse?: boolean;
      linkedProcedureCount?: number;
      linkedProcedures?: Array<{ id: string; title: string; status: string }>;
    }>
  >([]);
  const [underlagCopyOpen, setUnderlagCopyOpen] = useState(false);
  const [underlagCopySource, setUnderlagCopySource] = useState<{
    id: string;
    title: string;
    usedByTitle?: string;
  } | null>(null);
  const [underlagCopyTitle, setUnderlagCopyTitle] = useState('');
  const [underlagCopyNotes, setUnderlagCopyNotes] = useState('');
  const [underlagCopySaving, setUnderlagCopySaving] = useState(false);
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
  const [evalEdits, setEvalEdits] = useState<Record<string, { score: string; notes: string }>>({});
  const [evalSavingId, setEvalSavingId] = useState<string | null>(null);
  const [evalAiLoading, setEvalAiLoading] = useState(false);
  const [evalAiPanel, setEvalAiPanel] = useState<{
    summary: string;
    recommendation?: string | null;
    source?: string;
    proposals: Array<{
      supplierId: string;
      companyName?: string;
      responseId?: string;
      score: number | null;
      notes: string;
      rationale?: string;
    }>;
  } | null>(null);
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
      setQuestionnaires(
        (qRes.data.questionnaires || []).map((q: any) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          inUse: Boolean(q.inUse),
          linkedProcedureCount: q.linkedProcedureCount || 0,
          linkedProcedures: q.linkedProcedures || [],
        }))
      );
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
      // Opening a different procedure → Plan. Refreshing the same one → stay on current tab
      // unless a specific tab is requested.
      const nextTab = preferTab ?? (detail?.id === id ? tab : 'plan');
      setTab(nextTab);
      setInviteSupplierIds([]);
      setInviteShowAll(false);
      setQaBody('');
      if (nextTab !== 'eval') {
        setEvalAiPanel(null);
      }
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
    if (!questionnaireId) {
      try {
        await api.put(`/procedures/${detail.id}/underlag`, { questionnaireId: null });
        showToast(t('msg.underlagLinked'), 'success');
        await openDetail(detail.id, 'underlag');
        load();
      } catch (error: any) {
        showToast(error.response?.data?.message || t('msg.failedLinkUnderlag'), 'error');
      }
      return;
    }

    const q = questionnaires.find((x) => x.id === questionnaireId);
    const usedElsewhere =
      detail.questionnaireId !== questionnaireId &&
      (q?.linkedProcedures || []).some((p) => p.id !== detail.id);
    if (usedElsewhere) {
      const other = (q?.linkedProcedures || []).find((p) => p.id !== detail.id);
      setUnderlagCopySource({
        id: questionnaireId,
        title: q?.title || '',
        usedByTitle: other?.title,
      });
      setUnderlagCopyTitle(`${q?.title || 'Questionnaire'} (copy)`);
      setUnderlagCopyNotes('');
      setUnderlagCopyOpen(true);
      return;
    }

    try {
      await api.put(`/procedures/${detail.id}/underlag`, { questionnaireId });
      showToast(t('msg.underlagLinked'), 'success');
      await openDetail(detail.id, 'underlag');
      load();
    } catch (error: any) {
      if (error.response?.data?.code === 'QUESTIONNAIRE_IN_USE') {
        setUnderlagCopySource({
          id: questionnaireId,
          title: q?.title || '',
          usedByTitle: error.response?.data?.usedBy?.title,
        });
        setUnderlagCopyTitle(`${q?.title || 'Questionnaire'} (copy)`);
        setUnderlagCopyNotes('');
        setUnderlagCopyOpen(true);
        return;
      }
      showToast(error.response?.data?.message || t('msg.failedLinkUnderlag'), 'error');
    }
  };

  const copyAndLinkUnderlag = async () => {
    if (!detail || !underlagCopySource) return;
    const title = underlagCopyTitle.trim();
    if (!title) {
      showToast(t('procedures.copyNeedsTitle', { defaultValue: 'Enter a name for the new questionnaire' }), 'warning');
      return;
    }
    try {
      setUnderlagCopySaving(true);
      const copyRes = await api.post(`/questionnaires/${underlagCopySource.id}/copy`, {
        title,
        notes: underlagCopyNotes.trim() || undefined,
      });
      const newId = copyRes.data.questionnaire?.id;
      if (!newId) throw new Error('Copy missing id');
      await api.put(`/procedures/${detail.id}/underlag`, { questionnaireId: newId });
      showToast(t('procedures.copyLinked', { defaultValue: 'Copied questionnaire and linked as underlag' }), 'success');
      setUnderlagCopyOpen(false);
      setUnderlagCopySource(null);
      await openDetail(detail.id, 'underlag');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLinkUnderlag'), 'error');
    } finally {
      setUnderlagCopySaving(false);
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

  const evalReadOnly = ['awarded', 'standstill', 'closed'].includes(detail?.status || '');

  const evalRows = useMemo(() => {
    if (!detail) return [] as Array<{
      key: string;
      supplierId: string;
      companyName: string;
      evaluationId?: string;
      responseId?: string | null;
      answerCount?: number;
      score: string;
      notes: string;
    }>;
    const bySupplier = new Map<string, any>();
    for (const ev of (detail.evaluations as Evaluation[]) || []) {
      bySupplier.set(ev.supplierId, {
        key: ev.id,
        supplierId: ev.supplierId,
        companyName: ev.supplier?.companyName || '—',
        evaluationId: ev.id,
        score: ev.score != null ? String(ev.score) : '',
        notes: ev.notes || '',
      });
    }
    for (const bid of detail.bidResponses || []) {
      const existing = bySupplier.get(bid.supplierId);
      if (existing) {
        existing.responseId = bid.id;
        existing.answerCount = bid.answerCount;
        if (!existing.companyName || existing.companyName === '—') {
          existing.companyName = bid.companyName || existing.companyName;
        }
      } else {
        bySupplier.set(bid.supplierId, {
          key: `bid-${bid.id}`,
          supplierId: bid.supplierId,
          companyName: bid.companyName || '—',
          responseId: bid.id,
          answerCount: bid.answerCount,
          score: '',
          notes: '',
        });
      }
    }
    return Array.from(bySupplier.values()).sort((a, b) =>
      String(a.companyName).localeCompare(String(b.companyName))
    );
  }, [detail]);

  const evalPager = useListPagination(evalRows, 10);

  const evalSyncKey = useMemo(
    () => evalRows.map((r) => `${r.supplierId}:${r.score}:${r.notes}`).join('|'),
    [evalRows]
  );

  useEffect(() => {
    if (!detail?.id || tab !== 'eval') return;
    const next: Record<string, { score: string; notes: string }> = {};
    for (const row of evalRows) {
      next[row.supplierId] = { score: row.score, notes: row.notes };
    }
    setEvalEdits(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when saved row values change
  }, [detail?.id, tab, evalSyncKey]);

  const saveEvalRow = async (supplierId: string, responseId?: string | null) => {
    if (!detail || evalReadOnly) return;
    const edit = evalEdits[supplierId] || { score: '', notes: '' };
    try {
      setEvalSavingId(supplierId);
      await api.put(`/procedures/${detail.id}/evaluations`, {
        supplierId,
        score: edit.score === '' ? null : Number(edit.score),
        notes: edit.notes,
        responseId: responseId || null,
      });
      showToast(t('msg.evaluationSaved'), 'success');
      await openDetail(detail.id, 'eval');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSaveEvaluation'), 'error');
    } finally {
      setEvalSavingId(null);
    }
  };

  const runAiEvaluation = async () => {
    if (!detail || evalReadOnly) return;
    try {
      setEvalAiLoading(true);
      const res = await api.get(`/ai-extras/evaluation/${detail.id}`, {
        params: { language: (i18n.language || 'en').slice(0, 2) },
      });
      setEvalAiPanel({
        summary: res.data.summary || '',
        recommendation: res.data.recommendation || null,
        source: res.data.source,
        proposals: res.data.proposals || [],
      });
      // Prefill editable rows from AI proposals (not saved until user clicks Save / Apply)
      setEvalEdits((prev) => {
        const next = { ...prev };
        for (const p of res.data.proposals || []) {
          if (!p?.supplierId) continue;
          next[p.supplierId] = {
            score: p.score != null && p.score !== '' ? String(p.score) : '',
            notes: p.notes || '',
          };
        }
        return next;
      });
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
    } finally {
      setEvalAiLoading(false);
    }
  };

  const applyAiProposals = async () => {
    if (!detail || !evalAiPanel?.proposals?.length || evalReadOnly) return;
    try {
      setEvalAiLoading(true);
      for (const p of evalAiPanel.proposals) {
        await api.put(`/procedures/${detail.id}/evaluations`, {
          supplierId: p.supplierId,
          score: p.score,
          notes: p.notes || '',
          responseId: p.responseId || null,
        });
      }
      showToast(t('procedures.aiEvalApplied', { defaultValue: 'AI scores applied — review and adjust if needed' }), 'success');
      setEvalAiPanel(null);
      await openDetail(detail.id, 'eval');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSaveEvaluation'), 'error');
    } finally {
      setEvalAiLoading(false);
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
      await openDetail(detail.id, 'award');
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

      <CenterModal
        open={underlagCopyOpen}
        onClose={() => {
          if (underlagCopySaving) return;
          setUnderlagCopyOpen(false);
          setUnderlagCopySource(null);
        }}
        title={t('procedures.copyQuestionnaireTitle', { defaultValue: 'Create unused copy' })}
        subtitle={
          underlagCopySource?.usedByTitle
            ? t('procedures.copyQuestionnaireBecause', {
                defaultValue: '“{{title}}” is already used by “{{usedBy}}”. Create a new copy for this procedure.',
                title: underlagCopySource.title,
                usedBy: underlagCopySource.usedByTitle,
              })
            : t('procedures.copyQuestionnaireHint', {
                defaultValue: 'Each procedure needs its own questionnaire. Create a copy to link here.',
              })
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold"
              disabled={underlagCopySaving}
              onClick={() => {
                setUnderlagCopyOpen(false);
                setUnderlagCopySource(null);
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              disabled={underlagCopySaving}
              onClick={copyAndLinkUnderlag}
            >
              {underlagCopySaving
                ? t('common.loading', { defaultValue: 'Saving…' })
                : t('procedures.copyAndLink', { defaultValue: 'Copy and link' })}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('procedures.copyNewTitle', { defaultValue: 'New questionnaire name' })}
            </label>
            <input
              className="input-brand w-full"
              value={underlagCopyTitle}
              onChange={(e) => setUnderlagCopyTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('procedures.copyNotes', { defaultValue: 'Extra notes (optional)' })}
            </label>
            <textarea
              className="input-brand w-full"
              rows={3}
              value={underlagCopyNotes}
              onChange={(e) => setUnderlagCopyNotes(e.target.value)}
              placeholder={t('procedures.copyNotesPlaceholder', {
                defaultValue: 'e.g. Variant for Lot A / 2026 standstill package',
              })}
            />
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
                  {questionnaires.map((q) => {
                    const usedElsewhere = (q.linkedProcedures || []).some((p) => p.id !== detail.id);
                    const label = usedElsewhere
                      ? `${q.title} (${t('procedures.questionnaireInUse', { defaultValue: 'in use — will offer copy' })})`
                      : q.title;
                    return (
                      <option key={q.id} value={q.id}>{label}</option>
                    );
                  })}
                </BrandSelect>
                {detail.questionnaire ? (
                  <p className="text-sm font-medium text-foreground">{t('procedures.linked')}: {detail.questionnaire.title}</p>
                ) : null}
                <p className="text-xs text-muted">
                  {t('procedures.underlagUniqueHint', {
                    defaultValue: 'Each procedure needs its own questionnaire. If one is already linked elsewhere, you can create an unused copy.',
                  })}
                </p>
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
                          if (!qaThreadSupplierId) {
                            showToast(t('procedures.selectSupplierThread', { defaultValue: 'Select a supplier thread first' }), 'warning');
                            return;
                          }
                          const threadMsgs = ((detail.qaMessages as QaMessage[]) || []).filter(
                            (m) => m.threadSupplierId === qaThreadSupplierId
                          );
                          const lastQ = [...threadMsgs].reverse().find((m) => m.authorRole === 'supplier');
                          const res = await api.post('/ai-extras/qa-draft', {
                            procedureId: detail.id,
                            threadSupplierId: qaThreadSupplierId,
                            question: lastQ?.body || qaBody,
                            language: (i18n.language || 'en').slice(0, 2),
                          });
                          setQaBody(res.data.draft || '');
                          showToast(
                            res.data.needsClarification
                              ? t('procedures.aiDraftNeedsClarification', {
                                  defaultValue: 'AI draft ready — asks the supplier to clarify (review before send)',
                                })
                              : t('procedures.aiDraftReady'),
                            'success'
                          );
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
                {evalReadOnly ? (
                  <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                    {t('procedures.evalReadOnlyAfterAward')}
                  </p>
                ) : null}

                {!evalReadOnly && canAiEval ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={evalAiLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                      onClick={runAiEvaluation}
                    >
                      {evalAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {t('procedures.aiEvalSummary')}
                    </button>
                  </div>
                ) : null}

                {evalAiPanel ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-violet-950">
                          {t('procedures.aiEvalPanelTitle', { defaultValue: 'AI evaluation' })}
                        </p>
                        {evalAiPanel.source ? (
                          <p className="text-[11px] text-violet-700/80 mt-0.5">
                            {evalAiPanel.source === 'ai'
                              ? t('procedures.aiEvalSourceAi', { defaultValue: 'Based on submitted answers (GPU)' })
                              : t('procedures.aiEvalSourceFallback', { defaultValue: 'Draft from answer coverage — review carefully' })}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="p-1 rounded-lg text-violet-700 hover:bg-violet-100"
                        aria-label={t('common.cancel')}
                        onClick={() => setEvalAiPanel(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p className="text-sm text-violet-950 whitespace-pre-wrap leading-relaxed">
                      {evalAiPanel.summary}
                    </p>
                    {evalAiPanel.recommendation ? (
                      <p className="text-xs text-violet-900 border-t border-violet-200 pt-2">
                        <span className="font-semibold">{t('procedures.aiEvalRecommendation', { defaultValue: 'Recommendation' })}: </span>
                        {evalAiPanel.recommendation}
                      </p>
                    ) : null}
                    {evalAiPanel.proposals.length > 0 ? (
                      <ul className="space-y-2 text-xs text-violet-950">
                        {evalAiPanel.proposals.map((p) => (
                          <li key={p.supplierId} className="rounded-lg border border-violet-200 bg-white/70 px-3 py-2">
                            <span className="font-semibold">{p.companyName || p.supplierId}</span>
                            {p.score != null ? (
                              <span className="ml-2 text-violet-700">{t('procedures.score')}: {p.score}</span>
                            ) : null}
                            {(p.notes || p.rationale) ? (
                              <p className="mt-1 text-violet-800/90 whitespace-pre-wrap">{p.notes || p.rationale}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {!evalReadOnly ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={evalAiLoading || !evalAiPanel.proposals.length}
                          className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                          onClick={applyAiProposals}
                        >
                          {t('procedures.aiEvalApply', { defaultValue: 'Apply AI scores' })}
                        </button>
                        <button
                          type="button"
                          className="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold"
                          onClick={() => setEvalAiPanel(null)}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {evalRows.length === 0 ? (
                  <p className="text-sm text-muted py-4">
                    {t('procedures.evalEmpty', { defaultValue: 'No submitted bids to score yet.' })}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {evalPager.paginatedItems.map((row) => {
                      const edit = evalEdits[row.supplierId] || { score: row.score, notes: row.notes };
                      return (
                        <div
                          key={row.key}
                          className="rounded-xl border border-border bg-white p-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{row.companyName}</p>
                              {row.answerCount != null ? (
                                <p className="text-[11px] text-muted">
                                  {t('procedures.evalAnswersCount', {
                                    defaultValue: '{{count}} answers submitted',
                                    count: row.answerCount,
                                  })}
                                </p>
                              ) : null}
                            </div>
                            {!evalReadOnly ? (
                              <button
                                type="button"
                                disabled={evalSavingId === row.supplierId}
                                className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                                onClick={() => saveEvalRow(row.supplierId, row.responseId)}
                              >
                                {evalSavingId === row.supplierId ? (
                                  <Loader2 size={14} className="animate-spin inline" />
                                ) : (
                                  t('procedures.saveEval')
                                )}
                              </button>
                            ) : null}
                          </div>
                          <div className="grid sm:grid-cols-[7rem_1fr] gap-2">
                            <input
                              className="input-brand"
                              type="number"
                              min={0}
                              max={100}
                              step={0.5}
                              disabled={evalReadOnly}
                              placeholder={t('procedures.score')}
                              value={edit.score}
                              onChange={(e) =>
                                setEvalEdits((prev) => ({
                                  ...prev,
                                  [row.supplierId]: { ...edit, score: e.target.value },
                                }))
                              }
                            />
                            <input
                              className="input-brand"
                              disabled={evalReadOnly}
                              placeholder={t('procedures.notes')}
                              value={edit.notes}
                              onChange={(e) =>
                                setEvalEdits((prev) => ({
                                  ...prev,
                                  [row.supplierId]: { ...edit, notes: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                    <ListPagination
                      page={evalPager.page}
                      pageSize={evalPager.pageSize}
                      total={evalPager.total}
                      onPageChange={evalPager.setPage}
                      onPageSizeChange={evalPager.setPageSize}
                      itemLabel={t('procedures.evalRowsLabel', { defaultValue: 'suppliers' })}
                    />
                  </div>
                )}
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
                      {((detail.evaluations as Evaluation[]) || []).map((ev) => (
                        <option key={ev.supplierId} value={ev.supplierId}>
                          {ev.supplier?.companyName || '—'}
                          {ev.score != null ? ` (${t('procedures.score')}: ${ev.score})` : ''}
                        </option>
                      ))}
                    </BrandSelect>
                    {!((detail.evaluations as Evaluation[]) || []).length ? (
                      <p className="text-xs text-muted">
                        {t('procedures.awardNeedsEvaluations', {
                          defaultValue: 'Score suppliers on the Eval tab before awarding.',
                        })}
                      </p>
                    ) : null}
                    <textarea className="input-brand disabled:opacity-60" rows={5} disabled={detail.isSealed} placeholder={t('procedures.decisionMemo')} value={awardForm.decisionMemo} onChange={(e) => setAwardForm({ ...awardForm, decisionMemo: e.target.value })} />
                    <DateOnlyPicker className="input-brand w-full disabled:opacity-60" disabled={detail.isSealed} value={awardForm.standstillEndsAt} onChange={(standstillEndsAt) => setAwardForm({ ...awardForm, standstillEndsAt })} />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-approve px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" disabled={!accountApproved || detail.isSealed} onClick={saveAward}>{t('procedures.saveAward')}</button>
                      {canAiAwardMemo ? (
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700"
                        onClick={async () => {
                          const evals = (detail.evaluations as Evaluation[]) || [];
                          if (!evals.length) {
                            showToast(
                              t('procedures.awardNeedsEvaluations', {
                                defaultValue: 'Score suppliers on the Eval tab before awarding.',
                              }),
                              'warning'
                            );
                            return;
                          }
                          // Prefer highest score; on tie, keep current selection if it is tied, else alphabetical
                          const ranked = [...evals].sort((a, b) => {
                            const sa = a.score != null ? Number(a.score) : -Infinity;
                            const sb = b.score != null ? Number(b.score) : -Infinity;
                            if (sb !== sa) return sb - sa;
                            return String(a.supplier?.companyName || '').localeCompare(
                              String(b.supplier?.companyName || '')
                            );
                          });
                          const topScore =
                            ranked[0].score != null ? Number(ranked[0].score) : null;
                          const tiedForTop = ranked.filter(
                            (e) =>
                              topScore != null &&
                              e.score != null &&
                              Number(e.score) === topScore
                          );
                          const pick =
                            tiedForTop.find((e) => e.supplierId === awardForm.winnerSupplierId) ||
                            ranked[0];
                          const winnerSupplierId = pick.supplierId;
                          const winnerName = pick.supplier?.companyName || '';
                          setAwardForm((prev) => ({ ...prev, winnerSupplierId }));
                          try {
                            const res = await api.get(`/ai-extras/award-memo/${detail.id}`, {
                              params: {
                                language: (i18n.language || 'en').slice(0, 2),
                                winnerSupplierId,
                                winnerName,
                                standstillEndsAt: awardForm.standstillEndsAt || undefined,
                              },
                            });
                            setAwardForm((prev) => ({
                              ...prev,
                              winnerSupplierId,
                              decisionMemo: res.data.draft || prev.decisionMemo,
                            }));
                            showToast(
                              t('procedures.aiAwardMemoPickedWinner', {
                                defaultValue: 'Selected highest score ({{name}}) and drafted memo — review before save',
                                name: winnerName || '—',
                              }),
                              'success'
                            );
                          } catch (error: any) {
                            showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                          }
                        }}
                      >
                        {t('procedures.aiAwardMemo')}
                      </button>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {canAiAnnouncement || detail.announcementText ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="text-xs font-semibold text-muted">
                      {t('procedures.announcementText', { defaultValue: 'Announcement text' })}
                    </label>
                    <textarea
                      className="input-brand"
                      rows={4}
                      placeholder={t('procedures.announcementPlaceholder', {
                        defaultValue: 'Public announcement / after-announce text…',
                      })}
                      value={detail.announcementText || ''}
                      onChange={(e) => setDetail({ ...detail, announcementText: e.target.value })}
                    />
                    {canAiAnnouncement ? (
                      <button
                        type="button"
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-50 text-violet-700 border border-violet-200"
                        onClick={async () => {
                          try {
                            const res = await api.get(`/ai-extras/announcement/${detail.id}`, {
                              params: { language: (i18n.language || 'en').slice(0, 2) },
                            });
                            setDetail({ ...detail, announcementText: res.data.draft });
                            showToast(t('procedures.aiDraftReady'), 'success');
                          } catch (error: any) {
                            showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                          }
                        }}
                      >
                        {t('procedures.aiAnnonsDraft')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
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
