"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type {
  CreateStoryPayload,
  GenreOption,
  StoryStatus,
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
    <section className="data-card max-w-[1080px] p-5">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tạo truyện mới</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Truyện mới tạo mặc định chưa có chương. Bạn có thể thêm chương sau ở tab quản lý chương.
          </p>
        </div>

        {localError || submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || submitError}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
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
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
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
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
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
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
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
                    Chọn ảnh bìa
                  </label>

                  <button
                    type="button"
                    disabled={!form.coverFile}
                    onClick={() => {
                      setForm((current) => ({ ...current, coverFile: null }));
                      setCoverRatioWarning("");
                    }}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Bỏ ảnh đã chọn
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p>
                    {form.coverFile
                      ? `Ảnh sẽ upload khi tạo truyện: ${form.coverFile.name}`
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
                    const checked = form.genreIds.includes(genre.id);

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
                            setForm((current) => {
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
            onClick={onClose}
            disabled={isCreating}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmitCreate}
            disabled={isCreating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isCreating ? "Đang tạo..." : "Tạo truyện"}
          </button>
        </div>
      </div>
    </section>
  );
}
