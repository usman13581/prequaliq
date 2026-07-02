import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_LIST_PAGE_SIZE = 10;

export function useListPagination<T>(items: T[], pageSize = DEFAULT_LIST_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
    total,
    totalPages,
    paginatedItems,
    showPagination: total > pageSize
  };
}
