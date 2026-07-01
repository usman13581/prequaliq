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
};

export function PortalSidebar({ items, activeId, onSelect, className = '' }: PortalSidebarProps) {
  return (
    <>
      {/* Desktop: sticky left rail */}
      <aside
        className={`portal-sidebar hidden md:flex flex-col shrink-0 w-[5.5rem] lg:w-24 sticky top-20 self-start h-[calc(100vh-5rem)] py-4 ${className}`}
        aria-label="Main navigation"
      >
        <nav className="flex flex-col gap-1 px-2">
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
                <Icon size={22} strokeWidth={active ? 2.25 : 2} className="shrink-0" />
                <span className="portal-sidebar-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: bottom icon bar */}
      <nav
        className="portal-sidebar-mobile md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-area-pb"
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
                className={`portal-sidebar-item portal-sidebar-item--mobile flex-1 max-w-[5rem] ${active ? 'portal-sidebar-item--active' : ''}`}
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
