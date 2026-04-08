"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  createHomeBanner,
  deleteHomeBanner,
  getAdminHomeBanners,
  getPublishedStoryOptions,
  updateHomeBanner,
} from "@/features/banners/services/banners-service";
import type {
  BannerStoryOption,
  CreateBannerPayload,
  HomeBannerItem,
} from "@/features/banners/types";

function formatReadCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

async function getImageWarning(
  file: File,
  expectedRatio: number,
  label: string,
  recommendedWidth: number,
  recommendedHeight: number,
) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.width, height: image.height });
      image.onerror = () => reject(new Error("Không thể đọc kích thước ảnh."));
      image.src = objectUrl;
    });

    const messages: string[] = [];
    const ratio = size.width / size.height;

    if (Math.abs(ratio - expectedRatio) > 0.18) {
      messages.push(`Ảnh ${label} đang lệch khá nhiều so với tỷ lệ khuyến nghị.`);
    }

    if (size.width < recommendedWidth || size.height < recommendedHeight) {
      messages.push(
        `Kích thước hiện tại là ${size.width} x ${size.height}px, nhỏ hơn mức khuyến nghị ${recommendedWidth} x ${recommendedHeight}px.`,
      );
    }

    return messages.join(" ");
  } catch {
    return "";
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function EmptyPreview({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted px-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function PreviewFrame({
  src,
  alt,
  emptyLabel,
  className = "",
}: {
  src: string;
  alt: string;
  emptyLabel: string;
  className?: string;
}) {
  return (
    <div
      className={`h-full min-h-[150px] overflow-hidden rounded-xl border border-border bg-surface-muted ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <EmptyPreview label={emptyLabel} />
      )}
    </div>
  );
}

function FeedbackMessage({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "success";
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

export function BannersManager() {
  const [banners, setBanners] = useState<HomeBannerItem[]>([]);
  const [stories, setStories] = useState<BannerStoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createWarning, setCreateWarning] = useState("");
  const [createForm, setCreateForm] = useState<CreateBannerPayload>({
    storyId: "",
    sortOrder: 0,
    isActive: true,
    bannerFile: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [bannerRows, storyRows] = await Promise.all([
          getAdminHomeBanners(),
          getPublishedStoryOptions(),
        ]);

        if (!isMounted) return;

        setBanners(bannerRows);
        setStories(storyRows);

        const usedIds = new Set(bannerRows.map((item) => item.story?.id).filter(Boolean));
        const nextStory = storyRows.find((story) => !usedIds.has(story.id));

        setCreateForm((current) => ({
          ...current,
          storyId: current.storyId || nextStory?.id || "",
          sortOrder: bannerRows.length,
        }));
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải dữ liệu banner.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const usedStoryIds = useMemo(
    () => new Set(banners.map((item) => item.story?.id).filter(Boolean) as string[]),
    [banners],
  );

  const availableStories = useMemo(
    () => stories.filter((story) => !usedStoryIds.has(story.id)),
    [stories, usedStoryIds],
  );

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === createForm.storyId) ?? null,
    [stories, createForm.storyId],
  );

  const createPreviewUrl = useMemo(() => {
    if (createForm.bannerFile) {
      return URL.createObjectURL(createForm.bannerFile);
    }

    return selectedStory?.coverUrl || "";
  }, [createForm.bannerFile, selectedStory?.coverUrl]);

  useEffect(() => {
    return () => {
      if (createPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(createPreviewUrl);
      }
    };
  }, [createPreviewUrl]);

  async function handleCreateBanner() {
    if (!createForm.storyId) {
      setErrorMessage("Hãy chọn một truyện để thêm vào banner.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const nextBanners = await createHomeBanner(createForm);
      const nextUsedIds = new Set(nextBanners.map((item) => item.story?.id).filter(Boolean));
      const nextStory = stories.find((story) => !nextUsedIds.has(story.id));

      setBanners(nextBanners);
      setCreateForm({
        storyId: nextStory?.id || "",
        sortOrder: nextBanners.length,
        isActive: true,
        bannerFile: null,
      });
      setCreateWarning("");
      setSuccessMessage("Đã thêm banner mới.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "Không thể tạo banner.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveBanner(
    bannerId: string,
    payload: { sortOrder: number; isActive: boolean; bannerFile: File | null },
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const nextBanners = await updateHomeBanner(bannerId, payload);
      setBanners(nextBanners);
      setSuccessMessage("Đã cập nhật banner.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật banner.",
      );
    }
  }

  async function handleMoveBanner(bannerId: string, direction: "up" | "down") {
    const currentIndex = banners.findIndex((item) => item.id === bannerId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const currentBanner = banners[currentIndex];
    const targetBanner = banners[targetIndex];

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateHomeBanner(currentBanner.id, {
        sortOrder: targetBanner.sortOrder,
        isActive: currentBanner.isActive,
        bannerFile: null,
      });

      const nextBanners = await updateHomeBanner(targetBanner.id, {
        sortOrder: currentBanner.sortOrder,
        isActive: targetBanner.isActive,
        bannerFile: null,
      });

      setBanners(nextBanners);
      setSuccessMessage("Đã cập nhật thứ tự banner.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể đổi vị trí banner.",
      );
    }
  }

  async function handleDeleteBanner(bannerId: string) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const nextBanners = await deleteHomeBanner(bannerId);
      setBanners(nextBanners);
      setSuccessMessage("Đã xóa banner.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "Không thể xóa banner.",
      );
    }
  }

  return (
    <div className="space-y-5">
      {successMessage ? <FeedbackMessage message={successMessage} tone="success" /> : null}
      {errorMessage ? <FeedbackMessage message={errorMessage} tone="error" /> : null}

      <section className="data-card p-4">
        <div className="grid gap-4 xl:grid-cols-[60%_40%]">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Thêm banner mới</h2>
              <p className="text-sm text-muted-foreground">
                Chọn truyện đã xuất bản và thêm ảnh banner riêng nếu cần.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="font-medium text-foreground">Truyện</span>
                <select
                  value={createForm.storyId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      storyId: event.target.value,
                    }))
                  }
                  disabled={isSubmitting || availableStories.length === 0}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
                >
                  {availableStories.length === 0 ? (
                    <option value="">Không còn truyện phù hợp</option>
                  ) : (
                    availableStories.map((story) => (
                      <option key={story.id} value={story.id}>
                        {story.title}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Thứ tự hiển thị</span>
                <input
                  type="number"
                  min={0}
                  value={createForm.sortOrder}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value),
                    }))
                  }
                  disabled={isSubmitting}
                  className="h-[46px] w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
                />
              </label>

              <div className="text-sm">
                                <label className="flex h-[46px] items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    disabled={isSubmitting}
                  />
                  Kích hoạt ngay
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isSubmitting}
                    onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                      const input = event.currentTarget;
                      const file = input.files?.[0] || null;
                      const warning = file
                        ? await getImageWarning(file, 1400 / 800, "banner", 1400, 800)
                        : "";

                      setCreateForm((current) => ({
                        ...current,
                        bannerFile: file,
                      }));
                      setCreateWarning(warning);
                      input.value = "";
                    }}
                  />
                  Tải ảnh banner
                </label>

                <button
                  type="button"
                  disabled={isSubmitting || !createForm.bannerFile}
                  onClick={() => {
                    setCreateForm((current) => ({
                      ...current,
                      bannerFile: null,
                    }));
                    setCreateWarning("");
                  }}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Bỏ ảnh đã chọn
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || availableStories.length === 0}
                  onClick={handleCreateBanner}
                  className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Đang tạo..." : "Thêm banner"}
                </button>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p>
                  {createForm.bannerFile
                    ? `Ảnh sẽ upload khi tạo banner: ${createForm.bannerFile.name}`
                    : "Nếu không chọn ảnh riêng, banner sẽ dùng ảnh bìa truyện làm fallback."}
                </p>
                <p>Khuyến cáo: dùng ảnh ngang, kích thước tốt nhất 1400 x 800 px.</p>
                {createWarning ? <p className="text-amber-700">{createWarning}</p> : null}
              </div>
            </div>
          </div>

          <div className="xl:justify-self-stretch">
            <PreviewFrame
              src={createPreviewUrl}
              alt="Xem trước banner"
              emptyLabel="Chưa có ảnh banner"
              className="aspect-[7/4] w-full"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Banner hiện có</h2>
          <span className="text-sm text-muted-foreground">{banners.length} banner</span>
        </div>

        {isLoading ? (
          <div className="data-card px-4 py-6 text-sm text-muted-foreground">
            Đang tải danh sách banner...
          </div>
        ) : banners.length === 0 ? (
          <div className="data-card px-4 py-6 text-sm text-muted-foreground">
            Chưa có banner nào.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {banners.map((banner, index) => (
              <BannerRow
                key={banner.id}
                banner={banner}
                index={index}
                total={banners.length}
                canDelete={banners.length > 3}
                onSave={handleSaveBanner}
                onMove={handleMoveBanner}
                onDelete={handleDeleteBanner}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BannerRow({
  banner,
  index,
  total,
  canDelete,
  onSave,
  onMove,
  onDelete,
}: {
  banner: HomeBannerItem;
  index: number;
  total: number;
  canDelete: boolean;
  onSave: (
    bannerId: string,
    payload: { sortOrder: number; isActive: boolean; bannerFile: File | null },
  ) => Promise<void>;
  onMove: (bannerId: string, direction: "up" | "down") => Promise<void>;
  onDelete: (bannerId: string) => Promise<void>;
}) {
  const [isActive, setIsActive] = useState(banner.isActive);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setIsActive(banner.isActive);
  }, [banner.isActive]);

  const previewUrl = useMemo(() => {
    if (bannerFile) {
      return URL.createObjectURL(bannerFile);
    }

    return banner.bannerImageUrl || banner.story?.coverUrl || "";
  }, [banner.bannerImageUrl, banner.story?.coverUrl, bannerFile]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <article className="data-card h-full w-full p-3.5">
      <div className="grid gap-3 lg:grid-cols-[42%_58%] lg:items-stretch">
        <PreviewFrame
          src={previewUrl}
          alt={banner.story?.title || "Banner"}
          emptyLabel="Chưa có ảnh"
          className="aspect-[7/4] w-full"
        />

        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {banner.story?.title || "Không có truyện"}
            </h3>
            <p className="text-sm text-muted-foreground">
              /{banner.story?.slug || "--"} · {formatReadCount(banner.story?.readCount || 0)} lượt đọc
            </p>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-muted px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Vị trí hiển thị</span>

                <button
                  type="button"
                  disabled={isSaving || index === 0}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await onMove(banner.id, "up");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Đưa banner lên trên"
                >
                  ↑
                </button>

                <div className="min-w-[60px] rounded-lg border border-border bg-white px-3 py-2 text-center text-sm font-medium text-foreground">
                  #{index + 1}
                </div>

                <button
                  type="button"
                  disabled={isSaving || index === total - 1}
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await onMove(banner.id, "down");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Đưa banner xuống dưới"
                >
                  ↓
                </button>
              </div>
            </div>

            <label className="flex min-h-[52px] items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                disabled={isSaving}
              />
              Đang kích hoạt
            </label>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isSaving}
                  onChange={async (event: ChangeEvent<HTMLInputElement>) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0] || null;
                    const nextWarning = file
                      ? await getImageWarning(file, 1400 / 800, "banner", 1400, 800)
                      : "";

                    setBannerFile(file);
                    setWarning(nextWarning);
                    input.value = "";
                  }}
                />
                Đổi ảnh banner
              </label>

              <button
                type="button"
                disabled={isSaving || !bannerFile}
                onClick={() => {
                  setBannerFile(null);
                  setWarning("");
                }}
                className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Bỏ ảnh mới
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await onSave(banner.id, {
                      sortOrder: banner.sortOrder,
                      isActive,
                      bannerFile,
                    });
                    setBannerFile(null);
                    setWarning("");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Đang lưu..." : "Lưu"}
              </button>

              <button
                type="button"
                disabled={isSaving || !canDelete}
                onClick={async () => {
                  if (!canDelete) return;

                  setIsSaving(true);
                  try {
                    await onDelete(banner.id);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                Xóa
              </button>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <p>
                {bannerFile
                  ? `Sẽ cập nhật ảnh banner: ${bannerFile.name}`
                  : banner.bannerImageUrl
                    ? "Banner đang dùng ảnh banner riêng."
                    : "Banner đang dùng ảnh bìa truyện làm fallback."}
              </p>
              <p>Khuyến cáo: dùng ảnh ngang, kích thước tốt nhất 1400 x 800 px.</p>
              {warning ? <p className="text-amber-700">{warning}</p> : null}
              {!canDelete ? <p>Cần giữ ít nhất 3 banner nên hiện không thể xóa thêm.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

