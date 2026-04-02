import { apiClient } from "@/lib/api/client";
import type {
  GenreOption,
  StoryDetail,
  StoryGenre,
  StoryListItem,
  StoryStatus,
  UpdateStoryPayload,
} from "@/features/stories/types";

type ApiStoryGenre = {
  id: string;
  name: string;
  slug: string;
};

type StoryListResponse = Array<{
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  read_count: number;
  status: StoryStatus;
  updated_at: string;
  author: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  genres: ApiStoryGenre[];
}>;

type StoryDetailResponse = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  read_count: number;
  status: StoryStatus;
  updated_at: string;
  chapter_count: number;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
  genres: ApiStoryGenre[];
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
    updated_at: string;
    genres: ApiStoryGenre[];
  };
};

type GenreListResponse = Array<{
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}>;

function mapGenres(genres: ApiStoryGenre[] | undefined): StoryGenre[] {
  return genres ?? [];
}

function mapStory(item: StoryListResponse[number]): StoryListItem {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description,
    coverUrl: item.cover_url,
    readCount: item.read_count ?? 0,
    status: item.status,
    updatedAt: item.updated_at,
    author: item.author
      ? {
          id: item.author.id,
          displayName: item.author.display_name,
          email: item.author.email,
        }
      : null,
    genres: mapGenres(item.genres),
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
    updatedAt: response.updated_at,
    chapterCount: response.chapter_count ?? 0,
    author: {
      id: response.author.id,
      displayName: response.author.display_name,
      avatarUrl: response.author.avatar_url,
      role: response.author.role,
    },
    genres: mapGenres(response.genres),
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
  body.set("status", payload.status);
  body.set("genre_ids", JSON.stringify(payload.genreIds));

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
