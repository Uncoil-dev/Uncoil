import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { NextResponse, type NextRequest } from "next/server";
import { reportHandledError } from "@/lib/crash-report";
import { TOPIC_BUILD_EVENT } from "@/inngest/topics";
import { estimateBuildCost, MAX_TRACES } from "@/inngest/topic-build";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { inngest } from "@/lib/inngest";
import { getProjectLlm } from "@/lib/project-llm";
import { denyProjectAccess } from "@/lib/project-route-access";
import { finishedTraceRunIds, resolveTraceFlowFilters, traceTopicInputs } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";
import { groupTraceTopics } from "@/lib/trace-topics";

/** Topics of the traces matching the same filters as the traces list. Only the newest traces are read; `sampled` says when older matches were left out. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  try {
    const filters = await resolveTraceFlowFilters(projectId, parseTraceFilters(request.nextUrl.searchParams));
    const { total: matched, traces } = await traceTopicInputs(projectId, filters);
    const { total, topics } = groupTraceTopics(traces);
    return NextResponse.json({ total, sampled: matched > traces.length, topics });
  } catch (error) {
    await reportHandledError("GET /api/projects/[projectId]/topics", error);
    return NextResponse.json({ error: "Topic data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}

const FILTER_PARAMS_TO_SKIP = new Set(["from", "to", "page", "pageSize", "sort", "dir"]);

/**
 * Starts a build of the project's topic map in the background. `{ "action": "estimate" }` only returns the expected
 * cost. `{ "action": "refresh" }` queues the build; the first build of a map also needs `"confirmed": true`, so the
 * cost estimate is always seen first. The build runs on the project's own model connection, or on built-in rules.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  let body: { action?: string; confirmed?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // An empty body means a plain refresh.
  }
  const action = body.action ?? "refresh";
  if (action !== "estimate" && action !== "refresh") return NextResponse.json({ error: "Unknown action." }, { status: 422 });

  try {
    const convex = await getAuthedConvexClient();
    const id = projectId as Id<"projects">;
    const [map, project, connection] = await Promise.all([
      convex.query(api.topics.getMap, { projectId: id }),
      convex.query(api.modelDefinitions.get, { projectId: id }),
      getProjectLlm(convex, projectId),
    ]);
    const filters = Object.fromEntries([...request.nextUrl.searchParams].filter(([key, value]) => !FILTER_PARAMS_TO_SKIP.has(key) && key.length <= 60 && value.length <= 500).slice(0, 40));
    const now = Date.now();
    const traceFilters = parseTraceFilters(new URLSearchParams({ ...filters, from: String(now - 7 * 24 * 60 * 60 * 1000), to: String(now) }), now);
    const needsEstimate = action === "estimate" || !map;
    const estimate = needsEstimate
      ? {
          ...estimateBuildCost({ traces: (await finishedTraceRunIds(projectId, traceFilters, MAX_TRACES)).length, model: connection?.model, prices: project?.prices }),
          model: connection?.model ?? null,
          usesModelConnection: Boolean(connection),
        }
      : undefined;
    if (action === "estimate") return NextResponse.json({ estimate });
    if (!map && !body.confirmed) return NextResponse.json({ error: "Confirm the estimated cost to build the first map.", estimate }, { status: 409 });

    await inngest.send({ name: TOPIC_BUILD_EVENT, data: { projectId, filters: map ? undefined : filters } });
    return NextResponse.json({ queued: true, estimate }, { status: 202 });
  } catch (error) {
    await reportHandledError("POST /api/projects/[projectId]/topics", error);
    return NextResponse.json({ error: "The map could not be refreshed right now. Try again in a moment." }, { status: 503 });
  }
}
