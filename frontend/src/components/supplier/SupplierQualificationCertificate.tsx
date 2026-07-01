import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Award, Download, Printer } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

type Qualification = {
  companyName: string;
  status: string;
  qualifiedAt?: string;
  qualificationExpiresAt?: string;
  profileVersion?: number;
  cpvCodes?: { code: string; description: string }[];
  nutsCodes?: { code: string; name: string }[];
};

function buildCertificateHtml(data: Qualification, t: TFunction) {
  const cpvList = (data.cpvCodes || []).map((c) => `${c.code} – ${c.description}`).join('<br/>') || '—';
  const nutsList = (data.nutsCodes || []).map((n) => `${n.code} – ${n.name}`).join('<br/>') || '—';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${t('supplierPortal.certificateTitle')}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 720px; margin: 40px auto; color: #0f172a; }
  .header { text-align: center; border-bottom: 3px solid #1e3a5f; padding-bottom: 24px; margin-bottom: 32px; }
  h1 { color: #1e3a5f; margin: 0 0 8px; font-size: 28px; }
  .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 6px 16px; border-radius: 999px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
  .field label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
  .field p { margin: 4px 0 0; font-weight: 600; }
  .section { margin-top: 24px; }
  .footer { margin-top: 48px; font-size: 12px; color: #94a3b8; text-align: center; }
  @media print { body { margin: 20px; } }
</style></head><body>
  <div class="header">
    <h1>PrequaliQ</h1>
    <p class="badge">${t('supplierPortal.certificateTitle')}</p>
  </div>
  <div class="grid">
    <div class="field"><label>${t('forms.companyName')}</label><p>${data.companyName}</p></div>
    <div class="field"><label>${t('supplierPortal.qualificationStatus')}</label><p>${data.status}</p></div>
    <div class="field"><label>${t('supplierPortal.qualifiedOn')}</label><p>${data.qualifiedAt ? new Date(data.qualifiedAt).toLocaleDateString() : '—'}</p></div>
    <div class="field"><label>${t('supplierPortal.validUntil')}</label><p>${data.qualificationExpiresAt ? new Date(data.qualificationExpiresAt).toLocaleDateString() : '—'}</p></div>
    <div class="field"><label>${t('supplierPortal.profileVersion')}</label><p>v${data.profileVersion || 1}</p></div>
  </div>
  <div class="section"><label>${t('supplierPortal.certificateCpv')}</label><p>${cpvList}</p></div>
  <div class="section"><label>${t('supplierPortal.certificateNuts')}</label><p>${nutsList}</p></div>
  <div class="footer">${t('supplierPortal.certificateFooter')} · ${new Date().toLocaleDateString()}</div>
</body></html>`;
}

export function SupplierQualificationCertificate({
  companyName,
  qualificationExpiresAt,
  canDownload
}: {
  companyName?: string;
  qualificationExpiresAt?: string;
  canDownload: boolean;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!canDownload || !qualificationExpiresAt) return null;

  const fetchQualification = async () => {
    const res = await api.get('/supplier/qualification');
    return res.data as Qualification;
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const data = await fetchQualification();
      const html = buildCertificateHtml(data, t);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prequaliq-certificate-${(data.companyName || companyName || 'supplier').replace(/\s+/g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('supplierPortal.certificateDownloaded'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      setLoading(true);
      const data = await fetchQualification();
      const html = buildCertificateHtml(data, t);
      const win = window.open('', '_blank');
      if (!win) {
        showToast(t('supplierPortal.popupBlocked'), 'error');
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary-50 to-accent-subtle rounded-2xl p-6 border border-primary-100">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Award className="text-primary-700 shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-gray-900">{t('supplierPortal.certificateTitle')}</h3>
            <p className="text-sm text-muted mt-1">{companyName}</p>
            <p className="text-sm text-muted mt-1">
              {t('supplierPortal.validUntil')}: {new Date(qualificationExpiresAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white hover:bg-surface text-sm font-medium"
          >
            <Printer size={16} />
            {t('supplierPortal.printCertificate')}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDownload}
            className="btn-save inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Download size={16} />
            {t('supplierPortal.downloadCertificate')}
          </button>
        </div>
      </div>
    </div>
  );
}
