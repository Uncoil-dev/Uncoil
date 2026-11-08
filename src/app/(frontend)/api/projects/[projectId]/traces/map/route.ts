import { NextRequest, NextResponse } from "next/server";
import { reportHandledError } from "@/lib/crash-report";
import { denyProjectAccess } from "@/lib/project-route-access";
import { MAP_EDGE_LIMIT, MAP_NODE_LIMIT, traceAgentMap } from "@/lib/tinybird";
import { resolveTraceFlowFilters } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";

/** Aggregate agent map (tools and models, and which ran after which) for the Tracing page's current filters. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  const parsed = parseTraceFilters(request.nextUrl.searchParams);
  if (parsed.facets?.traceName?.length !== 1) return NextResponse.json({ error: "Pick one trace name to see its map" }, { status: 400 });
  try {
    const filters = await resolveTraceFlowFilters(projectId, parsed);
    const map = await traceAgentMap(projectId, filters);
    return NextResponse.json({ ...map, limits: { nodes: MAP_NODE_LIMIT, edges: MAP_EDGE_LIMIT }, range: { from: filters.fromMs, to: filters.toMs } });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/traces/map", error);
    return NextResponse.json({ error: "Map data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
