import { StepsExplorer } from "@/components/dashboard/tracing/steps-explorer";

export default async function StepsPage({
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
  return <StepsExplorer projectId={projectId} initialQuery={initialQuery} />;
}
