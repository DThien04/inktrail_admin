"use client";

type PaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  className?: string;
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(1, page), Math.max(1, totalPages));
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = "mục",
  className = "",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = clampPage(page, totalPages);
  const visiblePages = getVisiblePages(currentPage, totalPages);
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div
      className={`flex flex-col gap-3 border-t border-border bg-white px-5 py-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Hiển thị {firstItem}-{lastItem} trong {totalItems} {itemLabel}
        </span>
        {onPageSizeChange ? (
          <label className="flex items-center gap-2">
            <span>Mỗi trang</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-lg border border-border bg-white px-2 py-1 text-sm font-medium text-foreground outline-none transition focus:border-accent"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          Trước
        </button>
        {visiblePages.map((visiblePage, index) => {
          const previousPage = visiblePages[index - 1];
          const needsGap = previousPage !== undefined && visiblePage - previousPage > 1;

          return (
            <span key={visiblePage} className="flex items-center gap-1">
              {needsGap ? <span className="px-1 text-muted-foreground">...</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(visiblePage)}
                className={`min-w-9 rounded-lg border px-3 py-1.5 font-semibold transition ${
                  visiblePage === currentPage
                    ? "border-accent bg-accent text-white"
                    : "border-border text-foreground hover:bg-surface-muted"
                }`}
              >
                {visiblePage}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
