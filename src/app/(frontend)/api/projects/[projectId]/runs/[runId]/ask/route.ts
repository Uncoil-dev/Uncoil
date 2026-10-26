import { isAuthenticated } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { getAuthedConvexClient } from "@/lib/convex-server";
import { consumeRateLimit } from "@/lib/redis-cache";
import { getSpansForRun } from "@/lib/tinybird";
import { completeWithFallback } from "@/lib/llm-chain";
import { providerForKey } from "@/lib/openai-chat";
import { buildUserMessage, MAX_QUESTION_LENGTH, quickAnswer, resolveCitations, sanitizeHistory, SYSTEM_PROMPT, type AskAnswer, type AskSpan, type AskTurn } from "@/lib/ask-ai";

export const maxDuration = 30;

const recent = new Map<string, number[]>();

function limit(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? Math.min(1000, Math.max(1, Math.floor(value))) : fallback;
}

/** Key order: dedicated Ask AI key, then OpenAI, then Anthropic. The key's own prefix decides the provider. */
function askKey() {
  return process.env.TRACIFY_ASK_AI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "";
}

/** An alternate OpenAI-compatible provider (allowed models only) is used when its key is set; then OpenAI, which can cost money, is not used at all. */
function altKey() {
  return process.env.ASK_AI_ALT_API_KEY || "";
}

type AskResult = { answer: AskAnswer | null; busy?: boolean };

async function askClaude(apiKey: string, spans: AskSpan[], question: string, history: AskTurn[]): Promise<{ text: string; busy: boolean }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.TRACIFY_ASK_AI_MODEL || "claude-haiku-5-5", max_tokens: 600, system: SYSTEM_PROMPT, messages: [{ role: "user", content: buildUserMessage(spans, question, history) }] }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error("Ask AI provider error: anthropic", response.status);
      return { text: "", busy: response.status === 429 };
    }
    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    return { text: data.content?.filter((block) => block.type === "text").map((block) => block.text ?? "").join("").trim() ?? "", busy: false };
  } catch (error) {
    console.error("Ask AI request failed:", error);
    return { text: "", busy: false };
  }
}

/** Anthropic key first, unless the alternate provider is set (then nothing paid is used); otherwise the alternate provider or OpenAI. */
async function askModel(spans: AskSpan[], question: string, history: AskTurn[]): Promise<AskResult> {
  const apiKey = askKey();
  if (apiKey && !altKey() && providerForKey(apiKey) === "anthropic") {
    const claude = await askClaude(apiKey, spans, question, history);
    if (claude.text) return { answer: resolveCitations(claude.text, spans) };
    return { answer: null, busy: claude.busy };
  }
  const result = await completeWithFallback("Ask AI", { alt: altKey() || undefined, openai: altKey() ? undefined : apiKey || undefined }, { alt: process.env.ASK_AI_ALT_MODEL, openai: process.env.TRACIFY_ASK_AI_MODEL }, { system: SYSTEM_PROMPT, user: buildUserMessage(spans, question, history), temperature: 0.2, maxOutputTokens: 1500, timeoutMs: 25_000 });
  if (result.text) return { answer: resolveCitations(result.text, spans) };
  return { answer: null, busy: result.failures.some((failure) => failure === "rate" || failure === "quota") };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = await params;
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { question?: unknown; history?: unknown } | null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: `Questions must be between 1 and ${MAX_QUESTION_LENGTH} characters.` }, { status: 422 });
  }

  const convex = await getAuthedConvexClient();
  const run = await convex.query(api.agentRuns.getByRunIdForViewer, { projectId: projectId as Id<"projects">, runId }).catch(() => null);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  // Each question can cost real money, so cap them per project: in memory per server, and shared through Redis when set.
  const perMinute = limit("TRACIFY_ASK_AI_PER_MINUTE", 12);
  const perDay = limit("TRACIFY_ASK_AI_PER_DAY", 300);
  const now = Date.now();
  const hits = (recent.get(projectId) ?? []).filter((time) => now - time < 60_000);
  if (hits.length >= perMinute) return NextResponse.json({ error: "Too many questions. Please wait a moment." }, { status: 429 });
  recent.set(projectId, [...hits, now]);
  try {
    const minute = await consumeRateLimit(`tracify:askai:min:${projectId}`, 1, perMinute, 60);
    const day = await consumeRateLimit(`tracify:askai:day:${projectId}:${new Date(now).toISOString().slice(0, 10)}`, 1, perDay, 86_400);
    if (!minute.allowed || !day.allowed) return NextResponse.json({ error: !day.allowed ? "This project has reached today's Ask AI limit." : "Too many questions. Please wait a moment." }, { status: 429 });
  } catch {
    // Redis is optional; the in-memory guard stays active.
  }

  let spans: AskSpan[];
  try {
    spans = (await getSpansForRun(runId, projectId)) as AskSpan[];
  } catch (error) {
    console.error("Ask AI could not read spans:", error);
    return NextResponse.json({ error: "Step data is temporarily unavailable." }, { status: 503 });
  }

  const { answer: ai, busy } = await askModel(spans, question, sanitizeHistory(body?.history));
  if (ai) return NextResponse.json({ ...ai, source: "ai" });
  const basic = quickAnswer(question, spans);
  if (basic) return NextResponse.json({ ...basic, source: "basic" });
  const configured = Boolean(askKey() || altKey());
  return NextResponse.json({
    answer: busy
      ? "The AI service is busy right now. Wait a minute and try again, or ask one of the suggested questions."
      : configured
      ? "I couldn't reach the AI service just now. Try again in a moment, or ask one of the suggested questions."
      : "Free-form questions need AI switched on for this workspace. For now I can answer what went wrong, what was slowest, what cost the most, and a short summary.",
    stepIds: [],
    source: "basic",
  });
}
