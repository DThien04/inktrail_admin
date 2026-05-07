export type StoryStatus = "draft" | "published";
export type ModerationStatus = "pending" | "approved" | "rejected" | "failed";

export type StoryGenre = {
  id: string;
  name: string;
  slug: string;
};

export type StoryTag = {
  id: string;
  name: string;
};

export type StoryListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  readCount: number;
  rating: number;
  ratingCount: number;
  status: StoryStatus;
  moderationStatus: ModerationStatus | null;
  moderationCheckedAt: string | null;
  moderationCategories: string[];
  moderationConfidence: number | null;
  moderationReason: string | null;
  updatedAt: string;
  author: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  genres: StoryGenre[];
  tags: StoryTag[];
};

export type StoryDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  readCount: number;
  status: StoryStatus;
  moderationStatus: ModerationStatus | null;
  moderationCheckedAt: string | null;
  moderationCategories: string[];
  moderationConfidence: number | null;
  moderationReason: string | null;
  updatedAt: string;
  chapterCount: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
  };
  genres: StoryGenre[];
  tags: StoryTag[];
};

export type GenreOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type UpdateStoryPayload = {
  title: string;
  slug: string;
  description: string;
  coverFile: File | null;
  genreIds: string[];
  tagNames: string[];
};

export type CreateStoryPayload = {
  title: string;
  slug: string;
  description: string;
  coverFile: File | null;
  genreIds: string[];
  tagNames: string[];
};

export type MyStoryStatsSummary = {
  totalStories: number;
  publishedStories: number;
  totalReads: number;
  totalLikes: number;
  totalComments: number;
  totalRatings: number;
  avgRating: number;
};

export type MyStoryStatsItem = {
  id: string;
  title: string;
  slug: string;
  status: StoryStatus;
  updatedAt: string;
  chapterCount: number;
  readCount: number;
  likeCount: number;
  commentCount: number;
  rating: number;
  ratingCount: number;
};

export type MyStoryStats = {
  summary: MyStoryStatsSummary;
  topStories: MyStoryStatsItem[];
};

export type AuthorDashboardSummary = {
  totalStories: number;
  publishedStories: number;
  draftStories: number;
  totalChapters: number;
  totalReads: number;
  totalLikes: number;
  totalComments: number;
  totalRatings: number;
  avgRating: number;
};

export type AuthorDashboardReadPoint = {
  date: string;
  reads: number;
};

export type AuthorDashboardTopChapter = {
  id: string;
  chapterNumber: number;
  title: string;
  status: "draft" | "published";
  updatedAt: string;
  story: {
    id: string;
    title: string;
    slug: string;
  };
  likeCount: number;
  commentCount: number;
  engagementScore: number;
};

export type AuthorDashboardNeedAttention = {
  storyId: string;
  title: string;
  slug: string;
  reason: string;
};

export type AuthorDashboardData = {
  summary: AuthorDashboardSummary;
  readTrend7d: AuthorDashboardReadPoint[];
  topStories: MyStoryStatsItem[];
  topChapters: AuthorDashboardTopChapter[];
  needsAttention: AuthorDashboardNeedAttention[];
};
