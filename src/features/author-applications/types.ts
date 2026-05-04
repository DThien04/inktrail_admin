export type AuthorApplicationStatus = "pending" | "approved" | "rejected" | "cancelled";

export type AuthorApplicationItem = {
  id: string;
  userId: string;
  penName: string;
  bio: string | null;
  reason: string | null;
  sampleLinks: string[];
  status: AuthorApplicationStatus;
  trustScoreSnapshot: number;
  eligibilitySnapshot: Record<string, unknown> | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectCooldownUntil: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: "reader" | "author" | "admin";
    createdAt: string;
  } | null;
  reviewedBy: {
    id: string;
    displayName: string;
    email: string;
  } | null;
};

