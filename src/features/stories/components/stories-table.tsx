"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import { StoryCreatePanel } from "@/features/stories/components/story-create-panel";
import {
  formatStoryDate,
  formatStoryReadCount,
  moderationStatusClass,
  moderationStatusLabel,
  STATUS_LABELS,
} from "@/features/stories/components/stories-table-shared";
import {
  createStory,
  getAdminStories,
  getGenres,
  getStoryDetail,
  updateStory,
} from "@/features/stories/services/stories-service";
import type { GenreOption, StoryListItem, StoryStatus, UpdateStoryPayload } from "@/features/stories/types";

type StorySortKey = "title" | "status" | "updatedAt" | "readCount" | "rating";
type SortDirection = "asc" | "desc";
type StoryModalMode = "create" | "detail" | "edit";

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function compareDates(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

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

function buildEditFormFromStory(story: Awaited<ReturnType<typeof getStoryDetail>>): UpdateStoryPayload {
  return {
    title: story.title,
    slug: story.slug,
    description: story.description || "",
    coverFile: null,
    genreIds: story.genres.map((item) => item.id),
    tagNames: story.tags.map((item) => item.name),
  };
}

function buildStorySearchText(story: StoryListItem) {
  return [
    story.title,
    story.slug,
    story.description ?? "",
    story.author?.displayName ?? "",
    story.author?.email ?? "",
    STATUS_LABELS[story.status],
  ]
    .join(" ")
    .toLowerCase();
}

function StoryTableHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: StorySortKey;
  activeSortKey: StorySortKey;
  direction: SortDirection;
  onSort: (sortKey: StorySortKey) => void;
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
        <span className={`h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent ${isActive && direction === "asc" ? "border-b-foreground" : "border-b-muted-foreground/45"}`} />
        <span className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent ${isActive && direction === "desc" ? "border-t-foreground" : "border-t-muted-foreground/45"}`} />
      </span>
    </button>
  );
}

export function StoriesTable() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [modalMode, setModalMode] = useState<StoryModalMode | null>(null);
  const [activeStory, setActiveStory] = useState<StoryListItem | null>(null);
  const [editForm, setEditForm] = useState<UpdateStoryPayload | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StoryStatus>("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | StoryStatus>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<StorySortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [storyRows, genreRows] = await Promise.all([
          getAdminStories({ status: "all" }),
          getGenres(),
        ]);
        if (!isMounted) return;
        setStories(storyRows);
        setGenres(genreRows);
      } catch (error) {
        if (!isMounted) return;
        setStories([]);
        setErrorMessage(error instanceof Error ? error.message : "Không thể tải danh sách truyện.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshStories({ reloading = false }: { reloading?: boolean } = {}) {
    if (reloading) setIsReloading(true);
    try {
      const rows = await getAdminStories({ status: "all" });
      setStories(rows);
    } finally {
      if (reloading) setIsReloading(false);
    }
  }

  async function handleCreateStory(payload: Parameters<typeof createStory>[0]) {
    setIsCreating(true);
    setCreateError("");
    setSuccessMessage("");
    try {
      const created = await createStory(payload);
      await refreshStories();
      setModalMode(null);
      setSuccessMessage("Đã tạo truyện mới.");
      router.push(`/stories/${created.slug}`);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Không thể tạo truyện.");
    } finally {
      setIsCreating(false);
    }
  }

  async function openEditModal(story: StoryListItem) {
    setIsSavingEdit(true);
    setErrorMessage("");
    try {
      const detail = await getStoryDetail(story.slug);
      setEditForm(buildEditFormFromStory(detail));
      setActiveStory(story);
      setModalMode("edit");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu sửa.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleSaveEdit() {
    if (!activeStory || !editForm) return;
    setIsSavingEdit(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateStory(activeStory.id, editForm);
      await refreshStories();
      setModalMode(null);
      setActiveStory(null);
      setEditForm(null);
      setSuccessMessage("Đã cập nhật truyện.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể cập nhật truyện.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  const filteredAndSortedStories = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = stories.filter((story) => {
      if (statusFilter !== "all" && story.status !== statusFilter) return false;
      if (!query) return true;
      return buildStorySearchText(story).includes(query);
    });
    return [...filtered].sort((left, right) => {
      let result = 0;
      switch (sortKey) {
        case "title":
          result = compareText(left.title, right.title);
          break;
        case "status":
          result = compareText(left.status, right.status);
          break;
        case "readCount":
          result = left.readCount - right.readCount;
          break;
        case "rating":
          result = left.rating - right.rating;
          break;
        case "updatedAt":
        default:
          result = compareDates(left.updatedAt, right.updatedAt);
          break;
      }
      return sortDirection === "asc" ? result : -result;
    });
  }, [stories, searchText, statusFilter, sortKey, sortDirection]);

  const summary = useMemo(() => {
    const total = filteredAndSortedStories.length;
    const published = filteredAndSortedStories.filter((item) => item.status === "published").length;
    const totalReads = filteredAndSortedStories.reduce((sum, item) => sum + item.readCount, 0);
    return { total, published, totalReads };
  }, [filteredAndSortedStories]);

  const totalItems = filteredAndSortedStories.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedStories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedStories.slice(start, start + pageSize);
  }, [filteredAndSortedStories, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, sortKey, sortDirection]);

  function toggleSort(nextKey: StorySortKey) {
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

  const activeFilterCount = statusFilter === "all" ? 0 : 1;

  return (
    <section className="space-y-4">
      {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
      {errorMessage ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng truyện</p><p className="mt-2 text-2xl font-semibold text-foreground">{summary.total}</p></div>
        <div className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Đang phát hành</p><p className="mt-2 text-2xl font-semibold text-foreground">{summary.published}</p></div>
        <div className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng lượt đọc</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatStoryReadCount(summary.totalReads)}</p></div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-[560px]">
            <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Tìm truyện, tác giả, slug..." className="w-full rounded-xl border border-border bg-white px-4 py-2 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent" />
            {searchText.trim().length > 0 ? <button type="button" onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground">×</button> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={isReloading || isLoading} onClick={() => void refreshStories({ reloading: true })} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60">
              <svg viewBox="0 0 24 24" className={`h-5 w-5 ${isReloading ? "animate-[spin_0.55s_linear_infinite]" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
            </button>
            <button type="button" onClick={() => { setDraftStatusFilter(statusFilter); setIsFilterOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted">Bộ lọc <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">{activeFilterCount}</span></button>
            <button type="button" onClick={() => { setCreateError(""); setModalMode("create"); }} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong">Tạo truyện</button>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold"><StoryTableHeaderButton label="Truyện" sortKey="title" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold">Tác giả</th>
                <th className="px-4 py-3 font-semibold"><StoryTableHeaderButton label="Trạng thái" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold">AI kiểm duyệt</th>
                <th className="px-4 py-3 font-semibold"><StoryTableHeaderButton label="Cập nhật" sortKey="updatedAt" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><StoryTableHeaderButton label="Lượt đọc" sortKey="readCount" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold"><StoryTableHeaderButton label="Đánh giá" sortKey="rating" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Đang tải danh sách truyện...</td></tr>
              ) : totalItems === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Không có truyện phù hợp bộ lọc.</td></tr>
              ) : (
                paginatedStories.map((story) => (
                  <tr key={story.id} className="border-t border-border/70">
                    <td className="px-4 py-3"><p className="font-semibold text-foreground">{story.title}</p><p className="mt-0.5 text-muted-foreground">/{story.slug}</p></td>
                    <td className="px-4 py-3"><p className="text-foreground">{story.author?.displayName || "--"}</p><p className="text-xs text-muted-foreground">{story.author?.email || ""}</p></td>
                    <td className="px-4 py-3 text-foreground">{STATUS_LABELS[story.status]}</td>
                    <td className="px-4 py-3">
                      <span
                        title={story.moderationReason ?? undefined}
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${moderationStatusClass(story.moderationStatus)}`}
                      >
                        {moderationStatusLabel(story.moderationStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatStoryDate(story.updatedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatStoryReadCount(story.readCount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{story.ratingCount > 0 ? `${story.rating.toFixed(1)} sao` : "--"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setActiveStory(story); setModalMode("detail"); }} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted">Chi tiết</button>
                        <button type="button" onClick={() => void openEditModal(story)} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted">Sửa</button>
                        <Link href={`/chapters?storyId=${story.id}`} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted">Chương</Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} pageSize={pageSize} totalItems={totalItems} pageSizeOptions={[10, 20, 50]} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} itemLabel="truyện" />
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc truyện</h3>
            <div className="mt-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select value={draftStatusFilter} onChange={(event) => setDraftStatusFilter(event.target.value as "all" | StoryStatus)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent">
                  <option value="all">Tất cả</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đang phát hành</option>
                  
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDraftStatusFilter("all")} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted">Xóa lọc</button>
              <button type="button" onClick={() => setIsFilterOpen(false)} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted">Hủy</button>
              <button type="button" onClick={applyFilters} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong">Áp dụng</button>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "create" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto">
            <StoryCreatePanel isCreating={isCreating} submitError={createError} genres={genres} onCreate={handleCreateStory} onClose={() => { setModalMode(null); setCreateError(""); }} />
          </div>
        </div>
      ) : null}

      {modalMode === "detail" && activeStory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Chi tiết truyện</h3>
              <button type="button" onClick={() => { setModalMode(null); setActiveStory(null); }} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted">Đóng</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Ten truyện</p><p className="mt-1 font-semibold text-foreground">{activeStory.title}</p></div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Slug</p><p className="mt-1 font-semibold text-foreground">/{activeStory.slug}</p></div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trạng thái</p><p className="mt-1 font-semibold text-foreground">{STATUS_LABELS[activeStory.status]}</p></div>
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Cập nhật</p><p className="mt-1 font-semibold text-foreground">{formatStoryDate(activeStory.updatedAt)}</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-surface-muted px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mô tả</p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{activeStory.description || "Chua co mo ta."}</p>
            </div>
          </div>
        </div>
      ) : null}

      {modalMode === "edit" && activeStory && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-4xl rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-foreground">Sửa truyện</h3>
              <button type="button" disabled={isSavingEdit} onClick={() => { setModalMode(null); setActiveStory(null); setEditForm(null); }} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60">Đóng</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="font-medium text-foreground">Ten truyện</span>
                <input value={editForm.title} onChange={(event) => setEditForm((current) => current ? { ...current, title: event.target.value, slug: current.slug.trim().length === 0 || current.slug === slugify(current.title) ? slugify(event.target.value) : current.slug } : current)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Slug</span>
                <input value={editForm.slug} onChange={(event) => setEditForm((current) => current ? { ...current, slug: slugify(event.target.value) } : current)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
              </label>
              <div className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-muted-foreground">Không sửa trạng thái trong form này.</div>
              </div>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="font-medium text-foreground">Mô tả</span>
                <textarea rows={6} value={editForm.description} onChange={(event) => setEditForm((current) => current ? { ...current, description: event.target.value } : current)} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={isSavingEdit} onClick={() => { setModalMode(null); setActiveStory(null); setEditForm(null); }} className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60">Hủy</button>
              <button type="button" onClick={() => void handleSaveEdit()} disabled={isSavingEdit} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60">
                {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}



