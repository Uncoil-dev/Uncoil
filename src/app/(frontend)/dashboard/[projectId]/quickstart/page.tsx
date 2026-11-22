import { QuickstartGuide } from "@/components/dashboard/quickstart-guide";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export default async function QuickstartPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar />
      <QuickstartGuide projectId={projectId} />
    </div>
  );
}
