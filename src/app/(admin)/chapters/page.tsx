import { PageSectionHeader } from "@/components/layout/page-section-header";
import { ChaptersManager } from "@/features/chapters/components/chapters-manager";

export default function ChaptersPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Quản lý chương"
        description="Xem danh sách chương theo từng truyện và theo dõi trạng thái nội dung."
      />

      <ChaptersManager />
    </div>
  );
}
