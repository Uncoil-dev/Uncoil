import { NextRequest, NextResponse } from "next/server";
import { denyProjectAccess } from "@/lib/project-route-access";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { api } from "convex/_generated/api";
import type { FunctionArgs } from "convex/server";
import type { Id } from "convex/_generated/dataModel";
import { readSavedViewRequest } from "@/lib/saved-view-state";
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;
  try {
    const client = await getAuthedConvexClient();
    const list = await client.query(api.savedViews.list, {
      projectId: projectId as Id<"projects">,
    });
    const id = request.nextUrl.searchParams.get("id");
    if (id && !list.some((v) => v._id === id)) {
      const view = await client.query(api.savedViews.get, {
        projectId: projectId as Id<"projects">,
        id: id as Id<"savedViews">,
      });
      if (view) list.unshift(view);
    }
    return NextResponse.json(list);
  } catch (error) {
    // Convex is deployed by hand, so a new site can run before its backend.
    const notDeployed = /Could not find public function/i.test(String(error));
    return NextResponse.json(
      {
        error: notDeployed
          ? "Saved views are not set up on the server yet. The backend needs a one-time update."
          : "Saved views are unavailable. Try again shortly.",
      },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  const { projectId } = await params;
  const denied = await denyProjectAccess(request, projectId);
  if (denied) return denied;
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const read = await readSavedViewRequest(request);
  if ("error" in read)
    return NextResponse.json({ error: read.error }, { status: 400 });
  // Convex validates the fields; the cast only names them for the call below.
  const body = read.body as FunctionArgs<typeof api.savedViews.save> & {
    action?: unknown;
  };
  try {
    const client = await getAuthedConvexClient();
    const id =
      body.action === "delete"
        ? await client.mutation(api.savedViews.remove, {
            projectId: projectId as Id<"projects">,
            id: body.id as Id<"savedViews">,
          })
        : await client.mutation(api.savedViews.save, {
            projectId: projectId as Id<"projects">,
            ...(body.id ? { id: body.id } : {}),
            name: body.name,
            target: body.target,
            shared: body.shared,
            query: body.query,
            columns: body.columns,
          });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save this view. Check its name and your access, then try again.",
      },
      { status: 400 },
    );
  }
}
