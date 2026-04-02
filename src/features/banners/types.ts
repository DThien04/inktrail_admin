export type BannerStoryOption = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
};

export type HomeBannerItem = {
  id: string;
  bannerImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  story: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    readCount: number;
  } | null;
};

export type CreateBannerPayload = {
  storyId: string;
  sortOrder: number;
  isActive: boolean;
  bannerFile: File | null;
};

export type UpdateBannerPayload = {
  sortOrder: number;
  isActive: boolean;
  bannerFile: File | null;
};
