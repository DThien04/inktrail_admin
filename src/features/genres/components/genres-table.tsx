"use client";

import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  activateGenre,
  createGenre,
  deactivateGenre,
  getAdminGenres,
  updateGenre,
} from "@/features/genres/services/genres-service";
import type { GenreItem, GenrePayload } from "@/features/genres/types";

type GenreSortKey = "name" | "slug" | "status";
type SortDirection = "asc" | "desc";
type GenreModalMode = "create" | "edit";

type ConfirmAction = {
  kind: "toggle";
  genre: GenreItem;
  nextIsActive: boolean;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildEmptyGenreForm(): GenrePayload {
  return {
    name: "",
    slug: "",
    description: "",
    isActive: true,
  };
}

function buildEditForm(genre: GenreItem): GenrePayload {
  return {
    name: genre.name,
    slug: genre.slug,
    description: genre.description ?? "",
    isActive: genre.isActive,
  };
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function GenreTableHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: GenreSortKey;
  activeSortKey: GenreSortKey;
  direction: SortDirection;
  onSort: (sortKey: GenreSortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-fit items-center gap-1.5 text-left transition hover:text-accent ${
        isActive ? "text-foreground" : ""
      }`}
    >
      <span>{label}</span>
      <span className="flex h-4 w-3 flex-col items-center justify-center gap-0.5" aria-hidden="true">
        <span
          className={`h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent ${
            isActive && direction === "asc" ? "border-b-foreground" : "border-b-muted-foreground/45"
          }`}
        />
        <span
          className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent ${
            isActive && direction === "desc" ? "border-t-foreground" : "border-t-muted-foreground/45"
          }`}
        />
      </span>
    </button>
  );
}

export function GenresTable() {
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [modalMode, setModalMode] = useState<GenreModalMode | null>(null);
  const [activeGenre, setActiveGenre] = useState<GenreItem | null>(null);
  const [form, setForm] = useState<GenrePayload>(buildEmptyGenreForm);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<GenreSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    void loadGenres();
  }, []);

  async function loadGenres({ reloading = false }: { reloading?: boolean } = {}) {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);

    setErrorMessage("");
    try {
      const rows = await getAdminGenres();
      setGenres(rows);
    } catch (error) {
      setGenres([]);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể tải danh sách thể loại.",
      );
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }

  const activeCount = useMemo(() => genres.filter((item) => item.isActive).length, [genres]);

  const filteredAndSortedGenres = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = genres.filter((genre) => {
      if (statusFilter === "active" && !genre.isActive) return false;
      if (statusFilter === "inactive" && genre.isActive) return false;
      if (!query) return true;
      const text = [genre.name, genre.slug, genre.description ?? ""].join(" ").toLowerCase();
      return text.includes(query);
    });

    return [...filtered].sort((left, right) => {
      let result = 0;
      switch (sortKey) {
        case "slug":
          result = compareText(left.slug, right.slug);
          break;
        case "status":
          result = Number(left.isActive) - Number(right.isActive);
          break;
        case "name":
        default:
          result = compareText(left.name, right.name);
          break;
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [genres, searchText, statusFilter, sortKey, sortDirection]);

  const totalItems = filteredAndSortedGenres.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedGenres = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedGenres.slice(start, start + pageSize);
  }, [filteredAndSortedGenres, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, sortKey, sortDirection]);

  function toggleSort(nextKey: GenreSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function openCreateModal() {
    setForm(buildEmptyGenreForm());
    setActiveGenre(null);
    setModalMode("create");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditModal(genre: GenreItem) {
    setForm(buildEditForm(genre));
    setActiveGenre(genre);
    setModalMode("edit");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveModal() {
    if (!form.name.trim()) {
      setErrorMessage("Hãy nhập tên thể loại.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        ...form,
        slug: form.slug.trim() || slugify(form.name),
        isActive: modalMode === "edit" ? Boolean(activeGenre?.isActive) : true,
      };

      if (modalMode === "edit" && activeGenre) {
        await updateGenre(activeGenre.id, payload);
        setSuccessMessage("Đã cập nhật thể loại.");
      } else {
        await createGenre(payload);
        setSuccessMessage("Đã tạo thể loại mới.");
      }

      await loadGenres();
      setModalMode(null);
      setActiveGenre(null);
      setForm(buildEmptyGenreForm());
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : modalMode === "edit"
            ? "Không thể cập nhật thể loại."
            : "Không thể tạo thể loại.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (confirmAction.nextIsActive) {
        await activateGenre(confirmAction.genre.id);
      } else {
        await deactivateGenre(confirmAction.genre.id);
      }

      await loadGenres();
      setConfirmAction(null);
      setSuccessMessage(confirmAction.nextIsActive ? "Đã bật thể loại." : "Đã tắt thể loại.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật trạng thái thể loại.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function applyFilters() {
    setStatusFilter(draftStatusFilter);
    setIsFilterOpen(false);
  }

  const activeFilterCount = statusFilter === "all" ? 0 : 1;

  return (
    <section className="space-y-4">
      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng thể loại</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{genres.length}</p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{activeCount}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-[560px]">
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm thể loại, slug, mô tả..."
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
              onClick={() => void loadGenres({ reloading: true })}
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

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong"
            >
              Tạo thể loại
            </button>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold"><GenreTableHeaderButton label="Thể loại" sortKey="name" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><GenreTableHeaderButton label="Slug" sortKey="slug" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><GenreTableHeaderButton label="Trạng thái" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold">Mô tả</th>
                <th className="px-4 py-3 font-semibold text-right">Tác vụ</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Đang tải danh sách thể loại...</td>
                </tr>
              ) : totalItems === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Không có thể loại phù hợp bộ lọc.</td>
                </tr>
              ) : (
                paginatedGenres.map((genre) => (
                  <tr key={genre.id} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{genre.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{genre.id}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">/{genre.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${genre.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {genre.isActive ? "Đang hoạt động" : "Đang tắt"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{genre.description?.trim().length ? genre.description : "Chưa có mô tả."}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(genre)}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ kind: "toggle", genre, nextIsActive: !genre.isActive })}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                        >
                          {genre.isActive ? "Tắt" : "Bật"}
                        </button>
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
          itemLabel="thể loại"
        />
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc thể loại</h3>
            <div className="mt-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select
                  value={draftStatusFilter}
                  onChange={(event) => setDraftStatusFilter(event.target.value as "all" | "active" | "inactive")}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đang tắt</option>
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
        </div>
      ) : null}

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">{modalMode === "create" ? "Tạo thể loại" : "Sửa thể loại"}</h3>
              <button
                type="button"
                onClick={() => {
                  if (isSaving) return;
                  setModalMode(null);
                  setActiveGenre(null);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Tên thể loại</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => {
                      const nextName = event.target.value;
                      const shouldSyncSlug =
                        current.slug.trim().length === 0 ||
                        current.slug === slugify(current.name);

                      return {
                        ...current,
                        name: nextName,
                        slug: shouldSyncSlug ? slugify(nextName) : current.slug,
                      };
                    })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Slug</span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: slugify(event.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Mô tả</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isSaving) return;
                  setModalMode(null);
                  setActiveGenre(null);
                }}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleSaveModal()}
                disabled={isSaving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Đang lưu..." : modalMode === "create" ? "Tạo thể loại" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Xác nhận thay đổi trạng thái</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn chắc chắn muốn {confirmAction.nextIsActive ? "bật" : "tắt"} thể loại <span className="font-medium text-foreground">{confirmAction.genre.name}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isSaving}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={isSaving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
              >
                {isSaving ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
