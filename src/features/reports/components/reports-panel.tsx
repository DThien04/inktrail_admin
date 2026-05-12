"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { Pagination } from "@/components/ui/pagination";
import {
  getAdminReports,
  getUserViolationSummary,
  lockReportCaseAuthor,
  processCriticalAdminReportCases,
  resolveAdminReportAppeal,
  restoreAdminReportCase,
  updateAdminReportStatus,
  type AdminViolationSummary,
} from "@/features/reports/services/reports-service";
import type {
  AdminReportListItem,
  AdminReportStatus,
  AdminReportType,
} from "@/features/reports/types";

const REPORT_TYPE_VALUES: AdminReportType[] = [
  "story",
  "chapter",
  "chapter_comment",
];

type FilterStatus = "all" | "pending" | "resolved";
type AppealFilterStatus = "pending" | "accepted" | "rejected";
type AppealFilterSelection = "all" | "none" | AppealFilterStatus;
type RiskPriority = "low" | "medium" | "high" | "critical";
type ResolutionAction =
  | "ignored"
  | "comment_removed"
  | "chapter_hidden"
  | "story_hidden"
  | null;
type ReportSortKey =
  | "target"
  | "type"
  | "priority"
  | "status"
  | "resolution"
  | "latestUpdated"
  | "reportCount"
  | "uniqueReporterCount";
type SortDirection = "asc" | "desc";

type ReportCase = {
  key: string;
  type: AdminReportType;
  representative: AdminReportListItem;
  items: AdminReportListItem[];
  reportCount: number;
  uniqueReporterCount: number;
  riskScore: number;
  priority: RiskPriority;
  reopenedCount: number;
  latestCreatedAt: string;
  latestUpdatedAt: string;
  latestReportedAt: string;
  dominantReason: string | null;
  workflowStatus: "pending" | "resolved";
  resolutionAction: ResolutionAction;
  previousResolutionAction: ResolutionAction;
  previousResolvedAt: string | null;
  restoredAt: string | null;
  restoredById: string | null;
  aiFlagged: boolean;
  aiCategories: string[];
  aiConfidence: number | null;
  aiSeverity: "low" | "medium" | "high" | "critical" | null;
  aiSummary: string | null;
  aiSuggestedAction:
    | "allow"
    | "review"
    | "review_soon"
    | "review_urgent"
    | "remove_candidate"
    | "account_lock_candidate"
    | null;
  aiCheckedAt: string | null;
  appealStatus: "pending" | "accepted" | "rejected" | null;
  appealReason: string | null;
  appealSubmittedAt: string | null;
  appealResolvedAt: string | null;
  appealResolvedById: string | null;
  appealAiSummary: string | null;
  appealAiRecommendation: "accept" | "reject" | "review" | null;
  appealAiConfidence: number | null;
  appealAiCheckedAt: string | null;
  accountLockApplied: boolean;
  accountLockedUserId: string | null;
};

type ConfirmAction =
  | {
      kind: "ignore";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "remove_comment";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "hide_chapter";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "hide_story";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "restore";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "accept_appeal";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "dismiss_appeal";
      caseKey: string;
      title: string;
      description: string;
    }
  | {
      kind: "process_critical";
      title: string;
      description: string;
    };

const DEFAULT_REPORT_SORT: { key: ReportSortKey; direction: SortDirection } = {
  key: "priority",
  direction: "desc",
};
const PRIORITY_SORT_WEIGHT: Record<RiskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
const STATUS_SORT_WEIGHT: Record<ReportCase["workflowStatus"], number> = {
  resolved: 1,
  pending: 2,
};

function compareText(left: string, right: string) {
  return left.localeCompare(right, "vi", { sensitivity: "base" });
}

function compareDates(left: string | null | undefined, right: string | null | undefined) {
  return new Date(left || 0).getTime() - new Date(right || 0).getTime();
}

function getReportCaseSortValue(reportCase: ReportCase, sortKey: ReportSortKey) {
  switch (sortKey) {
    case "target":
      return getTargetLabel(reportCase.representative);
    case "type":
      return getTypeLabel(reportCase.type);
    case "priority":
      return reportCase.riskScore;
    case "status":
      return STATUS_SORT_WEIGHT[reportCase.workflowStatus];
    case "resolution":
      return getResolutionActionLabel(reportCase.resolutionAction, reportCase.type);
    case "latestUpdated":
      return reportCase.latestUpdatedAt;
    case "reportCount":
      return reportCase.reportCount;
    case "uniqueReporterCount":
      return reportCase.uniqueReporterCount;
    default:
      return "";
  }
}

