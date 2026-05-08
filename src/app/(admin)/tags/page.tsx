import { PageSectionHeader } from "@/components/layout/page-section-header";
import { TagsTable } from "@/features/tags/components/tags-table";

export default function TagsPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Tags"
        description="Quản lý tag: tìm kiếm, đổi tên, gộp tag và xóa tag không còn sử dụng."
      />
      <TagsTable />
    </div>
  );
}

