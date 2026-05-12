import { apiClient } from "@/lib/api/client";
import type {
  AdminReportCasePriority,
  AdminReportCaseStatus,
  AdminReportAppealStatus,
  AdminReportListItem,
  AdminReportResolutionAction,
  AdminReportListResponse,
  AdminReportStatus,
  AdminReportType,
} from "@/features/reports/types";

type ApiAdminReportListResponse = {
  items: Array<{
    id: string;
    type: AdminReportType;
    case_id?: string | null;
    case_status?: AdminReportCaseStatus | null;
    case_resolution_action?: AdminReportResolutionAction | null;
    case_last_resolution_action?: AdminReportResolutionAction | null;
    case_report_count?: number | null;
    case_unique_reporter_count?: number | null;
    case_risk_score?: number | null;
    case_priority?: AdminReportCasePriority | null;
    case_reopened_count?: number | null;
    case_last_reported_at?: string | null;
    case_restored_at?: string | null;
    case_restored_by_id?: string | null;
    case_account_lock_applied?: boolean;
    case_account_locked_user_id?: string | null;
    case_ai_flagged?: boolean;
    case_ai_categories?: string[] | null;
    case_ai_confidence?: number | null;
    case_ai_severity?: "low" | "medium" | "high" | "critical" | null;
    case_ai_summary?: string | null;
    case_ai_suggested_action?:
      | "allow"
      | "review"
      | "review_soon"
      | "review_urgent"
      | "remove_candidate"
      | "account_lock_candidate"
      | null;
    case_ai_checked_at?: string | null;
    case_appeal_status?: AdminReportAppealStatus | null;
    case_appeal_reason?: string | null;
    case_appeal_submitted_at?: string | null;
    case_appeal_resolved_at?: string | null;
    case_appeal_resolved_by_id?: string | null;
    case_appeal_ai_summary?: string | null;
    case_appeal_ai_recommendation?: "accept" | "reject" | "review" | null;
    case_appeal_ai_confidence?: number | null;
    case_appeal_ai_checked_at?: string | null;
    reason: string;
    description?: string | null;
    status: AdminReportStatus;
    created_at: string;
    updated_at: string;
    resolved_at?: string | null;
    reporter?: {
      id: string;
      display_name?: string | null;
      email?: string | null;
    } | null;
    target?: {
      id: string;
      title?: string | null;
      slug?: string | null;
      description?: string | null;
      cover_url?: string | null;
      status?: string | null;
      chapter_number?: number | null;
      content?: string | null;
      content_preview?: string | null;
      content_truncated?: boolean;
      tags?: Array<{
        id: string;
        name: string;
      }>;
      story?: {
        id: string;
        title?: string | null;
        slug?: string | null;
        author?: {
          id: string;
          display_name?: string | null;
          email?: string | null;
        } | null;
      } | null;
      author?: {
        id: string;
        display_name?: string | null;
        email?: string | null;
      } | null;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

function mapReportItem(
  item: ApiAdminReportListResponse["items"][number],
): AdminReportListItem {
  return {
    id: item.id,
    type: item.type,
    caseId: item.case_id ?? null,
    caseStatus: item.case_status ?? null,
    caseResolutionAction: item.case_resolution_action ?? null,
    caseLastResolutionAction: item.case_last_resolution_action ?? null,
    caseReportCount: item.case_report_count ?? null,
    caseUniqueReporterCount: item.case_unique_reporter_count ?? null,
    caseRiskScore: item.case_risk_score ?? null,
    casePriority: item.case_priority ?? null,
    caseReopenedCount: item.case_reopened_count ?? null,
    caseLastReportedAt: item.case_last_reported_at ?? null,
    caseRestoredAt: item.case_restored_at ?? null,
    caseRestoredById: item.case_restored_by_id ?? null,
    caseAccountLockApplied: Boolean(item.case_account_lock_applied),
    caseAccountLockedUserId: item.case_account_locked_user_id ?? null,
    caseAiFlagged: Boolean(item.case_ai_flagged),
    caseAiCategories: item.case_ai_categories ?? null,
    caseAiConfidence: item.case_ai_confidence ?? null,
    caseAiSeverity: item.case_ai_severity ?? null,
    caseAiSummary: item.case_ai_summary ?? null,
    caseAiSuggestedAction: item.case_ai_suggested_action ?? null,
    caseAiCheckedAt: item.case_ai_checked_at ?? null,
    caseAppealStatus: item.case_appeal_status ?? null,
    caseAppealReason: item.case_appeal_reason ?? null,
    caseAppealSubmittedAt: item.case_appeal_submitted_at ?? null,
    caseAppealResolvedAt: item.case_appeal_resolved_at ?? null,
    caseAppealResolvedById: item.case_appeal_resolved_by_id ?? null,
    caseAppealAiSummary: item.case_appeal_ai_summary ?? null,
    caseAppealAiRecommendation: item.case_appeal_ai_recommendation ?? null,
    caseAppealAiConfidence: item.case_appeal_ai_confidence ?? null,
    caseAppealAiCheckedAt: item.case_appeal_ai_checked_at ?? null,
    reason: item.reason,
    description: item.description ?? null,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    resolvedAt: item.resolved_at ?? null,
    reporter: item.reporter
      ? {
          id: item.reporter.id,
          displayName: item.reporter.display_name ?? null,
          email: item.reporter.email ?? null,
        }
      : null,
    target: item.target
      ? {
          id: item.target.id,
          title: item.target.title ?? null,
          slug: item.target.slug ?? null,
          description: item.target.description ?? null,
          coverUrl: item.target.cover_url ?? null,
          status: item.target.status ?? null,
          chapterNumber: item.target.chapter_number ?? null,
          content: item.target.content ?? null,
          contentPreview: item.target.content_preview ?? null,
          contentTruncated: Boolean(item.target.content_truncated),
          tags: item.target.tags ?? [],
          story: item.target.story
            ? {
                id: item.target.story.id,
                title: item.target.story.title ?? null,
                slug: item.target.story.slug ?? null,
                author: item.target.story.author
                  ? {
                      id: item.target.story.author.id,
                      displayName: item.target.story.author.display_name ?? null,
                      email: item.target.story.author.email ?? null,
                    }
                  : null,
              }
            : null,
          author: item.target.author
            ? {
                id: item.target.author.id,
                displayName: item.target.author.display_name ?? null,
                email: item.target.author.email ?? null,
              }
            : null,
        }
      : null,
  };
}

export async function getAdminReports({
  type,
  status,
  page = 1,
  limit = 20,
}: {
  type?: AdminReportType | "all";
  status?: AdminReportStatus | "all";
  page?: number;
  limit?: number;
} = {}): Promise<AdminReportListResponse> {
  const params = new URLSearchParams();

  if (type && type !== "all") {
    params.set("type", type);
  }
  if (status && status !== "all") {
    params.set("status", status);
  }
  params.set("page", String(page));
  params.set("limit", String(limit));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<ApiAdminReportListResponse>(
    `/reports/admin${suffix}`,
  );

  return {
    items: response.items.map(mapReportItem),
    pagination: {
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.total,
      totalPages: response.pagination.total_pages,
    },
  };
}

export async function getAdminReportDetail(
  type: AdminReportType,
  reportId: string,
): Promise<AdminReportListItem> {
  const response = await apiClient.get<ApiAdminReportListResponse["items"][number]>(
    `/reports/admin/${type}/${reportId}`,
  );

  return mapReportItem(response);
}

export async function updateAdminReportStatus({
  type,
  reportId,
  status,
}: {
  type: AdminReportType;
  reportId: string;
  status: AdminReportStatus;
}): Promise<AdminReportListItem> {
  const response = await apiClient.patch<ApiAdminReportListResponse["items"][number]>(
    `/reports/admin/${type}/${reportId}`,
    {
      body: { status },
    },
  );

  return mapReportItem(response);
}

export async function processCriticalAdminReportCases(
  options: { lockAuthor?: boolean; lockReason?: string } = {},
): Promise<{
  processedCaseCount: number;
  processedReportCount: number;
  lockedAuthorCount: number;
  failedCaseCount: number;
  remainingCriticalCount: number;
  batchLimit: number;
  errors: Array<{
    caseId: string;
    targetType: AdminReportType;
    message: string;
  }>;
  items: AdminReportListItem[];
}> {
  const response = await apiClient.post<{
    processed_case_count: number;
    processed_report_count: number;
    locked_author_count?: number;
    failed_case_count: number;
    remaining_critical_count?: number;
    batch_limit?: number;
    errors?: Array<{
      case_id: string;
      target_type: AdminReportType;
      message: string;
    }>;
    items?: ApiAdminReportListResponse["items"];
  }>("/reports/admin/cases/critical/process", {
    body: {
      lock_author: Boolean(options.lockAuthor),
      lock_reason: options.lockReason ?? "",
    },
  });

  return {
    processedCaseCount: response.processed_case_count,
    processedReportCount: response.processed_report_count,
    lockedAuthorCount: response.locked_author_count ?? 0,
    failedCaseCount: response.failed_case_count,
    remainingCriticalCount: response.remaining_critical_count ?? 0,
    batchLimit: response.batch_limit ?? 0,
    errors:
      response.errors?.map((error) => ({
        caseId: error.case_id,
        targetType: error.target_type,
        message: error.message,
      })) ?? [],
    items: response.items?.map(mapReportItem) ?? [],
  };
}

export async function restoreAdminReportCase(
  caseId: string,
  options: { unlockUser?: boolean } = {},
): Promise<AdminReportListItem> {
  const response = await apiClient.post<ApiAdminReportListResponse["items"][number]>(
    `/reports/admin/cases/${caseId}/restore`,
    {
      body: {
        unlock_user: Boolean(options.unlockUser),
      },
    },
  );

  return mapReportItem(response);
}

export type AdminViolationSummary = {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    isLocked: boolean;
    lockedAt: string | null;
    lockedUntil: string | null;
    lockedReason: string | null;
    lockedBy: { id: string; displayName: string } | null;
  };
  counts: {
    storiesHidden: number;
    chaptersHidden: number;
    commentsRemoved: number;
    accountLockCases: number;
    totalContentViolations: number;
  };
};

export async function getUserViolationSummary(
  userId: string,
): Promise<AdminViolationSummary> {
  const response = await apiClient.get<{
    user: {
      id: string;
      email: string;
      display_name: string;
      role: string;
      is_locked: boolean;
      locked_at: string | null;
      locked_until: string | null;
      locked_reason: string | null;
      locked_by: { id: string; display_name: string } | null;
    };
    counts: {
      stories_hidden: number;
      chapters_hidden: number;
      comments_removed: number;
      account_lock_cases: number;
      total_content_violations: number;
    };
  }>(`/users/admin/${userId}/violation-summary`);

  return {
    user: {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.display_name,
      role: response.user.role,
      isLocked: response.user.is_locked,
      lockedAt: response.user.locked_at,
      lockedUntil: response.user.locked_until,
      lockedReason: response.user.locked_reason,
      lockedBy: response.user.locked_by
        ? {
            id: response.user.locked_by.id,
            displayName: response.user.locked_by.display_name,
          }
        : null,
    },
    counts: {
      storiesHidden: response.counts.stories_hidden,
      chaptersHidden: response.counts.chapters_hidden,
      commentsRemoved: response.counts.comments_removed,
      accountLockCases: response.counts.account_lock_cases,
      totalContentViolations: response.counts.total_content_violations,
    },
  };
}

export type LockReportCaseAuthorPayload = {
  reason: string;
  lockedUntil: string | null;
  alsoResolveContent: boolean;
};

export type LockReportCaseAuthorResult = {
  caseId: string;
  accountLockApplied: boolean;
  resolvedReportCount: number;
  lockedUser: {
    id: string;
    email: string;
    displayName: string;
    isLocked: boolean;
    lockedAt: string | null;
    lockedUntil: string | null;
    lockedReason: string | null;
  } | null;
  representative: AdminReportListItem | null;
};

export async function lockReportCaseAuthor(
  caseId: string,
  payload: LockReportCaseAuthorPayload,
): Promise<LockReportCaseAuthorResult> {
  const response = await apiClient.post<{
    case_id: string;
    account_lock_applied: boolean;
    resolved_report_count: number;
    locked_user: {
      id: string;
      email: string;
      display_name: string;
      is_locked: boolean;
      locked_at: string | null;
      locked_until: string | null;
      locked_reason: string | null;
    } | null;
    representative: ApiAdminReportListResponse["items"][number] | null;
  }>(`/reports/admin/cases/${caseId}/lock-author`, {
    body: {
      reason: payload.reason,
      locked_until: payload.lockedUntil,
      also_resolve_content: payload.alsoResolveContent,
    },
  });

  return {
    caseId: response.case_id,
    accountLockApplied: response.account_lock_applied,
    resolvedReportCount: response.resolved_report_count,
    lockedUser: response.locked_user
      ? {
          id: response.locked_user.id,
          email: response.locked_user.email,
          displayName: response.locked_user.display_name,
          isLocked: response.locked_user.is_locked,
          lockedAt: response.locked_user.locked_at,
          lockedUntil: response.locked_user.locked_until,
          lockedReason: response.locked_user.locked_reason,
        }
      : null,
    representative: response.representative
      ? mapReportItem(response.representative)
      : null,
  };
}

export async function resolveAdminReportAppeal({
  caseId,
  action,
}: {
  caseId: string;
  action: "accept" | "dismiss";
}): Promise<AdminReportListItem> {
  const response = await apiClient.post<ApiAdminReportListResponse["items"][number]>(
    `/reports/admin/cases/${caseId}/appeal/${action}`,
  );

  return mapReportItem(response);
}
