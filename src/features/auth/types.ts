export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    role: string;
    display_name?: string;
    avatar_url?: string | null;
  };
};

export type ProfileResponse = {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  avatar_url?: string | null;
};
