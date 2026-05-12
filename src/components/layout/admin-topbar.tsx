"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/features/auth/storage";
import type { AuthUser } from "@/features/auth/types";
import { apiClient } from "@/lib/api/client";
import { env } from "@/lib/config/env";
import { getNavItemsByRole } from "@/lib/constants/routes";
import { AdminModalLayer } from "@/components/ui/admin-modal-layer";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { Toast } from "@/components/ui/toast";

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
  type?: string;
};

type NotificationRealtimePayload = NotificationItem;

/**
 * Các loại thông báo có ích với admin (đồng bộ với ADMIN_RELEVANT_NOTIFICATION_TYPES
 * trong notification.service.js). Tất cả loại khác (chapter_liked, chapter_commented,
 * chapter_published, story_published, admin_message do admin tự gửi) bị lọc khỏi bell.
 */
const ADMIN_RELEVANT_NOTIFICATION_TYPES = new Set<string>(["system"]);

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

function EyeIcon() {
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
      <path d="M2 12s4.5-7 10-7 10 7 10 7-4.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a3 3 0 1 0 4.24 4.24" />
      <path d="M9.88 9.88A9.9 9.9 0 002.5 12c.83 2 4.27 6.5 9.5 6.5 1.52 0 3-.4 4.33-1.15" />
      <path d="M14.12 14.12A9.9 9.9 0 0021.5 12c-.83-2-4.27-6.5-9.5-6.5-1.52 0-3 .4-4.33 1.15" />
    </svg>
  );
}

type PasswordRevealFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  disabled: boolean;
  autoComplete: string;
  hint?: string;
};

function PasswordRevealField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  disabled,
  autoComplete,
  hint,
}: PasswordRevealFieldProps) {
  return (
    <div className="space-y-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-lg border border-border bg-white py-2 pl-3 pr-10 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </div>
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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordToast, setPasswordToast] = useState<{
    title: string;
    message: string;
    variant: "success" | "error";
  } | null>(null);

  function resetPasswordForm() {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError("");
    setIsSubmittingPassword(false);
  }

  function openChangePassword() {
    resetPasswordForm();
    setIsUserMenuOpen(false);
    setIsChangePasswordOpen(true);
  }

  function closeChangePassword() {
    if (isSubmittingPassword) return;
    setIsChangePasswordOpen(false);
    resetPasswordForm();
  }

  async function submitChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingPassword) return;

    const oldValue = oldPassword.trim();
    const newValue = newPassword.trim();
    const confirmValue = confirmPassword.trim();

    if (!oldValue || !newValue || !confirmValue) {
      setPasswordError("Vui lòng nhập đầy đủ các trường.");
      return;
    }
    if (newValue.length < 6) {
      setPasswordError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newValue === oldValue) {
      setPasswordError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    if (newValue !== confirmValue) {
      setPasswordError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setPasswordError("");
    setIsSubmittingPassword(true);
    try {
      await apiClient.patch("/profile/me/password", {
        body: {
          old_password: oldValue,
          new_password: newValue,
          confirm_new_password: confirmValue,
        },
      });
      setIsChangePasswordOpen(false);
      resetPasswordForm();
      setPasswordToast({
        title: "Đã đổi mật khẩu",
        message:
          "Mật khẩu của bạn đã được cập nhật. Lần đăng nhập tiếp theo hãy dùng mật khẩu mới.",
        variant: "success",
      });
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  }

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
      const response = await apiClient.get<{ unread_count: number }>(
        "/notifications/me/unread-count?for_admin=true",
      );
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
        "/notifications/me?limit=8&for_admin=true",
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

  async function markAsRead(notificationId: string) {
    const id = String(notificationId || "").trim();
    if (!id) return;
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
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
      const t = String(payload.type ?? "").trim();
      if (!ADMIN_RELEVANT_NOTIFICATION_TYPES.has(t)) return;
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
                      onClick={() => void markAsRead(item.id)}
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
                  onClick={openChangePassword}
                  className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
                >
                  Đổi mật khẩu
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
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

      {isChangePasswordOpen ? (
        <AdminModalLayer>
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Đổi mật khẩu
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vì lý do bảo mật, hệ thống sẽ thu hồi các phiên đăng nhập khác sau khi đổi.
                </p>
              </div>
              <ModalCloseButton
                onClick={closeChangePassword}
                disabled={isSubmittingPassword}
              />
            </div>

            <form onSubmit={submitChangePassword} className="mt-4 space-y-3">
              <PasswordRevealField
                label="Mật khẩu hiện tại"
                value={oldPassword}
                onChange={setOldPassword}
                visible={showOldPassword}
                onToggleVisible={() => setShowOldPassword((v) => !v)}
                disabled={isSubmittingPassword}
                autoComplete="current-password"
              />
              <PasswordRevealField
                label="Mật khẩu mới"
                value={newPassword}
                onChange={setNewPassword}
                visible={showNewPassword}
                onToggleVisible={() => setShowNewPassword((v) => !v)}
                disabled={isSubmittingPassword}
                autoComplete="new-password"
                hint="Tối thiểu 6 ký tự, khác mật khẩu hiện tại."
              />
              <PasswordRevealField
                label="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggleVisible={() => setShowConfirmPassword((v) => !v)}
                disabled={isSubmittingPassword}
                autoComplete="new-password"
              />

              {passwordError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              ) : null}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeChangePassword}
                  disabled={isSubmittingPassword}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingPassword ? "Đang lưu..." : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </AdminModalLayer>
      ) : null}

      <Toast
        open={!!passwordToast}
        title={passwordToast?.title ?? ""}
        message={passwordToast?.message ?? ""}
        variant={passwordToast?.variant ?? "success"}
        onClose={() => setPasswordToast(null)}
      />
    </header>
  );
}
