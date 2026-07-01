import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../services/api';

type Submission = {
  id: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

export function SupplierProfileSubmissionHistory() {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/supplier/profile/submissions');
        setSubmissions(res.data.submissions || []);
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-border">
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-4">
        <History size={20} className="text-primary-600" />
        <h3 className="font-bold text-gray-900">{t('supplierPortal.submissionHistoryTitle')}</h3>
      </div>
      {submissions.length === 0 ? (
        <p className="text-sm text-muted">{t('supplierPortal.noSubmissions')}</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <li key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-surface border border-border">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {t('supplierPortal.submissionVersion', { version: s.version })}
                </p>
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <Clock size={12} />
                  {t('supplierPortal.submittedOn')}: {new Date(s.submittedAt).toLocaleString()}
                </p>
                {s.reviewedAt && (
                  <p className="text-xs text-muted mt-0.5">
                    {t('supplierPortal.reviewedOn')}: {new Date(s.reviewedAt).toLocaleString()}
                  </p>
                )}
                {s.status === 'rejected' && s.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1">{s.rejectionReason}</p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                s.status === 'approved' ? 'bg-green-100 text-green-800' :
                s.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {s.status === 'approved' ? <CheckCircle size={12} /> : s.status === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                {t(`common.${s.status}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
