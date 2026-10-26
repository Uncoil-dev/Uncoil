import { type NextRequest } from "next/server";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { getConvexClient } from "@/lib/convex";
import { inngest } from "@/lib/inngest";
import { getWrongRegionApiKeyResponse, hashApiKey, isTracifyApiKey } from "@/lib/api-keys";
import { DEFAULT_REDACTION_RULES, redactPayload, redactRecord } from "@/lib/redaction";
import { planLimitResponse, recordRateLimitStrike } from "@/lib/plan-limits-server";
import { ingestLimitPerMinute, MAX_SPANS_PER_REQUEST } from "@/lib/plan-limits";
import { consumeRateLimit } from "@/lib/redis-cache";

const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4MB for batched OTLP traces
const PAID_INGEST_LIMIT_PER_MINUTE = Number(process.env.TRACIFY_INGEST_LIMIT_PER_MINUTE ?? 6_000);

// ─── OTLP protobuf-JSON types ────────────────────────────────────
// See: https://opentelemetry.io/docs/specs/otlp/#otlphttp-response

interface OtlpKeyValue {
  key: string;
  value: {
    stringValue?: string;
    intValue?: string;
    doubleValue?: number;
    boolValue?: boolean;
    arrayValue?: { values: OtlpKeyValue["value"][] };
  };
}

interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number; // 1=INTERNAL, 2=SERVER, 3=CLIENT, 4=PRODUCER, 5=CONSUMER
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: OtlpKeyValue[];
  events?: {
    name: string;
    timeUnixNano: string;
    attributes?: OtlpKeyValue[];
  }[];
  status?: {
    code?: number; // 0=UNSET, 1=OK, 2=ERROR
    message?: string;
  };
}

interface OtlpScopeSpans {
  scope?: { name?: string; version?: string };
  spans: OtlpSpan[];
}

interface OtlpResourceSpans {
  resource?: {
    attributes?: OtlpKeyValue[];
  };
  scopeSpans: OtlpScopeSpans[];
}