function compareReportCases(
  left: ReportCase,
  right: ReportCase,
  sortKey: ReportSortKey,
) {
  if (sortKey === "latestUpdated") {
    return compareDates(left.latestUpdatedAt, right.latestUpdatedAt);
  }
  if (sortKey === "priority") {
    const priorityDelta =
      PRIORITY_SORT_WEIGHT[left.priority] - PRIORITY_SORT_WEIGHT[right.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return left.riskScore - right.riskScore;
  }

  const leftValue = getReportCaseSortValue(left, sortKey);
  const rightValue = getReportCaseSortValue(right, sortKey);

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue - rightValue;
  }
  return compareText(String(leftValue), String(rightValue));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getReporterLabel(item: AdminReportListItem) {
  return item.reporter?.displayName || item.reporter?.email || "";
}

function getReportCaseSearchText(reportCase: ReportCase) {
  const values = [
    getTargetLabel(reportCase.representative),
    getTypeLabel(reportCase.type),
    getReportedOwner(reportCase.representative),
    getWorkflowStatusLabel(reportCase.workflowStatus),
    getResolutionActionLabel(reportCase.resolutionAction, reportCase.type),
    getPriorityLabel(reportCase.priority),
    reportCase.aiSummary,
    reportCase.aiSeverity ? getAiSeverityLabel(reportCase.aiSeverity) : null,
    reportCase.aiSuggestedAction
      ? getAiSuggestedActionLabel(reportCase.aiSuggestedAction)
      : null,
    reportCase.appealStatus ? getAppealStatusLabel(reportCase.appealStatus) : null,
    reportCase.appealReason,
    reportCase.appealAiSummary,
    reportCase.appealAiRecommendation
      ? getAppealAiRecommendationLabel(reportCase.appealAiRecommendation)
      : null,
    ...(reportCase.aiCategories ?? []),
    ...reportCase.items.flatMap((item) => [
      getReporterLabel(item),
      getReasonLabel(item.reason),
      item.reason,
      item.description,
      item.target?.title,
      item.target?.description,
      item.target?.content,
      item.target?.contentPreview,
      item.target?.story?.title,
      item.target?.author?.displayName,
      item.target?.author?.email,
      item.target?.story?.author?.displayName,
      item.target?.story?.author?.email,
    ]),
  ];

  return normalizeSearchText(values.filter(Boolean).join(" "));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTypeLabel(type: AdminReportType) {
  if (type === "story") return "Truyện";
  if (type === "chapter") return "Chương";
  return "Bình luận";
}

function getReasonLabel(reason: string | null) {
  switch (reason) {
    case "spam":
      return "Spam";
    case "copyright":
      return "Bản quyền";
    case "sexual":
      return "Tình dục";
    case "violence":
      return "Bạo lực";
    case "hate":
      return "Thù ghét";
    case "misleading":
      return "Sai lệch";
    case "abuse":
      return "Quấy rối";
    case "other":
      return "Khác";
    default:
      return "Chưa rõ";
  }
}

function getWorkflowStatusLabel(status: FilterStatus | ReportCase["workflowStatus"]) {
  if (status === "pending") return "Chờ xử lý";
  if (status === "resolved") return "Đã xử lý";
  return "Tất cả trạng thái";
}

function getWorkflowStatusClassName(status: ReportCase["workflowStatus"]) {
  if (status === "pending") {
    return "border-border bg-accent-soft text-accent-strong";
  }
  return "border-border bg-surface-muted text-muted-foreground";
}

function getResolutionActionLabel(action: ResolutionAction, type: AdminReportType) {
  if (!action) return "--";
  if (action === "ignored") return "Bỏ qua";
  if (action === "comment_removed") return "Gỡ bình luận";
  if (action === "chapter_hidden" || type === "chapter") return "Ẩn chương";
  if (action === "story_hidden" || type === "story") return "Ẩn truyện";
  return "Đã xử lý";
}

function getPriorityLabel(priority: RiskPriority) {
  switch (priority) {
    case "critical":
      return "Rất cao";
    case "high":
      return "Cao";
    case "medium":
      return "Trung bình";
    default:
      return "Thấp";
  }
}

function getPriorityClassName(priority: RiskPriority) {
  switch (priority) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-border bg-surface-muted text-muted-foreground";
  }
}

function getAiSeverityLabel(
  severity: "low" | "medium" | "high" | "critical" | null,
) {
  switch (severity) {
    case "critical":
      return "Rất cao";
    case "high":
      return "Cao";
    case "medium":
      return "Trung bình";
    case "low":
      return "Thấp";
    default:
      return "Chưa có";
  }
}

function getAiSuggestedActionLabel(
  action:
    | "allow"
    | "review"
    | "review_soon"
    | "review_urgent"
    | "remove_candidate"
    | "account_lock_candidate"
    | null,
) {
  switch (action) {
    case "allow":
      return "Có thể giữ nguyên";
    case "review_soon":
      return "Nên xem sớm";
    case "review_urgent":
      return "Nên xem gấp";
    case "remove_candidate":
      return "Nghiêng về gỡ nội dung";
    case "account_lock_candidate":
      return "Đề xuất khóa tài khoản người đăng";
    case "review":
      return "Cần admin xem thêm";
    default:
      return "Chưa có";
  }
}

function getAppealStatusLabel(
  status: ReportCase["appealStatus"],
) {
  switch (status) {
    case "pending":
      return "Đang chờ xử lý";
    case "accepted":
      return "Đã chấp nhận";
    case "rejected":
      return "Đã bỏ qua";
    default:
      return "Chưa có kháng nghị";
  }
}

function getAppealFilterLabel(status: AppealFilterStatus) {
  if (status === "pending") return "Kháng nghị chờ xử lý";
  if (status === "accepted") return "Kháng nghị đã chấp nhận";
  return "Kháng nghị đã bỏ qua";
}

function getAppealAiRecommendationLabel(
  recommendation: ReportCase["appealAiRecommendation"],
) {
  switch (recommendation) {
    case "accept":
      return "Nghiêng về chấp nhận";
    case "reject":
      return "Nghiêng về giữ quyết định";
    case "review":
      return "Cần admin xem kỹ";
    default:
      return "Chưa có";
  }
}

function canRestoreReportCase(reportCase: ReportCase) {
  if (reportCase.workflowStatus !== "resolved") return false;
  if (reportCase.restoredAt) return false;
  if (reportCase.appealStatus !== null) return false;
  return (
    reportCase.resolutionAction === "comment_removed" ||
    reportCase.resolutionAction === "chapter_hidden" ||
    reportCase.resolutionAction === "story_hidden"
  );
}

function formatConfidence(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Chưa có";
  return `${Math.round(value * 100)}%`;
}

function getDefaultSortDirection(sortKey: ReportSortKey): SortDirection {
  if (
    sortKey === "priority" ||
    sortKey === "latestUpdated" ||
    sortKey === "reportCount" ||
    sortKey === "uniqueReporterCount"
  ) {
    return "desc";
  }
  return "asc";
}

function ReportTableHeaderButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: ReportSortKey;
  activeSortKey: ReportSortKey;
  direction: SortDirection;
  onSort: (sortKey: ReportSortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-fit items-center gap-1.5 text-left transition hover:text-accent ${
        isActive ? "text-foreground" : ""
      }`}
      aria-label={`Sắp xếp theo ${label}`}
    >
      <span>{label}</span>
      <span
        className="flex h-4 w-3 flex-col items-center justify-center gap-0.5"
        aria-hidden="true"
      >
        <span
          className={`h-0 w-0 border-x-[4px] border-b-[5px] border-x-transparent ${
            isActive && direction === "asc"
              ? "border-b-foreground"
              : "border-b-muted-foreground/45"
          }`}
        />
        <span
          className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent ${
            isActive && direction === "desc"
              ? "border-t-foreground"
              : "border-t-muted-foreground/45"
          }`}
        />
      </span>
    </button>
  );
}

function getTargetLabel(item: AdminReportListItem) {
  if (item.type === "story") {
    return item.target?.title || "Truyện không xác định";
  }

  if (item.type === "chapter") {
    const chapterLabel = item.target?.chapterNumber
      ? `Chương ${item.target.chapterNumber}`
      : "Chương";
    const storyTitle = item.target?.story?.title;
    return storyTitle ? `${chapterLabel} · ${storyTitle}` : chapterLabel;
  }

  const chapterLabel = item.target?.chapterNumber
    ? `Bình luận chương ${item.target.chapterNumber}`
    : "Bình luận";
  const storyTitle = item.target?.story?.title;
  return storyTitle ? `${chapterLabel} · ${storyTitle}` : chapterLabel;
}

function getReportedOwner(item: AdminReportListItem) {
  if (item.type === "story") {
    return item.target?.author?.displayName || item.target?.author?.email || "Chưa rõ";
  }
  if (item.type === "chapter") {
    return (
      item.target?.story?.author?.displayName ||
      item.target?.story?.author?.email ||
      "Chưa rõ"
    );
  }
  return item.target?.author?.displayName || item.target?.author?.email || "Chưa rõ";
}

function getTargetLink(item: AdminReportListItem) {
  if (item.type === "story" && item.target?.slug) {
    return `/stories/${item.target.slug}`;
  }

  const storyId = item.target?.story?.id;
  return storyId ? `/chapters?storyId=${storyId}` : null;
}

function getPreviewText(item: AdminReportListItem) {
  if (item.type === "chapter_comment") {
    return item.target?.content || item.description || "Không có mô tả.";
  }
  if (item.type === "chapter") {
    return item.target?.contentPreview || item.description || "Không có mô tả.";
  }
  return item.target?.description || item.description || "Không có mô tả.";
}

