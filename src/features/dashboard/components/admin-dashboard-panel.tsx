"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAdminDashboardQueues,
  getAdminDashboardSummary,
  getAdminDashboardTrends,
} from "@/features/dashboard/services/admin-dashboard-service";
import type {
  AdminDashboardQueueItem,
  AdminDashboardSummary,
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

const EMPTY_SUMMARY: AdminDashboardSummary = {
  totals: {
    users: 0,
    authors: 0,
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
    return `${item.target.title} (/${item.target.slug})`;
  }
  if (item.targetType === "chapter" && "chapterNumber" in item.target) {
    return `Chương ${item.target.chapterNumber}: ${item.target.title}`;
  }
  if ("contentPreview" in item.target) {
    return `Bình luận: ${item.target.contentPreview}`;
  }
  return item.targetId;
}

export function AdminDashboardPanel() {
  const [summary, setSummary] = useState<AdminDashboardSummary>(EMPTY_SUMMARY);
  const [trends, setTrends] = useState<AdminDashboardTrends>(EMPTY_TRENDS);
  const [queues, setQueues] = useState<AdminDashboardQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard({
    reloading = false,
    nextRange = range,
  }: {
    reloading?: boolean;
    nextRange?: "7d" | "30d";
  } = {}) {
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
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void loadDashboard({ nextRange: range });
  }, [range]);

  const maxTrendValue = useMemo(() => {
    if (!trends.points.length) return 1;
    return Math.max(
      ...trends.points.map((item) =>
        Math.max(
          item.reportCasesCreated,
          item.reportCasesResolved,
          item.storiesPublished,
          item.chaptersPublished,
        ),
      ),
      1,
    );
  }, [trends.points]);

  const trendSummary = useMemo(() => {
    const created = trends.points.reduce((sum, item) => sum + item.reportCasesCreated, 0);
    const resolved = trends.points.reduce((sum, item) => sum + item.reportCasesResolved, 0);
    const resolveRate = created > 0 ? Math.round((resolved / created) * 100) : 0;
    return { created, resolved, resolveRate };
  }, [trends.points]);

  const moderationFailTotal =
    summary.moderationSnapshot.stories.failed + summary.moderationSnapshot.chapters.failed;

  return (
    <div className="space-y-5">
      <section className="data-card overflow-hidden p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard quản trị</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi sức khỏe hệ thống, hàng đợi xử lý và xu hướng nội dung.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as "7d" | "30d")}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
            </select>
            <button
              type="button"
              disabled={isReloading || isLoading}
              onClick={() => void loadDashboard({ reloading: true })}
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
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <article className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Users</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totals.users)}</p></article>
        <article className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Authors</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totals.authors)}</p></article>
        <article className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Truyện</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totals.stories)}</p></article>
        <article className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Chương</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totals.chapters)}</p></article>
        <article className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Case mở</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totals.openReportCases)}</p></article>
        <article className="data-card p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Kháng nghị chờ</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(summary.totals.pendingAppeals)}</p></article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Report vào kỳ này</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(trendSummary.created)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tổng case report mới trong {trends.rangeDays} ngày.</p>
        </article>
        <article className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Report xử lý xong</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(trendSummary.resolved)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Số case chuyển sang trạng thái đã xử lý trong kỳ.</p>
        </article>
        <article className="data-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tỷ lệ xử lý</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{trendSummary.resolveRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Tỷ lệ case đã xử lý / case mới trong cùng kỳ.</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3 md:items-start">
        <article className="data-card p-4 md:col-span-2">
          <h2 className="text-base font-semibold text-foreground">Xu hướng vận hành</h2>
          <p className="mt-1 text-xs text-muted-foreground">Theo ngày: case report mới tạo, case report đã xử lý, truyện/chương xuất bản.</p>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
          ) : trends.points.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Chưa có dữ liệu.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[86px_1fr_1fr_1fr_1fr] gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
                  <span>Ngày</span>
                  <span>Case report mới tạo</span>
                  <span>Case report đã xử lý</span>
                  <span>Truyện xuất bản</span>
                  <span>Chương xuất bản</span>
                </div>
                <div className="mt-2 space-y-2">
                  {trends.points.map((point) => (
                    <div key={point.date} className="grid grid-cols-[86px_1fr_1fr_1fr_1fr] items-center gap-2">
                      <span className="text-sm text-foreground">{point.date.slice(5)}</span>
                      {[point.reportCasesCreated, point.reportCasesResolved, point.storiesPublished, point.chaptersPublished].map((value, idx) => (
                        <div key={`${point.date}-${idx}`} className="rounded-md border border-border bg-surface-muted px-2 py-1.5">
                          <div className="h-2 rounded bg-accent/75" style={{ width: `${Math.max(10, (value / maxTrendValue) * 100)}%` }} />
                          <div className="mt-1 text-[12px] font-medium text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="data-card self-start p-4 md:col-span-1">
          <h2 className="text-base font-semibold text-foreground">Moderation Snapshot</h2>
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <p className="font-medium text-foreground">Truyện</p>
              <p className="mt-1 text-muted-foreground">Pending {summary.moderationSnapshot.stories.pending} · Approved {summary.moderationSnapshot.stories.approved} · Rejected {summary.moderationSnapshot.stories.rejected} · Failed {summary.moderationSnapshot.stories.failed}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <p className="font-medium text-foreground">Chương</p>
              <p className="mt-1 text-muted-foreground">Pending {summary.moderationSnapshot.chapters.pending} · Approved {summary.moderationSnapshot.chapters.approved} · Rejected {summary.moderationSnapshot.chapters.rejected} · Failed {summary.moderationSnapshot.chapters.failed}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <p className="font-medium text-foreground">Trạng thái nội dung</p>
              <p className="mt-1 text-muted-foreground">Truyện: {summary.contentStatus.stories.draft} nháp / {summary.contentStatus.stories.published} phát hành</p>
              <p className="text-muted-foreground">Chương: {summary.contentStatus.chapters.draft} nháp / {summary.contentStatus.chapters.published} phát hành</p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
              <p className="font-medium text-foreground">Cảnh báo AI</p>
              <p className={`mt-1 ${moderationFailTotal > 0 ? "text-red-700 font-medium" : "text-muted-foreground"}`}>
                Moderation failed: {moderationFailTotal}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="data-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Hàng đợi ưu tiên xử lý</h2>
          <Link href="/reports" className="text-sm font-medium text-accent-strong hover:underline">
            Mở quản lý report
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Đối tượng</th>
                <th className="px-4 py-3 font-medium">Ưu tiên</th>
                <th className="px-4 py-3 font-medium">Điểm rủi ro</th>
                <th className="px-4 py-3 font-medium">Báo cáo</th>
                <th className="px-4 py-3 font-medium">Tuổi case</th>
                <th className="px-4 py-3 font-medium">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {queues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Không có case chờ xử lý.</td>
                </tr>
              ) : (
                queues.map((item) => (
                  <tr key={item.id} className="border-t border-border/70">
                    <td className="px-4 py-3 text-foreground">{queueTargetLabel(item)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${item.priority === "critical" ? "border-red-200 bg-red-50 text-red-700" : item.priority === "high" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{item.riskScore}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.reportCount} ({item.uniqueReporterCount} user)</td>
                    <td className="px-4 py-3">
                      <span className={item.isSlaOverdue ? "font-semibold text-red-700" : "text-muted-foreground"}>
                        {item.ageHours}h
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(item.lastReportedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
