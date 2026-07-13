import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Building2, FileText, type LucideIcon } from 'lucide-react';
import type { EntityCompleteness } from './ProcuringEntityProfileCompleteness';

export type EntityProfileTabId = 'contact' | 'organization' | 'documents';

const TABS: EntityProfileTabId[] = ['contact', 'organization', 'documents'];

const TAB_ICONS: Record<EntityProfileTabId, LucideIcon> = {
  contact: User,
  organization: Building2,
  documents: FileText,
};

const TAB_SECTION_IDS: Record<EntityProfileTabId, string[]> = {
  contact: ['contact'],
  organization: ['organization'],
  documents: ['documents'],
};

function isTabIncomplete(tab: EntityProfileTabId, completeness: EntityCompleteness | null): boolean {
  if (!completeness) return false;
  return TAB_SECTION_IDS[tab].some((id) => {
    const section = completeness.sections.find((s) => s.id === id);
    return section && !section.complete;
  });
}

type Props = {
  activeTab: EntityProfileTabId;
  onTabChange: (tab: EntityProfileTabId) => void;
  completeness: EntityCompleteness | null;
};

export function ProcuringEntityProfileTabsNav({ activeTab, onTabChange, completeness }: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 4);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateFades();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateFades, { passive: true });
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateFades);
      ro.disconnect();
    };
  }, [updateFades]);

  const tabLabel = (tab: EntityProfileTabId) => t(`entityPortal.profileTabs.${tab}`);

  return (
    <div className="relative">
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10" />
      )}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto overscroll-x-contain scrollbar-thin pb-0.5 -mx-1 px-1"
        role="tablist"
        aria-label={t('entityPortal.profileTabsLabel')}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const incomplete = isTabIncomplete(tab, completeness);
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab)}
              className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                isActive
                  ? 'bg-primary-50 text-primary-800 border-primary-200 shadow-sm'
                  : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={15} className="shrink-0" aria-hidden />
              <span>{tabLabel(tab)}</span>
              {incomplete && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                  aria-label={t('entityPortal.profileTabIncomplete')}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
