import type { AuthUser } from "@/features/auth/types";

export const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard" },
  { href: "/stories", label: "Quản lý truyện", icon: "stories" },
  { href: "/reports", label: "Báo cáo", icon: "reports" },
  { href: "/chapters", label: "Quản lý chương", icon: "chapters" },
  { href: "/tags", label: "Tags", icon: "tags" },
  { href: "/users", label: "Người dùng", icon: "users" },
] as const;

export function getNavItemsByRole(role?: AuthUser["role"]) {
  return ADMIN_NAV_ITEMS;
}

export function getDefaultPathByRole(role?: AuthUser["role"]) {
  return "/dashboard";
}

export function isPathAllowedForRole(pathname: string, role?: AuthUser["role"]) {
  const navItems = getNavItemsByRole(role);
  return navItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
