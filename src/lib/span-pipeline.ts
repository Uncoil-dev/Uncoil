import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

import { getConvexClient } from "@/lib/convex";
import { ingestSpan } from "@/lib/tinybird";

/** The normalized span event produced by /api/ingest (and the `uncoil/span.received` Inngest event). */
export type SpanEvent = {
  spanId: string; runId: string; projectId: string; projectDocId: string; spanType: string;
  input: string; output: string; attachments?: string; latencyMs: number; costUsd: number;
  modelId: string; toolName: string; metadata: unknown; parentSpanId: string; sessionId: string;
  endUserId: string; environment: string; release: string; tags: string[]; traceName: string;
  inputTokens: number; outputTokens: number; ttftMs: number; retryCount: number; errorType: string;
  errorMessage: string; isStreamChunk: boolean; streamSequence: number; streamFinal: boolean;
  payloadFormat: string; stackTrace: string; timedOut: boolean; timeoutMs: number; createdAt: string;
  /** Set once the span is stored, so a background consumer never stores it twice. */
  persisted?: boolean;
};

/**
 * Stores one span: the Tinybird row plus the Convex run and session summaries.
 * Ingestion runs this before it acknowledges a span, so storage never depends on a background queue.
 */
export async function persistSpan(span: SpanEvent) {
  await ingestSpan({
    spanId: span.spanId, runId: span.runId, projectId: span.projectId, spanType: span.spanType,
    input: span.input, output: span.output, attachments: span.attachments ?? "[]", latencyMs: span.latencyMs,
    costUsd: span.costUsd, modelId: span.modelId, toolName: span.toolName, parentSpanId: span.parentSpanId,
    metadata: span.metadata as Record<string, unknown>, sessionId: span.sessionId ?? "", endUserId: span.endUserId ?? "",
    environment: span.environment ?? "", release: span.release ?? "", tags: span.tags ?? [], traceName: span.traceName ?? "",
    inputTokens: span.inputTokens ?? 0, outputTokens: span.outputTokens ?? 0, ttftMs: span.ttftMs ?? 0,
    retryCount: span.retryCount ?? 0, errorType: span.errorType ?? "", errorMessage: span.errorMessage ?? "",
    isStreamChunk: span.isStreamChunk ?? false, streamSequence: span.streamSequence ?? 0, streamFinal: span.streamFinal ?? true,
    payloadFormat: span.payloadFormat ?? "json", stackTrace: span.stackTrace ?? "", timedOut: span.timedOut ?? false,
    timeoutMs: span.timeoutMs ?? 0, createdAt: span.createdAt,
  });

  const convex = getConvexClient();
  const projectId = span.projectDocId as Id<"projects">;
  const run = await convex.mutation(api.agentRuns.upsertRunFromSpan, {
    runId: span.runId, projectId, costUsd: span.costUsd, spanType: span.spanType, createdAt: span.createdAt,
    modelId: span.modelId || undefined, sessionId: span.sessionId || undefined,
    environment: span.environment || undefined, release: span.release || undefined,
  });

  if (span.sessionId) {
    const status = span.spanType === "error" ? "failed" : span.spanType === "run_end" ? "completed" : "running";
    await convex.mutation(api.sessions.upsertFromSpan, {
      projectId, sessionId: span.sessionId, endUserId: span.endUserId || undefined,
      environment: span.environment || undefined, release: span.release || undefined,
      traceName: span.traceName || undefined, tags: span.tags ?? [], createdAt: span.createdAt,
      costUsd: span.costUsd, status, isNewTrace: run.created,
    });
  }
  return run;
}
