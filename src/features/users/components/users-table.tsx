"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { getAdminUsers } from "@/features/users/services/users-service";
import type { AdminUserItem, UserRole } from "@/features/users/types";

type UserSortKey = "displayName" | "email" | "role" | "createdAt";
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

function roleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "author") return "Tác giả";
  return "Độc giả";
}

function roleClass(role: UserRole) {
  if (role === "admin") return "border-red-200 bg-red-50 text-red-700";
  if (role === "author") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
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

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [draftRoleFilter, setDraftRoleFilter] = useState<"all" | UserRole>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<UserSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers({ reloading = false }: { reloading?: boolean } = {}) {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);

    setErrorMessage("");
    try {
      const rows = await getAdminUsers({ role: "all" });
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
        case "createdAt":
        default:
          result = compareDates(left.createdAt, right.createdAt);
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [users, searchText, roleFilter, sortKey, sortDirection]);

  const totalItems = filteredAndSortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, roleFilter, sortKey, sortDirection]);

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
    setIsFilterOpen(false);
  }

  const activeFilterCount = roleFilter === "all" ? 0 : 1;

  return (
    <section className="space-y-4">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
          <div className="flex flex-wrap items-center gap-2">
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
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Người dùng" sortKey="displayName" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Email" sortKey="email" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Vai trò" sortKey="role" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><UserTableHeaderButton label="Ngày tạo" sortKey="createdAt" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Đang tải danh sách người dùng...</td></tr>
              ) : totalItems === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Không có người dùng phù hợp bộ lọc.</td></tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{user.displayName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{user.id}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${roleClass(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
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
          itemLabel="người dùng"
        />
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc người dùng</h3>
            <div className="mt-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Vai trò</span>
                <select
                  value={draftRoleFilter}
                  onChange={(event) => setDraftRoleFilter(event.target.value as "all" | UserRole)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="admin">Admin</option>
                  <option value="author">Tác giả</option>
                  <option value="reader">Độc giả</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraftRoleFilter("all")}
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
        </div>
      ) : null}
    </section>
  );
}

