"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createStory,
  getAdminStories,
  getGenres,
} from "@/features/stories/services/stories-service";
import type {
  CreateStoryPayload,
  GenreOption,
  StoryListItem,
  StoryStatus,
} from "@/features/stories/types";

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

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildEmptyCreateForm(): CreateStoryPayload {
  return {
    title: "",
    slug: "",
    description: "",
    coverFile: null,
    status: "draft",
    genreIds: [],
  };
}

async function getAspectRatioWarning(file: File, expectedRatio: number, label: string) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const ratio = await new Promise<number>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.width / image.height);
      image.onerror = () => reject(new Error("Không thể đọc kích thước ảnh."));
      image.src = objectUrl;
    });

    if (Math.abs(ratio - expectedRatio) <= 0.18) return "";
    return `Ảnh ${label} này lệch khá nhiều so với tỷ lệ khuyến cáo, hệ thống vẫn cho lưu nhưng ảnh có thể hiển thị không đẹp.`;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
  const [coverRatioWarning, setCoverRatioWarning] = useState("");
  const [createForm, setCreateForm] = useState<CreateStoryPayload>(buildEmptyCreateForm);

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

  const coverPreviewUrl = useMemo(() => {
    if (!createForm.coverFile) return "";
    return URL.createObjectURL(createForm.coverFile);
  }, [createForm.coverFile]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const emptyMessage = useMemo(() => {
    if (selectedFilter === "all") {
      return "Chưa có truyện nào để hiển thị.";
    }

    return "Không có truyện phù hợp với bộ lọc hiện tại.";
  }, [selectedFilter]);

  function openCreateForm() {
    setIsCreateOpen(true);
    setCreateError("");
  }

  function closeCreateForm() {
    setIsCreateOpen(false);
    setCreateError("");
    setCoverRatioWarning("");
    setCreateForm(buildEmptyCreateForm());
  }

  async function refreshStories() {
    const rows = await getAdminStories({
      status: selectedFilter,
      query: searchQuery,
    });
    setStories(rows);
  }

  async function handleCreateStory() {
    if (!createForm.title.trim()) {
      setCreateError("Hãy nhập tên truyện.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const createdStory = await createStory({
        ...createForm,
        slug: createForm.slug.trim() || slugify(createForm.title),
      });
      await refreshStories();
      closeCreateForm();
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

        <div className="flex gap-2">
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

          <button
            type="button"
            onClick={isCreateOpen ? closeCreateForm : openCreateForm}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            {isCreateOpen ? "Đóng form" : "Tạo truyện"}
          </button>
        </div>
      </div>

      {isCreateOpen ? (
        <section className="data-card max-w-[1080px] p-5">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Tạo truyện mới</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Truyện mới tạo mặc định chưa có chương. Bạn có thể thêm chương sau ở tab quản lý chương.
              </p>
            </div>

            {createError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm md:col-span-2">
                    <span className="font-medium text-foreground">Tên truyện</span>
                    <input
                      value={createForm.title}
                      onChange={(event) =>
                        setCreateForm((current) => {
                          const nextTitle = event.target.value;
                          const shouldSyncSlug =
                            current.slug.trim().length === 0 ||
                            current.slug === slugify(current.title);

                          return {
                            ...current,
                            title: nextTitle,
                            slug: shouldSyncSlug ? slugify(nextTitle) : current.slug,
                          };
                        })
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Slug</span>
                    <input
                      value={createForm.slug}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          slug: slugify(event.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Trạng thái</span>
                    <select
                      value={createForm.status}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          status: event.target.value as StoryStatus,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="draft">Bản nháp</option>
                      <option value="published">Đang phát hành</option>
                      <option value="archived">Lưu trữ</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Mô tả</span>
                  <textarea
                    rows={5}
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>

                <div className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Ảnh bìa</span>
                  <div className="rounded-xl border border-border bg-surface-muted p-3">
                    <div className="flex flex-wrap gap-2">
                      <label className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0] || null;
                            const warning = file
                              ? await getAspectRatioWarning(file, 2 / 3, "bìa")
                              : "";

                            setCreateForm((current) => ({
                              ...current,
                              coverFile: file,
                            }));
                            setCoverRatioWarning(warning);
                            event.currentTarget.value = "";
                          }}
                        />
                        Chọn ảnh bìa
                      </label>

                      <button
                        type="button"
                        disabled={!createForm.coverFile}
                        onClick={() => {
                          setCreateForm((current) => ({ ...current, coverFile: null }));
                          setCoverRatioWarning("");
                        }}
                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Bỏ ảnh đã chọn
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <p>
                        {createForm.coverFile
                          ? `Ảnh sẽ upload khi tạo truyện: ${createForm.coverFile.name}`
                          : "Chưa chọn ảnh bìa."}
                      </p>
                      <p>Khuyến cáo: dùng ảnh bìa dọc tỷ lệ 2:3, kích thước tốt nhất 900 x 1350 px.</p>
                      {coverRatioWarning ? (
                        <p className="text-amber-700">{coverRatioWarning}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Thể loại</span>
                  <div className="rounded-xl border border-border bg-white px-3 py-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      {genres.map((genre) => {
                        const checked = createForm.genreIds.includes(genre.id);

                        return (
                          <label
                            key={genre.id}
                            className={`flex items-center gap-2 rounded-md px-2 py-1 ${
                              genre.isActive ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!genre.isActive}
                              onChange={(event) =>
                                setCreateForm((current) => {
                                  const nextGenreIds = event.target.checked
                                    ? [...current.genreIds, genre.id]
                                    : current.genreIds.filter((id) => id !== genre.id);

                                  return {
                                    ...current,
                                    genreIds: [...new Set(nextGenreIds)],
                                  };
                                })
                              }
                            />
                            <span>{genre.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt="Xem trước ảnh bìa"
                      className="h-full min-h-[320px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Chưa có ảnh bìa
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-sm text-muted-foreground">
                  Sau khi tạo truyện xong, bạn có thể nhảy sang quản lý chương để thêm nội dung cho truyện này.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateForm}
                disabled={isCreating}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateStory}
                disabled={isCreating}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreating ? "Đang tạo..." : "Tạo truyện"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
