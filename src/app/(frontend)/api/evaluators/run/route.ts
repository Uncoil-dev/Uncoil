import { NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { runCodeRule } from "@/lib/evaluator-rules";
import { chatUrl, getProjectLlm } from "@/lib/project-llm";

type Body = { projectId: string; evaluatorId: string; traceId: string; output: string; expectedOutput?: string };

export async function POST(request: NextRequest) {
  let body: Body;
  try { body = await request.json() as Body; } catch { return Response.json({ error: "Invalid JSON body" }, { status: 422 }); }
  if (!body.projectId || !body.evaluatorId || !body.traceId || !body.output) return Response.json({ error: "projectId, evaluatorId, traceId, and output are required" }, { status: 422 });
  let convex;
  try {
    convex = await getAuthedConvexClient();
  } catch (error) {
    console.error("Evaluator auth/configuration failed:", error);
    return Response.json({ error: "Authentication or Convex configuration is unavailable" }, { status: 503 });
  }
  let evaluator;
  try {
    evaluator = await convex.query(api.evaluators.get, { projectId: body.projectId as never, evaluatorId: body.evaluatorId as never });
  } catch (error) {
    console.error("Evaluator lookup failed:", error);
    return Response.json({ error: "Evaluator access could not be verified" }, { status: 403 });
  }
  if (!evaluator) return Response.json({ error: "Evaluator not found or inactive" }, { status: 404 });
  let value: number;
  if (evaluator.type === "code") {
    try { value = runCodeRule(evaluator.criteria, body.output, body.expectedOutput); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Code evaluator failed" }, { status: 422 }); }
  } else {
    const own = await getProjectLlm(convex, body.projectId);
    const key = own?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) return Response.json({ error: "Add a model connection in Project settings, or ask the owner to set OPENAI_API_KEY, to use AI judges" }, { status: 503 });
    const response = await fetch(own ? chatUrl(own.baseUrl) : "https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + key }, body: JSON.stringify({ model: own?.model ?? "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Evaluate the response against the criteria. Return only JSON: {\"score\": number between 0 and 1, \"reason\": string}." }, { role: "user", content: JSON.stringify({ criteria: evaluator.criteria, output: body.output, expectedOutput: body.expectedOutput }) }] }) });
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) return Response.json({ error: data.error?.message || "Judge request failed" }, { status: response.status });
    try { const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}") as { score?: number; reason?: string }; value = Math.max(0, Math.min(1, Number(parsed.score))); await convex.mutation(api.evaluation.createScore, { projectId: body.projectId as never, traceId: body.traceId, name: evaluator.name, value, dataType: "numeric", source: "llm", comment: parsed.reason }); return Response.json({ value, reason: parsed.reason }); } catch { return Response.json({ error: "Judge returned invalid JSON" }, { status: 502 }); }
  }
  await convex.mutation(api.evaluation.createScore, { projectId: body.projectId as never, traceId: body.traceId, name: evaluator.name, value, dataType: "numeric", source: "code", comment: evaluator.criteria });
  return Response.json({ value });
}
