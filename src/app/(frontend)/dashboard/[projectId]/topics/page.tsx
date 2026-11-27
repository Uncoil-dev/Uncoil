import { TopicsExplorer } from "@/components/dashboard/topics/topics-explorer";

export default async function TopicsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <TopicsExplorer projectId={projectId} />;
}
