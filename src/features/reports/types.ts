export type AdminReportType = "story" | "chapter" | "chapter_comment";
export type AdminReportStatus =
  | "pending"
  | "dismissed"
  | "action_taken"
  | "removed";
export type AdminReportCaseStatus = "pending" | "resolved";
export type AdminReportCasePriority = "low" | "medium" | "high" | "critical";
export type AdminReportAppealStatus = "pending" | "accepted" | "rejected";
export type AdminReportResolutionAction =
  | "ignored"
  | "comment_removed"
  | "chapter_hidden"
  | "story_hidden";
export type AdminReportAiSeverity = "low" | "medium" | "high" | "critical";
export type AdminReportAiSuggestedAction =
  | "allow"
  | "review"
  | "review_soon"
  | "review_urgent"
  | "remove_candidate";

export type AdminReportListItem = {
  id: string;
  type: AdminReportType;
  caseId: string | null;
  caseStatus: AdminReportCaseStatus | null;
  caseResolutionAction: AdminReportResolutionAction | null;
  caseLastResolutionAction: AdminReportResolutionAction | null;
  caseReportCount: number | null;
  caseUniqueReporterCount: number | null;
  caseRiskScore: number | null;
  casePriority: AdminReportCasePriority | null;
  caseReopenedCount: number | null;
  caseLastReportedAt: string | null;
  caseRestoredAt: string | null;
  caseRestoredById: string | null;
  caseAiFlagged: boolean;
  caseAiCategories: string[] | null;
  caseAiConfidence: number | null;
  caseAiSeverity: AdminReportAiSeverity | null;
  caseAiSummary: string | null;
  caseAiSuggestedAction: AdminReportAiSuggestedAction | null;
  caseAiCheckedAt: string | null;
  caseAppealStatus: AdminReportAppealStatus | null;
  caseAppealReason: string | null;
  caseAppealSubmittedAt: string | null;
  caseAppealResolvedAt: string | null;
  caseAppealResolvedById: string | null;
  caseAppealAiSummary: string | null;
  caseAppealAiRecommendation: "accept" | "reject" | "review" | null;
  caseAppealAiConfidence: number | null;
  caseAppealAiCheckedAt: string | null;
  reason: string;
  description: string | null;
  status: AdminReportStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  reporter: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
  target: {
    id: string;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    status?: string | null;
    chapterNumber?: number | null;
    content?: string | null;
    contentPreview?: string | null;
    contentTruncated?: boolean;
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
        displayName: string | null;
        email: string | null;
      } | null;
    } | null;
    author?: {
      id: string;
      displayName: string | null;
      email: string | null;
    } | null;
  } | null;
};

export type AdminReportListResponse = {
  items: AdminReportListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
