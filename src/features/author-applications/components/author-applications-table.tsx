"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  approveAdminAuthorApplication,
  getAdminAuthorApplicationById,
  getAdminAuthorApplications,
  rejectAdminAuthorApplication,
} from "@/features/author-applications/services/author-applications-service";
import type { AuthorApplicationItem, AuthorApplicationStatus } from "@/features/author-applications/types";

type SortDirection = "asc" | "desc";
type ApplicationSortKey = "createdAt" | "status" | "trustScore" | "penName";

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function compareDates(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function formatDate(value: string | null) {
  if (!value) return "--";
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

function statusLabel(status: AuthorApplicationStatus) {
  if (status === "pending") return "Chờ duyệt";
  if (status === "approved") return "Đã duyệt";
  if (status === "rejected") return "Từ chối";
  return "Đã hủy";
}

function statusClass(status: AuthorApplicationStatus) {
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function HeaderSortButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: ApplicationSortKey;
  activeSortKey: ApplicationSortKey;
  direction: SortDirection;
  onSort: (sortKey: ApplicationSortKey) => void;
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
        <span className={`h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent ${isActive && direction === "asc" ? "border-b-foreground" : "border-b-muted-foreground/45"}`} />
        <span className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent ${isActive && direction === "desc" ? "border-t-foreground" : "border-t-muted-foreground/45"}`} />
      </span>
    </button>
  );
}

type ConfirmAction =
  | { kind: "approve"; item: AuthorApplicationItem }
  | { kind: "reject"; item: AuthorApplicationItem };

export function AuthorApplicationsTable() {
  const [rows, setRows] = useState<AuthorApplicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<AuthorApplicationStatus | "all">("pending");
  const [draftStatusFilter, setDraftStatusFilter] = useState<AuthorApplicationStatus | "all">("pending");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ApplicationSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeDetail, setActiveDetail] = useState<AuthorApplicationItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    void loadApplications();
  }, []);

  async function loadApplications({ reloading = false }: { reloading?: boolean } = {}) {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await getAdminAuthorApplications({ status: "all", limit: 100 });
      setRows(data);
    } catch (error) {
      setRows([]);
      setErrorMessage(error instanceof Error ? error.message : "Không thể tải danh sách đơn.");
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }

  const filteredAndSorted = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = rows.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return [
        item.penName,
        item.user?.displayName ?? "",
        item.user?.email ?? "",
        item.reason ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return [...filtered].sort((left, right) => {
      let result = 0;
      switch (sortKey) {
        case "status":
          result = compareText(left.status, right.status);
          break;
        case "trustScore":
          result = left.trustScoreSnapshot - right.trustScoreSnapshot;
          break;
        case "penName":
          result = compareText(left.penName, right.penName);
          break;
        case "createdAt":
        default:
          result = compareDates(left.createdAt, right.createdAt);
          break;
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, searchText, statusFilter, sortKey, sortDirection]);

  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, sortKey, sortDirection]);

  function toggleSort(nextKey: ApplicationSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  async function openDetail(id: string) {
    setIsDetailLoading(true);
    setErrorMessage("");
    try {
      const detail = await getAdminAuthorApplicationById(id);
      setActiveDetail(detail);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tải chi tiết đơn.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (confirmAction.kind === "approve") {
        await approveAdminAuthorApplication(confirmAction.item.id, reviewNote);
        setSuccessMessage("Đã duyệt đơn và nâng quyền tác giả.");
      } else {
        await rejectAdminAuthorApplication(confirmAction.item.id, reviewNote);
        setSuccessMessage("Đã từ chối đơn đăng ký tác giả.");
      }
      setConfirmAction(null);
      setReviewNote("");
      await loadApplications();
      if (activeDetail && activeDetail.id === confirmAction.item.id) {
        const detail = await getAdminAuthorApplicationById(confirmAction.item.id);
        setActiveDetail(detail);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể xử lý đơn.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeFilterCount = statusFilter === "all" ? 0 : 1;

  return (
    <section className="space-y-4">
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-[560px]">
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm bút danh, người nộp, email..."
              className="w-full rounded-xl border border-border bg-white px-4 py-2 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent"
            />
            {searchText.trim().length > 0 ? (
              <button type="button" onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">×</button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isReloading || isLoading}
              onClick={() => void loadApplications({ reloading: true })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              title="Tải lại"
            >
              <svg viewBox="0 0 24 24" className={`h-5 w-5 ${isReloading ? "animate-[spin_0.55s_linear_infinite]" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">{activeFilterCount}</span>
            </button>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold"><HeaderSortButton label="Đơn" sortKey="penName" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold">Người nộp</th>
                <th className="px-4 py-3 font-semibold"><HeaderSortButton label="Trạng thái" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><HeaderSortButton label="Trust score" sortKey="trustScore" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><HeaderSortButton label="Ngày nộp" sortKey="createdAt" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold text-right">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Đang tải danh sách đơn...</td></tr>
              ) : totalItems === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có đơn phù hợp bộ lọc.</td></tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.penName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{item.user?.displayName || "--"}</p>
                      <p className="text-xs text-muted-foreground">{item.user?.email || "--"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-semibold">{item.trustScoreSnapshot}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void openDetail(item.id)}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                        >
                          Chi tiết
                        </button>
                        {item.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmAction({ kind: "approve", item });
                                setReviewNote("");
                              }}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmAction({ kind: "reject", item });
                                setReviewNote("");
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                            >
                              Từ chối
                            </button>
                          </>
                        ) : null}
                      </div>
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
          itemLabel="đơn"
        />
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc đơn</h3>
            <div className="mt-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select
                  value={draftStatusFilter}
                  onChange={(event) => setDraftStatusFilter(event.target.value as AuthorApplicationStatus | "all")}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDraftStatusFilter("all")} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted">Xóa lọc</button>
              <button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted">Hủy</button>
              <button type="button" onClick={() => { setStatusFilter(draftStatusFilter); setIsFilterOpen(false); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong">Áp dụng</button>
            </div>
          </div>
        </div>
      ) : null}

      {activeDetail || isDetailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Chi tiết đơn đăng ký tác giả</h3>
              <button type="button" onClick={() => setActiveDetail(null)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted">Đóng</button>
            </div>
            {isDetailLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Đang tải chi tiết...</p>
            ) : activeDetail ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bút danh</p><p className="mt-1 font-semibold text-foreground">{activeDetail.penName}</p></div>
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trust score</p><p className="mt-1 font-semibold text-foreground">{activeDetail.trustScoreSnapshot}</p></div>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Người nộp</p><p className="mt-1 font-semibold text-foreground">{activeDetail.user?.displayName || "--"} · {activeDetail.user?.email || "--"}</p></div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Bio</p><p className="mt-1 whitespace-pre-wrap text-foreground">{activeDetail.bio || "Chưa có bio."}</p></div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Lý do</p><p className="mt-1 whitespace-pre-wrap text-foreground">{activeDetail.reason || "Chưa có lý do."}</p></div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Links mẫu</p><p className="mt-1 text-foreground">{activeDetail.sampleLinks.length ? activeDetail.sampleLinks.join(" · ") : "Không có"}</p></div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Review note</p><p className="mt-1 whitespace-pre-wrap text-foreground">{activeDetail.reviewNote || "Chưa có"}</p></div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              {confirmAction.kind === "approve" ? "Duyệt đơn tác giả" : "Từ chối đơn tác giả"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction.kind === "approve"
                ? `Xác nhận duyệt đơn của ${confirmAction.item.user?.displayName || "--"} và nâng quyền thành tác giả?`
                : `Nhập lý do từ chối đơn của ${confirmAction.item.user?.displayName || "--"}.`}
            </p>
            <div className="mt-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Ghi chú review</span>
                <textarea
                  rows={4}
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmAction(null)} disabled={isSubmitting} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60">Hủy</button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={isSubmitting || (confirmAction.kind === "reject" && !reviewNote.trim())}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

