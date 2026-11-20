import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { noIndex } from "@/lib/seo";
import { ReportView } from "@/components/health-report/report-view";
import type { HealthReport } from "@/lib/health-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { ...noIndex, title: "Agent health report" };

export default async function PaidReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const row = await getConvexClient().query(api.healthReports.getByToken, { token });
  if (!row) notFound();
  return <ReportView report={JSON.parse(row.reportJson) as HealthReport} />;
}
