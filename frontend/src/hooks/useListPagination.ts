import { useEffect, useMemo, useState } from 'react';

export const LIST_PAGE_SIZE_OPTIONS = [5, 10, 50, 100] as const;
export const DEFAULT_LIST_PAGE_SIZE = 10;

/** Client-side pagination: slices a full in-memory list. */
export function useListPagination<T>(
  items: T[],
  initialPageSize: number = DEFAULT_LIST_PAGE_SIZE
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    paginatedItems,
    showPagination: total > 0
  };
}

type ServerListPaginationOptions = {
  initialPageSize?: number;
  /** When this changes (filters, scope, search), page resets to 1. */
  resetKey?: string | number;
};

/**
 * Server-driven pagination: items for the current page come from the API;
 * `total` is set from the response. Pair with `<ListPagination />`.
 */
export function useServerListPagination(options: ServerListPaginationOptions = {}) {
  const { initialPageSize = DEFAULT_LIST_PAGE_SIZE, resetKey } = options;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [pageSize, resetKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    setTotal,
    totalPages,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    showPagination: total > 0
  };
}
