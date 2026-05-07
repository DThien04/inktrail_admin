"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type {
  CreateStoryPayload,
  GenreOption,
} from "@/features/stories/types";

type StoryCreatePanelProps = {
  isCreating: boolean;
  submitError: string;
  genres: GenreOption[];
  onCreate: (payload: CreateStoryPayload) => Promise<void>;
  onClose: () => void;
};

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
    genreIds: [],
    tagNames: [],
  };
}

function splitTagInput(value: string) {
  const unique = new Map<string, string>();
  for (const item of value.split(/[\n,]/g)) {
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }
  return Array.from(unique.values());
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

export function StoryCreatePanel({
  isCreating,
  submitError,
  genres,
  onCreate,
  onClose,
}: StoryCreatePanelProps) {
  const [form, setForm] = useState<CreateStoryPayload>(buildEmptyCreateForm);
  const [coverRatioWarning, setCoverRatioWarning] = useState("");
  const [localError, setLocalError] = useState("");

  const coverPreviewUrl = useMemo(() => {
    if (!form.coverFile) return "";
    return URL.createObjectURL(form.coverFile);
  }, [form.coverFile]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  async function handleSubmitCreate() {
    if (!form.title.trim()) {
      setLocalError("Hãy nhập tên truyện.");
      return;
    }

    setLocalError("");
    await onCreate({
      ...form,
      slug: form.slug.trim() || slugify(form.title),
    });
  }

  return (
    <section className="data-card max-w-[1120px] overflow-hidden rounded-[30px] p-0">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-xl font-semibold text-foreground">Tạo truyện mới</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Điền thông tin chính để tạo truyện. Chương sẽ được quản lý ở bước tiếp theo.
        </p>
      </div>

      <div className="space-y-5 px-6 py-6">

        {localError || submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || submitError}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 xl:flex-row">
          <aside className="w-full shrink-0 xl:w-[220px]">
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Ảnh bìa</div>
              <div className="overflow-hidden rounded-[24px] border border-border bg-surface-muted">
                <div className="relative aspect-[2/3] w-full">
                  {coverPreviewUrl ? (
                    <img
                      src={coverPreviewUrl}
                      alt="Xem trước ảnh bìa"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 px-5 text-center text-muted-foreground">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white text-lg">
                        +
                      </span>
                      <span className="text-sm font-medium text-foreground">Tải ảnh bìa</span>
                      <span className="text-xs">Tỷ lệ dọc 2:3, khuyến nghị 900 x 1350 px</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (event) => {
                          const inputElement = event.currentTarget;
                          const file = event.target.files?.[0] || null;
                          const warning = file
                            ? await getAspectRatioWarning(file, 2 / 3, "bìa")
                            : "";

                          setForm((current) => ({
                            ...current,
                            coverFile: file,
                          }));
                          setCoverRatioWarning(warning);
                          inputElement.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (event) => {
                      const inputElement = event.currentTarget;
                      const file = event.target.files?.[0] || null;
                      const warning = file
                        ? await getAspectRatioWarning(file, 2 / 3, "bìa")
                        : "";

                      setForm((current) => ({
                        ...current,
                        coverFile: file,
                      }));
                      setCoverRatioWarning(warning);
                      inputElement.value = "";
                    }}
                  />
                  Chọn ảnh
                </label>

                <button
                  type="button"
                  disabled={!form.coverFile}
                  onClick={() => {
                    setForm((current) => ({ ...current, coverFile: null }));
                    setCoverRatioWarning("");
                  }}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Bỏ ảnh
                </button>
              </div>

              {coverRatioWarning ? (
                <p className="text-xs text-amber-700">{coverRatioWarning}</p>
              ) : null}
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <section className="rounded-[24px] border border-border bg-white p-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Thông tin cơ bản</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium text-foreground">Tên truyện</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => {
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
                    placeholder="Nhập tên truyện..."
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Slug</span>
                  <input
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: slugify(event.target.value),
                      }))
                    }
                    placeholder="ten-truyen-cua-ban"
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
                  />
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-sm">
                <span className="font-medium text-foreground">Mô tả</span>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Giới thiệu ngắn gọn về truyện..."
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            </section>

            <section className="rounded-[24px] border border-border bg-white p-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Tags và thể loại</h3>
              </div>

              <div className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Tags</span>
                {form.tagNames.length ? (
                  <div className="flex flex-wrap gap-2">
                    {form.tagNames.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <textarea
                  rows={3}
                  value={form.tagNames.join(", ")}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tagNames: splitTagInput(event.target.value),
                    }))
                  }
                  placeholder="Ví dụ: cưới trước yêu sau, học đường, chữa lành"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <span className="font-medium text-foreground">Thể loại</span>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => {
                    const checked = form.genreIds.includes(genre.id);

                    return (
                      <button
                        key={genre.id}
                        type="button"
                        disabled={!genre.isActive}
                        onClick={() =>
                          setForm((current) => {
                            const nextGenreIds = checked
                              ? current.genreIds.filter((id) => id !== genre.id)
                              : [...current.genreIds, genre.id];

                            return {
                              ...current,
                              genreIds: [...new Set(nextGenreIds)],
                            };
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          checked
                            ? "border-accent bg-accent text-white"
                            : "border-border bg-surface-muted text-foreground hover:bg-white"
                        } ${!genre.isActive ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {genre.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5">
        <p className="text-sm text-muted-foreground">
          Sau khi tạo truyện, bạn có thể chuyển sang quản lý chương để thêm nội dung.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmitCreate}
            disabled={isCreating}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? "Đang tạo..." : "Tạo truyện"}
          </button>
        </div>
      </div>
    </section>
  );
}

