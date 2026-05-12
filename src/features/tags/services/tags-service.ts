import { apiClient } from "@/lib/api/client";
import type {
  AdminTagGroupItem,
  AdminTagGroupListResponse,
  AdminTagItem,
  AdminTagListResponse,
} from "@/features/tags/types";

function mapTag(item: AdminTagListResponse["items"][number]): AdminTagItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    group: item.group ?? null,
    usageCount: item.usage_count ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export type AdminTagSortKey =
  | "name"
  | "usage_count"
  | "updated_at"
  | "created_at";
export type AdminTagSortOrder = "asc" | "desc";

export async function getAdminTags({
  keyword,
  groupId,
  ungroupedOnly,
  page,
  pageSize,
  sortBy,
  sortOrder,
}: {
  keyword?: string;
  groupId?: string;
  ungroupedOnly?: boolean;
  page: number;
  pageSize: number;
  sortBy?: AdminTagSortKey;
  sortOrder?: AdminTagSortOrder;
}) {
  const params = new URLSearchParams();
  if (keyword?.trim()) params.set("keyword", keyword.trim());
  if (groupId?.trim()) params.set("group_id", groupId.trim());
  if (ungroupedOnly) params.set("ungrouped_only", "true");
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (sortBy) params.set("sort_by", sortBy);
  if (sortOrder) params.set("sort_order", sortOrder);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<AdminTagListResponse>(`/tags/admin${suffix}`);
  return {
    total: response.total ?? 0,
    items: Array.isArray(response.items) ? response.items.map(mapTag) : [],
  };
}

function mapGroup(item: AdminTagGroupListResponse["items"][number]): AdminTagGroupItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    tagCount: item.tag_count ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export type AdminTagGroupSortKey =
  | "name"
  | "tag_count"
  | "updated_at"
  | "created_at";
export type AdminTagGroupSortOrder = "asc" | "desc";
export type AdminTagGroupTagFilter = "all" | "empty" | "non_empty";

export async function getAdminTagGroups({
  keyword,
  page,
  pageSize,
  sortBy,
  sortOrder,
  tagFilter,
}: {
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy?: AdminTagGroupSortKey;
  sortOrder?: AdminTagGroupSortOrder;
  tagFilter?: AdminTagGroupTagFilter;
}) {
  const params = new URLSearchParams();
  if (keyword?.trim()) params.set("keyword", keyword.trim());
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (sortBy) params.set("sort_by", sortBy);
  if (sortOrder) params.set("sort_order", sortOrder);
  if (tagFilter && tagFilter !== "all") params.set("tag_filter", tagFilter);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<AdminTagGroupListResponse>(`/tag-groups/admin${suffix}`);
  return {
    total: response.total ?? 0,
    items: Array.isArray(response.items) ? response.items.map(mapGroup) : [],
  };
}

export async function updateAdminTag({
  tagId,
  name,
  description,
  groupId,
}: {
  tagId: string;
  name?: string;
  description?: string;
  groupId?: string | null;
}) {
  const body: Record<string, unknown> = { name, description };
  if (groupId !== undefined) {
    body.group_id = groupId === null || groupId === "" ? null : groupId;
  }
  const response = await apiClient.patch<{ tag: { id: string } }>(`/tags/${tagId}`, {
    body,
  });
  return response;
}

export async function mergeAdminTagsBulk({
  fromTagIds,
  toTagId,
}: {
  fromTagIds: string[];
  toTagId: string;
}) {
  const response = await apiClient.post<{ message: string }>(`/tags/merge-bulk`, {
    body: {
      from_tag_ids: fromTagIds,
      to_tag_id: toTagId,
    },
  });
  return response;
}

export async function deleteUnusedAdminTag({ tagId }: { tagId: string }) {
  const response = await apiClient.delete<{ message: string }>(
    `/tags/${tagId}?hard=true`,
  );
  return response;
}

export async function setAdminTagsGroupBulk({
  tagIds,
  groupId,
}: {
  tagIds: string[];
  groupId: string | null;
}) {
  const response = await apiClient.post<{ message: string }>(`/tags/set-group-bulk`, {
    body: {
      tag_ids: tagIds,
      group_id: groupId === null || groupId === "" ? null : groupId,
    },
  });
  return response;
}

export async function createAdminTagGroup({
  name,
  description,
}: {
  name: string;
  description?: string;
}) {
  return apiClient.post<{ message: string; group: { id: string } }>(`/tag-groups`, {
    body: {
      name,
      description: description ?? "",
    },
  });
}

export async function updateAdminTagGroup({
  groupId,
  name,
  description,
}: {
  groupId: string;
  name?: string;
  description?: string;
}) {
  return apiClient.patch<{ message: string; group: { id: string } }>(`/tag-groups/${groupId}`, {
    body: {
      name,
      description,
    },
  });
}

export async function deleteAdminTagGroup({ groupId }: { groupId: string }) {
  return apiClient.delete<{ message: string }>(`/tag-groups/${groupId}`);
}

