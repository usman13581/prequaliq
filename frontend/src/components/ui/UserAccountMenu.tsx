import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, KeyRound, LogOut, Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import type { SupportedLocale } from '../../i18n';
import { uploadsUrl } from '../../utils/uploadsUrl';
import { ChangePasswordModal } from './ChangePasswordModal';

type Props = {
  roleLabel: string;
  onProfileClick?: () => void;
  onAiPreferencesClick?: () => void;
};

/**
 * Top-right account menu: profile, AI preferences, language, change password, logout.
 */
export function UserAccountMenu({ roleLabel, onProfileClick, onAiPreferencesClick }: Props) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalId = useId();
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 240 });

  const profilePictureUrl = uploadsUrl(user?.profilePicture);
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;
  const current = (i18n.language || 'en').split('-')[0] as SupportedLocale;

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 240;
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    setCoords({ top: r.bottom + 6, left, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const portal = document.getElementById(portalId);
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, portalId]);

  const setLang = (lang: SupportedLocale) => {
    if (current !== lang) i18n.changeLanguage(lang);
  };

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={portalId}
            role="menu"
            className="rounded-lg border border-border bg-card shadow-lg overflow-hidden py-1"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 10060
            }}
          >
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
              <p className="text-[0.7rem] text-muted mt-0.5">{roleLabel}</p>
            </div>

            {onProfileClick ? (
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[0.8125rem] font-medium text-foreground hover:bg-surface"
                onClick={() => {
                  setOpen(false);
                  onProfileClick();
                }}
              >
                <User size={15} className="text-muted shrink-0" aria-hidden />
                {t('common.profile')}
              </button>
            ) : null}

            {onAiPreferencesClick ? (
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[0.8125rem] font-medium text-foreground hover:bg-surface"
                onClick={() => {
                  setOpen(false);
                  onAiPreferencesClick();
                }}
              >
                <Sparkles size={15} className="text-muted shrink-0" aria-hidden />
                {t('common.aiPreferences')}
              </button>
            ) : null}

            <div className="px-3 py-2 border-t border-border">
              <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted mb-1.5">
                {t('common.language')}
              </p>
              <div
                role="group"
                aria-label={t('common.language')}
                className="flex rounded-md border border-border bg-surface p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`flex-1 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                    current === 'en'
                      ? 'bg-primary-800 text-white'
                      : 'text-muted hover:text-foreground hover:bg-card'
                  }`}
                  aria-pressed={current === 'en'}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLang('sv')}
                  className={`flex-1 rounded px-2 py-1 text-xs font-semibold transition-colors ${
                    current === 'sv'
                      ? 'bg-primary-800 text-white'
                      : 'text-muted hover:text-foreground hover:bg-card'
                  }`}
                  aria-pressed={current === 'sv'}
                >
                  SV
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-1">
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[0.8125rem] font-medium text-foreground hover:bg-surface"
                onClick={() => {
                  setOpen(false);
                  setChangePasswordOpen(true);
                }}
              >
                <KeyRound size={15} className="text-muted shrink-0" aria-hidden />
                {t('common.changePassword')}
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[0.8125rem] font-medium text-red-600 hover:bg-red-50"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
              >
                <LogOut size={15} className="shrink-0" aria-hidden />
                {t('common.logout')}
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-white/70 transition-colors border border-transparent hover:border-border"
        title={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('common.profile')}
      >
        <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-border bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-semibold">
          {profilePictureUrl ? (
            <img src={profilePictureUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="hidden lg:block text-left max-w-[9rem]">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-muted truncate">{roleLabel}</p>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted shrink-0 hidden sm:block transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {menu}
    </>
  );
}
