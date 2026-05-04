import { PageSectionHeader } from "@/components/layout/page-section-header";
import { UsersTable } from "@/features/users/components/users-table";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Người dùng"
        description="Quản lý tài khoản và vai trò trong hệ thống."
      />
      <UsersTable />
    </div>
  );
}
