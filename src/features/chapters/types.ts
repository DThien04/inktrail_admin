export type ChapterStatus = "draft" | "published";
export type ModerationStatus = "pending" | "approved" | "rejected" | "failed";

export type ChapterListItem = {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  content: string;
  status: ChapterStatus;
  moderationStatus: ModerationStatus | null;
  moderationCheckedAt: string | null;
  moderationCategories: string[];
  moderationConfidence: number | null;
  moderationReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateChapterPayload = {
  chapterNumber: number;
  title: string;
  content: string;
  status?: ChapterStatus;
};

export type CreateChapterPayload = {
  chapterNumber: number;
  title: string;
  content: string;
  status?: ChapterStatus;
};
