import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { SUPPLIER_COMPLEMENT_NAV_KEY } from '../supplier/SupplierTendersPanel';

export type AppNotification = {
  id: string;
  type?: string;
  title: string;
  message?: string;
  linkTab?: string;
  meta?: { procedureId?: string; complementId?: string } | null;
  isRead: boolean;
  createdAt: string;
};

type Props = {
  onNavigate: (tab: string) => void;
};

export function NotificationsBell({ onNavigate }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchPreview = async () => {
    try {
      const res = await api.get('/notifications/preview');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchPreview();
    const id = setInterval(fetchPreview, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n: AppNotification) => {
    try {
      if (!n.isRead) await api.put(`/notifications/${n.id}/read`);
    } catch {
      /* ignore */
    }
    setOpen(false);
    if (n.type === 'complement_request' && (n.meta?.procedureId || n.meta?.complementId)) {
      sessionStorage.setItem(SUPPLIER_COMPLEMENT_NAV_KEY, JSON.stringify(n.meta));
      window.dispatchEvent(new CustomEvent('supplier-complement-nav'));
    }
    if (n.linkTab) onNavigate(n.linkTab);
    fetchPreview();
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      fetchPreview();
    } catch {
      /* ignore */
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    onNavigate('notifications');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 rounded-lg hover:bg-surface transition-colors"
        aria-label={t('notifications.title')}
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,340px)] bg-white rounded-xl shadow-2xl border border-border z-50 max-h-[28rem] flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 shrink-0">
            <span className="font-semibold text-gray-900">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:underline font-medium"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t('notifications.empty')}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-surface ${!n.isRead ? 'bg-accent-subtle/40' : ''}`}
                >
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  {n.message && <p className="text-xs text-muted mt-1 line-clamp-2">{n.message}</p>}
                </button>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full text-center text-sm font-semibold text-primary-600 hover:underline"
            >
              {t('notifications.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
