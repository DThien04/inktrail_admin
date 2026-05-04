import { apiClient } from "@/lib/api/client";
import type { AdminUserItem, UserRole } from "@/features/users/types";

type UserListResponse = Array<{
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}>;

function mapUser(item: UserListResponse[number]): AdminUserItem {
  return {
    id: item.id,
    email: item.email,
    displayName: item.display_name,
    role: item.role,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function getAdminUsers({
  query,
  role,
}: {
  query?: string;
  role?: UserRole | "all";
}) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("query", query.trim());
  if (role && role !== "all") params.set("role", role);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<UserListResponse>(`/users/admin/list${suffix}`);
  return response.map(mapUser);
}

