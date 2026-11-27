import { NextResponse, type NextRequest } from "next/server";
import { reportHandledError } from "@/lib/crash-report";
import { denyProjectAccess } from "@/lib/project-route-access";
import { resolveTraceFlowFilters, traceTopicInputs } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";
import { groupTraceTopics } from "@/lib/trace-topics";

/** Topics of the traces matching the same filters as the traces list. A topic filter is ignored here so every topic stays listed. Only the newest traces are read; `sampled` says when older matches were left out. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  try {
    const filters = await resolveTraceFlowFilters(projectId, { ...parseTraceFilters(request.nextUrl.searchParams), topic: undefined });
    const { total: matched, traces } = await traceTopicInputs(projectId, filters);
    const { total, topics } = groupTraceTopics(traces);
    return NextResponse.json({ total, sampled: matched > traces.length, topics });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/topics", error);
    return NextResponse.json({ error: "Topic data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
