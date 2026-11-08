import { NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { chatUrl, getProjectLlm } from "@/lib/project-llm";

type Body = { projectId: string; experimentId: string };

function compilePrompt(prompt: string, input: string) {
  return prompt.replace(/\{\{\s*(input|question|query)\s*\}\}/gi, input);
}

export async function POST(request: NextRequest) {
  let body: Body;
  try { body = await request.json() as Body; } catch { return Response.json({ error: "Invalid JSON body" }, { status: 422 }); }
  if (!body.projectId || !body.experimentId) return Response.json({ error: "projectId and experimentId are required" }, { status: 422 });
  let convex;
  try { convex = await getAuthedConvexClient(); } catch (error) { console.error("Experiment auth/configuration failed:", error); return Response.json({ error: "Authentication or Convex configuration is unavailable" }, { status: 503 }); }
  const own = await getProjectLlm(convex, body.projectId);
  const key = own?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "Add a model connection in Project settings, or ask the owner to set OPENAI_API_KEY, to run experiments" }, { status: 503 });
  let setup;
  try { setup = await convex.query(api.experiments.get, { projectId: body.projectId as never, experimentId: body.experimentId as never }); } catch (error) { console.error("Experiment lookup failed:", error); return Response.json({ error: "Experiment access could not be verified" }, { status: 403 }); }
  if (!setup) return Response.json({ error: "Experiment not found or access denied" }, { status: 404 });
  if (!setup.promptVersion) return Response.json({ error: "Choose a prompt version before running this experiment" }, { status: 422 });
  await convex.mutation(api.experiments.setStatus, { projectId: body.projectId as never, experimentId: body.experimentId as never, status: "running" });
  const results = [];
  for (const item of setup.items) {
    const startedAt = Date.now();
    try {
      const response = await fetch(own ? chatUrl(own.baseUrl) : "https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + key }, body: JSON.stringify({ model: own && !["openai", "custom"].includes(own.provider) ? own.model || "gpt-4o-mini" : setup.experiment.model || setup.promptVersion.model || own?.model || "gpt-4o-mini", temperature: 0.2, messages: [{ role: "user", content: compilePrompt(setup.promptVersion.content, item.input) }] }) });
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message || "Provider request failed");
      const output = data.choices?.[0]?.message?.content || "";
      await convex.mutation(api.experiments.recordResult, { projectId: body.projectId as never, experimentId: body.experimentId as never, datasetItemId: item._id, output, latencyMs: Date.now() - startedAt, costUsd: 0 });
      results.push({ itemId: item._id, ok: true });
    } catch (error) {
      await convex.mutation(api.experiments.recordResult, { projectId: body.projectId as never, experimentId: body.experimentId as never, datasetItemId: item._id, output: "", latencyMs: Date.now() - startedAt, costUsd: 0, error: error instanceof Error ? error.message : "Provider request failed" });
      results.push({ itemId: item._id, ok: false });
    }
  }
  await convex.mutation(api.experiments.setStatus, { projectId: body.projectId as never, experimentId: body.experimentId as never, status: results.every((result) => result.ok) ? "completed" : "failed" });
  return Response.json({ ok: true, results });
}
