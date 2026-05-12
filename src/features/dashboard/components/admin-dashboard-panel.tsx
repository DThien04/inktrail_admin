"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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

function buildSmoothPath(coords: Array<{ x: number; y: number }>) {
  const n = coords.length;
  if (n === 0) return "";
  if (n === 1) return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  if (n === 2) {
    return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)} L ${coords[1].x.toFixed(2)} ${coords[1].y.toFixed(2)}`;
  }

  const dxs: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = coords[i + 1].x - coords[i].x;
    const dy = coords[i + 1].y - coords[i].y;
    dxs.push(dx);
    slopes.push(dx === 0 ? 0 : dy / dx);
  }

  const tangents: number[] = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      const w1 = 2 * dxs[i] + dxs[i - 1];
      const w2 = dxs[i] + 2 * dxs[i - 1];
      tangents[i] = (w1 + w2) / (w1 / slopes[i - 1] + w2 / slopes[i]);
    }
  }

  let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = dxs[i];
    const x0 = coords[i].x;
    const y0 = coords[i].y;
    const x1 = coords[i + 1].x;
    const y1 = coords[i + 1].y;
    const cp1x = x0 + dx / 3;
    const cp1y = y0 + (tangents[i] * dx) / 3;
    const cp2x = x1 - dx / 3;
    const cp2y = y1 - (tangents[i + 1] * dx) / 3;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  return path;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function greetByHour() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
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

function Sparkline({
  values,
  color,
  height = 36,
  width = 120,
}: {
  values: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const stepX = width / Math.max(1, values.length - 1);

  const coords = values.map((value, index) => ({
    x: index * stepX,
    y: height - ((value - min) / range) * height,
  }));
  const smoothPath = buildSmoothPath(coords);
  const areaPath = `${smoothPath} L ${width.toFixed(2)} ${height} L 0 ${height} Z`;
  const lastValue = values[values.length - 1];
  const lastX = (values.length - 1) * stepX;
  const lastY = height - ((lastValue - min) / range) * height;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className="overflow-visible"
      aria-hidden
    >
      <path d={areaPath} fill={color} opacity={0.14} />
      <path
        d={smoothPath}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

function StatCard({
  label,
  value,
  helper,
  sparkValues,
  sparkColor,
  href,
}: {
  label: string;
  value: number;
  helper: string;
  sparkValues?: number[];
  sparkColor?: string;
  href?: string;
}) {
  const inner = (
    <article className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-white p-5 transition hover:border-accent/40 hover:shadow-[0_18px_36px_-22px_rgba(124,75,42,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {href ? (
          <span
            aria-hidden
            className="text-muted-foreground transition group-hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[28px] font-semibold leading-none text-foreground">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{helper}</p>
        </div>
        {sparkValues && sparkValues.length > 1 ? (
          <div className="-mb-1 -mr-1 shrink-0">
            <Sparkline values={sparkValues} color={sparkColor || "#c4773a"} />
          </div>
        ) : null}
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

function MissionCard({
  label,
  value,
  helper,
  href,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  href: string;
  tone?: "neutral" | "warning" | "danger" | "success";
  icon: React.ReactNode;
}) {
  const toneClass = {
    neutral:
      "border-border bg-white text-foreground hover:border-accent/40",
    warning:
      "border-amber-200 bg-amber-50/70 text-amber-900 hover:border-amber-300",
    danger:
      "border-red-200 bg-red-50/70 text-red-900 hover:border-red-300",
    success:
      "border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:border-emerald-300",
  }[tone];

  const accentClass = {
    neutral: "text-foreground",
    warning: "text-amber-700",
    danger: "text-red-700",
    success: "text-emerald-700",
  }[tone];

  return (
    <Link
      href={href}
      className={`group flex h-full items-start gap-4 rounded-2xl border p-5 transition ${toneClass}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-white/60 ${accentClass}`}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
          {label}
        </p>
        <p className={`mt-1 text-3xl font-semibold leading-tight ${accentClass}`}>
          {value}
        </p>
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug opacity-80">{helper}</p>
      </div>
      <span
        aria-hidden
        className={`mt-1 shrink-0 ${accentClass} transition group-hover:translate-x-0.5`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

function AreaLineChart({
  title,
  subtitle,
  points,
  series,
  emptyText,
  isLoading,
  strokeWidth = 2,
}: {
  title: string;
  subtitle: string;
  points: AdminDashboardTrendPoint[];
  series: Array<{
    key: string;
    label: string;
    color: string;
    getValue: (point: AdminDashboardTrendPoint) => number;
  }>;
  emptyText: string;
  isLoading: boolean;
  strokeWidth?: number;
}) {
  const gradientId = useId().replace(/:/g, "");
  const width = 640;
  const height = 200;
  const padding = { top: 12, right: 16, bottom: 26, left: 28 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => series.map((item) => item.getValue(point))),
  );
  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, index) =>
    Math.round((maxValue / gridSteps) * index),
  );

  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const labelEvery = Math.max(1, Math.round(points.length / 6));

  const seriesTotals = series.map((item) => ({
    ...item,
    total: points.reduce((sum, point) => sum + item.getValue(point), 0),
  }));

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {seriesTotals.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-foreground/80">{item.label}</span>
              <span
                className="tabular-nums font-semibold"
                style={{ color: item.color }}
              >
                {formatNumber(item.total)}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex-1">
        {isLoading ? (
          <div className="flex h-[220px] items-center justify-center rounded-xl bg-surface-muted/40 text-xs text-muted-foreground">
            Đang tải dữ liệu...
          </div>
        ) : points.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center rounded-xl bg-surface-muted/40 text-xs text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
            <defs>
              {series.map((item) => (
                <linearGradient
                  key={`grad-${item.key}`}
                  id={`${gradientId}-${item.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            {gridValues.map((gridValue, index) => {
              const y = padding.top + innerHeight - (gridValue / maxValue) * innerHeight;
              return (
                <g key={`grid-${index}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#f1e9dd"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    fontSize="9"
                    fontWeight={500}
                    fill="#c2b5a4"
                    textAnchor="end"
                  >
                    {gridValue}
                  </text>
                </g>
              );
            })}

            {[...series].reverse().map((item) => {
              const lineCoords = points.map((point, index) => {
                const x = padding.left + index * stepX;
                const y =
                  padding.top + innerHeight - (item.getValue(point) / maxValue) * innerHeight;
                return { x, y };
              });
              const smoothPath = buildSmoothPath(lineCoords);
              const baselineY = padding.top + innerHeight;
              const lastX = padding.left + (points.length - 1) * stepX;
              const areaPath = `${smoothPath} L ${lastX.toFixed(2)} ${baselineY} L ${padding.left} ${baselineY} Z`;
              return (
                <path
                  key={`area-${item.key}`}
                  d={areaPath}
                  fill={`url(#${gradientId}-${item.key})`}
                />
              );
            })}

            {series.map((item) => {
              const lineCoords = points.map((point, index) => {
                const x = padding.left + index * stepX;
                const y =
                  padding.top + innerHeight - (item.getValue(point) / maxValue) * innerHeight;
                return { x, y };
              });
              const smoothPath = buildSmoothPath(lineCoords);
              const lastCoord = lineCoords[lineCoords.length - 1];
              return (
                <g key={`line-${item.key}`}>
                  <path
                    d={smoothPath}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {lastCoord ? (
                    <g>
                      <circle
                        cx={lastCoord.x}
                        cy={lastCoord.y}
                        r={5}
                        fill={item.color}
                        opacity={0.18}
                      />
                      <circle cx={lastCoord.x} cy={lastCoord.y} r={2.8} fill="#ffffff" />
                      <circle cx={lastCoord.x} cy={lastCoord.y} r={1.8} fill={item.color} />
                    </g>
                  ) : null}
                </g>
              );
            })}

            {points.map((point, index) => {
              if (index % labelEvery !== 0 && index !== points.length - 1) return null;
              const x = padding.left + index * stepX;
              return (
                <text
                  key={`xlabel-${index}`}
                  x={x}
                  y={height - 6}
                  fontSize="9.5"
                  fontWeight={500}
                  fill="#b3a392"
                  textAnchor="middle"
                >
                  {formatShortDate(point.date)}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </article>
  );
}

function ModerationCard({
  stories,
  chapters,
}: {
  stories: AdminDashboardSummary["moderationSnapshot"]["stories"];
  chapters: AdminDashboardSummary["moderationSnapshot"]["chapters"];
}) {
  const segments = [
    {
      key: "approved",
      label: "Đã duyệt",
      value: stories.approved + chapters.approved,
      color: "#6f8f7b",
    },
    {
      key: "pending",
      label: "Đang chờ",
      value: stories.pending + chapters.pending,
      color: "#c4773a",
    },
    {
      key: "rejected",
      label: "Từ chối",
      value: stories.rejected + chapters.rejected,
      color: "#c96c55",
    },
    {
      key: "failed",
      label: "Lỗi AI",
      value: stories.failed + chapters.failed,
      color: "#9a8b79",
    },
  ];

  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const visibleSegments = segments.filter((item) => item.value > 0);
  const gradient =
    total === 0
      ? "conic-gradient(#efe8de 0deg 360deg)"
      : (() => {
          let current = 0;
          return `conic-gradient(${visibleSegments
            .map((segment) => {
              const start = current;
              const angle = (segment.value / total) * 360;
              current += angle;
              return `${segment.color} ${start}deg ${current}deg`;
            })
            .join(", ")})`;
        })();

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-white p-5">
      <h3 className="text-base font-semibold text-foreground">Kiểm duyệt</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Phân bổ trạng thái duyệt trên truyện và chương.
      </p>

      <div className="mt-4 flex flex-1 items-center gap-6">
        <div
          className="relative h-44 w-44 shrink-0 rounded-full"
          style={{ background: gradient }}
        >
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Tổng
            </span>
            <span className="mt-1 text-3xl font-semibold text-foreground">
              {formatNumber(total)}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm">
          {segments.map((segment) => (
            <div key={segment.key} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatNumber(segment.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-border/70 pt-4 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Truyện</p>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold tabular-nums">{formatNumber(stories.pending)}</span>{" "}
            chờ ·{" "}
            <span className="font-semibold tabular-nums">{formatNumber(stories.approved)}</span>{" "}
            duyệt
            {stories.rejected + stories.failed > 0 ? (
              <>
                {" "}·{" "}
                <span className="font-semibold tabular-nums">
                  {formatNumber(stories.rejected + stories.failed)}
                </span>{" "}
                khác
              </>
            ) : null}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-surface-muted/40 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Chương</p>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold tabular-nums">{formatNumber(chapters.pending)}</span>{" "}
            chờ ·{" "}
            <span className="font-semibold tabular-nums">{formatNumber(chapters.approved)}</span>{" "}
            duyệt
            {chapters.rejected + chapters.failed > 0 ? (
              <>
                {" "}·{" "}
                <span className="font-semibold tabular-nums">
                  {formatNumber(chapters.rejected + chapters.failed)}
                </span>{" "}
                khác
              </>
            ) : null}
          </p>
        </div>
      </div>
    </article>
  );
}

function QueueRow({ item }: { item: AdminDashboardQueueItem }) {
  return (
    <li className="flex flex-col gap-3 border-t border-border/70 px-5 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex rounded-full border border-border bg-surface-muted px-2 py-0.5 uppercase tracking-[0.14em] text-muted-foreground">
            {item.targetType.replace("_", " ")}
          </span>
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${priorityTone(item.priority)}`}
          >
            {item.priority}
          </span>
          {item.isSlaOverdue ? (
            <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700">
              Quá hạn
            </span>
          ) : null}
          {item.appealStatus === "pending" ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
              Có khiếu nại
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
          {queueTargetLabel(item)}
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3 sm:w-auto sm:flex sm:items-center sm:gap-5">
        <div className="text-left sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Risk</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">{item.riskScore}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Reports</p>
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {formatNumber(item.reportCount)} / {formatNumber(item.uniqueReporterCount)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Tuổi</p>
          <p
            className={`text-sm font-semibold tabular-nums ${item.isSlaOverdue ? "text-red-700" : "text-foreground"}`}
          >
            {item.ageHours}h
          </p>
        </div>
      </div>
    </li>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14 12-3.5-3.5" />
      <path d="m17.5 8.5-3.5 3.5" />
      <path d="M21 21H3" />
      <path d="m12 16-4-4" />
      <path d="M3.5 5.5 8 10l5-5L8.5 1z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
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

  const loadDashboard = useCallback(
    async ({
      reloading = false,
      nextRange,
    }: {
      reloading?: boolean;
      nextRange: "7d" | "30d";
    }) => {
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
    },
    [],
  );

  useEffect(() => {
    void loadDashboard({ nextRange: range });
  }, [loadDashboard, range]);

  const trendSummary = useMemo(() => {
    const created = trends.points.reduce((sum, item) => sum + item.reportCasesCreated, 0);
    const resolved = trends.points.reduce((sum, item) => sum + item.reportCasesResolved, 0);
    const resolveRate = created > 0 ? Math.round((resolved / created) * 100) : 0;
    return { created, resolved, resolveRate };
  }, [trends.points]);

  const overdueCount = useMemo(
    () => queues.filter((item) => item.isSlaOverdue).length,
    [queues],
  );

  const sparkValues = useMemo(() => {
    return {
      reportCreated: trends.points.map((point) => point.reportCasesCreated),
      reportResolved: trends.points.map((point) => point.reportCasesResolved),
      storiesPublished: trends.points.map((point) => point.storiesPublished),
      chaptersPublished: trends.points.map((point) => point.chaptersPublished),
    };
  }, [trends.points]);

  const missionTone = (count: number, severe: "danger" | "warning") => {
    if (count === 0) return "success" as const;
    return severe;
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="relative flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#c4773a]/8"
          />
          <div
            aria-hidden
            className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-[#7d9a88]/8"
          />
          <div className="relative">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {formatTodayLabel()}
            </p>
            <h1 className="mt-1 text-[26px] font-semibold leading-tight text-foreground">
              {greetByHour()}, hệ thống đang vận hành ổn định.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {overdueCount > 0
                ? `Có ${overdueCount} case quá hạn SLA cần xử lý sớm.`
                : summary.totals.openReportCases > 0
                  ? `${formatNumber(summary.totals.openReportCases)} case còn mở, không có case quá hạn.`
                  : "Không có case nào đang mở. Một ngày bình yên với moderation."}
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-white p-0.5 text-sm">
              {(["7d", "30d"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    range === option
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option === "7d" ? "7 ngày" : "30 ngày"}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={isReloading || isLoading}
              onClick={() => void loadDashboard({ reloading: true, nextRange: range })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              title="Tải lại"
              aria-label="Tải lại dashboard"
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <MissionCard
          label="Quá hạn SLA"
          value={overdueCount}
          helper={
            overdueCount > 0
              ? "Case đã quá thời gian xử lý cho phép, ưu tiên giải quyết."
              : "Mọi case đang trong hạn SLA."
          }
          href="/reports"
          tone={missionTone(overdueCount, "danger")}
          icon={<AlertIcon />}
        />
        <MissionCard
          label="Khiếu nại chờ"
          value={summary.totals.pendingAppeals}
          helper={
            summary.totals.pendingAppeals > 0
              ? "Người dùng đang chờ phản hồi về quyết định khóa."
              : "Chưa có khiếu nại mới cần phản hồi."
          }
          href="/lock-appeals"
          tone={missionTone(summary.totals.pendingAppeals, "warning")}
          icon={<GavelIcon />}
        />
        <MissionCard
          label="Tỷ lệ xử lý"
          value={`${trendSummary.resolveRate}%`}
          helper={`${formatNumber(trendSummary.resolved)} / ${formatNumber(
            trendSummary.created,
          )} case đã xử lý trong ${trends.rangeDays} ngày.`}
          href="/reports"
          tone={
            trendSummary.created === 0
              ? "neutral"
              : trendSummary.resolveRate >= 70
                ? "success"
                : trendSummary.resolveRate >= 40
                  ? "warning"
                  : "danger"
          }
          icon={<CheckIcon />}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Người dùng"
          value={summary.totals.users}
          helper="Tổng tài khoản trong hệ thống."
          href="/users"
        />
        <StatCard
          label="Truyện"
          value={summary.totals.stories}
          helper={`Phát hành: ${formatNumber(summary.contentStatus.stories.published)} · Bản nháp: ${formatNumber(summary.contentStatus.stories.draft)}`}
          sparkValues={sparkValues.storiesPublished}
          sparkColor="#a46f44"
          href="/stories"
        />
        <StatCard
          label="Chương"
          value={summary.totals.chapters}
          helper={`Phát hành: ${formatNumber(summary.contentStatus.chapters.published)} · Bản nháp: ${formatNumber(summary.contentStatus.chapters.draft)}`}
          sparkValues={sparkValues.chaptersPublished}
          sparkColor="#d8b089"
          href="/chapters"
        />
        <StatCard
          label="Case mở"
          value={summary.totals.openReportCases}
          helper={`${formatNumber(trendSummary.created)} case mới trong ${trends.rangeDays} ngày.`}
          sparkValues={sparkValues.reportCreated}
          sparkColor="#c4773a"
          href="/reports"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AreaLineChart
            title="Áp lực kiểm duyệt"
            subtitle={`Report mới vs. đã xử lý theo ngày — ${trends.rangeDays} ngày gần nhất.`}
            points={trends.points}
            series={[
              {
                key: "created",
                label: "Case mới",
                color: "#c98a4f",
                getValue: (point) => point.reportCasesCreated,
              },
              {
                key: "resolved",
                label: "Đã xử lý",
                color: "#8aa99a",
                getValue: (point) => point.reportCasesResolved,
              },
            ]}
            emptyText="Chưa có report nào trong khoảng này."
            isLoading={isLoading}
          />
        </div>
        <ModerationCard
          stories={summary.moderationSnapshot.stories}
          chapters={summary.moderationSnapshot.chapters}
        />
      </section>

      <section>
        <AreaLineChart
          title="Sản xuất nội dung"
          subtitle={`Truyện và chương phát hành theo ngày — ${trends.rangeDays} ngày gần nhất.`}
          points={trends.points}
          series={[
            {
              key: "stories",
              label: "Truyện",
              color: "#b88456",
              getValue: (point) => point.storiesPublished,
            },
            {
              key: "chapters",
              label: "Chương",
              color: "#8aa99a",
              getValue: (point) => point.chaptersPublished,
            },
          ]}
          emptyText="Chưa có truyện/chương phát hành trong khoảng này."
          isLoading={isLoading}
          strokeWidth={1.6}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-col gap-3 border-b border-border bg-surface-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Hàng đợi ưu tiên</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Các case cần được chạm vào sớm nhất theo risk, SLA và số người report.
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-medium text-accent-strong transition hover:bg-surface-muted"
          >
            Mở quản lý report →
          </Link>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Đang tải hàng đợi...
          </div>
        ) : queues.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Không có case nào đang chờ xử lý.
          </div>
        ) : (
          <ul>
            {queues.map((item) => (
              <QueueRow key={item.id} item={item} />
            ))}
          </ul>
        )}

        <div className="border-t border-border bg-surface-muted/30 px-5 py-2 text-right text-xs text-muted-foreground">
          Cập nhật gần nhất: {queues[0] ? formatDate(queues[0].lastReportedAt) : "--"}
        </div>
      </section>
    </div>
  );
}
