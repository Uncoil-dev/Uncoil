import { NextRequest, NextResponse } from "next/server";
import { denyProjectAccess } from "@/lib/project-route-access";
import { isGroupKind, parseGroupFilters } from "@/lib/group-filters";
import { groupDetail, listGroups } from "@/lib/tinybird-groups";

/** Sessions (`kind=session`) or end users (`kind=user`) of a project; `?id=` returns one of them instead of the list. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string; kind: string }> }) {
  const { projectId, kind } = await params;
  if (!isGroupKind(kind)) return NextResponse.json({ error: "Unknown group kind. Use session or user." }, { status: 404 });
  // The list polls every few seconds, so access is checked once and remembered.
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) return NextResponse.json(await groupDetail(projectId, kind, id.slice(0, 200)));
    return NextResponse.json(await listGroups(projectId, kind, parseGroupFilters(request.nextUrl.searchParams)));
  } catch (error) {
    console.error("Group list failed:", error);
    return NextResponse.json({ error: `${kind === "session" ? "Session" : "User"} data is temporarily unavailable. Try again in a moment.` }, { status: 503 });
  }
}
