export type GenreItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

export type GenrePayload = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
};
