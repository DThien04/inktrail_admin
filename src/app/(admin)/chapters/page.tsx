import { PageSectionHeader } from "@/components/layout/page-section-header";

const chapterItems = [
  {
    id: "chapter-1",
    title: "Chương 27 - Buổi tối mưa lạnh",
    story: "Mùa Đông Có Cậu",
    status: "Chờ duyệt",
  },
  {
    id: "chapter-2",
    title: "Chương 11 - Đèn thành phố vừa lên",
    story: "Những Ngày Có Gió",
    status: "Đã xuất bản",
  },
];

export default function ChaptersPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Quản lý chương"
        description="Theo dõi chương mới, thứ tự chương, trạng thái duyệt và lỗi nội dung."
        actionLabel="Tạo chương"
      />

      <section className="grid gap-4">
        {chapterItems.map((chapter) => (
          <article key={chapter.id} className="data-card p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{chapter.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Truyện: {chapter.story}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong">
                  {chapter.status}
                </span>
                <button className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground">
                  Mở editor
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
