import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { AutomationsWorkspace } from "@/components/dashboard/automations-workspace";
export default async function AutomationsPage({ params }: { params: Promise<{ projectId: string }> }) { const { projectId } = await params; return <div><DashboardTopbar title="Automations" description="Route Uncoil signals to the tools and teams that need them." /><div className="p-6"><AutomationsWorkspace projectId={projectId} /></div></div>; }
