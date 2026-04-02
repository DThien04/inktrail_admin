import { PageSectionHeader } from "@/components/layout/page-section-header";
import { StoriesTable } from "@/features/stories/components/stories-table";

export default function StoriesPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Quản lý truyện"
        description="Danh sách truyện để chỉnh sửa metadata, theo dõi trạng thái xuất bản và lượt đọc."
        actionLabel="Thêm truyện"
      />

      <StoriesTable />
    </div>
  );
}
