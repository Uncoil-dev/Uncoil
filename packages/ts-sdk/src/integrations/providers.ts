import {
  observation,
  type Observation,
  type IntegrationOptions,
} from "./observation";
export type { IntegrationOptions } from "./observation";
type Value = Record<string, any>; // Provider objects vary across official SDK versions; wrappers retain the caller's generic type.
const wrapped = new WeakSet<object>();
function capture(obs: Observation, value: Value) {
  const result = value.response ?? value.message ?? value;
  if (result.usage && value.type !== "message_delta")
    obs.usage(result.usage, result.model ?? obs.data.modelId);
  if (result.model) obs.data.modelId = result.model;
  const delta =
    value.choices?.[0]?.delta?.content ??
    value.delta?.text ??
    (value.type === "response.output_text.delta" ? value.delta : undefined);
  if (typeof delta === "string" && delta) obs.token();
  if (value.type === "message_start")
    obs.usage(value.message?.usage, value.message?.model);
  if (value.type === "message_delta" && value.usage)
    obs.usage({ ...(obs.data.metadata?.usage ?? {}), ...Object.fromEntries(Object.entries(value.usage).filter(([,value])=>value != null)) });
  const finishReason =
    value.choices?.[0]?.finish_reason ??
    value.delta?.stop_reason ??
    result.stop_reason ??
    (value.type === "response.completed" ? "completed" : undefined);
  if (finishReason) obs.data.metadata = { ...obs.data.metadata, finishReason };
  if (value.type === "response.failed" || value.type === "error") {
    const e = new Error(
      value.error?.message ??
        value.response?.error?.message ??
        "Provider stream failed",
    );
    e.name = value.error?.type ?? "ProviderError";
    obs.finish(undefined, e);
  }
  return delta ?? "";
}
function observeStream<T extends object>(
  stream: T,
  obs: Observation,
  provider: string,
): T {
  let text = "";
  const collect = (event: Value) => {
    const delta = capture(obs, event);
    if (typeof delta === "string") text = (text + delta).slice(0, 10000);
  };
  // SDK event-emitter helpers consume their own stream. Observe events without iterating it twice.
  if (typeof (stream as Value).on === "function") {
    const emitter = stream as Value;
    emitter.on(provider === "anthropic" ? "streamEvent" : "chunk", collect);
    if (provider === "openai") emitter.on("event", collect);
    emitter.on("end", () => obs.finish(text));
    emitter.on("error", (error: unknown) => obs.finish(text, error));
    emitter.on("abort", () => obs.finish(text, undefined, true));
    return stream;
  }
  return new Proxy(stream, {
    get(target, key) {
      if (key === Symbol.asyncIterator)
        return async function* () {
          let complete = false;
          try {
            for await (const event of target as AsyncIterable<Value>) {
              collect(event);
              yield event;
            }
            complete = true;
          } catch (error) {
            obs.finish(text, error);
            throw error;
          } finally {
            obs.finish(text, undefined, !complete);
          }
        };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
/** Preserve APIPromise helpers and stream/controller identity. Do not eagerly parse raw HTTP responses. */
function observeResult(result: any, obs: Observation, provider: string): any {
  let parsed: Promise<any> | undefined;
  const consume = (value: any) => {
    if (value && typeof value[Symbol.asyncIterator] === "function")
      return observeStream(value, obs, provider);
    capture(obs, value ?? {});
    obs.finish(value?.choices ?? value?.output ?? value?.content ?? value);
    return value;
  };
  if (result && typeof result.then === "function")
    return new Proxy(result, {
      get(target, key) {
        const parse = () =>
          (parsed ??= Promise.resolve(target)
            .then(consume)
            .catch((error) => {
              obs.finish(undefined, error);
              throw error;
            }));
        if (key === "then")
          return (ok: any, fail: any) => parse().then(ok, fail);
        if (key === "catch") return (fail: any) => parse().catch(fail);
        if (key === "finally") return (done: any) => parse().finally(done);
        if (key === "withResponse")
          return async (...args: any[]) => {
            try {
              const full = await target.withResponse(...args);
              return { ...full, data: await parse() };
            } catch (error) {
              obs.finish(undefined, error);
              throw error;
            }
          };
        if (key === "asResponse")
          return async (...args: any[]) => {
            try {
              const response = await target.asResponse(...args);
              obs.finish("[raw response not consumed]");
              return response;
            } catch (error) {
              obs.finish(undefined, error);
              throw error;
            }
          };
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  if (result && typeof result[Symbol.asyncIterator] === "function")
    return observeStream(result, obs, provider);
  return consume(result);
}
/** True while a wrapped client is calling the provider, so auto-instrumentation does not record the call twice. */
let insideWrapped = false;
export const isInsideWrapped = () => insideWrapped;
/** Record one provider call. `call` receives the (possibly adjusted) params and returns the provider's result. */
export function traced(
  provider: string,
  endpoint: string,
  call: (params: any) => any,
  rawParams: any,
  options: IntegrationOptions,
  markWrapped = true,
): any {
  const params = { ...(rawParams ?? {}) };
  if (
    provider === "openai" &&
    endpoint.startsWith("chat.") &&
    params.stream &&
    params.stream_options?.include_usage === undefined
  )
    params.stream_options = { ...params.stream_options, include_usage: true };
  const obs = observation(
    provider,
    params.model ?? "",
    params.system
      ? [{ role: "system", content: params.system }, ...(params.messages ?? [])]
      : params.instructions
        ? { instructions: params.instructions, input: params.input }
        : (params.messages ?? params.input ?? params.prompt ?? ""),
    options,
  );
  const before = insideWrapped;
  if (markWrapped) insideWrapped = true;
  try {
    return observeResult(call(params), obs, provider);
  } catch (error) {
    obs.finish(undefined, error);
    throw error;
  } finally {
    insideWrapped = before;
  }
}
function wrap<T extends object>(
  client: T,
  provider: string,
  options: IntegrationOptions,
): T {
  if (wrapped.has(client)) return client;
  const cache = new WeakMap<object, object>();
  const proxy = (target: object, path: string[]): any => {
    const existing = cache.get(target);
    if (existing) return existing;
    const result = new Proxy(target, {
      get(obj, key) {
        const value = Reflect.get(obj, key, obj);
        const next = [...path, String(key)];
        const endpoint = next.join(".");
        const allowed =
          provider === "openai"
            ? [
                "chat.completions.create",
                "chat.completions.stream",
                "responses.create",
                "responses.stream",
              ]
            : [
                "messages.create",
                "messages.stream",
                "beta.messages.create",
                "beta.messages.stream",
              ];
        if (typeof value === "function" && allowed.includes(endpoint))
          return (...args: any[]) =>
            traced(provider, endpoint, (params) => value.apply(obj, [params, ...args.slice(1)]), args[0], options);
        if (
          value &&
          typeof value === "object" &&
          (path.length === 0 ||
            [
              "chat",
              "chat.completions",
              "responses",
              "messages",
              "beta",
              "beta.messages",
            ].includes(next.join(".")))
        )
          return proxy(value, next);
        return typeof value === "function" ? value.bind(obj) : value;
      },
    });
    cache.set(target, result);
    return result;
  };
  const result = proxy(client, []) as T;
  wrapped.add(result);
  return result;
}
export function wrapOpenAI<T extends object>(
  client: T,
  options: IntegrationOptions = {},
): T {
  return wrap(client, "openai", options);
}
export function wrapAnthropic<T extends object>(
  client: T,
  options: IntegrationOptions = {},
): T {
  return wrap(client, "anthropic", options);
}
