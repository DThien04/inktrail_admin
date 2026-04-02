export type StoryStatus = "draft" | "published" | "archived";

export type StoryGenre = {
  id: string;
  name: string;
  slug: string;
};

export type StoryListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  readCount: number;
  status: StoryStatus;
  updatedAt: string;
  author: {
    id: string;
    displayName: string;
    email: string;
  } | null;
  genres: StoryGenre[];
};

export type StoryDetail = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  readCount: number;
  status: StoryStatus;
  updatedAt: string;
  chapterCount: number;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
  };
  genres: StoryGenre[];
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
  status: StoryStatus;
  genreIds: string[];
};
