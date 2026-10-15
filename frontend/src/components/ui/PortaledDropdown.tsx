import type { ReactNode, RefObject } from 'react';
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

/** Renders children in a fixed portal under an anchor — avoids overflow clipping. */
export function PortaledDropdown({ open, anchorRef, children, className = '', id }: Props) {
  const coords = useFixedDropdownPosition(open, anchorRef);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      id={id}
      data-portaled-dropdown="true"
      className={className}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: Math.max(coords.width, 280),
        zIndex: 10050
      }}
    >
      {children}
    </div>,
    document.body
  );
}
