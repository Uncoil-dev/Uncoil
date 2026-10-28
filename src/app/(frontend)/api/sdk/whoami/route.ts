import { type NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";

import { getWrongRegionApiKeyResponse, hashApiKey, isUncoilApiKey } from "@/lib/api-keys";
import { getConvexClient } from "@/lib/convex";
import { overLimit, requestIp } from "@/lib/cli-login";

export const dynamic = "force-dynamic";

/** Tells the SDK which project a key belongs to, so `doctor` can say where traces will land. */
export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization");
  const apiKey = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!isUncoilApiKey(apiKey)) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
  if (wrongRegion) return wrongRegion;
  if (await overLimit(`sdk-whoami:${requestIp(request)}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const project = await getConvexClient().query(api.projects.getProjectByApiKey, { apiKeyHash: hashApiKey(apiKey) });
  if (!project) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  return NextResponse.json({ projectId: String(project._id), projectName: project.name, planTier: project.planTier }, { headers: { "Cache-Control": "no-store" } });
}