function buildReportCases(items: AdminReportListItem[]): ReportCase[] {
  const groupedMap = new Map<string, AdminReportListItem[]>();

  for (const item of items) {
    const fallbackTargetId = item.target?.id || item.id;
    const key = item.caseId || `${item.type}:${fallbackTargetId}`;
    const bucket = groupedMap.get(key) ?? [];
    bucket.push(item);
    groupedMap.set(key, bucket);
  }

  return Array.from(groupedMap.entries())
    .map(([key, groupItems]) => {
      const sortedItems = [...groupItems].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      );
      const representative = sortedItems[0];
      const reporterIds = new Set<string>();
      const reasonCount = new Map<string, number>();

      for (const item of sortedItems) {
        if (item.reporter?.id) reporterIds.add(item.reporter.id);
        reasonCount.set(item.reason, (reasonCount.get(item.reason) ?? 0) + 1);
      }

      const dominantReason =
        [...reasonCount.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

      const resolvedItems = sortedItems.filter((item) => item.status !== "pending");
      const inferredResolutionAction =
        representative.type === "chapter_comment"
          ? resolvedItems.some((item) => item.status === "removed")
            ? "comment_removed"
            : "ignored"
          : resolvedItems.some((item) => item.status === "action_taken")
            ? representative.type === "story"
              ? "story_hidden"
              : "chapter_hidden"
            : "ignored";

      const workflowStatus =
        representative.caseStatus ??
        (sortedItems.every((item) => item.status !== "pending") ? "resolved" : "pending");
      const resolutionAction =
        representative.caseResolutionAction ??
        (workflowStatus === "resolved" ? inferredResolutionAction : null);
      const previousResolutionAction =
        representative.caseLastResolutionAction ??
        (resolvedItems.length > 0 ? inferredResolutionAction : null);
      const latestResolvedItem =
        resolvedItems.length > 0
          ? [...resolvedItems].sort(
              (left, right) =>
                new Date(right.updatedAt).getTime() -
                new Date(left.updatedAt).getTime(),
            )[0]
          : null;

      return {
        key,
        type: representative.type,
        representative,
        items: sortedItems,
        reportCount: representative.caseReportCount ?? sortedItems.length,
        uniqueReporterCount:
          representative.caseUniqueReporterCount ?? reporterIds.size,
        riskScore: representative.caseRiskScore ?? 0,
        priority: representative.casePriority ?? "low",
        reopenedCount: representative.caseReopenedCount ?? 0,
        latestCreatedAt: sortedItems[0]?.createdAt ?? representative.createdAt,
        latestUpdatedAt: [...sortedItems].sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime(),
        )[0]?.updatedAt ?? representative.updatedAt,
        latestReportedAt:
          representative.caseLastReportedAt ??
          sortedItems[0]?.createdAt ??
          representative.createdAt,
        dominantReason,
        workflowStatus,
        resolutionAction,
        previousResolutionAction,
        previousResolvedAt:
          latestResolvedItem?.resolvedAt ?? latestResolvedItem?.updatedAt ?? null,
        restoredAt: representative.caseRestoredAt,
        restoredById: representative.caseRestoredById,
        aiFlagged: representative.caseAiFlagged,
        aiCategories: representative.caseAiCategories ?? [],
        aiConfidence: representative.caseAiConfidence ?? null,
        aiSeverity: representative.caseAiSeverity ?? null,
        aiSummary: representative.caseAiSummary ?? null,
        aiSuggestedAction: representative.caseAiSuggestedAction ?? null,
        aiCheckedAt: representative.caseAiCheckedAt ?? null,
        appealStatus: representative.caseAppealStatus ?? null,
        appealReason: representative.caseAppealReason ?? null,
        appealSubmittedAt: representative.caseAppealSubmittedAt ?? null,
        appealResolvedAt: representative.caseAppealResolvedAt ?? null,
        appealResolvedById: representative.caseAppealResolvedById ?? null,
        appealAiSummary: representative.caseAppealAiSummary ?? null,
        appealAiRecommendation:
          representative.caseAppealAiRecommendation ?? null,
        appealAiConfidence: representative.caseAppealAiConfidence ?? null,
        appealAiCheckedAt: representative.caseAppealAiCheckedAt ?? null,
        accountLockApplied: Boolean(representative.caseAccountLockApplied),
        accountLockedUserId: representative.caseAccountLockedUserId ?? null,
      };
    })
    .sort((left, right) => {
      if (left.workflowStatus !== right.workflowStatus) {
        return left.workflowStatus === "pending" ? -1 : 1;
      }
      if (left.riskScore !== right.riskScore) {
        return right.riskScore - left.riskScore;
      }
      return (
        new Date(right.latestReportedAt).getTime() -
        new Date(left.latestReportedAt).getTime()
      );
    });
}

