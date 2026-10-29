# Uncoil

Uncoil is an observability and failure-prevention platform for AI agents. It captures agent runs, LLM generations, tool calls, costs, evaluations, and failures so teams can understand what happened, fix it, verify the fix, and prevent the same failure from returning.

## The product loop

```text
capture → diagnose → assign → fix → verify → prevent recurrence
```

## Quickstart

### TypeScript / Node.js

```bash
npm install uncoil-sdk
export UNCOIL_API_KEY=uncoil_sk_live_...
```

```typescript
import { traceAgent, llmCall, toolCall } from "uncoil-sdk";

const run = traceAgent(async (question: string) => {
  await llmCall({ input: question, output: "I will look that up.", modelId: "gpt-4o-mini", costUsd: 0.001 });
  await toolCall({ toolName: "search", input: { query: question }, output: "Search completed", latencyMs: 120 });
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
    tool_call(tool_name="search", input_data={"query": question}, output_data="Search completed", latency_ms=120)
    return "Done"
```

Run the example once, then open the [Uncoil dashboard](https://uncoil.dev/dashboard). The canonical guide is [docs/quickstart.md](docs/quickstart.md).

## What is included

- Agent tracing for nested runs, LLM calls, tools, custom spans, retries, and errors.
- Failure investigation through trace details, alerts, comments, and review workflows.
- Evaluation with datasets, evaluators, experiments, typed scores, feedback, and monitors.
- Prompt versioning, deployment labels, trace links, and playground workflows.
- Cost and runtime policies with fail-open SDK behavior.
- Region-aware endpoints and public health/status surfaces.

## Repository map

| Surface | Location | Status |
| --- | --- | --- |
| Web app and API | `src/`, `convex/` | Active |
| TypeScript SDK | `packages/ts-sdk/` | Active; package `uncoil-sdk` |
| Python SDK | `packages/python-sdk/` | Active; package `uncoil-sdk` |
| Playwright package | `packages/playwright/` | Active |
| Documentation | `content/docs/`, `docs/` | Active |
| Tinybird analytics | `tinybird/` | Active |
| Regional configuration | `config/`, `docs/regional-cloud-runbook.md` | Active |
| CLI / MCP / curated examples | Planned after contracts stabilize |

## Architecture

```text
SDK / OTLP → Next.js ingest → asynchronous processing
           → Tinybird raw spans and analytics
           → Convex metadata, run summaries, workflow state, evaluations
           → dashboard and future CLI / CI / MCP consumers
```

Tinybird is the analytical store for high-volume telemetry. Convex is the application store for project-owned metadata and workflow state. SDK telemetry fails open so an observability outage does not interrupt a customer agent.

## Hosted and regional status

The hosted application is the supported path. Regional availability and data-flow claims are documented on the public [status](https://uncoil.dev/status), [security](https://uncoil.dev/security), and [data regions](content/docs/data-regions.mdoc) surfaces. The EU deployment currently discloses that asynchronous event processing transits the United States; it must not be described as end-to-end EU-resident until that boundary is removed or the product contract changes.

## Verification

```bash
npm ci --legacy-peer-deps
npm run typecheck
npm run lint
npm run test:content
npm run test:activation
npm run test:sdk:ts
npm run test:sdk:python
npm run build
```

See [docs/releasing.md](docs/releasing.md) before publishing or deploying.

## Security

API keys are hashed server-side and shown only once. Redaction is applied before asynchronous telemetry processing. Do not send secrets or unnecessary personal data in trace metadata.

## License

The application and SDKs are MIT licensed unless a subdirectory states otherwise.
