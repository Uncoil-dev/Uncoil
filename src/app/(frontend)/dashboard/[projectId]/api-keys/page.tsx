import { ApiKeysManager } from "@/components/dashboard/api-keys-manager";
import { AdminShell } from "@/components/dashboard/project-admin-shell";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar
        title="API Keys"
        description="Manage security tokens for authenticating your agent runs."
      />

      <AdminShell projectId={projectId} active="api-keys">
        <ApiKeysManager projectId={projectId} />
      </AdminShell>
    </div>
  );
}
