"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatStoryDate, STATUS_LABELS } from "@/features/stories/components/stories-table-shared";
import { getMyStoryStats } from "@/features/stories/services/stories-service";
import type { MyStoryStats } from "@/features/stories/types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

const EMPTY_STATS: MyStoryStats = {
  summary: {
    totalStories: 0,
    publishedStories: 0,
    totalReads: 0,
    totalLikes: 0,
    totalComments: 0,
    totalRatings: 0,
    avgRating: 0,
  },
  topStories: [],
};

export function MyStoryStatsPanel() {
  const [stats, setStats] = useState<MyStoryStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await getMyStoryStats();
        if (!isMounted) return;
        setStats(response);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải thống kê truyện.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng truyện</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(stats.summary.totalStories)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Đang phát hành</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(stats.summary.publishedStories)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng lượt đọc</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(stats.summary.totalReads)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Điểm trung bình</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {stats.summary.totalRatings > 0 ? `${stats.summary.avgRating.toFixed(2)} ★` : "--"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng lượt thích</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(stats.summary.totalLikes)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng bình luận</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(stats.summary.totalComments)}
          </p>
        </div>
        <div className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tổng lượt đánh giá</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(stats.summary.totalRatings)}
          </p>
        </div>
      </section>

      <section className="data-card overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-[1.8fr_0.85fr_0.75fr_0.75fr_0.75fr_0.75fr_0.9fr] gap-3 border-b border-border bg-surface-muted px-4 py-3 text-sm font-medium text-muted-foreground">
          <span>Truyện</span>
          <span>Trạng thái</span>
          <span>Chương</span>
          <span>Lượt đọc</span>
          <span>Lượt thích</span>
          <span>Đánh giá</span>
          <span>Cập nhật</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">Đang tải thống kê...</div>
        ) : errorMessage ? (
          <div className="px-4 py-10 text-sm text-accent-strong">{errorMessage}</div>
        ) : stats.topStories.length === 0 ? (
          <div className="px-4 py-10 text-sm text-muted-foreground">
            Chưa có dữ liệu truyện để thống kê.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {stats.topStories.map((story) => (
              <div
                key={story.id}
                className="grid min-w-[980px] grid-cols-[1.8fr_0.85fr_0.75fr_0.75fr_0.75fr_0.75fr_0.9fr] gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/stories/${story.slug}`}
                    className="truncate font-medium text-foreground hover:text-accent-strong"
                  >
                    {story.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">/{story.slug}</p>
                </div>
                <span className="text-foreground">{STATUS_LABELS[story.status]}</span>
                <span className="text-foreground">{formatNumber(story.chapterCount)}</span>
                <span className="text-foreground">{formatNumber(story.readCount)}</span>
                <span className="text-foreground">{formatNumber(story.likeCount)}</span>
                <span className="text-foreground">
                  {story.ratingCount > 0 ? `${story.rating.toFixed(1)} ★` : "--"}
                </span>
                <span className="text-foreground">{formatStoryDate(story.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
