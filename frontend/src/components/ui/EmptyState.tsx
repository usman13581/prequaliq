import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  /** Filter miss vs truly empty */
  filtered?: boolean;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  filtered = false,
}: EmptyStateProps) {
  return (
    <div className="panel-card flex flex-col items-center justify-center text-center px-6 py-12">
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
          filtered ? 'bg-surface text-muted' : 'bg-accent-subtle text-accent'
        }`}
      >
        <Icon size={22} strokeWidth={2} aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="panel-card flex flex-col items-center justify-center py-14">
      <div className="h-10 w-10 rounded-full border-4 border-accent/25 border-t-accent animate-spin" />
      <p className="mt-3 text-sm text-muted">{label}</p>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}
