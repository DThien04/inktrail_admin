import { PageSectionHeader } from "@/components/layout/page-section-header";
import { ReportsPanel } from "@/features/reports/components/reports-panel";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Báo cáo"
        description="Tổng hợp phản ánh từ người dùng cho truyện, chương và bình luận để quản trị viên theo dõi và xử lý."
      />

      <ReportsPanel />
    </div>
  );
}
