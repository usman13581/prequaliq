import { useTranslation } from 'react-i18next';
import {
  CheckCircle, AlertTriangle, FileText, Shield, Clock, ArrowRight
} from 'lucide-react';
import { translateCompletenessBlocker, translateNextActionLabel } from '../../lib/supplierCompletenessI18n';
import { SupplierQualificationCertificate } from './SupplierQualificationCertificate';

type DashboardData = {
  status: string;
  completeness: {
    percent: number;
    readyToSubmit: boolean;
    blockers: string[];
    documents: { expiringCount: number; expiredCount: number; missingCount: number };
  };
  openQuestionnaires: number;
  nearestDeadline?: string | null;
  qualification: {
    qualifiedAt?: string;
    qualificationExpiresAt?: string;
    profileSubmittedAt?: string;
    rejectionReason?: string;
  };
  nextAction: { labelKey?: string; label?: string; tab: string };
  companyName?: string;
};

export function SupplierOverviewTab({
  data,
  loading,
  onNavigate
}: {
  data: DashboardData | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  const { t } = useTranslation();

  if (loading || !data) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <p className="mt-6 text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    requalification_required: 'bg-orange-100 text-orange-800'
  };

  const statusLabel = data.status === 'requalification_required'
    ? t('supplierPortal.requalificationTitle')
    : t(`common.${data.status}`);

  const nextLabel = translateNextActionLabel(t, data.nextAction.labelKey, data.nextAction.label);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('supplierPortal.overviewTitle')}</h2>
        <p className="text-sm text-muted mt-1">{t('supplierPortal.overviewSubtitle')}</p>
      </div>

      {data.status === 'rejected' && data.qualification.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-800">{t('supplierPortal.rejectionTitle')}</p>
          <p className="text-sm text-red-700 mt-1">{data.qualification.rejectionReason}</p>
        </div>
      )}

      {data.status === 'requalification_required' && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="font-semibold text-orange-800">{t('supplierPortal.requalificationTitle')}</p>
          <p className="text-sm text-orange-700 mt-1">
            {t('supplierPortal.requalificationHint', {
              date: data.qualification.qualificationExpiresAt
                ? new Date(data.qualification.qualificationExpiresAt).toLocaleDateString()
                : '—'
            })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">{t('supplierPortal.qualificationStatus')}</span>
            <Shield className="text-primary-600" size={20} />
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusColors[data.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabel}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">{t('supplierPortal.profileCompleteness')}</span>
            <CheckCircle className="text-accent" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.completeness.percent}%</p>
          <div className="mt-2 h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${data.completeness.percent}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">{t('supplierPortal.openQuestionnaires')}</span>
            <FileText className="text-primary-600" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.openQuestionnaires}</p>
          {data.nearestDeadline && (
            <p className="text-xs text-muted mt-2 flex items-center gap-1">
              <Clock size={12} />
              {t('supplierPortal.nearestDeadline')}: {new Date(data.nearestDeadline).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted">{t('supplierPortal.documents')}</span>
            <AlertTriangle className="text-amber-600" size={20} />
          </div>
          <p className="text-sm text-gray-700">
            {data.completeness.documents.missingCount} {t('supplierPortal.missing')}
          </p>
          <p className="text-sm text-gray-700">
            {data.completeness.documents.expiringCount} {t('supplierPortal.expiringSoon')}
          </p>
          <p className="text-sm text-red-600">
            {data.completeness.documents.expiredCount} {t('supplierPortal.expired')}
          </p>
        </div>
      </div>

      <SupplierQualificationCertificate
        companyName={data.companyName}
        qualificationExpiresAt={data.qualification.qualificationExpiresAt}
        canDownload={data.status === 'approved' || data.status === 'requalification_required'}
      />

      <div className="bg-white rounded-2xl p-6 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t('supplierPortal.nextAction')}</p>
          <p className="text-lg font-semibold text-gray-900">{nextLabel}</p>
        </div>
        <button
          onClick={() => onNavigate(data.nextAction.tab)}
          className="btn-save inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold"
        >
          {nextLabel}
          <ArrowRight size={18} />
        </button>
      </div>

      {!data.completeness.readyToSubmit && data.completeness.blockers.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-border">
          <h3 className="font-bold text-gray-900 mb-3">{t('supplierPortal.blockersTitle')}</h3>
          <ul className="space-y-2">
            {data.completeness.blockers.slice(0, 8).map((item) => (
              <li key={item} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                {translateCompletenessBlocker(t, item)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
