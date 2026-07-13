import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

export type CpvCodeOption = {
  id: string;
  code: string;
  description: string;
};

/**
 * Server-side CPV search — same catalog as GET /cpv (supplier profile picker).
 */
export function useCpvCatalogSearch() {
  const [cpvCodes, setCpvCodes] = useState<CpvCodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCodes = useCallback(async (searchTerm?: string, selectedIds?: string | string[]) => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '500' };
      const q = searchTerm?.trim();
      if (q) params.search = q;

      const response = await api.get('/cpv', { params });
      let list: CpvCodeOption[] = response.data.cpvCodes || [];

      const ids = (Array.isArray(selectedIds) ? selectedIds : selectedIds ? [selectedIds] : []).filter(
        Boolean
      );
      for (const selectedId of ids) {
        if (!list.find((c) => c.id === selectedId)) {
          try {
            const one = await api.get(`/cpv/${selectedId}`);
            if (one.data.cpvCode) {
              list = [one.data.cpvCode, ...list];
            }
          } catch {
            /* ignore */
          }
        }
      }

      setCpvCodes(Array.isArray(list) ? list : []);
    } catch {
      setCpvCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchDebounced = useCallback(
    (searchTerm: string, selectedIds?: string | string[], delayMs = 300) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchCodes(searchTerm, selectedIds);
      }, delayMs);
    },
    [fetchCodes]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  return { cpvCodes, loading, fetchCodes, searchDebounced };
}
