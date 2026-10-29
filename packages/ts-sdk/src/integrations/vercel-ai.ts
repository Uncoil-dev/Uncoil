import { observation, type IntegrationOptions } from "./observation";

type Value = Record<string, any>; // The AI SDK changes its result shapes between versions, so these are read defensively.

function usageOf(usage: Value = {}) {
  return {
    input_tokens: usage.inputTokens ?? usage.promptTokens ?? 0,
    output_tokens: usage.outputTokens ?? usage.completionTokens ?? 0,
  };
}

function textOf(result: Value): string {
  if (typeof result.text === "string") return result.text;
  if (Array.isArray(result.content))
    return result.content.filter((part: Value) => part?.type === "text").map((part: Value) => part.text ?? "").join("");
  return "";
}

/**
 * One-line tracing for the Vercel AI SDK. Pass it to `wrapLanguageModel`:
 *
 *   const model = wrapLanguageModel({ model: openai("gpt-4o"), middleware: uncoilMiddleware() });
 *
 * Every `generateText`, `streamText` or `generateObject` call made with that model becomes an Uncoil step.
 */
export function uncoilMiddleware(options: IntegrationOptions = {}) {
  const start = (model: Value | undefined, params: unknown) =>
    observation(model?.provider?.split?.(".")[0] ?? "vercel-ai", model?.modelId ?? "unknown", params, options);
  return {
    async wrapGenerate({ doGenerate, params, model }: { doGenerate: () => Promise<Value>; params: unknown; model?: Value }) {
      const obs = start(model, params);
      try {
        const result = await doGenerate();
        if (result.usage) obs.usage(usageOf(result.usage));
        obs.data.metadata = { ...obs.data.metadata, finishReason: result.finishReason };
        obs.finish(textOf(result));
        return result;
      } catch (error) {
        obs.finish(undefined, error);
        throw error;
      }
    },
    async wrapStream({ doStream, params, model }: { doStream: () => Promise<Value>; params: unknown; model?: Value }) {
      const obs = start(model, params);
      let result: Value;
      try {
        result = await doStream();
      } catch (error) {
        obs.finish(undefined, error);
        throw error;
      }
      let text = "";
      const watcher = new TransformStream({
        transform(part: Value, controller) {
          if (part?.type === "text-delta") {
            obs.token();
            text = (text + (part.delta ?? part.textDelta ?? "")).slice(0, 10000);
          } else if (part?.type === "finish" && part.usage) obs.usage(usageOf(part.usage));
          else if (part?.type === "error") obs.finish(text, part.error ?? new Error("Stream failed"));
          controller.enqueue(part);
        },
        flush() { obs.finish(text); },
        cancel() { obs.finish(text, undefined, true); },
      } as Transformer & { cancel?: () => void });
      return { ...result, stream: result.stream.pipeThrough(watcher) };
    },
  };
}
