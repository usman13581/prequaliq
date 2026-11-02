import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type PortalSidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type PortalSidebarProps = {
  items: PortalSidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  /** Kept for call-site compatibility; top nav no longer uses rail width. */
  variant?: 'compact' | 'wide';
};

/**
 * Top navigation strip — square joined boxes with icon + label.
 * Horizontally scrollable when items do not fit (bar height stays fixed).
 */
export function PortalSidebar({ items, activeId, onSelect, className = '' }: PortalSidebarProps) {
  const { t } = useTranslation();

  return (
    <nav
      className={`portal-top-nav min-w-0 ${className}`}
      aria-label={t('common.mainNavigation')}
    >
      <div className="portal-top-nav-strip">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              title={label}
              className={`portal-top-nav-item ${active ? 'portal-top-nav-item--active' : ''}`}
            >
              <Icon size={16} strokeWidth={active ? 2.35 : 2} aria-hidden />
              <span className="portal-top-nav-label">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
