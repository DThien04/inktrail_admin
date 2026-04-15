import type { AuthUser } from "@/features/auth/types";

export const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", shortLabel: "Dash" },
  { href: "/stories", label: "Quản lý truyện", shortLabel: "Truyện" },
  { href: "/genres", label: "Quản lý thể loại", shortLabel: "Thể loại" },
  { href: "/banners", label: "Quản lý banner", shortLabel: "Banner" },
  { href: "/chapters", label: "Quản lý chương", shortLabel: "Chương" },
  { href: "/users", label: "Người dùng", shortLabel: "User" },
] as const;

export const AUTHOR_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Dash" },
  { href: "/my-stories", label: "Truyện của tôi", shortLabel: "Truyện" },
  { href: "/chapters", label: "Quản lý chương", shortLabel: "Chương" },
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
