"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createGenre,
  getAdminGenres,
  updateGenre,
} from "@/features/genres/services/genres-service";
import type { GenreItem, GenrePayload } from "@/features/genres/types";

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

function buildEmptyGenreForm(): GenrePayload {
  return {
    name: "",
    slug: "",
    description: "",
    isActive: true,
  };
}

function buildEditForm(genre: GenreItem): GenrePayload {
  return {
    name: genre.name,
    slug: genre.slug,
    description: genre.description ?? "",
    isActive: genre.isActive,
  };
}

export function GenresTable() {
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGenreId, setEditingGenreId] = useState("");
  const [isSavingGenre, setIsSavingGenre] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createForm, setCreateForm] = useState<GenrePayload>(buildEmptyGenreForm);
  const [editForm, setEditForm] = useState<GenrePayload | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGenres() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const rows = await getAdminGenres(searchQuery);
        if (!isMounted) return;
        setGenres(rows);
      } catch (error) {
        if (!isMounted) return;
        setGenres([]);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải danh sách thể loại.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGenres();

    return () => {
      isMounted = false;
    };
  }, [searchQuery]);

  const activeCount = useMemo(
    () => genres.filter((genre) => genre.isActive).length,
    [genres],
  );

  async function refreshGenres() {
    const rows = await getAdminGenres(searchQuery);
    setGenres(rows);
  }

  function startEditing(genre: GenreItem) {
    setEditingGenreId(genre.id);
    setEditForm(buildEditForm(genre));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function cancelEditing() {
    setEditingGenreId("");
    setEditForm(null);
  }

  async function handleCreateGenre() {
    if (!createForm.name.trim()) {
      setErrorMessage("Hãy nhập tên thể loại.");
      return;
    }

    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await createGenre({
        ...createForm,
        slug: createForm.slug.trim() || slugify(createForm.name),
      });
      await refreshGenres();
      setCreateForm(buildEmptyGenreForm());
      setSuccessMessage("Đã tạo thể loại mới.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể tạo thể loại.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveGenre(genreId: string) {
    if (!editForm) return;

    setIsSavingGenre(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateGenre(genreId, {
        ...editForm,
        slug: editForm.slug.trim() || slugify(editForm.name),
      });
      await refreshGenres();
      cancelEditing();
      setSuccessMessage("Đã cập nhật thể loại.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật thể loại.",
      );
    } finally {
      setIsSavingGenre(false);
    }
  }

  async function handleToggleGenre(genre: GenreItem) {
    setIsSavingGenre(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateGenre(genre.id, {
        name: genre.name,
        slug: genre.slug,
        description: genre.description ?? "",
        isActive: !genre.isActive,
      });
      await refreshGenres();
      setSuccessMessage(
        genre.isActive ? "Đã tắt thể loại." : "Đã bật lại thể loại.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật trạng thái thể loại.",
      );
    } finally {
      setIsSavingGenre(false);
    }
  }

  return (
    <section className="space-y-4">
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{genres.length} thể loại</span>
          <span>•</span>
          <span>{activeCount} đang hoạt động</span>
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
              placeholder="Tìm theo tên hoặc slug thể loại"
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
            onClick={() => {
              setIsCreateOpen((current) => !current);
              setErrorMessage("");
              setSuccessMessage("");
              if (isCreateOpen) {
                setCreateForm(buildEmptyGenreForm());
              }
            }}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            {isCreateOpen ? "Đóng form" : "Tạo thể loại"}
          </button>
        </div>
      </div>

      {isCreateOpen ? (
        <section className="data-card max-w-[980px] p-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Tạo thể loại mới</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tạo trước tên, slug, mô tả và trạng thái để dùng ngay cho truyện.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Tên thể loại</span>
                <input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => {
                      const nextName = event.target.value;
                      const shouldSyncSlug =
                        current.slug.trim().length === 0 ||
                        current.slug === slugify(current.name);

                      return {
                        ...current,
                        name: nextName,
                        slug: shouldSyncSlug ? slugify(nextName) : current.slug,
                      };
                    })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>

              <label className="space-y-1.5 text-sm">
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
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Mô tả</span>
                <textarea
                  rows={4}
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

              <div className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái</span>
                <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Hoạt động ngay
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCreateGenre}
                disabled={isCreating}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCreating ? "Đang tạo..." : "Tạo thể loại"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="data-card overflow-hidden">
        <div className="grid grid-cols-[1.1fr_1fr_0.8fr_1.2fr_0.9fr] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-sm font-medium text-muted-foreground">
          <span>Tên thể loại</span>
          <span>Slug</span>
          <span>Trạng thái</span>
          <span>Mô tả</span>
          <span>Thao tác</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            Đang tải danh sách thể loại...
          </div>
        ) : genres.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            Chưa có thể loại nào để hiển thị.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {genres.map((genre) => {
              const isEditing = editingGenreId === genre.id && editForm !== null;

              return (
                <div key={genre.id} className="px-5 py-4 text-sm">
                  {!isEditing ? (
                    <div className="grid grid-cols-[1.1fr_1fr_0.8fr_1.2fr_0.9fr] gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{genre.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{genre.id}</p>
                      </div>

                      <span className="truncate text-foreground">/{genre.slug}</span>

                      <span
                        className={`justify-self-start rounded-full px-3 py-1 text-xs font-medium ${
                          genre.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {genre.isActive ? "Đang hoạt động" : "Đang tắt"}
                      </span>

                      <p className="text-muted-foreground">
                        {genre.description?.trim().length
                          ? genre.description
                          : "Chưa có mô tả cho thể loại này."}
                      </p>

                      <div className="flex flex-wrap justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(genre)}
                          disabled={isSavingGenre}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleGenre(genre)}
                          disabled={isSavingGenre}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {genre.isActive ? "Tắt" : "Bật"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-surface-muted p-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Tên thể loại</span>
                          <input
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => {
                                if (!current) return current;
                                const nextName = event.target.value;
                                const shouldSyncSlug =
                                  current.slug.trim().length === 0 ||
                                  current.slug === slugify(current.name);

                                return {
                                  ...current,
                                  name: nextName,
                                  slug: shouldSyncSlug ? slugify(nextName) : current.slug,
                                };
                              })
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                          />
                        </label>

                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Slug</span>
                          <input
                            value={editForm.slug}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      slug: slugify(event.target.value),
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                          />
                        </label>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                        <label className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Mô tả</span>
                          <textarea
                            rows={4}
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      description: event.target.value,
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                          />
                        </label>

                        <div className="space-y-1.5 text-sm">
                          <span className="font-medium text-foreground">Trạng thái</span>
                          <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={editForm.isActive}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        isActive: event.target.checked,
                                      }
                                    : current,
                                )
                              }
                            />
                            Đang hoạt động
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSavingGenre}
                          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveGenre(genre.id)}
                          disabled={isSavingGenre}
                          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSavingGenre ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
