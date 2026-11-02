import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { PortalSidebar, type PortalSidebarItem } from './PortalSidebar';
import { UserAccountMenu } from './UserAccountMenu';

type PortalLayoutProps = {
  logoTo: string;
  logoSubtitle: string;
  roleLabel: string;
  sidebarItems: PortalSidebarItem[];
  activeTab: string;
  onTabSelect: (id: string) => void;
  headerExtra?: ReactNode;
  onProfileClick?: () => void;
  onAiPreferencesClick?: () => void;
  children: ReactNode;
  /** Kept for compatibility with portal dashboards */
  sidebarVariant?: 'compact' | 'wide';
};

export function PortalLayout({
  logoTo,
  logoSubtitle,
  roleLabel,
  sidebarItems,
  activeTab,
  onTabSelect,
  headerExtra,
  onProfileClick,
  onAiPreferencesClick,
  children,
  sidebarVariant = 'compact',
}: PortalLayoutProps) {
  return (
    <div className="font-app min-h-screen app-page-bg flex flex-col">
      <header className="portal-top-header sticky top-0 z-50 shrink-0">
        <div className="w-full mx-auto px-3 sm:px-4 lg:px-6 relative">
          <div className="portal-top-header-bar flex items-stretch gap-2">
            <div className="flex items-center shrink-0 self-center">
              <Logo to={logoTo} subtitle={logoSubtitle} size="sm" />
            </div>

            <PortalSidebar
              items={sidebarItems}
              activeId={activeTab}
              onSelect={onTabSelect}
              variant={sidebarVariant}
            />

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-center ml-auto pl-1">
              {headerExtra}
              <div className="pl-2 border-l border-border">
                <UserAccountMenu
                  roleLabel={roleLabel}
                  onProfileClick={onProfileClick}
                  onAiPreferencesClick={onAiPreferencesClick}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="portal-main-content flex-1 min-w-0 w-full px-3 sm:px-4 lg:px-6 py-4 lg:py-5">
        <div className="max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
