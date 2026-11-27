import { AdminShell } from "@/components/dashboard/project-admin-shell";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { BillingPlan } from "@/components/dashboard/billing-plan";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { FoundingCard } from "@/components/dashboard/founding-card";
import { PaymentReceived } from "@/components/dashboard/payment-received";
import { IngestQuotaCard } from "@/components/dashboard/ingest-quota-card";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { projectId } = await params;
  const { checkout } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar
        title="Billing & Plan"
        description="Your usage this month and your plan."
      />

      <AdminShell projectId={projectId} active="billing">
        {checkout === "success" && <PaymentReceived projectId={projectId} />}
        {process.env.STRIPE_FOUNDING_COUPON_ID && <FoundingCard />}
        <UsageMeter projectId={projectId} />
        <IngestQuotaCard projectId={projectId} />
        <BillingPlan projectId={projectId} />
      </AdminShell>
    </div>
  );
}
