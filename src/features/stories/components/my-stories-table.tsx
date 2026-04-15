"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StoryCreatePanel } from "@/features/stories/components/story-create-panel";
import {
  formatStoryDate,
  formatStoryReadCount,
  STATUS_LABELS,
} from "@/features/stories/components/stories-table-shared";
import { StoriesTableToolbar } from "@/features/stories/components/stories-table-toolbar";
import {
  createStory,
  deleteStory,
  getGenres,
  getMyStories,
  updateStoryStatus,
} from "@/features/stories/services/stories-service";
import type { GenreOption, StoryListItem, StoryStatus } from "@/features/stories/types";

export function MyStoriesTable() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StoryStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [changingStatusStoryId, setChangingStatusStoryId] = useState("");
  const [statusTargetStory, setStatusTargetStory] = useState<StoryListItem | null>(null);
  const [nextStatus, setNextStatus] = useState<StoryStatus>("draft");
  const [deletingStoryId, setDeletingStoryId] = useState("");
  const [confirmDeleteStory, setConfirmDeleteStory] = useState<StoryListItem | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStories() {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const rows = await getMyStories({ status: selectedFilter });

        if (!isMounted) return;
        setStories(rows);
      } catch (error) {
        if (!isMounted) return;

        setStories([]);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách truyện của bạn.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStories();

    return () => {
      isMounted = false;
    };
  }, [selectedFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadGenres() {
      try {
        const rows = await getGenres();
        if (!isMounted) return;
        setGenres(rows);
      } catch {
        if (!isMounted) return;
        setGenres([]);
      }
    }

    loadGenres();

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshStories() {
    const rows = await getMyStories({ status: selectedFilter });
    setStories(rows);
  }

  async function handleCreateStory(payload: Parameters<typeof createStory>[0]) {
    setIsCreating(true);
    setCreateError("");
    setSuccessMessage("");

    try {
      await createStory(payload);
      await refreshStories();
      setIsCreateOpen(false);
      setCreateError("");
      setSuccessMessage("Đã tạo truyện mới.");
    } catch (error) {
      setCreateError(
        error instanceof Error && error.message
          ? error.message
          : "Không thể tạo truyện.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleChangeStoryStatus(story: StoryListItem, status: StoryStatus) {
    if (story.status === status) return;

    setChangingStatusStoryId(story.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateStoryStatus(story.id, status);
      await refreshStories();
      setSuccessMessage("Đã cập nhật trạng thái truyện.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật trạng thái truyện.",
      );
    } finally {
      setChangingStatusStoryId("");
    }
  }

  function openStatusDialog(story: StoryListItem) {
    setStatusTargetStory(story);
    setNextStatus(story.status);
  }

  async function handleConfirmStatusChange() {
    if (!statusTargetStory) return;
    await handleChangeStoryStatus(statusTargetStory, nextStatus);
    setStatusTargetStory(null);
  }

  async function handleDeleteStory() {
    if (!confirmDeleteStory) return;
    setDeletingStoryId(confirmDeleteStory.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteStory(confirmDeleteStory.id);
      await refreshStories();
      setConfirmDeleteStory(null);
      setSuccessMessage("Đã xóa truyện.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể xóa truyện.",
      );
    } finally {
      setDeletingStoryId("");
    }
  }

  const visibleStories = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return stories;

    return stories.filter((story) => {
      const title = story.title.toLowerCase();
      const slug = story.slug.toLowerCase();
      const description = (story.description ?? "").toLowerCase();
      return (
        title.includes(keyword) ||
        slug.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [stories, searchQuery]);

  const emptyMessage = useMemo(() => {
    if (searchQuery.trim()) {
      return "Không tìm thấy truyện phù hợp với từ khóa.";
    }
    if (selectedFilter === "all") {
      return "Bạn chưa có truyện nào.";
    }
    return "Không có truyện phù hợp với bộ lọc hiện tại.";
  }, [searchQuery, selectedFilter]);

  const summary = useMemo(() => {
    const total = visibleStories.length;
    const published = visibleStories.filter(
      (story) => story.status === "published",
    ).length;
    const totalReads = visibleStories.reduce((sum, story) => sum + story.readCount, 0);

    return { total, published, totalReads };
  }, [visibleStories]);

  return (
    <section className="space-y-4">
      <StoriesTableToolbar
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSubmitSearch={() => setSearchQuery(searchInput)}
        searchPlaceholder="Tìm theo tên truyện, slug..."
        searchInputClassName="min-w-[260px]"
        isCreateOpen={isCreateOpen}
        onToggleCreate={() => {
          setIsCreateOpen((current) => !current);
          setCreateError("");
          setSuccessMessage("");
        }}
      />

      {isCreateOpen ? (
        <StoryCreatePanel
          isCreating={isCreating}
          submitError={createError}
          genres={genres}
          onCreate={handleCreateStory}
          onClose={() => {
            setIsCreateOpen(false);
            setCreateError("");
          }}
        />
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Tổng truyện
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{summary.total}</p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Đang phát hành
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary.published}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Tổng lượt đọc
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatStoryReadCount(summary.totalReads)}
          </p>
        </div>
      </section>

      <section className="data-card overflow-x-auto">
        <div className="grid min-w-[1040px] grid-cols-[1.5fr_0.8fr_0.8fr_0.7fr_0.7fr_2fr] gap-3 border-b border-border bg-surface-muted px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Truyện</span>
          <span>Trạng thái</span>
          <span>Cập nhật</span>
          <span>Lượt đọc</span>
          <span>Đánh giá</span>
          <span>Tác vụ</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            Đang tải dữ liệu truyện...
          </div>
        ) : errorMessage ? (
          <div className="px-5 py-10 text-sm text-accent-strong">{errorMessage}</div>
        ) : visibleStories.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleStories.map((story) => (
              <div
                key={story.id}
                className="grid min-w-[1040px] grid-cols-[1.5fr_0.8fr_0.8fr_0.7fr_0.7fr_2fr] gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{story.title}</p>
                  <p className="mt-1 truncate text-muted-foreground">/{story.slug}</p>
                </div>
                <span className="inline-flex h-fit w-fit rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground">
                  {STATUS_LABELS[story.status]}
                </span>
                <span className="text-foreground">{formatStoryDate(story.updatedAt)}</span>
                <span className="text-foreground">
                  {formatStoryReadCount(story.readCount)}
                </span>
                <span className="text-foreground">
                  {story.ratingCount > 0 ? `${story.rating.toFixed(1)} ★` : "--"}
                </span>
                <div className="flex flex-nowrap items-center gap-1 overflow-x-auto">
                  <Link
                    href={`/stories/${story.slug}`}
                    className="inline-flex whitespace-nowrap rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
                  >
                    Xem chi tiết
                  </Link>
                  <Link
                    href={`/chapters?storyId=${story.id}`}
                    className="inline-flex whitespace-nowrap rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
                  >
                    Chương
                  </Link>
                  <button
                    type="button"
                    onClick={() => openStatusDialog(story)}
                    className="inline-flex whitespace-nowrap rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
                  >
                    Đổi trạng thái
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStory(story)}
                    className="inline-flex whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmDeleteStory ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Xóa truyện</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn chắc chắn muốn xóa truyện <b>{confirmDeleteStory.title}</b>? Hành động
              này không thể hoàn tác.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteStory(null)}
                disabled={deletingStoryId === confirmDeleteStory.id}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteStory}
                disabled={deletingStoryId === confirmDeleteStory.id}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingStoryId === confirmDeleteStory.id ? "Đang xóa..." : "Xóa truyện"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusTargetStory ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Đổi trạng thái truyện</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Chọn trạng thái mới cho truyện <b>{statusTargetStory.title}</b>.
            </p>

            <div className="mt-3">
              <select
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value as StoryStatus)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đang phát hành</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusTargetStory(null)}
                disabled={changingStatusStoryId === statusTargetStory.id}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={changingStatusStoryId === statusTargetStory.id}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {changingStatusStoryId === statusTargetStory.id
                  ? "Đang cập nhật..."
                  : "Lưu trạng thái"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

