"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardQueues,
  getAdminDashboardSummary,
  getAdminDashboardTrends,
} from "@/features/dashboard/services/admin-dashboard-service";
import type {
  AdminDashboardQueueItem,
  AdminDashboardSummary,
  AdminDashboardTrendPoint,
  AdminDashboardTrends,
} from "@/features/dashboard/types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
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

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatChartRangeLabel(start: string, end: string) {
  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  return startLabel === endLabel ? startLabel : `${startLabel}–${endLabel}`;
}

const EMPTY_SUMMARY: AdminDashboardSummary = {
  totals: {
    users: 0,
    stories: 0,
    chapters: 0,
    openReportCases: 0,
    pendingAppeals: 0,
  },
  moderationSnapshot: {
    stories: { pending: 0, approved: 0, rejected: 0, failed: 0 },
    chapters: { pending: 0, approved: 0, rejected: 0, failed: 0 },
  },
  contentStatus: {
    stories: { draft: 0, published: 0 },
    chapters: { draft: 0, published: 0 },
  },
};

const EMPTY_TRENDS: AdminDashboardTrends = { rangeDays: 7, points: [] };

function queueTargetLabel(item: AdminDashboardQueueItem) {
  if (!item.target) return `${item.targetType} / ${item.targetId.slice(0, 8)}`;
  if (item.targetType === "story" && "slug" in item.target) {
    return item.target.title;
  }
  if (item.targetType === "chapter" && "chapterNumber" in item.target) {
    const storyTitle = item.target.story?.title ? `${item.target.story.title} · ` : "";
    return `${storyTitle}Chương ${item.target.chapterNumber}: ${item.target.title}`;
  }
  if ("contentPreview" in item.target) {
    const chapterLabel = item.target.chapter
      ? `Chương ${item.target.chapter.chapterNumber}`
      : "Bình luận";
    return `${chapterLabel}: ${item.target.contentPreview}`;
  }
  return item.targetId;
}

