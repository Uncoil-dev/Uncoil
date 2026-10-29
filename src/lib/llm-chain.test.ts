import assert from "node:assert/strict";
import test from "node:test";
import { completeWithFallback } from "./llm-chain.ts";

const prompt = { system: "s", user: "u", maxOutputTokens: 50 };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
function stub(handler: (url: string) => Response) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: unknown) => handler(String(input))) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test("reports the failure when OpenAI is out of credit", async () => {
  const restore = stub(() => json(429, { error: { message: "You exceeded your current quota" } }));
  const quiet = console.error; console.error = () => {};
  try {
    const result = await completeWithFallback("t", { openai: "k" }, {}, prompt);
    assert.deepEqual([result.text, result.provider, result.failures], ["", null, ["quota"]]);
  } finally { restore(); console.error = quiet; }
});

test("an empty OpenAI answer comes back as no answer", async () => {
  const restore = stub(() => json(200, { choices: [{ message: { content: "" } }] }));
  try {
    const result = await completeWithFallback("t", { openai: "k" }, {}, prompt);
    assert.deepEqual([result.text, result.provider], ["", null]);
  } finally { restore(); }
});

process.env.ASK_AI_ALT_BASE_URL = "https://alt.example.test/v1";
process.env.ASK_AI_ALT_MODELS_ALLOWED = "demo-model";

test("alternate provider answers first and the others are not called", async () => {
  const urls: string[] = [];
  const restore = stub((url) => { urls.push(url); return json(200, { choices: [{ message: { content: "alt" } }] }); });
  try {
    const result = await completeWithFallback("t", { alt: "z", openai: "k" }, { alt: "demo-model" }, prompt);
    assert.deepEqual([result.text, result.provider, urls.length], ["alt", "alt", 1]);
    assert.ok(urls[0].startsWith("https://alt.example.test/"));
  } finally { restore(); }
});

test("falls back to OpenAI when the alternate provider is rate limited", async () => {
  const restore = stub((url) => url.includes("alt.example") ? json(429, { error: { message: "Rate limit" } }) : json(200, { choices: [{ message: { content: "oa" } }] }));
  const quiet = console.error; console.error = () => {};
  try {
    const result = await completeWithFallback("t", { alt: "z", openai: "k" }, { alt: "demo-model" }, prompt);
    assert.deepEqual([result.text, result.provider, result.failures], ["oa", "openai", ["rate"]]);
  } finally { restore(); console.error = quiet; }
});

test("the alternate provider never sends a model that is not on the allowed list", async () => {
  let called = 0;
  const restore = stub(() => { called++; return json(200, { choices: [{ message: { content: "x" } }] }); });
  const quiet = console.error; console.error = () => {};
  try {
    assert.equal((await completeWithFallback("t", { alt: "z" }, { alt: "other-model" }, prompt)).text, "");
    assert.equal(called, 0);
    assert.equal((await completeWithFallback("t", { alt: "z" }, { alt: "Demo-Model" }, prompt)).text, "x");
  } finally { restore(); console.error = quiet; }
});

test("the alternate provider gets a user agent and a session id header", async () => {
  process.env.ASK_AI_ALT_BASE_URL = "https://alt.example/v1";
  process.env.ASK_AI_ALT_MODELS_ALLOWED = "m1";
  const original = globalThis.fetch;
  let seen: Headers | null = null;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => { seen = new Headers(init?.headers); return json(200, { choices: [{ message: { content: "hi" } }] }); }) as typeof fetch;
  try {
    const result = await completeWithFallback("Ask AI", { alt: "k" }, { alt: "m1" }, prompt);
    assert.equal(result.text, "hi");
    assert.match(seen!.get("x-opencode-session") ?? "", /^uncoil-ask-ai-[0-9a-f-]{36}$/);
    assert.match(seen!.get("user-agent") ?? "", /^Uncoil\//);
  } finally { globalThis.fetch = original; }
});

test("streaming hands out pieces as they arrive and returns the whole answer", async () => {
  const { streamWithFallback, sseTextPieces } = await import("./llm-chain.ts");
  assert.deepEqual(sseTextPieces('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\ndata: {"choi'), { pieces: ["Hi"], rest: 'data: {"choi' });
  const events = ['data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n', 'data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n'];
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(new ReadableStream({ start(controller) { events.forEach((event) => controller.enqueue(new TextEncoder().encode(event))); controller.close(); } }), { status: 200 })) as typeof fetch;
  try {
    const seen: string[] = [];
    const result = await streamWithFallback("t", { alt: "z" }, { alt: "m1" }, prompt, (piece) => seen.push(piece));
    assert.deepEqual([result.text, result.provider, seen], ["Hello", "alt", ["Hel", "lo"]]);
  } finally { globalThis.fetch = original; }
});
