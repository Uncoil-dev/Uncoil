# Quick-start templates

Copy one file into your project, install what it needs, set your key, and run it.

| File | What it shows | Install | Run |
| --- | --- | --- | --- |
| `openai_agent.py` | An OpenAI chat call with one tool, traced end to end | `pip install 'uncoil-sdk[openai]'` | `python openai_agent.py` |
| `anthropic_agent.py` | The same with Anthropic | `pip install 'uncoil-sdk[anthropic]'` | `python anthropic_agent.py` |
| `langgraph_agent.py` | A small LangGraph graph | `pip install 'uncoil-sdk[langgraph]'` | `python langgraph_agent.py` |
| `openai_agents_sdk.py` | An OpenAI Agents SDK agent with one function tool | `pip install uncoil-sdk openai-agents` | `python openai_agents_sdk.py` |
| `private_by_default.py` | Sampling and redaction turned on | `pip install uncoil-sdk` | `python private_by_default.py` |

## 1. Set your key

Create a key on the API keys page of your dashboard, then set it in the shell you run the template from:

```bash
# macOS and Linux
export UNCOIL_API_KEY=uncoil_sk_live_...

# Windows PowerShell
$env:UNCOIL_API_KEY = "uncoil_sk_live_..."
```

The OpenAI and Anthropic templates also call the provider, so set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` the same way.

## 2. Check your setup

```bash
uncoil-doctor            # or: python -m uncoil doctor
```

The checker tests your key, region and network, then sends one test trace named "Uncoil setup check". Add `--no-send` to skip the test trace. If something is wrong, it prints what to fix.

## 3. Run a template and find the trace

Run the template with the command from the table. Open the Tracing page of your project in the dashboard to see the run. The OpenAI and Anthropic templates show up as `weather-agent`, with the tool call and the model call as steps inside it.

`private_by_default.py` only sets up a client with sampling and redaction. It sends nothing by itself, so add your own traced code under it before you look for a trace.
