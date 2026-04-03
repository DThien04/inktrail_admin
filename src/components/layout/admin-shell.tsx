"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";
import { hasAdminSession } from "@/features/auth/auth-guard";
import { getMyProfile, logout } from "@/features/auth/services/auth-service";
import {
  clearAuthSession,
  getStoredUser,
  setStoredUser,
} from "@/features/auth/storage";
import type { AuthUser } from "@/features/auth/types";

export function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      if (!hasAdminSession()) {
        clearAuthSession();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const storedUser = getStoredUser();
      if (storedUser && isMounted) {
        setUser(storedUser);
      }

      try {
        const profile = await getMyProfile();
        if (profile.role !== "admin") {
          throw new Error("Tai khoan nay khong co quyen admin");
        }

        if (!isMounted) return;
        setStoredUser(profile);
        setUser(profile);
      } catch {
        clearAuthSession();
        if (isMounted) {
          setUser(null);
        }
        router.replace("/login");
        return;
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    }

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Clear local state regardless of API logout result.
    }
    clearAuthSession();
    setUser(null);
    router.replace("/login");
  }

  if (isCheckingAuth) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="data-card w-full max-w-md px-6 py-8 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
            InkTrail Admin
          </p>
          <h1 className="mt-3 text-xl font-semibold text-foreground">
            Dang kiem tra phien dang nhap
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell h-screen overflow-hidden">
      <div className="flex h-full w-full gap-4 px-4 py-4">
        <AdminSidebar isOpen={isSidebarOpen} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          <AdminTopbar
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
            user={user}
            onLogout={handleLogout}
          />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
