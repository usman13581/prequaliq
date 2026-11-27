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
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 flex gap-2 items-center mb-2">
        <Clock className="text-amber-600 shrink-0" size={16} />
        <p className="text-xs text-amber-800 min-w-0">
          <span className="text-sm font-semibold text-amber-900 mr-2">
            {t('accountStatus.pendingTitle', { role: roleLabel || t('accountStatus.account') })}
          </span>
          {t('accountStatus.pendingBody')}
        </p>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 flex gap-2 items-center mb-2">
        <AlertTriangle className="text-red-600 shrink-0" size={16} />
        <p className="text-xs text-red-800 min-w-0">
          <span className="text-sm font-semibold text-red-900 mr-2">{t('accountStatus.rejectedTitle')}</span>
          {t('accountStatus.rejectedBody')}
          {rejectionReason ? <span className="ml-2 font-semibold text-red-700">{rejectionReason}</span> : null}
        </p>
      </div>
    );
  }

  if (status === 'requalification_required') {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 flex gap-2 items-center mb-2">
        <AlertTriangle className="text-orange-600 shrink-0" size={16} />
        <p className="text-xs text-orange-800 min-w-0">
          <span className="text-sm font-semibold text-orange-900 mr-2">{t('accountStatus.requalTitle')}</span>
          {t('accountStatus.requalBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-1.5 flex gap-2 items-center mb-2">
      <CheckCircle className="text-green-600 shrink-0" size={16} />
      <p className="text-sm text-green-900">{status === 'approved' ? t('common.approved') : status}</p>
    </div>
  );
}
