import { apiClient } from "@/lib/api/client";
import type {
  AdminDashboardQueueItem,
  AdminDashboardSummary,
  AdminDashboardTrends,
} from "@/features/dashboard/types";

type SummaryResponse = {
  totals: {
    users: number;
    stories: number;
    chapters: number;
    open_report_cases: number;
    pending_appeals: number;
  };
  moderation_snapshot: {
    stories: Record<"pending" | "approved" | "rejected" | "failed", number>;
    chapters: Record<"pending" | "approved" | "rejected" | "failed", number>;
  };
  content_status: {
    stories: { draft: number; published: number };
    chapters: { draft: number; published: number };
  };
};

type TrendsResponse = {
  range_days: number;
  points: Array<{
    date: string;
    report_cases_created: number;
    report_cases_resolved: number;
    stories_published: number;
    chapters_published: number;
  }>;
};

type QueueResponse = Array<{
  id: string;
  targetType: "story" | "chapter" | "chapter_comment";
  targetId: string;
  status: "pending" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  riskScore: number;
  reportCount: number;
  uniqueReporterCount: number;
  appealStatus: "pending" | "accepted" | "rejected" | null;
  age_hours: number;
  is_sla_overdue: boolean;
  lastReportedAt: string;
  target: any;
}>;

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response = await apiClient.get<SummaryResponse>("/admin/dashboard/summary");
  return {
    totals: {
      users: response.totals.users ?? 0,
      stories: response.totals.stories ?? 0,
      chapters: response.totals.chapters ?? 0,
      openReportCases: response.totals.open_report_cases ?? 0,
      pendingAppeals: response.totals.pending_appeals ?? 0,
    },
    moderationSnapshot: response.moderation_snapshot,
    contentStatus: response.content_status,
  };
}

export async function getAdminDashboardTrends(
  range: "7d" | "30d" = "7d",
): Promise<AdminDashboardTrends> {
  const response = await apiClient.get<TrendsResponse>(
    `/admin/dashboard/trends?range=${range}`,
  );
  return {
    rangeDays: response.range_days,
    points: (response.points ?? []).map((item) => ({
      date: item.date,
      reportCasesCreated: item.report_cases_created ?? 0,
      reportCasesResolved: item.report_cases_resolved ?? 0,
      storiesPublished: item.stories_published ?? 0,
      chaptersPublished: item.chapters_published ?? 0,
    })),
  };
}

export async function getAdminDashboardQueues(limit = 8): Promise<AdminDashboardQueueItem[]> {
  const response = await apiClient.get<QueueResponse>(
    `/admin/dashboard/queues?limit=${limit}`,
  );
  return (response ?? []).map((item) => {
    let target: AdminDashboardQueueItem["target"] = null;
    if (item.targetType === "story" && item.target) {
      target = {
        id: item.target.id,
        title: item.target.title,
        slug: item.target.slug,
      };
    } else if (item.targetType === "chapter" && item.target) {
      target = {
        id: item.target.id,
        title: item.target.title,
        chapterNumber: item.target.chapter_number,
        story: item.target.story
          ? {
              id: item.target.story.id,
              title: item.target.story.title,
              slug: item.target.story.slug,
            }
          : null,
      };
    } else if (item.targetType === "chapter_comment" && item.target) {
      target = {
        id: item.target.id,
        contentPreview: item.target.content_preview,
        chapter: item.target.chapter
          ? {
              id: item.target.chapter.id,
              chapterNumber: item.target.chapter.chapterNumber ?? item.target.chapter.chapter_number,
              title: item.target.chapter.title,
              story: item.target.chapter.story
                ? {
                    id: item.target.chapter.story.id,
                    title: item.target.chapter.story.title,
                    slug: item.target.chapter.story.slug,
                  }
                : null,
            }
          : null,
      };
    }

    return {
      id: item.id,
      targetType: item.targetType,
      targetId: item.targetId,
      status: item.status,
      priority: item.priority,
      riskScore: item.riskScore ?? 0,
      reportCount: item.reportCount ?? 0,
      uniqueReporterCount: item.uniqueReporterCount ?? 0,
      appealStatus: item.appealStatus ?? null,
      ageHours: item.age_hours ?? 0,
      isSlaOverdue: Boolean(item.is_sla_overdue),
      lastReportedAt: item.lastReportedAt,
      target,
    };
  });
}
