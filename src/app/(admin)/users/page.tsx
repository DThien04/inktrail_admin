import { PageSectionHeader } from "@/components/layout/page-section-header";

const users = [
  { id: "u1", name: "Dương Thiên", role: "admin", status: "Hoạt động" },
  { id: "u2", name: "Nguyễn Minh", role: "author", status: "Chờ xác minh" },
  { id: "u3", name: "Lan Chi", role: "reader", status: "Hoạt động" },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Người dùng"
        description="Quản lý tài khoản, phân quyền và trạng thái xác minh."
        actionLabel="Tạo tài khoản"
      />

      <section className="data-card overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.9fr_1fr] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-sm font-medium text-muted-foreground">
          <span>Tên</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
        </div>
        {users.map((user) => (
          <div
            key={user.id}
            className="grid grid-cols-[1.4fr_0.9fr_1fr] gap-4 border-t border-border px-5 py-4 text-sm"
          >
            <span className="font-medium text-foreground">{user.name}</span>
            <span className="uppercase tracking-[0.16em] text-muted-foreground">
              {user.role}
            </span>
            <span className="text-foreground">{user.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
