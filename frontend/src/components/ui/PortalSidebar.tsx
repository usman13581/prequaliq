import type { LucideIcon } from 'lucide-react';

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
  const isWide = variant === 'wide';
  return (
    <>
      {/* Desktop: sticky left rail */}
      <aside
        className={`portal-sidebar ${isWide ? 'portal-sidebar--wide' : ''} hidden md:flex flex-col shrink-0 sticky top-[var(--portal-header-height)] self-start h-[calc(100vh-var(--portal-header-height))] py-2.5 ${isWide ? 'w-[5.75rem]' : 'w-16'} ${className}`}
        aria-label="Main navigation"
      >
        <nav className="flex flex-col gap-0.5 px-1">
          {items.map(({ id, label, icon: Icon }) => {
            const active = activeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
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
        aria-label="Main navigation"
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
