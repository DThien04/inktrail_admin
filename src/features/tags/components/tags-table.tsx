"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { Pagination } from "@/components/ui/pagination";
import {
  createAdminTagGroup,
  deleteAdminTagGroup,
  deleteUnusedAdminTag,
  getAdminTagGroups,
  getAdminTags,
  mergeAdminTagsBulk,
  setAdminTagsGroupBulk,
  updateAdminTag,
  updateAdminTagGroup,
} from "@/features/tags/services/tags-service";
import type { AdminTagGroupItem, AdminTagItem } from "@/features/tags/types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

type ModalMode = "rename" | "merge" | "delete" | "groups" | "assign_group" | null;

type GroupSubModal = "create" | "edit" | "delete" | "manage_tags" | null;

const MANAGE_GROUP_TAGS_PAGE_SIZE = 30;

export function TagsTable() {
  const [items, setItems] = useState<AdminTagItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [keyword, setKeyword] = useState("");
  const [draftKeyword, setDraftKeyword] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [groupOptions, setGroupOptions] = useState<AdminTagGroupItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeTag, setActiveTag] = useState<AdminTagItem | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [renameName, setRenameName] = useState("");
  const [renameDescription, setRenameDescription] = useState("");
  const [renameGroupId, setRenameGroupId] = useState("");

  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignTargetTagIds, setAssignTargetTagIds] = useState<string[]>([]);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [groupSubModal, setGroupSubModal] = useState<GroupSubModal>(null);
  const [groupActionTarget, setGroupActionTarget] = useState<AdminTagGroupItem | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");

  const [manageInGroupDraftKw, setManageInGroupDraftKw] = useState("");
  const [manageInGroupKw, setManageInGroupKw] = useState("");
  const [manageInGroupPage, setManageInGroupPage] = useState(1);
  const [manageInGroupItems, setManageInGroupItems] = useState<AdminTagItem[]>([]);
  const [manageInGroupTotal, setManageInGroupTotal] = useState(0);
  const [manageInGroupLoading, setManageInGroupLoading] = useState(false);
  const [manageInGroupSelected, setManageInGroupSelected] = useState<string[]>([]);

  const [manageUngroupedDraftKw, setManageUngroupedDraftKw] = useState("");
  const [manageUngroupedKw, setManageUngroupedKw] = useState("");
  const [manageUngroupedPage, setManageUngroupedPage] = useState(1);
  const [manageUngroupedItems, setManageUngroupedItems] = useState<AdminTagItem[]>([]);
  const [manageUngroupedTotal, setManageUngroupedTotal] = useState(0);
  const [manageUngroupedLoading, setManageUngroupedLoading] = useState(false);
  const [manageUngroupedSelected, setManageUngroupedSelected] = useState<string[]>([]);

  const [mergeSourceDraftKeyword, setMergeSourceDraftKeyword] = useState("");
  const [mergeSourceKeyword, setMergeSourceKeyword] = useState("");
  const [mergeSourceOptions, setMergeSourceOptions] = useState<AdminTagItem[]>([]);
  const [isLoadingMergeSources, setIsLoadingMergeSources] = useState(false);
  const [mergeSourceSelectedIds, setMergeSourceSelectedIds] = useState<string[]>([]);

  const [mergeDestDraftKeyword, setMergeDestDraftKeyword] = useState("");
  const [mergeDestKeyword, setMergeDestKeyword] = useState("");
  const [mergeDestOptions, setMergeDestOptions] = useState<AdminTagItem[]>([]);
  const [isLoadingMergeDests, setIsLoadingMergeDests] = useState(false);
  const [mergeDestId, setMergeDestId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const refreshGroupOptions = useCallback(async () => {
    try {
      const response = await getAdminTagGroups({
        keyword: "",
        page: 1,
        pageSize: 500,
      });
      setGroupOptions(response.items);
    } catch {
      setGroupOptions([]);
    }
  }, []);

  useEffect(() => {
    void refreshGroupOptions();
  }, [refreshGroupOptions]);

  const loadTags = useCallback(async ({ reloading = false }: { reloading?: boolean } = {}) => {
    if (reloading) setIsReloading(true);
    else setIsLoading(true);

    setErrorMessage("");
    try {
      const response = await getAdminTags({
        keyword,
        groupId: filterGroupId || undefined,
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
  }, [keyword, filterGroupId, page, pageSize]);

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

  function openRename(tag: AdminTagItem) {
    setActiveTag(tag);
    setRenameName(tag.name);
    setRenameDescription(tag.description ?? "");
    setRenameGroupId(tag.group?.id ?? "");
    setModalError("");
    setModalMode("rename");
  }

  function openGroupsModal() {
    setModalError("");
    setGroupSubModal(null);
    setGroupActionTarget(null);
    setNewGroupName("");
    setNewGroupDesc("");
    setEditGroupName("");
    setEditGroupDesc("");
    resetManageTagsModalState();
    setModalMode("groups");
    void refreshGroupOptions();
  }

  function resetManageTagsModalState() {
    setManageInGroupDraftKw("");
    setManageInGroupKw("");
    setManageInGroupPage(1);
    setManageInGroupItems([]);
    setManageInGroupTotal(0);
    setManageInGroupSelected([]);
    setManageUngroupedDraftKw("");
    setManageUngroupedKw("");
    setManageUngroupedPage(1);
    setManageUngroupedItems([]);
    setManageUngroupedTotal(0);
    setManageUngroupedSelected([]);
  }

  function closeGroupSubModal() {
    if (isSaving) return;
    setGroupSubModal(null);
    setGroupActionTarget(null);
    setModalError("");
    setNewGroupName("");
    setNewGroupDesc("");
    setEditGroupName("");
    setEditGroupDesc("");
    resetManageTagsModalState();
  }

  function openGroupCreateModal() {
    setModalError("");
    setGroupActionTarget(null);
    resetManageTagsModalState();
    setNewGroupName("");
    setNewGroupDesc("");
    setGroupSubModal("create");
  }

  function openGroupEditModal(group: AdminTagGroupItem) {
    setModalError("");
    setGroupActionTarget(group);
    resetManageTagsModalState();
    setEditGroupName(group.name);
    setEditGroupDesc(group.description ?? "");
    setGroupSubModal("edit");
  }

  function openGroupDeleteModal(group: AdminTagGroupItem) {
    setModalError("");
    setGroupActionTarget(group);
    resetManageTagsModalState();
    setGroupSubModal("delete");
  }

  function openGroupManageTagsModal(group: AdminTagGroupItem) {
    setModalError("");
    setGroupActionTarget(group);
    resetManageTagsModalState();
    setGroupSubModal("manage_tags");
  }

  function openAssignGroupFromRow(tag: AdminTagItem) {
    setAssignTargetTagIds([tag.id]);
    setAssignGroupId(tag.group?.id ?? "");
    setModalError("");
    setModalMode("assign_group");
  }

  function resetMergeModalState() {
    setMergeSourceDraftKeyword("");
    setMergeSourceKeyword("");
    setMergeSourceOptions([]);
    setMergeSourceSelectedIds([]);
    setMergeDestDraftKeyword("");
    setMergeDestKeyword("");
    setMergeDestOptions([]);
    setMergeDestId("");
  }

  function openMergeModal(prefillSourceIds: string[]) {
    resetMergeModalState();
    setMergeSourceSelectedIds([...new Set(prefillSourceIds.filter(Boolean))]);
    setModalError("");
    setModalMode("merge");
  }

  function openMergeFromRow(tag: AdminTagItem) {
    openMergeModal([tag.id]);
  }

  function openMergeFromToolbar() {
    openMergeModal(selectedTagIds);
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
    setRenameGroupId("");
    setAssignGroupId("");
    setAssignTargetTagIds([]);
    setGroupSubModal(null);
    setGroupActionTarget(null);
    setNewGroupName("");
    setNewGroupDesc("");
    setEditGroupName("");
    setEditGroupDesc("");
    resetManageTagsModalState();
    resetMergeModalState();
  }

  useEffect(() => {
    if (modalMode !== "groups" || groupSubModal !== "manage_tags") return;
    const timer = window.setTimeout(() => {
      setManageInGroupKw(manageInGroupDraftKw.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [modalMode, groupSubModal, manageInGroupDraftKw]);

  useEffect(() => {
    if (modalMode !== "groups" || groupSubModal !== "manage_tags") return;
    const timer = window.setTimeout(() => {
      setManageUngroupedKw(manageUngroupedDraftKw.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [modalMode, groupSubModal, manageUngroupedDraftKw]);

  useEffect(() => {
    if (modalMode !== "groups" || groupSubModal !== "manage_tags") return;
    setManageInGroupPage(1);
  }, [modalMode, groupSubModal, manageInGroupKw]);

  useEffect(() => {
    if (modalMode !== "groups" || groupSubModal !== "manage_tags") return;
    setManageUngroupedPage(1);
  }, [modalMode, groupSubModal, manageUngroupedKw]);

  useEffect(() => {
    if (modalMode !== "groups" || groupSubModal !== "manage_tags" || !groupActionTarget) {
      return;
    }
    let cancelled = false;
    setManageInGroupLoading(true);
    void (async () => {
      try {
        const res = await getAdminTags({
          groupId: groupActionTarget.id,
          keyword: manageInGroupKw || undefined,
          page: manageInGroupPage,
          pageSize: MANAGE_GROUP_TAGS_PAGE_SIZE,
        });
        if (cancelled) return;
        setManageInGroupItems(res.items);
        setManageInGroupTotal(res.total);
      } catch {
        if (!cancelled) {
          setManageInGroupItems([]);
          setManageInGroupTotal(0);
        }
      } finally {
        if (!cancelled) setManageInGroupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    modalMode,
    groupSubModal,
    groupActionTarget,
    manageInGroupKw,
    manageInGroupPage,
  ]);

  useEffect(() => {
    if (modalMode !== "groups" || groupSubModal !== "manage_tags") {
      return;
    }
    let cancelled = false;
    setManageUngroupedLoading(true);
    void (async () => {
      try {
        const res = await getAdminTags({
          ungroupedOnly: true,
          keyword: manageUngroupedKw || undefined,
          page: manageUngroupedPage,
          pageSize: MANAGE_GROUP_TAGS_PAGE_SIZE,
        });
        if (cancelled) return;
        setManageUngroupedItems(res.items);
        setManageUngroupedTotal(res.total);
      } catch {
        if (!cancelled) {
          setManageUngroupedItems([]);
          setManageUngroupedTotal(0);
        }
      } finally {
        if (!cancelled) setManageUngroupedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalMode, groupSubModal, manageUngroupedKw, manageUngroupedPage]);

  useEffect(() => {
    if (modalMode !== "merge") return;
    const timer = window.setTimeout(() => {
      setMergeSourceKeyword(mergeSourceDraftKeyword.trim());
    }, 380);
    return () => window.clearTimeout(timer);
  }, [modalMode, mergeSourceDraftKeyword]);

  useEffect(() => {
    if (modalMode !== "merge") return;
    const timer = window.setTimeout(() => {
      setMergeDestKeyword(mergeDestDraftKeyword.trim());
    }, 380);
    return () => window.clearTimeout(timer);
  }, [modalMode, mergeDestDraftKeyword]);

  useEffect(() => {
    if (modalMode !== "merge") return;

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      setIsLoadingMergeSources(true);
      try {
        const response = await getAdminTags({
          keyword: mergeSourceKeyword,
          page: 1,
          pageSize: 40,
        });
        if (!isMounted) return;
        setMergeSourceOptions(response.items);
      } catch {
        if (!isMounted) return;
        setMergeSourceOptions([]);
      } finally {
        if (!isMounted) return;
        setIsLoadingMergeSources(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [modalMode, mergeSourceKeyword]);

  useEffect(() => {
    if (modalMode !== "merge") return;

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      setIsLoadingMergeDests(true);
      try {
        const response = await getAdminTags({
          keyword: mergeDestKeyword,
          page: 1,
          pageSize: 40,
        });
        if (!isMounted) return;
        const exclude = new Set(mergeSourceSelectedIds);
        setMergeDestOptions(response.items.filter((item) => !exclude.has(item.id)));
      } catch {
        if (!isMounted) return;
        setMergeDestOptions([]);
      } finally {
        if (!isMounted) return;
        setIsLoadingMergeDests(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [modalMode, mergeDestKeyword, mergeSourceSelectedIds]);

  async function submitRename() {
    if (!activeTag) return;
    setIsSaving(true);
    setModalError("");
    try {
      await updateAdminTag({
        tagId: activeTag.id,
        name: renameName,
        description: renameDescription,
        groupId: renameGroupId || null,
      });
      closeModal();
      void refreshGroupOptions();
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
    const fromIds = mergeSourceSelectedIds.filter((id) => id && id !== mergeDestId);
    if (fromIds.length === 0) {
      setModalError("Chọn ít nhất một tag nguồn (khác tag đích).");
      return;
    }
    if (!mergeDestId) {
      setModalError("Chọn một tag đích để gộp vào.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await mergeAdminTagsBulk({
        fromTagIds: fromIds,
        toTagId: mergeDestId,
      });
      closeModal();
      setSelectedTagIds([]);
      setPage(1);
      void refreshGroupOptions();
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể gộp tag.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitAssignGroup() {
    if (assignTargetTagIds.length === 0) return;
    setIsSaving(true);
    setModalError("");
    try {
      await setAdminTagsGroupBulk({
        tagIds: assignTargetTagIds,
        groupId: assignGroupId || null,
      });
      closeModal();
      setSelectedTagIds([]);
      void refreshGroupOptions();
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể gán nhóm.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitCreateGroup() {
    const name = newGroupName.trim();
    if (!name) {
      setModalError("Nhập tên nhóm.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await createAdminTagGroup({ name, description: newGroupDesc.trim() });
      closeGroupSubModal();
      await refreshGroupOptions();
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể tạo nhóm.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEditGroup() {
    if (!groupActionTarget) return;
    const name = editGroupName.trim();
    if (!name) {
      setModalError("Tên nhóm không được để trống.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      await updateAdminTagGroup({
        groupId: groupActionTarget.id,
        name,
        description: editGroupDesc.trim(),
      });
      closeGroupSubModal();
      await refreshGroupOptions();
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể cập nhật nhóm.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitDeleteGroup() {
    if (!groupActionTarget) return;
    setIsSaving(true);
    setModalError("");
    try {
      await deleteAdminTagGroup({ groupId: groupActionTarget.id });
      if (filterGroupId === groupActionTarget.id) setFilterGroupId("");
      closeGroupSubModal();
      await refreshGroupOptions();
      void loadTags({ reloading: true });
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể xóa nhóm.",
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

  async function reloadManageTagLists(groupId: string) {
    const [inGroupRes, ungroupedRes] = await Promise.all([
      getAdminTags({
        groupId,
        keyword: manageInGroupKw || undefined,
        page: manageInGroupPage,
        pageSize: MANAGE_GROUP_TAGS_PAGE_SIZE,
      }),
      getAdminTags({
        ungroupedOnly: true,
        keyword: manageUngroupedKw || undefined,
        page: manageUngroupedPage,
        pageSize: MANAGE_GROUP_TAGS_PAGE_SIZE,
      }),
    ]);
    setManageInGroupItems(inGroupRes.items);
    setManageInGroupTotal(inGroupRes.total);
    setManageUngroupedItems(ungroupedRes.items);
    setManageUngroupedTotal(ungroupedRes.total);
  }

  async function submitManageAddTagsToGroup() {
    if (!groupActionTarget || manageUngroupedSelected.length === 0) return;
    setIsSaving(true);
    setModalError("");
    try {
      await setAdminTagsGroupBulk({
        tagIds: manageUngroupedSelected,
        groupId: groupActionTarget.id,
      });
      setManageUngroupedSelected([]);
      await refreshGroupOptions();
      void loadTags({ reloading: true });
      await reloadManageTagLists(groupActionTarget.id);
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể thêm tag vào nhóm.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitManageRemoveFromGroup() {
    if (!groupActionTarget || manageInGroupSelected.length === 0) return;
    setIsSaving(true);
    setModalError("");
    try {
      await setAdminTagsGroupBulk({
        tagIds: manageInGroupSelected,
        groupId: null,
      });
      setManageInGroupSelected([]);
      await refreshGroupOptions();
      void loadTags({ reloading: true });
      await reloadManageTagLists(groupActionTarget.id);
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể gỡ tag khỏi nhóm.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitManageDeleteTagsHard() {
    if (!groupActionTarget || manageInGroupSelected.length === 0) return;
    const onPage = manageInGroupItems.filter((t) => manageInGroupSelected.includes(t.id));
    const missing = manageInGroupSelected.filter(
      (id) => !manageInGroupItems.some((t) => t.id === id),
    );
    if (missing.length > 0) {
      setModalError("Có tag đã chọn ở trang khác. Chọn lại trên trang hiện tại.");
      return;
    }
    if (onPage.some((t) => t.usageCount > 0)) {
      setModalError("Chỉ xóa được tag không có truyện. Tag đang dùng hãy gỡ khỏi nhóm.");
      return;
    }
    setIsSaving(true);
    setModalError("");
    try {
      for (const t of onPage) {
        await deleteUnusedAdminTag({ tagId: t.id });
      }
      setManageInGroupSelected([]);
      await refreshGroupOptions();
      void loadTags({ reloading: true });
      await reloadManageTagLists(groupActionTarget.id);
    } catch (error) {
      setModalError(
        error instanceof Error && error.message ? error.message : "Không thể xóa tag.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-[560px]">
            <input
              type="search"
              value={draftKeyword}
              onChange={(event) => setDraftKeyword(event.target.value)}
              placeholder="Tìm tag theo tên..."
              className="w-full rounded-xl border border-border bg-white px-4 py-2 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent"
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
          <select
            value={filterGroupId}
            onChange={(event) => {
              setFilterGroupId(event.target.value);
              setPage(1);
            }}
            className="w-full min-w-[11rem] rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent md:w-auto"
            aria-label="Lọc theo nhóm tag"
          >
            <option value="">Tất cả nhóm</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.tagCount})
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openGroupsModal}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted"
            >
              Quản lý nhóm
            </button>
            <button
              type="button"
              onClick={openMergeFromToolbar}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted"
              title={
                selectedTagIds.length > 0
                  ? `Mở gộp tag (đã chọn ${selectedTagIds.length} tag trên bảng)`
                  : "Gộp nhiều tag nguồn vào một tag đích"
              }
            >
              Gộp tag
              {selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ""}
            </button>
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
      </section>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="overflow-x-auto">
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
                <th
                  className="px-4 py-3 font-semibold"
                  title="Mỗi tag chỉ thuộc tối đa một nhóm."
                >
                  Nhóm
                </th>
                <th className="px-4 py-3 font-semibold">Mô tả</th>
                <th className="px-4 py-3 font-semibold">Số truyện</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Đang tải danh sách tag...
                  </td>
                </tr>
              ) : totalItems === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
                      {tag.group ? tag.group.name : "—"}
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
                          onClick={() => openAssignGroupFromRow(tag)}
                          className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                          title="Đặt nhóm cho tag này (mỗi tag chỉ một nhóm)."
                        >
                          Nhóm
                        </button>
                        <button
                          type="button"
                          onClick={() => openMergeFromRow(tag)}
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
          <div
            className={`w-full rounded-xl border border-border bg-white shadow-sm ${
              modalMode === "groups" && groupSubModal === "manage_tags"
                ? "max-w-6xl p-6"
                : modalMode === "merge"
                  ? "max-w-2xl p-5"
                  : modalMode === "groups" && !groupSubModal
                    ? "max-w-5xl p-6"
                    : "max-w-lg p-5"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {modalMode === "rename"
                    ? "Cập nhật tag"
                    : modalMode === "merge"
                      ? "Gộp tag"
                      : modalMode === "groups" && groupSubModal === "create"
                        ? "Tạo nhóm mới"
                        : modalMode === "groups" && groupSubModal === "edit"
                          ? "Sửa nhóm tag"
                          : modalMode === "groups" && groupSubModal === "delete"
                            ? "Xóa nhóm tag"
                            : modalMode === "groups" && groupSubModal === "manage_tags"
                              ? "Quản lý tag trong nhóm"
                              : modalMode === "groups"
                                ? "Quản lý nhóm tag"
                                : modalMode === "assign_group"
                                ? "Đặt nhóm cho tag"
                                : "Xóa tag"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {modalMode === "merge"
                    ? "Chọn một hoặc nhiều tag nguồn, rồi chọn đúng một tag đích. Các tag nguồn sẽ bị xóa sau khi gộp."
                    : modalMode === "assign_group"
                      ? `Mỗi tag chỉ thuộc một nhóm. Đang áp dụng cho ${assignTargetTagIds.length} tag (ghi đè nhóm cũ nếu có).`
                      : modalMode === "groups" && groupSubModal === "create"
                        ? "Nhập tên và mô tả (tùy chọn) cho nhóm mới."
                        : modalMode === "groups" && groupSubModal === "edit"
                          ? "Cập nhật tên hoặc mô tả nhóm."
                          : modalMode === "groups" && groupSubModal === "delete"
                            ? "Chỉ xóa được khi nhóm không còn tag nào."
                          : modalMode === "groups" && groupSubModal === "manage_tags" && groupActionTarget
                            ? `Nhóm “${groupActionTarget.name}”. Thêm tag chưa có nhóm, gỡ, hoặc xóa tag không còn truyện dùng.`
                          : modalMode === "groups"
                            ? "Tạo nhóm để phân loại tag trong admin (lọc, gán hàng loạt)."
                            : activeTag
                              ? `Tag: #${activeTag.name}`
                              : ""}
                </p>
              </div>
              {modalMode === "groups" && !groupSubModal ? (
                <ModalCloseButton onClick={closeModal} disabled={isSaving} />
              ) : null}
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
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Nhóm</span>
                  <select
                    value={renameGroupId}
                    onChange={(event) => setRenameGroupId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="">— Chưa gán nhóm —</option>
                    {groupOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <span className="block text-xs text-muted-foreground">
                    Mỗi tag chỉ thuộc tối đa một nhóm.
                  </span>
                </label>
              </div>
            ) : null}

            {modalMode === "assign_group" ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Chọn một nhóm bên dưới: tất cả tag trong lần này sẽ được gán <span className="font-medium text-foreground">cùng</span> nhóm đó
                  (hoặc bỏ nhóm). Không thể gán nhiều nhóm cho một tag.
                </p>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Nhóm áp dụng</span>
                  <select
                    value={assignGroupId}
                    onChange={(event) => setAssignGroupId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="">— Bỏ nhóm (không thuộc nhóm nào) —</option>
                    {groupOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {modalMode === "groups" && !groupSubModal ? (
              <div className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={openGroupCreateModal}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                  >
                    Thêm nhóm
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Tên nhóm</th>
                        <th className="px-3 py-2 font-semibold">Số tag</th>
                        <th className="px-3 py-2 font-semibold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupOptions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                            Chưa có nhóm. Nhấn Thêm nhóm để tạo.
                          </td>
                        </tr>
                      ) : (
                        groupOptions.map((g) => (
                          <tr key={g.id} className="border-t border-border/70">
                            <td className="px-3 py-2 align-top">
                              <div>
                                <p className="font-medium text-foreground">{g.name}</p>
                                {g.description ? (
                                  <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-foreground">{g.tagCount}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => openGroupManageTagsModal(g)}
                                  className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                                >
                                  Quản lý tag
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => openGroupEditModal(g)}
                                  className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving || g.tagCount > 0}
                                  onClick={() => openGroupDeleteModal(g)}
                                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 disabled:opacity-60"
                                  title={
                                    g.tagCount > 0
                                      ? "Gỡ hoặc gán tag sang nhóm khác trước khi xóa nhóm"
                                      : "Xóa nhóm"
                                  }
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
              </div>
            ) : null}

            {modalMode === "groups" && groupSubModal === "create" ? (
              <div className="mt-4 space-y-3">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Tên</span>
                  <input
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="vd: Thể loại"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Mô tả (tùy chọn)</span>
                  <input
                    value={newGroupDesc}
                    onChange={(event) => setNewGroupDesc(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="Ghi chú nội bộ"
                  />
                </label>
              </div>
            ) : null}

            {modalMode === "groups" && groupSubModal === "edit" ? (
              <div className="mt-4 space-y-3">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Tên nhóm</span>
                  <input
                    value={editGroupName}
                    onChange={(event) => setEditGroupName(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-foreground">Mô tả (tùy chọn)</span>
                  <input
                    value={editGroupDesc}
                    onChange={(event) => setEditGroupDesc(event.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="Ghi chú nội bộ"
                  />
                </label>
              </div>
            ) : null}

            {modalMode === "groups" && groupSubModal === "delete" && groupActionTarget ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-foreground">
                  Xóa nhóm <span className="font-semibold">{groupActionTarget.name}</span>?
                </p>
                <p className="text-sm text-muted-foreground">
                  {groupActionTarget.tagCount > 0
                    ? `Nhóm đang có ${groupActionTarget.tagCount} tag — gỡ hoặc gán tag sang nhóm khác trước.`
                    : "Thao tác không thể hoàn tác."}
                </p>
              </div>
            ) : null}

            {modalMode === "groups" && groupSubModal === "manage_tags" && groupActionTarget ? (
              <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:items-stretch">
                <section className="flex min-h-0 flex-col rounded-xl border border-border bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-foreground">Tag chưa có nhóm</h4>
                  <p className="mt-1 min-h-[2.75rem] text-xs leading-relaxed text-muted-foreground">
                    Gán tag đang không thuộc nhóm nào vào &quot;{groupActionTarget.name}&quot;.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="search"
                      value={manageUngroupedDraftKw}
                      onChange={(event) => setManageUngroupedDraftKw(event.target.value)}
                      placeholder="Tìm theo tên..."
                      className="h-10 min-w-[10rem] flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      disabled={isSaving || manageUngroupedSelected.length === 0}
                      onClick={() => void submitManageAddTagsToGroup()}
                      className="h-10 shrink-0 rounded-lg border border-accent bg-accent px-4 text-sm font-medium text-white shadow-sm transition hover:bg-accent-strong disabled:opacity-60"
                    >
                      Thêm
                    </button>
                  </div>
                  <div className="mt-2 flex min-h-[13rem] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-muted/25 lg:min-h-[15rem]">
                    <div className="shrink-0 border-b border-border/80 bg-white/90 px-2 py-2">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          disabled={manageUngroupedItems.length === 0 || manageUngroupedLoading}
                          checked={
                            manageUngroupedItems.length > 0 &&
                            manageUngroupedItems.every((t) => manageUngroupedSelected.includes(t.id))
                          }
                          onChange={(event) => {
                            if (event.target.checked) {
                              setManageUngroupedSelected((prev) => [
                                ...new Set([...prev, ...manageUngroupedItems.map((t) => t.id)]),
                              ]);
                            } else {
                              const drop = new Set(manageUngroupedItems.map((t) => t.id));
                              setManageUngroupedSelected((prev) => prev.filter((id) => !drop.has(id)));
                            }
                          }}
                        />
                        Chọn cả trang
                      </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                      {manageUngroupedLoading ? (
                        <p className="px-2 py-3 text-sm text-muted-foreground">Đang tải...</p>
                      ) : manageUngroupedItems.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-muted-foreground">Không có tag khớp.</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {manageUngroupedItems.map((tag) => (
                            <li key={tag.id}>
                              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/80">
                                <input
                                  type="checkbox"
                                  checked={manageUngroupedSelected.includes(tag.id)}
                                  onChange={(event) => {
                                    if (event.target.checked) {
                                      setManageUngroupedSelected((prev) =>
                                        prev.includes(tag.id) ? prev : [...prev, tag.id],
                                      );
                                    } else {
                                      setManageUngroupedSelected((prev) =>
                                        prev.filter((id) => id !== tag.id),
                                      );
                                    }
                                  }}
                                />
                                <span className="font-medium text-foreground">#{tag.name}</span>
                                <span className="text-xs text-muted-foreground">({tag.usageCount})</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <button
                      type="button"
                      disabled={manageUngroupedPage <= 1 || manageUngroupedLoading}
                      onClick={() => setManageUngroupedPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground shadow-sm disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="min-w-[3.5rem] text-center tabular-nums">
                      {manageUngroupedPage} /{" "}
                      {Math.max(
                        1,
                        Math.ceil(manageUngroupedTotal / MANAGE_GROUP_TAGS_PAGE_SIZE),
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={
                        manageUngroupedLoading ||
                        manageUngroupedPage >=
                          Math.max(
                            1,
                            Math.ceil(manageUngroupedTotal / MANAGE_GROUP_TAGS_PAGE_SIZE),
                          )
                      }
                      onClick={() => setManageUngroupedPage((p) => p + 1)}
                      className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground shadow-sm disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </section>
                <section className="flex min-h-0 flex-col rounded-xl border border-border bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-foreground">Tag trong nhóm này</h4>
                  <p className="mt-1 min-h-[2.75rem] text-xs leading-relaxed text-muted-foreground">
                    Gỡ hoặc xóa tag khỏi hệ thống (chỉ khi không còn truyện dùng).
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="search"
                      value={manageInGroupDraftKw}
                      onChange={(event) => setManageInGroupDraftKw(event.target.value)}
                      placeholder="Tìm theo tên..."
                      className="h-10 min-w-[10rem] flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      disabled={isSaving || manageInGroupSelected.length === 0}
                      onClick={() => void submitManageRemoveFromGroup()}
                      className="h-10 shrink-0 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-muted disabled:opacity-60"
                    >
                      Gỡ
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || manageInGroupSelected.length === 0}
                      onClick={() => void submitManageDeleteTagsHard()}
                      className="h-10 shrink-0 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
                      title="Chỉ xóa được tag không còn truyện nào dùng."
                    >
                      Xóa tag
                    </button>
                  </div>
                  <div className="mt-2 flex min-h-[13rem] flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface-muted/25 lg:min-h-[15rem]">
                    <div className="shrink-0 border-b border-border/80 bg-white/90 px-2 py-2">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          disabled={manageInGroupItems.length === 0 || manageInGroupLoading}
                          checked={
                            manageInGroupItems.length > 0 &&
                            manageInGroupItems.every((t) => manageInGroupSelected.includes(t.id))
                          }
                          onChange={(event) => {
                            if (event.target.checked) {
                              setManageInGroupSelected((prev) => [
                                ...new Set([...prev, ...manageInGroupItems.map((t) => t.id)]),
                              ]);
                            } else {
                              const drop = new Set(manageInGroupItems.map((t) => t.id));
                              setManageInGroupSelected((prev) => prev.filter((id) => !drop.has(id)));
                            }
                          }}
                        />
                        Chọn cả trang
                      </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                      {manageInGroupLoading ? (
                        <p className="px-2 py-3 text-sm text-muted-foreground">Đang tải...</p>
                      ) : manageInGroupItems.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-muted-foreground">Chưa có tag trong nhóm.</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {manageInGroupItems.map((tag) => (
                            <li key={tag.id}>
                              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/80">
                                <input
                                  type="checkbox"
                                  checked={manageInGroupSelected.includes(tag.id)}
                                  onChange={(event) => {
                                    if (event.target.checked) {
                                      setManageInGroupSelected((prev) =>
                                        prev.includes(tag.id) ? prev : [...prev, tag.id],
                                      );
                                    } else {
                                      setManageInGroupSelected((prev) =>
                                        prev.filter((id) => id !== tag.id),
                                      );
                                    }
                                  }}
                                />
                                <span className="font-medium text-foreground">#{tag.name}</span>
                                <span className="text-xs text-muted-foreground">({tag.usageCount})</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <button
                      type="button"
                      disabled={manageInGroupPage <= 1 || manageInGroupLoading}
                      onClick={() => setManageInGroupPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground shadow-sm disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <span className="min-w-[3.5rem] text-center tabular-nums">
                      {manageInGroupPage} /{" "}
                      {Math.max(1, Math.ceil(manageInGroupTotal / MANAGE_GROUP_TAGS_PAGE_SIZE))}
                    </span>
                    <button
                      type="button"
                      disabled={
                        manageInGroupLoading ||
                        manageInGroupPage >=
                          Math.max(1, Math.ceil(manageInGroupTotal / MANAGE_GROUP_TAGS_PAGE_SIZE))
                      }
                      onClick={() => setManageInGroupPage((p) => p + 1)}
                      className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-medium text-foreground shadow-sm disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </section>
              </div>
            ) : null}

            {modalMode === "merge" ? (
              <div className="mt-4 grid gap-5 md:grid-cols-2 md:items-stretch">
                <div className="flex min-h-0 flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Tag nguồn</span>
                  <p className="min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                    Đã chọn {mergeSourceSelectedIds.length} tag. Tìm và tick thêm tag cần gộp.
                  </p>
                  <div className="relative">
                    <input
                      type="search"
                      value={mergeSourceDraftKeyword}
                      onChange={(event) => setMergeSourceDraftKeyword(event.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                      placeholder="Tìm tag nguồn..."
                    />
                    {mergeSourceDraftKeyword.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setMergeSourceDraftKeyword("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-surface-muted"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <div className="h-64 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-surface-muted/40 p-2">
                    {isLoadingMergeSources ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">Đang tải...</p>
                    ) : mergeSourceOptions.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">Không có tag khớp.</p>
                    ) : (
                      <ul className="space-y-1">
                        {mergeSourceOptions.map((item) => {
                          const disabled = item.id === mergeDestId;
                          const checked = mergeSourceSelectedIds.includes(item.id);
                          return (
                            <li key={item.id}>
                              <label
                                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${disabled ? "opacity-50" : "hover:bg-white"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(event) => {
                                    if (event.target.checked) {
                                      setMergeSourceSelectedIds((prev) =>
                                        prev.includes(item.id) ? prev : [...prev, item.id],
                                      );
                                    } else {
                                      setMergeSourceSelectedIds((prev) =>
                                        prev.filter((id) => id !== item.id),
                                      );
                                    }
                                  }}
                                />
                                <span className="font-medium text-foreground">#{item.name}</span>
                                <span className="text-xs text-muted-foreground">({item.usageCount})</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex min-h-0 flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Tag đích</span>
                  <p className="min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                    Chọn một tag giữ lại. Tag đang là nguồn sẽ không hiện ở đây.
                  </p>
                  <div className="relative">
                    <input
                      type="search"
                      value={mergeDestDraftKeyword}
                      onChange={(event) => setMergeDestDraftKeyword(event.target.value)}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                      placeholder="Tìm tag đích..."
                    />
                    {mergeDestDraftKeyword.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setMergeDestDraftKeyword("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-surface-muted"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                  <div className="h-64 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-surface-muted/40 p-2">
                    {isLoadingMergeDests ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">Đang tải...</p>
                    ) : mergeDestOptions.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-muted-foreground">Không có tag khớp.</p>
                    ) : (
                      <ul className="space-y-1">
                        {mergeDestOptions.map((item) => (
                          <li key={item.id}>
                            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white">
                              <input
                                type="radio"
                                name="merge-dest-tag"
                                checked={mergeDestId === item.id}
                                onChange={() => setMergeDestId(item.id)}
                              />
                              <span className="font-medium text-foreground">#{item.name}</span>
                              <span className="text-xs text-muted-foreground">({item.usageCount})</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
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

            {modalMode !== "groups" || groupSubModal ? (
            <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (modalMode === "groups" && groupSubModal) closeGroupSubModal();
                      else closeModal();
                    }}
                    disabled={isSaving}
                    className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  {modalMode === "groups" && groupSubModal === "create" ? (
                    <button
                      type="button"
                      onClick={() => void submitCreateGroup()}
                      disabled={isSaving}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                    >
                      {isSaving ? "Đang tạo..." : "Tạo nhóm"}
                    </button>
                  ) : null}
                  {modalMode === "groups" && groupSubModal === "edit" ? (
                    <button
                      type="button"
                      onClick={() => void submitEditGroup()}
                      disabled={isSaving}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                    >
                      {isSaving ? "Đang lưu..." : "Lưu"}
                    </button>
                  ) : null}
                  {modalMode === "groups" && groupSubModal === "delete" ? (
                    <button
                      type="button"
                      onClick={() => void submitDeleteGroup()}
                      disabled={
                        isSaving ||
                        !groupActionTarget ||
                        groupActionTarget.tagCount > 0
                      }
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {isSaving ? "Đang xóa..." : "Xóa nhóm"}
                    </button>
                  ) : null}
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
                  {modalMode === "assign_group" ? (
                    <button
                      type="button"
                      onClick={() => void submitAssignGroup()}
                      disabled={isSaving}
                      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:opacity-60"
                    >
                      {isSaving ? "Đang lưu..." : "Áp dụng"}
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
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

