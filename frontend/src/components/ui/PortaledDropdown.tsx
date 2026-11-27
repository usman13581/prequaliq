import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useFixedDropdownPosition } from '../search/useFixedDropdownPosition';

type Props = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** Extra class on the floating panel */
  className?: string;
  id?: string;
};

const EDGE = 8;

/**
 * Renders children in a fixed portal under an anchor — avoids overflow clipping.
 * When there is not enough room below (calendars near the bottom of a form or modal),
 * the panel opens above the anchor instead, and is always kept inside the window.
 */
export function PortaledDropdown({ open, anchorRef, children, className = '', id }: Props) {
  const coords = useFixedDropdownPosition(open, anchorRef);
  const panelRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setTop(null);
      return;
    }
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const height = panel.offsetHeight;
    const rect = anchor.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - EDGE;
    const above = rect.top - EDGE;
    let next = coords.top;
    if (height > below && above > below) {
      next = rect.top - height - 4;
    }
    next = Math.min(next, window.innerHeight - height - EDGE);
    next = Math.max(next, EDGE);
    setTop(next);
  }, [open, coords.top, coords.left, coords.width, anchorRef, children]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      data-portaled-dropdown="true"
      className={className}
      style={{
        position: 'fixed',
        top: top ?? coords.top,
        left: coords.left,
        width: Math.max(coords.width, 280),
        maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        overflowY: 'auto',
        // Measured first, shown once placed, so it never flashes in the wrong spot.
        visibility: top === null ? 'hidden' : 'visible',
        zIndex: 10050
      }}
    >
      {children}
    </div>,
    document.body
  );
}
