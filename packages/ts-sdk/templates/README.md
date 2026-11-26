# Quick-start templates

Copy one file into your project, install its packages, set your keys, and run it.

| File | What it shows | Install | Keys |
| --- | --- | --- | --- |
| `openai-agent.ts` | An OpenAI chat call with one tool, traced end to end | `npm install @uncoil.dev/sdk openai` | `UNCOIL_API_KEY`, `OPENAI_API_KEY` |
| `anthropic-agent.ts` | The same with Anthropic | `npm install @uncoil.dev/sdk @anthropic-ai/sdk` | `UNCOIL_API_KEY`, `ANTHROPIC_API_KEY` |
| `vercel-ai.ts` | The Vercel AI SDK with one line of setup | `npm install @uncoil.dev/sdk ai @ai-sdk/openai` | `UNCOIL_API_KEY`, `OPENAI_API_KEY` |
| `langgraph-agent.ts` | A small LangGraph graph | `npm install @uncoil.dev/sdk @langchain/langgraph @langchain/core` | `UNCOIL_API_KEY` |
| `private-by-default.ts` | Sampling and redaction turned on | `npm install @uncoil.dev/sdk` | `UNCOIL_API_KEY` |

## 1. Set your Uncoil key

The easiest way is to sign in from the folder you will run the template in:

```bash
npx @uncoil.dev/sdk login
```

It opens your browser, you pick a project, and the key is saved to `.env.local`. You can also create a key on the API keys page of your dashboard and set it yourself:

```bash
export UNCOIL_API_KEY=uncoil_sk_live_...
```

On Windows PowerShell, use `$env:UNCOIL_API_KEY="uncoil_sk_live_..."`. Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` the same way when the template calls a model.

## 2. Check the setup

```bash
npx @uncoil.dev/sdk doctor
```

It checks your key, region and network, then sends one test trace called "Uncoil setup check". It reads `.env.local` on its own.

## 3. Run the template

```bash
npx tsx openai-agent.ts
```

Swap in the file name you copied. If your key is in `.env.local`, pass it along with `npx tsx --env-file=.env.local openai-agent.ts`.

`private-by-default.ts` only exports a configured client. Import `uncoil` from it in your own code instead of running it on its own.

## 4. Find the trace

Open your project in the dashboard and go to Runs. The OpenAI and Anthropic templates show up as a run named `weather-agent`, with the tool call and the model call inside it. The Vercel AI and LangGraph templates show up on the same page as soon as the script finishes.
