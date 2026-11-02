import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlements } from '../../contexts/EntitlementContext';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { PageHeader } from '../ui/PageHeader';
import { SlimCheckList, SlimCheckRow } from '../ui/SlimCheckRow';

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

  if (loading) {
    return <p className="text-sm text-muted py-4">{t('common.loading')}</p>;
  }

  const globalMaster = globalFlags['ai.__master__'] !== false;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Sparkles size={18} />}
        title={t('adminPortal.aiUserPrefs')}
        subtitle={t('adminPortal.aiUserPrefsHint')}
        action={
          <button
            type="button"
            className="btn-save inline-flex items-center gap-2"
            disabled={saving}
            onClick={save}
          >
            <Save size={15} />
            {saving ? t('common.saving') : t('common.save')}
          </button>
        }
      />

      {!globalMaster ? (
        <p className="text-xs text-amber-800 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
          {t('adminPortal.aiGloballyDisabled')}
        </p>
      ) : null}

      <SlimCheckList>
        <SlimCheckRow
          emphasis
          checked={!masterEnabled}
          onChange={(checked) => setMasterEnabled(!checked)}
          title={t('adminPortal.aiDisableAll')}
        />
      </SlimCheckList>

      {catalog.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border text-sm text-muted">
          {t('common.noResults')}
        </div>
      ) : (
        <>
          <SlimCheckList>
            {pager.paginatedItems.map((item) => {
              const adminOff = adminEntitlements[item.key] === false;
              const globalOff = globalFlags[item.key] === false;
              const locked = adminOff || globalOff || !globalMaster;
              return (
                <SlimCheckRow
                  key={item.key}
                  checked={preferences[item.key] !== false}
                  disabled={locked || !masterEnabled}
                  onChange={() =>
                    setPreferences((prev) => ({ ...prev, [item.key]: !(prev[item.key] !== false) }))
                  }
                  title={item.nameKey ? t(item.nameKey) : item.key}
                  description={item.descKey ? t(item.descKey) : undefined}
                  hint={locked ? t('adminPortal.aiLockedByAdmin') : undefined}
                />
              );
            })}
          </SlimCheckList>
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
    </div>
  );
}
