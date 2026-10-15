import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';

type AiCatalogItem = { key: string; nameKey?: string; descKey?: string };

const MASTER = 'ai.__master__';

export function AdminAiGlobalPanel() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [catalog, setCatalog] = useState<AiCatalogItem[]>([]);
  const pager = useListPagination(catalog);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/ai-flags');
        if (cancelled) return;
        setFlags(res.data.flags || {});
        setCatalog(res.data.aiCatalog || []);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message
          || t('msg.failedSave');
        showToast(message, 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await api.put('/admin/ai-flags', { flags });
      setFlags(res.data.flags || flags);
      showToast(t('adminPortal.aiGlobalSaved'), 'success');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || t('msg.failedSave');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted py-6">{t('common.loading')}</p>;
  }

  const masterOn = flags[MASTER] !== false;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{t('adminPortal.aiControlsGlobal')}</h2>
          <p className="text-sm text-muted mt-0.5">{t('adminPortal.aiControlsGlobalHint')}</p>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={masterOn}
          onChange={(e) => setFlags((prev) => ({ ...prev, [MASTER]: e.target.checked }))}
        />
        <span>
          <span className="block text-sm font-semibold">{t('adminPortal.aiMasterAll')}</span>
          <span className="block text-xs text-muted mt-0.5">{t('adminPortal.aiMasterAllHint')}</span>
        </span>
      </label>

      {catalog.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">
          {t('common.noResults')}
        </div>
      ) : (
        <>
          <div className={`space-y-2 ${!masterOn ? 'opacity-50' : ''}`}>
            {pager.paginatedItems.map((item) => (
              <label
                key={item.key}
                className="flex items-start gap-3 rounded-xl border border-border bg-white px-4 py-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={flags[item.key] !== false}
                  disabled={!masterOn}
                  onChange={(e) => setFlags((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {item.nameKey ? t(item.nameKey) : item.key}
                  </span>
                  <span className="block text-xs text-muted mt-0.5">
                    {item.descKey ? t(item.descKey) : ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {pager.showPagination ? (
            <ListPagination
              page={pager.page}
              pageSize={pager.pageSize}
              total={pager.total}
              onPageChange={pager.setPage}
              onPageSizeChange={pager.setPageSize}
              itemLabel={t('adminPortal.aiControls').toLowerCase()}
            />
          ) : null}
        </>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn-save inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold"
          disabled={saving}
          onClick={save}
        >
          <Save size={16} />
          {saving ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}
