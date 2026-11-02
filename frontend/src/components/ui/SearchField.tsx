import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Optional wrapper class */
  wrapperClassName?: string;
};

/**
 * Search input with icon that never overlaps text.
 */
export function SearchField({ className = '', wrapperClassName = '', ...props }: Props) {
  return (
    <div className={`relative min-w-0 w-full ${wrapperClassName}`}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        size={15}
        aria-hidden
      />
      <input
        type="search"
        className={`field-control !pl-8 ${className}`}
        {...props}
      />
    </div>
  );
}
