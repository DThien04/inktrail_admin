"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatStoryDate, STATUS_LABELS } from "@/features/stories/components/stories-table-shared";
import { getMyAuthorDashboard } from "@/features/stories/services/stories-service";
import type { AuthorDashboardData } from "@/features/stories/types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

const EMPTY_DASHBOARD: AuthorDashboardData = {
  summary: {
    totalStories: 0,
    publishedStories: 0,
    draftStories: 0,
    totalChapters: 0,
    totalReads: 0,
    totalLikes: 0,
    totalComments: 0,
    totalRatings: 0,
    avgRating: 0,
  },
  readTrend7d: [],
  topStories: [],
  topChapters: [],
  needsAttention: [],
};
const TOP_PREVIEW_COUNT = 3;

export function AuthorDashboardPanel() {
  const [data, setData] = useState<AuthorDashboardData>(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isTopStoriesExpanded, setIsTopStoriesExpanded] = useState(false);
  const [isTopChaptersExpanded, setIsTopChaptersExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await getMyAuthorDashboard();
        if (!isMounted) return;
        setData(response);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải dashboard tác giả.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const maxReads = useMemo(
    () =>
      data.readTrend7d.length
        ? Math.max(...data.readTrend7d.map((item) => item.reads), 1)
        : 1,
    [data.readTrend7d],
  );
  const visibleTopStories = useMemo(
    () =>
      isTopStoriesExpanded
        ? data.topStories
        : data.topStories.slice(0, TOP_PREVIEW_COUNT),
    [data.topStories, isTopStoriesExpanded],
  );
  const visibleTopChapters = useMemo(
    () =>
      isTopChaptersExpanded
        ? data.topChapters
        : data.topChapters.slice(0, TOP_PREVIEW_COUNT),
    [data.topChapters, isTopChaptersExpanded],
  );

  return (
    <div className="space-y-5">
      <section className="data-card overflow-hidden p-5">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard tác giả</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi hiệu suất truyện, chương và mức độ tương tác trong cùng một màn hình.
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng truyện</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(data.summary.totalStories)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng chương</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(data.summary.totalChapters)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Lượt đọc</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(data.summary.totalReads)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tương tác</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(data.summary.totalLikes + data.summary.totalComments)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Điểm trung bình</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {data.summary.totalRatings > 0 ? `${data.summary.avgRating.toFixed(2)} ★` : "--"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="data-card p-4">
          <h2 className="text-base font-semibold text-foreground">Xu hướng lượt đọc 7 ngày</h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          ) : data.readTrend7d.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Chưa có dữ liệu đọc gần đây.</p>
          ) : (
            <div className="mt-4 flex items-end gap-2">
              {data.readTrend7d.map((point) => {
                const shortDate = point.date.slice(5);
                const height = Math.max(12, Math.round((point.reads / maxReads) * 120));
                return (
                  <div key={point.date} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-md bg-accent/80"
                      style={{ height }}
                      title={`${shortDate}: ${point.reads} lượt đọc`}
                    />
                    <span className="text-[11px] text-muted-foreground">{shortDate}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="data-card p-4">
          <h2 className="text-base font-semibold text-foreground">Truyện cần chú ý</h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          ) : data.needsAttention.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Không có mục cần xử lý ngay.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.needsAttention.map((item) => (
                <li key={`${item.storyId}-${item.reason}`} className="rounded-lg border border-border p-3">
                  <Link href={`/stories/${item.slug}`} className="font-medium text-foreground hover:text-accent-strong">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="data-card overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[1.8fr_0.85fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr] gap-3 border-b border-border bg-surface-muted px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Top truyện</span>
          <span>Trạng thái</span>
          <span>Chương</span>
          <span>Đọc</span>
          <span>Like</span>
          <span>Rating</span>
          <span>Cập nhật</span>
        </div>
        {isLoading ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">Đang tải top truyện...</div>
        ) : data.topStories.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">Chưa có dữ liệu truyện.</div>
        ) : (
          <div className="divide-y divide-border">
            {visibleTopStories.map((story) => (
              <div
                key={story.id}
                className="grid min-w-[980px] grid-cols-[1.8fr_0.85fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr] gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link href={`/stories/${story.slug}`} className="truncate font-medium text-foreground hover:text-accent-strong">
                    {story.title}
                  </Link>
                </div>
                <span>{STATUS_LABELS[story.status]}</span>
                <span>{formatNumber(story.chapterCount)}</span>
                <span>{formatNumber(story.readCount)}</span>
                <span>{formatNumber(story.likeCount)}</span>
                <span>{story.ratingCount > 0 ? `${story.rating.toFixed(1)} ★` : "--"}</span>
                <span>{formatStoryDate(story.updatedAt)}</span>
              </div>
            ))}
            {data.topStories.length > TOP_PREVIEW_COUNT ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setIsTopStoriesExpanded((current) => !current)}
                  className="text-sm font-medium text-accent-strong hover:underline"
                >
                  {isTopStoriesExpanded ? "Thu gọn" : "... xem thêm"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="data-card overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[1.8fr_1.2fr_0.7fr_0.7fr_0.8fr_0.9fr] gap-3 border-b border-border bg-surface-muted px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Top chương theo tương tác</span>
          <span>Truyện</span>
          <span>Like</span>
          <span>Bình luận</span>
          <span>Điểm</span>
          <span>Cập nhật</span>
        </div>
        {isLoading ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">Đang tải top chương...</div>
        ) : data.topChapters.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">Chưa có dữ liệu chương.</div>
        ) : (
          <div className="divide-y divide-border">
            {visibleTopChapters.map((chapter) => (
              <div
                key={chapter.id}
                className="grid min-w-[980px] grid-cols-[1.8fr_1.2fr_0.7fr_0.7fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    Chương {chapter.chapterNumber}: {chapter.title}
                  </p>
                </div>
                <Link href={`/stories/${chapter.story.slug}`} className="truncate text-foreground hover:text-accent-strong">
                  {chapter.story.title}
                </Link>
                <span>{formatNumber(chapter.likeCount)}</span>
                <span>{formatNumber(chapter.commentCount)}</span>
                <span>{formatNumber(chapter.engagementScore)}</span>
                <span>{formatStoryDate(chapter.updatedAt)}</span>
              </div>
            ))}
            {data.topChapters.length > TOP_PREVIEW_COUNT ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setIsTopChaptersExpanded((current) => !current)}
                  className="text-sm font-medium text-accent-strong hover:underline"
                >
                  {isTopChaptersExpanded ? "Thu gọn" : "... xem thêm"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
