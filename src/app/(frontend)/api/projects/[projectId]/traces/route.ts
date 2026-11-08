import { NextRequest, NextResponse } from "next/server";
import { reportHandledError } from "@/lib/crash-report";
import { denyProjectAccess } from "@/lib/project-route-access";
import { listTraces, traceErrorGroups, traceFacets, traceHistogram, traceStats } from "@/lib/tinybird";
import { resolveTraceFlowFilters } from "@/lib/tinybird";
import { facetValues, parseTraceFilters } from "@/lib/trace-filters";


export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  // The list polls every few seconds; skip the Convex token and access round trips after a recent success.
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  const parsed = parseTraceFilters(request.nextUrl.searchParams);
  const search = request.nextUrl.searchParams;
  const startedAt = Date.now();
  try {
    const filters = await resolveTraceFlowFilters(projectId, parsed);
    const [list, histogram, stats, facets, errorGroups] = await Promise.all([
      listTraces(projectId, filters, { extras: facetValues(search.get("extras")), meta: facetValues(search.get("meta")) }),
      traceHistogram(projectId, filters),
      traceStats(projectId, filters),
      search.get("facets") === "1" ? traceFacets(projectId, filters) : null,
      search.get("errors") === "1" ? traceErrorGroups(projectId, filters) : null,
    ]);
    const tookMs = Date.now() - startedAt;
    if (tookMs > 3_000) console.warn(`[slow] trace list took ${tookMs} ms (${list.total} traces)`);
    return NextResponse.json({ ...list, histogram, stats, facets, errorGroups, range: { from: filters.fromMs, to: filters.toMs } }, { headers: { "Server-Timing": `traces;dur=${tookMs}` } });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/traces", error);
    return NextResponse.json({ error: "Trace data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
