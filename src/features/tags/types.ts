export type AdminTagItem = {
  id: string;
  name: string;
  description: string | null;
  group: { id: string; name: string } | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTagListResponse = {
  total: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    group: { id: string; name: string } | null;
    created_at: string;
    updated_at: string;
    usage_count: number;
  }>;
};

export type AdminTagGroupItem = {
  id: string;
  name: string;
  description: string | null;
  tagCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTagGroupListResponse = {
  total: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    tag_count: number;
    created_at: string;
    updated_at: string;
  }>;
};

