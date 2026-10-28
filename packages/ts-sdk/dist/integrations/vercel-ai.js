"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uncoilMiddleware = uncoilMiddleware;
const observation_1 = require("./observation");
function usageOf(usage = {}) {
    return {
        input_tokens: usage.inputTokens ?? usage.promptTokens ?? 0,
        output_tokens: usage.outputTokens ?? usage.completionTokens ?? 0,
    };
}
function textOf(result) {
    if (typeof result.text === "string")
        return result.text;
    if (Array.isArray(result.content))
        return result.content.filter((part) => part?.type === "text").map((part) => part.text ?? "").join("");
    return "";
}
/**
 * One-line tracing for the Vercel AI SDK. Pass it to `wrapLanguageModel`:
 *
 *   const model = wrapLanguageModel({ model: openai("gpt-4o"), middleware: uncoilMiddleware() });
 *
 * Every `generateText`, `streamText` or `generateObject` call made with that model becomes an Uncoil step.
 */
function uncoilMiddleware(options = {}) {
    const start = (model, params) => (0, observation_1.observation)(model?.provider?.split?.(".")[0] ?? "vercel-ai", model?.modelId ?? "unknown", params, options);
    return {
        async wrapGenerate({ doGenerate, params, model }) {
            const obs = start(model, params);
            try {
                const result = await doGenerate();
                if (result.usage)
                    obs.usage(usageOf(result.usage));
                obs.data.metadata = { ...obs.data.metadata, finishReason: result.finishReason };
                obs.finish(textOf(result));
                return result;
            }
            catch (error) {
                obs.finish(undefined, error);
                throw error;
            }
        },
        async wrapStream({ doStream, params, model }) {
            const obs = start(model, params);
            let result;
            try {
                result = await doStream();
            }
            catch (error) {
                obs.finish(undefined, error);
                throw error;
            }
            let text = "";
            const watcher = new TransformStream({
                transform(part, controller) {
                    if (part?.type === "text-delta") {
                        obs.token();
                        text = (text + (part.delta ?? part.textDelta ?? "")).slice(0, 10000);
                    }
                    else if (part?.type === "finish" && part.usage)
                        obs.usage(usageOf(part.usage));
                    else if (part?.type === "error")
                        obs.finish(text, part.error ?? new Error("Stream failed"));
                    controller.enqueue(part);
                },
                flush() { obs.finish(text); },
                cancel() { obs.finish(text, undefined, true); },
            });
            return { ...result, stream: result.stream.pipeThrough(watcher) };
        },
    };
}
