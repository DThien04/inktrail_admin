"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  createChapter,
  deleteChapter,
  getChaptersByStory,
  moveChapter,
  publishChapter,
  unpublishChapter,
  updateChapter,
} from "@/features/chapters/services/chapters-service";
import type {
  ChapterListItem,
  ChapterStatus,
  CreateChapterPayload,
  UpdateChapterPayload,
} from "@/features/chapters/types";
import { getStoredUser } from "@/features/auth/storage";
import { getAdminStories, getMyStories } from "@/features/stories/services/stories-service";
import type { StoryListItem } from "@/features/stories/types";

type ChapterSortKey = "chapterNumber" | "title" | "status" | "updatedAt" | "publishedAt";
type SortDirection = "asc" | "desc";
type ChapterModalMode = "detail" | "edit" | "create";

type ConfirmAction =
  | { kind: "delete"; chapter: ChapterListItem }
  | { kind: "move"; chapter: ChapterListItem; direction: "up" | "down" }
  | { kind: "publish"; chapter: ChapterListItem; nextStatus: ChapterStatus };

function formatDate(value: string | null) {
  if (!value) return "Chưa xuất bản";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: ChapterStatus) {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function statusClass(status: ChapterStatus) {
  return status === "published"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function moderationStatusLabel(status: ChapterListItem["moderationStatus"]) {
  if (!status) return "Chưa quét";
  if (status === "pending") return "Đang quét";
  if (status === "approved") return "Đạt";
  if (status === "rejected") return "Cần sửa";
  return "Lỗi AI";
}

function moderationStatusClass(status: ChapterListItem["moderationStatus"]) {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function compareDates(left: string | null, right: string | null) {
  return new Date(left || 0).getTime() - new Date(right || 0).getTime();
}

function createChapterForm(chapter: ChapterListItem): UpdateChapterPayload {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    content: chapter.content,
  };
}

function createEmptyChapterForm(nextChapterNumber: number): CreateChapterPayload {
  return {
    chapterNumber: nextChapterNumber,
    title: "",
    content: "",
  };
}

function buildChapterSearchText(chapter: ChapterListItem) {
  return [
    chapter.chapterNumber,
    chapter.title,
    chapter.content.slice(0, 500),
    chapter.status,
  ]
    .join(" ")
    .toLowerCase();
}

function ChapterTableHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: ChapterSortKey;
  activeSortKey: ChapterSortKey;
  direction: SortDirection;
  onSort: (sortKey: ChapterSortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-fit items-center gap-1.5 text-left transition hover:text-accent ${
        isActive ? "text-foreground" : ""
      }`}
      aria-label={`Sắp xếp theo ${label}`}
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

export function ChaptersManager() {
  const searchParams = useSearchParams();
  const preferredStoryId = searchParams.get("storyId") || "";

  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChapterStatus>("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | ChapterStatus>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<ChapterSortKey>("chapterNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeModalMode, setActiveModalMode] = useState<ChapterModalMode | null>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterListItem | null>(null);
  const [chapterForm, setChapterForm] = useState<UpdateChapterPayload | CreateChapterPayload | null>(null);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStories() {
      setIsLoadingStories(true);
      setErrorMessage("");

      try {
        const currentUser = getStoredUser();
        const response =
          currentUser?.role === "admin"
            ? await getAdminStories({ status: "all" })
            : await getMyStories({ status: "all" });
        if (!isMounted) return;

        setStories(response);
        const initialStoryId =
          preferredStoryId && response.some((story) => story.id === preferredStoryId)
            ? preferredStoryId
            : response[0]?.id || "";
        setSelectedStoryId(initialStoryId);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách truyện.",
        );
      } finally {
        if (isMounted) setIsLoadingStories(false);
      }
    }

    loadStories();

    return () => {
      isMounted = false;
    };
  }, [preferredStoryId]);

  async function refreshChapters(storyId: string, { reloading = false }: { reloading?: boolean } = {}) {
    if (!storyId) {
      setChapters([]);
      return;
    }
    if (reloading) setIsReloading(true);
    try {
      const response = await getChaptersByStory(storyId);
      setChapters(response);
    } finally {
      if (reloading) setIsReloading(false);
    }
  }

  useEffect(() => {
    if (!selectedStoryId) {
      setChapters([]);
      return;
    }

    let isMounted = true;
    async function loadChapters() {
      setIsLoadingChapters(true);
      setErrorMessage("");

      try {
        const response = await getChaptersByStory(selectedStoryId);
        if (!isMounted) return;
        setChapters(response);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách chương.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingChapters(false);
          setIsReloading(false);
        }
      }
    }

    loadChapters();

    return () => {
      isMounted = false;
    };
  }, [selectedStoryId]);

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [stories, selectedStoryId],
  );

  const nextChapterNumber = useMemo(() => {
    if (chapters.length === 0) return 1;
    return chapters.reduce((max, current) => (current.chapterNumber > max ? current.chapterNumber : max), 0) + 1;
  }, [chapters]);

  const filteredAndSortedChapters = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = chapters.filter((chapter) => {
      if (statusFilter !== "all" && chapter.status !== statusFilter) return false;
      if (!query) return true;
      return buildChapterSearchText(chapter).includes(query);
    });

    const sorted = [...filtered].sort((left, right) => {
      let result = 0;
      switch (sortKey) {
        case "chapterNumber":
          result = left.chapterNumber - right.chapterNumber;
          break;
        case "title":
          result = compareText(left.title, right.title);
          break;
        case "status":
          result = compareText(left.status, right.status);
          break;
        case "publishedAt":
          result = compareDates(left.publishedAt, right.publishedAt);
          break;
        case "updatedAt":
        default:
          result = compareDates(left.updatedAt, right.updatedAt);
          break;
      }
      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [chapters, searchText, statusFilter, sortKey, sortDirection]);

  const totalItems = filteredAndSortedChapters.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedChapters = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedChapters.slice(start, start + pageSize);
  }, [filteredAndSortedChapters, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter, sortKey, sortDirection, selectedStoryId]);

  function openCreateModal() {
    setActiveChapter(null);
    setChapterForm(createEmptyChapterForm(nextChapterNumber));
    setActiveModalMode("create");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openDetailModal(chapter: ChapterListItem) {
    setActiveChapter(chapter);
    setActiveModalMode("detail");
  }

  function openEditModal(chapter: ChapterListItem) {
    setActiveChapter(chapter);
    setChapterForm(createChapterForm(chapter));
    setActiveModalMode("edit");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeMainModal() {
    if (isSavingChapter) return;
    setActiveModalMode(null);
    setActiveChapter(null);
    setChapterForm(null);
  }

  function openConfirmDelete(chapter: ChapterListItem) {
    setConfirmAction({ kind: "delete", chapter });
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openConfirmMove(chapter: ChapterListItem, direction: "up" | "down") {
    setConfirmAction({ kind: "move", chapter, direction });
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openConfirmPublish(chapter: ChapterListItem, nextStatus: ChapterStatus) {
    setConfirmAction({ kind: "publish", chapter, nextStatus });
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveModal() {
    if (!selectedStoryId || !chapterForm) return;
    setIsSavingChapter(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (activeModalMode === "create") {
        await createChapter(selectedStoryId, chapterForm as CreateChapterPayload);
        setSuccessMessage("Đã tạo chương mới.");
      } else if (activeModalMode === "edit" && activeChapter) {
        await updateChapter(activeChapter.id, chapterForm as UpdateChapterPayload);
        setSuccessMessage("Đã cập nhật chương.");
      }

      await refreshChapters(selectedStoryId);
      closeMainModal();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : activeModalMode === "create"
            ? "Không thể tạo chương."
            : "Không thể cập nhật chương.",
      );
    } finally {
      setIsSavingChapter(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction || !selectedStoryId) return;
    setIsConfirmingAction(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (confirmAction.kind === "delete") {
        await deleteChapter(confirmAction.chapter.id);
        setSuccessMessage("Đã xóa chương.");
      } else if (confirmAction.kind === "move") {
        await moveChapter(confirmAction.chapter.id, confirmAction.direction);
        setSuccessMessage("Đã đổi vị trí chương.");
      } else {
        if (confirmAction.nextStatus === "published") {
          await publishChapter(confirmAction.chapter.id);
        } else {
          await unpublishChapter(confirmAction.chapter.id);
        }
        setSuccessMessage(
          confirmAction.nextStatus === "published"
            ? "Đã gửi xuất bản chương. AI sẽ kiểm tra khi xuất bản."
            : "Đã thu hồi chương về bản nháp.",
        );
      }
      await refreshChapters(selectedStoryId);
      setConfirmAction(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể thực hiện thao tác.",
      );
    } finally {
      setIsConfirmingAction(false);
    }
  }

  function toggleSort(nextKey: ChapterSortKey) {
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
    setDraftStatusFilter("all");
  }

  const activeFilterCount = statusFilter === "all" ? 0 : 1;

  return (
    <section className="space-y-5">
      <div className="data-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Chọn truyện</span>
            <select
              value={selectedStoryId}
              onChange={(event) => setSelectedStoryId(event.target.value)}
              disabled={isLoadingStories || stories.length === 0}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
            >
              {stories.length === 0 ? (
                <option value="">Chưa có truyện</option>
              ) : (
                stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slug</p>
            <p className="mt-1 text-sm font-medium text-foreground">{selectedStory?.slug || "--"}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trạng thái truyện</p>
            <p className="mt-1 text-sm font-medium text-foreground">{selectedStory?.status || "--"}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tổng chương</p>
            <p className="mt-1 text-sm font-medium text-foreground">{chapters.length}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Danh sách chương</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi chương theo truyện, lọc trạng thái và thao tác nhanh bằng modal.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-[560px]">
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm chương, tiêu đề, nội dung..."
              className="w-full rounded-xl border border-border bg-white px-4 py-2 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent"
            />
            {searchText.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isReloading || !selectedStoryId}
              onClick={() => void refreshChapters(selectedStoryId, { reloading: true })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Tải lại danh sách chương"
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
                aria-hidden="true"
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
              onClick={openCreateModal}
              disabled={!selectedStoryId || isLoadingChapters}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              Tạo chương
            </button>
          </div>
        </div>
      </section>

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

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  <ChapterTableHeaderButton
                    label="Chương"
                    sortKey="chapterNumber"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <ChapterTableHeaderButton
                    label="Trạng thái"
                    sortKey="status"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">AI kiểm duyệt</th>
                <th className="px-4 py-3 font-semibold">
                  <ChapterTableHeaderButton
                    label="Xuất bản"
                    sortKey="publishedAt"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">
                  <ChapterTableHeaderButton
                    label="Cập nhật"
                    sortKey="updatedAt"
                    activeSortKey={sortKey}
                    direction={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingStories || isLoadingChapters ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Đang tải danh sách chương...</td>
                </tr>
              ) : !selectedStoryId ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Chọn một truyện để bắt đầu.</td>
                </tr>
              ) : totalItems === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có chương phù hợp bộ lọc.</td>
                </tr>
              ) : (
                paginatedChapters.map((chapter) => {
                  const chapterIndex = filteredAndSortedChapters.findIndex((item) => item.id === chapter.id);
                  const canMoveUp = chapterIndex > 0;
                  const canMoveDown = chapterIndex < filteredAndSortedChapters.length - 1;

                  return (
                    <tr key={chapter.id} className="border-t border-border/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">Chương {chapter.chapterNumber}</p>
                        <p className="mt-0.5 text-muted-foreground">{chapter.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusClass(chapter.status)}`}>
                          {statusLabel(chapter.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          title={chapter.moderationReason ?? undefined}
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${moderationStatusClass(chapter.moderationStatus)}`}
                        >
                          {moderationStatusLabel(chapter.moderationStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(chapter.publishedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(chapter.updatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetailModal(chapter)}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(chapter)}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                          >
                            Sửa
                          </button>
                          {chapter.status === "draft" ? (
                            <button
                              type="button"
                              onClick={() => openConfirmPublish(chapter, "published")}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              Xuất bản
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openConfirmPublish(chapter, "draft")}
                              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                            >
                              Thu hồi
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openConfirmMove(chapter, "up")}
                            disabled={!canMoveUp}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirmMove(chapter, "down")}
                            disabled={!canMoveDown}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirmDelete(chapter)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          >
                            Xóa
                          </button>
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
          itemLabel="chương"
        />
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc chương</h3>
            <p className="mt-1 text-sm text-muted-foreground">Lọc danh sách theo trạng thái hiển thị.</p>
            <div className="mt-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select
                  value={draftStatusFilter}
                  onChange={(event) => setDraftStatusFilter(event.target.value as "all" | ChapterStatus)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
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

      {activeModalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {activeModalMode === "create"
                    ? "Tạo chương mới"
                    : activeModalMode === "edit"
                      ? `Sửa chương ${activeChapter?.chapterNumber ?? ""}`
                      : `Chi tiết chương ${activeChapter?.chapterNumber ?? ""}`}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedStory?.title || "--"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMainModal}
                disabled={isSavingChapter}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Đóng
              </button>
            </div>

            {activeModalMode === "detail" && activeChapter ? (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Số chương</p>
                    <p className="mt-1 font-semibold text-foreground">{activeChapter.chapterNumber}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Trạng thái</p>
                    <p className="mt-1 font-semibold text-foreground">{statusLabel(activeChapter.status)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Xuất bản</p>
                    <p className="mt-1 font-semibold text-foreground">{formatDate(activeChapter.publishedAt)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tiêu đề</p>
                  <p className="mt-1 font-semibold text-foreground">{activeChapter.title}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Nội dung</p>
                  <p className="mt-2 whitespace-pre-wrap leading-6 text-foreground">{activeChapter.content}</p>
                </div>
              </div>
            ) : chapterForm ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-foreground">Số chương</span>
                    <input
                      type="number"
                      min={1}
                      value={chapterForm.chapterNumber}
                      onChange={(event) =>
                        setChapterForm((current) =>
                          current
                            ? { ...current, chapterNumber: Number(event.target.value) }
                            : current,
                        )
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-foreground">Tiêu đề</span>
                    <input
                      type="text"
                      value={chapterForm.title}
                      onChange={(event) =>
                        setChapterForm((current) =>
                          current ? { ...current, title: event.target.value } : current,
                        )
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>

                </div>

                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Nội dung</span>
                  <textarea
                    value={chapterForm.content}
                    onChange={(event) =>
                      setChapterForm((current) =>
                        current ? { ...current, content: event.target.value } : current,
                      )
                    }
                    rows={12}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeMainModal}
                    disabled={isSavingChapter}
                    className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveModal()}
                    disabled={isSavingChapter}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingChapter ? "Đang lưu..." : activeModalMode === "create" ? "Tạo chương" : "Lưu thay đổi"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              {confirmAction.kind === "delete"
                ? "Xóa chương"
                : confirmAction.kind === "move"
                  ? "Đổi vị trí chương"
                  : confirmAction.nextStatus === "published"
                    ? "Xuất bản chương"
                    : "Thu hồi về nháp"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction.kind === "delete"
                ? `Bạn có chắc muốn xóa chương ${confirmAction.chapter.chapterNumber} - ${confirmAction.chapter.title}? Hành động này không thể hoàn tác.`
                : confirmAction.kind === "move"
                  ? `Bạn có chắc muốn di chuyển chương ${confirmAction.chapter.chapterNumber} ${confirmAction.direction === "up" ? "lên trên" : "xuống dưới"}?`
                  : confirmAction.nextStatus === "published"
                    ? `Bạn có chắc muốn xuất bản chương ${confirmAction.chapter.chapterNumber}? AI sẽ tự kiểm tra khi xuất bản.`
                    : `Bạn có chắc muốn thu hồi chương ${confirmAction.chapter.chapterNumber} về bản nháp?`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isConfirmingAction}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={isConfirmingAction}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConfirmingAction ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
