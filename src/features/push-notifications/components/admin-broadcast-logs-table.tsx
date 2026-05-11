"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  getAdminBroadcastLogs,
  type AdminBroadcastLogItem,
  type AdminBroadcastLogSortKey,
} from "@/features/push-notifications/services/admin-push-service";

type SortDirection = "asc" | "desc";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function truncateBody(text: string, max = 120) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function BroadcastLogHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: AdminBroadcastLogSortKey;
  activeSortKey: AdminBroadcastLogSortKey;
  direction: SortDirection;
  onSort: (sortKey: AdminBroadcastLogSortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-fit items-center gap-1.5 text-left transition hover:text-accent ${isActive ? "text-foreground" : ""}`}
    >
      <span>{label}</span>
      <span className="flex h-4 w-3 flex-col items-center justify-center gap-0.5" aria-hidden="true">
        <span
          className={`h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent ${isActive && direction === "asc" ? "border-b-foreground" : "border-b-muted-foreground/45"}`}
        />
        <span
          className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent ${isActive && direction === "desc" ? "border-t-foreground" : "border-t-muted-foreground/45"}`}
        />
      </span>
    </button>
  );
}

type AdminBroadcastLogsTableProps = {
  refreshKey: number;
};

export function AdminBroadcastLogsTable({ refreshKey }: AdminBroadcastLogsTableProps) {
  const [items, setItems] = useState<AdminBroadcastLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sortKey, setSortKey] = useState<AdminBroadcastLogSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchText.trim());
      debounceRef.current = null;
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sortKey, sortDirection]);

  const loadLogs = useCallback(
    async ({ reloading = false }: { reloading?: boolean } = {}) => {
      if (reloading) setIsReloading(true);
      else setIsLoading(true);
      setErrorMessage("");
      try {
        const res = await getAdminBroadcastLogs({
          query: debouncedQuery || undefined,
          sort: sortKey,
          order: sortDirection,
          page,
          page_size: pageSize,
        });
        const maxPage = Math.max(1, Math.ceil(res.total / pageSize));
        if (page > maxPage) {
          setPage(maxPage);
          return;
        }
        setItems(res.items);
        setTotal(res.total);
      } catch (error) {
        setItems([]);
        setTotal(0);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải lịch sử gửi thông báo.",
        );
      } finally {
        setIsLoading(false);
        setIsReloading(false);
      }
    },
    [debouncedQuery, sortKey, sortDirection, page, pageSize],
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshKey]);

  function toggleSort(nextKey: AdminBroadcastLogSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === "created_at" ? "desc" : "asc");
  }

  return (
    <section className="space-y-4">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-[560px]">
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm theo tiêu đề hoặc nội dung..."
              className="w-full rounded-xl border border-border bg-white px-4 py-2 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent"
            />
            {searchText.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
              >
                ×
              </button>
            ) : null}
          </div>
          <button
            type="button"
            disabled={isReloading || isLoading}
            onClick={() => void loadLogs({ reloading: true })}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            title="Tải lại"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 ${isReloading ? "animate-[spin_0.55s_linear_infinite]" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  <BroadcastLogHeaderButton
                    label="Thời gian"
                    sortKey="created_at"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <BroadcastLogHeaderButton
                    label="Tiêu đề"
                    sortKey="title"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Nội dung</th>
                <th className="px-4 py-3 font-semibold">
                  <BroadcastLogHeaderButton
                    label="Tài khoản"
                    sortKey="total_accounts"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <BroadcastLogHeaderButton
                    label="Thành công"
                    sortKey="created_count"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <BroadcastLogHeaderButton
                    label="Lỗi"
                    sortKey="failed_count"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Người gửi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Đang tải lịch sử...
                  </td>
                </tr>
              ) : total === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Chưa có bản ghi gửi thông báo hoặc không khớp tìm kiếm.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-border/70">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 font-semibold text-foreground">
                      <span className="line-clamp-2">{row.title}</span>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-foreground">
                      <span className="line-clamp-2 text-muted-foreground">{truncateBody(row.body)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.total_accounts}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.created_count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.failed_count}</td>
                    <td className="max-w-[180px] px-4 py-3 text-muted-foreground">
                      {row.actor ? (
                        <span className="line-clamp-2" title={row.actor.email}>
                          {row.actor.display_name || row.actor.email}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={total}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          itemLabel="thông báo"
        />
      </div>
    </section>
  );
}
