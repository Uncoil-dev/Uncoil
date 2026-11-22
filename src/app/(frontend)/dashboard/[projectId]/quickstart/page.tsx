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
      <DashboardTopbar
        title="Quickstart"
        description="Connect your agent to Uncoil in less than 5 minutes."
      />

      <div className="px-6 pb-20">
        <QuickstartGuide projectId={projectId} />
      </div>
    </div>
  );
}
