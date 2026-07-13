import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Circle } from 'lucide-react';

export type EntityCompleteness = {
  percent: number;
  sections: { id: string; label: string; complete: boolean; missing?: string[] }[];
};

type ProfileSlice = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  entityName?: string;
  address?: string;
  city?: string;
  country?: string;
};

function isFilled(value?: string) {
  return Boolean(value && String(value).trim());
}

export function computeEntityCompleteness(
  profile: ProfileSlice,
  documentCount: number,
  t: (key: string) => string
): EntityCompleteness {
  const contactMissing: string[] = [];
  if (!isFilled(profile.firstName)) contactMissing.push(t('forms.firstName'));
  if (!isFilled(profile.lastName)) contactMissing.push(t('forms.lastName'));
  if (!isFilled(profile.phone)) contactMissing.push(t('forms.phone'));

  const orgMissing: string[] = [];
  if (!isFilled(profile.entityName)) orgMissing.push(t('forms.entityName'));
  if (!isFilled(profile.address)) orgMissing.push(t('forms.address'));
  if (!isFilled(profile.city)) orgMissing.push(t('forms.city'));
  if (!isFilled(profile.country)) orgMissing.push(t('forms.country'));

  const sections = [
    {
      id: 'contact',
      label: t('entityPortal.profileTabs.contact'),
      complete: contactMissing.length === 0,
      missing: contactMissing,
    },
    {
      id: 'organization',
      label: t('entityPortal.profileTabs.organization'),
      complete: orgMissing.length === 0,
      missing: orgMissing,
    },
    {
      id: 'documents',
      label: t('entityPortal.profileTabs.documents'),
      complete: documentCount > 0,
      missing: documentCount > 0 ? [] : [t('sections.documents')],
    },
  ];

  const completeCount = sections.filter((s) => s.complete).length;
  const percent = Math.round((completeCount / sections.length) * 100);

  return { percent, sections };
}

export function ProcuringEntityProfileCompletenessRail({
  completeness,
}: {
  completeness: EntityCompleteness | null;
}) {
  const { t } = useTranslation();
  if (!completeness) return null;

  return (
    <nav
      className="bg-white rounded-xl border border-border shadow-sm overflow-hidden"
      aria-label={t('entityPortal.profileCompleteness')}
    >
      <div className="px-3 py-3 border-b border-border bg-surface/60">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground leading-tight">
            {t('entityPortal.profileCompleteness')}
          </p>
          <span className="text-xs font-bold text-accent tabular-nums">{completeness.percent}%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${completeness.percent}%` }} />
        </div>
      </div>
      <ul className="py-1.5">
        {completeness.sections.map((section) => (
          <li key={section.id}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                section.complete ? 'text-green-800' : 'text-amber-900'
              }`}
              title={section.missing?.length ? section.missing.join(', ') : section.label}
            >
              {section.complete ? (
                <CheckCircle size={14} className="shrink-0 text-green-600" aria-hidden />
              ) : (
                <Circle size={14} className="shrink-0 text-amber-500" aria-hidden />
              )}
              <span className={`font-medium truncate ${section.complete ? '' : 'font-semibold'}`}>
                {section.label}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ProcuringEntityProfileCompletenessMobile({
  completeness,
}: {
  completeness: EntityCompleteness | null;
}) {
  const { t } = useTranslation();
  if (!completeness) return null;
  const incomplete = completeness.sections.filter((s) => !s.complete).length;

  return (
    <div className="lg:hidden bg-white rounded-xl border border-border px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{t('entityPortal.profileCompleteness')}</p>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-1.5">
          <div className="h-full bg-accent" style={{ width: `${completeness.percent}%` }} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-accent tabular-nums">{completeness.percent}%</p>
        <p className="text-[10px] text-muted">
          {incomplete === 0
            ? t('entityPortal.profileComplete')
            : `${incomplete} ${t('entityPortal.profileIncomplete')}`}
        </p>
      </div>
    </div>
  );
}

export function useEntityCompleteness(profile: ProfileSlice, documentCount: number) {
  const { t } = useTranslation();
  return useMemo(
    () => computeEntityCompleteness(profile, documentCount, t),
    [profile, documentCount, t]
  );
}
