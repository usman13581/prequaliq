import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { CpvCodeOption } from '../../hooks/useCpvCatalogSearch';
import { useFixedDropdownPosition } from '../search/useFixedDropdownPosition';
import { SearchField } from '../ui/SearchField';

type Props = {
  cpvCodes: CpvCodeOption[];
  value: string;
  onChange: (cpvCodeId: string) => void;
  onSearch?: (term: string) => void;
  loading?: boolean;
  placeholder?: string;
};

const noopSearch = (_term: string) => {};

export function CpvSearchSelect({
  cpvCodes,
  value,
  onChange,
  onSearch = noopSearch,
  loading = false,
  placeholder
}: Props) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t('common.selectCpv');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const portalId = useId();
  const onSearchRef = useRef(onSearch);
  const selectedFromList = cpvCodes.find((c) => c.id === value);
  const [selectedCache, setSelectedCache] = useState<CpvCodeOption | null>(null);
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
            className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 10050
            }}
          >
            <div className="p-2 border-b border-border bg-surface/80">
              <SearchField
                compact
                loading={loading}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('placeholders.searchByCodeOrDescription')}
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {cpvCodes.length === 0 && loading ? (
                <p className="px-3 py-2.5 text-xs text-muted">{t('common.loading')}</p>
              ) : cpvCodes.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-amber-700 bg-amber-50">{t('cpvCodes.noCodesLoaded')}</p>
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
                  {cpvCodes.map((cpv) => (
                    <button
                      key={cpv.id}
                      type="button"
                      onClick={() => {
                        onChange(cpv.id);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2 text-left text-[0.8125rem] transition-colors ${
                        value === cpv.id
                          ? 'bg-accent-subtle text-accent-hover font-semibold'
                          : 'text-foreground hover:bg-surface'
                      }`}
                    >
                      <span className="font-mono font-semibold">{cpv.code}</span>
                      <span className="text-muted"> – {cpv.description}</span>
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
          {selected ? `${selected.code} – ${selected.description}` : resolvedPlaceholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {dropdown}
    </div>
  );
}
