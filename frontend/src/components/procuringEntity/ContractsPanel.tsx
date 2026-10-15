import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ClipboardList, FileText, Trophy, Building2, Calendar, ChevronRight, Hash } from 'lucide-react';
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
  procedure?: { id?: string; title?: string } | null;
  callOffs?: Array<{ id: string; title: string; status: string }>;
};

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
  const [disMemberships, setDisMemberships] = useState<Array<{
    id: string;
    status: string;
    supplier?: { companyName?: string };
    procedure?: { title?: string };
  }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; companyName: string }>>([]);
  const [procedures, setProcedures] = useState<Array<{ id: string; title: string; status: string }>>([]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    total
  } = useListPagination(contracts);

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

  const loadEditDetail = async (id: string) => {
    try {
      setEditDetailLoading(true);
      const res = await api.get(`/contracts/${id}`);
      setEditDetail(res.data.contract || null);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadContracts'), 'error');
      setEditDetail(null);
    } finally {
      setEditDetailLoading(false);
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

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await api.put(`/contracts/${editing.id}`, {
        title: editForm.title.trim(),
        contractType: editForm.contractType,
        contractNumber: editForm.contractNumber || null,
        startDate: editForm.startDate || null,
        endDate: editForm.endDate || null,
        status: editForm.status,
        valueAmount: editForm.valueAmount === '' ? null : Number(editForm.valueAmount),
        notes: editForm.notes || null,
        supplierId: editForm.supplierId || null,
        procedureId: editForm.procedureId || null
      });
      showToast(t('msg.saved'), 'success');
      if (editing) await loadEditDetail(editing.id);
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
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
            <option value="expired">{t('contracts.status.expired')}</option>
            <option value="terminated">{t('contracts.status.terminated')}</option>
          </BrandSelect>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.number')}</label>
          <input className="input-brand" value={values.contractNumber} onChange={(e) => setValues({ ...values, contractNumber: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('contracts.value')}</label>
          <input className="input-brand" type="number" value={values.valueAmount} onChange={(e) => setValues({ ...values, valueAmount: e.target.value })} />
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
        <AdminStatsGrid>
          <AdminStatCard label={t('contracts.statProcedures')} value={analytics.procedures} icon={ClipboardList} accent="blue" />
          <AdminStatCard label={t('contracts.statContracts')} value={analytics.contracts} icon={FileText} accent="green" />
          <AdminStatCard label={t('contracts.statAwards')} value={analytics.awards} icon={Trophy} accent="violet" />
        </AdminStatsGrid>
      ) : null}

      <div className="space-y-3">
        {contracts.length === 0 ? (
          <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">{t('contracts.empty')}</div>
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
                      {t('common.edit')}
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
        footer={
          <button type="button" className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" disabled={saving} onClick={saveEdit}>
            {t('common.save')}
          </button>
        }
      >
        {editing ? (
          <>
            {formFields(editForm, setEditForm)}
            {editDetailLoading ? (
              <p className="text-sm text-muted mt-4">{t('common.loading')}</p>
            ) : editDetail ? (
              <ContractThread
                contractId={editDetail.id}
                messages={editDetail.messages || []}
                deliveryStatus={editDetail.deliveryStatus || 'none'}
                mode="buyer"
                readOnly={editDetail.status !== 'active'}
                onUpdated={() => {
                  if (editing) loadEditDetail(editing.id);
                  load();
                }}
              />
            ) : null}
          </>
        ) : null}
      </SlideOver>
    </div>
  );
}
