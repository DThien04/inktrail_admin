"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  getGenres,
  getStoryDetail,
  updateStory,
} from "@/features/stories/services/stories-service";
import type {
  GenreOption,
  StoryDetail,
  StoryStatus,
  UpdateStoryPayload,
} from "@/features/stories/types";

const STATUS_LABELS: Record<StoryStatus, string> = {
  draft: "Bản nháp",
  published: "Đang phát hành",
  archived: "Lưu trữ",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatReadCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function buildInitialForm(story: StoryDetail): UpdateStoryPayload {
  return {
    title: story.title,
    slug: story.slug,
    description: story.description || "",
    coverFile: null,
    status: story.status,
    genreIds: story.genres.map((genre) => genre.id),
  };
}

async function getAspectRatioWarning(
  file: File,
  expectedRatio: number,
  label: string,
) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const ratio = await new Promise<number>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.width / image.height);
      image.onerror = () => reject(new Error("Khong the doc kich thuoc anh."));
      image.src = objectUrl;
    });

    const delta = Math.abs(ratio - expectedRatio);
    if (delta <= 0.18) return "";

    return `Anh ${label} nay lech kha nhieu so voi ty le khuyen cao, he thong van cho luu nhung anh co the bi crop hoac hien thi khong dep.`;
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function StoryDetailView({ slug }: { slug: string }) {
  const router = useRouter();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [form, setForm] = useState<UpdateStoryPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [coverRatioWarning, setCoverRatioWarning] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [storyResponse, genresResponse] = await Promise.all([
          getStoryDetail(slug),
          getGenres(),
        ]);

        if (!isMounted) return;

        setStory(storyResponse);
        setGenres(genresResponse);
        setForm(buildInitialForm(storyResponse));
      } catch (error) {
        if (!isMounted) return;

        setStory(null);
        setForm(null);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải chi tiết truyện.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const genresText = useMemo(() => {
    if (!story?.genres.length) return "Chưa gán thể loại";
    return story.genres.map((genre) => genre.name).join(", ");
  }, [story]);

  const coverPreview = useMemo(() => {
    if (form?.coverFile) {
      return URL.createObjectURL(form.coverFile);
    }

    return story?.coverUrl || "";
  }, [form?.coverFile, story?.coverUrl]);

  useEffect(() => {
    return () => {
      if (coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!story || !form) return;

    setIsSaving(true);
    setErrorMessage("");
    setSaveMessage("");

    try {
      const updatedStory = await updateStory(story.id, form);
      setStory(updatedStory);
      setForm(buildInitialForm(updatedStory));
      setIsEditing(false);
      setCoverRatioWarning("");
      setSaveMessage("Đã cập nhật truyện thành công.");
      if (updatedStory.slug !== slug) {
        router.replace(`/stories/${updatedStory.slug}`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật truyện.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    if (!story) return;
    setForm(buildInitialForm(story));
    setErrorMessage("");
    setSaveMessage("");
    setCoverRatioWarning("");
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          href="/stories"
          className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
        >
          Quay lại danh sách truyện
        </Link>
        <div className="data-card px-6 py-10 text-sm text-muted-foreground">
          Đang tải chi tiết truyện...
        </div>
      </div>
    );
  }

  if (errorMessage && !story) {
    return (
      <div className="space-y-6">
        <Link
          href="/stories"
          className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
        >
          Quay lại danh sách truyện
        </Link>
        <div className="data-card px-6 py-10 text-sm text-accent-strong">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!story || !form) {
    return (
      <div className="space-y-6">
        <Link
          href="/stories"
          className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
        >
          Quay lại danh sách truyện
        </Link>
        <div className="data-card px-6 py-10 text-sm text-accent-strong">
          Không tìm thấy truyện.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/stories"
          className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted"
        >
          Quay lại danh sách truyện
        </Link>

        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="story-edit-form"
                disabled={isSaving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setSaveMessage("");
                setIsEditing(true);
              }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
            >
              Chỉnh sửa truyện
            </button>
          )}
        </div>
      </div>

      {saveMessage ? (
        <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
          {saveMessage}
        </div>
      ) : null}

      {errorMessage && story ? (
        <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-accent-strong">
          {errorMessage}
        </div>
      ) : null}

      <section className="data-card p-6">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt={story.title}
                className="h-full min-h-[280px] w-full object-cover"
              />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Chưa có ảnh bìa
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-accent-strong">
                {STATUS_LABELS[story.status]}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {story.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">Slug: /{story.slug}</p>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                {story.description || "Truyện này chưa có mô tả."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface-muted px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Tác giả
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {story.author.displayName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{story.author.role}</p>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Số chương
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {story.chapterCount}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Lượt đọc
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {formatReadCount(story.readCount)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Cập nhật
                </p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {formatDate(story.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form
          id="story-edit-form"
          onSubmit={handleSubmit}
          className="data-card space-y-5 p-6"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chỉnh sửa truyện</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cập nhật thông tin hiển thị, trạng thái và ảnh bìa của truyện.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Tên truyện</span>
              <input
                value={form.title}
                disabled={!isEditing || isSaving}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          title: event.target.value,
                        }
                      : current,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
              />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Slug</span>
              <input
                value={form.slug}
                disabled={!isEditing || isSaving}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          slug: event.target.value,
                        }
                      : current,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
              />
            </label>
          </div>

          <div className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Ảnh bìa</span>
            <div className="space-y-3 rounded-xl border border-border bg-surface-muted p-3">
              <div className="flex flex-wrap gap-2">
                <label className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-white">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!isEditing || isSaving}
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0] || null;
                      const warning = file
                        ? await getAspectRatioWarning(file, 2 / 3, "bia")
                        : "";
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              coverFile: file,
                            }
                          : current,
                      );
                      setCoverRatioWarning(warning);
                      event.currentTarget.value = "";
                    }}
                  />
                  Chọn ảnh bìa
                </label>

                {coverPreview ? (
                  <a
                    href={coverPreview}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-white"
                  >
                    Mở ảnh bìa
                  </a>
                ) : null}

                <button
                  type="button"
                  disabled={!isEditing || isSaving || !form.coverFile}
                  onClick={() => {
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            coverFile: null,
                          }
                        : current,
                    );
                    setCoverRatioWarning("");
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Bỏ ảnh đã chọn
                </button>
              </div>

              {form.coverFile ? (
                <p className="text-sm text-muted-foreground">
                  Ảnh sẽ upload khi lưu: {form.coverFile.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa chọn ảnh mới. Nếu lưu lúc này, hệ thống sẽ giữ nguyên ảnh bìa hiện tại.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Khuyến cáo: dùng ảnh bìa dọc tỷ lệ 2:3, kích thước tốt nhất 900 x 1350 px.
              </p>
              {coverRatioWarning ? (
                <p className="text-xs text-amber-700">{coverRatioWarning}</p>
              ) : null}
            </div>
          </div>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Mô tả</span>
            <textarea
              rows={6}
              value={form.description}
              disabled={!isEditing || isSaving}
              onChange={(event) =>
                setForm((current) =>
                  current
                    ? {
                        ...current,
                        description: event.target.value,
                      }
                    : current,
                )
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Trạng thái</span>
              <select
                value={form.status}
                disabled={!isEditing || isSaving}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          status: event.target.value as StoryStatus,
                        }
                      : current,
                  )
                }
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đang phát hành</option>
                <option value="archived">Lưu trữ</option>
              </select>
            </label>

            <div className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Thể loại</span>
              <div className="rounded-lg border border-border bg-white px-3 py-3">
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
                          disabled={!isEditing || isSaving || !genre.isActive}
                          onChange={(event) =>
                            setForm((current) => {
                              if (!current) return current;

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
        </form>

        <div className="data-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Thông tin hiện tại</h2>

          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Thể loại</dt>
              <dd className="mt-1 text-foreground">{genresText}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mã truyện</dt>
              <dd className="mt-1 break-all text-foreground">{story.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Vai trò tác giả</dt>
              <dd className="mt-1 text-foreground">{story.author.role}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ảnh bìa hiện tại</dt>
              <dd className="mt-1 text-foreground">
                {story.coverUrl ? "Đã có ảnh bìa" : "Chưa có ảnh bìa"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Mô tả truyện</dt>
              <dd className="mt-1 whitespace-pre-wrap text-foreground">
                {story.description || "Truyện này chưa có mô tả để hiển thị."}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
