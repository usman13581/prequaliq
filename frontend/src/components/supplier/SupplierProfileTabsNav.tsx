import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Wallet,
  MapPin,
  Award,
  Shield,
  Users,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import type { Completeness } from './SupplierProfileCompleteness';

export type ProfileTabId =
  | 'basic'
  | 'financial'
  | 'scope'
  | 'certifications'
  | 'compliance'
  | 'references'
  | 'insurance';

const TABS: ProfileTabId[] = [
  'basic',
  'financial',
  'scope',
  'certifications',
  'compliance',
  'references',
  'insurance',
];

const TAB_ICONS: Record<ProfileTabId, LucideIcon> = {
  basic: User,
  financial: Wallet,
  scope: MapPin,
  certifications: Award,
  compliance: Shield,
  references: Users,
  insurance: FileText,
};

const TAB_SECTION_IDS: Record<ProfileTabId, string[]> = {
  basic: ['company'],
  financial: ['q2'],
  scope: ['cpv', 'nuts'],
  certifications: ['q5', 'q6', 'q7', 'q8'],
  compliance: ['q9', 'q10', 'q11'],
  references: ['references', 'q12'],
  insurance: ['insurance'],
};

function isTabIncomplete(tab: ProfileTabId, completeness: Completeness | null): boolean {
  if (!completeness) return false;

  const company = completeness.sections.find((s) => s.id === 'company');

  if (tab === 'basic') {
    if (!company || company.complete) return false;
    return (company.missing || []).some((m) => m !== 'turnover');
  }

  if (tab === 'financial') {
    const q2 = completeness.sections.find((s) => s.id === 'q2');
    const turnoverMissing = company && !company.complete && (company.missing || []).includes('turnover');
    return Boolean(turnoverMissing || (q2 && !q2.complete));
  }

  return TAB_SECTION_IDS[tab].some((id) => {
    const section = completeness.sections.find((s) => s.id === id);
    return section && !section.complete;
  });
}

type SupplierProfileTabsNavProps = {
  activeTab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  completeness: Completeness | null;
};

export function SupplierProfileTabsNav({
  activeTab,
  onTabChange,
  completeness,
}: SupplierProfileTabsNavProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollEdges({
      left: el.scrollLeft > 4,
      right: maxScroll > 4 && el.scrollLeft < maxScroll - 4,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollEdges();

    el.addEventListener('scroll', updateScrollEdges, { passive: true });
    const observer = new ResizeObserver(updateScrollEdges);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollEdges);
      observer.disconnect();
    };
  }, [updateScrollEdges]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const activeButton = el.querySelector<HTMLButtonElement>(`[data-tab="${activeTab}"]`);
    activeButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  return (
    <div className="relative rounded-xl border border-border bg-white shadow-sm">
      {scrollEdges.left && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 rounded-l-xl bg-gradient-to-r from-white via-white/80 to-transparent"
          aria-hidden
        />
      )}
      {scrollEdges.right && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 rounded-r-xl bg-gradient-to-l from-white via-white/80 to-transparent"
          aria-hidden
        />
      )}

      <div
        ref={scrollRef}
        className="flex gap-0.5 overflow-x-auto overscroll-x-contain px-1 py-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={t('supplierPortal.profileTabsLabel')}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const incomplete = isTabIncomplete(tab, completeness);
          const Icon = TAB_ICONS[tab];
          const label = t(`supplierPortal.profileTabs.${tab}`);
          const shortLabel = t(`supplierPortal.profileTabsShort.${tab}`);

          return (
            <button
              key={tab}
              type="button"
              data-tab={tab}
              role="tab"
              aria-selected={isActive}
              aria-label={incomplete ? `${label} (${t('supplierPortal.profileTabIncomplete')})` : label}
              onClick={() => onTabChange(tab)}
              className={`group relative shrink-0 snap-start inline-flex flex-col items-center justify-center min-w-[4.25rem] sm:min-w-0 px-2.5 sm:px-3.5 py-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-surface hover:text-gray-900'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2.25 : 2}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                  aria-hidden
                />
                <span className="text-[11px] sm:text-sm font-semibold leading-tight whitespace-nowrap">
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
                {incomplete && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ring-2 ${
                      isActive
                        ? 'bg-amber-500 ring-primary-50'
                        : 'bg-amber-500 ring-white'
                    }`}
                    aria-hidden
                  />
                )}
              </span>

              <span
                className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-700 opacity-100 scale-x-100'
                    : 'bg-primary-400 opacity-0 scale-x-75 group-hover:opacity-40'
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
