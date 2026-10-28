import { randomUUID } from "node:crypto";
import {
  UncoilClient,
  currentTraceContext,
  currentRunId,
  integrationPayload,
  type SpanData,
} from "../index";
export type IntegrationOptions = {
  client?: UncoilClient;
  name?: string;
  captureInput?: boolean;
  captureOutput?: boolean;
  calculateCost?: (usage: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    usage: Record<string, unknown>;
  }) => number;
};
export function observation(
  provider: string,
  model: string,
  input: unknown,
  options: IntegrationOptions,
  scope?: {
    runId: string;
    parentSpanId?: string;
    spanId?: string;
    root?: boolean;
    type?: string;
    name?: string;
  },
) {
  const context = currentTraceContext(),
    inheritedRun = currentRunId();
  const implicit = !scope && inheritedRun === "unknown";
  const runId = scope?.runId ?? (implicit ? randomUUID() : inheritedRun);
  const id = scope?.spanId ?? randomUUID(),
    rootId = implicit ? randomUUID() : undefined;
  const client = options.client ?? context?.client ?? new UncoilClient();
  const start = Date.now();
  let ended = false;
  const data: SpanData = {
    runId,
    spanId: id,
    parentSpanId: scope?.parentSpanId ?? rootId ?? context?.spanId,
    spanType: scope?.type ?? "llm_call",
    toolName: scope?.name ?? `${provider}.${model || "call"}`,
    modelId: model,
    traceName: context?.traceName ?? options.name ?? provider,
    input: options.captureInput === false ? "[not captured]" : input,
    metadata: { provider, costKnown: false },
    createdAt: new Date(start).toISOString(),
  };
  const safeSend = (value: SpanData) => {
    try {
      void client.ingest(value).catch(() => {});
    } catch {
      /* Telemetry cannot change application behavior. */
    }
  };
  return {
    id,
    runId,
    data,
    started: start,
    usage(raw: Record<string, unknown> = {}, actualModel = model) {
      data.modelId = actualModel;
      data.inputTokens = Number(raw.input_tokens ?? raw.prompt_tokens ?? 0);
      if (provider === "anthropic") data.inputTokens += Number(raw.cache_creation_input_tokens ?? 0) + Number(raw.cache_read_input_tokens ?? 0);
      data.outputTokens = Number(
        raw.output_tokens ?? raw.completion_tokens ?? 0,
      );
      data.metadata = { ...data.metadata, usage: raw };
      if (options.calculateCost)
        try {
          const cost = options.calculateCost({
            provider,
            model: actualModel,
            inputTokens: data.inputTokens,
            outputTokens: data.outputTokens,
            usage: raw,
          });
          if (Number.isFinite(cost) && cost >= 0) {
            data.costUsd = cost;
            data.metadata.costKnown = true;
          }
        } catch {
          data.metadata.costKnown = false;
        }
    },
    token() {
      data.ttftMs ??= Date.now() - start;
    },
    finish(output?: unknown, error?: unknown, cancelled = false) {
      if (ended) return;
      ended = true;
      data.latencyMs = Date.now() - start;
      data.output =
        options.captureOutput === false ? "[not captured]" : (output ?? "");
      if (error !== undefined || cancelled) {
        data.errorType = cancelled
          ? "AbortError"
          : error instanceof Error
            ? error.name
            : "Error";
        data.errorMessage = integrationPayload(
          cancelled
            ? "Stream cancelled before completion"
            : error instanceof Error
              ? error.message
              : String(error),
        );
      }
      data.metadata = { ...data.metadata, cancelled };
      if (scope?.root) data.spanType = data.errorType ? "error" : "run_end";
      safeSend(data);
      if (implicit)
        safeSend({
          runId,
          spanId: rootId,
          spanType: data.errorType ? "error" : "run_end",
          toolName: options.name ?? provider,
          traceName: data.traceName,
          input: data.input,
          output: data.output,
          latencyMs: data.latencyMs,
          createdAt: data.createdAt,
          metadata: { provider, implicitRoot: true },
          ...(data.errorType
            ? { errorType: data.errorType, errorMessage: data.errorMessage }
            : {}),
        });
    },
  };
}
export type Observation = ReturnType<typeof observation>;
