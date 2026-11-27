export type StatusPill<T extends string = string> = { id: T; label: string; count: number };

/**
 * Row of status chips with counts, used beside list search boxes.
 * Empty statuses are hidden, except the selected one and the first ("All") chip.
 */
export function StatusPills<T extends string>({
  pills,
  value,
  onChange,
  className = ''
}: {
  pills: StatusPill<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group">
      {pills
        .filter((p, i) => i === 0 || p.count > 0 || p.id === value)
        .map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={value === p.id}
            onClick={() => onChange(p.id)}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
              value === p.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-foreground border-border hover:bg-surface'
            }`}
          >
            {p.label}
            <span className={value === p.id ? 'opacity-90' : 'text-muted'}>{p.count}</span>
          </button>
        ))}
    </div>
  );
}
