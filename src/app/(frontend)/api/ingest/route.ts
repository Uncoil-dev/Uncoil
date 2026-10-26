import { type NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { getConvexClient } from "@/lib/convex";
import { inngest } from "@/lib/inngest";
import { getWrongRegionApiKeyResponse, hashApiKey, isTracifyApiKey } from "@/lib/api-keys";
import { DEFAULT_REDACTION_RULES, redactPayload, redactRecord } from "@/lib/redaction";
import { planLimitResponse, recordRateLimitStrike } from "@/lib/plan-limits-server";
import { FREE_MAX_SPAN_BYTES, ingestLimitPerMinute } from "@/lib/plan-limits";
import { consumeRateLimit } from "@/lib/redis-cache";
import { persistSpan, type SpanEvent } from "@/lib/span-pipeline";

const MAX_BODY_BYTES = 1024 * 1024;
const PAID_INGEST_LIMIT_PER_MINUTE = Number(process.env.TRACIFY_INGEST_LIMIT_PER_MINUTE ?? 6_000);

type SpanPayload = {
  spanId: string;
  runId: string;
  spanType: string;
  createdAt: string;
  latencyMs: number;
  input?: unknown;
  output?: unknown;
  attachments?: unknown[];
  costUsd?: number;
  modelId?: string;
  toolName?: string;
  metadata?: Record<string, unknown>;
  parentSpanId?: string;
  sessionId?: string;
  endUserId?: string;
  environment?: string;
  release?: string;
  tags?: string[];
  traceName?: string;
  inputTokens?: number;
  outputTokens?: number;
  ttftMs?: number;
  retryCount?: number;
  errorType?: string;
  errorMessage?: string;
  isStreamChunk?: boolean;
  streamSequence?: number;
  streamFinal?: boolean;
  payloadFormat?: string;
  stackTrace?: string;
  timedOut?: boolean;
  timeoutMs?: number;
  promptVersionId?: string;
};

function jsonString(value: unknown) {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function isIsoString(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function validatePayload(body: Record<string, unknown>):
  | { ok: true; payload: SpanPayload }
  | { ok: false; error: string } {
  const hasInputOrOutput = body.input !== undefined || body.output !== undefined || body.attachments !== undefined;

  if (typeof body.spanId !== "string") {
    return { ok: false, error: "spanId must be a string" };
  }
  if (typeof body.runId !== "string") {
    return { ok: false, error: "runId must be a string" };
  }
  if (typeof body.spanType !== "string") {
    return { ok: false, error: "spanType must be a string" };
  }
  if (typeof body.createdAt !== "string" || !isIsoString(body.createdAt)) {
    return { ok: false, error: "createdAt must be an ISO string" };
  }
  if (typeof body.latencyMs !== "number" || body.latencyMs < 0) {
    return { ok: false, error: "latencyMs must be a non-negative number" };
  }
  if (!hasInputOrOutput) {
    return { ok: false, error: "input or output is required" };
  }

  if (body.costUsd !== undefined && typeof body.costUsd !== "number") {
    return { ok: false, error: "costUsd must be a number" };
  }
  if (body.modelId !== undefined && typeof body.modelId !== "string") {
    return { ok: false, error: "modelId must be a string" };
  }
  if (body.toolName !== undefined && typeof body.toolName !== "string") {
    return { ok: false, error: "toolName must be a string" };
  }
  if (body.parentSpanId !== undefined && typeof body.parentSpanId !== "string") {
    return { ok: false, error: "parentSpanId must be a string" };
  }
  for (const key of ["sessionId", "endUserId", "environment", "release", "traceName"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "string") {
      return { ok: false, error: `${key} must be a string` };
    }
  }
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string"))) {
    return { ok: false, error: "tags must be an array of strings" };
  }
  if (body.attachments !== undefined && !Array.isArray(body.attachments)) {
    return { ok: false, error: "attachments must be an array" };
  }
  for (const key of ["inputTokens", "outputTokens", "ttftMs", "retryCount", "streamSequence"] as const) {
    if (body[key] !== undefined && (typeof body[key] !== "number" || body[key] < 0)) {
      return { ok: false, error: `${key} must be a non-negative number` };
    }
  }
  for (const key of ["errorType", "errorMessage", "payloadFormat", "stackTrace"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "string") {
      return { ok: false, error: `${key} must be a string` };
    }
  }
  for (const key of ["isStreamChunk", "streamFinal", "timedOut"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "boolean") {
      return { ok: false, error: `${key} must be a boolean` };
    }
  }
  if (body.timeoutMs !== undefined && (typeof body.timeoutMs !== "number" || body.timeoutMs < 0)) {
    return { ok: false, error: "timeoutMs must be a non-negative number" };
  }
  if (body.promptVersionId !== undefined && typeof body.promptVersionId !== "string") {
    return { ok: false, error: "promptVersionId must be a string" };
  }
  if (
    body.metadata !== undefined &&
    (typeof body.metadata !== "object" || body.metadata === null || Array.isArray(body.metadata))
  ) {
    return { ok: false, error: "metadata must be an object" };
  }

  return { ok: true, payload: body as SpanPayload };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7).trim();
  if (!isTracifyApiKey(apiKey)) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  const wrongRegion = getWrongRegionApiKeyResponse(apiKey);
  if (wrongRegion) return wrongRegion;

  let body: Record<string, unknown>;
  let bodyBytes = 0;
  try {
    const rawBody = await request.text();
    bodyBytes = new TextEncoder().encode(rawBody).byteLength;
    if (bodyBytes > MAX_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const validation = validatePayload(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 422 });
  }
  const payload = validation.payload;

  const convex = getConvexClient();
  const project = await convex.query(api.projects.getProjectByApiKey, {
    apiKeyHash: hashApiKey(apiKey),
  });

  if (!project) {
    const paused = await convex.query(api.projects.isApiKeyPaused, { apiKeyHash: hashApiKey(apiKey) }).catch(() => false);
    if (paused) {
      return Response.json(
        { error: "This API key was paused after repeated rate-limit errors. Create a new key on the API keys page.", code: "key_paused" },
        { status: 403 },
      );
    }
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  if ((project.planTier ?? "free") === "free" && bodyBytes > FREE_MAX_SPAN_BYTES) {
    return Response.json(
      { error: `A single span on the Free plan can be at most ${FREE_MAX_SPAN_BYTES / 1024} KB. Shorten the input or output, or upgrade.`, code: "span_too_large" },
      { status: 413 },
    );
  }

  const ingestLimit = ingestLimitPerMinute(project.planTier, PAID_INGEST_LIMIT_PER_MINUTE);
  let quota;
  try {
    quota = await consumeRateLimit(`ingest:${project._id}`, 1, ingestLimit, 60);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "Ingestion quota service unavailable" }, { status: 503 });
    }
    console.warn("Ingestion quota service unavailable in development; accepting with a local fallback:", error);
    quota = {
      allowed: true,
      remaining: Math.max(0, ingestLimit - 1),
      retryAfterSeconds: 60,
    };
  }
  if (!quota.allowed) {
    await recordRateLimitStrike(project, hashApiKey(apiKey));
    return Response.json(
      { error: "Ingestion rate limit exceeded", code: "rate_limit_exceeded", retryAfterSeconds: quota.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds), "X-RateLimit-Remaining": "0" } },
    );
  }

  const overPlanLimit = await planLimitResponse(project);
  if (overPlanLimit) return overPlanLimit;

  const projectDocId = project._id as Id<"projects">;
  const now = Date.now();
  const redactionEnabled = project.redactionEnabled !== false;
  const redactionRules = project.redactionRules?.length ? project.redactionRules : [...DEFAULT_REDACTION_RULES];

  // "Key last used" only needs minute accuracy; writing it on every span costs a Convex call each time.
  if (!project.apiKeyLastUsedAt || now - project.apiKeyLastUsedAt >= 60_000) {
    await convex.mutation(api.projects.markApiKeyUsed, {
      projectId: projectDocId,
      apiKeyHash: hashApiKey(apiKey),
      lastUsedAt: now,
    });
  }

  const spanEvent: SpanEvent = {
        spanId: payload.spanId,
        runId: payload.runId,
        projectId: projectDocId,
        projectDocId,
        spanType: payload.spanType,
        input: redactionEnabled ? redactPayload(payload.input, redactionRules) : jsonString(payload.input),
        output: redactionEnabled ? redactPayload(payload.output, redactionRules) : jsonString(payload.output),
        attachments: redactionEnabled ? redactPayload(payload.attachments ?? [], redactionRules) : jsonString(payload.attachments ?? []),
        latencyMs: payload.latencyMs,
        costUsd: payload.costUsd ?? 0,
        modelId: payload.modelId ?? "",
        toolName: payload.toolName ?? "",
        metadata: redactionEnabled ? redactRecord(payload.metadata ?? {}, redactionRules) : payload.metadata ?? {},
        parentSpanId: payload.parentSpanId ?? "",
        sessionId: payload.sessionId ?? "",
        endUserId: payload.endUserId ?? "",
        environment: payload.environment ?? "",
        release: payload.release ?? "",
        tags: payload.tags ?? [],
        traceName: payload.traceName ?? "",
        inputTokens: payload.inputTokens ?? Number(payload.metadata?.inputTokens ?? 0),
        outputTokens: payload.outputTokens ?? Number(payload.metadata?.outputTokens ?? 0),
        ttftMs: payload.ttftMs ?? Number(payload.metadata?.ttftMs ?? payload.metadata?.timeToFirstTokenMs ?? 0),
        retryCount: payload.retryCount ?? Number(payload.metadata?.retryCount ?? payload.metadata?.attempt ?? 0),
        errorType: payload.errorType ?? String(payload.metadata?.errorType ?? ""),
        errorMessage: payload.errorMessage ?? String(payload.metadata?.errorMessage ?? ""),
        isStreamChunk: payload.isStreamChunk ?? Boolean(payload.metadata?.isStreamChunk),
        streamSequence: payload.streamSequence ?? Number(payload.metadata?.streamSequence ?? 0),
        streamFinal: payload.streamFinal ?? Boolean(payload.metadata?.streamFinal ?? true),
        payloadFormat: payload.payloadFormat ?? "json",
        stackTrace: payload.stackTrace ?? String(payload.metadata?.stackTrace ?? ""),
        timedOut: payload.timedOut ?? Boolean(payload.metadata?.timedOut),
        timeoutMs: payload.timeoutMs ?? Number(payload.metadata?.timeoutMs ?? 0),
        createdAt: payload.createdAt,
  };
  try {
    await persistSpan(spanEvent);
  } catch (error) {
    console.error("Span storage failed:", error);
    if (process.env.NODE_ENV !== "production") {
      // Local development without Tinybird: keep the run summary and span cache in Convex only.
      try {
        await convex.mutation(api.agentRuns.upsertRunFromSpan, {
          runId: payload.runId,
          projectId: projectDocId,
          costUsd: payload.costUsd ?? 0,
          spanType: payload.spanType,
          createdAt: payload.createdAt,
          modelId: payload.modelId,
          sessionId: payload.sessionId,
          environment: payload.environment,
          release: payload.release,
        });
        await convex.mutation(api.analyticsCache.upsertRunSpanCache, {
          projectId: projectDocId,
          runId: payload.runId,
          runStatus: payload.spanType === "error" ? "failed" : payload.spanType === "run_end" ? "completed" : "running",
          spans: [{
            spanId: payload.spanId,
            runId: payload.runId,
            projectId: String(projectDocId),
            spanType: payload.spanType,
            input: jsonString(payload.input),
            output: jsonString(payload.output),
            attachments: JSON.stringify(payload.attachments ?? []),
            latencyMs: payload.latencyMs,
            costUsd: payload.costUsd ?? 0,
            modelId: payload.modelId ?? "",
            toolName: payload.toolName ?? "",
            parentSpanId: payload.parentSpanId ?? "",
            metadata: payload.metadata ?? {},
            inputTokens: payload.inputTokens ?? 0,
            outputTokens: payload.outputTokens ?? 0,
            ttftMs: payload.ttftMs ?? 0,
            retryCount: payload.retryCount ?? 0,
            errorType: payload.errorType ?? "",
            errorMessage: payload.errorMessage ?? "",
            isStreamChunk: payload.isStreamChunk ?? false,
            streamSequence: payload.streamSequence ?? 0,
            streamFinal: payload.streamFinal ?? true,
            payloadFormat: payload.payloadFormat ?? "json",
            stackTrace: payload.stackTrace ?? "",
            timedOut: payload.timedOut ?? false,
            timeoutMs: payload.timeoutMs ?? 0,
            createdAt: payload.createdAt,
          }],
          refresh: "normal",
          apiKeyHash: hashApiKey(apiKey),
        });
        console.warn("Development ingest fallback persisted the run summary directly to Convex.");
      } catch (fallbackError) {
        console.error("Development ingest fallback could not persist the run summary:", fallbackError);
      }
      return Response.json({ ok: true, spanId: payload.spanId, storage: "development-fallback" }, { status: 202 });
    }
    return Response.json(
      { error: "Span storage is temporarily unavailable. Retry this span.", code: "storage_unavailable" },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }
  if (payload.promptVersionId) {
    try {
      await convex.mutation(api.prompts.linkTraceFromApiKey, {
        projectId: projectDocId,
        apiKeyHash: hashApiKey(apiKey),
        promptVersionId: payload.promptVersionId as Id<"promptVersions">,
        traceId: payload.runId,
        spanId: payload.spanId,
      });
    } catch (error) {
      console.warn("Prompt trace link rejected:", error);
    }
  }
  try {
    // Evaluations and alert thresholds run in the background; storage above no longer depends on the queue.
    await inngest.send({ name: "tracify/span.received", data: { ...spanEvent, persisted: true } });
  } catch (err) {
    console.warn("Background follow-up for a stored span could not be queued:", err);
  }

  return Response.json(
    { ok: true, spanId: payload.spanId },
    { status: 202, headers: { "X-RateLimit-Remaining": String(quota.remaining) } },
  );
}
