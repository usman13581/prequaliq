import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useFixedDropdownPosition } from '../search/useFixedDropdownPosition';
import { SearchField } from './SearchField';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  wrapperClassName?: string;
  children?: ReactNode;
  /** Optional search box placeholder inside the dropdown */
  searchPlaceholder?: string;
};

type OptionItem = { value: string; label: string; disabled?: boolean };

function optionsFromChildren(children: ReactNode): OptionItem[] {
  const out: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== 'option') return;
    const value = child.props.value != null ? String(child.props.value) : '';
    const label =
      typeof child.props.children === 'string' || typeof child.props.children === 'number'
        ? String(child.props.children)
        : Array.isArray(child.props.children)
          ? child.props.children.map(String).join(' ')
          : value;
    out.push({ value, label, disabled: Boolean(child.props.disabled) });
  });
  return out;
}

/**
 * Searchable LOV select (replaces bare browser <select>).
 * Keeps the same children API: <BrandSelect><option>…</option></BrandSelect>
 */
export function BrandSelect({
  className = '',
  wrapperClassName = '',
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  searchPlaceholder = 'Search…',
  id,
  name,
  required,
  'aria-label': ariaLabel,
  ...rest
}: Props) {
  const options = useMemo(() => optionsFromChildren(children), [children]);
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(String(defaultValue ?? ''));
  const current = isControlled ? String(value ?? '') : internal;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const portalId = useId();
  const coords = useFixedDropdownPosition(open, containerRef);
  const selected = options.find((o) => o.value === current);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      const portal = document.getElementById(portalId);
      if (portal?.contains(target)) return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, portalId]);

  const commit = (next: string) => {
    if (!isControlled) setInternal(next);
    if (onChange) {
      const synthetic = {
        target: { value: next, name: name || '' },
        currentTarget: { value: next, name: name || '' }
      } as ChangeEvent<HTMLSelectElement>;
      onChange(synthetic);
    }
    setOpen(false);
    setSearch('');
  };

  const dropdown =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={portalId}
            className="rounded-lg border border-border bg-card shadow-lg overflow-hidden"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: Math.max(coords.width, 200),
              zIndex: 10050
            }}
          >
            <div className="p-2 border-b border-border bg-surface/80">
              <SearchField
                compact
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-muted">No matches</p>
              ) : (
                filtered.map((opt) => {
                  const active = opt.value === current;
                  return (
                    <button
                      key={`${opt.value}::${opt.label}`}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => commit(opt.value)}
                      className={`w-full px-3 py-2 text-left text-[0.8125rem] flex items-center gap-2 disabled:opacity-40 ${
                        active
                          ? 'bg-accent-subtle text-accent-hover font-semibold'
                          : 'text-foreground hover:bg-surface'
                      }`}
                    >
                      <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                      {active ? <Check size={14} className="text-accent shrink-0" aria-hidden /> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative min-w-0 w-full ${wrapperClassName}`} ref={containerRef}>
      {/* Keep a native select for forms/required/name semantics (visually hidden) */}
      <select
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        {...rest}
      >
        {children}
      </select>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`field-trigger w-full min-w-0 flex items-center justify-between gap-2 text-left disabled:opacity-60 ${className}`}
      >
        <span className={`min-w-0 truncate ${selected ? 'text-foreground' : 'text-muted-light'}`}>
          {selected?.label || '—'}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {dropdown}
    </div>
  );
}
