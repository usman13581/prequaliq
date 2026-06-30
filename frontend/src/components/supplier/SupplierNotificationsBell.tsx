import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

type Notification = {
  id: string;
  title: string;
  message?: string;
  linkTab?: string;
  isRead: boolean;
  createdAt: string;
};

export function SupplierNotificationsBell({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/supplier/notifications');
      setNotifications(res.data.notifications || []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter((n) => !n.isRead).length;

  const handleClick = async (n: Notification) => {
    try {
      await api.put(`/supplier/notifications/${n.id}/read`);
    } catch { /* ignore */ }
    setOpen(false);
    if (n.linkTab) onNavigate(n.linkTab);
    fetchNotifications();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-surface transition-colors"
        aria-label={t('supplierPortal.notifications')}
      >
        <Bell size={22} className="text-gray-700" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(100vw-2rem,320px)] bg-white rounded-xl shadow-2xl border border-border z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border font-semibold text-gray-900">
            {t('supplierPortal.notifications')}
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted">{t('supplierPortal.noNotifications')}</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-surface ${!n.isRead ? 'bg-accent-subtle/40' : ''}`}
              >
                <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                {n.message && <p className="text-xs text-muted mt-1">{n.message}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
