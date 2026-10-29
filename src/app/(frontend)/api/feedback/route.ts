import { NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { getConvexClient } from "@/lib/convex";
import { getWrongRegionApiKeyResponse, hashApiKey, isUncoilApiKey } from "@/lib/api-keys";

type Body = {
  projectId: string;
  traceId: string;
  value: number | boolean | string;
  dataType?: "numeric" | "boolean" | "categorical" | "text";
  name?: string;
  comment?: string;
  kind?: "thumb" | "star" | "text";
  reason?: string;
  spanId?: string;
  endUserId?: string;
  dedupeKey?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try { body = await request.json() as Body; } catch { return Response.json({ error: "Invalid JSON body" }, { status: 422 }); }
  if (!body.projectId || !body.traceId || body.value === undefined) return Response.json({ error: "projectId, traceId, and value are required" }, { status: 422 });
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ") && isUncoilApiKey(bearer.slice(7).trim())) {
    const apiKey = bearer.slice(7).trim();
    const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
    if (wrongRegion) return wrongRegion;
    try {
      const convex = getConvexClient();
      const project = await convex.query(api.projects.getProjectByApiKey, { apiKeyHash: hashApiKey(apiKey) });
      if (!project || project._id !== body.projectId) return Response.json({ error: "Invalid API key" }, { status: 401 });
      const id = await convex.mutation(api.evaluationEngine.recordApiFeedback, {
        projectId: project._id,
        internalSecret: process.env.EVALUATION_INTERNAL_SECRET || "",
        traceId: body.traceId,
        spanId: body.spanId,
        kind: body.kind || (typeof body.value === "number" ? "star" : typeof body.value === "boolean" ? "thumb" : "text"),
        value: body.value,
        dataType: body.dataType,
        scoreName: body.name?.trim(),
        reason: body.reason,
        comment: body.comment?.trim(),
        endUserId: body.endUserId,
        dedupeKey: body.dedupeKey,
      });
      return Response.json({ ok: true, feedbackId: id }, { status: 201 });
    } catch (error) {
      console.error("API-key feedback submission failed:", error);
      return Response.json({ error: "Feedback could not be recorded" }, { status: 403 });
    }
  }

  let convex;
  try { convex = await getAuthedConvexClient(); } catch (error) { console.error("Feedback auth/configuration failed:", error); return Response.json({ error: "Authentication or Convex configuration is unavailable" }, { status: 503 }); }
  try {
    const id = await convex.mutation(api.evaluationEngine.recordFeedback, {
      projectId: body.projectId as never,
      traceId: body.traceId,
      spanId: body.spanId,
      kind: body.kind || (typeof body.value === "number" ? "star" : typeof body.value === "boolean" ? "thumb" : "text"),
      value: body.value,
      reason: body.reason,
      comment: body.comment?.trim(),
      endUserId: body.endUserId,
      dedupeKey: body.dedupeKey,
    });
    return Response.json({ ok: true, scoreId: id }, { status: 201 });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return Response.json({ error: "Feedback could not be recorded" }, { status: 403 });
  }
}
