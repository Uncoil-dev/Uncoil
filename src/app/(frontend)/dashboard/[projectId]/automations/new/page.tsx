import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { NewAutomationForm } from "@/components/dashboard/automations-workspace";

export default async function NewAutomationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <div><DashboardTopbar title="New automation" description="Pick what happens, say where it should go, and turn it on." /><div className="p-6"><NewAutomationForm projectId={projectId} /></div></div>;
}