interface OtlpTracesExportRequest {
  resourceSpans: OtlpResourceSpans[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function jsonString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function getAttr(attrs: OtlpKeyValue[] | undefined, key: string): string | undefined {
  if (!attrs) return undefined;
  const found = attrs.find((a) => a.key === key);
  if (!found) return undefined;
  return found.value.stringValue ?? found.value.intValue ?? String(found.value.doubleValue ?? "");
}

function nanoToIso(nano: string): string {
  const ms = Math.floor(Number(nano) / 1_000_000);
  return new Date(ms).toISOString();
}

function nanoToMs(nano: string): number {
  return Math.floor(Number(nano) / 1_000_000);
}

function spanTypeFromKind(kind: number): string {
  switch (kind) {
    case 1: return "internal";
    case 2: return "server";
    case 3: return "llm_call"; // CLIENT kind = outbound LLM call
    case 4: return "producer";
    case 5: return "consumer";
    default: return "llm_call";
  }
}

function mapSpanAttributes(attrs: OtlpKeyValue[] | undefined): {
  input?: string;
  output?: string;
  costUsd?: number;
  modelId?: string;
  toolName?: string;
  spanType?: string;
  sessionId?: string;
  endUserId?: string;
  environment?: string;
  release?: string;
  tags: string[];
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
  metadata: Record<string, unknown>;
} {
  if (!attrs) return { metadata: {}, tags: [] };

  const metadata: Record<string, unknown> = {};
  let input: string | undefined;
  let output: string | undefined;
  let costUsd: number | undefined;
  let modelId: string | undefined;
  let toolName: string | undefined;
  let spanType: string | undefined;
  let sessionId: string | undefined;
  let endUserId: string | undefined;
  let environment: string | undefined;
  let release: string | undefined;
  let traceName: string | undefined;
  let tags: string[] = [];
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let ttftMs: number | undefined;
  let retryCount: number | undefined;
  let isStreamChunk: boolean | undefined;
  let streamSequence: number | undefined;
  let streamFinal: boolean | undefined;
  let payloadFormat: string | undefined;
  let stackTrace: string | undefined;
  let timedOut: boolean | undefined;
  let timeoutMs: number | undefined;

  for (const attr of attrs) {
    const val = attr.value.stringValue ?? attr.value.intValue ?? String(attr.value.doubleValue ?? "");

    switch (attr.key) {
      // GenAI semantic conventions (OpenLLMetry, etc.)
      case "gen_ai.system":
      case "gen_ai.request.model":
      case "ai.model.id":
        modelId = val;
        break;
      case "gen_ai.usage.input_tokens":
      case "gen_ai.usage.prompt_tokens":
      case "ai.usage.input_tokens":
        inputTokens = Number(val);
        metadata.inputTokens = inputTokens;
        break;
      case "gen_ai.usage.output_tokens":
      case "gen_ai.usage.completion_tokens":
      case "ai.usage.output_tokens":
        outputTokens = Number(val);
        metadata.outputTokens = outputTokens;
        break;
      case "gen_ai.usage.total_cost":
      case "ai.cost.usd":
        costUsd = Number(val);
        break;
      case "gen_ai.prompt":
      case "ai.input":
        input = val;
        break;
      case "gen_ai.completion":
      case "ai.output":
        output = val;
        break;
      case "ai.tool.name":
      case "gen_ai.tool.name":
        toolName = val;
        break;
      case "ai.span.type":
        spanType = val;
        break;
      case "session.id":
      case "ai.session.id":
      case "gen_ai.conversation.id":
        sessionId = val;
        break;
      case "enduser.id":
      case "ai.user.id":
        endUserId = val;
        break;
      case "deployment.environment.name":
      case "environment":
        environment = val;
        break;
      case "service.version":
      case "release":
        release = val;
        break;
      case "tracify.tags":
      case "ai.tags":
        tags = val.split(",").map((tag) => tag.trim()).filter(Boolean);
        break;
      case "tracify.trace.name":
      case "ai.trace.name":
        traceName = val;
        break;
      case "gen_ai.latency.time_to_first_token":
      case "gen_ai.time_to_first_token_ms":
      case "ai.ttft_ms":
        ttftMs = Number(val);
        metadata.ttftMs = ttftMs;
        break;
      case "tracify.retry_count":
      case "ai.retry_count":
        retryCount = Number(val);
        metadata.retryCount = retryCount;
        break;
      case "tracify.stream.chunk":
        isStreamChunk = val === "true" || val === "1";
        break;
      case "tracify.stream.sequence":
        streamSequence = Number(val);
        break;
      case "tracify.stream.final":
        streamFinal = val !== "false" && val !== "0";
        break;
      case "tracify.payload.format":
        payloadFormat = val;
        break;
      case "exception.stacktrace":
      case "error.stacktrace":
        stackTrace = val;
        break;
      case "tracify.timeout":
      case "ai.timeout":
        timedOut = val === "true" || val === "1";
        break;
      case "tracify.timeout_ms":
      case "ai.timeout_ms":
        timeoutMs = Number(val);
        break;
      default:
        metadata[attr.key] = val;
    }
  }

  return { input, output, costUsd, modelId, toolName, spanType, sessionId, endUserId, environment, release, tags, traceName, inputTokens, outputTokens, ttftMs, retryCount, isStreamChunk, streamSequence, streamFinal, payloadFormat, stackTrace, timedOut, timeoutMs, metadata };
}

// ─── Route handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  // Auth: same Bearer token scheme as native ingest
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

  let body: OtlpTracesExportRequest;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return Response.json({ error: "Payload too large" }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  if (!body.resourceSpans || !Array.isArray(body.resourceSpans)) {
    return Response.json({ error: "resourceSpans is required" }, { status: 422 });
  }

  // Resolve project from API key
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

  const requestedSpanCount = body.resourceSpans.reduce(
    (total, resource) => total + resource.scopeSpans.reduce((scopeTotal, scope) => scopeTotal + scope.spans.length, 0),
    0,
  );
  if (requestedSpanCount > MAX_SPANS_PER_REQUEST) {
    return Response.json(
      { error: `A request can carry at most ${MAX_SPANS_PER_REQUEST} spans. Send smaller batches.`, code: "too_many_spans" },
      { status: 413 },
    );
  }
  const ingestLimit = ingestLimitPerMinute(project.planTier, PAID_INGEST_LIMIT_PER_MINUTE);
  let quota;
  try {
    quota = await consumeRateLimit(`ingest:${project._id}`, requestedSpanCount, ingestLimit, 60);
  } catch {
    return Response.json({ error: "Ingestion quota service unavailable" }, { status: 503 });
  }
  if (!quota.allowed) {
    await recordRateLimitStrike(project, hashApiKey(apiKey));
    return Response.json(
      { error: "Ingestion rate limit exceeded", code: "rate_limit_exceeded", retryAfterSeconds: quota.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds), "X-RateLimit-Remaining": "0" } },
    );
  }

