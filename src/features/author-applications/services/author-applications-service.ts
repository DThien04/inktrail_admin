import { apiClient } from "@/lib/api/client";
import type { AuthorApplicationItem, AuthorApplicationStatus } from "@/features/author-applications/types";

type ApiApplication = {
  id: string;
  user_id: string;
  pen_name: string;
  bio: string | null;
  reason: string | null;
  sample_links: string[];
  status: AuthorApplicationStatus;
  trust_score_snapshot: number;
  eligibility_snapshot: Record<string, unknown> | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  reject_cooldown_until: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    email: string;
    display_name: string;
    role: "reader" | "author" | "admin";
    created_at: string;
  } | null;
  reviewed_by: {
    id: string;
    display_name: string;
    email: string;
  } | null;
};

function mapApplication(item: ApiApplication): AuthorApplicationItem {
  return {
    id: item.id,
    userId: item.user_id,
    penName: item.pen_name,
    bio: item.bio,
    reason: item.reason,
    sampleLinks: item.sample_links ?? [],
    status: item.status,
    trustScoreSnapshot: item.trust_score_snapshot ?? 0,
    eligibilitySnapshot: item.eligibility_snapshot ?? null,
    reviewedById: item.reviewed_by_id,
    reviewedAt: item.reviewed_at,
    reviewNote: item.review_note,
    rejectCooldownUntil: item.reject_cooldown_until,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    user: item.user
      ? {
          id: item.user.id,
          email: item.user.email,
          displayName: item.user.display_name,
          role: item.user.role,
          createdAt: item.user.created_at,
        }
      : null,
    reviewedBy: item.reviewed_by
      ? {
          id: item.reviewed_by.id,
          displayName: item.reviewed_by.display_name,
          email: item.reviewed_by.email,
        }
      : null,
  };
}

export async function getAdminAuthorApplications({
  status = "pending",
  limit = 100,
}: {
  status?: AuthorApplicationStatus | "all";
  limit?: number;
}) {
  const params = new URLSearchParams();
  params.set("status", status);
  params.set("limit", String(limit));
  const response = await apiClient.get<ApiApplication[]>(
    `/author-program/admin/applications?${params.toString()}`,
  );
  return (response ?? []).map(mapApplication);
}

export async function getAdminAuthorApplicationById(id: string) {
  const response = await apiClient.get<ApiApplication>(`/author-program/admin/applications/${id}`);
  return mapApplication(response);
}

export async function approveAdminAuthorApplication(id: string, reviewNote?: string) {
  await apiClient.post(`/author-program/admin/applications/${id}/approve`, {
    body: { review_note: reviewNote || "" },
  });
}

export async function rejectAdminAuthorApplication(id: string, reviewNote: string) {
  await apiClient.post(`/author-program/admin/applications/${id}/reject`, {
    body: { review_note: reviewNote },
  });
}

