import { NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { compilePrompt, MAX_PLAYGROUND_MODELS } from "@/lib/prompt-utils";
import { readJson } from "@/lib/safe-json";
import { buildOpenAiBody, DEFAULT_OPENAI_MODEL, friendlyOpenAiError } from "@/lib/openai-chat";

type PlaygroundBody = { projectId?: string; prompt?: string; variables?: Record<string, unknown>; model?: string; models?: string[]; temperature?: number };
export type PlaygroundResult = { model: string; output: string; latencyMs: number; inputTokens?: number; outputTokens?: number; error?: string };

const MAX_PROMPT = 100_000;
const MAX_VALUE = 20_000;
const TIMEOUT_MS = 60_000;

function providerFor(model: string) {
  return /^claude/i.test(model) ? "anthropic" : "openai";
}
const PROVIDER_NAMES = { openai: "OpenAI", anthropic: "Anthropic" } as const;

/** Which providers have a key on the server. The page uses this to say "not set up" before anyone writes a prompt. */
function configured() {
  return { openai: Boolean(process.env.OPENAI_API_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY) };
}

async function authorise(projectId: string) {
  let convex;
  try { convex = await getAuthedConvexClient(); } catch (error) {
    console.error("Playground auth/configuration failed:", error);
    return Response.json({ error: "Authentication or Convex configuration is unavailable" }, { status: 503 });
  }
  try {
    const project = await convex.query(api.projects.getProject, { projectId: projectId as never });
    if (!project) return Response.json({ error: "Project not found or access denied" }, { status: 403 });
  } catch (error) {
    console.error("Playground project lookup failed:", error);
    return Response.json({ error: "Project access could not be verified" }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return Response.json({ error: "projectId is required" }, { status: 422 });
  const denied = await authorise(projectId);
  if (denied) return denied;
  return Response.json({ providers: configured() });
}

async function runOpenAi(model: string, text: string, temperature: number, signal: AbortSignal): Promise<Omit<PlaygroundResult, "model" | "latencyMs">> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", signal, headers: { "content-type": "application/json", authorization: "Bearer " + process.env.OPENAI_API_KEY }, body: JSON.stringify(buildOpenAiBody(model, [{ role: "user", content: text }], { temperature, maxOutputTokens: 2048 })) });
  const data = await readJson<{ choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number }; error?: { message?: string } }>(response);
  if (!response.ok) return { output: "", error: friendlyOpenAiError(response.status, data.error?.message) };
  return { output: data.choices?.[0]?.message?.content ?? "", inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens };
}

async function runAnthropic(model: string, text: string, temperature: number, signal: AbortSignal): Promise<Omit<PlaygroundResult, "model" | "latencyMs">> {
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal, headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 2048, temperature: Math.min(temperature, 1), messages: [{ role: "user", content: text }] }) });
  const data = await readJson<{ content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number }; error?: { message?: string } }>(response);
  if (!response.ok) return { output: "", error: data.error?.message || "The model provider rejected the request." };
  return { output: (data.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join(""), inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens };
}

export async function POST(request: NextRequest) {
  let body: PlaygroundBody;
  try { body = await request.json() as PlaygroundBody; } catch { return Response.json({ error: "Invalid JSON body" }, { status: 422 }); }
  if (!body.projectId || !body.prompt?.trim()) return Response.json({ error: "projectId and prompt are required" }, { status: 422 });
  if (body.prompt.length > MAX_PROMPT) return Response.json({ error: "The prompt is too long for the playground." }, { status: 422 });
  const denied = await authorise(body.projectId);
  if (denied) return denied;

  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.variables ?? {})) if (typeof value === "string") values[key] = value.slice(0, MAX_VALUE);
  const compiled = compilePrompt(body.prompt, values);
  if (compiled.missing.length) return Response.json({ error: `Fill in ${compiled.missing.map((name) => `{{${name}}}`).join(", ")} before running.`, missing: compiled.missing }, { status: 422 });

  const requested = body.models?.length ? body.models : [body.model || DEFAULT_OPENAI_MODEL];
  const models = [...new Set(requested.map((model) => String(model).trim()).filter((model) => /^[A-Za-z0-9._:/-]{1,80}$/.test(model)))].slice(0, MAX_PLAYGROUND_MODELS);
  if (!models.length) return Response.json({ error: "Pick at least one model." }, { status: 422 });
  const temperature = Number.isFinite(body.temperature) ? Math.min(Math.max(body.temperature as number, 0), 2) : 0.2;

  const keys = configured();
  const missingProvider = models.find((model) => !keys[providerFor(model)]);
  if (missingProvider) {
    const provider = providerFor(missingProvider);
    return Response.json({ error: `The ${PROVIDER_NAMES[provider]} connection is not set up on this server yet, so ${missingProvider} cannot run.`, code: "provider_not_configured", providers: keys }, { status: 503 });
  }

  const results: PlaygroundResult[] = await Promise.all(models.map(async (model) => {
    const startedAt = Date.now();
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    try {
      const provider = providerFor(model);
      const run = provider === "anthropic" ? runAnthropic : runOpenAi;
      return { model, latencyMs: Date.now() - startedAt, ...(await run(model, compiled.text, temperature, signal)) };
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      return { model, output: "", latencyMs: Date.now() - startedAt, error: timedOut ? "The model took longer than a minute to answer." : "The model provider could not be reached." };
    }
  }));
  const first = results[0];
  return Response.json({ output: first?.output ?? "", model: first?.model, latencyMs: first?.latencyMs ?? 0, results, compiled: compiled.text });
}
