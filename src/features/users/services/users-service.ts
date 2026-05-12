import { apiClient } from "@/lib/api/client";
import type {
  AdminUserItem,
  AdminUserLockLog,
  UserLockAction,
  UserRole,
  UserStatusFilter,
} from "@/features/users/types";

type UserListResponse = Array<UserResponse>;

type UserResponse = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  is_locked: boolean;
  locked_at: string | null;
  locked_until: string | null;
  locked_reason: string | null;
  locked_by: { id: string; display_name: string } | null;
};

type UserLockLogResponse = {
  id: string;
  user_id: string;
  actor_id: string;
  actor: { id: string; display_name: string } | null;
  action: UserLockAction;
  reason: string | null;
  locked_until: string | null;
  created_at: string;
};

function mapUser(item: UserResponse): AdminUserItem {
  return {
    id: item.id,
    email: item.email,
    displayName: item.display_name,
    role: item.role,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    isLocked: item.is_locked,
    lockedAt: item.locked_at,
    lockedUntil: item.locked_until,
    lockedReason: item.locked_reason,
    lockedBy: item.locked_by
      ? { id: item.locked_by.id, displayName: item.locked_by.display_name }
      : null,
  };
}

function mapLockLog(item: UserLockLogResponse): AdminUserLockLog {
  return {
    id: item.id,
    userId: item.user_id,
    actorId: item.actor_id,
    actor: item.actor
      ? { id: item.actor.id, displayName: item.actor.display_name }
      : null,
    action: item.action,
    reason: item.reason,
    lockedUntil: item.locked_until,
    createdAt: item.created_at,
  };
}

export async function getAdminUsers({
  query,
  role,
  status,
}: {
  query?: string;
  role?: UserRole | "all";
  status?: UserStatusFilter;
}) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("query", query.trim());
  if (role && role !== "all") params.set("role", role);
  if (status && status !== "all") params.set("status", status);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<UserListResponse>(`/users/admin/list${suffix}`);
  return response.map(mapUser);
}

export async function lockAdminUser(
  id: string,
  payload: { reason: string; lockedUntil: string | null },
) {
  const response = await apiClient.post<UserResponse>(`/users/admin/${id}/lock`, {
    body: {
      reason: payload.reason,
      locked_until: payload.lockedUntil,
    },
  });
  return mapUser(response);
}

export async function unlockAdminUser(id: string) {
  const response = await apiClient.post<UserResponse>(`/users/admin/${id}/unlock`);
  return mapUser(response);
}

export async function getAdminUserLockLogs(id: string) {
  const response = await apiClient.get<UserLockLogResponse[]>(
    `/users/admin/${id}/lock-logs`,
  );
  return response.map(mapLockLog);
}

export type AdminLockAppealStatus = "pending" | "accepted" | "rejected";

export type AdminLockAppealItem = {
  id: string;
  userId: string;
  reason: string;
  status: AdminLockAppealStatus;
  submittedAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolverNote: string | null;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    isLocked: boolean;
    lockedAt: string | null;
    lockedUntil: string | null;
    lockedReason: string | null;
  } | null;
  resolver: { id: string; displayName: string } | null;
};

type LockAppealResponse = {
  id: string;
  user_id: string;
  reason: string;
  status: AdminLockAppealStatus;
  submitted_at: string;
  resolved_at: string | null;
  resolved_by_id: string | null;
  resolver_note: string | null;
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    is_locked: boolean;
    locked_at: string | null;
    locked_until: string | null;
    locked_reason: string | null;
  } | null;
  resolver: { id: string; display_name: string } | null;
};

function mapLockAppeal(item: LockAppealResponse): AdminLockAppealItem {
  return {
    id: item.id,
    userId: item.user_id,
    reason: item.reason,
    status: item.status,
    submittedAt: item.submitted_at,
    resolvedAt: item.resolved_at,
    resolvedById: item.resolved_by_id,
    resolverNote: item.resolver_note,
    user: item.user
      ? {
          id: item.user.id,
          email: item.user.email,
          displayName: item.user.display_name,
          avatarUrl: item.user.avatar_url,
          isLocked: item.user.is_locked,
          lockedAt: item.user.locked_at,
          lockedUntil: item.user.locked_until,
          lockedReason: item.user.locked_reason,
        }
      : null,
    resolver: item.resolver
      ? { id: item.resolver.id, displayName: item.resolver.display_name }
      : null,
  };
}

export async function getAdminLockAppeals({
  status,
  page = 1,
  limit = 20,
}: {
  status?: AdminLockAppealStatus | "all";
  page?: number;
  limit?: number;
} = {}): Promise<{
  items: AdminLockAppealItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(limit));

  const response = await apiClient.get<{
    items: LockAppealResponse[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  }>(`/users/admin/lock-appeals?${params.toString()}`);

  return {
    items: response.items.map(mapLockAppeal),
    pagination: {
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    },
  };
}

export async function resolveAdminLockAppeal({
  appealId,
  action,
  note,
}: {
  appealId: string;
  action: "accept" | "dismiss";
  note?: string;
}): Promise<AdminLockAppealItem> {
  const response = await apiClient.post<LockAppealResponse>(
    `/users/admin/lock-appeals/${appealId}/${action}`,
    {
      body: { note: note ?? "" },
    },
  );
  return mapLockAppeal(response);
}
