import { apiClient } from "@/lib/api/client";
import type {
  AuthorDashboardData,
  CreateStoryPayload,
  GenreOption,
  MyStoryStats,
  StoryDetail,
  StoryGenre,
  StoryTag,
  StoryListItem,
  StoryStatus,
  UpdateStoryPayload,
} from "@/features/stories/types";

type ApiStoryGenre = {
  id: string;
  name: string;
  slug: string;
};

type ApiStoryTag = {
  id: string;
  name: string;
};

type StoryListResponse = Array<{
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  read_count: number;
  rating?: number;
  rating_count?: number;
  status: StoryStatus;
  moderation_status?: "pending" | "approved" | "rejected" | "failed" | null;
  moderation_checked_at?: string | null;
  moderation_categories?: string[];
  moderation_confidence?: number | null;
  moderation_reason?: string | null;
  updated_at: string;
  author: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  genres: ApiStoryGenre[];
  tags: ApiStoryTag[];
}>;

type StoryDetailResponse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  read_count: number;
  status: StoryStatus;
  moderation_status?: "pending" | "approved" | "rejected" | "failed" | null;
  moderation_checked_at?: string | null;
  moderation_categories?: string[];
  moderation_confidence?: number | null;
  moderation_reason?: string | null;
  updated_at: string;
  chapter_count: number;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
  genres: ApiStoryGenre[];
  tags: ApiStoryTag[];
};

type UpdateStoryResponse = {
  message: string;
  story: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_url: string | null;
    read_count: number;
    status: StoryStatus;
    moderation_status?: "pending" | "approved" | "rejected" | "failed" | null;
    moderation_checked_at?: string | null;
    moderation_categories?: string[];
    moderation_confidence?: number | null;
    moderation_reason?: string | null;
    updated_at: string;
    genres: ApiStoryGenre[];
    tags: ApiStoryTag[];
  };
};

type DeleteStoryResponse = {
  message: string;
};

type GenreListResponse = Array<{
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}>;

type MyStoryStatsResponse = {
  summary: {
    total_stories: number;
    published_stories: number;
    total_reads: number;
    total_likes: number;
    total_comments: number;
    total_ratings: number;
    avg_rating: number;
  };
  top_stories: Array<{
    id: string;
    title: string;
    slug: string;
    status: StoryStatus;
    updated_at: string;
    chapter_count: number;
    read_count: number;
    like_count: number;
    comment_count: number;
    rating: number;
    rating_count: number;
  }>;
};

type AuthorDashboardResponse = {
  summary: {
    total_stories: number;
    published_stories: number;
    draft_stories: number;
    total_chapters: number;
    total_reads: number;
    total_likes: number;
    total_comments: number;
    total_ratings: number;
    avg_rating: number;
  };
  read_trend_7d: Array<{ date: string; reads: number }>;
  top_stories: Array<{
    id: string;
    title: string;
    slug: string;
    status: StoryStatus;
    updated_at: string;
    chapter_count: number;
    read_count: number;
    like_count: number;
    comment_count: number;
    rating: number;
    rating_count: number;
  }>;
  top_chapters: Array<{
    id: string;
    chapter_number: number;
    title: string;
    status: "draft" | "published";
    updated_at: string;
    story: { id: string; title: string; slug: string };
    like_count: number;
    comment_count: number;
    engagement_score: number;
  }>;
  needs_attention: Array<{
    story_id: string;
    title: string;
    slug: string;
    reason: string;
  }>;
};

function mapGenres(genres: ApiStoryGenre[] | undefined): StoryGenre[] {
  return genres ?? [];
}

function mapTags(tags: ApiStoryTag[] | undefined): StoryTag[] {
  return tags ?? [];
}

function mapStory(item: StoryListResponse[number]): StoryListItem {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description,
    coverUrl: item.cover_url,
    readCount: item.read_count ?? 0,
    rating: Number(item.rating ?? 0),
    ratingCount: item.rating_count ?? 0,
    status: item.status,
    moderationStatus: item.moderation_status ?? null,
    moderationCheckedAt: item.moderation_checked_at ?? null,
    moderationCategories: item.moderation_categories ?? [],
    moderationConfidence: item.moderation_confidence ?? null,
    moderationReason: item.moderation_reason ?? null,
    updatedAt: item.updated_at,
    author: item.author
      ? {
          id: item.author.id,
          displayName: item.author.display_name,
          email: item.author.email,
        }
      : null,
    genres: mapGenres(item.genres),
    tags: mapTags(item.tags),
  };
}

function mapStoryDetail(response: StoryDetailResponse): StoryDetail {
  return {
    id: response.id,
    title: response.title,
    slug: response.slug,
    description: response.description,
    coverUrl: response.cover_url,
    readCount: response.read_count ?? 0,
    status: response.status,
    moderationStatus: response.moderation_status ?? null,
    moderationCheckedAt: response.moderation_checked_at ?? null,
    moderationCategories: response.moderation_categories ?? [],
    moderationConfidence: response.moderation_confidence ?? null,
    moderationReason: response.moderation_reason ?? null,
    updatedAt: response.updated_at,
    chapterCount: response.chapter_count ?? 0,
    author: {
      id: response.author.id,
      displayName: response.author.display_name,
      avatarUrl: response.author.avatar_url,
      role: response.author.role,
    },
    genres: mapGenres(response.genres),
    tags: mapTags(response.tags),
  };
}

