import { PageSectionHeader } from "@/components/layout/page-section-header";
import { BannersManager } from "@/features/banners/components/banners-manager";

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Quản lý banner"
        description="Sắp xếp banner trang chủ, bật tắt hiển thị và tải ảnh ngang riêng cho từng banner."
      />

      <BannersManager />
    </div>
  );
}
