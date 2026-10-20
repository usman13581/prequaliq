import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Circle } from 'lucide-react';
import api from '../../services/api';
import { SearchField } from '../ui/SearchField';
import { ListPagination } from '../ui/ListPagination';
import { useServerListPagination } from '../../hooks/useListPagination';
import { SUPPLIER_COMPLEMENT_NAV_KEY } from '../supplier/SupplierTendersPanel';
import type { AppNotification } from './NotificationsBell';

type Props = {
  onNavigate?: (tab: string) => void;
};

export function NotificationsPanel({ onNavigate }: Props) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const pager = useServerListPagination({ resetKey: debouncedSearch, initialPageSize: 10 });

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', {
        params: {
          search: debouncedSearch || undefined,
          page: pager.page,
          pageSize: pager.pageSize
        }
      });
      setNotifications(res.data.notifications || []);
      pager.setTotal(res.data.total || 0);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      setNotifications([]);
      pager.setTotal(0);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, pager.page, pager.pageSize]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const markOne = async (n: AppNotification) => {
    if (n.isRead) return;
    try {
      await api.put(`/notifications/${n.id}/read`);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const openNotification = async (n: AppNotification) => {
    await markOne(n);
    if (n.type === 'complement_request' && (n.meta?.procedureId || n.meta?.complementId)) {
      sessionStorage.setItem(SUPPLIER_COMPLEMENT_NAV_KEY, JSON.stringify(n.meta));
      window.dispatchEvent(new CustomEvent('supplier-complement-nav'));
    }
    if (n.linkTab && onNavigate) onNavigate(n.linkTab);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(i18n.language === 'sv' ? 'sv-SE' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('notifications.title')}</h2>
          <p className="text-sm text-muted mt-0.5">
            {unreadCount > 0
              ? t('notifications.unreadCount', { count: unreadCount })
              : t('notifications.allCaughtUp')}
          </p>
        </div>
        <button
          type="button"
          onClick={markAll}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck size={16} />
          {t('notifications.markAllRead')}
        </button>
      </div>

      <SearchField
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('notifications.searchPlaceholder')}
        aria-label={t('notifications.searchPlaceholder')}
      />

      {loading ? (
        <p className="text-sm text-muted py-8 text-center">{t('common.loading')}</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">{t('notifications.empty')}</p>
      ) : (
        <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-white">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 ${!n.isRead ? 'bg-accent-subtle/30' : ''}`}
            >
              <button
                type="button"
                onClick={() => openNotification(n)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && (
                    <Circle size={10} className="mt-1.5 fill-primary-600 text-primary-600 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    {n.message && <p className="text-sm text-muted mt-1">{n.message}</p>}
                    <p className="text-xs text-muted mt-2">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              </button>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markOne(n)}
                  className="shrink-0 text-xs font-medium text-primary-600 hover:underline self-start sm:mt-1"
                >
                  {t('notifications.markAsRead')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pager.showPagination && (
        <ListPagination
          page={pager.page}
          pageSize={pager.pageSize}
          total={pager.total}
          onPageChange={pager.setPage}
          onPageSizeChange={pager.setPageSize}
          itemLabel={t('notifications.itemLabel')}
        />
      )}
    </div>
  );
}
