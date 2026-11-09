import { UncoilEmptyOverview } from "@/components/dashboard/uncoil-empty-overview";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { notFound } from "next/navigation";

export default async function UncoilPreviewPage({ searchParams }: { searchParams: Promise<{ edit?: string; ui?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const dashboardTheme = params.ui === "legacy" || params.ui === "uncoil-v2" ? params.ui : undefined;
  return <DashboardShell canAccessContent={false} preview previewProjectId="local-preview" previewProjectName="local-pr" dashboardTheme={dashboardTheme}><UncoilEmptyOverview projectId="local-preview" dashboardMode={params.edit === "1"} /></DashboardShell>;
}
