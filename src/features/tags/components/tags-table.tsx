"use client";

import { useCallback, useEffect, useState } from "react";
import { Pagination } from "@/components/ui/pagination";
import {
  deleteUnusedAdminTag,
  getAdminTags,
  mergeAdminTag,
  mergeAdminTagsBulk,
  updateAdminTag,
} from "@/features/tags/services/tags-service";
import type { AdminTagItem } from "@/features/tags/types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

type ModalMode = "rename" | "merge" | "merge_bulk" | "delete" | null;

export function TagsTable() {
  const [items, setItems] = useState<AdminTagItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [draftKeyword, setDraftKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeTag, setActiveTag] = useState<AdminTagItem | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");

  const [mergeTargetKeyword, setMergeTargetKeyword] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeTargetOptions, setMergeTargetOptions] = useState<AdminTagItem[]>([]);
  const [isLoadingMergeTargets, setIsLoadingMergeTargets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadTags = useCallback(async ({ reloading = false }: { reloading?: boolean } = {}) => {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);

    setErrorMessage("");
    try {
      const response = await getAdminTags({
        keyword,
        page,
        pageSize,
      });
      setItems(response.items);
      setTotalItems(response.total);
    } catch (error) {
      setItems([]);
      setTotalItems(0);
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "Không thể tải danh sách tag.",
      );
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }, [keyword, page, pageSize]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    setSelectedTagIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(draftKeyword.trim());
      setPage(1);
    }, 380);

    return () => window.clearTimeout(timer);
  }, [draftKeyword]);

  const canBulkMerge = selectedTagIds.length >= 2;

  function openRename(tag: AdminTagItem) {
    setActiveTag(tag);
    setRenameName(tag.name);
    setRenameDescription(tag.description ?? "");
    setModalError("");
    setModalMode("rename");
  }

  function openMerge(tag: AdminTagItem) {
    setActiveTag(tag);
    setMergeTargetKeyword("");
    setMergeTargetId("");
    setModalError("");
    setModalMode("merge");
  }

  function openBulkMerge() {
    setActiveTag(null);
    setMergeTargetKeyword("");
    setMergeTargetId("");
    setModalError("");
    setModalMode("merge_bulk");
  }

  function openDelete(tag: AdminTagItem) {
    setActiveTag(tag);
    setModalError("");
    setModalMode("delete");
  }

  function closeModal() {
    if (isSaving) return;
    setModalMode(null);
    setActiveTag(null);
    setModalError("");
  }

  useEffect(() => {
    if (modalMode !== "merge" && modalMode !== "merge_bulk") return;

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      setIsLoadingMergeTargets(true);
      try {
        const response = await getAdminTags({
          keyword: mergeTargetKeyword,
          page: 1,
          pageSize: 20,
        });
        if (!isMounted) return;
        const excludedIds = new Set<string>([
          ...(activeTag ? [activeTag.id] : []),
          ...(modalMode === "merge_bulk" ? selectedTagIds : []),
        ]);
        setMergeTargetOptions(response.items.filter((item) => !excludedIds.has(item.id)));
      } catch {
        if (!isMounted) return;
        setMergeTargetOptions([]);
      } finally {
        if (!isMounted) return;
        setIsLoadingMergeTargets(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [mergeTargetKeyword, modalMode, activeTag, selectedTagIds]);

  async function submitRename() {
    if (!activeTag) return;
    setIsSaving(true);
    setModalError("");
    try {
      await updateAdminTag({
        tagId: activeTag.id,
        name: renameName,
        description: renameDescription,
      });
      closeModal();
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể cập nhật tag.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitMerge() {
    if (!activeTag) return;
    if (!mergeTargetId) {
      setModalError("Vui lòng chọn tag đích để gộp vào.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await mergeAdminTag({
        fromTagId: activeTag.id,
        toTagId: mergeTargetId,
      });
      closeModal();
      setPage(1);
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể gộp tag.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitBulkMerge() {
    if (selectedTagIds.length < 2) {
      setModalError("Vui lòng chọn ít nhất 2 tag để gộp.");
      return;
    }
    if (!mergeTargetId) {
      setModalError("Vui lòng chọn tag đích để gộp vào.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await mergeAdminTagsBulk({
        fromTagIds: selectedTagIds,
        toTagId: mergeTargetId,
      });
      closeModal();
      setSelectedTagIds([]);
      setPage(1);
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể gộp tag.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitDelete() {
    if (!activeTag) return;
    setIsSaving(true);
    setModalError("");
    try {
      await deleteUnusedAdminTag({ tagId: activeTag.id });
      closeModal();
      if (items.length === 1 && page > 1) setPage(page - 1);
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể xóa tag.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <input
              type="search"
              value={draftKeyword}
              onChange={(event) => setDraftKeyword(event.target.value)}
              placeholder="Tìm tag theo tên..."
              className="h-10 w-full rounded-xl border border-border bg-white px-4 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent"
            />
            {draftKeyword.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setDraftKeyword("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                aria-label="Xóa tìm kiếm"
                title="Xóa"
              >
                ×
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {selectedTagIds.length > 0 ? (
              <button
                type="button"
                onClick={openBulkMerge}
                disabled={!canBulkMerge}
                className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  canBulkMerge
                    ? "Gộp các tag đã chọn"
                    : "Cần chọn ít nhất 2 tag để gộp"
                }
              >
                Gộp đã chọn ({selectedTagIds.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadTags({ reloading: true })}
              disabled={isReloading}
              aria-label="Tải lại danh sách tag"
              title="Tải lại"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 ${isReloading ? "animate-[spin_0.55s_linear_infinite]" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedTagIds.length === items.length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedTagIds(items.map((item) => item.id));
                      } else {
                        setSelectedTagIds([]);
                      }
                    }}
                    aria-label="Chọn tất cả tag trong trang"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Tag</th>
                <th className="px-4 py-3 font-semibold">Mô tả</th>
                <th className="px-4 py-3 font-semibold">Số truyện</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Đang tải danh sách tag...
                  </td>
                </tr>
              ) : totalItems === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Không có tag phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((tag) => (
                  <tr key={tag.id} className="border-t border-border/70">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedTagIds((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
                          } else {
                            setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id));
                          }
                        }}
                        aria-label={`Chọn tag #${tag.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">#{tag.name}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tag.description ? tag.description : "--"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{tag.usageCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(tag.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openRename(tag)}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                        >
                          Đổi tên
                        </button>
                        <button
                          type="button"
                          onClick={() => openMerge(tag)}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                        >
                          Gộp
                        </button>
                        <button
                          type="button"
                          disabled={tag.usageCount > 0}
                          onClick={() => openDelete(tag)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                          title={tag.usageCount > 0 ? "Tag đang được dùng, hãy gộp trước khi xóa." : "Xóa tag"}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          itemLabel="tag"
        />
      </div>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {modalMode === "rename"
                    ? "Cập nhật tag"
                    : modalMode === "merge"
                      ? "Gộp tag"
                      : modalMode === "merge_bulk"
                        ? "Gộp nhiều tag"
                      : "Xóa tag"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {modalMode === "merge_bulk"
                    ? `Đã chọn: ${selectedTagIds.length} tag`
                    : activeTag
                      ? `Tag: #${activeTag.name}`
                      : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60"
                disabled={isSaving}
              >
                Đóng
              </button>
            </div>

            {modalMode === "rename" ? (
              <div className="mt-4 space-y-3">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Tên tag</span>
                  <input
                    value={renameName}
                    onChange={(event) => setRenameName(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="vd: tien_hiep"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Mô tả</span>
                  <textarea
                    value={renameDescription}
                    onChange={(event) => setRenameDescription(event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="Mô tả (tùy chọn)"
                  />
                </label>
              </div>
            ) : null}

            {modalMode === "merge" || modalMode === "merge_bulk" ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {modalMode === "merge_bulk"
                    ? "Gộp sẽ chuyển toàn bộ truyện của các tag đã chọn sang tag đích và xóa các tag nguồn."
                    : "Gộp sẽ chuyển toàn bộ truyện đang dùng tag này sang tag đích và xóa tag nguồn."}
                </p>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Tìm tag đích</span>
                  <input
                    value={mergeTargetKeyword}
                    onChange={(event) => setMergeTargetKeyword(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="Nhập để lọc nhanh..."
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Tag đích</span>
                  <select
                    value={mergeTargetId}
                    onChange={(event) => setMergeTargetId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="">-- Chọn tag --</option>
                    {isLoadingMergeTargets ? (
                      <option value="" disabled>
                        Đang tải...
                      </option>
                    ) : null}
                    {mergeTargetOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.name} ({item.usageCount})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {modalMode === "delete" ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Chỉ xóa được khi tag không còn truyện nào sử dụng.
                </p>
              </div>
            ) : null}

            {modalError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {modalError}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60"
              >
                Hủy
              </button>
              {modalMode === "rename" ? (
                <button
                  type="button"
                  onClick={() => void submitRename()}
                  disabled={isSaving}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {isSaving ? "Đang lưu..." : "Lưu"}
                </button>
              ) : null}
              {modalMode === "merge" ? (
                <button
                  type="button"
                  onClick={() => void submitMerge()}
                  disabled={isSaving}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {isSaving ? "Đang gộp..." : "Gộp tag"}
                </button>
              ) : null}
              {modalMode === "merge_bulk" ? (
                <button
                  type="button"
                  onClick={() => void submitBulkMerge()}
                  disabled={isSaving}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                >
                  {isSaving ? "Đang gộp..." : "Gộp các tag đã chọn"}
                </button>
              ) : null}
              {modalMode === "delete" ? (
                <button
                  type="button"
                  onClick={() => void submitDelete()}
                  disabled={isSaving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {isSaving ? "Đang xóa..." : "Xóa"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

