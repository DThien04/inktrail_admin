"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { Pagination } from "@/components/ui/pagination";
import {
  getAdminReports,
  processCriticalAdminReportCases,
  resolveAdminReportAppeal,
  restoreAdminReportCase,
  updateAdminReportStatus,
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
  const [selectedTypes, setSelectedTypes] = useState<AdminReportType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<FilterStatus[]>([]);
  const [selectedAppealStatuses, setSelectedAppealStatuses] = useState<
    AppealFilterStatus[]
  >([]);
  const [selectedPriorities, setSelectedPriorities] = useState<RiskPriority[]>([]);
  const [draftTypes, setDraftTypes] = useState<AdminReportType[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<FilterStatus[]>([]);
  const [draftAppealStatuses, setDraftAppealStatuses] = useState<
    AppealFilterStatus[]
  >([]);
  const [draftPriorities, setDraftPriorities] = useState<RiskPriority[]>([]);
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseKey, setSelectedCaseKey] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
        selectedTypes.length === 0 || selectedTypes.includes(reportCase.type);
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(reportCase.workflowStatus);
      const matchesAppealStatus =
        selectedAppealStatuses.length === 0 ||
        (reportCase.appealStatus !== null &&
          selectedAppealStatuses.includes(reportCase.appealStatus));
      const matchesPriority =
        selectedPriorities.length === 0 ||
        selectedPriorities.includes(reportCase.priority);
      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesAppealStatus &&
        matchesPriority
      );
    });
  }, [
    allCases,
    normalizedSearchQuery,
    selectedAppealStatuses,
    selectedPriorities,
    selectedStatuses,
    selectedTypes,
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
    selectedAppealStatuses,
    selectedPriorities,
    selectedStatuses,
    selectedTypes,
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
    if (normalizedSearchQuery.length > 0) count += 1;
    if (selectedTypes.length > 0) count += 1;
    if (selectedStatuses.length > 0) count += 1;
    if (selectedAppealStatuses.length > 0) count += 1;
    if (selectedPriorities.length > 0) count += 1;
    return count;
  }, [
    normalizedSearchQuery.length,
    selectedAppealStatuses.length,
    selectedPriorities.length,
    selectedStatuses.length,
    selectedTypes.length,
  ]);

  function toggleReportType(nextType: AdminReportType) {
    setDraftTypes((current) => {
      if (current.includes(nextType)) {
        return current.filter((type) => type !== nextType);
      }
      return [...current, nextType];
    });
  }

  function toggleStatus(nextStatus: Exclude<FilterStatus, "all">) {
    setDraftStatuses((current) => {
      if (current.includes(nextStatus)) {
        return current.filter((status) => status !== nextStatus);
      }
      return [...current, nextStatus];
    });
  }

  function toggleAppealStatus(nextStatus: AppealFilterStatus) {
    setDraftAppealStatuses((current) => {
      if (current.includes(nextStatus)) {
        return current.filter((status) => status !== nextStatus);
      }
      return [...current, nextStatus];
    });
  }

  function togglePriority(nextPriority: RiskPriority) {
    setDraftPriorities((current) => {
      if (current.includes(nextPriority)) {
        return current.filter((priority) => priority !== nextPriority);
      }
      return [...current, nextPriority];
    });
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
    setDraftTypes([]);
    setDraftStatuses([]);
    setDraftAppealStatuses([]);
    setDraftPriorities([]);
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSelectedAppealStatuses([]);
    setSelectedPriorities([]);
    setSearchQuery("");
    setPage(1);
    setIsFilterOpen(false);
  }

  function applyFilters() {
    setSelectedTypes(draftTypes);
    setSelectedStatuses(draftStatuses);
    setSelectedAppealStatuses(draftAppealStatuses);
    setSelectedPriorities(draftPriorities);
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
        "Tất cả vụ việc đang chờ xử lý có mức ưu tiên rất cao sẽ được xử lý theo hành động mặc định: gỡ bình luận, ẩn chương hoặc ẩn truyện. Thao tác này gửi thông báo cho người liên quan.",
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
                target:
                  item.target?.id === restoredItem.target?.id
                    ? restoredItem.target
                    : item.target,
              }
            : item,
        ),
      );
      setConfirmAction(null);
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
    setIsUpdatingStatus(true);
    setError(null);
    setDetailError(null);

    try {
      const result = await processCriticalAdminReportCases();
      await loadReports({ reloading: true });
      setConfirmAction(null);

      if (result.failedCaseCount > 0) {
        setError(
          `Đã xử lý ${result.processedCaseCount} vụ việc rất cao, ${result.failedCaseCount} vụ việc lỗi.`,
        );
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

      <div className="relative space-y-4">
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
                if (!isFilterOpen) {
                  setDraftTypes(selectedTypes);
                  setDraftStatuses(selectedStatuses);
                  setDraftAppealStatuses(selectedAppealStatuses);
                  setDraftPriorities(selectedPriorities);
                }
                setIsFilterOpen((current) => !current);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-muted"
            >
              {"Bộ lọc"}
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
                {activeFilterCount}
              </span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-muted"
            >
              {"Xóa lọc"}
            </button>
          </div>
        </div>

        <div
          className={
            isFilterOpen
              ? "absolute right-0 top-full z-20 mt-3 w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-lg"
              : "hidden"
          }
        >
          <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{"Bộ lọc báo cáo"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {"Lọc nhanh theo loại, trạng thái, kháng nghị và mức độ ưu tiên."}
              </p>
            </div>
          </div>








          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {"Lo\u1ea1i"}
              </p>
              {REPORT_TYPE_VALUES.map((reportType) => {
                const checked = draftTypes.includes(reportType);
                return (
                  <label
                    key={reportType}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-foreground transition hover:text-accent"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleReportType(reportType)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span>
                      {getTypeLabel(reportType)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {"Trạng thái"}
              </p>
              {(["pending", "resolved"] as const).map((workflowStatus) => {
                const checked = draftStatuses.includes(workflowStatus);
                return (
                  <label
                    key={workflowStatus}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-foreground transition hover:text-accent"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStatus(workflowStatus)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span>
                      {getWorkflowStatusLabel(workflowStatus)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {"Kháng nghị"}
              </p>
              {(["pending", "accepted", "rejected"] as const).map(
                (appealStatus) => {
                  const checked = draftAppealStatuses.includes(appealStatus);
                  return (
                    <label
                      key={appealStatus}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-foreground transition hover:text-accent"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAppealStatus(appealStatus)}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span>{getAppealFilterLabel(appealStatus)}</span>
                    </label>
                  );
                },
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {"Ưu tiên"}
              </p>
              {(["low", "medium", "high", "critical"] as const).map((priority) => {
                const checked = draftPriorities.includes(priority);
                return (
                  <label
                    key={priority}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-sm text-foreground transition hover:text-accent"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePriority(priority)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span>
                      {getPriorityLabel(priority)}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
              >
                {"Xóa lọc"}
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-muted"
              >
                {"Hủy"}
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {"Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      </div>

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
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
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

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
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
    </section>
  );
}

