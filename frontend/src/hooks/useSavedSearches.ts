import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import type { FilterValues, SavedSearch } from '../components/search/filterTypes';

export function useSavedSearches(scope: string) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!scope) {
      setSearches([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/saved-searches', { params: { scope } });
      setSearches(res.data.searches || []);
    } catch {
      setSearches([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (name: string, filters: FilterValues) => {
      const res = await api.post('/saved-searches', { scope, name, filters });
      const created = res.data.search as SavedSearch;
      setSearches((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      return created;
    },
    [scope]
  );

  const remove = useCallback(async (id: string) => {
    await api.delete(`/saved-searches/${id}`);
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { searches, loading, reload, save, remove };
}
