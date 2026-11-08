# Uncoil

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

Get a key in the [dashboard](https://eu.cloud.uncoil.dev/dashboard), then:

### TypeScript

```bash
npm install @uncoil.dev/sdk
export UNCOIL_API_KEY=uncoil_sk_live_...
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

```python
from uncoil import trace_agent, llm_call, tool_call

@trace_agent(environment="development", release="quickstart")
async def run_agent(question: str):
    llm_call(input_data=question, output_data="I will look that up.", model_id="gpt-4o-mini", cost_usd=0.001)
    tool_call(tool_name="search", input_data={"query": question}, output_data="Done", latency_ms=120)
    return "Done"
```

Run it once. Your first trace shows up in the dashboard in seconds. Full guide: [docs/quickstart](https://www.uncoil.dev/docs/quickstart).

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

## Security

API keys are hashed on the server and shown once. Secrets are removed before traces are processed. Do not put secrets or personal data in trace metadata. See the [security page](https://www.uncoil.dev/security). To report a problem, use the [contact page](https://www.uncoil.dev/contact).

## License

[MIT](LICENSE)
