# Uncoil Python SDK

Observability and tracing for AI agents. Gain full visibility into your agent's decision-making process, tool usage, and LLM costs.

Uncoil records each agent run as one trace: every model call, tool call, retry, failure and cost. It also ingests OpenTelemetry. Free plan available. Docs: [uncoil.dev/docs](https://www.uncoil.dev/docs). New to agent observability? Read the [complete guide](https://www.uncoil.dev/blog/ai-agent-observability-complete-guide).

## Installation

```bash
pip install uncoil-sdk
```

## Quickstart

1. Create an API key on the [API keys page](https://www.uncoil.dev/dashboard/api-keys) of the dashboard. New to Uncoil? [Sign up](https://www.uncoil.dev/sign-up) first.
2. Set it as an environment variable (or add `UNCOIL_API_KEY=...` to `.env.local` or `.env` in the working folder; the client reads those when the variable is unset, and real environment values always win):

```bash
export UNCOIL_API_KEY=uncoil_sk_live_...
```

On Windows PowerShell:

```powershell
$env:UNCOIL_API_KEY="uncoil_sk_live_..."
```

The SDK sends to the region your key belongs to, so a US key needs no extra setting. Set `region` (or `UNCOIL_REGION`) only to pin a region; a key from the other region then fails with `region_mismatch`.

3. Instrument your agent:

```python
from uncoil import trace_agent, llm_call, tool_call

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

4. Run `python -m uncoil doctor` to [check your setup](#setup-checker).

## Steps

Inside a `@trace_agent` function, every step you record is linked to the step it ran in, so the trace graph
shows which step called which and how loops repeat. Use `span` for a block and `observe` for a function:

```python
import uncoil

@uncoil.observe(type="tool")
def search_docs(query):
    return search(query)

@uncoil.trace_agent()
def answer(question):
    for turn in range(5):
        with uncoil.span("think", type="agent"):
            with uncoil.span("chat", type="llm", input=question) as step:
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
- **Automatic release:** When `release` is not set, the client uses `UNCOIL_RELEASE`, then the commit variable of the deploy platform (Vercel, Railway, Render, Netlify, Cloudflare Pages, GitHub Actions, GitLab CI), then the short commit of the local git checkout. The local lookup runs once, times out quickly and is skipped when git is missing.

## Feedback and evaluation scores

Feedback and typed scores need the project id. The client reads `UNCOIL_PROJECT_ID` (which `npx @uncoil.dev/sdk login` writes to `.env.local`), or you can pass `project_id` when constructing the client:

```python
client = UncoilClient(project_id="your-project-id")
run_agent("Where is my order?")   # a function decorated with @uncoil.trace_agent
run_id = uncoil.last_run_id()     # the run that call just recorded
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

Install the optional provider/framework extras you use: `pip install 'uncoil-sdk[openai,anthropic,langgraph]'`.
Set `UNCOIL_API_KEY` and the existing regional configuration.

```python
import uncoil
from openai import OpenAI, AsyncOpenAI
from anthropic import Anthropic

openai = uncoil.wrap_openai(OpenAI())
anthropic = uncoil.wrap_anthropic(Anthropic())
async_openai = uncoil.wrap_openai(AsyncOpenAI())
# Existing create calls keep their provider response types and exceptions.
reply = openai.responses.create(model=MODEL, input="Hello")
with anthropic.messages.stream(model=MODEL, max_tokens=100,
        messages=[{"role": "user", "content": "Hello"}]) as stream:
    for text in stream.text_stream:
        print(text, end="")

# Add a callback to a compiled LangGraph invocation.
graph.invoke(inputs, config={"callbacks": [uncoil.langgraph_callback()]})
```

Wrap sync or async clients once. Supported: OpenAI chat completions and Responses `create` APIs,
including streams; OpenAI `embeddings.create` as a retrieval step (token usage and the number of vectors, not the vectors); Anthropic messages `create`/`stream` and beta equivalents, including sync/async
context managers, text streams and final messages. Close streams when stopping early. Raw response
resources and unsupported convenience methods are passed through without instrumentation. A model call that stopped at its token limit (OpenAI `finish_reason="length"`, Anthropic `stop_reason="max_tokens"`) gets the tag `truncated`.

Calls inside `trace_agent`/`span` inherit their run/parent and custom client. Standalone calls receive
an independent completed root. LangGraph callbacks preserve graph/node/tool/retriever/model parent IDs and
concurrent runs, and record retriever calls as retrieval steps with the query and returned documents. A LangGraph `interrupt()` ends the run as paused (`metadata.interrupted`), not failed. Avoid using both framework model callbacks and a provider wrapper for the same call.
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

Quickest start: call `uncoil.init()` once at startup. Every OpenAI, Anthropic and LangChain / LangGraph call is traced, sync and async, with no client wrapping (`UNCOIL_API_KEY` is read from the environment). Libraries that are not installed are skipped, and `uncoil.uninit()` switches it off.

```python
import uncoil
uncoil.init()
```

Calls made through a client you also wrapped with `wrap_openai` are recorded once, and model calls inside LangChain are recorded by the LangChain handler only. The Vercel AI SDK is JavaScript-only.

```python
import uncoil

tools = uncoil.trace_tools({"search_docs": search_docs, "send_email": send_email})  # plain or async functions
client = uncoil.wrap_openai(OpenAI())   # also wrap_anthropic, langgraph_callback
```

Copy-paste starters live in [`templates/`](./templates).

## Sampling, redaction and clearer errors

```python
client = uncoil.UncoilClient(
    sample_rate=0.1,                                   # record about 1 in 10 runs; each run is kept or dropped whole
    redact={"patterns": [re.compile(r"ACME-\d{6}")]},  # emails, phones and card numbers are masked by default; add your own
    on_error=lambda error: log(str(error)),            # problems come with a plain-language fix (error.hint)
)
```

If no API key is set, the client prints one warning and records nothing; decorated functions still run and return as usual.

Spans that report an error are kept even when their run was not sampled (`keep_errors=False` turns that off). Secrets such as bearer tokens and API keys are always removed, and emails, phone numbers and card numbers are masked before anything leaves your app. To send them as they are, pass `redact={"pii": False}`.

## Keep message content out

Set `UNCOIL_CAPTURE_CONTENT=false` (also `0`, `no` or `off`, any case) to record runs without any message text. Names, timings, token counts, cost, status and the error type are still sent; prompts, answers, tool inputs and outputs, error messages and feedback or score comments, stack traces and text score values are not. Metadata you attach yourself is still sent. Any other value, or no value, captures as before.

```python
client = uncoil.UncoilClient(capture_content=False)  # overrides the environment variable
```

The variable is read when the client is created. Spans sent this way carry `contentRecorded: false` in their metadata. The run page labels their input and output "Content not recorded".

## Sending spans in the background

Spans are queued and sent from a background thread, so tracing never waits on the network. Spans still queued when the program exits get up to two seconds to send. In short scripts, serverless handlers or workers that are frozen between requests, call `flush()` before returning:

```python
uncoil.flush(timeout=5)  # waits for every client; client.flush() waits for one. Returns False if spans were still waiting.
```

Up to 1,000 spans can wait at once; past that, new spans are dropped and reported once through `on_error` (code `queue_full`).

When a project reaches its monthly or daily plan limit, `on_error` gets a `plan_limit_reached` or `daily_limit_reached` error that says when data is saved again and links to the plans page. A lower `sample_rate` does not lift a plan limit.

When a run wrapped in `trace_agent` fails, the SDK prints one line to stderr with the step that failed and a link to the run, for example `Uncoil: run failed at step "search_docs" -> https://eu.cloud.uncoil.dev/dashboard/<project>/tracing/<run>`. The link needs the project id (`project_id=` or `UNCOIL_PROJECT_ID`); without it the line shows the run id instead. Passing runs print nothing. The line is off when `environment` or `UNCOIL_ENVIRONMENT` is `"production"`; pass `failure_links=False` (or `True`) to choose yourself.

## Setup checker

Not seeing traces? One command checks your key, region and network, then sends a test trace:

```bash
uncoil doctor            # or: uncoil-doctor, or python -m uncoil doctor
```

It reads `UNCOIL_API_KEY` (and `UNCOIL_REGION` / `UNCOIL_HOST` if set), tells you in plain words what is wrong and how to fix it, and exits with code 1 if anything fails. If the key is missing from the environment, the check reads it from `.env.local` or `.env` in the current folder, the same as the client. It never prints the key. Options: `--key`, `--region eu|us`, `--host`, `--no-send` (skip the test trace) and `--json`. The test trace is named "Uncoil setup check" and tagged `uncoil-doctor`; it counts as one trace on your plan. It also tells you which project traces will land in (`Traces will land in: <name>`).
