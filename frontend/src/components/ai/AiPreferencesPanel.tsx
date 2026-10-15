import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlements } from '../../contexts/EntitlementContext';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';

type AiCatalogItem = { key: string; nameKey?: string; descKey?: string };

/**
 * Supplier/buyer self-service: master disable + per AI feature checkboxes.
 * Buttons elsewhere already use useEntitlement (effective map from /entitlements/me).
 */
export function AiPreferencesPanel() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refresh } = useEntitlements();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [catalog, setCatalog] = useState<AiCatalogItem[]>([]);
  const [adminEntitlements, setAdminEntitlements] = useState<Record<string, boolean>>({});
  const [globalFlags, setGlobalFlags] = useState<Record<string, boolean>>({});
  const pager = useListPagination(catalog);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/entitlements/ai-preferences');
        if (cancelled) return;
        setMasterEnabled(res.data.masterEnabled !== false);
        setPreferences(res.data.preferences || {});
        setCatalog(res.data.aiCatalog || []);
        setAdminEntitlements(res.data.adminEntitlements || {});
        setGlobalFlags(res.data.globalFlags || {});
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
      await api.put('/entitlements/ai-preferences', { masterEnabled, preferences });
      await refresh();
      showToast(t('adminPortal.aiPrefsSaved'), 'success');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message
        || t('msg.failedSave');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return <p className="text-sm text-muted py-4">{t('common.loading')}</p>;
  }

  const globalMaster = globalFlags['ai.__master__'] !== false;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{t('adminPortal.aiUserPrefs')}</h3>
          <p className="text-sm text-muted mt-0.5">{t('adminPortal.aiUserPrefsHint')}</p>
        </div>
      </div>

      {!globalMaster ? (
        <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          {t('adminPortal.aiGloballyDisabled')}
        </p>
      ) : null}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={!masterEnabled}
          onChange={(e) => setMasterEnabled(!e.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">{t('adminPortal.aiDisableAll')}</span>
        </span>
      </label>

      {catalog.length === 0 ? (
        <div className="text-center py-8 rounded-xl border-2 border-dashed border-border text-sm text-muted">
          {t('common.noResults')}
        </div>
      ) : (
        <>
          <div className={`space-y-3 ${!masterEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {pager.paginatedItems.map((item) => {
              const adminOff = adminEntitlements[item.key] === false;
              const globalOff = globalFlags[item.key] === false;
              const locked = adminOff || globalOff || !globalMaster;
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 rounded-xl border border-border px-3 py-3 ${
                    locked ? 'bg-gray-50 opacity-70' : 'bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={preferences[item.key] !== false}
                    disabled={locked || !masterEnabled}
                    onChange={() => togglePref(item.key)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {item.nameKey ? t(item.nameKey) : item.key}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      {item.descKey ? t(item.descKey) : ''}
                    </span>
                    {locked ? (
                      <span className="block text-xs text-amber-700 mt-1">{t('adminPortal.aiLockedByAdmin')}</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
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
          className="btn-save inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
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