export async function getAdminStories({
  status,
  query,
}: {
  status?: StoryStatus | "all";
  query?: string;
}) {
  const params = new URLSearchParams();

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (query?.trim()) {
    params.set("query", query.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<StoryListResponse>(`/stories/admin/list${suffix}`);
  return response.map(mapStory);
}

export async function getMyStories({
  status,
}: {
  status?: StoryStatus | "all";
}) {
  const params = new URLSearchParams();
  if (status && status !== "all") {
    params.set("status", status);
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<StoryListResponse>(`/stories/me/list${suffix}`);
  return response.map(mapStory);
}

export async function getMyStoryStats(): Promise<MyStoryStats> {
  const response = await apiClient.get<MyStoryStatsResponse>("/stories/me/stats");
  return {
    summary: {
      totalStories: response.summary.total_stories ?? 0,
      publishedStories: response.summary.published_stories ?? 0,
      totalReads: response.summary.total_reads ?? 0,
      totalLikes: response.summary.total_likes ?? 0,
      totalComments: response.summary.total_comments ?? 0,
      totalRatings: response.summary.total_ratings ?? 0,
      avgRating: Number(response.summary.avg_rating ?? 0),
    },
    topStories: (response.top_stories ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status,
      updatedAt: item.updated_at,
      chapterCount: item.chapter_count ?? 0,
      readCount: item.read_count ?? 0,
      likeCount: item.like_count ?? 0,
      commentCount: item.comment_count ?? 0,
      rating: Number(item.rating ?? 0),
      ratingCount: item.rating_count ?? 0,
    })),
  };
}

export async function getMyAuthorDashboard(): Promise<AuthorDashboardData> {
  const response = await apiClient.get<AuthorDashboardResponse>("/stories/me/dashboard");

  return {
    summary: {
      totalStories: response.summary.total_stories ?? 0,
      publishedStories: response.summary.published_stories ?? 0,
      draftStories: response.summary.draft_stories ?? 0,
      totalChapters: response.summary.total_chapters ?? 0,
      totalReads: response.summary.total_reads ?? 0,
      totalLikes: response.summary.total_likes ?? 0,
      totalComments: response.summary.total_comments ?? 0,
      totalRatings: response.summary.total_ratings ?? 0,
      avgRating: Number(response.summary.avg_rating ?? 0),
    },
    readTrend7d: (response.read_trend_7d ?? []).map((point) => ({
      date: point.date,
      reads: point.reads ?? 0,
    })),
    topStories: (response.top_stories ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status,
      updatedAt: item.updated_at,
      chapterCount: item.chapter_count ?? 0,
      readCount: item.read_count ?? 0,
      likeCount: item.like_count ?? 0,
      commentCount: item.comment_count ?? 0,
      rating: Number(item.rating ?? 0),
      ratingCount: item.rating_count ?? 0,
    })),
    topChapters: (response.top_chapters ?? []).map((item) => ({
      id: item.id,
      chapterNumber: item.chapter_number,
      title: item.title,
      status: item.status,
      updatedAt: item.updated_at,
      story: {
        id: item.story.id,
        title: item.story.title,
        slug: item.story.slug,
      },
      likeCount: item.like_count ?? 0,
      commentCount: item.comment_count ?? 0,
      engagementScore: item.engagement_score ?? 0,
    })),
    needsAttention: (response.needs_attention ?? []).map((item) => ({
      storyId: item.story_id,
      title: item.title,
      slug: item.slug,
      reason: item.reason,
    })),
  };
}

export async function getStoryDetail(slug: string): Promise<StoryDetail> {
  const response = await apiClient.get<StoryDetailResponse>(`/stories/${slug}`);
  return mapStoryDetail(response);
}

export async function getGenres(): Promise<GenreOption[]> {
  const response = await apiClient.get<GenreListResponse>(
    "/genres?include_inactive=true",
  );

  return response.map((genre) => ({
    id: genre.id,
    name: genre.name,
    slug: genre.slug,
    isActive: Boolean(genre.is_active),
  }));
}

export async function updateStory(
  storyId: string,
  payload: UpdateStoryPayload,
): Promise<StoryDetail> {
  const body = new FormData();
  body.set("title", payload.title);
  body.set("slug", payload.slug);
  body.set("description", payload.description);
  body.set("genre_ids", JSON.stringify(payload.genreIds));
  body.set("tag_names", JSON.stringify(payload.tagNames));

  if (payload.coverFile) {
    body.set("cover_file", payload.coverFile);
  }

  const response = await apiClient.patch<UpdateStoryResponse>(
    `/stories/${storyId}`,
    {
      body,
    },
  );

  return getStoryDetail(response.story.slug);
}

export async function createStory(payload: CreateStoryPayload): Promise<StoryDetail> {
  const body = new FormData();
  body.set("title", payload.title);
  body.set("slug", payload.slug);
  body.set("description", payload.description);
  body.set("genre_ids", JSON.stringify(payload.genreIds));
  body.set("tag_names", JSON.stringify(payload.tagNames));

  if (payload.coverFile) {
    body.set("cover_file", payload.coverFile);
  }

  const response = await apiClient.post<UpdateStoryResponse>("/stories", {
    body,
  });

  return getStoryDetail(response.story.slug);
}

export async function updateStoryStatus(
  storyId: string,
  status: StoryStatus,
): Promise<void> {
  await apiClient.patch<UpdateStoryResponse>(`/stories/${storyId}`, {
    body: { status },
  });
}

export async function deleteStory(storyId: string): Promise<void> {
  await apiClient.delete<DeleteStoryResponse>(`/stories/${storyId}`);
}
