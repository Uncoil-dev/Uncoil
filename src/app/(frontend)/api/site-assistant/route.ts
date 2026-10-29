import { NextRequest, NextResponse } from "next/server";
import { ASSISTANT_SYSTEM_PROMPT, fallbackAssistantAnswer, getAssistantContext, redactAssistantText, type AssistantCitation } from "@/lib/site-assistant";
import { completeWithFallback } from "@/lib/llm-chain";
import { consumeRateLimit } from "@/lib/redis-cache";

const recentRequests = new Map<string, number[]>();
const localDailyUsage = new Map<string, number>();

function configuredLimit(name: string, fallback: number, minimum: number, maximum: number) {
  const value = Number((process.env[name] ?? process.env[name.replace("UNCOIL_", "TRACIFY_")]) ?? fallback);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.floor(value))) : fallback;
}

function allowedCitation(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("javascript:");
}

async function traceAssistant(payload: Record<string, unknown>) {
  const endpoint = (process.env.UNCOIL_INTERNAL_INGEST_URL ?? process.env.TRACIFY_INTERNAL_INGEST_URL);
  const apiKey = (process.env.UNCOIL_INTERNAL_API_KEY ?? process.env.TRACIFY_INTERNAL_API_KEY);
  if (!endpoint || !apiKey) return;
  try {
    await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ ...payload, input: redactAssistantText(String(payload.input ?? "")), output: redactAssistantText(String(payload.output ?? "")), spanType: "llm", createdAt: new Date().toISOString() }), signal: AbortSignal.timeout(1500) });
  } catch {
    // Observability must never make the public assistant unavailable.
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { message?: unknown; conversationId?: unknown; pagePath?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) return NextResponse.json({ error: "Message must be between 1 and 2,000 characters." }, { status: 422 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const now = Date.now();
  const perMinuteLimit = configuredLimit("UNCOIL_ASSISTANT_REQUESTS_PER_MINUTE", 5, 1, 60);
  const dailyLimit = configuredLimit("UNCOIL_ASSISTANT_REQUESTS_PER_DAY", 100, 1, 10_000);
  const recent = (recentRequests.get(ip) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= perMinuteLimit) return NextResponse.json({ error: "Please wait a moment before sending another question." }, { status: 429 });
  recentRequests.set(ip, [...recent, now]);
  const dayKey = new Date(now).toISOString().slice(0, 10);
  const localKey = `${dayKey}:global`;
  const localCount = localDailyUsage.get(localKey) ?? 0;
  if (localCount >= dailyLimit) return NextResponse.json({ error: "The assistant has reached today's usage limit. Please try again tomorrow." }, { status: 429 });
  localDailyUsage.set(localKey, localCount + 1);
  try {
    const ipQuota = await consumeRateLimit(`uncoil:assistant:ip:${ip}`, 1, perMinuteLimit, 60);
    if (!ipQuota.allowed) return NextResponse.json({ error: "Please wait a moment before sending another question." }, { status: 429 });
    const dailyQuota = await consumeRateLimit(`uncoil:assistant:global:${dayKey}`, 1, dailyLimit, 86_400);
    if (!dailyQuota.allowed) return NextResponse.json({ error: "The assistant has reached today's usage limit. Please try again tomorrow." }, { status: 429 });
  } catch {
    // Redis is optional in local development; the in-memory guard remains active.
  }

  const context = getAssistantContext(message);
  const fallback = fallbackAssistantAnswer(message);
  const startedAt = performance.now();
  let answer = fallback.answer;
  let citations: AssistantCitation[] = fallback.citations;
  const openaiKey = (process.env.UNCOIL_ASSISTANT_OPENAI_API_KEY ?? process.env.TRACIFY_ASSISTANT_OPENAI_API_KEY) || process.env.OPENAI_API_KEY || "";
  // Low reasoning still spends tokens thinking, so the cap needs headroom or the answer comes back empty.
  const maxCompletionTokens = configuredLimit("UNCOIL_ASSISTANT_MAX_COMPLETION_TOKENS", 800, 200, 1500);
  let provider = "fallback";

  if (openaiKey) {
    const result = await completeWithFallback(
      "Site assistant",
      { openai: openaiKey },
      { openai: (process.env.UNCOIL_ASSISTANT_MODEL ?? process.env.TRACIFY_ASSISTANT_MODEL) },
      { system: ASSISTANT_SYSTEM_PROMPT, user: `Public context:\n${context.map((entry) => `${entry.title}: ${entry.text}`).join("\n")}\n\nVisitor message: ${message}`, temperature: 0.4, maxOutputTokens: maxCompletionTokens, timeoutMs: 15_000 },
    );
    if (result.text) {
      answer = result.text;
      provider = result.provider ?? provider;
      citations = fallback.offTopic ? [] : context.map((entry) => ({ title: entry.title, href: entry.href }));
    } else if (result.failures.some((failure) => failure === "rate" || failure === "quota")) {
      answer = "I'm a bit busy right now. Give me a minute and ask again, or the docs will have it in the meantime.";
      citations = [{ title: "Browse the docs", href: "/docs" }];
    }
  }

  const safeCitations = citations.filter((citation) => allowedCitation(citation.href)).slice(0, 4);
  const conversationId = typeof body?.conversationId === "string" && body.conversationId.length < 100 ? body.conversationId : crypto.randomUUID();
  void traceAssistant({ input: message, output: answer, pagePath: typeof body?.pagePath === "string" ? body.pagePath : "/", conversationId, latencyMs: Math.round(performance.now() - startedAt), provider });
  return NextResponse.json({ answer, citations: safeCitations, conversationId });
}
