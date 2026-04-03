"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  createChapter,
  deleteChapter,
  getChaptersByStory,
  moveChapter,
  updateChapter,
} from "@/features/chapters/services/chapters-service";
import type {
  CreateChapterPayload,
  ChapterListItem,
  ChapterStatus,
  UpdateChapterPayload,
} from "@/features/chapters/types";
import { getAdminStories } from "@/features/stories/services/stories-service";
import type { StoryListItem } from "@/features/stories/types";

function formatDate(value: string | null) {
  if (!value) return "Chưa xuất bản";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: ChapterStatus) {
  return status === "published" ? "Đã xuất bản" : "Bản nháp";
}

function statusClass(status: ChapterStatus) {
  return status === "published"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function createChapterForm(chapter: ChapterListItem): UpdateChapterPayload {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    content: chapter.content,
    status: chapter.status,
  };
}

function createEmptyChapterForm(nextChapterNumber: number): CreateChapterPayload {
  return {
    chapterNumber: nextChapterNumber,
    title: "",
    content: "",
    status: "draft",
  };
}

export function ChaptersManager() {
  const searchParams = useSearchParams();
  const [stories, setStories] = useState<StoryListItem[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingChapterId, setEditingChapterId] = useState("");
  const [chapterForm, setChapterForm] = useState<UpdateChapterPayload | null>(null);
  const [isSavingChapter, setIsSavingChapter] = useState(false);
  const [deletingChapterId, setDeletingChapterId] = useState("");
  const [movingChapterId, setMovingChapterId] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateChapterPayload>(
    createEmptyChapterForm(1),
  );
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const preferredStoryId = searchParams.get("storyId") || "";

  useEffect(() => {
    let isMounted = true;

    async function loadStories() {
      setIsLoadingStories(true);
      setErrorMessage("");

      try {
        const response = await getAdminStories({ status: "all" });
        if (!isMounted) return;

        setStories(response);
        const initialStoryId =
          preferredStoryId && response.some((story) => story.id === preferredStoryId)
            ? preferredStoryId
            : response[0]?.id || "";
        setSelectedStoryId(initialStoryId);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách truyện.",
        );
      } finally {
        if (isMounted) setIsLoadingStories(false);
      }
    }

    loadStories();

    return () => {
      isMounted = false;
    };
  }, [preferredStoryId]);

  useEffect(() => {
    if (!selectedStoryId) {
      setChapters([]);
      return;
    }

    let isMounted = true;

    async function loadChapters() {
      setIsLoadingChapters(true);
      setErrorMessage("");

      try {
        const response = await getChaptersByStory(selectedStoryId);
        if (!isMounted) return;
        setChapters(response);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách chương.",
        );
      } finally {
        if (isMounted) setIsLoadingChapters(false);
      }
    }

    loadChapters();

    return () => {
      isMounted = false;
    };
  }, [selectedStoryId]);

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [stories, selectedStoryId],
  );

  const nextChapterNumber = useMemo(() => {
    if (chapters.length === 0) return 1;
    return chapters
      .map((chapter) => chapter.chapterNumber)
      .reduce((max, current) => (current > max ? current : max)) + 1;
  }, [chapters]);

  useEffect(() => {
    setCreateForm((current) => {
      if (current.chapterNumber > 0 && current.title.trim().length > 0) {
        return current;
      }
      return createEmptyChapterForm(nextChapterNumber);
    });
  }, [nextChapterNumber]);

  function startEditing(chapter: ChapterListItem) {
    setEditingChapterId(chapter.id);
    setChapterForm(createChapterForm(chapter));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelEditing() {
    setEditingChapterId("");
    setChapterForm(null);
  }

  function openCreateForm() {
    setCreateForm(createEmptyChapterForm(nextChapterNumber));
    setIsCreateOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeCreateForm() {
    setIsCreateOpen(false);
    setCreateForm(createEmptyChapterForm(nextChapterNumber));
  }

  async function refreshChapters() {
    const refreshed = await getChaptersByStory(selectedStoryId);
    setChapters(refreshed);
  }

  async function handleSaveChapter() {
    if (!editingChapterId || !chapterForm) return;

    setIsSavingChapter(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateChapter(editingChapterId, chapterForm);
      await refreshChapters();
      cancelEditing();
      setSuccessMessage("Đã cập nhật chương.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật chương.",
      );
    } finally {
      setIsSavingChapter(false);
    }
  }

  async function handleDeleteChapter(chapter: ChapterListItem) {
    const confirmed = window.confirm(
      `Xóa chương ${chapter.chapterNumber} - ${chapter.title}? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setDeletingChapterId(chapter.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteChapter(chapter.id);
      await refreshChapters();

      if (editingChapterId === chapter.id) {
        cancelEditing();
      }

      setSuccessMessage("Đã xóa chương.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể xóa chương.",
      );
    } finally {
      setDeletingChapterId("");
    }
  }

  async function handleMoveChapter(chapter: ChapterListItem, direction: "up" | "down") {
    setMovingChapterId(chapter.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await moveChapter(chapter.id, direction);
      await refreshChapters();
      setSuccessMessage("Đã đổi vị trí chương.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể đổi vị trí chương.",
      );
    } finally {
      setMovingChapterId("");
    }
  }

  async function handleCreateChapter() {
    if (!selectedStoryId) return;

    setIsCreatingChapter(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createChapter(selectedStoryId, createForm);
      await refreshChapters();
      closeCreateForm();
      setSuccessMessage("Đã tạo chương mới.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể tạo chương.",
      );
    } finally {
      setIsCreatingChapter(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="data-card max-w-[980px] p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-white p-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Chọn truyện</span>
                <select
                  value={selectedStoryId}
                  onChange={(event) => {
                    setSelectedStoryId(event.target.value);
                    cancelEditing();
                  }}
                  disabled={isLoadingStories || stories.length === 0}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-surface-muted"
                >
                  {stories.length === 0 ? (
                    <option value="">Chưa có truyện</option>
                  ) : (
                    stories.map((story) => (
                      <option key={story.id} value={story.id}>
                        {story.title}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Slug</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedStory?.slug || "--"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trạng thái</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedStory?.status || "--"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tổng chương</p>
                <p className="mt-1 text-sm font-medium text-foreground">{chapters.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-muted px-3 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Sửa chương</p>
            <p className="mt-2 leading-6">
              Chọn một chương trong danh sách bên dưới để sửa số chương, tiêu đề, nội dung và
              trạng thái.
            </p>
          </div>
        </div>
      </section>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Danh sách chương</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {isLoadingChapters ? "Đang tải..." : `${chapters.length} chương`}
            </span>
            <button
              type="button"
              onClick={openCreateForm}
              disabled={!selectedStoryId || isLoadingChapters}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              Tạo chương
            </button>
          </div>
        </div>

        {isCreateOpen ? (
          <section className="data-card p-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Tạo chương mới</h3>
                <p className="text-sm text-muted-foreground">
                  Truyện đang chọn: {selectedStory?.title || "--"}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_180px]">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Số chương</span>
                  <input
                    type="number"
                    min={1}
                    value={createForm.chapterNumber}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        chapterNumber: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Tiêu đề</span>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Trạng thái</span>
                  <select
                    value={createForm.status}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        status: event.target.value as ChapterStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã xuất bản</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Nội dung</span>
                <textarea
                  value={createForm.content}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  rows={10}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={isCreatingChapter}
                  className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateChapter}
                  disabled={isCreatingChapter}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingChapter ? "Đang tạo..." : "Tạo chương"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {isLoadingStories || isLoadingChapters ? (
          <div className="data-card px-4 py-6 text-sm text-muted-foreground">
            Đang tải danh sách chương...
          </div>
        ) : !selectedStoryId ? (
          <div className="data-card px-4 py-6 text-sm text-muted-foreground">
            Chọn một truyện để xem chương.
          </div>
        ) : chapters.length === 0 ? (
          <div className="data-card px-4 py-6 text-sm text-muted-foreground">
            Truyện này chưa có chương nào.
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map((chapter, index) => {
              const isEditing = editingChapterId === chapter.id && chapterForm;
              const isDeleting = deletingChapterId === chapter.id;
              const isMoving = movingChapterId === chapter.id;
              const canMoveUp = index > 0;
              const canMoveDown = index < chapters.length - 1;

              return (
                <article key={chapter.id} className="data-card p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        Chương {chapter.chapterNumber} - {chapter.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Cập nhật: {formatDate(chapter.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(chapter, "up")}
                        disabled={!canMoveUp || isMoving || isDeleting || isSavingChapter}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveChapter(chapter, "down")}
                        disabled={!canMoveDown || isMoving || isDeleting || isSavingChapter}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <span
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${statusClass(chapter.status)}`}
                      >
                        {statusLabel(chapter.status)}
                      </span>
                      <span className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground">
                        Xuất bản: {formatDate(chapter.publishedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(chapter)}
                        disabled={isDeleting || isMoving}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(chapter)}
                        disabled={isDeleting || isSavingChapter || isMoving}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isDeleting ? "Đang xóa..." : "Xóa"}
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_180px]">
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Số chương</span>
                          <input
                            type="number"
                            min={1}
                            value={chapterForm.chapterNumber}
                            onChange={(event) =>
                              setChapterForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      chapterNumber: Number(event.target.value),
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                          />
                        </label>

                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Tiêu đề</span>
                          <input
                            type="text"
                            value={chapterForm.title}
                            onChange={(event) =>
                              setChapterForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      title: event.target.value,
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                          />
                        </label>

                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Trạng thái</span>
                          <select
                            value={chapterForm.status}
                            onChange={(event) =>
                              setChapterForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      status: event.target.value as ChapterStatus,
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                          >
                            <option value="draft">Bản nháp</option>
                            <option value="published">Đã xuất bản</option>
                          </select>
                        </label>
                      </div>

                      <label className="mt-3 block space-y-1.5 text-sm">
                        <span className="font-medium text-foreground">Nội dung</span>
                        <textarea
                          value={chapterForm.content}
                          onChange={(event) =>
                            setChapterForm((current) =>
                              current
                                ? {
                                    ...current,
                                    content: event.target.value,
                                  }
                                : current,
                            )
                          }
                          rows={10}
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                        />
                      </label>

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSavingChapter}
                          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveChapter}
                          disabled={isSavingChapter}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSavingChapter ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
