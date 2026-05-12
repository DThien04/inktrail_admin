"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminModalLayer } from "@/components/ui/admin-modal-layer";
import { Pagination } from "@/components/ui/pagination";
import { Toast } from "@/components/ui/toast";
import { getStoredUser } from "@/features/auth/storage";
import {
  getAdminUsers,
  lockAdminUser,
  unlockAdminUser,
} from "@/features/users/services/users-service";
import type {
  AdminUserItem,
  UserRole,
  UserStatusFilter,
} from "@/features/users/types";

type UserSortKey = "displayName" | "email" | "role" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function compareDates(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
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

function roleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  return "Độc giả";
}

function roleClass(role: UserRole) {
  if (role === "admin") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function isCurrentlyLocked(user: AdminUserItem) {
  if (!user.isLocked) return false;
  if (!user.lockedUntil) return true;
  return new Date(user.lockedUntil).getTime() > Date.now();
}

function buildLockTooltip(user: AdminUserItem) {
  if (!isCurrentlyLocked(user)) return undefined;
  const parts: string[] = [];
  if (user.lockedReason) parts.push(`Lý do: ${user.lockedReason}`);
  parts.push(
    `Mở khóa: ${user.lockedUntil ? formatDateTime(user.lockedUntil) : "Vĩnh viễn"}`,
  );
  if (user.lockedBy) parts.push(`Bởi: ${user.lockedBy.displayName}`);
  if (user.lockedAt) parts.push(`Lúc: ${formatDateTime(user.lockedAt)}`);
  return parts.join("\n");
}

function UserTableHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: UserSortKey;
  activeSortKey: UserSortKey;
  direction: SortDirection;
  onSort: (sortKey: UserSortKey) => void;
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

export function UsersTable() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [draftRoleFilter, setDraftRoleFilter] = useState<"all" | UserRole>("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<UserStatusFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<UserSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [lockTarget, setLockTarget] = useState<AdminUserItem | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [lockUntil, setLockUntil] = useState("");
  const [lockSubmitting, setLockSubmitting] = useState(false);
  const [lockError, setLockError] = useState("");

  const [unlockTarget, setUnlockTarget] = useState<AdminUserItem | null>(null);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    setCurrentUserId(stored?.id ?? null);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers({ reloading = false }: { reloading?: boolean } = {}) {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);

    setErrorMessage("");
    try {
      const rows = await getAdminUsers({ role: "all", status: "all" });
      setUsers(rows);
    } catch (error) {
      setUsers([]);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể tải danh sách người dùng.",
      );
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }

  const filteredAndSortedUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = users.filter((item) => {
      if (roleFilter !== "all" && item.role !== roleFilter) return false;
      if (statusFilter === "locked" && !isCurrentlyLocked(item)) return false;
      if (statusFilter === "active" && isCurrentlyLocked(item)) return false;
      if (!query) return true;
      return [item.displayName, item.email, roleLabel(item.role)].join(" ").toLowerCase().includes(query);
    });

    return [...filtered].sort((left, right) => {
      let result = 0;
      switch (sortKey) {
        case "displayName":
          result = compareText(left.displayName, right.displayName);
          break;
        case "email":
          result = compareText(left.email, right.email);
          break;
        case "role":
          result = compareText(left.role, right.role);
          break;
        case "status":
          result = Number(isCurrentlyLocked(left)) - Number(isCurrentlyLocked(right));
          break;
        case "createdAt":
        default:
          result = compareDates(left.createdAt, right.createdAt);
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [users, searchText, roleFilter, statusFilter, sortKey, sortDirection]);

  const totalItems = filteredAndSortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, roleFilter, statusFilter, sortKey, sortDirection]);

  function toggleSort(nextKey: UserSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function applyFilters() {
    setRoleFilter(draftRoleFilter);
    setStatusFilter(draftStatusFilter);
    setIsFilterOpen(false);
  }

  function resetFilters() {
    setSearchText("");
    setRoleFilter("all");
    setStatusFilter("all");
    setDraftRoleFilter("all");
    setDraftStatusFilter("all");
    setIsFilterOpen(false);
  }

  const activeFilterCount =
    (roleFilter === "all" ? 0 : 1) + (statusFilter === "all" ? 0 : 1);

  function openLockModal(user: AdminUserItem) {
    setLockTarget(user);
    setLockReason("");
    setLockUntil("");
    setLockError("");
  }

  function closeLockModal() {
    if (lockSubmitting) return;
    setLockTarget(null);
    setLockReason("");
    setLockUntil("");
    setLockError("");
  }

  async function submitLock() {
    if (!lockTarget) return;
    const trimmedReason = lockReason.trim();
    if (!trimmedReason) {
      setLockError("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    if (lockUntil) {
      const parsed = new Date(lockUntil);
      if (Number.isNaN(parsed.getTime())) {
        setLockError("Thời hạn khóa không hợp lệ.");
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        setLockError("Thời hạn khóa phải lớn hơn thời điểm hiện tại.");
        return;
      }
    }

    setLockSubmitting(true);
    setLockError("");
    try {
      const updated = await lockAdminUser(lockTarget.id, {
        reason: trimmedReason,
        lockedUntil: lockUntil ? new Date(lockUntil).toISOString() : null,
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setToast({
        title: "Đã khóa tài khoản",
        message: `Tài khoản "${updated.displayName}" đã bị khóa.`,
      });
      setLockTarget(null);
      setLockReason("");
      setLockUntil("");
    } catch (error) {
      setLockError(
        error instanceof Error && error.message
          ? error.message
          : "Không thể khóa tài khoản.",
      );
    } finally {
      setLockSubmitting(false);
    }
  }

  function openUnlockModal(user: AdminUserItem) {
    setUnlockTarget(user);
    setUnlockError("");
  }

  function closeUnlockModal() {
    if (unlockSubmitting) return;
    setUnlockTarget(null);
    setUnlockError("");
  }

  async function submitUnlock() {
    if (!unlockTarget) return;
    setUnlockSubmitting(true);
    setUnlockError("");
    try {
      const updated = await unlockAdminUser(unlockTarget.id);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setToast({
        title: "Đã mở khóa tài khoản",
        message: `Tài khoản "${updated.displayName}" có thể đăng nhập trở lại.`,
      });
      setUnlockTarget(null);
    } catch (error) {
      setUnlockError(
        error instanceof Error && error.message
          ? error.message
          : "Không thể mở khóa tài khoản.",
      );
    } finally {
      setUnlockSubmitting(false);
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
        open={toast !== null}
        title={toast?.title ?? ""}
        message={toast?.message ?? ""}
        variant="success"
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
                placeholder="Tìm tên, email, vai trò..."
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
              onClick={() => void loadUsers({ reloading: true })}
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
                setDraftRoleFilter(roleFilter);
                setDraftStatusFilter(statusFilter);
                setIsFilterOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Bộ lọc
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">{activeFilterCount}</span>
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
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Người dùng" sortKey="displayName" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Email" sortKey="email" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Vai trò" sortKey="role" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Trạng thái" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Ngày tạo" sortKey="createdAt" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Đang tải danh sách người dùng...</td></tr>
              ) : totalItems === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có người dùng phù hợp bộ lọc.</td></tr>
              ) : (
                paginatedUsers.map((user) => {
                  const locked = isCurrentlyLocked(user);
                  const isSelf = currentUserId === user.id;
                  return (
                    <tr key={user.id} className="border-t border-border/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{user.displayName}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${roleClass(user.role)}`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          title={buildLockTooltip(user)}
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                            locked
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {locked
                            ? `Đã khóa${user.lockedUntil ? ` đến ${formatDate(user.lockedUntil)}` : " (vĩnh viễn)"}`
                            : "Hoạt động"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          {locked ? (
                            <button
                              type="button"
                              onClick={() => openUnlockModal(user)}
                              className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Mở khóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => openLockModal(user)}
                              title={isSelf ? "Không thể tự khóa tài khoản của bạn" : undefined}
                              className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Khóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
          itemLabel="người dùng"
        />
      </div>

      {isFilterOpen ? (
        <AdminModalLayer>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc người dùng</h3>
            <div className="mt-4 space-y-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Vai trò</span>
                <select
                  value={draftRoleFilter}
                  onChange={(event) => setDraftRoleFilter(event.target.value as "all" | UserRole)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="admin">Admin</option>
                  <option value="reader">Độc giả</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select
                  value={draftStatusFilter}
                  onChange={(event) => setDraftStatusFilter(event.target.value as UserStatusFilter)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Hoạt động</option>
                  <option value="locked">Đã khóa</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftRoleFilter("all");
                  setDraftStatusFilter("all");
                }}
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

      {lockTarget ? (
        <AdminModalLayer>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Khóa tài khoản</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bạn sắp khóa tài khoản <span className="font-semibold text-foreground">{lockTarget.displayName}</span> ({lockTarget.email}).
            </p>
            <div className="mt-4 space-y-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Lý do khóa <span className="text-red-600">*</span></span>
                <textarea
                  value={lockReason}
                  onChange={(event) => setLockReason(event.target.value)}
                  rows={3}
                  placeholder="Vd: Vi phạm chính sách nội dung..."
                  className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Khóa tới (để trống = vĩnh viễn)</span>
                <input
                  type="datetime-local"
                  value={lockUntil}
                  onChange={(event) => setLockUntil(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              {lockError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{lockError}</p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={lockSubmitting}
                onClick={closeLockModal}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={lockSubmitting}
                onClick={() => void submitLock()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {lockSubmitting ? "Đang khóa..." : "Khóa tài khoản"}
              </button>
            </div>
          </div>
        </AdminModalLayer>
      ) : null}

      {unlockTarget ? (
        <AdminModalLayer>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Mở khóa tài khoản</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Mở khóa tài khoản <span className="font-semibold text-foreground">{unlockTarget.displayName}</span> ({unlockTarget.email})? Người dùng có thể đăng nhập trở lại ngay sau khi mở khóa.
            </p>
            {unlockTarget.lockedReason ? (
              <p className="mt-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
                Lý do khóa hiện tại: {unlockTarget.lockedReason}
              </p>
            ) : null}
            {unlockError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{unlockError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={unlockSubmitting}
                onClick={closeUnlockModal}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={unlockSubmitting}
                onClick={() => void submitUnlock()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unlockSubmitting ? "Đang mở khóa..." : "Mở khóa"}
              </button>
            </div>
          </div>
        </AdminModalLayer>
      ) : null}
    </section>
  );
}
