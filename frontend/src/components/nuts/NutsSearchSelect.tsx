import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import type { NutsCodeOption } from '../../hooks/useNutsCatalogSearch';
import { useFixedDropdownPosition } from '../search/useFixedDropdownPosition';

type Props = {
  nutsCodes: NutsCodeOption[];
  value: string;
  onChange: (nutsCodeId: string) => void;
  onSearch?: (term: string) => void;
  loading?: boolean;
  placeholder?: string;
};

const noopSearch = (_term: string) => {};

export function NutsSearchSelect({
  nutsCodes,
  value,
  onChange,
  onSearch = noopSearch,
  loading = false,
  placeholder
}: Props) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t('common.selectNuts');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const portalId = useId();
  const onSearchRef = useRef(onSearch);
  const selected = nutsCodes.find((n) => n.id === value);
  const coords = useFixedDropdownPosition(open, containerRef);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const portal = document.getElementById(portalId);
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, portalId]);

  useEffect(() => {
    if (!open) return;
    onSearchRef.current(search);
  }, [search, open]);

  const dropdown =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={portalId}
            className="rounded-xl border border-border bg-white shadow-lg overflow-hidden"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 10050
            }}
          >
            <div className="p-2 border-b border-border bg-surface/80">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('placeholders.searchByCodeOrDescription')}
                  className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
                {loading ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
                ) : null}
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {nutsCodes.length === 0 && loading ? (
                <p className="px-4 py-3 text-sm text-muted">{t('common.loading')}</p>
              ) : nutsCodes.length === 0 ? (
                <p className="px-4 py-3 text-sm text-amber-700 bg-amber-50">{t('nutsCodes.noCodesLoaded')}</p>
              ) : (
                <>
                  {value ? (
                    <button
                      type="button"
                      onClick={() => {
                        onChange('');
                        setOpen(false);
                        setSearch('');
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-muted hover:bg-surface"
                    >
                      {t('savedSearch.clearField')}
                    </button>
                  ) : null}
                  {nutsCodes.map((nuts) => (
                    <button
                      key={nuts.id}
                      type="button"
                      onClick={() => {
                        onChange(nuts.id);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        value === nuts.id
                          ? 'bg-primary-50 text-primary-800 font-medium'
                          : 'text-foreground hover:bg-primary-50/60'
                      }`}
                    >
                      <span className="font-mono font-semibold">{nuts.code}</span>
                      <span className="text-muted"> – {nuts.nameSwedish || nuts.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-w-0 px-4 py-3 flex items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-left"
      >
        <span className={`min-w-0 truncate text-sm sm:text-base ${selected ? 'text-foreground' : 'text-muted'}`}>
          {selected ? `${selected.code} – ${selected.nameSwedish || selected.name}` : resolvedPlaceholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {dropdown}
    </div>
  );
}
