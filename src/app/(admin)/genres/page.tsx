import { PageSectionHeader } from "@/components/layout/page-section-header";
import { GenresTable } from "@/features/genres/components/genres-table";

export default function GenresPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Quản lý thể loại"
        description="Xem danh sách thể loại hiện có, trạng thái hoạt động và thông tin slug trước khi nối tiếp phần tạo, sửa, bật tắt."
      />

      <GenresTable />
    </div>
  );
}
