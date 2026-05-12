import type { AuthUser } from "@/features/auth/types";

export type AdminNavIconKey =
  | "dashboard"
  | "stories"
  | "reports"
  | "chapters"
  | "tags"
  | "users"
  | "appeals"
  | "push";

export type AdminNavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: AdminNavIconKey;
  /** Nhãn nhóm trên sidebar (chỉ khi sidebar mở rộng) */
  readonly group?: string;
};

/**
 * Thứ tự: tổng quan → nội dung (truyện–chương–tags) → kiểm duyệt (báo cáo, khiếu nại khóa)
 * → người dùng & gửi tin.
 */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard" },
  { href: "/stories", label: "Quản lý truyện", icon: "stories", group: "Nội dung" },
  { href: "/chapters", label: "Quản lý chương", icon: "chapters" },
  { href: "/tags", label: "Tags", icon: "tags" },
  { href: "/reports", label: "Báo cáo", icon: "reports", group: "Kiểm duyệt" },
  { href: "/lock-appeals", label: "Khiếu nại khóa", icon: "appeals" },
  { href: "/users", label: "Người dùng", icon: "users", group: "Người dùng & gửi tin" },
  { href: "/push-notifications", label: "Gửi thông báo", icon: "push" },
];

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
