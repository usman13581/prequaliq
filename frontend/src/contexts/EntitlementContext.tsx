import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

type EntitlementMap = Record<string, boolean>;

type CatalogItem = {
  key: string;
  layer: string;
  liveDefault: boolean;
};

type EntitlementContextType = {
  entitlements: EntitlementMap;
  catalog: CatalogItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  hasEntitlement: (key: string) => boolean;
};

const EntitlementContext = createContext<EntitlementContextType | undefined>(undefined);

export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [entitlements, setEntitlements] = useState<EntitlementMap>({});
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !user || user.role === 'admin') {
      setEntitlements({});
      setCatalog([]);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/entitlements/me');
      setEntitlements(response.data.entitlements || {});
      setCatalog(response.data.catalog || []);
    } catch (error) {
      console.error('Failed to load entitlements:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasEntitlement = useCallback(
    (key: string) => {
      if (!user || user.role === 'admin') return true;
      if (entitlements[key] === undefined) return true; // fail-open until loaded for live UX
      return !!entitlements[key];
    },
    [entitlements, user]
  );

  const value = useMemo(
    () => ({ entitlements, catalog, loading, refresh, hasEntitlement }),
    [entitlements, catalog, loading, refresh, hasEntitlement]
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
};

export const useEntitlements = () => {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error('useEntitlements must be used within EntitlementProvider');
  }
  return ctx;
};

/** Convenience hook: `const ok = useEntitlement('ai.profile_assist')` */
export const useEntitlement = (key: string) => {
  const { hasEntitlement, loading } = useEntitlements();
  return { enabled: hasEntitlement(key), loading };
};