function priorityTone(priority: AdminDashboardQueueItem["priority"]) {
  switch (priority) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "medium":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function LineTrendChart({ points }: { points: AdminDashboardTrendPoint[] }) {
  const chartPoints = useMemo(() => {
    if (points.length <= 20) {
      return points.map((point) => ({
        label: formatShortDate(point.date),
        reportCasesCreated: point.reportCasesCreated,
        reportCasesResolved: point.reportCasesResolved,
        storiesPublished: point.storiesPublished,
        chaptersPublished: point.chaptersPublished,
      }));
    }

    const bucketSize = 5;
    const buckets: Array<{
      label: string;
      reportCasesCreated: number;
      reportCasesResolved: number;
      storiesPublished: number;
      chaptersPublished: number;
    }> = [];

    for (let index = 0; index < points.length; index += bucketSize) {
      const chunk = points.slice(index, index + bucketSize);
      buckets.push({
        label: formatChartRangeLabel(chunk[0].date, chunk[chunk.length - 1].date),
        reportCasesCreated: chunk.reduce((sum, item) => sum + item.reportCasesCreated, 0),
        reportCasesResolved: chunk.reduce((sum, item) => sum + item.reportCasesResolved, 0),
        storiesPublished: chunk.reduce((sum, item) => sum + item.storiesPublished, 0),
        chaptersPublished: chunk.reduce((sum, item) => sum + item.chaptersPublished, 0),
      });
    }

    return buckets;
  }, [points]);

  const width = Math.max(760, chartPoints.length * 110);
  const height = 332;
  const padding = { top: 22, right: 18, bottom: 40, left: 28 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => [
      point.reportCasesCreated,
      point.reportCasesResolved,
      point.storiesPublished,
      point.chaptersPublished,
    ]),
  );

  const gridValues = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index));
  const groupWidth = innerWidth / Math.max(chartPoints.length, 1);
  const barWidth = Math.min(32, Math.max(14, groupWidth / 4.6));

  const series = [
    {
      key: "reportCasesCreated",
      label: "Case mới",
      color: "#c4773a",
      getValue: (point: AdminDashboardTrendPoint) => point.reportCasesCreated,
    },
    {
      key: "reportCasesResolved",
      label: "Đã xử lý",
      color: "#7d9a88",
      getValue: (point: AdminDashboardTrendPoint) => point.reportCasesResolved,
    },
    {
      key: "storiesPublished",
      label: "Truyện phát hành",
      color: "#a46f44",
      getValue: (point: AdminDashboardTrendPoint) => point.storiesPublished,
    },
    {
      key: "chaptersPublished",
      label: "Chương phát hành",
      color: "#d8b089",
      getValue: (point: AdminDashboardTrendPoint) => point.chaptersPublished,
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(245,239,231,0.55),rgba(255,255,255,0.9))] p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]">
          {gridValues.map((gridValue, index) => {
            const y = padding.top + innerHeight - (gridValue / maxValue) * innerHeight;
            return (
              <g key={`grid-${gridValue}-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#ece2d4"
                  strokeDasharray="3 8"
                />
                <text x={4} y={y + 4} fontSize="11" fill="#a2907b">
                  {gridValue}
                </text>
              </g>
            );
          })}

          {chartPoints.map((point, pointIndex) => {
            const groupX = padding.left + pointIndex * groupWidth + groupWidth / 2;

            return (
              <g key={`${point.label}-${pointIndex}`}>
                {series.map((item, seriesIndex) => {
                  const value = item.getValue(point);
                  const barHeight = (value / maxValue) * innerHeight;
                  const x =
                    groupX - ((series.length * barWidth) / 2) + seriesIndex * barWidth + 1;
                  const y = padding.top + innerHeight - barHeight;

                  return (
                    <rect
                      key={`${point.date}-${item.key}`}
                      x={x}
                      y={y}
                      width={barWidth - 2}
                      height={Math.max(barHeight, value > 0 ? 6 : 0)}
                      rx="6"
                      fill={item.color}
                      opacity={value > 0 ? 0.92 : 0}
                    />
                  );
                })}

                <text
                  x={groupX}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#9a8b79"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {series.map((item) => (
          <div
            key={item.key}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModerationDonut({
  stories,
  chapters,
}: {
  stories: AdminDashboardSummary["moderationSnapshot"]["stories"];
  chapters: AdminDashboardSummary["moderationSnapshot"]["chapters"];
}) {
  const segments = [
    {
      label: "Đã duyệt",
      value: stories.approved + chapters.approved,
      color: "#6f8f7b",
    },
    {
      label: "Đang chờ",
      value: stories.pending + chapters.pending,
      color: "#c4773a",
    },
    {
      label: "Từ chối",
      value: stories.rejected + chapters.rejected,
      color: "#c96c55",
    },
    {
      label: "Lỗi AI",
      value: stories.failed + chapters.failed,
      color: "#9a8b79",
    },
  ].filter((item) => item.value > 0);

  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const gradient =
    total === 0
      ? "conic-gradient(#efe8de 0deg 360deg)"
      : (() => {
          let current = 0;
          return `conic-gradient(${segments
            .map((segment) => {
              const start = current;
              const angle = (segment.value / total) * 360;
              current += angle;
              return `${segment.color} ${start}deg ${current}deg`;
            })
            .join(", ")})`;
        })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-[28px] border border-border bg-surface-muted/60 p-4">
        <div
          className="relative h-36 w-36 rounded-full"
          style={{ background: gradient }}
        >
          <div className="absolute inset-[18px] flex items-center justify-center rounded-full bg-white text-center shadow-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tổng</div>
              <div className="mt-1 text-2xl font-semibold text-foreground">{formatNumber(total)}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm">
          {segments.length === 0 ? (
            <p className="text-muted-foreground">Chưa có dữ liệu kiểm duyệt.</p>
          ) : (
            segments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span>{segment.label}</span>
                </div>
                <span className="font-semibold text-foreground">{formatNumber(segment.value)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Truyện</p>
          <p className="mt-2 text-sm text-foreground">
            Chờ {stories.pending} · Duyệt {stories.approved} · Từ chối {stories.rejected}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Chương</p>
          <p className="mt-2 text-sm text-foreground">
            Chờ {chapters.pending} · Duyệt {chapters.approved} · Từ chối {chapters.rejected}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <article className="data-card rounded-[28px] border border-border/90 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{formatNumber(value)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className="rounded-2xl border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          Live
        </span>
      </div>
    </article>
  );
}

export function AdminDashboardPanel() {
  const [summary, setSummary] = useState<AdminDashboardSummary>(EMPTY_SUMMARY);
  const [trends, setTrends] = useState<AdminDashboardTrends>(EMPTY_TRENDS);
  const [queues, setQueues] = useState<AdminDashboardQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async ({
    reloading = false,
    nextRange,
  }: {
    reloading?: boolean;
    nextRange: "7d" | "30d";
  } = {}) => {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);

    setErrorMessage("");
    try {
      const [summaryRes, trendsRes, queuesRes] = await Promise.all([
        getAdminDashboardSummary(),
        getAdminDashboardTrends(nextRange),
        getAdminDashboardQueues(8),
      ]);
      setSummary(summaryRes);
      setTrends(trendsRes);
      setQueues(queuesRes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể tải dữ liệu dashboard.",
      );
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard({ nextRange: range });
  }, [loadDashboard, range]);

  const trendSummary = useMemo(() => {
    const created = trends.points.reduce((sum, item) => sum + item.reportCasesCreated, 0);
    const resolved = trends.points.reduce((sum, item) => sum + item.reportCasesResolved, 0);
    const resolveRate = created > 0 ? Math.round((resolved / created) * 100) : 0;
    return { created, resolved, resolveRate };
  }, [trends.points]);

  const moderationFailTotal =
    summary.moderationSnapshot.stories.failed + summary.moderationSnapshot.chapters.failed;

  const contentPublishedTotal =
    summary.contentStatus.stories.published + summary.contentStatus.chapters.published;

  const metrics = [
    {
      label: "Người dùng",
      value: summary.totals.users,
      helper: "Tổng tài khoản đang có trong hệ thống.",
    },
    {
      label: "Truyện",
      value: summary.totals.stories,
      helper: "Số đầu truyện đang được quản lý.",
    },
    {
      label: "Chương",
      value: summary.totals.chapters,
      helper: "Tổng chương đã được tạo trên toàn hệ thống.",
    },
    {
      label: "Case mở",
      value: summary.totals.openReportCases,
      helper: "Các report case chưa khép lại.",
    },
    {
      label: "Kháng nghị chờ",
      value: summary.totals.pendingAppeals,
      helper: "Yêu cầu cần admin xem lại quyết định.",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="data-card overflow-hidden rounded-[30px] border border-border/90 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              Điều hướng
            </div>
            <h1 className="mt-2 text-[30px] font-semibold leading-tight text-foreground">
              Dashboard quản trị
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Theo dõi nhịp vận hành, hàng đợi xử lý và tín hiệu kiểm duyệt của toàn bộ hệ thống.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as "7d" | "30d")}
              className="h-11 rounded-2xl border border-border bg-white px-4 text-sm outline-none focus:border-accent"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
            </select>
            <button
              type="button"
              disabled={isReloading || isLoading}
              onClick={() => void loadDashboard({ reloading: true })}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
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
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-5">
        {metrics.map((item) => (
          <DashboardMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            helper={item.helper}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="data-card rounded-[28px] border border-border/90 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Report mới trong kỳ</p>
          <p className="mt-3 text-4xl font-semibold text-foreground">{formatNumber(trendSummary.created)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tổng số case report được tạo trong {trends.rangeDays} ngày gần nhất.
          </p>
        </article>
        <article className="data-card rounded-[28px] border border-border/90 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Đã xử lý</p>
          <p className="mt-3 text-4xl font-semibold text-foreground">{formatNumber(trendSummary.resolved)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Số case đã được đóng hoặc chuyển xong trong cùng khoảng thời gian.
          </p>
        </article>
        <article className="data-card rounded-[28px] border border-border/90 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tỷ lệ xử lý</p>
          <p className="mt-3 text-4xl font-semibold text-foreground">{trendSummary.resolveRate}%</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tỷ lệ case đã xử lý so với report mới trong kỳ đang xem.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3 xl:items-stretch">
        <article className="data-card flex h-full flex-col rounded-[30px] border border-border/90 p-6 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Xu hướng vận hành</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nhìn theo ngày: report mới, report đã xử lý, truyện phát hành và chương phát hành.
              </p>
            </div>
            <div className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {trends.rangeDays} ngày gần nhất
            </div>
          </div>

          <div className="mt-6">
            {isLoading ? (
              <div className="rounded-[24px] border border-border bg-surface-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Đang tải dữ liệu biểu đồ...
              </div>
            ) : trends.points.length === 0 ? (
              <div className="rounded-[24px] border border-border bg-surface-muted/60 px-4 py-10 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu để hiển thị biểu đồ.
              </div>
            ) : (
              <LineTrendChart points={trends.points} />
            )}
          </div>
        </article>

        <article className="data-card flex h-full flex-col rounded-[30px] border border-border/90 p-6 xl:col-span-1">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Moderation snapshot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Phân bổ trạng thái duyệt và cảnh báo AI trên truyện, chương.
            </p>
          </div>

          <div className="mt-6 flex-1">
            <ModerationDonut
              stories={summary.moderationSnapshot.stories}
              chapters={summary.moderationSnapshot.chapters}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-muted/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Phát hành</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(contentPublishedTotal)}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tổng truyện/chương đang ở trạng thái phát hành.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lỗi AI</p>
              <p className={`mt-2 text-2xl font-semibold ${moderationFailTotal > 0 ? "text-red-700" : "text-foreground"}`}>
                {formatNumber(moderationFailTotal)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Số lượt moderation thất bại cần rà lại thủ công.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="data-card overflow-hidden rounded-[30px] border border-border/90">
        <div className="flex flex-col gap-3 border-b border-border bg-surface-muted/60 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Hàng đợi ưu tiên xử lý</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Các case cần được admin chạm vào sớm nhất theo risk score, SLA và số người report.
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-medium text-accent-strong transition hover:bg-white/80"
          >
            Mở quản lý report
          </Link>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-2">
          {queues.length === 0 ? (
            <div className="rounded-[24px] border border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground lg:col-span-2">
              Không có case chờ xử lý.
            </div>
          ) : (
            queues.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-border bg-white p-5 shadow-[0_14px_36px_rgba(88,52,19,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {item.targetType.replace("_", " ")}
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-base font-semibold text-foreground">
                      {queueTargetLabel(item)}
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-muted px-3 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Risk</div>
                    <div className="mt-1 text-2xl font-semibold text-foreground">{item.riskScore}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityTone(item.priority)}`}>
                    {item.priority}
                  </span>
                  {item.isSlaOverdue ? (
                    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Quá hạn xử lý
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-surface-muted/50 px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Report</div>
                    <div className="mt-1 font-semibold text-foreground">{formatNumber(item.reportCount)}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-muted/50 px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">User</div>
                    <div className="mt-1 font-semibold text-foreground">{formatNumber(item.uniqueReporterCount)}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-muted/50 px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Tuổi case</div>
                    <div className={`mt-1 font-semibold ${item.isSlaOverdue ? "text-red-700" : "text-foreground"}`}>
                      {item.ageHours}h
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-muted/50 px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cập nhật</div>
                    <div className="mt-1 font-semibold text-foreground">{formatDate(item.lastReportedAt)}</div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
