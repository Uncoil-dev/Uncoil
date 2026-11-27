# Uncoil

[![npm](https://img.shields.io/npm/v/@uncoil.dev/sdk?label=%40uncoil.dev%2Fsdk)](https://www.npmjs.com/package/@uncoil.dev/sdk) [![PyPI](https://img.shields.io/pypi/v/uncoil-sdk?label=uncoil-sdk)](https://pypi.org/project/uncoil-sdk/) [![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)

**See what your AI agents did, why they failed, and stop it happening again.**

Uncoil records every agent run: each model call, tool call, cost, and error. You can open any run, find the step that broke, and add a check so it does not break again.

[Live demo](https://www.uncoil.dev/demo/project) · [Website](https://www.uncoil.dev) · [Docs](https://www.uncoil.dev/docs) · [Blog](https://www.uncoil.dev/blog) · [Status](https://www.uncoil.dev/status)

```text
capture → diagnose → assign → fix → verify → prevent
```

## What you get

- **Traces.** Nested runs, LLM calls, tool calls, retries, and errors in one timeline.
- **Costs.** Spend per run, per model, and per release.
- **Alerts.** Know when a run fails, slows down, or costs too much.
- **Evals.** Datasets, scores, and experiments to test a fix before you ship it.
- **Prompts.** Versions and labels, linked to the traces that used them.
- **Safe SDKs.** If Uncoil is down, your agent keeps running.

## Quickstart

New here? [Sign up](https://eu.cloud.uncoil.dev/sign-up) and copy your key. Already have an account? Get a key on the [API keys page](https://eu.cloud.uncoil.dev/dashboard/api-keys). The Free plan covers 10k spans a month and needs no card.

### TypeScript

```bash
npm install @uncoil.dev/sdk
export UNCOIL_API_KEY=uncoil_sk_live_...
```

```powershell
# Windows PowerShell
$env:UNCOIL_API_KEY="uncoil_sk_live_..."
```

```typescript
import { traceAgent, llmCall, toolCall } from "@uncoil.dev/sdk";

const run = traceAgent(async (question: string) => {
  await llmCall({ input: question, output: "I will look that up.", modelId: "gpt-4o-mini", costUsd: 0.001 });
  await toolCall({ toolName: "search", input: { query: question }, output: "Done", latencyMs: 120 });
  return "Done";
}, { environment: "development", release: "quickstart" });

await run("What is agent observability?");
```

### Python

```bash
pip install uncoil-sdk
export UNCOIL_API_KEY=uncoil_sk_live_...
```

```powershell
# Windows PowerShell
$env:UNCOIL_API_KEY="uncoil_sk_live_..."
```

```python
import asyncio
from uncoil import trace_agent, llm_call, tool_call

@trace_agent(environment="development", release="quickstart")
async def run_agent(question: str):
    llm_call(input_data=question, output_data="I will look that up.", model_id="gpt-4o-mini", cost_usd=0.001, latency_ms=450)
    tool_call(tool_name="search", input_data={"query": question}, output_data="Done", latency_ms=120)
    return "Done"

asyncio.run(run_agent("What is agent observability?"))
```

### OpenTelemetry

Any OTLP HTTP exporter can send traces with the standard variables:

```bash
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://eu.cloud.uncoil.dev/api/otel
export OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer%20uncoil_sk_live_...
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
```

Run it once. Your first trace shows up in the dashboard in seconds. Full guide: [docs/quickstart](https://www.uncoil.dev/docs/quickstart).

### Claude Code plugin

Let Claude Code set up and debug tracing for you:

```text
/plugin marketplace add Uncoil-dev/skill
/plugin install uncoil@uncoil
```

See [Uncoil plugin for Claude Code](https://www.uncoil.dev/docs/claude-plugin).

## Works with your framework

Already using a framework or provider? One line of setup is usually enough. Each guide has the full copy-paste code.

| Framework | Setup | Guide |
| --- | --- | --- |
| OpenAI, Anthropic (Python) | `uncoil.init()` | [OpenAI](https://www.uncoil.dev/integrations/openai) · [Anthropic](https://www.uncoil.dev/integrations/anthropic) |
| OpenAI, Anthropic (TypeScript) | `init()` | [OpenAI](https://www.uncoil.dev/integrations/openai) · [Anthropic](https://www.uncoil.dev/integrations/anthropic) |
| LangChain, LangGraph | `uncoil.init()` (Python) or `callbacks: [new UncoilLangGraphHandler()]` (TypeScript) | [LangChain](https://www.uncoil.dev/integrations/langchain) · [LangGraph](https://www.uncoil.dev/integrations/langgraph) |
| Vercel AI SDK | `wrapLanguageModel({ model, middleware: uncoilMiddleware() })` | [Vercel AI SDK](https://www.uncoil.dev/integrations/vercel-ai-sdk) |
| OpenAI Agents SDK, CrewAI, Pydantic AI | `uncoil.init()` plus `@uncoil.trace_agent` | [OpenAI Agents](https://www.uncoil.dev/integrations/openai-agents-sdk) · [CrewAI](https://www.uncoil.dev/integrations/crewai) · [Pydantic AI](https://www.uncoil.dev/integrations/pydantic-ai) |
| Mastra | `traceAgent()` | [Mastra](https://www.uncoil.dev/integrations/mastra) |
| Anything with OpenTelemetry | OTLP over HTTP (JSON) | [OpenTelemetry](https://www.uncoil.dev/integrations/opentelemetry) |

All guides: [uncoil.dev/integrations](https://www.uncoil.dev/integrations). Runnable starters: [TypeScript](packages/ts-sdk/templates) and [Python](packages/python-sdk/templates).

## How it works

```text
SDK / OpenTelemetry → /api/ingest → background queue
                    → ClickHouse   raw spans and analytics
                    → Convex       projects, run summaries, alerts, evals
                    → dashboard
```

## This repository

| Folder | What it holds |
| --- | --- |
| `src/` | Website, dashboard, and API (Next.js) |
| `convex/` | App backend and database |
| `packages/ts-sdk/` | TypeScript SDK, `@uncoil.dev/sdk` on npm |
| `packages/python-sdk/` | Python SDK, `uncoil-sdk` on PyPI |
| `packages/playwright/` | Playwright test helper |
| `content/blog/` | Blog posts, its own repo: [Uncoil-dev/blog](https://github.com/Uncoil-dev/blog) |
| `content/docs/` | Docs, its own repo: [Uncoil-dev/docs](https://github.com/Uncoil-dev/docs) |
| `docs/` | Internal runbooks and specs |

## Run it locally

```bash
git clone --recurse-submodules https://github.com/Uncoil-dev/Uncoil
cd Uncoil
npm ci
npm run dev            # site on http://localhost:3000
npx convex dev         # backend, in a second terminal
```

Before a pull request:

```bash
npm run lint && npm run test:content && npm run build
```

Read [docs/releasing.md](docs/releasing.md) before you publish or deploy.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), including the rules for AI-assisted pull requests.

## Security

API keys are hashed on the server and shown once. Secrets are removed before traces are processed. Do not put secrets or personal data in trace metadata. See the [security page](https://www.uncoil.dev/security). To report a problem, use the [contact page](https://www.uncoil.dev/contact).

## License

[MIT](LICENSE)