export function ReportsPanel() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<ReportSortKey>(DEFAULT_REPORT_SORT.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    DEFAULT_REPORT_SORT.direction,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    AdminReportType | "all"
  >("all");
  const [selectedWorkflowFilter, setSelectedWorkflowFilter] = useState<
    "all" | "pending" | "resolved"
  >("all");
  const [selectedAppealFilter, setSelectedAppealFilter] =
    useState<AppealFilterSelection>("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<
    RiskPriority | "all"
  >("all");
  const [draftTypeFilter, setDraftTypeFilter] = useState<AdminReportType | "all">(
    "all",
  );
  const [draftWorkflowFilter, setDraftWorkflowFilter] = useState<
    "all" | "pending" | "resolved"
  >("all");
  const [draftAppealFilter, setDraftAppealFilter] =
    useState<AppealFilterSelection>("all");
  const [draftPriorityFilter, setDraftPriorityFilter] = useState<
    RiskPriority | "all"
  >("all");
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseKey, setSelectedCaseKey] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lockAuthorTarget, setLockAuthorTarget] = useState<ReportCase | null>(null);
  const [lockAuthorReason, setLockAuthorReason] = useState("");
  const [lockAuthorUntil, setLockAuthorUntil] = useState("");
  const [lockAuthorAlsoResolveContent, setLockAuthorAlsoResolveContent] =
    useState(true);
  const [lockAuthorSummary, setLockAuthorSummary] =
    useState<AdminViolationSummary | null>(null);
  const [lockAuthorSummaryLoading, setLockAuthorSummaryLoading] = useState(false);
  const [lockAuthorSubmitting, setLockAuthorSubmitting] = useState(false);
  const [lockAuthorError, setLockAuthorError] = useState<string | null>(null);
  const [restoreUnlockUser, setRestoreUnlockUser] = useState(false);
  const [criticalLockAuthor, setCriticalLockAuthor] = useState(false);
  const [criticalLockReason, setCriticalLockReason] = useState("");

  const loadReports = useCallback(async ({
    reloading = false,
    shouldApply = () => true,
  }: {
    reloading?: boolean;
    shouldApply?: () => boolean;
  } = {}) => {
    if (reloading) {
      setIsReloading(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getAdminReports({
        type: "all",
        status: "all",
        limit: 100,
      });
      if (!shouldApply()) return;
      setItems(response.items);
    } catch (loadError) {
      if (!shouldApply()) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách báo cáo.",
      );
    } finally {
      if (shouldApply()) {
        setIsLoading(false);
        setIsReloading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    void loadReports({ shouldApply: () => active });

    return () => {
      active = false;
    };
  }, [loadReports]);

  const allCases = useMemo(() => buildReportCases(items), [items]);
  const normalizedSearchQuery = normalizeSearchText(searchQuery);

  const reportCases = useMemo(() => {
    return allCases.filter((reportCase) => {
      const matchesSearch =
        normalizedSearchQuery.length === 0 ||
        getReportCaseSearchText(reportCase).includes(normalizedSearchQuery);
      const matchesType =
        selectedTypeFilter === "all" || reportCase.type === selectedTypeFilter;
      const matchesWorkflow =
        selectedWorkflowFilter === "all" ||
        reportCase.workflowStatus === selectedWorkflowFilter;
      const matchesAppealStatus =
        selectedAppealFilter === "all" ||
        (selectedAppealFilter === "none" && reportCase.appealStatus === null) ||
        (selectedAppealFilter !== "all" &&
          selectedAppealFilter !== "none" &&
          reportCase.appealStatus === selectedAppealFilter);
      const matchesPriority =
        selectedPriorityFilter === "all" ||
        reportCase.priority === selectedPriorityFilter;
      return (
        matchesSearch &&
        matchesType &&
        matchesWorkflow &&
        matchesAppealStatus &&
        matchesPriority
      );
    });
  }, [
    allCases,
    normalizedSearchQuery,
    selectedAppealFilter,
    selectedPriorityFilter,
    selectedTypeFilter,
    selectedWorkflowFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(reportCases.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sortedReportCases = useMemo(() => {
    return [...reportCases].sort((left, right) => {
      const result = compareReportCases(left, right, sortKey);
      if (result !== 0) {
        return sortDirection === "asc" ? result : -result;
      }
      return (
        new Date(right.latestReportedAt).getTime() -
        new Date(left.latestReportedAt).getTime()
      );
    });
  }, [reportCases, sortDirection, sortKey]);
  const paginatedReportCases = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedReportCases.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, sortedReportCases]);

  const selectedCase = useMemo(
    () => reportCases.find((reportCase) => reportCase.key === selectedCaseKey) ?? null,
    [reportCases, selectedCaseKey],
  );

  useEffect(() => {
    if (!selectedCaseKey) return;
    if (!reportCases.some((reportCase) => reportCase.key === selectedCaseKey)) {
      setSelectedCaseKey(null);
    }
  }, [reportCases, selectedCaseKey]);

  useEffect(() => {
    setPage(1);
  }, [
    normalizedSearchQuery,
    selectedAppealFilter,
    selectedPriorityFilter,
    selectedTypeFilter,
    selectedWorkflowFilter,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pendingCount = useMemo(
    () => allCases.filter((reportCase) => reportCase.workflowStatus === "pending").length,
    [allCases],
  );

  const filteredReportCount = useMemo(
    () => reportCases.reduce((total, reportCase) => total + reportCase.reportCount, 0),
    [reportCases],
  );

  const highPriorityCount = useMemo(
    () =>
      allCases.filter(
        (reportCase) =>
          reportCase.workflowStatus === "pending" &&
          (reportCase.priority === "high" || reportCase.priority === "critical"),
      ).length,
    [allCases],
  );

  const criticalPendingCount = useMemo(
    () =>
      allCases.filter(
        (reportCase) =>
          reportCase.workflowStatus === "pending" &&
          reportCase.priority === "critical",
      ).length,
    [allCases],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedTypeFilter !== "all") count += 1;
    if (selectedWorkflowFilter !== "all") count += 1;
    if (selectedAppealFilter !== "all") count += 1;
    if (selectedPriorityFilter !== "all") count += 1;
    return count;
  }, [
    selectedAppealFilter,
    selectedPriorityFilter,
    selectedTypeFilter,
    selectedWorkflowFilter,
  ]);

  function clearDraftFilters() {
    setDraftTypeFilter("all");
    setDraftWorkflowFilter("all");
    setDraftAppealFilter("all");
    setDraftPriorityFilter("all");
  }

  function handleSort(nextSortKey: ReportSortKey) {
    setPage(1);
    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection(getDefaultSortDirection(nextSortKey));
  }

  function resetFilters() {
    clearDraftFilters();
    setSelectedTypeFilter("all");
    setSelectedWorkflowFilter("all");
    setSelectedAppealFilter("all");
    setSelectedPriorityFilter("all");
    setSearchQuery("");
    setPage(1);
    setIsFilterOpen(false);
  }

  function applyFilters() {
    setSelectedTypeFilter(draftTypeFilter);
    setSelectedWorkflowFilter(draftWorkflowFilter);
    setSelectedAppealFilter(draftAppealFilter);
    setSelectedPriorityFilter(draftPriorityFilter);
    setPage(1);
    setIsFilterOpen(false);
  }

  async function applyCaseAction(reportCase: ReportCase, nextStatus: AdminReportStatus) {
    setIsUpdatingStatus(true);
    setDetailError(null);

    try {
      const updatedItems: AdminReportListItem[] = [];

      for (const item of reportCase.items) {
        const updatedItem = await updateAdminReportStatus({
          type: item.type,
          reportId: item.id,
          status: nextStatus,
        });
        updatedItems.push(updatedItem);
      }

      const updatedMap = new Map(
        updatedItems.map((item) => [`${item.type}:${item.id}`, item] as const),
      );

      setItems((current) =>
        current.map((item) => updatedMap.get(`${item.type}:${item.id}`) ?? item),
      );
      setConfirmAction(null);
    } catch (updateError) {
      setDetailError(
        updateError instanceof Error
          ? updateError.message
          : "Không thể cập nhật trạng thái báo cáo.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function openConfirmIgnore(reportCase: ReportCase) {
    setConfirmAction({
      kind: "ignore",
      caseKey: reportCase.key,
      title: "Bỏ qua báo cáo",
      description:
        "Vụ việc này sẽ được đánh dấu là đã xử lý và giữ nguyên nội dung hiện tại.",
    });
  }

  function openConfirmRemoveComment(reportCase: ReportCase) {
    setConfirmAction({
      kind: "remove_comment",
      caseKey: reportCase.key,
      title: "Gỡ bình luận",
      description:
        "Bình luận sẽ bị gỡ khỏi app và vụ việc này sẽ được đánh dấu đã xử lý.",
    });
  }

  function openConfirmHideChapter(reportCase: ReportCase) {
    setConfirmAction({
      kind: "hide_chapter",
      caseKey: reportCase.key,
      title: "Ẩn chương",
      description:
        "Chương sẽ bị ẩn khỏi app với người dùng thường và vụ việc này sẽ được đánh dấu đã xử lý.",
    });
  }

  function openConfirmHideStory(reportCase: ReportCase) {
    setConfirmAction({
      kind: "hide_story",
      caseKey: reportCase.key,
      title: "Ẩn truyện",
      description:
        "Truyện sẽ bị ẩn khỏi app với người dùng thường và vụ việc này sẽ được đánh dấu đã xử lý.",
    });
  }

  function openConfirmRestore(reportCase: ReportCase) {
    setConfirmAction({
      kind: "restore",
      caseKey: reportCase.key,
      title: "Khôi phục nội dung",
      description:
        "Nội dung sẽ được hiển thị lại. Vụ việc vẫn giữ trạng thái đã xử lý và chỉ được khôi phục một lần.",
    });
  }

  function openConfirmAcceptAppeal(reportCase: ReportCase) {
    setConfirmAction({
      kind: "accept_appeal",
      caseKey: reportCase.key,
      title: "Chấp nhận kháng nghị",
      description:
        "Nội dung sẽ được hiển thị lại và người gửi kháng nghị sẽ nhận thông báo khôi phục.",
    });
  }

  function openConfirmDismissAppeal(reportCase: ReportCase) {
    setConfirmAction({
      kind: "dismiss_appeal",
      caseKey: reportCase.key,
      title: "Bỏ qua kháng nghị",
      description:
        "Kháng nghị sẽ được đóng, quyết định xử lý trước đó được giữ nguyên và người gửi sẽ nhận thông báo.",
    });
  }

  function openConfirmProcessCriticalCases() {
    setConfirmAction({
      kind: "process_critical",
      title: "Xử lý tất cả vụ việc rất cao",
      description:
        "Mỗi lượt xử lý tối đa 50 vụ rất cao đang chờ (chạy song song theo lô nhỏ để giữ tải ổn định). Hành động mặc định: gỡ bình luận, ẩn chương hoặc ẩn truyện và gửi thông báo cho người liên quan. Nếu còn vụ chưa xử lý, bạn có thể bấm tiếp.",
    });
  }

  async function restoreCase(reportCase: ReportCase) {
    if (!reportCase.representative.caseId) {
      setDetailError("Không tìm thấy mã vụ việc để khôi phục.");
      return;
    }

    setIsUpdatingStatus(true);
    setDetailError(null);

    try {
      const restoredItem = await restoreAdminReportCase(
        reportCase.representative.caseId,
        { unlockUser: restoreUnlockUser && reportCase.accountLockApplied },
      );
      setItems((current) =>
        current.map((item) =>
          item.caseId === restoredItem.caseId
            ? {
                ...item,
                caseStatus: restoredItem.caseStatus,
                caseResolutionAction: restoredItem.caseResolutionAction,
                caseLastResolutionAction: restoredItem.caseLastResolutionAction,
                caseRestoredAt: restoredItem.caseRestoredAt,
                caseRestoredById: restoredItem.caseRestoredById,
                caseAppealStatus: restoredItem.caseAppealStatus,
                caseAppealResolvedAt: restoredItem.caseAppealResolvedAt,
                caseAppealResolvedById: restoredItem.caseAppealResolvedById,
                caseAccountLockApplied:
                  restoreUnlockUser && reportCase.accountLockApplied
                    ? false
                    : item.caseAccountLockApplied,
                caseAccountLockedUserId:
                  restoreUnlockUser && reportCase.accountLockApplied
                    ? null
                    : item.caseAccountLockedUserId,
                target:
                  item.target?.id === restoredItem.target?.id
                    ? restoredItem.target
                    : item.target,
              }
            : item,
        ),
      );
      setConfirmAction(null);
      setRestoreUnlockUser(false);
    } catch (restoreError) {
      setDetailError(
        restoreError instanceof Error
          ? restoreError.message
          : "Không thể khôi phục nội dung.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function getCaseOwner(reportCase: ReportCase) {
    const item = reportCase.representative;
    if (item.type === "chapter_comment") {
      return item.target?.author ?? null;
    }
    if (item.type === "chapter") {
      return item.target?.story?.author ?? item.target?.author ?? null;
    }
    return item.target?.author ?? null;
  }

  async function openLockAuthorModal(reportCase: ReportCase) {
    if (!reportCase.representative.caseId) {
      setDetailError("Không tìm thấy mã vụ việc để khóa người đăng.");
      return;
    }
    if (reportCase.accountLockApplied) {
      setDetailError("Người đăng nội dung này đã bị khóa từ vụ việc.");
      return;
    }
    const owner = getCaseOwner(reportCase);
    if (!owner?.id) {
      setDetailError("Không xác định được tác giả của nội dung.");
      return;
    }

    setLockAuthorTarget(reportCase);
    setLockAuthorReason("");
    setLockAuthorUntil("");
    setLockAuthorAlsoResolveContent(true);
    setLockAuthorError(null);
    setLockAuthorSummary(null);
    setLockAuthorSummaryLoading(true);

    try {
      const summary = await getUserViolationSummary(owner.id);
      setLockAuthorSummary(summary);
    } catch (summaryError) {
      setLockAuthorError(
        summaryError instanceof Error
          ? summaryError.message
          : "Không thể tải lịch sử vi phạm của người dùng.",
      );
    } finally {
      setLockAuthorSummaryLoading(false);
    }
  }

  function closeLockAuthorModal() {
    if (lockAuthorSubmitting) return;
    setLockAuthorTarget(null);
    setLockAuthorReason("");
    setLockAuthorUntil("");
    setLockAuthorAlsoResolveContent(true);
    setLockAuthorSummary(null);
    setLockAuthorError(null);
  }

  async function submitLockAuthor() {
    if (!lockAuthorTarget?.representative.caseId) return;
    const trimmedReason = lockAuthorReason.trim();
    if (!trimmedReason) {
      setLockAuthorError("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    if (lockAuthorUntil) {
      const parsed = new Date(lockAuthorUntil);
      if (Number.isNaN(parsed.getTime())) {
        setLockAuthorError("Thời hạn khóa không hợp lệ.");
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        setLockAuthorError("Thời hạn khóa phải lớn hơn thời điểm hiện tại.");
        return;
      }
    }

    setLockAuthorSubmitting(true);
    setLockAuthorError(null);
    try {
      const result = await lockReportCaseAuthor(
        lockAuthorTarget.representative.caseId,
        {
          reason: trimmedReason,
          lockedUntil: lockAuthorUntil
            ? new Date(lockAuthorUntil).toISOString()
            : null,
          alsoResolveContent: lockAuthorAlsoResolveContent,
        },
      );

      const lockedUserId = result.lockedUser?.id ?? null;
      setItems((current) =>
        current.map((item) =>
          item.caseId === result.caseId
            ? {
                ...item,
                caseAccountLockApplied: result.accountLockApplied,
                caseAccountLockedUserId: lockedUserId,
              }
            : item,
        ),
      );

      if (lockAuthorAlsoResolveContent) {
        await loadReports({ reloading: true });
      }

      setLockAuthorTarget(null);
      setLockAuthorReason("");
      setLockAuthorUntil("");
      setLockAuthorAlsoResolveContent(true);
      setLockAuthorSummary(null);
    } catch (lockError) {
      setLockAuthorError(
        lockError instanceof Error
          ? lockError.message
          : "Không thể khóa tài khoản người đăng.",
      );
    } finally {
      setLockAuthorSubmitting(false);
    }
  }

  async function resolveAppeal(
    reportCase: ReportCase,
    action: "accept" | "dismiss",
  ) {
    if (!reportCase.representative.caseId) {
      setDetailError("Không tìm thấy mã vụ việc để xử lý kháng nghị.");
      return;
    }

    setIsUpdatingStatus(true);
    setDetailError(null);

    try {
      const updatedItem = await resolveAdminReportAppeal({
        caseId: reportCase.representative.caseId,
        action,
      });
      setItems((current) =>
        current.map((item) =>
          item.caseId === updatedItem.caseId
            ? {
                ...item,
                caseStatus: updatedItem.caseStatus,
                caseResolutionAction: updatedItem.caseResolutionAction,
                caseLastResolutionAction: updatedItem.caseLastResolutionAction,
                caseRestoredAt: updatedItem.caseRestoredAt,
                caseRestoredById: updatedItem.caseRestoredById,
                caseAppealStatus: updatedItem.caseAppealStatus,
                caseAppealReason: updatedItem.caseAppealReason,
                caseAppealSubmittedAt: updatedItem.caseAppealSubmittedAt,
                caseAppealResolvedAt: updatedItem.caseAppealResolvedAt,
                caseAppealResolvedById: updatedItem.caseAppealResolvedById,
                caseAppealAiSummary: updatedItem.caseAppealAiSummary,
                caseAppealAiRecommendation:
                  updatedItem.caseAppealAiRecommendation,
                caseAppealAiConfidence: updatedItem.caseAppealAiConfidence,
                caseAppealAiCheckedAt: updatedItem.caseAppealAiCheckedAt,
                target:
                  item.target?.id === updatedItem.target?.id
                    ? updatedItem.target
                    : item.target,
              }
            : item,
        ),
      );
      setConfirmAction(null);
    } catch (appealError) {
      setDetailError(
        appealError instanceof Error
          ? appealError.message
          : "Không thể xử lý kháng nghị.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function processCriticalCases() {
    if (criticalLockAuthor && !criticalLockReason.trim()) {
      setError("Vui lòng nhập lý do khóa khi chọn khóa luôn người đăng.");
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);
    setDetailError(null);

    try {
      const result = await processCriticalAdminReportCases({
        lockAuthor: criticalLockAuthor,
        lockReason: criticalLockAuthor ? criticalLockReason.trim() : "",
      });
      await loadReports({ reloading: true });
      setConfirmAction(null);
      setCriticalLockAuthor(false);
      setCriticalLockReason("");

      const messages = [];
      messages.push(`Đã xử lý ${result.processedCaseCount} vụ việc rất cao`);
      if (result.lockedAuthorCount > 0) {
        messages.push(`khóa ${result.lockedAuthorCount} tài khoản`);
      }
      if (result.remainingCriticalCount > 0) {
        messages.push(
          `còn ${result.remainingCriticalCount} vụ chưa xử lý, bấm tiếp để tiếp tục`,
        );
      }
      if (result.failedCaseCount > 0) {
        messages.push(`${result.failedCaseCount} vụ việc lỗi`);
      }
      if (result.failedCaseCount > 0 || result.remainingCriticalCount > 0) {
        setError(`${messages.join(", ")}.`);
      }
    } catch (processError) {
      setError(
        processError instanceof Error
          ? processError.message
          : "Không thể xử lý hàng loạt vụ việc rất cao.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;

    if (confirmAction.kind === "process_critical") {
      await processCriticalCases();
      return;
    }

    const reportCase = allCases.find((item) => item.key === confirmAction.caseKey);
    if (!reportCase) {
      setConfirmAction(null);
      return;
    }

    if (confirmAction.kind === "restore") {
      await restoreCase(reportCase);
      return;
    }

    if (confirmAction.kind === "accept_appeal") {
      await resolveAppeal(reportCase, "accept");
      return;
    }

    if (confirmAction.kind === "dismiss_appeal") {
      await resolveAppeal(reportCase, "dismiss");
      return;
    }

    if (confirmAction.kind === "ignore") {
      await applyCaseAction(reportCase, "dismissed");
      return;
    }

    if (confirmAction.kind === "hide_chapter") {
      await applyCaseAction(reportCase, "action_taken");
      return;
    }

    if (confirmAction.kind === "hide_story") {
      await applyCaseAction(reportCase, "action_taken");
      return;
    }

    await applyCaseAction(reportCase, "removed");
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="data-card p-5">
          <p className="text-sm text-muted-foreground">Vụ việc hiển thị</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {reportCases.length}
          </p>
        </div>

        <div className="data-card p-5">
          <p className="text-sm text-muted-foreground">Lượt báo cáo</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {filteredReportCount}
          </p>
        </div>

        <div className="data-card p-5">
          <p className="text-sm text-muted-foreground">Vụ việc chờ xử lý</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">
            {pendingCount}
          </p>
        </div>

        <div className="data-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Ưu tiên cao</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">
                {highPriorityCount}
              </p>
            </div>
            {criticalPendingCount > 0 ? (
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={openConfirmProcessCriticalCases}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Xử lý rất cao
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Rất cao: {criticalPendingCount}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Danh sách báo cáo</h2>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm báo cáo, người dùng, nội dung..."
                className="w-full rounded-xl border border-border bg-white px-4 py-2 pr-10 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent"
              />
              {searchQuery.trim().length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                  aria-label="Xóa tìm kiếm"
                >
                  ×
                </button>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isReloading}
              onClick={() => void loadReports({ reloading: true })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-foreground shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Tải lại danh sách báo cáo"
              title="Tải lại"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 ${
                  isReloading ? "animate-[spin_0.55s_linear_infinite]" : ""
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftTypeFilter(selectedTypeFilter);
                setDraftWorkflowFilter(selectedWorkflowFilter);
                setDraftAppealFilter(selectedAppealFilter);
                setDraftPriorityFilter(selectedPriorityFilter);
                setIsFilterOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Bộ lọc
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                {activeFilterCount}
              </span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Bộ lọc báo cáo</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Lọc theo loại, trạng thái vụ việc, kháng nghị và mức độ ưu tiên.
            </p>
            <div className="mt-4 space-y-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Loại</span>
                <select
                  value={draftTypeFilter}
                  onChange={(event) =>
                    setDraftTypeFilter(event.target.value as AdminReportType | "all")
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  {REPORT_TYPE_VALUES.map((reportType) => (
                    <option key={reportType} value={reportType}>
                      {getTypeLabel(reportType)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Trạng thái vụ việc</span>
                <select
                  value={draftWorkflowFilter}
                  onChange={(event) =>
                    setDraftWorkflowFilter(
                      event.target.value as "all" | "pending" | "resolved",
                    )
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">{getWorkflowStatusLabel("pending")}</option>
                  <option value="resolved">{getWorkflowStatusLabel("resolved")}</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Kháng nghị</span>
                <select
                  value={draftAppealFilter}
                  onChange={(event) =>
                    setDraftAppealFilter(event.target.value as AppealFilterSelection)
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="none">Chưa có kháng nghị</option>
                  <option value="pending">{getAppealFilterLabel("pending")}</option>
                  <option value="accepted">{getAppealFilterLabel("accepted")}</option>
                  <option value="rejected">{getAppealFilterLabel("rejected")}</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">Ưu tiên</span>
                <select
                  value={draftPriorityFilter}
                  onChange={(event) =>
                    setDraftPriorityFilter(event.target.value as RiskPriority | "all")
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  <option value="all">Tất cả</option>
                  <option value="low">{getPriorityLabel("low")}</option>
                  <option value="medium">{getPriorityLabel("medium")}</option>
                  <option value="high">{getPriorityLabel("high")}</option>
                  <option value="critical">{getPriorityLabel("critical")}</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={clearDraftFilters}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Xóa lọc
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="data-card overflow-hidden">
        <div className="grid grid-cols-[1.8fr_0.8fr_1fr_1fr_1fr_0.8fr] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-sm font-medium text-muted-foreground">
          <ReportTableHeaderButton
            label="Đối tượng"
            sortKey="target"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={handleSort}
          />
          <ReportTableHeaderButton
            label="Loại"
            sortKey="type"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={handleSort}
          />
          <ReportTableHeaderButton
            label="Mức độ"
            sortKey="priority"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={handleSort}
          />
          <ReportTableHeaderButton
            label="Trạng thái"
            sortKey="status"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={handleSort}
          />
          <ReportTableHeaderButton
            label="Cách xử lý"
            sortKey="resolution"
            activeSortKey={sortKey}
            direction={sortDirection}
            onSort={handleSort}
          />
          <span>Thao tác</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            Đang tải danh sách báo cáo...
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-sm text-accent-strong">{error}</div>
        ) : reportCases.length === 0 ? (
          <div className="px-5 py-10 text-sm text-muted-foreground">
            {normalizedSearchQuery
              ? "Không tìm thấy báo cáo phù hợp."
              : "Không có báo cáo nào phù hợp với bộ lọc hiện tại."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedReportCases.map((reportCase) => (
              <div
                key={reportCase.key}
                className="grid grid-cols-[1.8fr_0.8fr_1fr_1fr_1fr_0.8fr] gap-4 px-5 py-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {getTargetLabel(reportCase.representative)}
                  </p>
                  <p className="mt-1 truncate text-muted-foreground">
                    Người bị báo cáo: {getReportedOwner(reportCase.representative)}
                  </p>
                </div>

                <div className="flex items-start">
                  <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-semibold text-foreground">
                    {getTypeLabel(reportCase.type)}
                  </span>
                </div>

                <div className="min-w-0">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getPriorityClassName(
                      reportCase.priority,
                    )}`}
                  >
                    {getPriorityLabel(reportCase.priority)}
                  </span>
                  <p className="mt-2 text-muted-foreground">
                    Risk {reportCase.riskScore} · {reportCase.reportCount} lượt
                  </p>
                  {reportCase.aiFlagged ? (
                    <p className="mt-1 text-xs font-medium text-accent-strong">
                      AI đã gắn cờ
                    </p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${getWorkflowStatusClassName(
                      reportCase.workflowStatus,
                    )}`}
                  >
                    {getWorkflowStatusLabel(reportCase.workflowStatus)}
                  </span>
                  <p className="mt-2 text-muted-foreground">
                    {formatDate(reportCase.latestUpdatedAt)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-foreground">
                    {getResolutionActionLabel(reportCase.resolutionAction, reportCase.type)}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {reportCase.uniqueReporterCount} người gửi
                  </p>
                  {reportCase.restoredAt ? (
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      Đã khôi phục
                    </p>
                  ) : null}
                  {reportCase.accountLockApplied ? (
                    <p className="mt-1 inline-flex items-center rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      Đã khóa người đăng
                    </p>
                  ) : null}
                </div>

                <div className="flex items-start">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCaseKey(reportCase.key);
                      setDetailError(null);
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && reportCases.length > 0 ? (
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={reportCases.length}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            itemLabel="vụ việc"
          />
        ) : null}
      </div>

      {selectedCase ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Chi tiết báo cáo</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Xem toàn bộ phản ánh trong vụ việc này và ra quyết định xử lý.
                </p>
              </div>

              <ModalCloseButton
                onClick={() => {
                  setSelectedCaseKey(null);
                  setDetailError(null);
                }}
              />
            </div>

            <div className="max-h-[calc(90vh-80px)] overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <section className="rounded-xl border border-border bg-surface-muted p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Đối tượng bị báo cáo
                      </p>
                      <h4 className="mt-2 text-base font-semibold text-foreground">
                        {getTargetLabel(selectedCase.representative)}
                      </h4>
                      <p className="mt-2 text-sm text-muted-foreground">
                    Người bị báo cáo:{" "}
                        <span className="font-medium text-foreground">
                          {getReportedOwner(selectedCase.representative)}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex h-11 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${getPriorityClassName(
                          selectedCase.priority,
                        )}`}
                      >
                        {getPriorityLabel(selectedCase.priority)}
                      </span>
                      <span
                        className={`inline-flex h-11 items-center whitespace-nowrap rounded-full border px-3 text-xs font-semibold ${getWorkflowStatusClassName(
                          selectedCase.workflowStatus,
                        )}`}
                      >
                        {getWorkflowStatusLabel(selectedCase.workflowStatus)}
                      </span>

                      {getTargetLink(selectedCase.representative) ? (
                        <Link
                          href={getTargetLink(selectedCase.representative)!}
                          className="inline-flex h-11 items-center rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                        >
                          {selectedCase.type === "story"
                          ? "Mở truyện gốc"
                          : "Mở nội dung gốc"}
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-lg border border-border bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Tổng báo cáo
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedCase.reportCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Người gửi
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedCase.uniqueReporterCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Risk score
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedCase.riskScore}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Cách xử lý
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {getResolutionActionLabel(
                          selectedCase.resolutionAction,
                          selectedCase.type,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-white px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Mở lại
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {selectedCase.reopenedCount}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {getPreviewText(selectedCase.representative)}
                  </p>

                  {selectedCase.workflowStatus === "pending" &&
                  selectedCase.previousResolutionAction ? (
                    <div className="mt-4 rounded-lg border border-border bg-white px-3 py-3 text-sm text-muted-foreground">
                      Trước đó vụ việc này đã được xử lý:
                      <span className="font-medium text-foreground">
                        {" "}
                        {getResolutionActionLabel(
                          selectedCase.previousResolutionAction,
                          selectedCase.type,
                        )}
                      </span>
                      {selectedCase.previousResolvedAt ? (
                      <span> vào {formatDate(selectedCase.previousResolvedAt)}</span>
                      ) : null}
                    . Hiện có tín hiệu mới nên vụ việc đã quay lại trạng thái chờ xử lý.
                    </div>
                  ) : null}
                </section>

                {selectedCase.appealStatus ? (
                  <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-700">
                          Kháng nghị
                        </p>
                        <p className="mt-1 text-sm text-amber-900">
                          {getAppealStatusLabel(selectedCase.appealStatus)}
                          {selectedCase.appealSubmittedAt ? (
                            <span>
                              {" "}từ {formatDate(selectedCase.appealSubmittedAt)}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {selectedCase.appealStatus === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmDismissAppeal(selectedCase)}
                            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Bỏ qua kháng nghị
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmAcceptAppeal(selectedCase)}
                            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Chấp nhận kháng nghị
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-lg border border-amber-200 bg-white/80 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Lý do người dùng gửi
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {selectedCase.appealReason || "Không có nội dung."}
                      </p>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Gợi ý AI
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {getAppealAiRecommendationLabel(
                            selectedCase.appealAiRecommendation,
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Độ tin cậy
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {formatConfidence(selectedCase.appealAiConfidence)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-white/80 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          AI kiểm tra
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {formatDate(selectedCase.appealAiCheckedAt)}
                        </p>
                      </div>
                    </div>

                    {selectedCase.appealAiSummary ? (
                      <p className="mt-3 text-sm leading-6 text-amber-950">
                        {selectedCase.appealAiSummary}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        AI chưa trả kết quả. Admin vẫn có thể tự xem xét và xử lý kháng nghị.
                      </p>
                    )}
                  </section>
                ) : null}

                <section className="rounded-xl border border-border bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Quyết định xử lý
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                  Vụ việc được sắp theo mức độ rủi ro. Bạn có thể bỏ qua hoặc xử lý nội dung thật.
                      </p>
                    </div>

                    {selectedCase.workflowStatus === "pending" ? (
                      selectedCase.type === "chapter_comment" ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmIgnore(selectedCase)}
                            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        Bỏ qua báo cáo
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmRemoveComment(selectedCase)}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        Gỡ bình luận
                          </button>
                          {!selectedCase.accountLockApplied ? (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => void openLockAuthorModal(selectedCase)}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Khóa tài khoản
                            </button>
                          ) : null}
                        </div>
                      ) : selectedCase.type === "chapter" ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmIgnore(selectedCase)}
                            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        Bỏ qua báo cáo
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmHideChapter(selectedCase)}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        Ẩn chương
                          </button>
                          {!selectedCase.accountLockApplied ? (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => void openLockAuthorModal(selectedCase)}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Khóa tài khoản
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmIgnore(selectedCase)}
                            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        Bỏ qua báo cáo
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => openConfirmHideStory(selectedCase)}
                            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                          >
                        Ẩn truyện
                          </button>
                          {!selectedCase.accountLockApplied ? (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => void openLockAuthorModal(selectedCase)}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Khóa tài khoản
                            </button>
                          ) : null}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div>
                            Vụ việc này đã được xử lý.
                            <span className="font-medium text-foreground">
                              {" "}Kết quả: {getResolutionActionLabel(selectedCase.resolutionAction, selectedCase.type)}.
                            </span>
                            {selectedCase.restoredAt ? (
                              <span>
                                {" "}Đã khôi phục vào {formatDate(selectedCase.restoredAt)}.
                              </span>
                            ) : null}
                          </div>
                          {selectedCase.accountLockApplied ? (
                            <p className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Đã khóa tài khoản người đăng
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!selectedCase.accountLockApplied ? (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => void openLockAuthorModal(selectedCase)}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Khóa tài khoản
                            </button>
                          ) : null}
                          {canRestoreReportCase(selectedCase) ? (
                            <button
                              type="button"
                              disabled={isUpdatingStatus}
                              onClick={() => openConfirmRestore(selectedCase)}
                              className="min-w-[92px] whitespace-nowrap rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Khôi phục
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {detailError ? (
                    <p className="mt-3 text-sm text-red-600">{detailError}</p>
                  ) : null}
                </section>

                <section className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Đánh giá AI
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Gemini đọc nội dung bị báo cáo và các report để hỗ trợ ưu tiên xử lý.
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        selectedCase.aiFlagged
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-border bg-surface-muted text-muted-foreground"
                      }`}
                    >
                      {selectedCase.aiFlagged ? "AI gắn cờ" : "AI không gắn cờ"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Mức AI
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {getAiSeverityLabel(selectedCase.aiSeverity)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-muted px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Độ tin cậy
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatConfidence(selectedCase.aiConfidence)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-muted px-3 py-3 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        Gợi ý
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {getAiSuggestedActionLabel(selectedCase.aiSuggestedAction)}
                      </p>
                    </div>
                  </div>

                  {selectedCase.aiCheckedAt ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Mức ưu tiên tổng hợp dựa trên số báo cáo, người gửi và lịch sử mở lại; AI là lớp đối chiếu nội dung. Khi AI tự tin không gắn cờ, điểm rủi ro sẽ được hạ ở lần quét kế tiếp.
                    </p>
                  ) : null}

                  <div className="mt-4 rounded-lg border border-border bg-surface-muted px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Tóm tắt AI
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {selectedCase.aiSummary || "AI chưa đưa ra tóm tắt cho vụ việc này."}
                    </p>
                    {selectedCase.aiCategories.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedCase.aiCategories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Lần quét gần nhất: {formatDate(selectedCase.aiCheckedAt)}
                    </p>
                  </div>
                </section>
                <section className="rounded-xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Các báo cáo bên trong
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                  Xem từng mô tả người dùng trước khi quyết định xử lý.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {selectedCase.reportCount} mục
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedCase.items.map((item) => (
                      <article
                        key={`${item.type}:${item.id}`}
                        className="rounded-xl border border-border bg-surface-muted p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {item.reporter?.displayName ||
                                item.reporter?.email ||
                            "Ẩn danh"}
                            </span>
                            <span className="rounded-full border border-border bg-white px-2 py-1 text-xs font-semibold text-muted-foreground">
                              {getReasonLabel(item.reason)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {item.description || "Người dùng không để mô tả."}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">{confirmAction.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmAction.description}
            </p>

            {confirmAction.kind === "restore" &&
            (() => {
              const restoreCaseTarget = allCases.find(
                (item) => item.key === confirmAction.caseKey,
              );
              return restoreCaseTarget?.accountLockApplied ? (
                <label className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={restoreUnlockUser}
                    onChange={(event) => setRestoreUnlockUser(event.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    Đồng thời mở khóa tài khoản người đăng đã bị khóa do vụ việc này.
                  </span>
                </label>
              ) : null;
            })()}

            {confirmAction.kind === "process_critical" ? (
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={criticalLockAuthor}
                    onChange={(event) =>
                      setCriticalLockAuthor(event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    Đồng thời khóa vĩnh viễn tài khoản người đăng của tất cả các
                    vụ việc rất cao trong lượt xử lý này.
                  </span>
                </label>
                {criticalLockAuthor ? (
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      Lý do khóa hàng loạt <span className="text-red-600">*</span>
                    </span>
                    <textarea
                      value={criticalLockReason}
                      onChange={(event) =>
                        setCriticalLockReason(event.target.value)
                      }
                      rows={3}
                      placeholder="Vd: Tài khoản đăng nội dung vi phạm nghiêm trọng và đã bị xác nhận ở mức ưu tiên rất cao."
                      className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </label>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  setRestoreUnlockUser(false);
                }}
                disabled={isUpdatingStatus}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAction()}
                disabled={isUpdatingStatus}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                  {isUpdatingStatus ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lockAuthorTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">
              Khóa tài khoản người đăng
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tài khoản{" "}
              <span className="font-semibold text-foreground">
                {lockAuthorSummary?.user.displayName ||
                  getCaseOwner(lockAuthorTarget)?.displayName ||
                  "?"}
              </span>{" "}
              ({lockAuthorSummary?.user.email ||
                getCaseOwner(lockAuthorTarget)?.email ||
                "?"}) sẽ bị chặn đăng nhập.
            </p>

            <div className="mt-3 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
              {lockAuthorSummaryLoading ? (
                <span>Đang tải lịch sử vi phạm...</span>
              ) : lockAuthorSummary ? (
                <div className="space-y-1">
                  <p>
                    Lịch sử vi phạm:{" "}
                    <span className="font-semibold text-foreground">
                      {lockAuthorSummary.counts.totalContentViolations}
                    </span>{" "}
                    nội dung từng bị xử lý ({lockAuthorSummary.counts.storiesHidden}{" "}
                    truyện ẩn, {lockAuthorSummary.counts.chaptersHidden} chương ẩn,{" "}
                    {lockAuthorSummary.counts.commentsRemoved} bình luận bị gỡ).
                  </p>
                  <p>
                    Số lần đã bị khóa qua report:{" "}
                    <span className="font-semibold text-foreground">
                      {lockAuthorSummary.counts.accountLockCases}
                    </span>
                    .
                  </p>
                  {lockAuthorSummary.user.isLocked ? (
                    <p className="text-red-700">
                      Tài khoản hiện đang bị khóa. Khóa lại sẽ ghi đè lý do/thời hạn cũ.
                    </p>
                  ) : null}
                </div>
              ) : (
                <span>Không tải được lịch sử vi phạm.</span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Lý do khóa <span className="text-red-600">*</span>
                </span>
                <textarea
                  value={lockAuthorReason}
                  onChange={(event) => setLockAuthorReason(event.target.value)}
                  rows={3}
                  placeholder="Vd: Đăng nội dung vi phạm chính sách nội dung lặp lại..."
                  className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-foreground">
                  Khóa tới (để trống = vĩnh viễn)
                </span>
                <input
                  type="datetime-local"
                  value={lockAuthorUntil}
                  onChange={(event) => setLockAuthorUntil(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={lockAuthorAlsoResolveContent}
                  onChange={(event) =>
                    setLockAuthorAlsoResolveContent(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  Đồng thời {lockAuthorTarget.type === "chapter_comment" ? "gỡ" : "ẩn"}{" "}
                  nội dung của vụ việc này.
                </span>
              </label>
              {lockAuthorError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {lockAuthorError}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={lockAuthorSubmitting}
                onClick={closeLockAuthorModal}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={lockAuthorSubmitting}
                onClick={() => void submitLockAuthor()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {lockAuthorSubmitting ? "Đang khóa..." : "Khóa tài khoản"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

