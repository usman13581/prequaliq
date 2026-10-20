import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Persist portal sidebar tab in `?tab=` so refresh/reload keeps the same screen.
 * Default tab is omitted from the URL for a clean home path.
 */
export function usePortalTab(defaultTab: string, allowedTabs: readonly string[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const allowed = useMemo(() => new Set(allowedTabs), [allowedTabs]);

  const activeTab = useMemo(() => {
    const fromUrl = searchParams.get('tab');
    if (fromUrl && allowed.has(fromUrl)) return fromUrl;
    return defaultTab;
  }, [searchParams, allowed, defaultTab]);

  const setActiveTab = useCallback(
    (id: string) => {
      const next = allowed.has(id) ? id : defaultTab;
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === defaultTab) {
            params.delete('tab');
          } else {
            params.set('tab', next);
          }
          return params;
        },
        { replace: true }
      );
    },
    [allowed, defaultTab, setSearchParams]
  );

  return [activeTab, setActiveTab] as const;
}
