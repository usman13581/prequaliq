import { Link } from 'react-router-dom';

type LogoProps = {
  to?: string;
  variant?: 'default' | 'light';
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  showSubtitle?: boolean;
};

const sizes = {
  sm: { img: 32, text: 'text-base sm:text-lg' },
  md: { img: 36, text: 'text-lg sm:text-xl' },
  lg: { img: 44, text: 'text-xl sm:text-2xl' },
};

export function Logo({
  to = '/',
  variant = 'default',
  size = 'md',
  subtitle,
  showSubtitle = true,
}: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-primary-800';
  const subColor = variant === 'light' ? 'text-slate-300' : 'text-muted-light';

  return (
    <Link
      to={to}
      className="flex items-center gap-2 sm:gap-3 group min-w-0 hover:opacity-95 transition-opacity"
    >
      <img
        src="/images/logo.png"
        alt="PrequaliQ"
        width={sizes[size].img}
        height={sizes[size].img}
        className="rounded-xl shrink-0 shadow-sm"
      />
      <div className="flex flex-col leading-tight min-w-0">
        <span className={`${sizes[size].text} font-bold ${textColor} tracking-tight truncate`}>
          PrequaliQ
        </span>
        {showSubtitle && subtitle && (
          <span
            className={`text-[10px] sm:text-[11px] font-medium normal-case tracking-normal mt-0.5 ${subColor} line-clamp-2 sm:line-clamp-1 sm:truncate`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
}
