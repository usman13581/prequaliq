import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { Logo } from './Logo';
import { PortalSidebar, type PortalSidebarItem } from './PortalSidebar';

type PortalLayoutProps = {
  logoTo: string;
  logoSubtitle: string;
  roleLabel: string;
  sidebarItems: PortalSidebarItem[];
  activeTab: string;
  onTabSelect: (id: string) => void;
  headerExtra?: ReactNode;
  onProfileClick?: () => void;
  children: ReactNode;
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
  children,
  sidebarVariant = 'compact',
}: PortalLayoutProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const userChip = (
    <>
      <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
        {user?.firstName?.[0]}
        {user?.lastName?.[0]}
      </div>
      <div className="hidden lg:block text-left">
        <p className="text-sm font-semibold text-gray-900 leading-tight">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-muted">{roleLabel}</p>
      </div>
    </>
  );

  return (
    <div className="font-app min-h-screen app-page-bg flex flex-col">
      <header className="portal-top-header sticky top-0 z-50 shrink-0">
        <div className="w-full mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Logo to={logoTo} subtitle={logoSubtitle} size="md" />
            <div className="flex items-center gap-2 sm:gap-4">
              {headerExtra}
              <LanguageSwitcher />
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
                {onProfileClick ? (
                  <button
                    type="button"
                    onClick={onProfileClick}
                    className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-white/60 transition-colors"
                  >
                    {userChip}
                  </button>
                ) : (
                  userChip
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 shadow-md transition-all font-medium text-sm"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full max-w-[100vw]">
        <PortalSidebar
          items={sidebarItems}
          activeId={activeTab}
          onSelect={onTabSelect}
          variant={sidebarVariant}
        />
        <main className="portal-main-content flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-4 lg:py-5">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
