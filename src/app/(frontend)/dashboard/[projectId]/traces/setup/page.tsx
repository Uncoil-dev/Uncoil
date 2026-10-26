import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ConfigureTracing } from "@/components/dashboard/configure-tracing";

export default async function TracingSetupPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <div><DashboardTopbar title="Configure tracing" description="Connect your SDK and send your first Tracify trace." /><div className="p-6"><ConfigureTracing projectId={projectId} /></div></div>;
}
