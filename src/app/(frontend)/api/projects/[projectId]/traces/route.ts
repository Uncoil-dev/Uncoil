import { NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { applyResolutions, type ResolvedAtBySignature } from "@/lib/error-group-resolution";
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
    const wantsErrors = search.get("errors") === "1";
    const showResolved = search.get("showResolved") === "1";
    // Resolve times load alongside the trace queries; a failure leaves the groups unfiltered.
    const resolvedPromise = wantsErrors ? loadResolutions(projectId) : null;
    const [list, histogram, stats, facets, errorGroups] = await Promise.all([
      listTraces(projectId, filters, { extras: facetValues(search.get("extras")), meta: facetValues(search.get("meta")) }),
      traceHistogram(projectId, filters),
      traceStats(projectId, filters),
      search.get("facets") === "1" ? traceFacets(projectId, filters) : null,
      resolvedPromise ? resolvedPromise.then((resolvedAt) => traceErrorGroups(projectId, filters, showResolved ? {} : resolvedAt)) : null,
    ]);
    const resolvedAt = resolvedPromise ? await resolvedPromise : {};
    const visibleGroups = errorGroups ? { ...errorGroups, groups: applyResolutions(errorGroups.groups, resolvedAt, true) } : null;
    const tookMs = Date.now() - startedAt;
    if (tookMs > 3_000) console.warn(`[slow] trace list took ${tookMs} ms (${list.total} traces)`);
    return NextResponse.json({ ...list, histogram, stats, facets, errorGroups: visibleGroups, range: { from: filters.fromMs, to: filters.toMs } }, { headers: { "Server-Timing": `traces;dur=${tookMs}` } });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/traces", error);
    return NextResponse.json({ error: "Trace data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}

/** Resolve times for the project; reports and returns none when the lookup fails so the trace list still loads. */
async function loadResolutions(projectId: string): Promise<ResolvedAtBySignature> {
  try {
    const convex = await getAuthedConvexClient();
    return await convex.query(api.errorGroups.listResolved, { projectId: projectId as Id<"projects"> });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/traces resolutions", error);
    return {};
  }
}
