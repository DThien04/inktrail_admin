import { apiClient } from "@/lib/api/client";
import type {
  CreateChapterPayload,
  ChapterListItem,
  ChapterStatus,
  UpdateChapterPayload,
} from "@/features/chapters/types";

type ChapterListResponse = Array<{
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  status: ChapterStatus;
  moderation_status?: "pending" | "approved" | "rejected" | "failed" | null;
  moderation_checked_at?: string | null;
  moderation_categories?: string[];
  moderation_confidence?: number | null;
  moderation_reason?: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}>;

type UpdateChapterResponse = {
  message: string;
  chapter: {
    id: string;
  };
};

type TogglePublishResponse = {
  message: string;
  chapter: {
    id: string;
  };
};

type DeleteChapterResponse = {
  message: string;
};

type CreateChapterResponse = {
  message: string;
  chapter: {
    id: string;
  };
};

function mapChapter(item: ChapterListResponse[number]): ChapterListItem {
  return {
    id: item.id,
    storyId: item.story_id,
    chapterNumber: item.chapter_number,
    title: item.title,
    content: item.content,
    status: item.status,
    moderationStatus: item.moderation_status ?? null,
    moderationCheckedAt: item.moderation_checked_at ?? null,
    moderationCategories: item.moderation_categories ?? [],
    moderationConfidence: item.moderation_confidence ?? null,
    moderationReason: item.moderation_reason ?? null,
    publishedAt: item.published_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function getChaptersByStory(storyId: string): Promise<ChapterListItem[]> {
  const response = await apiClient.get<ChapterListResponse>(`/chapters/stories/${storyId}/chapters`);
  return response.map(mapChapter);
}

export async function createChapter(
  storyId: string,
  payload: CreateChapterPayload,
): Promise<void> {
  await apiClient.post<CreateChapterResponse>(`/chapters/stories/${storyId}/chapters`, {
    body: {
      title: payload.title,
      content: payload.content,
      status: payload.status ?? "draft",
    },
  });
}

export async function updateChapter(
  chapterId: string,
  payload: UpdateChapterPayload,
): Promise<void> {
  const body: Record<string, unknown> = {
    title: payload.title,
    content: payload.content,
  };
  if (payload.status) {
    body.status = payload.status;
  }

  await apiClient.patch<UpdateChapterResponse>(`/chapters/${chapterId}`, {
    body,
  });
}

export async function publishChapter(chapterId: string): Promise<void> {
  await apiClient.post<TogglePublishResponse>(`/chapters/${chapterId}/publish`);
}

export async function unpublishChapter(chapterId: string): Promise<void> {
  await apiClient.post<TogglePublishResponse>(`/chapters/${chapterId}/unpublish`);
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await apiClient.delete<DeleteChapterResponse>(`/chapters/${chapterId}`);
}
