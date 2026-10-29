import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";
import { checkRedisHealth } from "@/lib/redis-cache";
import { checkTinybirdHealth } from "@/lib/tinybird";

export const dynamic = "force-dynamic";

type DependencyState = { ok: boolean; latencyMs: number };

async function check(name: "convex" | "tinybird" | "redis", task: () => Promise<void>): Promise<[string, DependencyState]> {
  const startedAt = Date.now();
  try {
    await task();
    return [name, { ok: true, latencyMs: Date.now() - startedAt }];
  } catch {
    return [name, { ok: false, latencyMs: Date.now() - startedAt }];
  }
}

export async function GET() {
  const region = getUncoilRegion(getDeploymentRegion());
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const dependencyEntries = await Promise.all([
    check("convex", async () => {
      if (!convexSiteUrl) throw new Error("NEXT_PUBLIC_CONVEX_SITE_URL is not set");
      const response = await fetch(`${convexSiteUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
      const body = await response.json() as { ok?: boolean; region?: string };
      if (!response.ok || body.ok !== true || body.region !== region.id) throw new Error("Convex health mismatch");
    }),
    check("tinybird", checkTinybirdHealth),
    check("redis", checkRedisHealth),
  ]);
  const dependencies = Object.fromEntries(dependencyEntries) as Record<"convex" | "tinybird" | "redis", DependencyState>;
  const eventPipelineConfigured = Boolean(process.env.INNGEST_EVENT_KEY?.trim());
  const ok = Object.values(dependencies).every((dependency) => dependency.ok) && eventPipelineConfigured;
  return Response.json(
    {
      ok,
      service: "uncoil-cloud",
      region: region.id,
      hostname: region.hostname,
      dependencies: {
        ...dependencies,
        inngest: { ok: eventPipelineConfigured, mode: "configuration" },
      },
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "https://www.uncoil.dev" } },
  );
}
