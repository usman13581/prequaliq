import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

/** Styled select matching CPV/NUTS trigger look (not bare browser chrome). */
export function BrandSelect({ className = '', wrapperClassName = '', children, ...props }: Props) {
  return (
    <div className={`relative min-w-0 w-full ${wrapperClassName}`}>
      <select
        className={`w-full min-w-0 appearance-none pl-4 pr-10 py-3 border border-gray-300 rounded-xl bg-white text-sm sm:text-base text-foreground focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-primary-400 disabled:opacity-60 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={18}
        aria-hidden
      />
    </div>
  );
}
