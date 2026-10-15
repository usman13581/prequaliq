import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Optional wrapper class */
  wrapperClassName?: string;
};

/**
 * Search input with icon that never overlaps text (avoid pairing Search + input-brand pl-9).
 */
export function SearchField({ className = '', wrapperClassName = '', ...props }: Props) {
  return (
    <div className={`relative min-w-0 w-full ${wrapperClassName}`}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        size={18}
        aria-hidden
      />
      <input
        type="search"
        className={`w-full min-w-0 pl-11 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-sm sm:text-base text-foreground placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${className}`}
        {...props}
      />
    </div>
  );
}
