import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { NextResponse, type NextRequest } from "next/server";
import { reportHandledError } from "@/lib/crash-report";
import { TOPIC_BUILD_EVENT } from "@/inngest/topics";
import { DEFAULT_MODEL, estimateBuildCost, MAX_TRACES } from "@/inngest/topic-build";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { inngest } from "@/lib/inngest";
import { getProjectLlm } from "@/lib/project-llm";
import { denyProjectAccess } from "@/lib/project-route-access";
import { finishedTraceRunIds, resolveTraceFlowFilters, traceTopicInputs } from "@/lib/tinybird";
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

const WINDOW_DAYS = 7;
const BUILD_STALE_MS = 15 * 60 * 1000;
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
    const now = Date.now();
    const convex = await getAuthedConvexClient();
    const id = projectId as Id<"projects">;
    const [map, project, connection, mayRefresh] = await Promise.all([
      convex.query(api.topics.getMap, { projectId: id }),
      convex.query(api.modelDefinitions.get, { projectId: id }),
      getProjectLlm(convex, projectId),
      convex.query(api.topics.canRefresh, { projectId: id }),
    ]);
    if (action === "refresh" && !mayRefresh) return NextResponse.json({ error: "Only project administrators can refresh the map." }, { status: 403 });
    // A build that has not reported back in 15 minutes is treated as stuck, so a crashed build cannot block refreshes.
    if (action === "refresh" && map?.status === "building" && now - map.builtAt < BUILD_STALE_MS) {
      return NextResponse.json({ error: "The map is already being built." }, { status: 409 });
    }
    const filters = Object.fromEntries([...request.nextUrl.searchParams].filter(([key, value]) => !FILTER_PARAMS_TO_SKIP.has(key) && key.length <= 60 && value.length <= 500).slice(0, 40));
    const traceFilters = parseTraceFilters(new URLSearchParams({ ...filters, from: String(now - WINDOW_DAYS * 24 * 60 * 60 * 1000), to: String(now) }), now);
    const needsEstimate = action === "estimate" || !map;
    let estimate;
    if (needsEstimate) {
      const model = connection ? (connection.model ?? DEFAULT_MODEL) : null;
      const cost = estimateBuildCost({ traces: (await finishedTraceRunIds(projectId, traceFilters, MAX_TRACES)).length, model, prices: project?.prices });
      // Later daily rebuilds only summarize traces that are new, so one day costs about a seventh of the first week.
      estimate = { ...cost, model, usesModelConnection: Boolean(connection), dailyRebuilds: true, dailyRebuildCostUsd: cost.costUsd === null ? null : cost.costUsd / WINDOW_DAYS };
    }
    if (action === "estimate") return NextResponse.json({ estimate });
    if (!map && !body.confirmed) return NextResponse.json({ error: "Confirm the estimated cost to build the first map.", estimate }, { status: 409 });

    await inngest.send({ name: TOPIC_BUILD_EVENT, data: { projectId, filters: map ? undefined : filters } });
    return NextResponse.json({ queued: true, estimate }, { status: 202 });
  } catch (error) {
    await reportHandledError("POST /api/projects/[projectId]/topics", error);
    return NextResponse.json({ error: "The map could not be refreshed right now. Try again in a moment." }, { status: 503 });
  }
}
