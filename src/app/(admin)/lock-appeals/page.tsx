import { PageSectionHeader } from "@/components/layout/page-section-header";
import { LockAppealsTable } from "@/features/users/components/lock-appeals-table";

export default function LockAppealsPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Khiếu nại khóa tài khoản"
        description="Người dùng đang bị khóa có thể gửi khiếu nại. Xét duyệt sẽ tự động mở khóa nếu chấp nhận."
      />
      <LockAppealsTable />
    </div>
  );
}
