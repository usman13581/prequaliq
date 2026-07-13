import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search } from 'lucide-react';
import type { CpvCodeOption } from '../../hooks/useCpvCatalogSearch';

type Props = {
  cpvCodes: CpvCodeOption[];
  value: string;
  onChange: (cpvCodeId: string) => void;
  onSearch: (term: string) => void;
  loading?: boolean;
  placeholder?: string;
};

export function CpvSearchSelect({
  cpvCodes,
  value,
  onChange,
  onSearch,
  loading = false,
  placeholder = 'Select CPV Code',
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = cpvCodes.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    onSearch(search);
  }, [search, open, onSearch]);

  useEffect(() => {
    if (open) onSearch(search);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-left"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? `${selected.code} – ${selected.description}` : placeholder}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50/80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('placeholders.searchByCodeOrDescription')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {loading ? (
              <p className="px-4 py-3 text-sm text-muted">{t('common.loading')}</p>
            ) : cpvCodes.length === 0 ? (
              <p className="px-4 py-3 text-sm text-amber-700 bg-amber-50">{t('cpvCodes.noCodesLoaded')}</p>
            ) : (
              cpvCodes.map((cpv) => (
                <button
                  key={cpv.id}
                  type="button"
                  onClick={() => {
                    onChange(cpv.id);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    value === cpv.id
                      ? 'bg-primary-50 text-primary-800 font-medium'
                      : 'text-gray-700 hover:bg-primary-50/60'
                  }`}
                >
                  <span className="font-mono font-semibold">{cpv.code}</span>
                  <span className="text-muted"> – {cpv.description}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
