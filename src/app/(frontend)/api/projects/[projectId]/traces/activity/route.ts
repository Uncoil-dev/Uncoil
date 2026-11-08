import { NextRequest, NextResponse } from "next/server";
import { reportHandledError } from "@/lib/crash-report";
import { denyProjectAccess } from "@/lib/project-route-access";
import { resolveTraceFlowFilters, traceActivity } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";

/** Daily trace counts for the last 53 weeks, for the Chart view's activity grid. Filters apply; the time range does not. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  const search = request.nextUrl.searchParams;
  try {
    const filters = await resolveTraceFlowFilters(projectId, parseTraceFilters(search));
    const days = await traceActivity(projectId, filters, search.get("tz") ?? "UTC");
    return NextResponse.json({ days });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/traces/activity", error);
    return NextResponse.json({ error: "Activity data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
