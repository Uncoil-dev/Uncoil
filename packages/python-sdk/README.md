# Tracify Python SDK

Observability and tracing for AI agents. Gain full visibility into your agent's decision-making process, tool usage, and LLM costs.

Tracify records each agent run as one trace: every model call, tool call, retry, failure and cost. It also ingests OpenTelemetry. Free plan available. Docs: [tracify.tech/docs](https://www.tracify.tech/docs). New to agent observability? Read the [complete guide](https://www.tracify.tech/blog/ai-agent-observability-complete-guide).

## Installation

```bash
pip install tracify-sdk
```

## Quickstart

1. Get your API Key from the [Tracify Dashboard](https://www.tracify.tech).
2. Set it as an environment variable:

```bash
export TRACIFY_API_KEY=your_sk_live_...
```

3. Instrument your agent:

```python
from tracify import trace_agent, llm_call, tool_call

@trace_agent(environment="development", release="quickstart")
async def my_agent(query: str):
    # LLM Call
    llm_call(
        input_data=query,
        output_data="Thinking...",
        model_id="gpt-4o",
        cost_usd=0.002,
        latency_ms=800
    )
    
    # Tool Use
    tool_call(
        tool_name="web_search",
        input_data={"q": query},
        output_data="Found results...",
        latency_ms=1200
    )
    
    return "Final Answer"
```

## Steps

Inside a `@trace_agent` function, every step you record is linked to the step it ran in, so the trace graph
shows which step called which and how loops repeat. Use `span` for a block and `observe` for a function:

```python
import tracify

@tracify.observe(type="tool")
def search_docs(query):
    return search(query)

@tracify.trace_agent()
def answer(question):
    for turn in range(5):
        with tracify.span("think", type="agent"):
            with tracify.span("chat", type="llm", input=question) as step:
                reply = call_model(question)
                step.set_output(reply.text)
                step.set(model="claude-sonnet-5-5", input_tokens=reply.usage.input, output_tokens=reply.usage.output)
            if reply.done:
                return reply.text
            search_docs(reply.query)
```

`type` is one of `agent`, `llm`, `tool`, `retrieval` or `span`. Errors are recorded with their type and
message. Concurrent runs (threads or asyncio tasks) stay in separate traces. Inputs and outputs have obvious
secrets (bearer tokens, API keys, JWTs, `password=` values) removed and are capped at 10,000 characters;
avoid sending anything else you would not want stored.

## Features

- **@trace_agent Decorator:** Automatically captures run lifecycle and errors.
- **Granular Spans:** Manually record LLMs, tools, and custom decisions.
- **Cost Tracking:** Monitor your infrastructure spend in real-time.
- **Asynchronous & Synchronous Support:** Works with `async/await` or standard functions.
- **Session context:** Attach `session_id`, `end_user_id`, `environment`, `release`, and `tags` to connect related traces.

## Feedback and evaluation scores

Pass `project_id` when constructing the client to attach end-user feedback and typed scores to traces:

```python
client = TracifyClient(project_id="your-project-id")
client.feedback(run_id, True, kind="thumb", comment="Helpful answer")
client.score(run_id, "answer_quality", 0.92, data_type="numeric")
```

Feedback and scores use the same API key as ingestion and do not interrupt the agent when delivery fails.

## Prompt deployment

Resolve a deployed prompt without shipping a new application build:

```python
deployed = client.get_prompt("support-agent", "production")
client.ingest(spanType="llm", input=question, output=answer, promptVersionId=deployed["version"]["id"])
```

Prompt responses are cached for 60 seconds by default. Use `cache_ttl_seconds=0` or provide a `fallback` for development and guaranteed-availability behavior.

## License

MIT

## Provider integrations (0.4.0)

Install the optional provider/framework extras you use: `pip install 'tracify-sdk[openai,anthropic,langgraph]'`.
Set `TRACIFY_API_KEY` and the existing regional configuration.

```python
import tracify
from openai import OpenAI, AsyncOpenAI
from anthropic import Anthropic

openai = tracify.wrap_openai(OpenAI())
anthropic = tracify.wrap_anthropic(Anthropic())
async_openai = tracify.wrap_openai(AsyncOpenAI())
# Existing create calls keep their provider response types and exceptions.
reply = openai.responses.create(model=MODEL, input="Hello")
with anthropic.messages.stream(model=MODEL, max_tokens=100,
        messages=[{"role": "user", "content": "Hello"}]) as stream:
    for text in stream.text_stream:
        print(text, end="")

# Add a callback to a compiled LangGraph invocation.
graph.invoke(inputs, config={"callbacks": [tracify.langgraph_callback()]})
```

Wrap sync or async clients once. Supported: OpenAI chat completions and Responses `create` APIs,
including streams; Anthropic messages `create`/`stream` and beta equivalents, including sync/async
context managers, text streams and final messages. Close streams when stopping early. Raw response
resources and unsupported convenience methods are passed through without instrumentation.

Calls inside `trace_agent`/`span` inherit their run/parent and custom client. Standalone calls receive
an independent completed root. LangGraph callbacks preserve graph/node/tool/model parent IDs and
concurrent runs. Avoid using both framework model callbacks and a provider wrapper for the same call.
Provider packages remain optional; newer framework extras may require a newer Python than the core SDK.

Options: `client=custom_client`, `name="my-agent"`, `capture_input=False`, `capture_output=False`.
Existing redaction/size caps apply. Records include model, tokens, latency, TTFT, failures and raw usage
metadata. Costs default to zero with `costKnown=False`; supply
`calculate_cost=lambda usage: ...` with your own current provider rate card. The callback receives
`provider`, `model`, `input_tokens`, `output_tokens`, and raw `usage` (including cache details).
Missing usage is not estimated. Telemetry failures do not change provider results or exceptions.

Anthropic total input tokens include uncached input plus cache reads and cache writes; the original
usage breakdown remains in metadata for rate-card calculations. See the [provider’s token breakdown](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

## Framework one-liners

Quickest start: call `tracify.init()` once at startup. Every OpenAI, Anthropic and LangChain / LangGraph call is traced, sync and async, with no client wrapping (`TRACIFY_API_KEY` is read from the environment). Libraries that are not installed are skipped, and `tracify.uninit()` switches it off.

```python
import tracify
tracify.init()
```

Calls made through a client you also wrapped with `wrap_openai` are recorded once, and model calls inside LangChain are recorded by the LangChain handler only. The Vercel AI SDK is JavaScript-only.

```python
import tracify

tools = tracify.trace_tools({"search_docs": search_docs, "send_email": send_email})  # plain or async functions
client = tracify.wrap_openai(OpenAI())   # also wrap_anthropic, langgraph_callback
```

Copy-paste starters live in [`templates/`](./templates).

## Sampling, redaction and clearer errors

```python
client = tracify.TracifyClient(
    sample_rate=0.1,                                   # record about 1 in 10 runs; each run is kept or dropped whole
    redact={"pii": True, "patterns": [re.compile(r"ACME-\d{6}")]},  # emails, phones, card numbers + your own
    on_error=lambda error: log(str(error)),            # problems come with a plain-language fix (error.hint)
)
```

Spans that report an error are kept even when their run was not sampled (`keep_errors=False` turns that off). Secrets such as bearer tokens and API keys are always removed.
