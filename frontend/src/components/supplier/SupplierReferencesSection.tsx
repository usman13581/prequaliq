import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
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

export function SupplierReferencesSection({ editing }: { editing: boolean }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [references, setReferences] = useState<Reference[]>([]);
  const [form, setForm] = useState(emptyRef);
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
      await api.post('/supplier/references', {
        projectName: form.projectName.trim(),
        clientName: form.clientName.trim() || null,
        yearFrom: form.yearFrom ? parseInt(form.yearFrom) : null,
        yearTo: form.yearTo ? parseInt(form.yearTo) : null,
        contractValue: form.contractValue.trim() || null,
        description: form.description.trim() || null,
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null
      });
      setForm(emptyRef);
      fetchReferences();
      showToast(t('supplierPortal.referenceAdded'), 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/supplier/references/${id}`);
      fetchReferences();
      showToast(t('supplierPortal.referenceDeleted'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
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
            <div key={ref.id} className="bg-white rounded-xl p-4 border border-border flex justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{ref.projectName}</p>
                {ref.clientName && <p className="text-sm text-muted">{ref.clientName}</p>}
                {(ref.yearFrom || ref.yearTo) && (
                  <p className="text-xs text-muted mt-1">{ref.yearFrom || '?'} – {ref.yearTo || '?'}</p>
                )}
                {ref.description && <p className="text-sm text-gray-700 mt-2">{ref.description}</p>}
              </div>
              {editing && (
                <button type="button" onClick={() => handleDelete(ref.id)} className="text-red-500 hover:text-red-700 shrink-0">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input-brand" placeholder={t('supplierPortal.projectName')} value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
          <input className="input-brand" placeholder={t('supplierPortal.clientName')} value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
          <input className="input-brand" placeholder={t('supplierPortal.yearFrom')} value={form.yearFrom} onChange={(e) => setForm({ ...form, yearFrom: e.target.value })} />
          <input className="input-brand" placeholder={t('supplierPortal.yearTo')} value={form.yearTo} onChange={(e) => setForm({ ...form, yearTo: e.target.value })} />
          <textarea className="input-brand md:col-span-2" rows={3} placeholder={t('supplierPortal.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="button" disabled={loading} onClick={handleAdd} className="btn-save md:col-span-2 inline-flex items-center justify-center gap-2 py-3 rounded-xl">
            <Plus size={18} /> {t('supplierPortal.addReference')}
          </button>
        </div>
      )}
    </div>
  );
}
