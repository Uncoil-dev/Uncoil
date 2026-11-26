// Every link from the desktop navbar, under the same five groups and with the same one-line
// descriptions. `app` marks routes served by the app host, which go through appHref().

export type Entry = { title: string; desc: string; href: string; app?: boolean; also?: readonly string[] };
export type Group = { name: string; entries: readonly Entry[] };

export const GROUPS: readonly Group[] = [
  {
    name: "Product",
    entries: [
      { title: "Observe", desc: "Traces, sessions and costs", href: "/product/trace-viewer", also: ["trace", "cost"] },
      { title: "Improve", desc: "Evaluations, datasets, prompts", href: "/product/evaluation-engine", also: ["eval"] },
      { title: "Release", desc: "Experiments, gates, monitors", href: "/product/lifecycle" },
      { title: "Operate", desc: "Alerts, reports, integrations", href: "/integrations" },
      { title: "Free tools", desc: "Token counter, price and log checkers", href: "/tools", also: ["token"] },
      { title: "Live demo", desc: "Explore a sample project", href: "/demo/project", app: true },
    ],
  },
  {
    name: "Solutions",
    entries: [
      { title: "Support", desc: "Find the decision behind every escalation", href: "/use-cases/support" },
      { title: "Research", desc: "Verify multi-step investigations", href: "/use-cases/research" },
      { title: "Automation", desc: "Debug workflows and retry chains", href: "/use-cases/automation" },
      { title: "Tool calling", desc: "Catch failed APIs and loops", href: "/use-cases/tool-calling" },
      { title: "Compare", desc: "Uncoil next to other tools", href: "/compare", also: ["vs"] },
      { title: "Alternatives", desc: "The best LLM observability tools", href: "/best-llm-observability-tools" },
    ],
  },
  {
    name: "Developers",
    entries: [
      { title: "Docs", desc: "Install and send your first trace", href: "/docs", also: ["quickstart", "install"] },
      { title: "TypeScript SDK", desc: "Trace Node and Next.js agents", href: "/docs/typescript", also: ["ts", "js", "node", "npm"] },
      { title: "Python SDK", desc: "Instrument with a decorator", href: "/docs/python", also: ["pip"] },
      { title: "API reference", desc: "Ingest from custom runtimes", href: "/docs/api", also: ["http"] },
      { title: "Integrations", desc: "LlamaIndex, AutoGen, Mastra and more", href: "/integrations" },
      { title: "Glossary", desc: "Agent tracing terms, explained", href: "/glossary" },
    ],
  },
  {
    name: "Company",
    entries: [
      { title: "Blog", desc: "Agent engineering notes", href: "/blog" },
      { title: "Changelog", desc: "What shipped lately", href: "/changelog", also: ["news"] },
      { title: "Roadmap", desc: "What is shipping next", href: "/roadmap" },
      { title: "Security", desc: "How Uncoil handles data", href: "/security", also: ["privacy"] },
      { title: "Status", desc: "Is everything running?", href: "/status", also: ["uptime"] },
      { title: "Contact", desc: "Talk through your stack", href: "/contact", also: ["email", "help"] },
    ],
  },
];

export const PRICING: Entry = { title: "Pricing", desc: "Free, Pro, Team and Enterprise", href: "/pricing", also: ["plans", "price"] };
export const SIGN_IN: Entry = { title: "Sign in", desc: "Open your projects", href: "/cloud?next=/sign-in", also: ["login", "log in", "account"] };
export const START: Entry = { title: "Start free", desc: "Create an account", href: "/sign-up", app: true, also: ["sign up", "register"] };

export type Hit = Entry & { group: string };

/** Everything the prompt can find, in menu order. */
export const ALL: readonly Hit[] = [
  ...GROUPS.flatMap((g) => g.entries.map((e) => ({ ...e, group: g.name }))),
  { ...PRICING, group: "Pricing" },
  { ...SIGN_IN, group: "Account" },
  { ...START, group: "Account" },
];

// The prompt text from the homepage setup section, for Claude Code.
const STEPS = [
  "Install the Uncoil SDK: `@uncoil.dev/sdk` for a JavaScript or TypeScript project, `uncoil-sdk` for a Python project.",
  "Run `npx @uncoil.dev/sdk login` so I can sign in or sign up in the browser and pick this project.",
  "Add the one-line init() call at the start of the app.",
  "Run `npx @uncoil.dev/sdk doctor` (JavaScript or TypeScript) or `python -m uncoil doctor` (Python), then send one test trace and tell me where to see it.",
];

export const SETUP_PROMPT = `Set up Uncoil tracing in this project (Claude Code).\n\n${STEPS.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDo not invent an API key. Never print or commit the key.`;
