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

export async function getAdminTags({
  keyword,
  groupId,
  page,
  pageSize,
}: {
  keyword?: string;
  groupId?: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  if (keyword?.trim()) params.set("keyword", keyword.trim());
  if (groupId?.trim()) params.set("group_id", groupId.trim());
  params.set("page", String(page));
  params.set("page_size", String(pageSize));

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

export async function getAdminTagGroups({
  keyword,
  page,
  pageSize,
}: {
  keyword?: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  if (keyword?.trim()) params.set("keyword", keyword.trim());
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
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
}: {
  tagId: string;
  name?: string;
  description?: string;
}) {
  const response = await apiClient.patch<{ tag: { id: string } }>(`/tags/${tagId}`, {
    name,
    description,
  });
  return response;
}

export async function mergeAdminTag({
  fromTagId,
  toTagId,
}: {
  fromTagId: string;
  toTagId: string;
}) {
  const response = await apiClient.post<{ message: string }>(`/tags/${fromTagId}/merge`, {
    to_tag_id: toTagId,
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
    from_tag_ids: fromTagIds,
    to_tag_id: toTagId,
  });
  return response;
}

export async function deleteUnusedAdminTag({ tagId }: { tagId: string }) {
  const response = await apiClient.delete<{ message: string }>(
    `/tags/${tagId}?hard=true`,
  );
  return response;
}

