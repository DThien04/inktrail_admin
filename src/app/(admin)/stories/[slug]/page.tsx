import { redirect } from "next/navigation";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  void (await params);
  redirect("/stories");
}
