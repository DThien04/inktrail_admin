import { PageSectionHeader } from "@/components/layout/page-section-header";
import { AuthorApplicationsTable } from "@/features/author-applications/components/author-applications-table";

export default function AuthorApplicationsPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Duyệt tác giả"
        description="Duyệt đơn Reader -> Author dựa trên trust score và dữ liệu hoạt động."
      />
      <AuthorApplicationsTable />
    </div>
  );
}

