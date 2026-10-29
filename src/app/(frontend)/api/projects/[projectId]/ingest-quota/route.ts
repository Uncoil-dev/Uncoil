import { isAuthenticated } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { peekRateLimit } from "@/lib/redis-cache";

const INGEST_LIMIT_PER_MINUTE = Number((process.env.UNCOIL_INGEST_LIMIT_PER_MINUTE ?? process.env.TRACIFY_INGEST_LIMIT_PER_MINUTE) ?? 6_000);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const convex = await getAuthedConvexClient();

  try {
    const project = await convex.query(api.projects.getProjectById, {
      projectId: projectId as Id<"projects">,
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const quota = await peekRateLimit(`ingest:${projectId}`, INGEST_LIMIT_PER_MINUTE);
    return NextResponse.json({ ...quota, windowSeconds: 60, available: true });
  } catch (error) {
    console.error("Failed to read ingest quota:", error);
    return NextResponse.json({
      used: 0,
      limit: INGEST_LIMIT_PER_MINUTE,
      remaining: INGEST_LIMIT_PER_MINUTE,
      resetSeconds: 0,
      windowSeconds: 60,
      available: false,
    });
  }
}
