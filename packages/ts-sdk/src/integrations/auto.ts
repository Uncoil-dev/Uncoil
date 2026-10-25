import { traced, isInsideWrapped } from "./providers";
import type { IntegrationOptions } from "./observation";

type Target = { provider: string; endpoint: string; module: string; exportName: string };

const TARGETS: Target[] = [
  { provider: "openai", endpoint: "chat.completions.create", module: "openai/resources/chat/completions", exportName: "Completions" },
  { provider: "openai", endpoint: "responses.create", module: "openai/resources/responses/responses", exportName: "Responses" },
  { provider: "anthropic", endpoint: "messages.create", module: "@anthropic-ai/sdk/resources/messages", exportName: "Messages" },
  { provider: "anthropic", endpoint: "beta.messages.create", module: "@anthropic-ai/sdk/resources/beta/messages/messages", exportName: "Messages" },
];

const restore: Array<() => void> = [];
// A real dynamic import (tsc would turn `import()` into `require` in this CommonJS build).
const esmImport = new Function("name", "return import(name)") as (name: string) => Promise<any>;

function patch(cls: any, target: Target, options: IntegrationOptions) {
  const original = cls?.prototype?.create;
  if (typeof original !== "function" || original.__tracify) return;
  const patched = function (this: unknown, ...args: any[]) {
    if (isInsideWrapped()) return original.apply(this, args);
    return traced(target.provider, target.endpoint, (params) => original.apply(this, [params, ...args.slice(1)]), args[0], options, false);
  };
  (patched as any).__tracify = true;
  cls.prototype.create = patched;
  restore.push(() => { cls.prototype.create = original; });
}

/**
 * One-line setup: call `init()` once at startup and every OpenAI and Anthropic call your app makes is traced.
 * It patches the installed `openai` and `@anthropic-ai/sdk` packages (skipping any that are missing), so no
 * client has to be wrapped by hand. Both the CommonJS and the ES-module build are patched; the ES-module one
 * lands a moment later, so `await init().ready` if your very first call happens at once.
 * Call the returned function to switch it off again.
 *
 * For LangChain / LangGraph add `new TracifyLangGraphHandler()` to `callbacks`; for the Vercel AI SDK use
 * `tracifyMiddleware()`. Use these OR `init()` for the same model calls, not both, or they are recorded twice.
 */
export function init(options: IntegrationOptions = {}): (() => void) & { ready: Promise<void> } {
  uninit();
  const pending: Promise<void>[] = [];
  for (const target of TARGETS) {
    try { patch(require(target.module)[target.exportName], target, options); } catch { /* package not installed */ }
    pending.push(
      esmImport(target.module).then((mod) => patch(mod[target.exportName], target, options)).catch(() => { /* not installed or no ES build */ }),
    );
  }
  return Object.assign(() => uninit(), { ready: Promise.all(pending).then(() => undefined) });
}

/** Switch off everything `init()` switched on. */
export function uninit() {
  while (restore.length) restore.pop()!();
}
