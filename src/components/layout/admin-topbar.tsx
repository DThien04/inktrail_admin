"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/features/auth/types";
import { getNavItemsByRole } from "@/lib/constants/routes";

type AdminTopbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  user: AuthUser | null;
  onLogout: () => void;
};

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M3 5.5H17" />
      <path d="M3 10H17" />
      <path d="M3 14.5H17" />
    </svg>
  );
}

export function AdminTopbar({
  isSidebarOpen,
  onToggleSidebar,
  user,
  onLogout,
}: AdminTopbarProps) {
  const pathname = usePathname();
  const navItems = getNavItemsByRole(user?.role);
  const currentItem =
    navItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? navItems[0];

  return (
    <header className="data-card panel-divider flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg border border-border bg-white p-2 text-foreground transition hover:bg-surface-muted"
          aria-label={isSidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
        >
          <MenuIcon />
        </button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Điều hướng
          </p>
          <p className="truncate text-sm font-medium text-foreground">
            {currentItem.label}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">
                {user.displayName || user.email}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {user.role}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Đăng nhập
          </Link>
        )}
        <div className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
          {user?.role === "author" ? "Tác giả" : "Quản trị"}
        </div>
      </div>
    </header>
  );
}
