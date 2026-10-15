import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'requalification_required' | string | undefined;

export function AccountStatusBanner({
  status,
  rejectionReason,
  roleLabel
}: {
  status?: AccountStatus;
  rejectionReason?: string | null;
  roleLabel?: string;
}) {
  const { t } = useTranslation();
  if (!status || status === 'approved') return null;

  if (status === 'pending') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex gap-3 items-start mb-4">
        <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {t('accountStatus.pendingTitle', { role: roleLabel || t('accountStatus.account') })}
          </p>
          <p className="text-xs text-amber-800 mt-1">{t('accountStatus.pendingBody')}</p>
        </div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3 items-start mb-4">
        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-red-900">{t('accountStatus.rejectedTitle')}</p>
          <p className="text-xs text-red-800 mt-1">{t('accountStatus.rejectedBody')}</p>
          {rejectionReason ? (
            <p className="text-xs text-red-700 mt-2 font-medium">{rejectionReason}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === 'requalification_required') {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex gap-3 items-start mb-4">
        <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm font-semibold text-orange-900">{t('accountStatus.requalTitle')}</p>
          <p className="text-xs text-orange-800 mt-1">{t('accountStatus.requalBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex gap-3 items-start mb-4">
      <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
      <p className="text-sm text-green-900">{status === 'approved' ? t('common.approved') : status}</p>
    </div>
  );
}
