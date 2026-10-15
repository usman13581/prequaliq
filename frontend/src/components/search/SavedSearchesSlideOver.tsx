import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, Check, Trash2 } from 'lucide-react';
import { SlideOver } from '../ui/SlideOver';
import { useSavedSearches } from '../../hooks/useSavedSearches';
import { useToast } from '../../contexts/ToastContext';
import { useCpvCatalogSearch } from '../../hooks/useCpvCatalogSearch';
import { useNutsCatalogSearch } from '../../hooks/useNutsCatalogSearch';
import { FilterFieldsGrid, buildFilterLabels } from './FilterFieldsGrid';
import {
  emptyFilters,
  filterValueAsString,
  hasActiveFilters,
  type FilterFieldDef,
  type FilterValues,
  type SavedSearch
} from './filterTypes';

type Props = {
  open: boolean;
  onClose: () => void;
  scope: string;
  fields: FilterFieldDef[];
  currentFilters: FilterValues;
  onApply: (filters: FilterValues) => void;
};

const LABELS_KEY = '__labels';

function summarizeFilters(
  fields: FilterFieldDef[],
  filters: FilterValues,
  t: (key: string) => string,
  catalogs: {
    cpvCodes: Array<{ id: string; code: string; description: string }>;
    nutsCodes: Array<{ id: string; code: string; name: string; nameSwedish?: string | null }>;
  }
): string[] {
  const stored =
    filters?.[LABELS_KEY] && typeof filters[LABELS_KEY] === 'object' && !Array.isArray(filters[LABELS_KEY])
      ? (filters[LABELS_KEY] as Record<string, string>)
      : {};
  const resolved = buildFilterLabels(fields, filters, catalogs, t);
  const lines: string[] = [];
  for (const field of fields) {
    const raw = filterValueAsString(filters, field.key);
    if (!raw.trim()) continue;
    const label = t(field.labelKey || field.key);
    const display = stored[field.key] || resolved[field.key] || raw;
    lines.push(`${label}: ${display}`);
  }
  return lines;
}

export function SavedSearchesSlideOver({
  open,
  onClose,
  scope,
  fields,
  currentFilters,
  onApply
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { searches, loading, reload, save, remove } = useSavedSearches(scope);
  const cpvCatalog = useCpvCatalogSearch();
  const nutsCatalog = useNutsCatalogSearch();
  const [draftFilters, setDraftFilters] = useState<FilterValues>(() => emptyFilters(fields));
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const catalogs = useMemo(
    () => ({ cpvCodes: cpvCatalog.cpvCodes, nutsCodes: nutsCatalog.nutsCodes }),
    [cpvCatalog.cpvCodes, nutsCatalog.nutsCodes]
  );

  useEffect(() => {
    if (!open) return;
    setDraftFilters({ ...emptyFilters(fields), ...currentFilters });
    setSaveName('');
    setSelectedId(null);
    reload();
  }, [open, fields, currentFilters, reload]);

  // Resolve CPV/NUTS ids used in saved searches so summaries show codes, not UUIDs
  useEffect(() => {
    if (!open) return;
    const cpvIds = new Set<string>();
    const nutsIds = new Set<string>();
    const collect = (filters: FilterValues | undefined) => {
      if (!filters) return;
      for (const field of fields) {
        const v = filterValueAsString(filters, field.key);
        if (!v) continue;
        if (field.type === 'cpv') cpvIds.add(v);
        if (field.type === 'nuts') nutsIds.add(v);
      }
    };
    collect(draftFilters);
    searches.forEach((s) => collect(s.filters));
    if (cpvIds.size) cpvCatalog.fetchCodes('', [...cpvIds]);
    if (nutsIds.size) nutsCatalog.fetchCodes('', [...nutsIds]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searches, draftFilters, fields]);

  const selected = searches.find((s) => s.id === selectedId) || null;

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) {
      showToast(t('savedSearch.nameRequired'), 'warning');
      return;
    }
    if (!hasActiveFilters(draftFilters)) {
      showToast(t('savedSearch.filtersRequired'), 'warning');
      return;
    }
    try {
      setSaving(true);
      const labels = buildFilterLabels(fields, draftFilters, catalogs, t);
      const payload: FilterValues = { ...draftFilters, [LABELS_KEY]: labels };
      await save(name, payload);
      setSaveName('');
      showToast(t('savedSearch.saved'), 'success');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('savedSearch.saveFailed');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const applySearch = (row: SavedSearch) => {
    const next = emptyFilters(fields);
    for (const field of fields) {
      const v = filterValueAsString(row.filters || {}, field.key);
      if (v.trim()) next[field.key] = v;
    }
    onApply(next);
    onClose();
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      if (selectedId === id) setSelectedId(null);
      showToast(t('savedSearch.deleted'), 'success');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('savedSearch.deleteFailed');
      showToast(message, 'error');
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={t('savedSearch.panelTitle')}
      subtitle={t('savedSearch.panelSubtitle')}
      footer={
        selected ? (
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" className="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-save px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
              onClick={() => applySearch(selected)}
            >
              <Check size={16} />
              {t('savedSearch.apply')}
            </button>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">{t('savedSearch.saveSection')}</h3>
          <p className="text-xs text-muted">{t('savedSearch.saveSectionHint')}</p>
          <FilterFieldsGrid
            fields={fields}
            values={draftFilters}
            onChange={setDraftFilters}
            maxColumns={2}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              className="w-full min-w-0 flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={t('savedSearch.namePlaceholder')}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            <button
              type="button"
              className="btn-save px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
              disabled={saving || !hasActiveFilters(draftFilters)}
              onClick={handleSave}
            >
              <BookmarkPlus size={16} />
              {saving ? t('common.saving') : t('savedSearch.save')}
            </button>
          </div>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="text-sm font-bold text-foreground">{t('savedSearch.listSection')}</h3>
          {loading ? (
            <p className="text-sm text-muted">{t('common.loading')}</p>
          ) : searches.length === 0 ? (
            <div className="text-center py-8 rounded-xl border-2 border-dashed border-border text-sm text-muted">
              {t('savedSearch.empty')}
            </div>
          ) : (
            <ul className="space-y-2">
              {searches.map((s) => {
                const active = selectedId === s.id;
                const summary = summarizeFilters(fields, s.filters || {}, t, catalogs);
                return (
                  <li key={s.id}>
                    <div
                      className={`rounded-xl border px-3 py-3 transition-colors ${
                        active ? 'border-primary-400 bg-primary-50/60' : 'border-border bg-white hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => setSelectedId(active ? null : s.id)}
                        >
                          <span className="block text-sm font-semibold text-foreground truncate">{s.name}</span>
                          {summary.length ? (
                            <span className="mt-1 block space-y-0.5">
                              {summary.map((line) => (
                                <span key={line} className="block text-xs text-muted break-words">
                                  {line}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="block text-xs text-muted mt-1">{t('savedSearch.noParams')}</span>
                          )}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            className="btn-save px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                            onClick={() => applySearch(s)}
                          >
                            {t('savedSearch.apply')}
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
                            onClick={() => handleDelete(s.id)}
                            aria-label={t('common.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </SlideOver>
  );
}
