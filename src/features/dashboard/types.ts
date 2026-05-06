export type AdminDashboardSummary = {
  totals: {
    users: number;
    stories: number;
    chapters: number;
    openReportCases: number;
    pendingAppeals: number;
  };
  moderationSnapshot: {
    stories: Record<"pending" | "approved" | "rejected" | "failed", number>;
    chapters: Record<"pending" | "approved" | "rejected" | "failed", number>;
  };
  contentStatus: {
    stories: { draft: number; published: number };
    chapters: { draft: number; published: number };
  };
};

export type AdminDashboardTrendPoint = {
  date: string;
  reportCasesCreated: number;
  reportCasesResolved: number;
  storiesPublished: number;
  chaptersPublished: number;
};

export type AdminDashboardTrends = {
  rangeDays: number;
  points: AdminDashboardTrendPoint[];
};

export type AdminDashboardQueueItem = {
  id: string;
  targetType: "story" | "chapter" | "chapter_comment";
  targetId: string;
  status: "pending" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  riskScore: number;
  reportCount: number;
  uniqueReporterCount: number;
  appealStatus: "pending" | "accepted" | "rejected" | null;
  ageHours: number;
  isSlaOverdue: boolean;
  lastReportedAt: string;
  target:
    | {
        id: string;
        title: string;
        slug: string;
      }
    | {
        id: string;
        title: string;
        chapterNumber: number;
        story: { id: string; title: string; slug: string } | null;
      }
    | {
        id: string;
        contentPreview: string;
        chapter:
          | {
              id: string;
              chapterNumber: number;
              title: string;
              story: { id: string; title: string; slug: string } | null;
            }
          | null;
      }
    | null;
};
