import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

export type NutsCodeOption = {
  id: string;
  code: string;
  name: string;
  nameSwedish?: string | null;
};

/**
 * NUTS catalog search via GET /nuts (authenticated).
 */
export function useNutsCatalogSearch() {
  const [nutsCodes, setNutsCodes] = useState<NutsCodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<Map<string, NutsCodeOption>>(new Map());

  const fetchCodes = useCallback(async (searchTerm?: string, selectedIds?: string | string[]) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      const q = searchTerm?.trim();
      if (q) params.search = q;

      let list: NutsCodeOption[] = [];
      try {
        const response = await api.get('/nuts', { params });
        list = (response.data.nutsCodes || []).map(
          (row: { id: string; code: string; name?: string; nameSwedish?: string | null }) => ({
            id: row.id,
            code: row.code,
            name: row.name || row.code,
            nameSwedish: row.nameSwedish
          })
        );
      } catch {
        try {
          const response = await api.get('/lookups/nuts', { params: { ...params, limit: 500 } });
          list = (response.data.items || []).map(
            (row: {
              id: string;
              code: string;
              name?: string;
              description?: string;
              nameSwedish?: string | null;
            }) => ({
              id: row.id,
              code: row.code,
              name: row.name || row.description || row.code,
              nameSwedish: row.nameSwedish
            })
          );
        } catch {
          list = [];
        }
      }

      list.forEach((n) => cacheRef.current.set(n.id, n));

      const ids = (Array.isArray(selectedIds) ? selectedIds : selectedIds ? [selectedIds] : []).filter(
        Boolean
      );
      for (const selectedId of ids) {
        if (!list.find((n) => n.id === selectedId)) {
          const cached = cacheRef.current.get(selectedId);
          if (cached) {
            list = [cached, ...list];
            continue;
          }
          try {
            const one = await api.get(`/nuts/${selectedId}`);
            const row = one.data.nutsCode;
            if (row) {
              const mapped: NutsCodeOption = {
                id: row.id,
                code: row.code,
                name: row.name || row.code,
                nameSwedish: row.nameSwedish
              };
              cacheRef.current.set(mapped.id, mapped);
              list = [mapped, ...list];
            }
          } catch {
            /* ignore */
          }
        }
      }

      setNutsCodes(Array.isArray(list) ? list : []);
    } catch {
      setNutsCodes([]);
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

  return { nutsCodes, loading, fetchCodes, searchDebounced };
}
