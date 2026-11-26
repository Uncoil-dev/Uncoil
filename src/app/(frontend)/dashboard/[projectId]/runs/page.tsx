import { redirect } from "next/navigation";
import { legacyRunQuery } from "@/lib/legacy-run-query";

export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId } = await params;
  const query = legacyRunQuery(await searchParams);

  redirect(`/dashboard/${projectId}/tracing${query ? `?${query}` : ""}`);
}
