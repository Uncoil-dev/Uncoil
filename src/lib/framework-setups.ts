/**
 * The four framework setup pages ("Uncoil for LangChain / CrewAI / OpenAI Agents / Vercel AI SDK").
 * Their steps live in seo-pages.ts and integration-guides.ts; this file holds what is shared between them.
 * Every snippet on these pages is run against the real SDKs by scripts/framework-guides/.
 */

export const frameworkSetups = [
  {
    slug: "langchain",
    name: "LangChain",
    language: "Python + TypeScript",
    line: "uncoil.init()",
    install: 'pip install uncoil-sdk "langchain-core"',
    // An example run, drawn as a waterfall. Names and widths are illustrative, not real measurements.
    sample: [
      { label: "RunnableSequence", kind: "agent", start: 0, width: 100 },
      { label: "ChatPromptTemplate", kind: "agent", start: 1, width: 6 },
      { label: "ChatModel", kind: "llm", start: 8, width: 62 },
      { label: "search_docs", kind: "tool", start: 70, width: 22 },
      { label: "StrOutputParser", kind: "agent", start: 93, width: 6 },
    ],
  },
  {
    slug: "crewai",
    name: "CrewAI",
    language: "Python",
    line: "uncoil.init()",
    install: "pip install uncoil-sdk crewai",
    sample: [
      { label: "research-crew", kind: "agent", start: 0, width: 100 },
      { label: "Researcher: model call", kind: "llm", start: 2, width: 30 },
      { label: "web_search", kind: "tool", start: 33, width: 18 },
      { label: "Writer: model call", kind: "llm", start: 52, width: 40 },
    ],
  },
  {
    slug: "openai-agents-sdk",
    name: "OpenAI Agents",
    language: "Python",
    line: "uncoil.init()",
    install: "pip install uncoil-sdk openai-agents",
    sample: [
      { label: "support-triage", kind: "agent", start: 0, width: 100 },
      { label: "Model call: pick tool", kind: "llm", start: 2, width: 28 },
      { label: "lookup_order", kind: "tool", start: 31, width: 14 },
      { label: "Model call: answer", kind: "llm", start: 46, width: 48 },
    ],
  },
  {
    slug: "vercel-ai-sdk",
    name: "Vercel AI SDK",
    language: "TypeScript",
    line: "uncoilMiddleware()",
    install: "npm install @uncoil.dev/sdk ai @ai-sdk/openai zod",
    sample: [
      { label: "order-bot", kind: "agent", start: 0, width: 100 },
      { label: "generateText: step 1", kind: "llm", start: 2, width: 30 },
      { label: "getOrder", kind: "tool", start: 33, width: 12 },
      { label: "generateText: step 2", kind: "llm", start: 46, width: 48 },
    ],
  },
] as const;

export type FrameworkSetup = (typeof frameworkSetups)[number];

export function frameworkSetup(slug: string): FrameworkSetup | undefined {
  return frameworkSetups.find((item) => item.slug === slug);
}
