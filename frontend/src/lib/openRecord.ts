import { useEffect, useRef } from 'react';

/**
 * "Open this record" hand-off between screens. The Home screen asks for a record, switches tab,
 * and the list on that tab opens it once its data is loaded.
 */
export type OpenRecordKind = 'procedure' | 'contract' | 'tender' | 'supplierContract';

type OpenRecordRequest = { kind: OpenRecordKind; id: string; tab?: string };

const KEY = 'pq.openRecord';
const EVENT = 'pq-open-record';

export function requestOpenRecord(kind: OpenRecordKind, id: string, tab?: string) {
  sessionStorage.setItem(KEY, JSON.stringify({ kind, id, tab }));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Calls `open` once for a pending request of this kind, as soon as `ready` is true. */
export function useOpenRecord(kind: OpenRecordKind, ready: boolean, open: (id: string, tab?: string) => void) {
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!ready) return;
    const consume = () => {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return;
      let request: OpenRecordRequest;
      try {
        request = JSON.parse(raw);
      } catch {
        sessionStorage.removeItem(KEY);
        return;
      }
      if (request.kind !== kind || !request.id) return;
      sessionStorage.removeItem(KEY);
      openRef.current(request.id, request.tab);
    };
    consume();
    window.addEventListener(EVENT, consume);
    return () => window.removeEventListener(EVENT, consume);
  }, [kind, ready]);
}
