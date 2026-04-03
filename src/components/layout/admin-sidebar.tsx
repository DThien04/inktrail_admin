"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/lib/constants/routes";

type AdminSidebarProps = {
  isOpen: boolean;
};

export function AdminSidebar({ isOpen }: AdminSidebarProps) {
  const pathname = usePathname();

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
            <h2 className="mt-2 text-lg font-semibold text-foreground">Admin</h2>
            <div className="mt-3 h-1 w-14 rounded-full bg-accent" />
          </div>
        ) : (
          <span className="text-sm font-semibold text-accent">IT</span>
        )}
      </div>

      <nav className="mt-4 space-y-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${isOpen ? "justify-between" : "justify-center"} rounded-lg border px-3 py-2.5 text-sm transition ${
                isActive
                  ? "border-accent bg-accent text-white"
                  : "border-transparent text-foreground hover:border-border hover:bg-surface-muted"
              }`}
              title={item.label}
            >
              <span>{isOpen ? item.label : item.shortLabel}</span>
              {isOpen ? (
                <span
                  className={`text-[11px] uppercase tracking-[0.18em] ${
                    isActive ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {item.shortLabel}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-border bg-surface-muted p-3">
        <p className="text-xs text-muted-foreground">
          {isOpen ? "San sang noi env, api client va token storage." : "JWT"}
        </p>
      </div>
    </aside>
  );
}
