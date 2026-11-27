/** Shape and validation of one span posted to /api/ingest. */
export type SpanPayload = {
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

function isIsoString(value: string) {
  return !Number.isNaN(Date.parse(value));
}

export function validatePayload(body: Record<string, unknown>):
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
