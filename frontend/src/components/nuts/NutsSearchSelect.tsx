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
  const selectedFromList = nutsCodes.find((n) => n.id === value);
  const [selectedCache, setSelectedCache] = useState<NutsCodeOption | null>(null);
  const selected = selectedFromList || (selectedCache?.id === value ? selectedCache : null);
  const coords = useFixedDropdownPosition(open, containerRef);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (selectedFromList) setSelectedCache(selectedFromList);
    else if (!value) setSelectedCache(null);
  }, [selectedFromList, value]);

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
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('placeholders.searchByCodeOrDescription')}
                  className="field-control !pl-8 !pr-8 !min-h-8 !py-1.5"
                  autoFocus
                />
                {loading ? (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent animate-spin" />
                ) : null}
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {nutsCodes.length === 0 && loading ? (
                <p className="px-3 py-2.5 text-xs text-muted">{t('common.loading')}</p>
              ) : nutsCodes.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-amber-700 bg-amber-50">{t('nutsCodes.noCodesLoaded')}</p>
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
                      className="w-full px-3 py-1.5 text-left text-xs text-muted hover:bg-surface"
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
                      className={`w-full px-3 py-2 text-left text-[0.8125rem] transition-colors ${
                        value === nuts.id
                          ? 'bg-accent-subtle text-accent-hover font-semibold'
                          : 'text-foreground hover:bg-surface'
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
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="field-trigger w-full min-w-0 flex items-center justify-between gap-2 text-left"
      >
        <span className={`min-w-0 truncate ${selected ? 'text-foreground' : 'text-muted-light'}`}>
          {selected ? `${selected.code} – ${selected.nameSwedish || selected.name}` : resolvedPlaceholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {dropdown}
    </div>
  );
}
