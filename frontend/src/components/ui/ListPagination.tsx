import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LIST_PAGE_SIZE_OPTIONS } from '../../hooks/useListPagination';
import { BrandSelect } from './BrandSelect';

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Required — Rows selector is always shown (approved pagination style). */
  onPageSizeChange: (size: number) => void;
  /** Plural data name, e.g. "tenders", "contracts". */
  itemLabel: string;
};

/**
 * Compact app-wide pagination (brief §6.3):
 * Left — "1–10 of N {label}" + rows-per-page
 * Right — Previous | pages | Next
 */
export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel
}: ListPaginationProps) {
  const { t } = useTranslation();

  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pageNums: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNums.push(i);
  } else {
    const set = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
    pageNums.push(...Array.from(set).sort((a, b) => a - b));
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-t border-border pt-3 mt-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0 text-[0.8125rem]">
        <p className="text-muted whitespace-nowrap">
          {t('common.paginationShowing', { from, to, total, label: itemLabel })}
        </p>
        <label className="inline-flex items-center gap-2 text-muted">
          <span className="shrink-0">{t('common.rowsPerPage')}</span>
          <BrandSelect
            wrapperClassName="w-[4.25rem]"
            className="!py-1 !pl-2 !pr-7 !text-[0.8125rem] !rounded-md !border-border"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label={t('common.rowsPerPage')}
          >
            {LIST_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </BrandSelect>
        </label>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-ghost !min-h-8 !px-2.5 !py-1 !text-[0.78rem] disabled:opacity-40"
        >
          <ChevronLeft size={15} aria-hidden />
          {t('buttons.previous')}
        </button>
        <div className="flex gap-1">
          {pageNums.map((pageNum, idx) => {
            const prev = pageNums[idx - 1];
            const showEllipsis = prev != null && pageNum - prev > 1;
            return (
              <span key={pageNum} className="inline-flex items-center gap-1">
                {showEllipsis ? <span className="px-1 text-muted select-none text-sm">…</span> : null}
                <button
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  aria-current={page === pageNum ? 'page' : undefined}
                  className={`min-w-[2rem] px-2 py-1 text-[0.78rem] font-semibold rounded-md transition-colors ${
                    page === pageNum
                      ? 'bg-accent text-white'
                      : 'btn-ghost !min-h-8 !px-2 !py-1'
                  }`}
                >
                  {pageNum}
                </button>
              </span>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-ghost !min-h-8 !px-2.5 !py-1 !text-[0.78rem] disabled:opacity-40"
        >
          {t('buttons.next')}
          <ChevronRight size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
