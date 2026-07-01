import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, FileText, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

type ExportFormat = 'pdf' | 'excel';

type SupplierExportProfileModalProps = {
  open: boolean;
  companyName?: string;
  onClose: () => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match?.[1] || fallback;
}

export function SupplierExportProfileModal({ open, companyName, onClose }: SupplierExportProfileModalProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  if (!open) return null;

  const handleExport = async (format: ExportFormat) => {
    try {
      setLoading(format);
      const lang = (i18n.language || 'en').split('-')[0];
      const res = await api.get(`/supplier/profile/export?format=${format}&lang=${lang}`, {
        responseType: 'blob'
      });

      const mime =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext = format === 'pdf' ? 'pdf' : 'xlsx';
      const fallback = `${(companyName || 'supplier-profile').replace(/\s+/g, '-')}.${ext}`;
      const filename = filenameFromDisposition(res.headers['content-disposition'], fallback);

      downloadBlob(new Blob([res.data], { type: mime }), filename);
      showToast(t('supplierPortal.profileExported'), 'success');
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-border" role="dialog" aria-modal="true" aria-labelledby="export-profile-title">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 id="export-profile-title" className="text-lg font-bold text-gray-900">
              {t('supplierPortal.exportTitle')}
            </h3>
            <p className="text-sm text-muted mt-0.5">{t('supplierPortal.exportSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!loading}
            className="p-2 rounded-lg text-muted hover:bg-surface hover:text-foreground transition-colors"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={!!loading}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary-300 hover:bg-primary-50/40 transition-all disabled:opacity-60"
          >
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <FileText size={26} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">{t('supplierPortal.exportPdf')}</p>
              <p className="text-xs text-muted mt-1">{t('supplierPortal.exportPdfHint')}</p>
            </div>
            {loading === 'pdf' && (
              <span className="text-xs text-accent font-medium">{t('common.loading')}…</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={!!loading}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary-300 hover:bg-primary-50/40 transition-all disabled:opacity-60"
          >
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
              <FileSpreadsheet size={26} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900">{t('supplierPortal.exportExcel')}</p>
              <p className="text-xs text-muted mt-1">{t('supplierPortal.exportExcelHint')}</p>
            </div>
            {loading === 'excel' && (
              <span className="text-xs text-accent font-medium">{t('common.loading')}…</span>
            )}
          </button>
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button type="button" onClick={onClose} disabled={!!loading} className="btn-cancel px-5 py-2.5 rounded-xl text-sm font-semibold">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
