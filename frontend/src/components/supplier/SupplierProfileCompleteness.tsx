import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle } from 'lucide-react';
import { translateCompletenessSection } from '../../lib/supplierCompletenessI18n';

type Completeness = {
  percent: number;
  readyToSubmit: boolean;
  sections: { id: string; label: string; complete: boolean }[];
  blockers: string[];
};

export function SupplierProfileCompleteness({ completeness }: { completeness: Completeness | null }) {
  const { t } = useTranslation();
  if (!completeness) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-border mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-900">{t('supplierPortal.profileCompleteness')}</h3>
          <p className="text-sm text-muted">{completeness.percent}% {t('supplierPortal.complete')}</p>
        </div>
        {completeness.readyToSubmit ? (
          <span className="inline-flex items-center gap-1 text-green-700 text-sm font-semibold">
            <CheckCircle size={16} /> {t('supplierPortal.readyToSubmit')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-semibold">
            <XCircle size={16} /> {t('supplierPortal.notReadyToSubmit')}
          </span>
        )}
      </div>
      <div className="h-3 bg-surface rounded-full overflow-hidden mb-4">
        <div className="h-full bg-accent transition-all" style={{ width: `${completeness.percent}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {completeness.sections.map((section) => (
          <div
            key={section.id}
            className={`text-sm px-3 py-2 rounded-lg border ${section.complete ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
          >
            {translateCompletenessSection(t, section)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SupplierSubmitModal({
  open,
  completeness,
  loading,
  onClose,
  onConfirm
}: {
  open: boolean;
  completeness: Completeness | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-xl font-bold text-gray-900">{t('supplierPortal.submitTitle')}</h3>
          <p className="text-sm text-muted mt-1">{t('supplierPortal.submitSubtitle')}</p>
        </div>
        <div className="p-6 space-y-4">
          {completeness?.sections.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              {s.complete ? <CheckCircle className="text-green-600" size={16} /> : <XCircle className="text-red-500" size={16} />}
              <span>{translateCompletenessSection(t, s)}</span>
            </div>
          ))}
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
            {t('supplierPortal.submitConfirm')}
          </label>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-cancel px-5 py-2.5 rounded-xl">{t('common.cancel')}</button>
          <button
            type="button"
            disabled={!confirmed || loading || !completeness?.readyToSubmit}
            onClick={onConfirm}
            className="btn-save px-5 py-2.5 rounded-xl disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('supplierPortal.submitForQualification')}
          </button>
        </div>
      </div>
    </div>
  );
}
