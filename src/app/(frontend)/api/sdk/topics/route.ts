import { type NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";

import { getWrongRegionApiKeyResponse, hashApiKey, isUncoilApiKey } from "@/lib/api-keys";
import { overLimit, requestIp } from "@/lib/cli-login";
import { getConvexClient } from "@/lib/convex";
import { reportHandledError } from "@/lib/crash-report";
import { resolveTraceFlowFilters, traceTopicInputs } from "@/lib/tinybird";
import { parseTraceFilters } from "@/lib/trace-filters";
import { groupTraceTopics } from "@/lib/trace-topics";

export const dynamic = "force-dynamic";

/** Read-only topics for the project a Bearer API key belongs to, with the same filters and shape as the dashboard topics call. */
export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization");
  const apiKey = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!isUncoilApiKey(apiKey)) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
  if (wrongRegion) return wrongRegion;
  const keyHash = hashApiKey(apiKey);
  const tooMany = () => NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  // Limit by caller before the key lookup (so key guessing is throttled), then by project (so one key can't
  // dodge the cap by changing its forwarded IP).
  if (await overLimit(`sdk-topics-ip:${requestIp(request)}`, 30, 60)) return tooMany();

  try {
    const project = await getConvexClient().query(api.projects.getProjectByApiKey, { apiKeyHash: keyHash });
    if (!project) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    const projectId = String(project._id);
    if (await overLimit(`sdk-topics-project:${projectId}`, 10, 60)) return tooMany();
    const filters = await resolveTraceFlowFilters(projectId, parseTraceFilters(request.nextUrl.searchParams));
    const { total: matched, traces } = await traceTopicInputs(projectId, filters);
    const { total, topics } = groupTraceTopics(traces);
    return NextResponse.json({ total, sampled: matched > traces.length, topics }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await reportHandledError("GET /api/sdk/topics", error);
    return NextResponse.json({ error: "Topic data is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
}
