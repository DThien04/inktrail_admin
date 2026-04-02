import { apiClient } from "@/lib/api/client";
import type {
  AuthUser,
  LoginPayload,
  LoginResponse,
  ProfileResponse,
} from "@/features/auth/types";

function mapUser(payload: LoginResponse["user"] | ProfileResponse): AuthUser {
  return {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    displayName: payload.display_name,
    avatarUrl: payload.avatar_url ?? null,
  };
}

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<LoginResponse>("/auth/login", {
    body: payload,
    headers: {
      "x-client-platform": "web",
    },
    useCredentials: true,
  });

  return {
    accessToken: response.access_token,
    user: mapUser(response.user),
  };
}

export async function getMyProfile() {
  const response = await apiClient.get<ProfileResponse>("/profile/me", {
    useCredentials: true,
  });
  return mapUser(response);
}

export async function logout() {
  await apiClient.post("/auth/logout", {
    headers: {
      "x-client-platform": "web",
    },
    useCredentials: true,
    skipUnauthorizedRedirect: true,
    skipAuthRefresh: true,
  });
}
