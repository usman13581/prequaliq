import type { InputHTMLAttributes, ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Optional wrapper class */
  wrapperClassName?: string;
  /** Show spinner on the right (LOV dropdown search). */
  loading?: boolean;
  /** Override default search icon. */
  icon?: ReactNode;
  /** Use compact height inside dropdowns. */
  compact?: boolean;
};

/**
 * Search input with leading icon that never overlaps the placeholder/text.
 */
export function SearchField({
  className = '',
  wrapperClassName = '',
  loading = false,
  icon,
  compact = false,
  ...props
}: Props) {
  return (
    <div className={`relative min-w-0 w-full ${wrapperClassName}`}>
      <span className="field-search-icon pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center text-muted">
        {icon ?? <Search size={compact ? 14 : 15} strokeWidth={2} aria-hidden />}
      </span>
      <input
        type="search"
        className={`field-control field-search ${compact ? 'field-search--compact' : ''} ${
          loading ? 'field-search--loading' : ''
        } ${className}`}
        {...props}
      />
      {loading ? (
        <span className="field-search-trailing pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center text-accent">
          <Loader2 size={14} className="animate-spin" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
