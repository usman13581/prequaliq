import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit2, Power, PowerOff } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { QuestionnaireSlimRow, StatusBadge, RowActionButton } from '../questionnaires/QuestionnaireSlimRow';
import { useServerListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../ui/ListPagination';
import { SlideOver } from '../ui/SlideOver';

type LookupKind = 'cpv' | 'nuts' | 'generic';

type LookupTypeMeta = {
  key: string;
  labelEn: string;
  labelSv: string;
  isSystem: boolean;
  kind: LookupKind;
};

type LookupItem = {
  id: string;
  code: string;
  isActive?: boolean;
  description?: string;
  name?: string;
  nameSwedish?: string;
  labelEn?: string;
  labelSv?: string;
  sortOrder?: number;
  parentCode?: string | null;
  level?: number | null;
};

function typeLabel(type: LookupTypeMeta, lang: string) {
  return lang.startsWith('sv') ? type.labelSv : type.labelEn;
}

function itemPrimaryLabel(item: LookupItem, kind: LookupKind, lang: string) {
  if (kind === 'cpv') return item.description || item.code;
  if (kind === 'nuts') {
    return lang.startsWith('sv') ? item.nameSwedish || item.name || item.code : item.name || item.code;
  }
  return lang.startsWith('sv') ? item.labelSv || item.code : item.labelEn || item.code;
}

function itemSecondaryLabel(item: LookupItem, kind: LookupKind, lang: string) {
  if (kind === 'cpv') return item.code;
  if (kind === 'nuts') {
    const alt = lang.startsWith('sv') ? item.name : item.nameSwedish;
    return alt ? `${item.code} · ${alt}` : item.code;
  }
  const alt = lang.startsWith('sv') ? item.labelEn : item.labelSv;
  return alt ? `${item.code} · ${alt}` : item.code;
}

const emptyForm = () => ({
  code: '',
  description: '',
  name: '',
  nameSwedish: '',
  labelEn: '',
  labelSv: '',
  sortOrder: '0',
  parentCode: '',
  level: '',
  isActive: true
});

export function AdminLookupsPanel() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const lang = i18n.language || 'en';

  const [types, setTypes] = useState<LookupTypeMeta[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('document_type');
  const [items, setItems] = useState<LookupItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    setTotal,
    offset,
    limit
  } = useServerListPagination({
    resetKey: `${selectedKey}|${searchDebounced}`
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LookupItem | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeKey, setNewTypeKey] = useState('');
  const [newTypeLabelEn, setNewTypeLabelEn] = useState('');
  const [newTypeLabelSv, setNewTypeLabelSv] = useState('');

  const selectedType = useMemo(
    () => types.find((ty) => ty.key === selectedKey),
    [types, selectedKey]
  );
  const kind: LookupKind = selectedType?.kind || 'generic';

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadTypes = useCallback(async () => {
    try {
      setLoadingTypes(true);
      const res = await api.get('/admin/lookups/types');
      const list: LookupTypeMeta[] = res.data.types || [];
      setTypes(list);
      if (list.length && !list.some((ty) => ty.key === selectedKey)) {
        const doc = list.find((ty) => ty.key === 'document_type');
        setSelectedKey(doc?.key || list[0].key);
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('adminPortal.lookups.loadTypesFailed');
      showToast(message, 'error');
    } finally {
      setLoadingTypes(false);
    }
  }, [selectedKey, showToast, t]);

  const loadItems = useCallback(async () => {
    if (!selectedKey) return;
    try {
      setLoadingItems(true);
      const res = await api.get(`/admin/lookups/${selectedKey}`, {
        params: {
          includeInactive: true,
          search: searchDebounced.trim() || undefined,
          limit,
          offset
        }
      });
      setItems(res.data.items || []);
      setTotal(typeof res.data.total === 'number' ? res.data.total : (res.data.items || []).length);
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('adminPortal.lookups.loadItemsFailed');
      showToast(message, 'error');
      setItems([]);
      setTotal(0);
    } finally {
      setLoadingItems(false);
    }
  }, [selectedKey, searchDebounced, limit, offset, setTotal, showToast, t]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm());
    setEditorOpen(true);
  };

  const openEdit = (item: LookupItem) => {
    setEditingItem(item);
    setForm({
      code: item.code || '',
      description: item.description || '',
      name: item.name || '',
      nameSwedish: item.nameSwedish || '',
      labelEn: item.labelEn || '',
      labelSv: item.labelSv || '',
      sortOrder: String(item.sortOrder ?? 0),
      parentCode: item.parentCode || '',
      level: item.level != null ? String(item.level) : '',
      isActive: item.isActive !== false
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingItem(null);
    setForm(emptyForm());
  };

  const buildPayload = () => {
    const base: Record<string, unknown> = {
      code: form.code.trim(),
      isActive: form.isActive
    };
    if (kind === 'cpv') {
      base.description = form.description.trim();
      base.parentCode = form.parentCode.trim() || null;
      base.level = form.level ? parseInt(form.level, 10) : 1;
    } else if (kind === 'nuts') {
      base.name = form.name.trim();
      base.nameSwedish = form.nameSwedish.trim();
      base.parentCode = form.parentCode.trim() || null;
      base.level = form.level ? parseInt(form.level, 10) : 1;
    } else {
      base.labelEn = form.labelEn.trim();
      base.labelSv = form.labelSv.trim();
      base.sortOrder = parseInt(form.sortOrder, 10) || 0;
      base.parentCode = form.parentCode.trim() || null;
      base.level = form.level ? parseInt(form.level, 10) : null;
    }
    return base;
  };

  const saveItem = async () => {
    try {
      setSaving(true);
      const payload = buildPayload();
      if (editingItem) {
        await api.put(`/admin/lookups/${selectedKey}/${editingItem.id}`, payload);
        showToast(t('adminPortal.lookups.updated'), 'success');
      } else {
        await api.post(`/admin/lookups/${selectedKey}`, payload);
        showToast(t('adminPortal.lookups.created'), 'success');
      }
      closeEditor();
      loadItems();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('adminPortal.lookups.saveFailed');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: LookupItem) => {
    try {
      await api.put(`/admin/lookups/${selectedKey}/${item.id}/toggle-active`, {
        isActive: item.isActive === false
      });
      showToast(
        item.isActive === false ? t('adminPortal.lookups.activated') : t('adminPortal.lookups.deactivated'),
        'success'
      );
      loadItems();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('adminPortal.lookups.toggleFailed');
      showToast(message, 'error');
    }
  };

  const createLookupType = async () => {
    try {
      await api.post('/admin/lookups/types', {
        key: newTypeKey.trim(),
        labelEn: newTypeLabelEn.trim(),
        labelSv: newTypeLabelSv.trim()
      });
      showToast(t('adminPortal.lookups.typeCreated'), 'success');
      setTypeModalOpen(false);
      setNewTypeKey('');
      setNewTypeLabelEn('');
      setNewTypeLabelSv('');
      await loadTypes();
      setSelectedKey(newTypeKey.trim().toLowerCase().replace(/\s+/g, '_'));
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('adminPortal.lookups.typeCreateFailed');
      showToast(message, 'error');
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 overflow-hidden">
      <div className="px-3 sm:px-4 py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">{t('adminPortal.lookups.title')}</h2>
            <p className="text-sm text-muted mt-0.5">{t('adminPortal.lookups.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTypeModalOpen(true)}
              className="btn-cancel rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {t('adminPortal.lookups.newType')}
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="btn-save flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <Plus size={18} />
              {t('adminPortal.lookups.addItem')}
            </button>
          </div>
        </div>

        {loadingTypes ? (
          <p className="text-sm text-muted py-8 text-center">{t('sections.loadingData')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {types.map((ty) => (
              <button
                key={ty.key}
                type="button"
                onClick={() => {
                  setSelectedKey(ty.key);
                  setSearch('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedKey === ty.key
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-foreground border-border hover:bg-surface/80'
                }`}
              >
                {typeLabel(ty, lang)}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-border px-3 py-2 flex-1 min-w-0">
            <Search size={16} className="text-muted shrink-0" />
            <input
              className="input-brand flex-1 min-w-0 !py-1.5 !text-sm !border-0 !shadow-none focus:!ring-0"
              placeholder={t('adminPortal.lookups.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {!loadingItems && total > 0 ? (
            <p className="text-xs text-muted shrink-0 px-1">
              {t('adminPortal.lookups.totalCount', { count: total })}
            </p>
          ) : null}
        </div>

        {loadingItems ? (
          <p className="text-sm text-muted py-8 text-center">{t('sections.loadingData')}</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 rounded-xl border-2 border-dashed border-border bg-surface/40">
            <p className="text-sm text-muted">{t('adminPortal.lookups.empty')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <QuestionnaireSlimRow
                key={item.id}
                compact
                title={itemPrimaryLabel(item, kind, lang)}
                description={itemSecondaryLabel(item, kind, lang)}
                meta={
                  <StatusBadge tone={item.isActive === false ? 'gray' : 'green'}>
                    {item.isActive === false ? t('adminPortal.lookups.inactive') : t('adminPortal.lookups.active')}
                  </StatusBadge>
                }
                trailing={
                  <>
                    <RowActionButton variant="secondary" onClick={() => openEdit(item)}>
                      <span className="inline-flex items-center gap-1">
                        <Edit2 size={14} />
                        {t('common.edit')}
                      </span>
                    </RowActionButton>
                    <RowActionButton variant="muted" onClick={() => toggleActive(item)}>
                      <span className="inline-flex items-center gap-1">
                        {item.isActive === false ? <Power size={14} /> : <PowerOff size={14} />}
                        {item.isActive === false
                          ? t('adminPortal.lookups.activate')
                          : t('adminPortal.lookups.deactivate')}
                      </span>
                    </RowActionButton>
                  </>
                }
              />
            ))}
          </div>
        )}

        {total > 0 ? (
          <ListPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel={(selectedType ? typeLabel(selectedType, lang) : t('adminPortal.lookups.title')).toLowerCase()}
          />
        ) : null}
      </div>

      <SlideOver
        open={editorOpen}
        onClose={closeEditor}
        title={editingItem ? t('adminPortal.lookups.editItem') : t('adminPortal.lookups.addItem')}
        subtitle={selectedType ? typeLabel(selectedType, lang) : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-cancel rounded-xl px-4 py-2 text-sm" onClick={closeEditor}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-save rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
              disabled={saving}
              onClick={saveItem}
            >
              {t('common.save')}
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('adminPortal.lookups.code')}</label>
            <input
              className="input-brand w-full text-sm"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          {kind === 'cpv' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('adminPortal.lookups.description')}
              </label>
              <textarea
                className="input-brand w-full text-sm min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          )}

          {kind === 'nuts' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.nameEn')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.nameSv')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  value={form.nameSwedish}
                  onChange={(e) => setForm({ ...form, nameSwedish: e.target.value })}
                />
              </div>
            </>
          )}

          {kind === 'generic' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.labelEn')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  value={form.labelEn}
                  onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.labelSv')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  value={form.labelSv}
                  onChange={(e) => setForm({ ...form, labelSv: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.sortOrder')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </>
          )}

          {(kind === 'cpv' || kind === 'nuts' || kind === 'generic') && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.parentCode')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  value={form.parentCode}
                  onChange={(e) => setForm({ ...form, parentCode: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('adminPortal.lookups.level')}
                </label>
                <input
                  className="input-brand w-full text-sm"
                  type="number"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                />
              </div>
            </>
          )}

          <label className="flex items-center gap-3 text-sm font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-5 w-5 shrink-0 rounded border-border accent-accent cursor-pointer"
            />
            {t('adminPortal.lookups.active')}
          </label>
        </div>
      </SlideOver>

      {typeModalOpen ? (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-base font-bold text-foreground">{t('adminPortal.lookups.newType')}</h3>
            <p className="text-sm text-muted">{t('adminPortal.lookups.newTypeHint')}</p>
            <div>
              <label className="block text-sm font-medium mb-1">{t('adminPortal.lookups.typeKey')}</label>
              <input
                className="input-brand w-full text-sm"
                value={newTypeKey}
                onChange={(e) => setNewTypeKey(e.target.value)}
                placeholder={t('adminPortal.lookups.typeKeyPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('adminPortal.lookups.labelEn')}</label>
              <input
                className="input-brand w-full text-sm"
                value={newTypeLabelEn}
                onChange={(e) => setNewTypeLabelEn(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('adminPortal.lookups.labelSv')}</label>
              <input
                className="input-brand w-full text-sm"
                value={newTypeLabelSv}
                onChange={(e) => setNewTypeLabelSv(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-cancel rounded-xl px-4 py-2 text-sm" onClick={() => setTypeModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-save rounded-xl px-4 py-2 text-sm font-semibold" onClick={createLookupType}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
