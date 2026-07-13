import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Circle } from 'lucide-react';
import { translateCompletenessSection } from '../../lib/supplierCompletenessI18n';

export type Completeness = {
  percent: number;
  readyToSubmit: boolean;
  sections: { id: string; label: string; complete: boolean; missing?: string[] }[];
  blockers: string[];
};

function shortSectionLabel(t: ReturnType<typeof useTranslation>['t'], id: string): string {
  const key = `supplierPortal.completenessSectionsShort.${id}`;
  const translated = t(key);
  return translated !== key ? translated : id.toUpperCase();
}

/** Compact right-rail checklist — icon + short label per section */
export function SupplierProfileCompletenessRail({ completeness }: { completeness: Completeness | null }) {
  const { t } = useTranslation();
  if (!completeness) return null;

  return (
    <nav
      className="bg-white rounded-xl border border-border shadow-sm overflow-hidden"
      aria-label={t('supplierPortal.profileCompleteness')}
    >
      <div className="px-3 py-3 border-b border-border bg-surface/60">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground leading-tight">{t('supplierPortal.profileCompleteness')}</p>
          <span className="text-xs font-bold text-accent tabular-nums">{completeness.percent}%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all ${completeness.readyToSubmit ? 'bg-green-500' : 'bg-accent'}`}
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] font-medium leading-tight">
          {completeness.readyToSubmit ? (
            <span className="text-green-700 inline-flex items-center gap-1">
              <CheckCircle size={11} /> {t('supplierPortal.readyToSubmit')}
            </span>
          ) : (
            <span className="text-amber-700 inline-flex items-center gap-1">
              <XCircle size={11} /> {t('supplierPortal.notReadyToSubmit')}
            </span>
          )}
        </p>
      </div>
      <ul className="py-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto">
        {completeness.sections.map((section) => (
          <li key={section.id}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                section.complete ? 'text-green-800' : 'text-amber-900'
              }`}
              title={translateCompletenessSection(t, section)}
            >
              {section.complete ? (
                <CheckCircle size={14} className="shrink-0 text-green-600" aria-hidden />
              ) : (
                <Circle size={14} className="shrink-0 text-amber-500" aria-hidden />
              )}
              <span className={`font-medium truncate ${section.complete ? '' : 'font-semibold'}`}>
                {shortSectionLabel(t, section.id)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Mobile: single-line summary */
export function SupplierProfileCompletenessMobile({ completeness }: { completeness: Completeness | null }) {
  const { t } = useTranslation();
  if (!completeness) return null;
  const incomplete = completeness.sections.filter((s) => !s.complete).length;

  return (
    <div className="lg:hidden bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{t('supplierPortal.profileCompleteness')}</p>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-1.5">
          <div className="h-full bg-accent" style={{ width: `${completeness.percent}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-accent tabular-nums">{completeness.percent}%</p>
        <p className="text-[10px] text-muted">
          {incomplete === 0 ? t('supplierPortal.readyToSubmit') : `${incomplete} ${t('supplierPortal.incomplete')}`}
        </p>
      </div>
    </div>
  );
}

type ProfileStatus = {
  status?: string;
  rejectionReason?: string;
  qualificationExpiresAt?: string;
  profileSubmittedAt?: string;
};

/** Inline qualification status — sits beside save / cancel */
export function SupplierQualificationStatusBar({ profile }: { profile: ProfileStatus | null | undefined }) {
  const { t } = useTranslation();
  if (!profile) return null;

  const status = profile.status || 'pending';
  const badgeClass =
    status === 'approved'
      ? 'bg-green-100 text-green-700'
      : status === 'rejected'
        ? 'bg-red-100 text-red-700'
        : status === 'requalification_required'
          ? 'bg-orange-100 text-orange-800'
          : 'bg-yellow-100 text-yellow-700';

  const statusLabel =
    status === 'requalification_required'
      ? t('supplierPortal.requalificationTitle')
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted whitespace-nowrap">{t('supplierPortal.qualificationStatus')}:</span>
        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${badgeClass}`}>{statusLabel}</span>
      </div>
      {status === 'rejected' && profile.rejectionReason && (
        <span className="text-xs text-red-600 truncate max-w-xs" title={profile.rejectionReason}>
          {profile.rejectionReason}
        </span>
      )}
      {profile.profileSubmittedAt && (
        <span className="text-xs text-muted whitespace-nowrap">
          {t('columns.submittedAt')}: {new Date(profile.profileSubmittedAt).toLocaleDateString()}
        </span>
      )}
      {status === 'requalification_required' && profile.qualificationExpiresAt && (
        <span className="text-xs text-orange-700 whitespace-nowrap">
          {t('supplierPortal.validUntil')}: {new Date(profile.qualificationExpiresAt).toLocaleDateString()}
        </span>
      )}
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
