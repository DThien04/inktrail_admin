import { getAccessToken, getStoredUser } from "@/features/auth/storage";

export function hasAdminSession() {
  const token = getAccessToken();
  const user = getStoredUser();

  return Boolean(token && user?.role === "admin");
}
