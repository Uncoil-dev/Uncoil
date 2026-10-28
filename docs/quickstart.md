# uncoil Quickstart Guide

Get your first agent trace live in less than 5 minutes.

## 1. Create a Project
Head to [uncoil.dev/dashboard](https://uncoil.dev/dashboard) and create your first project. Copy your **API Key** from the onboarding flow or the API Keys settings page.

## 2. Set Your Environment Variable
Ensure your agent can authenticate with our pipeline by setting the following environment variable:

```bash
export UNCOIL_API_KEY=uncoil_sk_live_...
```

## 3. Choose Your SDK

### Python
Install the package:
```bash
pip install uncoil-sdk
```

Instrument your agent:
```python
from uncoil import trace_agent, llm_call

@trace_agent()
async def my_agent():
    # Capture an LLM call
    llm_call(
        input_data="What is uncoil?",
        output_data="The best observability for agents.",
        model_id="gpt-4",
        cost_usd=0.001
    )
    return "Done"
```

### TypeScript / Node.js
Install the package:
```bash
npm install uncoil-sdk
```

Instrument your agent:
```typescript
import { traceAgent, llmCall } from 'uncoil-sdk';

const agent = traceAgent(async () => {
  await llmCall({
    input: "What is uncoil?",
    output: "The best observability for agents.",
    modelId: "gpt-4",
    costUsd: 0.001
  });
  return "Done";
});
```

## 4. View Your Traces
Run your agent once, then return to your [Uncoil Runs Dashboard](https://uncoil.dev/dashboard/runs). You should see your first run appear with its status, cost, and the full trace of spans you recorded.

## Add evaluation signals

Create an Evaluation Engine evaluator from your project dashboard, then attach user feedback or typed scores from your agent. The helpers use the same API key as span ingestion and are safe to call in production because failures are ignored by the SDK.

```ts
client.feedback(runId, true, { kind: "thumb", comment: "Resolved the request" });
client.score(runId, "answer_quality", 0.92, { dataType: "numeric" });
```

```python
client.feedback(run_id, True, kind="thumb", comment="Resolved the request")
client.score(run_id, "answer_quality", 0.92, data_type="numeric")
```

In the dashboard, use Evaluation Engine to configure deterministic rules, LLM judges, groundedness and policy templates, offline regression suites, reviewer queues, and score monitors. Evaluator failures are isolated from ingestion and can automatically create a human-review item.

For self-hosted or production setup, set `EVALUATION_INTERNAL_SECRET` in both Next.js and Convex, authenticate the Tinybird CLI, then run `npm run deploy:tinybird:evaluation` to deploy the evaluation score datasource before enabling score monitors.

## 5. Next Steps
- **Set Thresholds:** Go to Settings to configure cost and duration alerts.
- **Invite Your Team:** Connect your Clerk organization to share project access.
- **Deep Tracing:** Use `tool_call` and `decision` spans to capture the full reasoning chain.
