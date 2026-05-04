"use client";

import type { StoryStatus } from "@/features/stories/types";

type StoriesTableToolbarProps = {
  selectedFilter: StoryStatus | "all";
  onSelectFilter: (value: StoryStatus | "all") => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSubmitSearch: () => void;
  searchPlaceholder: string;
  searchInputClassName?: string;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
};

const FILTERS: Array<{ label: string; value: StoryStatus | "all" }> = [
  { label: "Tất cả", value: "all" },
  { label: "Bản nháp", value: "draft" },
  { label: "Đang phát hành", value: "published" },
];

export function StoriesTableToolbar({
  selectedFilter,
  onSelectFilter,
  searchInput,
  onSearchInputChange,
  onSubmitSearch,
  searchPlaceholder,
  searchInputClassName = "min-w-[280px]",
  isCreateOpen,
  onToggleCreate,
}: StoriesTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = filter.value === selectedFilter;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onSelectFilter(filter.value)}
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

      <div className="flex gap-2">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitSearch();
          }}
        >
          <input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder={searchPlaceholder}
            className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent ${searchInputClassName}`}
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Tìm
          </button>
        </form>

        <button
          type="button"
          onClick={onToggleCreate}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          {isCreateOpen ? "Đóng form" : "Tạo truyện"}
        </button>
      </div>
    </div>
  );
}
