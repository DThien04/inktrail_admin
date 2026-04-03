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
      chapter_number: payload.chapterNumber,
      title: payload.title,
      content: payload.content,
      status: payload.status,
    },
  });
}

export async function updateChapter(
  chapterId: string,
  payload: UpdateChapterPayload,
): Promise<void> {
  await apiClient.patch<UpdateChapterResponse>(`/chapters/${chapterId}`, {
    body: {
      chapter_number: payload.chapterNumber,
      title: payload.title,
      content: payload.content,
      status: payload.status,
    },
  });
}

export async function moveChapter(chapterId: string, direction: "up" | "down"): Promise<void> {
  await apiClient.post<{ message: string }>(`/chapters/${chapterId}/move`, {
    body: { direction },
  });
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await apiClient.delete<DeleteChapterResponse>(`/chapters/${chapterId}`);
}
