import { AdminShell } from "@/components/dashboard/project-admin-shell";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { ProjectManagement } from "@/components/dashboard/project-management";

export default async function ProjectManagePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar title="Project Management" />
      <AdminShell projectId={projectId} active="manage">
        <ProjectManagement projectId={projectId} />
      </AdminShell>
    </div>
  );
}
