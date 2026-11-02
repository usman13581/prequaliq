import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type RowActionItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success';
  hidden?: boolean;
};

type Props = {
  items: RowActionItem[];
  /** Accessible label for the trigger */
  label?: string;
};

/**
 * Compact ⋮ menu for dense data-grid action columns.
 */
export function RowActionsMenu({ items, label }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalId = useId();
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 200 });

  const visible = items.filter((i) => !i.hidden);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 200;
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    const spaceBelow = window.innerHeight - r.bottom;
    const estimatedHeight = Math.min(320, 12 + visible.length * 36);
    const top =
      spaceBelow < estimatedHeight && r.top > estimatedHeight
        ? r.top - estimatedHeight - 4
        : r.bottom + 4;
    setCoords({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, visible.length]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const portal = document.getElementById(portalId);
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, portalId]);

  if (visible.length === 0) return null;

  const toneClass = (tone?: RowActionItem['tone']) => {
    if (tone === 'danger') return 'text-red-600 hover:bg-red-50';
    if (tone === 'success') return 'text-emerald-700 hover:bg-emerald-50';
    return 'text-foreground hover:bg-surface';
  };

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            id={portalId}
            role="menu"
            className="rounded-lg border border-border bg-card shadow-lg overflow-hidden py-1"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 10060
            }}
          >
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[0.8125rem] font-medium ${toneClass(item.tone)}`}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon ? <span className="shrink-0 opacity-80">{item.icon}</span> : null}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label || t('columns.actions')}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted hover:bg-surface hover:text-foreground"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {menu}
    </>
  );
}
