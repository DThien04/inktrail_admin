export type UserRole = "admin" | "reader";

export type UserStatusFilter = "all" | "active" | "locked";

export type AdminUserItem = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  isLocked: boolean;
  lockedAt: string | null;
  lockedUntil: string | null;
  lockedReason: string | null;
  lockedBy: { id: string; displayName: string } | null;
};

export type UserLockAction = "lock" | "unlock";

export type AdminUserLockLog = {
  id: string;
  userId: string;
  actorId: string;
  actor: { id: string; displayName: string } | null;
  action: UserLockAction;
  reason: string | null;
  lockedUntil: string | null;
  createdAt: string;
};
