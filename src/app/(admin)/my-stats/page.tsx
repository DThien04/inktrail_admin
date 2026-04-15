import { PageSectionHeader } from "@/components/layout/page-section-header";
import { MyStoryStatsPanel } from "@/features/stories/components/my-story-stats-panel";

export default function MyStatsPage() {
  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Thống kê truyện"
        description="Tổng hợp nhanh hiệu suất các truyện của bạn: lượt đọc, lượt thích, bình luận và đánh giá."
      />
      <MyStoryStatsPanel />
    </div>
  );
}
