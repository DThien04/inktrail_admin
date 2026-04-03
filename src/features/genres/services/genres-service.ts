import { apiClient } from "@/lib/api/client";
import type { GenreItem, GenrePayload } from "@/features/genres/types";

type GenreListResponse = Array<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}>;

type GenreMutationResponse = {
  message: string;
  genre: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  };
};

function mapGenre(item: GenreListResponse[number]): GenreItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    isActive: Boolean(item.is_active),
  };
}

export async function getAdminGenres(keyword?: string): Promise<GenreItem[]> {
  const params = new URLSearchParams();
  params.set("include_inactive", "true");

  if (keyword?.trim()) {
    params.set("keyword", keyword.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await apiClient.get<GenreListResponse>(`/genres${suffix}`);
  return response.map(mapGenre);
}

export async function createGenre(payload: GenrePayload): Promise<GenreItem> {
  const response = await apiClient.post<GenreMutationResponse>("/genres", {
    body: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      is_active: payload.isActive,
    },
  });

  return mapGenre(response.genre);
}

export async function updateGenre(
  genreId: string,
  payload: GenrePayload,
): Promise<GenreItem> {
  const response = await apiClient.patch<GenreMutationResponse>(`/genres/${genreId}`, {
    body: {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      is_active: payload.isActive,
    },
  });

  return mapGenre(response.genre);
}
