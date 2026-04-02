import { getAdminStories } from "@/features/stories/services/stories-service";
import { apiClient } from "@/lib/api/client";
import type {
  BannerStoryOption,
  CreateBannerPayload,
  HomeBannerItem,
  UpdateBannerPayload,
} from "@/features/banners/types";

type HomeBannerResponse = Array<{
  id: string;
  banner_image_url: string | null;
  sort_order: number;
  is_active: boolean;
  story: {
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    read_count: number;
  } | null;
}>;

type HomeBannerMutationResponse = {
  message: string;
  banner: {
    id: string;
  };
};

function mapBannerItem(item: HomeBannerResponse[number]): HomeBannerItem {
  return {
    id: item.id,
    bannerImageUrl: item.banner_image_url,
    sortOrder: item.sort_order,
    isActive: item.is_active,
    story: item.story
      ? {
          id: item.story.id,
          title: item.story.title,
          slug: item.story.slug,
          coverUrl: item.story.cover_url,
          readCount: item.story.read_count ?? 0,
        }
      : null,
  };
}

export async function getAdminHomeBanners(): Promise<HomeBannerItem[]> {
  const response = await apiClient.get<HomeBannerResponse>("/admin/home-banners");
  return response.map(mapBannerItem);
}

export async function getPublishedStoryOptions(): Promise<BannerStoryOption[]> {
  const stories = await getAdminStories({ status: "published" });

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    slug: story.slug,
    coverUrl: story.coverUrl,
  }));
}

export async function createHomeBanner(
  payload: CreateBannerPayload,
): Promise<HomeBannerItem[]> {
  const body = new FormData();
  body.set("story_id", payload.storyId);
  body.set("sort_order", String(payload.sortOrder));
  body.set("is_active", String(payload.isActive));

  if (payload.bannerFile) {
    body.set("banner_file", payload.bannerFile);
  }

  await apiClient.post<HomeBannerMutationResponse>("/admin/home-banners", { body });
  return getAdminHomeBanners();
}

export async function updateHomeBanner(
  bannerId: string,
  payload: UpdateBannerPayload,
): Promise<HomeBannerItem[]> {
  const body = new FormData();
  body.set("sort_order", String(payload.sortOrder));
  body.set("is_active", String(payload.isActive));

  if (payload.bannerFile) {
    body.set("banner_file", payload.bannerFile);
  }

  await apiClient.patch<HomeBannerMutationResponse>(`/admin/home-banners/${bannerId}`, {
    body,
  });
  return getAdminHomeBanners();
}

export async function deleteHomeBanner(bannerId: string): Promise<HomeBannerItem[]> {
  await apiClient.delete<{ message: string }>(`/admin/home-banners/${bannerId}`);
  return getAdminHomeBanners();
}
