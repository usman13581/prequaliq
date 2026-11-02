import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { PageHeader } from '../ui/PageHeader';
import { SlimCheckList, SlimCheckRow } from '../ui/SlimCheckRow';

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
    <div className="space-y-4">
      <PageHeader
        icon={<Sparkles size={18} />}
        title={t('adminPortal.aiControlsGlobal')}
        subtitle={t('adminPortal.aiControlsGlobalHint')}
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

      <SlimCheckList>
        <SlimCheckRow
          emphasis
          checked={masterOn}
          onChange={(checked) => setFlags((prev) => ({ ...prev, [MASTER]: checked }))}
          title={t('adminPortal.aiMasterAll')}
          description={t('adminPortal.aiMasterAllHint')}
        />
      </SlimCheckList>

      {catalog.length === 0 ? (
        <div className="text-center py-10 rounded-lg border border-dashed border-border text-sm text-muted">
          {t('common.noResults')}
        </div>
      ) : (
        <>
          <SlimCheckList>
            {pager.paginatedItems.map((item) => (
              <SlimCheckRow
                key={item.key}
                checked={flags[item.key] !== false}
                disabled={!masterOn}
                onChange={(checked) => setFlags((prev) => ({ ...prev, [item.key]: checked }))}
                title={item.nameKey ? t(item.nameKey) : item.key}
                description={item.descKey ? t(item.descKey) : undefined}
              />
            ))}
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
