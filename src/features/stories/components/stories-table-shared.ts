import type { ModerationStatus, StoryStatus } from "@/features/stories/types";

export const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Bản nháp",
  published: "Đang phát hành",
};

export const STORY_STATUS_FILTERS: Array<{
  label: string;
  value: StoryStatus | "all";
}> = [
  { label: "Tất cả", value: "all" },
  { label: "Bản nháp", value: "draft" },
  { label: "Đang phát hành", value: "published" },
];

export function formatStoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatStoryReadCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function moderationStatusLabel(status: ModerationStatus | null) {
  if (!status) return "Chưa quét";
  if (status === "pending") return "Đang quét";
  if (status === "approved") return "Đạt";
  if (status === "rejected") return "Cần sửa";
  return "Lỗi AI";
}

export function moderationStatusClass(status: ModerationStatus | null) {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
