"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAdminStories } from "@/features/stories/services/stories-service";
import type { StoryListItem, StoryStatus } from "@/features/stories/types";

const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Bản nháp",
  published: "Đang phát hành",
  archived: "Lưu trữ",
};

const FILTERS: Array<{ label: string; value: StoryStatus | "all" }> = [
  { label: "Tất cả", value: "all" },
  { label: "Bản nháp", value: "draft" },
  { label: "Đang phát hành", value: "published" },
  { label: "Lưu trữ", value: "archived" },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatReadCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function StoriesTable() {
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StoryStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  const emptyMessage = useMemo(() => {
    if (selectedFilter === "all") {
      return "Chưa có truyện nào để hiển thị.";
    }

    return "Không có truyện phù hợp với bộ lọc hiện tại.";
  }, [selectedFilter]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = filter.value === selectedFilter;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedFilter(filter.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-white text-foreground hover:bg-surface-muted"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchQuery(searchInput);
          }}
        >
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên truyện, slug hoặc tác giả"
            className="w-full min-w-[280px] rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Tìm
          </button>
        </form>
      </div>

      <div className="data-card overflow-hidden">
        <div className="grid grid-cols-[1.8fr_1.2fr_0.9fr_0.9fr_1fr_0.8fr] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-sm font-medium text-muted-foreground">
          <span>Truyện</span>
          <span>Tác giả</span>
          <span>Trạng thái</span>
          <span>Cập nhật</span>
          <span>Lượt đọc</span>
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
                className="grid grid-cols-[1.8fr_1.2fr_0.9fr_0.9fr_1fr_0.8fr] gap-4 px-5 py-4 text-sm"
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
                <span className="text-foreground">{formatDate(story.updatedAt)}</span>
                <span className="text-foreground">{formatReadCount(story.readCount)}</span>

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
