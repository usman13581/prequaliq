import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit2, Save, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

type Reference = {
  id: string;
  projectName: string;
  clientName?: string;
  yearFrom?: number;
  yearTo?: number;
  contractValue?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

const emptyRef = {
  projectName: '',
  clientName: '',
  yearFrom: '',
  yearTo: '',
  contractValue: '',
  description: '',
  contactName: '',
  contactEmail: '',
  contactPhone: ''
};

function refToForm(ref: Reference) {
  return {
    projectName: ref.projectName || '',
    clientName: ref.clientName || '',
    yearFrom: ref.yearFrom?.toString() || '',
    yearTo: ref.yearTo?.toString() || '',
    contractValue: ref.contractValue || '',
    description: ref.description || '',
    contactName: ref.contactName || '',
    contactEmail: ref.contactEmail || '',
    contactPhone: ref.contactPhone || ''
  };
}

function payloadFromForm(form: typeof emptyRef) {
  return {
    projectName: form.projectName.trim(),
    clientName: form.clientName.trim() || null,
    yearFrom: form.yearFrom ? parseInt(form.yearFrom) : null,
    yearTo: form.yearTo ? parseInt(form.yearTo) : null,
    contractValue: form.contractValue.trim() || null,
    description: form.description.trim() || null,
    contactName: form.contactName.trim() || null,
    contactEmail: form.contactEmail.trim() || null,
    contactPhone: form.contactPhone.trim() || null
  };
}

function ReferenceForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  loading,
  submitLabel
}: {
  form: typeof emptyRef;
  setForm: (f: typeof emptyRef) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  loading: boolean;
  submitLabel: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input className="input-brand" placeholder={t('supplierPortal.projectName')} value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.clientName')} value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.yearFrom')} value={form.yearFrom} onChange={(e) => setForm({ ...form, yearFrom: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.yearTo')} value={form.yearTo} onChange={(e) => setForm({ ...form, yearTo: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.contractValue')} value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.contactName')} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.contactEmail')} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
      <input className="input-brand" placeholder={t('supplierPortal.contactPhone')} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
      <textarea className="input-brand md:col-span-2" rows={3} placeholder={t('supplierPortal.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="md:col-span-2 flex flex-wrap gap-2">
        <button type="button" disabled={loading} onClick={onSubmit} className="btn-save inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl">
          <Save size={18} /> {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-cancel inline-flex items-center gap-2 py-2.5 px-5 rounded-xl">
            <X size={18} /> {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

export function SupplierReferencesSection({ editing }: { editing: boolean }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [references, setReferences] = useState<Reference[]>([]);
  const [form, setForm] = useState(emptyRef);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReferences = async () => {
    try {
      const res = await api.get('/supplier/references');
      setReferences(res.data.references || []);
    } catch {
      setReferences([]);
    }
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  const handleAdd = async () => {
    if (!form.projectName.trim()) {
      showToast(t('supplierPortal.referenceNameRequired'), 'error');
      return;
    }
    try {
      setLoading(true);
      await api.post('/supplier/references', payloadFromForm(form));
      setForm(emptyRef);
      fetchReferences();
      showToast(t('supplierPortal.referenceAdded'), 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!form.projectName.trim()) {
      showToast(t('supplierPortal.referenceNameRequired'), 'error');
      return;
    }
    try {
      setLoading(true);
      await api.put(`/supplier/references/${id}`, payloadFromForm(form));
      setEditingId(null);
      setForm(emptyRef);
      fetchReferences();
      showToast(t('supplierPortal.referenceUpdated'), 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/supplier/references/${id}`);
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyRef);
      }
      fetchReferences();
      showToast(t('supplierPortal.referenceDeleted'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
  };

  const startEdit = (ref: Reference) => {
    setEditingId(ref.id);
    setForm(refToForm(ref));
  };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
      <h3 className="text-lg font-bold text-gray-900 mb-2">{t('supplierPortal.referencesTitle')}</h3>
      <p className="text-sm text-muted mb-4">{t('supplierPortal.referencesSubtitle')}</p>

      {references.length === 0 ? (
        <p className="text-sm text-muted mb-4">{t('supplierPortal.noReferences')}</p>
      ) : (
        <div className="space-y-3 mb-4">
          {references.map((ref) => (
            <div key={ref.id} className="bg-white rounded-xl p-4 border border-border">
              {editingId === ref.id ? (
                <ReferenceForm
                  form={form}
                  setForm={setForm}
                  loading={loading}
                  submitLabel={t('supplierPortal.saveReference')}
                  onSubmit={() => handleUpdate(ref.id)}
                  onCancel={() => { setEditingId(null); setForm(emptyRef); }}
                />
              ) : (
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{ref.projectName}</p>
                    {ref.clientName && <p className="text-sm text-muted">{ref.clientName}</p>}
                    {(ref.yearFrom || ref.yearTo) && (
                      <p className="text-xs text-muted mt-1">{ref.yearFrom || '?'} – {ref.yearTo || '?'}</p>
                    )}
                    {ref.contractValue && <p className="text-xs text-muted mt-1">{t('supplierPortal.contractValue')}: {ref.contractValue}</p>}
                    {ref.description && <p className="text-sm text-gray-700 mt-2">{ref.description}</p>}
                    {(ref.contactName || ref.contactEmail || ref.contactPhone) && (
                      <p className="text-xs text-muted mt-2">
                        {[ref.contactName, ref.contactEmail, ref.contactPhone].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {editing && (
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => startEdit(ref)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Edit2 size={18} />
                      </button>
                      <button type="button" onClick={() => handleDelete(ref.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && !editingId && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('supplierPortal.addReference')}</h4>
          <ReferenceForm
            form={form}
            setForm={setForm}
            loading={loading}
            submitLabel={t('supplierPortal.addReference')}
            onSubmit={handleAdd}
          />
        </div>
      )}
    </div>
  );
}
