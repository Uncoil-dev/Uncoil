import { redirect } from "next/navigation";
import { TracingExplorer } from "@/components/dashboard/tracing/tracing-explorer";

export default async function TracingPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const raw = await searchParams;
  const initialQuery = Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) => (typeof value === "string" && value ? [[key, value.slice(0, key === "q" || key === "sort" ? 200 : 4096)]] : [])),
  );
  // Old shared-tab links (?view=actions) now live on the separate Steps page.
  if (raw.view === "actions") {
    const rest = new URLSearchParams(initialQuery);
    rest.delete("view");
    const qs = rest.toString();
    redirect(`/dashboard/${encodeURIComponent(projectId)}/steps${qs ? `?${qs}` : ""}`);
  }
  return <TracingExplorer projectId={projectId} initialQuery={initialQuery} />;
}
