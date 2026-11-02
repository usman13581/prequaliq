import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { CenterModal } from '../ui/SlideOver';
import { SlimCheckList, SlimCheckRow } from '../ui/SlimCheckRow';

type CatalogItem = { key: string; layer: string; liveDefault: boolean };

export function AdminEntitlementsModal({
  userId,
  userLabel,
  onClose
}: {
  userId: string;
  userLabel: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/admin/users/${userId}/entitlements`);
        if (cancelled) return;
        setCatalog(res.data.catalog || []);
        setEntitlements(res.data.entitlements || {});
      } catch (error: any) {
        showToast(error.response?.data?.message || t('msg.failedLoadEntitlements'), 'error');
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, onClose, showToast, t]);

  const toggle = (key: string) => {
    setEntitlements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    try {
      setSaving(true);
      await api.put(`/admin/users/${userId}/entitlements`, { entitlements });
      showToast(t('msg.entitlementsSaved'), 'success');
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSaveEntitlements'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const byLayer = catalog.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    (acc[item.layer] ||= []).push(item);
    return acc;
  }, {});

  return (
    <CenterModal
      open
      onClose={onClose}
      title={t('adminPortal.featureControl')}
      subtitle={userLabel}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="btn-save inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <div className="space-y-4">
          {byLayer['ai-extra']?.length ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50/80 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-violet-800">
                  {t('adminPortal.aiControls')}
                </p>
                <p className="text-xs text-violet-900/80 mt-0.5">{t('adminPortal.aiUserEntitlementHint')}</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-violet-200 text-violet-800"
                  onClick={() => {
                    setEntitlements((prev) => {
                      const next = { ...prev };
                      for (const item of byLayer['ai-extra'] || []) next[item.key] = true;
                      return next;
                    });
                  }}
                >
                  {t('adminPortal.aiEnableAllUser')}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold px-2 py-1 rounded-md bg-white border border-violet-200 text-violet-800"
                  onClick={() => {
                    setEntitlements((prev) => {
                      const next = { ...prev };
                      for (const item of byLayer['ai-extra'] || []) next[item.key] = false;
                      return next;
                    });
                  }}
                >
                  {t('adminPortal.aiDisableAllUser')}
                </button>
              </div>
            </div>
          ) : null}
          {Object.entries(byLayer).map(([layer, items]) => (
            <div key={layer} className="space-y-1.5">
              <h3 className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted px-0.5">
                {layer}
              </h3>
              <SlimCheckList>
                {items.map((item) => (
                  <SlimCheckRow
                    key={item.key}
                    checked={!!entitlements[item.key]}
                    onChange={() => toggle(item.key)}
                    title={item.key}
                  />
                ))}
              </SlimCheckList>
            </div>
          ))}
        </div>
      )}
    </CenterModal>
  );
}
