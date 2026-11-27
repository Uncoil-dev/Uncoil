import { AlertsBoundary } from "@/components/dashboard/alerts/alerts-boundary";
import { AlertsSections } from "@/components/dashboard/alerts/alerts-sections";

export default async function AlertsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  // /alerts/new redirects here with view=create, which opens the new rule form.
  const { view } = await searchParams;
  return <AlertsBoundary><AlertsSections projectId={projectId} startCreating={view === "create"} /></AlertsBoundary>;
}
