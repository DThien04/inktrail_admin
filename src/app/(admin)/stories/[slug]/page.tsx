import { StoryDetailView } from "@/features/stories/components/story-detail-view";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <StoryDetailView slug={slug} />;
}
