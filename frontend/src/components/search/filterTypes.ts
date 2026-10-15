export type FilterFieldType = 'keyword' | 'cpv' | 'nuts' | 'select';

export type FilterSelectOption = {
  value: string;
  labelKey: string;
};

export type FilterFieldDef = {
  key: string;
  type: FilterFieldType;
  labelKey?: string;
  placeholderKey?: string;
  options?: FilterSelectOption[];
};

/** Filter map; `__labels` may hold human-readable CPV/NUTS text for saved searches. */
export type FilterValues = Record<string, string | Record<string, string>>;

export type SavedSearch = {
  id: string;
  scope: string;
  name: string;
  filters: FilterValues;
  createdAt?: string;
  updatedAt?: string;
};

export function emptyFilters(fields: FilterFieldDef[]): FilterValues {
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

export function filterValueAsString(values: FilterValues, key: string): string {
  const v = values[key];
  return typeof v === 'string' ? v : '';
}

export function hasActiveFilters(values: FilterValues): boolean {
  return Object.entries(values).some(([key, v]) => {
    if (key.startsWith('__')) return false;
    return typeof v === 'string' && v.trim() !== '';
  });
}
