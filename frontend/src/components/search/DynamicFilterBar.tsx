import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, X } from 'lucide-react';
import { FilterFieldsGrid } from './FilterFieldsGrid';
import { SavedSearchesSlideOver } from './SavedSearchesSlideOver';
import { emptyFilters, hasActiveFilters, type FilterFieldDef, type FilterValues } from './filterTypes';

type Props = {
  scope: string;
  fields: FilterFieldDef[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  /** Hide saved-searches chrome (filters only). */
  hideSavedSearches?: boolean;
};

/**
 * Main-screen filters. "Saved searches" opens a SlideOver to save / list / apply.
 * Do not use overflow:hidden here — CPV/NUTS dropdowns must paint outside the card.
 */
export function DynamicFilterBar({
  scope,
  fields,
  values,
  onChange,
  hideSavedSearches = false
}: Props) {
  const { t } = useTranslation();
  const [savedOpen, setSavedOpen] = useState(false);
  const filtersActive = hasActiveFilters(values);

  const clearAll = () => {
    onChange(emptyFilters(fields));
  };

  return (
    <>
      {/* Fields and actions share one row on wide screens, so the list below starts higher. */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-2 lg:gap-3 rounded-xl border border-border bg-white p-3 shadow-sm">
        <div className="flex-1 min-w-0">
          <FilterFieldsGrid fields={fields} values={values} onChange={onChange} />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {filtersActive ? (
            <button
              type="button"
              className="btn-cancel px-3 h-9 rounded-xl text-xs font-semibold inline-flex items-center gap-1"
              onClick={clearAll}
            >
              <X size={14} />
              {t('savedSearch.clearFilters')}
            </button>
          ) : null}

          {!hideSavedSearches ? (
            <button
              type="button"
              className="btn-save px-3 h-9 rounded-xl text-xs font-semibold inline-flex items-center gap-1 sm:ml-auto"
              onClick={() => setSavedOpen(true)}
            >
              <Bookmark size={14} />
              {t('savedSearch.openPanel')}
            </button>
          ) : null}
        </div>
      </div>

      {!hideSavedSearches ? (
        <SavedSearchesSlideOver
          open={savedOpen}
          onClose={() => setSavedOpen(false)}
          scope={scope}
          fields={fields}
          currentFilters={values}
          onApply={onChange}
        />
      ) : null}
    </>
  );
}
