# Tracify TypeScript SDK

Observability and tracing for AI agents. Gain full visibility into your agent's decision-making process, tool usage, and LLM costs.

Tracify records each agent run as one trace: every model call, tool call, retry, failure and cost. It also ingests OpenTelemetry. Free plan available. Docs: [tracify.tech/docs](https://www.tracify.tech/docs). New to agent observability? Read the [complete guide](https://www.tracify.tech/blog/ai-agent-observability-complete-guide).

## Installation

```bash
npm install tracify-sdk
# or
yarn add tracify-sdk
```

## Quickstart

1. Get your API Key from the [Tracify Dashboard](https://www.tracify.tech).
2. Set it as an environment variable:

```bash
export TRACIFY_API_KEY=your_sk_live_...
```

3. Instrument your agent:

```typescript
import { traceAgent, llmCall, toolCall } from 'tracify-sdk';

const agent = traceAgent(async (query: string) => {
  // LLM Call
  await llmCall({
    input: query,
    output: "Thinking...",
    modelId: "gpt-4o",
    costUsd: 0.002,
    latencyMs: 800
  });
  
  // Tool Use
  await toolCall({
    toolName: "web_search",
    input: { q: query },
    output: "Found results...",
    latencyMs: 1200
  });
  
  return "Final Answer";
}, { environment: "development", release: "quickstart" });
```

## Steps

Inside a `traceAgent` function, every step you record is linked to the step it ran in, so the trace graph
shows which step called which and how loops repeat. Use `span` for a block and `observe` for a function:

```ts
import { observe, span, traceAgent } from "tracify-sdk";

const searchDocs = observe(async function searchDocs(query: string) {
  return search(query);
}, { type: "tool" });

export const answer = traceAgent(async (question: string) => {
  for (let turn = 0; turn < 5; turn++) {
    const reply = await span("think", () =>
      span("chat", async (step) => {
        const reply = await callModel(question);
        step.set({ model: "claude-sonnet-5-5", inputTokens: reply.usage.input, outputTokens: reply.usage.output });
        return reply;
      }, { type: "llm", input: question }),
    { type: "agent" });
    if (reply.done) return reply.text;
    await searchDocs(reply.query);
  }
});
```

`type` is one of `agent`, `llm`, `tool`, `retrieval` or `span`. Errors are recorded with their type and
message. Concurrent runs stay in separate traces (Node's AsyncLocalStorage). Inputs and outputs have obvious
secrets (bearer tokens, API keys, JWTs, `password=` values) removed and are capped at 10,000 characters;
avoid sending anything else you would not want stored.

## Features

- **traceAgent Wrapper:** Automatically captures run lifecycle and errors.
- **Granular Spans:** Manually record LLMs, tools, and custom decisions.
- **Environment Aware:** Automatically picks up API keys from `process.env`.
- **Lightweight:** Minimal dependencies, optimized for Node.js and Edge runtimes.
- **Session context:** Add `sessionId`, `endUserId`, `environment`, `release`, and `tags` to connect related traces.

## Feedback and evaluation scores

Pass `projectId` when constructing the client to attach end-user feedback and typed scores to traces:

```typescript
const client = new TracifyClient({ apiKey: process.env.TRACIFY_API_KEY, projectId: "your-project-id" });
client.feedback(runId, true, { kind: "thumb", comment: "Helpful answer" });
client.score(runId, "answer_quality", 0.92, { dataType: "numeric" });
```

These helpers use the project API key, deduplicate when given a `dedupeKey`, and never throw into the agent process.

## Prompt deployment

Resolve a deployed prompt without shipping a new application build:

```typescript
const deployed = await client.getPrompt("support-agent", "production");
await client.ingest({ spanType: "llm", input: question, output, promptVersionId: deployed.version.id });
```

Prompt responses are cached for 60 seconds by default. Pass `{ cacheTtlMs: 0, fallback }` for development or guaranteed-availability behavior.

## License

MIT

## Provider integrations (0.4.0)

Wrap an existing client once. Its normal calls, typed results, streaming chunks and errors keep working.
Provider packages are optional; install the providers you use. Node.js is required (async context propagation).

```ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { wrapOpenAI, wrapAnthropic, TracifyLangGraphHandler, traceAgent } from "tracify-sdk";

const openai = wrapOpenAI(new OpenAI());
const anthropic = wrapAnthropic(new Anthropic());
// Existing calls now record model, input/output, latency, tokens, TTFT and provider errors.
const reply = await openai.responses.create({ model: process.env.OPENAI_MODEL!, input: "Hello" });
const stream = await anthropic.messages.create({
  model: process.env.ANTHROPIC_MODEL!, max_tokens: 100,
  messages: [{ role: "user", content: "Hello" }], stream: true,
});
for await (const event of stream) { /* existing handling */ }

// For LangGraph, pass one reusable handler in the graph invocation config.
await graph.invoke(input, { callbacks: [new TracifyLangGraphHandler()] });
```

Use `TRACIFY_API_KEY` and the existing region/host configuration. Pass `{ client }` for a custom
`TracifyClient`. Calls inside `traceAgent`/`span` inherit the current run and parent; standalone provider
calls get a completed root, so unrelated requests never share an `unknown` run. LangGraph callbacks
record graph/node/tool/model parent relationships. Use either framework model callbacks or a wrapped
provider for each model call to avoid recording that call twice.

Supported APIs: OpenAI `chat.completions.create`, `responses.create`, and their `.stream()` helpers;
Anthropic `messages.create`, `messages.stream`, and beta messages equivalents. Async iteration and
helper event/final-result APIs are observed. OpenAI `.withResponse()` retains headers/request IDs;
`.asResponse()` remains unparsed and records request timing only. Stream conversion helpers such as
`.tee()` and `.toReadableStream()` are passed through and do not observe consumption: iterate the
wrapped stream for complete usage/TTFT. Explicit `stream_options.include_usage: false` is respected.
Cancel/abort records partial output once; telemetry failure never replaces the provider's result or error.

Payloads use the SDK's existing redaction and size caps. Disable capture with
`{ captureInput: false, captureOutput: false }`. Provider usage is stored exactly as returned, including
cache breakdown in metadata. **Prices are not guessed:** cost defaults to zero with
`metadata.costKnown=false`. Supply `calculateCost({provider, model, inputTokens, outputTokens, usage})`
using your own current rate card to record USD cost. Missing provider usage remains unknown, not an
estimated token count. None of these wrappers publishes your key or changes provider billing.

Anthropic total input tokens include uncached input plus cache reads and cache writes; the original
usage breakdown remains in metadata for rate-card calculations. See the [provider’s token breakdown](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

## Framework one-liners

```ts
import { wrapLanguageModel } from "ai";
import { tracifyMiddleware, traceTools } from "tracify-sdk";

const model = wrapLanguageModel({ model: openai("gpt-4o"), middleware: tracifyMiddleware() }); // Vercel AI SDK
const tools = traceTools({ searchDocs, sendEmail });   // any functions or { execute } tool objects
```

OpenAI (`wrapOpenAI`), Anthropic (`wrapAnthropic`) and LangGraph (`TracifyLangGraphHandler`) work as before. Copy-paste starters live in [`templates/`](./templates).

## Sampling, redaction and clearer errors

```ts
const tracify = new TracifyClient({
  sampleRate: 0.1,                 // record about 1 in 10 runs; each run is kept or dropped whole
  redact: { pii: true, patterns: [/ACME-\d{6}/] },   // mask emails, phones, card numbers and your own patterns
  onError: (error) => log(error.message),            // problems come with a plain-language fix (error.hint)
});
```

Spans that report an error are kept even when their run was not sampled (`keepErrors: false` turns that off). Secrets such as bearer tokens and API keys are always removed.

## Setup checker

Not seeing traces? One command checks your key, region and network, then sends a test trace:

```bash
npx tracify-sdk doctor
```

It reads `TRACIFY_API_KEY` (and `TRACIFY_REGION` / `TRACIFY_HOST` if set), tells you in plain words what is wrong and how to fix it, and exits with code 1 if anything fails. Options: `--key`, `--region eu|us`, `--host`, `--no-send` (skip the test trace) and `--json`. You can also call `runDoctor()` from code. The test trace is named "Tracify setup check" and tagged `tracify-doctor`; it counts as one trace on your plan.
