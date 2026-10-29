import { type NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { getWrongRegionApiKeyResponse, hashApiKey, isUncoilApiKey } from "@/lib/api-keys";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7).trim();
  if (!isUncoilApiKey(apiKey)) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
  if (wrongRegion) return wrongRegion;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const { runId, incrementUsd } = body as { runId?: string; incrementUsd?: number };

  if (typeof runId !== "string" || !runId) {
    return Response.json({ error: "runId is required" }, { status: 422 });
  }
  if (typeof incrementUsd !== "number" || incrementUsd < 0) {
    return Response.json({ error: "incrementUsd must be a non-negative number" }, { status: 422 });
  }

  const convex = getConvexClient();
  const project = await convex.query(api.projects.getProjectByApiKey, {
    apiKeyHash: hashApiKey(apiKey),
  });

  if (!project) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const projectDocId = project._id as Id<"projects">;

  // Fetch the full project to get runtimePolicy
  const fullProject = await convex.query(api.projects.getProjectById, {
    projectId: projectDocId,
  });

  if (!fullProject?.runtimePolicy) {
    // No policy configured — allow everything
    return Response.json({ allowed: true, reason: "no_policy" });
  }

  const policy = fullProject.runtimePolicy;
  const today = new Date().toISOString().slice(0, 10);

  // Check per-run ceiling
  if (policy.maxCostPerRun !== undefined && policy.maxCostPerRun !== null) {
    const runPeriod = `run:${runId}`;
    const result = await convex.mutation(api.costCounters.checkAndIncrementCost, {
      projectId: projectDocId,
      period: runPeriod,
      incrementUsd,
      maxCost: policy.maxCostPerRun,
    });

    if (!result.allowed) {
      return Response.json({
        allowed: false,
        reason: "maxCostPerRun",
        currentCost: result.currentCost,
        ceiling: policy.maxCostPerRun,
      });
    }
  }

  // Check per-day ceiling
  if (policy.maxCostPerDay !== undefined && policy.maxCostPerDay !== null) {
    const dayPeriod = `day:${today}`;
    const result = await convex.mutation(api.costCounters.checkAndIncrementCost, {
      projectId: projectDocId,
      period: dayPeriod,
      incrementUsd,
      maxCost: policy.maxCostPerDay,
    });

    if (!result.allowed) {
      return Response.json({
        allowed: false,
        reason: "maxCostPerDay",
        currentCost: result.currentCost,
        ceiling: policy.maxCostPerDay,
      });
    }
  }

  return Response.json({ allowed: true });
}
