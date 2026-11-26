import { NextRequest, NextResponse } from "next/server";
import { denyProjectAccess } from "@/lib/project-route-access";
import { COMPARISON_DIMENSIONS, resolveTraceFlowFilters, traceGroupComparison, type ComparisonDimension } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";

/** Runs grouped by model or release (`by=model|release`) for the Compare page. Trace filters and the time range apply. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  const search = request.nextUrl.searchParams;
  const by = (search.get("by") ?? "model") as ComparisonDimension;
  if (!Object.hasOwn(COMPARISON_DIMENSIONS, by)) return NextResponse.json({ error: "by must be model or release" }, { status: 400 });
  try {
    const filters = await resolveTraceFlowFilters(projectId, parseTraceFilters(search));
    const groups = await traceGroupComparison(projectId, filters, by);
    return NextResponse.json({ by, groups, range: { from: filters.fromMs, to: filters.toMs } });
  } catch (error) {
    console.error("Trace comparison failed:", error);
    return NextResponse.json({ error: "Comparison data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
