"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  getAdminStories,
  getGenres,
} from "@/features/stories/services/stories-service";
import type { GenreOption, StoryListItem, StoryStatus } from "@/features/stories/types";

export function StoriesTable() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StoryStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStories() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const rows = await getAdminStories({
          status: selectedFilter,
          query: searchQuery,
        });

        if (!isMounted) return;
        setStories(rows);
      } catch (error) {
        if (!isMounted) return;

        setStories([]);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách truyện.",
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
  }, [selectedFilter, searchQuery]);

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

  const emptyMessage = useMemo(() => {
    if (selectedFilter === "all") {
      return "Chưa có truyện nào để hiển thị.";
    }

    return "Không có truyện phù hợp với bộ lọc hiện tại.";
  }, [selectedFilter]);

  async function refreshStories() {
    const rows = await getAdminStories({
      status: selectedFilter,
      query: searchQuery,
    });
    setStories(rows);
  }

  async function handleCreateStory(payload: Parameters<typeof createStory>[0]) {
    setIsCreating(true);
    setCreateError("");

    try {
      const createdStory = await createStory(payload);
      await refreshStories();
      setIsCreateOpen(false);
      setCreateError("");
      router.push(`/stories/${createdStory.slug}`);
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

  return (
    <section className="space-y-4">
      <StoriesTableToolbar
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSubmitSearch={() => setSearchQuery(searchInput)}
        searchPlaceholder="Tìm theo tên truyện, slug hoặc tác giả"
        isCreateOpen={isCreateOpen}
        onToggleCreate={() => {
          setIsCreateOpen((current) => !current);
          setCreateError("");
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

      <div className="data-card overflow-hidden">
        <div className="grid grid-cols-[1.7fr_1.1fr_0.85fr_0.85fr_0.75fr_0.85fr_0.8fr] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-sm font-medium text-muted-foreground">
          <span>Truyện</span>
          <span>Tác giả</span>
          <span>Trạng thái</span>
          <span>Cập nhật</span>
          <span>Lượt đọc</span>
          <span>Đánh giá</span>
          <span>Thao tác</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            Đang tải danh sách truyện...
          </div>
        ) : errorMessage ? (
          <div className="px-5 py-10 text-sm text-accent-strong">{errorMessage}</div>
        ) : stories.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-border">
            {stories.map((story) => (
              <div
                key={story.id}
                className="grid grid-cols-[1.7fr_1.1fr_0.85fr_0.85fr_0.75fr_0.85fr_0.8fr] gap-4 px-5 py-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{story.title}</p>
                  <p className="mt-1 truncate text-muted-foreground">/{story.slug}</p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-foreground">
                    {story.author?.displayName || "--"}
                  </p>
                  <p className="mt-1 truncate text-muted-foreground">
                    {story.author?.email || ""}
                  </p>
                </div>

                <span className="text-foreground">{STATUS_LABELS[story.status]}</span>
                <span className="text-foreground">{formatStoryDate(story.updatedAt)}</span>
                <span className="text-foreground">
                  {formatStoryReadCount(story.readCount)}
                </span>
                <span className="text-foreground">
                  {story.ratingCount > 0 ? `${story.rating.toFixed(1)} ★` : "--"}
                </span>

                <Link
                  href={`/stories/${story.slug}`}
                  className="justify-self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                >
                  Xem chi tiết
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

