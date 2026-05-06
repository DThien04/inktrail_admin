export type UserRole = "admin" | "reader";

export type AdminUserItem = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};
