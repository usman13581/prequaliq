import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { CpvSearchSelect } from '../cpv/CpvSearchSelect';
import { NutsSearchSelect } from '../nuts/NutsSearchSelect';
import { BrandSelect } from '../ui/BrandSelect';
import { useCpvCatalogSearch } from '../../hooks/useCpvCatalogSearch';
import { useNutsCatalogSearch } from '../../hooks/useNutsCatalogSearch';
import { filterValueAsString, type FilterFieldDef, type FilterValues } from './filterTypes';

type Props = {
  fields: FilterFieldDef[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  /** Cap columns inside narrow panels (e.g. slide-over). */
  maxColumns?: 2 | 4;
};

const fieldShell = 'min-w-0 w-full';

export function FilterFieldsGrid({ fields, values, onChange, maxColumns = 4 }: Props) {
  const { t } = useTranslation();
  const cpvCatalog = useCpvCatalogSearch();
  const nutsCatalog = useNutsCatalogSearch();
  const needsCpv = fields.some((f) => f.type === 'cpv');
  const needsNuts = fields.some((f) => f.type === 'nuts');

  useEffect(() => {
    if (needsCpv) cpvCatalog.fetchCodes('', filterValueAsString(values, 'cpvCodeId'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCpv, values.cpvCodeId]);

  useEffect(() => {
    if (needsNuts) nutsCatalog.fetchCodes('', filterValueAsString(values, 'nutsCodeId'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNuts, values.nutsCodeId]);

  const setField = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const str = (key: string) => filterValueAsString(values, key);

  const gridClass =
    maxColumns === 2
      ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4';

  return (
    <div className={gridClass}>
      {fields.map((field) => {
        if (field.type === 'keyword') {
          return (
            <div
              key={field.key}
              className={`${fieldShell} ${maxColumns === 4 ? 'sm:col-span-2 xl:col-span-1' : ''}`}
            >
              <label className="block text-xs font-medium text-muted mb-1.5">
                {t(field.labelKey || 'common.search')}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="search"
                  className="w-full min-w-0 pl-11 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-sm sm:text-base text-foreground placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                  placeholder={t(field.placeholderKey || 'savedSearch.keywordPlaceholder')}
                  value={str(field.key)}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              </div>
            </div>
          );
        }

        if (field.type === 'cpv') {
          return (
            <div key={field.key} className={fieldShell}>
              <label className="block text-xs font-medium text-muted mb-1.5">
                {t(field.labelKey || 'common.selectCpv')}
              </label>
              <CpvSearchSelect
                cpvCodes={cpvCatalog.cpvCodes}
                value={str(field.key)}
                loading={cpvCatalog.loading}
                onSearch={(term) => cpvCatalog.searchDebounced(term, str(field.key))}
                onChange={(id) => setField(field.key, id)}
                placeholder={t(field.placeholderKey || 'common.selectCpv')}
              />
            </div>
          );
        }

        if (field.type === 'nuts') {
          return (
            <div key={field.key} className={fieldShell}>
              <label className="block text-xs font-medium text-muted mb-1.5">
                {t(field.labelKey || 'common.selectNuts')}
              </label>
              <NutsSearchSelect
                nutsCodes={nutsCatalog.nutsCodes}
                value={str(field.key)}
                loading={nutsCatalog.loading}
                onSearch={(term) => nutsCatalog.searchDebounced(term, str(field.key))}
                onChange={(id) => setField(field.key, id)}
                placeholder={t(field.placeholderKey || 'common.selectNuts')}
              />
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.key} className={fieldShell}>
              <label className="block text-xs font-medium text-muted mb-1.5">
                {t(field.labelKey || 'common.status')}
              </label>
              <BrandSelect value={str(field.key)} onChange={(e) => setField(field.key, e.target.value)}>
                <option value="">{t('savedSearch.anyStatus')}</option>
                {(field.options || []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </BrandSelect>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

/** Build human-readable labels for CPV/NUTS/select fields (stored with saved searches). */
export function buildFilterLabels(
  fields: FilterFieldDef[],
  values: FilterValues,
  catalogs: {
    cpvCodes: Array<{ id: string; code: string; description: string }>;
    nutsCodes: Array<{ id: string; code: string; name: string; nameSwedish?: string | null }>;
  },
  t: (key: string) => string
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const field of fields) {
    const raw = filterValueAsString(values, field.key);
    if (!raw.trim()) continue;
    if (field.type === 'cpv') {
      const hit = catalogs.cpvCodes.find((c) => c.id === raw);
      labels[field.key] = hit ? `${hit.code} – ${hit.description}` : raw;
    } else if (field.type === 'nuts') {
      const hit = catalogs.nutsCodes.find((n) => n.id === raw);
      labels[field.key] = hit ? `${hit.code} – ${hit.nameSwedish || hit.name}` : raw;
    } else if (field.type === 'select') {
      const opt = (field.options || []).find((o) => o.value === raw);
      labels[field.key] = opt ? t(opt.labelKey) : raw;
    } else {
      labels[field.key] = raw;
    }
  }
  return labels;
}
