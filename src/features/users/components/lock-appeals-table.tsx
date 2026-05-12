"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminModalLayer } from "@/components/ui/admin-modal-layer";
import { Pagination } from "@/components/ui/pagination";
import { Toast } from "@/components/ui/toast";
import {
  getAdminLockAppeals,
  resolveAdminLockAppeal,
  type AdminLockAppealItem,
  type AdminLockAppealStatus,
} from "@/features/users/services/users-service";

type FilterStatus = AdminLockAppealStatus | "all";
type SortKey = "user" | "status" | "submittedAt" | "resolvedAt";
type SortDirection = "asc" | "desc";

const STATUS_LABEL: Record<AdminLockAppealStatus, string> = {
  pending: "Đang chờ",
  accepted: "Đã chấp nhận",
  rejected: "Đã từ chối",
};

const STATUS_BADGE: Record<AdminLockAppealStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const STATUS_ORDER: Record<AdminLockAppealStatus, number> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
};

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function compareDates(left: string | null, right: string | null) {
  const leftValue = left ? new Date(left).getTime() : 0;
  const rightValue = right ? new Date(right).getTime() : 0;
  return leftValue - rightValue;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function AppealsTableHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  align = "left",
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  align?: "left" | "right";
  onSort: (sortKey: SortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-fit items-center gap-1.5 ${align === "right" ? "text-right" : "text-left"} transition hover:text-accent ${isActive ? "text-foreground" : ""}`}
    >
      <span>{label}</span>
      <span
        className="flex h-4 w-3 flex-col items-center justify-center gap-0.5"
        aria-hidden="true"
      >
        <span
          className={`h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent ${
            isActive && direction === "asc"
              ? "border-b-foreground"
              : "border-b-muted-foreground/45"
          }`}
        />
        <span
          className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent ${
            isActive && direction === "desc"
              ? "border-t-foreground"
              : "border-t-muted-foreground/45"
          }`}
        />
      </span>
    </button>
  );
}