  const overPlanLimit = await planLimitResponse(project, requestedSpanCount);
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

  // Extract service-level attributes for defaults
  let defaultServiceName = "";
  for (const rs of body.resourceSpans) {
    const name = getAttr(rs.resource?.attributes, "service.name");
    if (name) { defaultServiceName = name; break; }
  }

  // Map OTel spans → internal span payloads and enqueue
  const enqueued: string[] = [];
  let failed = 0;

  for (const resourceSpans of body.resourceSpans) {
    for (const scopeSpans of resourceSpans.scopeSpans) {
      for (const otelSpan of scopeSpans.spans) {
        const attrs = mapSpanAttributes(otelSpan.attributes);
        const spanType = attrs.spanType ?? spanTypeFromKind(otelSpan.kind);

        const input = attrs.input ?? "";
        const output = attrs.output ?? (otelSpan.status?.code === 2
          ? otelSpan.status.message ?? "error"
          : "");

        if (!input && !output) continue; // skip empty spans

        // Use traceId as runId (or a custom attribute override)
        const runId = getAttr(otelSpan.attributes, "ai.run.id")
          ?? `otel_${otelSpan.traceId}`;

        const payload = {
          spanId: otelSpan.spanId,
          runId,
          projectId: projectDocId,
          projectDocId,
          spanType,
          input: redactionEnabled ? redactPayload(input, redactionRules) : jsonString(input),
          output: redactionEnabled ? redactPayload(output, redactionRules) : jsonString(output),
          latencyMs: nanoToMs(otelSpan.endTimeUnixNano) - nanoToMs(otelSpan.startTimeUnixNano),
          costUsd: attrs.costUsd ?? 0,
          modelId: attrs.modelId ?? defaultServiceName,
          toolName: attrs.toolName ?? "",
          metadata: redactionEnabled ? redactRecord(attrs.metadata, redactionRules) : attrs.metadata,
          parentSpanId: otelSpan.parentSpanId ?? "",
          sessionId: attrs.sessionId ?? getAttr(resourceSpans.resource?.attributes, "session.id") ?? "",
          endUserId: attrs.endUserId ?? getAttr(resourceSpans.resource?.attributes, "enduser.id") ?? "",
          environment: attrs.environment ?? getAttr(resourceSpans.resource?.attributes, "deployment.environment.name") ?? "",
          release: attrs.release ?? getAttr(resourceSpans.resource?.attributes, "service.version") ?? "",
          tags: attrs.tags,
          traceName: attrs.traceName ?? otelSpan.name,
          inputTokens: attrs.inputTokens ?? Number(attrs.metadata.inputTokens ?? 0),
          outputTokens: attrs.outputTokens ?? Number(attrs.metadata.outputTokens ?? 0),
          ttftMs: attrs.ttftMs ?? Number(attrs.metadata.ttftMs ?? 0),
          retryCount: attrs.retryCount ?? Number(attrs.metadata.retryCount ?? 0),
          errorType: otelSpan.status?.code === 2 ? "otel_error" : "",
          errorMessage: otelSpan.status?.code === 2 ? otelSpan.status.message ?? "error" : "",
          isStreamChunk: attrs.isStreamChunk ?? false,
          streamSequence: attrs.streamSequence ?? 0,
          streamFinal: attrs.streamFinal ?? true,
          payloadFormat: attrs.payloadFormat ?? "json",
          stackTrace: attrs.stackTrace ?? "",
          timedOut: attrs.timedOut ?? false,
          timeoutMs: attrs.timeoutMs ?? 0,
          createdAt: nanoToIso(otelSpan.startTimeUnixNano),
        };

        try {
          await inngest.send({ name: "tracify/span.received", data: payload });
          enqueued.push(otelSpan.spanId);
        } catch (err) {
          console.error("Inngest send failed for OTel span:", otelSpan.spanId, err);
          failed++;
        }
      }
    }
  }

  return Response.json(
    { ok: true, accepted: enqueued.length, failed },
    { status: 202, headers: { "X-RateLimit-Remaining": String(quota.remaining) } },
  );
}

// ─── GET handler for health check ─────────────────────────────────
export async function GET() {
  return Response.json({
    ok: true,
    endpoint: "otel",
    version: "0.1.0",
    format: "otlp-http-json",
  });
}
