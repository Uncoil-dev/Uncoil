import type { Answer } from "../types";

export const addTracingToAgent: Answer = {
  slug: "add-tracing-to-openai-or-langgraph-agent",
  question: "How do I add tracing to an OpenAI or LangGraph agent?",
  title: "Adding tracing to an OpenAI or LangGraph agent",
  answer:
    "Install the Uncoil SDK, set UNCOIL_API_KEY, and wrap your OpenAI client once, or pass the LangGraph handler in the graph's config. Your existing calls keep working and each one is recorded in a trace.",
  steps: [
    { heading: "Install the SDK", body: "Use npm install @uncoil.dev/sdk for TypeScript or pip install uncoil-sdk for Python, plus the provider packages you already use." },
    { heading: "Set your API key", body: "Export UNCOIL_API_KEY in the environment where the agent runs." },
    { heading: "Wrap the client or add the handler", body: "Use the snippets below. Use either the wrapper or the LangGraph handler for a model call, not both." },
    { heading: "Run the agent once", body: "Open the project in the dashboard and check that the run appears as a trace." },
  ],
  code: [
    {
      label: "TypeScript",
      text: `import OpenAI from "openai";
import { wrapOpenAI, UncoilLangGraphHandler } from "@uncoil.dev/sdk";

const openai = wrapOpenAI(new OpenAI());
await graph.invoke(input, { callbacks: [new UncoilLangGraphHandler()] });`,
    },
    {
      label: "Python",
      text: `import uncoil
from openai import OpenAI

openai = uncoil.wrap_openai(OpenAI())
graph.invoke(inputs, config={"callbacks": [uncoil.langgraph_callback()]})`,
    },
  ],
  points: [
    { heading: "What is recorded", body: "Model, input and output, latency, token usage and provider errors. LangGraph callbacks keep graph, node, tool and model parent links." },
    { heading: "Cost is not guessed", body: "Cost stays zero until you pass your own rate card with calculateCost." },
  ],
  link: { href: "/docs/provider-integrations", label: "Read the integration docs" },
  related: [
    { href: "/integrations/openai", label: "OpenAI integration" },
    { href: "/integrations/langgraph", label: "LangGraph integration" },
    { href: "/docs/quickstart", label: "Quickstart" },
  ],
};
