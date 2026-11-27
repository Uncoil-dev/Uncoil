import { NextRequest, NextResponse } from "next/server";
import { api } from "convex/_generated/api";
import { hashApiKey } from "@/lib/api-keys";
import { getConvexClient } from "@/lib/convex";
import { denyFailOpenAccess } from "@/lib/fail-open-access";
import { denyProjectAccess } from "@/lib/project-route-access";
import { getFailOpenRate } from "@/lib/tinybird";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const days = Number(req.nextUrl.searchParams.get("days")) || 7;

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const denied = await denyFailOpenAccess(req.headers.get("authorization"), projectId, {
    projectIdForKey: async (apiKey) => {
      const project = await getConvexClient().query(api.projects.getProjectByApiKey, {
        apiKeyHash: hashApiKey(apiKey),
      });
      return project ? String(project._id) : null;
    },
    denySession: () => denyProjectAccess(req, projectId),
  });
  if (denied) return denied;

  try {
    const result = await getFailOpenRate(projectId, days);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Fail-open rate query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
