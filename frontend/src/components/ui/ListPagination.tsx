import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel: string;
};

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  itemLabel
}: ListPaginationProps) {
  const { t } = useTranslation();

  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showControls = total > pageSize;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${showControls ? 'border-t border-border pt-4' : 'pt-2'}`}>
      <p className="text-sm text-muted">
        {t('common.paginationShowing', { from, to, total, label: itemLabel })}
      </p>
      {showControls && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground bg-white hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            {t('buttons.previous')}
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[2.25rem] px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  page === pageNum
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'border border-border text-foreground bg-white hover:bg-surface'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground bg-white hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            {t('buttons.next')}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
