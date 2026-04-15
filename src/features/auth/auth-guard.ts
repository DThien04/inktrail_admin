import { getAccessToken, getStoredUser } from "@/features/auth/storage";

export function hasBackofficeSession() {
  const token = getAccessToken();
  const user = getStoredUser();

  return Boolean(token && (user?.role === "admin" || user?.role === "author"));
}
