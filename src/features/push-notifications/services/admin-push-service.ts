import { apiClient } from "@/lib/api/client";

export type AdminPushFailure = {
  recipient_id: string;
  message: string;
};

export type AdminPushResponse = {
  message: string;
  summary: {
    total: number;
    created: number;
    failed: number;
  };
  failures: AdminPushFailure[];
};

export type AdminBroadcastLogActor = {
  id: string;
  display_name: string;
  email: string;
};

export type AdminBroadcastLogItem = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  total_accounts: number;
  created_count: number;
  failed_count: number;
  actor: AdminBroadcastLogActor | null;
};

export type AdminBroadcastLogListResponse = {
  items: AdminBroadcastLogItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminBroadcastLogSortKey =
  | "created_at"
  | "title"
  | "total_accounts"
  | "created_count"
  | "failed_count";

/** Gửi thông báo tới mọi tài khoản đã đăng ký. */
export async function postAdminPushNotifications(payload: { title: string; body: string }) {
  return apiClient.post<AdminPushResponse>("/notifications/admin/push", {
    body: {
      title: payload.title.trim(),
      body: payload.body.trim(),
    },
  });
}

export async function getAdminBroadcastLogs(params: {
  query?: string;
  sort?: AdminBroadcastLogSortKey;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}) {
  const search = new URLSearchParams();
  const q = params.query?.trim();
  if (q) search.set("query", q);
  if (params.sort) search.set("sort", params.sort);
  if (params.order) search.set("order", params.order);
  if (params.page != null) search.set("page", String(params.page));
  if (params.page_size != null) search.set("page_size", String(params.page_size));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiClient.get<AdminBroadcastLogListResponse>(`/notifications/admin/broadcasts${suffix}`);
}
