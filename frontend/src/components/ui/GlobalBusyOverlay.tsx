import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeGlobalBusy } from '../../lib/globalBusy';

const SHOW_DELAY_MS = 160;
const MIN_VISIBLE_MS = 280;

/**
 * Full-screen busy layer while API work runs — midsize blinking dots, no label text.
 */
export function GlobalBusyOverlay() {
  const [pending, setPending] = useState(0);
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);

  useEffect(() => subscribeGlobalBusy(setPending), []);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    if (pending > 0) {
      if (!visible) {
        showTimer = setTimeout(() => {
          shownAtRef.current = Date.now();
          setVisible(true);
        }, SHOW_DELAY_MS);
      }
    } else if (visible) {
      const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : MIN_VISIBLE_MS;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimer = setTimeout(() => {
        setVisible(false);
        shownAtRef.current = 0;
      }, wait);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [pending, visible]);

  if (!visible || typeof document === 'undefined') return null;

  return createPortal(
    <div className="global-busy-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="global-busy-dots" aria-hidden>
        <span className="global-busy-dot" />
        <span className="global-busy-dot" />
        <span className="global-busy-dot" />
        <span className="global-busy-dot" />
      </div>
    </div>,
    document.body
  );
}
