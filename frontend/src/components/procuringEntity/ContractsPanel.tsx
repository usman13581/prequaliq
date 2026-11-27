import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ClipboardList, FileText, Trophy, Building2, Calendar, ChevronRight, Hash, Lock, Ban } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { StatusBadge, RowActionButton } from '../questionnaires/QuestionnaireSlimRow';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { SlideOver, CenterModal } from '../ui/SlideOver';
import { DateOnlyPicker } from '../DateOnlyPicker';
import { BrandSelect } from '../ui/BrandSelect';
import { AdminStatCard, AdminStatsGrid } from '../admin/AdminStatCards';
import { ContractThread, type ContractThreadMessage } from '../contracts/ContractThread';
import { SearchField } from '../ui/SearchField';
import { StatusPills } from '../ui/StatusPills';

function contractStatusTone(status: string): 'green' | 'yellow' | 'red' | 'gray' | 'blue' {
  if (status === 'active') return 'green';
  if (status === 'expired') return 'yellow';
  if (status === 'terminated') return 'red';
  if (status === 'draft') return 'gray';
  return 'blue';
}

type Contract = {
  id: string;
  title: string;
  contractType: string;
  status: string;
  deliveryStatus?: string;
  messages?: ContractThreadMessage[];
  contractNumber?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  valueAmount?: number | string | null;
  notes?: string | null;
  supplierId?: string | null;
  procedureId?: string | null;
  supplier?: { id?: string; companyName?: string } | null;
  procedure?: { id?: string; title?: string; referenceNumber?: string | null } | null;
  callOffs?: Array<{ id: string; title: string; status: string }>;
  terminationReason?: string | null;
  terminatedAt?: string | null;
};

const CLOSED_STATUSES = ['terminated', 'expired'];
const END_REASON_MIN = 10;

const emptyForm = {
  title: '',
  contractType: 'standard',
  contractNumber: '',
  startDate: '',
  endDate: '',
  status: 'active',
  valueAmount: '',
  notes: '',
  supplierId: '',
  procedureId: ''
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'contracts.status.draft',
  active: 'contracts.status.active',
  expired: 'contracts.status.expired',
  terminated: 'contracts.status.terminated'
};

