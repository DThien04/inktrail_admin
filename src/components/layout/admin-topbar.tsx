"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/features/auth/storage";
import type { AuthUser } from "@/features/auth/types";
import { apiClient } from "@/lib/api/client";
import { env } from "@/lib/config/env";
import { getNavItemsByRole } from "@/lib/constants/routes";

type AdminTopbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  user: AuthUser | null;
  onLogout: () => void;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationRealtimePayload = NotificationItem;

function resolveSocketUrl(apiBaseUrl: string) {
  if (!apiBaseUrl) return "";
  try {
    const url = new URL(apiBaseUrl);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return apiBaseUrl.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  }
}

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

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = getNavItemsByRole(user?.role);
  const currentItem =
    navItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? navItems[0];

  const topNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);
  const userDisplayName = user?.displayName || user?.email || "Người dùng";
  const avatarFallback = userDisplayName.trim().charAt(0).toUpperCase();

  async function loadUnreadCount() {
    if (!user) return;
    try {
      const response = await apiClient.get<{ unread_count: number }>("/notifications/me/unread-count");
      setUnreadCount(response.unread_count ?? 0);
    } catch {
      // no-op
    }
  }

  async function loadNotifications() {
    if (!user) return;
    setIsLoadingNotifications(true);
    try {
      const response = await apiClient.get<{ items: NotificationItem[] }>(
        "/notifications/me?limit=8",
      );
      setNotifications(response.items ?? []);
    } catch {
      // no-op
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  async function markAllAsRead() {
    try {
      await apiClient.patch("/notifications/me/read-all");
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
      setUnreadCount(0);
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    void loadUnreadCount();
  }, [user?.id]);

  useEffect(() => {
    if (!isNotificationOpen) return;
    void loadNotifications();
    void loadUnreadCount();
  }, [isNotificationOpen]);

  useEffect(() => {
    if (!user?.id) return;

    const token = getAccessToken();
    const socketUrl = resolveSocketUrl(env.apiBaseUrl);
    if (!socketUrl) return;

    const socket: Socket = io(socketUrl, {
      transports: ["websocket"],
      auth: token ? { token: `Bearer ${token}` } : undefined,
      withCredentials: true,
    });

    socket.on("notification:new", (payload: NotificationRealtimePayload) => {
      if (!payload?.id) return;
      setNotifications((current) => {
        const deduped = current.filter((item) => item.id !== payload.id);
        return [payload, ...deduped].slice(0, 20);
      });
      if (!payload.is_read) {
        setUnreadCount((current) => current + 1);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

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
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationOpen((current) => !current)}
            className="relative rounded-lg border border-border bg-white p-2 text-foreground transition hover:bg-surface-muted"
            aria-label="Mở thông báo"
            title="Thông báo"
          >
            <BellIcon />
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {isNotificationOpen ? (
            <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[360px] rounded-xl border border-border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Thông báo</p>
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="text-xs font-semibold text-accent transition hover:opacity-80"
                >
                  Đọc tất cả
                </button>
              </div>
              {isLoadingNotifications ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">Đang tải...</p>
              ) : topNotifications.length === 0 ? (
                <p className="px-1 py-4 text-sm text-muted-foreground">Chưa có thông báo.</p>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                  {topNotifications.map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-lg border px-3 py-2 ${
                        item.is_read
                          ? "border-border bg-white"
                          : "border-amber-200 bg-amber-50/60"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      {item.body ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {item.body}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-white text-sm font-semibold text-foreground transition hover:bg-surface-muted"
              aria-label="Mở menu tài khoản"
              title={userDisplayName}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={userDisplayName} className="h-full w-full object-cover" />
              ) : (
                <span>{avatarFallback}</span>
              )}
            </button>
            {isUserMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-[260px] rounded-xl border border-border bg-white p-3 shadow-lg">
                <p className="text-sm font-semibold text-foreground">{userDisplayName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                <div className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs font-medium text-foreground">
                  Vai trò: Quản trị
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                >
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}
