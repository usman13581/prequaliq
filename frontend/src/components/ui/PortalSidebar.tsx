import { useState } from 'react';
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
  /** Wider rail for longer nav labels (e.g. procuring entity) */
  variant?: 'compact' | 'wide';
};

export function PortalSidebar({ items, activeId, onSelect, className = '', variant = 'compact' }: PortalSidebarProps) {
  const { t } = useTranslation();
  const isWide = variant === 'wide';
  const [hovered, setHovered] = useState(false);
  /** After a nav click, stay collapsed until the pointer leaves the rail */
  const [collapseUntilLeave, setCollapseUntilLeave] = useState(false);
  const expanded = hovered && !collapseUntilLeave;

  const handleSelect = (id: string) => {
    onSelect(id);
    setCollapseUntilLeave(true);
  };

  return (
    <>
      {/* Desktop: sticky left rail — expands and pushes page body */}
      <aside
        className={`portal-sidebar ${isWide ? 'portal-sidebar--wide' : ''} ${expanded ? 'portal-sidebar--expanded' : ''} hidden md:flex flex-col shrink-0 sticky top-[var(--portal-header-height)] self-start h-[calc(100vh-var(--portal-header-height))] py-2.5 ${className}`}
        aria-label={t('common.mainNavigation')}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setCollapseUntilLeave(false);
        }}
      >
        <nav className="flex flex-col gap-0.5 px-1">
          {items.map(({ id, label, icon: Icon }) => {
            const active = activeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                title={label}
                className={`portal-sidebar-item ${active ? 'portal-sidebar-item--active' : ''}`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 2} className="shrink-0" />
                <span className="portal-sidebar-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: bottom icon bar */}
      <nav
        className={`portal-sidebar-mobile ${isWide ? 'portal-sidebar-mobile--wide' : ''} md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-area-pb`}
        aria-label={t('common.mainNavigation')}
      >
        <div className="flex justify-around items-stretch px-1 py-1.5 max-w-lg mx-auto">
          {items.map(({ id, label, icon: Icon }) => {
            const active = activeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                className={`portal-sidebar-item portal-sidebar-item--mobile flex-1 ${isWide ? 'max-w-[6.25rem]' : 'max-w-[5rem]'} ${active ? 'portal-sidebar-item--active' : ''}`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                <span className="portal-sidebar-label">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