export function LockAppealsTable() {
  const [items, setItems] = useState<AdminLockAppealItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending");
  const [draftStatusFilter, setDraftStatusFilter] =
    useState<FilterStatus>("pending");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("submittedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [pendingAction, setPendingAction] = useState<{
    appeal: AdminLockAppealItem;
    action: "accept" | "dismiss";
  } | null>(null);
  const [resolverNote, setResolverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    title: string;
    message: string;
    variant?: "success" | "error";
  } | null>(null);

  const loadAppeals = useCallback(
    async ({ reloading = false }: { reloading?: boolean } = {}) => {
      if (reloading) setIsReloading(true);
      else setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAdminLockAppeals({
          status: "all",
          page: 1,
          limit: 500,
        });
        setItems(response.items);
      } catch (err) {
        setItems([]);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Không tải được danh sách khiếu nại.",
        );
      } finally {
        setIsLoading(false);
        setIsReloading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadAppeals();
  }, [loadAppeals]);

  const filteredAndSortedItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        item.user?.displayName ?? "",
        item.user?.email ?? "",
        item.user?.lockedReason ?? "",
        item.reason,
        item.resolver?.displayName ?? "",
        item.resolverNote ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    return [...filtered].sort((left, right) => {
      let result = 0;
      switch (sortKey) {
        case "user":
          result = compareText(
            left.user?.displayName ?? "",
            right.user?.displayName ?? "",
          );
          break;
        case "status":
          result = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
          break;
        case "resolvedAt":
          result = compareDates(left.resolvedAt, right.resolvedAt);
          break;
        case "submittedAt":
        default:
          result = compareDates(left.submittedAt, right.submittedAt);
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [items, searchText, statusFilter, sortKey, sortDirection]);

  const totalItems = filteredAndSortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, sortKey, sortDirection]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function applyFilters() {
    setStatusFilter(draftStatusFilter);
    setIsFilterOpen(false);
  }

  function resetFilters() {
    setSearchText("");
    setStatusFilter("all");
    setDraftStatusFilter("all");
    setIsFilterOpen(false);
  }

  const activeFilterCount = statusFilter === "all" ? 0 : 1;

  function openResolve(
    appeal: AdminLockAppealItem,
    action: "accept" | "dismiss",
  ) {
    setPendingAction({ appeal, action });
    setResolverNote("");
    setActionError(null);
  }

  function closeResolve() {
    if (submitting) return;
    setPendingAction(null);
    setResolverNote("");
    setActionError(null);
  }

  async function submitResolve() {
    if (!pendingAction) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await resolveAdminLockAppeal({
        appealId: pendingAction.appeal.id,
        action: pendingAction.action,
        note: resolverNote.trim() || undefined,
      });
      setPendingAction(null);
      setResolverNote("");
      setToast({
        title: pendingAction.action === "accept" ? "Đã chấp nhận" : "Đã từ chối",
        message:
          pendingAction.action === "accept"
            ? "Khiếu nại đã được chấp nhận và tài khoản đã được mở khóa."
            : "Khiếu nại đã được từ chối.",
        variant: "success",
      });
      await loadAppeals({ reloading: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Không thể xử lý khiếu nại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <Toast
        open={Boolean(toast)}
        title={toast?.title ?? ""}
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        onClose={() => setToast(null)}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-[560px]">
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Tìm theo người dùng, email, lý do khiếu nại..."
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
              onClick={() => void loadAppeals({ reloading: true })}
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
            <button
              type="button"
              onClick={() => {
                setDraftStatusFilter(statusFilter);
                setIsFilterOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Bộ lọc
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                {activeFilterCount}
              </span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Xóa lọc
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
                  <AppealsTableHeaderButton
                    label="Người dùng"
                    sortKey="user"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Lý do khiếu nại</th>
                <th className="px-4 py-3 font-semibold">
                  <AppealsTableHeaderButton
                    label="Trạng thái"
                    sortKey="status"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <AppealsTableHeaderButton
                    label="Gửi lúc"
                    sortKey="submittedAt"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Đang tải danh sách khiếu nại...
                  </td>
                </tr>
              ) : totalItems === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Không có khiếu nại phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((appeal) => (
                  <tr
                    key={appeal.id}
                    className="border-t border-border/70 align-top"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">
                        {appeal.user?.displayName || "?"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appeal.user?.email || "?"}
                      </p>
                      {appeal.user?.lockedReason ? (
                        <p className="mt-1 text-xs text-rose-700">
                          Lý do khóa: {appeal.user.lockedReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="whitespace-pre-wrap text-foreground">
                        {appeal.reason}
                      </p>
                      {appeal.resolverNote ? (
                        <p className="mt-2 rounded-md bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
                          Ghi chú: {appeal.resolverNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[appeal.status]}`}
                      >
                        {STATUS_LABEL[appeal.status]}
                      </span>
                      {appeal.resolvedAt ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(appeal.resolvedAt)}
                          {appeal.resolver?.displayName
                            ? ` · ${appeal.resolver.displayName}`
                            : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(appeal.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {appeal.status === "pending" ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openResolve(appeal, "dismiss")}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => openResolve(appeal, "accept")}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Chấp nhận
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-muted-foreground">
                          Đã xử lý
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          itemLabel="khiếu nại"
        />
      </div>

      {isFilterOpen ? (
        <AdminModalLayer>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              Bộ lọc khiếu nại
            </h3>
            <div className="mt-4 space-y-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select
                  value={draftStatusFilter}
                  onChange={(event) =>
                    setDraftStatusFilter(event.target.value as FilterStatus)
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Đang chờ</option>
                  <option value="accepted">Đã chấp nhận</option>
                  <option value="rejected">Đã từ chối</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraftStatusFilter("all")}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Xóa lọc
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </AdminModalLayer>
      ) : null}

      {pendingAction ? (
        <AdminModalLayer>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              {pendingAction.action === "accept"
                ? "Chấp nhận khiếu nại"
                : "Từ chối khiếu nại"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {pendingAction.action === "accept"
                ? "Tài khoản sẽ được mở khóa và người dùng có thể đăng nhập trở lại."
                : "Khiếu nại sẽ được đóng và tài khoản tiếp tục bị khóa."}
            </p>
            <label className="mt-3 block space-y-1.5 text-sm">
              <span className="font-medium text-foreground">
                Ghi chú nội bộ (tùy chọn)
              </span>
              <textarea
                value={resolverNote}
                onChange={(event) => setResolverNote(event.target.value)}
                rows={3}
                placeholder="Ghi chú cho lịch sử xử lý, không gửi cho người dùng."
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            {actionError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={closeResolve}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitResolve()}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction.action === "accept"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </AdminModalLayer>
      ) : null}
    </section>
  );
}
