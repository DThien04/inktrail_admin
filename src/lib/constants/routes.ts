import type { AuthUser } from "@/features/auth/types";

export const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard" },
  { href: "/stories", label: "Quản lý truyện", icon: "stories" },
  { href: "/reports", label: "Báo cáo", icon: "reports" },
  { href: "/genres", label: "Quản lý thể loại", icon: "genres" },
  { href: "/chapters", label: "Quản lý chương", icon: "chapters" },
  { href: "/users", label: "Người dùng", icon: "users" },
  { href: "/author-applications", label: "Duyệt tác giả", icon: "author" },
] as const;

export const AUTHOR_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/my-stories", label: "Truyện của tôi", icon: "stories" },
  { href: "/chapters", label: "Quản lý chương", icon: "chapters" },
] as const;

export function getNavItemsByRole(role?: AuthUser["role"]) {
  if (role === "author") return AUTHOR_NAV_ITEMS;
  return ADMIN_NAV_ITEMS;
}

export function getDefaultPathByRole(role?: AuthUser["role"]) {
  if (role === "author") return "/dashboard";
  return "/dashboard";
}

export function isPathAllowedForRole(pathname: string, role?: AuthUser["role"]) {
  if (role === "author" && (pathname === "/stories" || pathname.startsWith("/stories/"))) {
    return true;
  }
  const navItems = getNavItemsByRole(role);
  return navItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
