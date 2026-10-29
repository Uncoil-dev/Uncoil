"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observation = observation;
const node_crypto_1 = require("node:crypto");
const index_1 = require("../index");
function observation(provider, model, input, options, scope) {
    const context = (0, index_1.currentTraceContext)(), inheritedRun = (0, index_1.currentRunId)();
    const implicit = !scope && inheritedRun === "unknown";
    const runId = scope?.runId ?? (implicit ? (0, node_crypto_1.randomUUID)() : inheritedRun);
    const id = scope?.spanId ?? (0, node_crypto_1.randomUUID)(), rootId = implicit ? (0, node_crypto_1.randomUUID)() : undefined;
    const client = options.client ?? context?.client ?? new index_1.UncoilClient();
    const start = Date.now();
    let ended = false;
    const data = {
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
    const safeSend = (value) => {
        try {
            void client.ingest(value).catch(() => { });
        }
        catch {
            /* Telemetry cannot change application behavior. */
        }
    };
    return {
        id,
        runId,
        data,
        started: start,
        usage(raw = {}, actualModel = model) {
            data.modelId = actualModel;
            data.inputTokens = Number(raw.input_tokens ?? raw.prompt_tokens ?? 0);
            if (provider === "anthropic")
                data.inputTokens += Number(raw.cache_creation_input_tokens ?? 0) + Number(raw.cache_read_input_tokens ?? 0);
            data.outputTokens = Number(raw.output_tokens ?? raw.completion_tokens ?? 0);
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
                }
                catch {
                    data.metadata.costKnown = false;
                }
        },
        token() {
            data.ttftMs ?? (data.ttftMs = Date.now() - start);
        },
        finish(output, error, cancelled = false) {
            if (ended)
                return;
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
                data.errorMessage = (0, index_1.integrationPayload)(cancelled
                    ? "Stream cancelled before completion"
                    : error instanceof Error
                        ? error.message
                        : String(error));
            }
            data.metadata = { ...data.metadata, cancelled };
            if (scope?.root)
                data.spanType = data.errorType ? "error" : "run_end";
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
