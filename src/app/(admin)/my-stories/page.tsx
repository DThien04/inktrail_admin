import { PageSectionHeader } from "@/components/layout/page-section-header";
import { MyStoriesTable } from "@/features/stories/components/my-stories-table";

export default function MyStoriesPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Truyện của tôi"
        description="Dữ liệu thật từ hệ thống, chỉ hiển thị các truyện thuộc tài khoản tác giả đang đăng nhập."
      />

      <MyStoriesTable />
    </div>
  );
}
