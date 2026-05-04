"use client";

import { useState } from "react";
import { AdminDashboardPanel } from "@/features/dashboard/components/admin-dashboard-panel";
import { AuthorDashboardPanel } from "@/features/dashboard/components/author-dashboard-panel";
import { getStoredUser } from "@/features/auth/storage";
import type { AuthUser } from "@/features/auth/types";

export default function DashboardPage() {
  const [user] = useState<AuthUser | null>(() => getStoredUser());

  if (user?.role === "author") {
    return <AuthorDashboardPanel />;
  }

  return <AdminDashboardPanel />;
}
