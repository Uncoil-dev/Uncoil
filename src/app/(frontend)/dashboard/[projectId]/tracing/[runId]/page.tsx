import { TracingExplorer } from "@/components/dashboard/tracing/tracing-explorer";

export default async function TracingDetailPage({ params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = await params;
  // A shared trace link opens the trace list with that trace's panel open, over the last 90 days, so an older trace still shows its row.
  return <TracingExplorer projectId={projectId} initialQuery={{ range: "90d", trace: decodeURIComponent(runId).slice(0, 200) }} />;
}
