"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { CreateStoryPayload, TagOption } from "@/features/stories/types";

type StoryCreatePanelProps = {
  variant?: "create" | "edit";
  isSubmitting: boolean;
  submitError: string;
  tags: TagOption[];
  initialForm?: CreateStoryPayload;
  existingCoverUrl?: string | null;
  onSubmit: (payload: CreateStoryPayload) => Promise<void>;
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
    tagIds: [],
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
  variant = "create",
  isSubmitting,
  submitError,
  tags,
  initialForm,
  existingCoverUrl = null,
  onSubmit,
  onClose,
}: StoryCreatePanelProps) {
  const isEdit = variant === "edit";

  const [form, setForm] = useState<CreateStoryPayload>(() =>
    isEdit && initialForm ? { ...initialForm } : buildEmptyCreateForm(),
  );
  const [coverRatioWarning, setCoverRatioWarning] = useState("");
  const [localError, setLocalError] = useState("");

  const coverBlobUrl = useMemo(() => {
    if (!form.coverFile) return "";
    return URL.createObjectURL(form.coverFile);
  }, [form.coverFile]);

  useEffect(() => {
    return () => {
      if (coverBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverBlobUrl);
      }
    };
  }, [coverBlobUrl]);

  async function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const file = event.target.files?.[0] || null;
    const warning = file ? await getAspectRatioWarning(file, 2 / 3, "bìa") : "";

    setForm((current) => ({
      ...current,
      coverFile: file,
    }));
    setCoverRatioWarning(warning);
    inputElement.value = "";
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setLocalError("Hãy nhập tên truyện.");
      return;
    }

    setLocalError("");
    await onSubmit({
      ...form,
      slug: slugify(form.title),
    });
  }

  return (
    <section className="data-card max-w-[1120px] overflow-hidden rounded-2xl p-0">
      <div className="border-b border-border px-6 py-5">
        <h2 className="text-xl font-semibold text-foreground">
          {isEdit ? "Sửa truyện" : "Tạo truyện mới"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? "Cập nhật thông tin truyện, ảnh bìa và tag."
            : "Điền thông tin chính để tạo truyện. Chương sẽ được quản lý ở bước tiếp theo."}
        </p>
      </div>

      <div className="space-y-5 px-6 py-6">

        {localError || submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || submitError}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[220px_1fr] xl:items-stretch">
          <aside className="w-full shrink-0">
            <section className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex-1 overflow-hidden rounded-xl border border-border bg-surface-muted">
                <div className="relative h-full min-h-0 w-full">
                  {coverBlobUrl ? (
                    <img
                      src={coverBlobUrl}
                      alt="Xem trước ảnh bìa"
                      className="h-full w-full object-cover"
                    />
                  ) : existingCoverUrl ? (
                    <label className="relative block h-full cursor-pointer">
                      <img
                        src={existingCoverUrl}
                        alt="Ảnh bìa hiện tại"
                        className="h-full w-full object-cover"
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => void handleCoverFileChange(event)}
                      />
                    </label>
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
                        onChange={(event) => void handleCoverFileChange(event)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {form.coverFile ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, coverFile: null }));
                      setCoverRatioWarning("");
                    }}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
                  >
                    Bỏ ảnh
                  </button>
                </div>
              ) : null}

              {coverRatioWarning ? (
                <p className="text-xs text-amber-700">{coverRatioWarning}</p>
              ) : null}
            </section>
          </aside>

          <div className="min-w-0">
            <section className="h-full rounded-2xl border border-border bg-white p-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Thông tin cơ bản</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Tên truyện</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => {
                        const nextTitle = event.target.value;
                        return {
                          ...current,
                          title: nextTitle,
                          slug: slugify(nextTitle),
                        };
                      })
                    }
                    placeholder="Nhập tên truyện..."
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Slug</span>
                  <input
                    value={slugify(form.title)}
                    readOnly
                    placeholder="ten-truyen-cua-ban"
                    className="w-full cursor-not-allowed rounded-lg border border-border bg-surface-muted px-3 py-2.5 font-mono text-sm text-muted-foreground outline-none"
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
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            </section>
          </div>

          <div className="hidden xl:block" aria-hidden="true" />

          <section className="rounded-2xl border border-border bg-white p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">Tags</h3>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              {tags.map((tag) => {
                const checked = form.tagIds.includes(tag.id);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={!tag.isActive}
                    onClick={() =>
                      setForm((current) => {
                        const nextTagIds = checked
                          ? current.tagIds.filter((id) => id !== tag.id)
                          : [...current.tagIds, tag.id];

                        return {
                          ...current,
                          tagIds: [...new Set(nextTagIds)],
                        };
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      checked
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-surface-muted text-foreground hover:bg-white"
                    } ${!tag.isActive ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <span className="font-medium text-foreground">Thêm tag mới (tuỳ chọn)</span>
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
                placeholder="Ví dụ: cưới trước yêu sau, học đường (tách bằng dấu phẩy)"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-5">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? isEdit
                ? "Đang lưu..."
                : "Đang tạo..."
              : isEdit
                ? "Lưu thay đổi"
                : "Tạo truyện"}
          </button>
        </div>
      </div>
    </section>
  );
}

