"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItemsByRole } from "@/lib/constants/routes";
import type { AuthUser } from "@/features/auth/types";

type AdminSidebarProps = {
  isOpen: boolean;
  role?: AuthUser["role"];
};

type NavIconKey =
  | "dashboard"
  | "stories"
  | "reports"
  | "genres"
  | "chapters"
  | "users";

function NavIcon({ icon, active }: { icon: NavIconKey; active: boolean }) {
  const color = active ? "text-white" : "text-muted-foreground";
  const common = `h-[18px] w-[18px] ${color}`;

  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <rect x="3" y="3" width="6" height="6" rx="1.5" />
          <rect x="11" y="3" width="6" height="4" rx="1.5" />
          <rect x="11" y="9" width="6" height="8" rx="1.5" />
          <rect x="3" y="11" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "stories":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v13H5.5A1.5 1.5 0 0 0 4 17.5v-13Z" />
          <path d="M4 17.5A1.5 1.5 0 0 1 5.5 16H16" />
          <path d="M8 6.5h5M8 9h5" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M10 3 3.5 15h13L10 3Z" />
          <path d="M10 7.5v3.5M10 13.2h.01" strokeLinecap="round" />
        </svg>
      );
    case "genres":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M3.5 6.5h13M3.5 10h13M3.5 13.5h13" strokeLinecap="round" />
          <circle cx="6" cy="6.5" r="0.9" fill="currentColor" />
          <circle cx="9.5" cy="10" r="0.9" fill="currentColor" />
          <circle cx="13" cy="13.5" r="0.9" fill="currentColor" />
        </svg>
      );
    case "chapters":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <rect x="4" y="3.5" width="12" height="13" rx="2" />
          <path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <circle cx="10" cy="7" r="3" />
          <path d="M4 16c1.3-2.4 3.5-3.6 6-3.6S14.7 13.6 16 16" strokeLinecap="round" />
        </svg>
      );
  }
}

export function AdminSidebar({ isOpen, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItemsByRole(role);
  const title = "Quản trị";

  return (
    <aside
      className={`hidden h-full shrink-0 overflow-y-auto rounded-xl border border-border bg-sidebar p-3 lg:flex lg:flex-col ${
        isOpen ? "sidebar-width-open" : "sidebar-width-closed"
      }`}
    >
      <div
        className={`flex items-center ${isOpen ? "justify-between" : "justify-center"} border-b border-border pb-3`}
      >
        {isOpen ? (
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              InkTrail
            </p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">{title}</h2>
            <div className="mt-3 h-1 w-14 rounded-full bg-accent" />
          </div>
        ) : (
          <span className="text-sm font-semibold text-accent">IT</span>
        )}
      </div>

      <nav className="mt-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${isOpen ? "gap-2.5 justify-start" : "justify-center"} rounded-lg border px-3 py-2.5 text-sm transition ${
                isActive
                  ? "border-accent bg-accent text-white"
                  : "border-transparent text-foreground hover:border-border hover:bg-surface-muted"
              }`}
              title={item.label}
            >
              <NavIcon icon={item.icon} active={isActive} />
              {isOpen ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
