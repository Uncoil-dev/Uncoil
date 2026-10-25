import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { BillingPlan } from "@/components/dashboard/billing-plan";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { IngestQuotaCard } from "@/components/dashboard/ingest-quota-card";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar
        title="Billing & Plan"
        description="Real usage, current plan, and beta plan access."
      />

      <div className="px-6 pb-20 space-y-6 max-w-3xl">
        <UsageMeter projectId={projectId} />
        <IngestQuotaCard projectId={projectId} />
        <BillingPlan projectId={projectId} />
      </div>
    </div>
  );
}