export function ContractsPanel() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { enabled } = useEntitlement('contracts.repository');
  const { enabled: canCallOffs } = useEntitlement('contracts.call_offs');
  const { enabled: canAnalytics } = useEntitlement('platform.analytics');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [analytics, setAnalytics] = useState<{ procedures: number; contracts: number; awards: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<Contract | null>(null);
  const [editDetail, setEditDetail] = useState<Contract | null>(null);
  const [editDetailLoading, setEditDetailLoading] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [endReason, setEndReason] = useState('');
  const [disMemberships, setDisMemberships] = useState<Array<{
    id: string;
    status: string;
    supplier?: { companyName?: string };
    procedure?: { title?: string };
  }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; companyName: string }>>([]);
  const [procedures, setProcedures] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [listSearch, setListSearch] = useState('');
  const [appliedListSearch, setAppliedListSearch] = useState('');

  const runListSearch = () => setAppliedListSearch(listSearch.trim());

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const statusPills = useMemo(
    () =>
      ['all', 'draft', 'active', 'expired', 'terminated'].map((id) => ({
        id,
        label: id === 'all' ? t('common.all') : t(STATUS_LABEL[id]),
        count: id === 'all' ? contracts.length : contracts.filter((c) => c.status === id).length
      })),
    [contracts, t]
  );

  const filteredContracts = useMemo(() => {
    const q = appliedListSearch.trim().toLowerCase();
    const inStatus = statusFilter === 'all' ? contracts : contracts.filter((c) => c.status === statusFilter);
    if (!q) return inStatus;
    return inStatus.filter((c) => {
      const typeLabel = t(`contracts.types.${c.contractType}`, { defaultValue: c.contractType }).toLowerCase();
      const statusLabel = t(STATUS_LABEL[c.status] || 'contracts.status.draft').toLowerCase();
      return (
        c.title?.toLowerCase().includes(q) ||
        (c.contractNumber || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q) ||
        (c.supplier?.companyName || '').toLowerCase().includes(q) ||
        (c.procedure?.title || '').toLowerCase().includes(q) ||
        (c.contractType || '').toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        (c.status || '').toLowerCase().includes(q) ||
        statusLabel.includes(q)
      );
    });
  }, [contracts, appliedListSearch, statusFilter, t]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    total
  } = useListPagination(filteredContracts);

  const disPager = useListPagination(disMemberships);

  const loadLookups = async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        api.get('/procuring-entity/suppliers-invite-candidates').catch(() => ({ data: { suppliers: [] } })),
        api.get('/procedures/mine').catch(() => ({ data: { procedures: [] } }))
      ]);
      setSuppliers((sRes.data.suppliers || []).map((s: any) => ({ id: s.id, companyName: s.companyName })));
      setProcedures((pRes.data.procedures || []).map((p: any) => ({ id: p.id, title: p.title, status: p.status })));
    } catch {
      /* ignore */
    }
  };

  const load = async () => {
    try {
      const [cRes, aRes, dRes] = await Promise.all([
        api.get('/contracts/mine'),
        canAnalytics
          ? api.get('/contracts/analytics/summary').catch(() => ({ data: { analytics: null } }))
          : Promise.resolve({ data: { analytics: null } }),
        api.get('/contracts/dis/memberships').catch(() => ({ data: { memberships: [] } }))
      ]);
      setContracts(cRes.data.contracts || []);
      setAnalytics(canAnalytics ? aRes.data.analytics || null : null);
      setDisMemberships(dRes.data.memberships || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadContracts'), 'error');
    }
  };

  useEffect(() => {
    if (enabled) {
      load();
      loadLookups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted">
        {t('contracts.notEnabled')}
      </div>
    );
  }

  /** silent: background refresh of an open contract (new messages) without the loading state. */
  const loadEditDetail = async (id: string, silent = false) => {
    try {
      if (!silent) setEditDetailLoading(true);
      const res = await api.get(`/contracts/${id}`, { silentBusy: true });
      setEditDetail(res.data.contract || null);
    } catch (error: any) {
      if (silent) return;
      showToast(error.response?.data?.message || t('msg.failedLoadContracts'), 'error');
      setEditDetail(null);
    } finally {
      if (!silent) setEditDetailLoading(false);
    }
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setEditDetail(null);
    loadEditDetail(c.id);
    setEditForm({
      title: c.title || '',
      contractType: c.contractType || 'standard',
      contractNumber: c.contractNumber || '',
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      status: c.status || 'draft',
      valueAmount: c.valueAmount != null ? String(c.valueAmount) : '',
      notes: c.notes || '',
      supplierId: c.supplierId || c.supplier?.id || '',
      procedureId: c.procedureId || c.procedure?.id || ''
    });
  };

  const create = async () => {
    if (!form.title.trim()) return;
    try {
      setSaving(true);
      await api.post('/contracts', {
        title: form.title.trim(),
        contractType: form.contractType,
        contractNumber: form.contractNumber || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        status: form.status || 'draft',
        valueAmount: form.valueAmount === '' ? null : Number(form.valueAmount),
        notes: form.notes || null,
        supplierId: form.supplierId || null,
        procedureId: form.procedureId || null
      });
      showToast(t('msg.contractCreated'), 'success');
      setForm({ ...emptyForm });
      setCreateOpen(false);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateContract'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Current server state of the open contract (falls back to the list row while loading)
  const current: Contract | null = editDetail || editing;
  const isClosed = current ? CLOSED_STATUSES.includes(current.status) : false;
  const isDraft = current?.status === 'draft';
  // A contract created by an award starts active with no value: the value can be filled in once.
  const canSetValue = isDraft || current?.valueAmount == null || current?.valueAmount === '';

  const saveEdit = async (extra?: { status: 'active' }) => {
    if (!editing || !current) return;
    if (!editForm.title.trim()) {
      showToast(t('contracts.titleRequired'), 'error');
      return;
    }
    try {
      setSaving(true);
      // Only fields that are still open are sent; the server applies the same rules.
      const payload: Record<string, unknown> = {
        title: editForm.title.trim(),
        endDate: editForm.endDate || null,
        notes: editForm.notes || null
      };
      if (isDraft) payload.startDate = editForm.startDate || null;
      if (canSetValue) payload.valueAmount = editForm.valueAmount === '' ? null : Number(editForm.valueAmount);
      if (!current.contractNumber && editForm.contractNumber) payload.contractNumber = editForm.contractNumber;
      if (!current.supplier?.id && !current.supplierId && editForm.supplierId) payload.supplierId = editForm.supplierId;
      if (!current.procedure?.id && !current.procedureId && editForm.procedureId) payload.procedureId = editForm.procedureId;
      if (extra?.status) payload.status = extra.status;
      const res = await api.put(`/contracts/${editing.id}`, payload);
      showToast(extra?.status ? t('contracts.activated') : t('msg.saved'), 'success');
      if (res.data.contract) setEditing({ ...editing, ...res.data.contract });
      await loadEditDetail(editing.id, true);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const endContract = async () => {
    if (!editing) return;
    const reason = endReason.trim();
    if (reason.length < END_REASON_MIN) return;
    try {
      setSaving(true);
      const res = await api.post(`/contracts/${editing.id}/terminate`, { reason });
      showToast(t('contracts.end.done'), 'success');
      setEndOpen(false);
      setEndReason('');
      if (res.data.contract) {
        setEditDetail(res.data.contract);
        setEditing({ ...editing, ...res.data.contract });
      }
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('contracts.end.failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const callOff = async (id: string) => {
    try {
      await api.post(`/contracts/${id}/call-offs`, { title: undefined });
      showToast(t('msg.callOffCreated'), 'success');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateCallOff'), 'error');
    }
  };

  const formFields = (
    values: typeof emptyForm,
    setValues: (v: typeof emptyForm) => void
  ) => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.titleField')}</label>
        <input className="input-brand" value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.contractType')}</label>
          <BrandSelect value={values.contractType} onChange={(e) => setValues({ ...values, contractType: e.target.value })}>
            <option value="standard">{t('contracts.types.standard')}</option>
            <option value="framework">{t('contracts.types.framework')}</option>
            <option value="dis">{t('contracts.types.dis')}</option>
          </BrandSelect>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.statusField')}</label>
          <BrandSelect value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value })}>
            <option value="draft">{t('contracts.status.draft')}</option>
            <option value="active">{t('contracts.status.active')}</option>
          </BrandSelect>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.number')}</label>
          <input className="input-brand" placeholder={t('contracts.numberAuto')} value={values.contractNumber} onChange={(e) => setValues({ ...values, contractNumber: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.value')}</label>
          <input className="input-brand" type="number" min={0} value={values.valueAmount} onChange={(e) => setValues({ ...values, valueAmount: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.startDate')}</label>
          <DateOnlyPicker className="input-brand w-full" value={values.startDate} onChange={(startDate) => setValues({ ...values, startDate })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.endDate')}</label>
          <DateOnlyPicker className="input-brand w-full" value={values.endDate} onChange={(endDate) => setValues({ ...values, endDate })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.supplierField')}</label>
        <BrandSelect
          value={values.supplierId}
          onChange={(e) => setValues({ ...values, supplierId: e.target.value })}
        >
          <option value="">{t('contracts.selectSupplier')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.companyName}</option>
          ))}
        </BrandSelect>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.procedureField')}</label>
        <BrandSelect
          value={values.procedureId}
          onChange={(e) => setValues({ ...values, procedureId: e.target.value })}
        >
          <option value="">{t('contracts.selectProcedure')}</option>
          {procedures.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </BrandSelect>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.notes')}</label>
        <textarea className="input-brand" rows={3} value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">{t('contracts.title')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('contracts.subtitle')}</p>
        </div>
        <button
          type="button"
          className="btn-save inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          onClick={() => {
            setForm({ ...emptyForm });
            setCreateOpen(true);
            loadLookups();
          }}
        >
          <Plus size={14} /> {t('contracts.create')}
        </button>
      </div>

      {analytics ? (
        <AdminStatsGrid compact>
          <AdminStatCard label={t('contracts.statProcedures')} value={analytics.procedures} icon={ClipboardList} accent="blue" compact />
          <AdminStatCard label={t('contracts.statContracts')} value={analytics.contracts} icon={FileText} accent="green" compact />
          <AdminStatCard label={t('contracts.statAwards')} value={analytics.awards} icon={Trophy} accent="violet" compact />
        </AdminStatsGrid>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <SearchField
          wrapperClassName="flex-1 min-w-[14rem] max-w-md"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runListSearch();
          }}
          placeholder={t('contracts.searchPlaceholder')}
        />
        <button
          type="button"
          onClick={runListSearch}
          className="btn-save px-4 py-2 rounded-lg text-xs font-semibold shrink-0"
        >
          {t('buttons.search')}
        </button>
        <StatusPills pills={statusPills} value={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="space-y-3">
        {contracts.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">{t('contracts.empty')}</div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">{t('common.noResults')}</div>
        ) : (
          <>
            {paginatedItems.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openEdit(c)}
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
                      {c.supplier?.companyName ? (
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <Building2 size={14} className="shrink-0" />
                          <span className="truncate">{c.supplier.companyName}</span>
                        </span>
                      ) : null}
                      {c.startDate || c.endDate ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={14} className="shrink-0" />
                          {[c.startDate, c.endDate].filter(Boolean).join(' – ')}
                        </span>
                      ) : null}
                      {c.callOffs?.length ? (
                        <span className="text-xs font-medium">{t('common.callOffsCount', { count: c.callOffs.length })}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {canCallOffs && c.contractType === 'framework' ? (
                      <RowActionButton onClick={() => callOff(c.id)}>{t('contracts.addCallOff')}</RowActionButton>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
                      {CLOSED_STATUSES.includes(c.status) ? t('common.view') : t('common.edit')}
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
              itemLabel={t('contracts.nav').toLowerCase()}
            />
          </>
        )}
      </div>

      {disMemberships.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-bold">{t('contracts.disApplications')}</h3>
          {disPager.paginatedItems.map((m) => (
            <div
              key={m.id}
              className="w-full rounded-2xl border border-border bg-white p-4 sm:p-5"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={m.status === 'admitted' ? 'green' : m.status === 'rejected' ? 'red' : 'yellow'}>
                      {t(
                        m.status === 'admitted'
                          ? 'contracts.disStatus.admitted'
                          : m.status === 'rejected'
                            ? 'contracts.disStatus.rejected'
                            : 'contracts.disStatus.applied'
                      )}
                    </StatusBadge>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                    {m.supplier?.companyName || '—'}
                  </h3>
                  {m.procedure?.title ? (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                      <span className="truncate">{m.procedure.title}</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <RowActionButton
                    onClick={async () => {
                      try {
                        await api.put(`/contracts/dis/memberships/${m.id}`, { status: 'admitted' });
                        showToast(t('msg.saved'), 'success');
                        load();
                      } catch (error: any) {
                        showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                      }
                    }}
                  >
                    {t('buttons.approve')}
                  </RowActionButton>
                  <RowActionButton
                    onClick={async () => {
                      try {
                        await api.put(`/contracts/dis/memberships/${m.id}`, { status: 'rejected' });
                        showToast(t('msg.saved'), 'success');
                        load();
                      } catch (error: any) {
                        showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                      }
                    }}
                  >
                    {t('buttons.reject')}
                  </RowActionButton>
                </div>
              </div>
            </div>
          ))}
          <ListPagination
            page={disPager.page}
            pageSize={disPager.pageSize}
            total={disPager.total}
            onPageChange={disPager.setPage}
            onPageSizeChange={disPager.setPageSize}
            itemLabel={t('contracts.disApplications').toLowerCase()}
          />
        </div>
      ) : null}

      <CenterModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('contracts.create')}
        footer={
          <button type="button" className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" disabled={saving} onClick={create}>
            {t('contracts.create')}
          </button>
        }
      >
        {formFields(form, setForm)}
      </CenterModal>

      <SlideOver
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setEditDetail(null);
        }}
        title={editing?.title || t('common.edit')}
        subtitle={current?.contractNumber || undefined}
        widthClass="max-w-full lg:max-w-[62%]"
        footer={
          current && !isClosed ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="btn-reject inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                disabled={saving}
                onClick={() => {
                  setEndReason('');
                  setEndOpen(true);
                }}
              >
                <Ban size={15} /> {t('contracts.end.action')}
              </button>
              <div className="flex flex-wrap gap-2">
                {isDraft ? (
                  <button
                    type="button"
                    className="btn-approve px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                    disabled={saving}
                    onClick={() => saveEdit({ status: 'active' })}
                  >
                    {t('contracts.activate')}
                  </button>
                ) : null}
                <button type="button" className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" disabled={saving} onClick={() => saveEdit()}>
                  {t('common.save')}
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {editing && current ? (
          <div className="space-y-4">
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

            {/* Fixed facts: identify the contract and its parties, never edited here */}
            <section className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted inline-flex items-center gap-1.5">
                  <Lock size={12} /> {t('contracts.fixed.title')}
                </p>
                <StatusBadge tone={contractStatusTone(current.status)}>
                  {t(STATUS_LABEL[current.status] || 'contracts.status.draft')}
                </StatusBadge>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: t('contracts.number'), value: current.contractNumber },
                  {
                    label: t('contracts.contractType'),
                    value: t(`contracts.types.${current.contractType}`, { defaultValue: current.contractType })
                  },
                  { label: t('contracts.supplierField'), value: current.supplier?.companyName },
                  {
                    label: t('contracts.procedureField'),
                    value: current.procedure?.title
                      ? [current.procedure.referenceNumber, current.procedure.title].filter(Boolean).join(' · ')
                      : null
                  },
                  ...(!isDraft
                    ? [
                        { label: t('contracts.startDate'), value: current.startDate },
                        {
                          label: t('contracts.value'),
                          value: current.valueAmount != null && current.valueAmount !== ''
                            ? Number(current.valueAmount).toLocaleString()
                            : null
                        }
                      ]
                    : []),
                  ...(isClosed ? [{ label: t('contracts.endDate'), value: current.endDate }] : [])
                ].map((row) => (
                  <div key={row.label} className="min-w-0">
                    <dt className="text-xs text-muted">{row.label}</dt>
                    <dd className="text-sm font-semibold text-foreground break-words">{row.value || '—'}</dd>
                  </div>
                ))}
              </dl>
              {!isClosed ? (
                <p className="mt-3 text-xs text-muted">
                  {isDraft ? t('contracts.fixed.hintDraft') : t('contracts.fixed.hintActive')}
                </p>
              ) : null}
            </section>

            {isClosed ? (
              <section className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{current.title}</p>
                {current.notes ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap rounded-xl border border-border px-3 py-2">{current.notes}</p>
                ) : null}
              </section>
            ) : (
              <section className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.titleField')}</label>
                  <input className="input-brand" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {!current.contractNumber ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.number')}</label>
                      <input className="input-brand" value={editForm.contractNumber} onChange={(e) => setEditForm({ ...editForm, contractNumber: e.target.value })} />
                    </div>
                  ) : null}
                  {canSetValue ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.value')}</label>
                      <input className="input-brand" type="number" min={0} value={editForm.valueAmount} onChange={(e) => setEditForm({ ...editForm, valueAmount: e.target.value })} />
                    </div>
                  ) : null}
                  {isDraft ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.startDate')}</label>
                      <DateOnlyPicker className="input-brand w-full" value={editForm.startDate} onChange={(startDate) => setEditForm({ ...editForm, startDate })} />
                    </div>
                  ) : null}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.endDate')}</label>
                    <DateOnlyPicker className="input-brand w-full" value={editForm.endDate} minDate={editForm.startDate || undefined} onChange={(endDate) => setEditForm({ ...editForm, endDate })} />
                  </div>
                </div>
                {!current.supplier?.id && !current.supplierId ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.supplierField')}</label>
                    <BrandSelect value={editForm.supplierId} onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}>
                      <option value="">{t('contracts.selectSupplier')}</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>{sup.companyName}</option>
                      ))}
                    </BrandSelect>
                  </div>
                ) : null}
                {!current.procedure?.id && !current.procedureId ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.procedureField')}</label>
                    <BrandSelect value={editForm.procedureId} onChange={(e) => setEditForm({ ...editForm, procedureId: e.target.value })}>
                      <option value="">{t('contracts.selectProcedure')}</option>
                      {procedures.map((proc) => (
                        <option key={proc.id} value={proc.id}>{proc.title}</option>
                      ))}
                    </BrandSelect>
                  </div>
                ) : null}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.notes')}</label>
                  <textarea className="input-brand" rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
              </section>
            )}

            {editDetailLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : editDetail ? (
              <ContractThread
                contractId={editDetail.id}
                messages={editDetail.messages || []}
                deliveryStatus={editDetail.deliveryStatus || 'none'}
                mode="buyer"
                contractStatus={editDetail.status}
                readOnly={editDetail.status !== 'active'}
                onUpdated={() => {
                  if (editing) loadEditDetail(editing.id, true);
                  load();
                }}
                onRefresh={() => {
                  if (editing) loadEditDetail(editing.id, true);
                }}
              />
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      <CenterModal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        title={t('contracts.end.title')}
        subtitle={editing?.title}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold" onClick={() => setEndOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-reject px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              disabled={saving || endReason.trim().length < END_REASON_MIN}
              onClick={endContract}
            >
              {t('contracts.end.confirm')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            {t('contracts.end.warning')}
          </p>
          <div>
            <label htmlFor="contract-end-reason" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('contracts.end.reasonLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="contract-end-reason"
              className="input-brand"
              rows={4}
              maxLength={2000}
              autoFocus
              placeholder={t('contracts.end.reasonPlaceholder')}
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              {endReason.trim().length < END_REASON_MIN
                ? t('contracts.end.reasonMin', { count: END_REASON_MIN })
                : t('contracts.end.reasonShared')}
            </p>
          </div>
        </div>
      </CenterModal>
    </div>
  );
}
