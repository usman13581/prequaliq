import { useCallback, useEffect, useState, type RefObject } from 'react';

type Coords = { top: number; left: number; width: number };

/**
 * Positions a portaled dropdown under an anchor (avoids overflow:hidden clipping).
 */
export function useFixedDropdownPosition(open: boolean, anchorRef: RefObject<HTMLElement | null>) {
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0, width: 0 });

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 220);
    let left = r.left;
    const maxLeft = window.innerWidth - width - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);
    setCoords({
      top: r.bottom + 4,
      left,
      width
    });
  }, [anchorRef]);

  useEffect(() => {
    if (!open) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return coords;
}
