export type ChapterStatus = "draft" | "published";

export type ChapterListItem = {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  content: string;
  status: ChapterStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateChapterPayload = {
  chapterNumber: number;
  title: string;
  content: string;
  status: ChapterStatus;
};

export type CreateChapterPayload = {
  chapterNumber: number;
  title: string;
  content: string;
  status: ChapterStatus;
};
