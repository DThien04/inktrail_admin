import type { StoryStatus } from "@/features/stories/types";

export const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Bản nháp",
  published: "Đang phát hành",
  archived: "Lưu trữ",
};

export const STORY_STATUS_FILTERS: Array<{
  label: string;
  value: StoryStatus | "all";
}> = [
  { label: "Tất cả", value: "all" },
  { label: "Bản nháp", value: "draft" },
  { label: "Đang phát hành", value: "published" },
  { label: "Lưu trữ", value: "archived" },
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
