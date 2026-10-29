export type AssistantCitation = { title: string; href: string };

export const ASSISTANT_KNOWLEDGE = [
  { title: "Uncoil documentation", href: "/docs", text: "Uncoil helps teams trace, evaluate, and improve AI agents with runs, spans, model calls, tool calls, cost, quality, and release evidence." },
  { title: "Quickstart", href: "/docs/quickstart", text: "Start by installing the TypeScript or Python SDK, configuring an Uncoil API key, wrapping an agent, and sending a first trace to the selected regional ingest endpoint." },
  { title: "Trace viewer", href: "/product/trace-viewer", text: "The trace viewer connects a run to nested spans, prompts, model calls, tool calls, latency, cost, retries, and failures." },
  { title: "Evaluation engine", href: "/product/evaluation-engine", text: "Evaluation supports datasets, evaluators, experiments, scores, and monitors for checking quality before and after release." },
  { title: "Pricing", href: "/pricing", text: "Uncoil has public Free, Pro, Team, and Enterprise pricing information." },
  { title: "Security", href: "/security", text: "Read the public security and data-handling overview, including regional cloud boundaries and ingestion behavior." },
  { title: "Contact Uncoil", href: "/contact", text: "Contact Uncoil when documentation does not answer a deployment or support question." },
] as const;

export function getAssistantContext(message: string) {
  const terms = message.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const ranked = ASSISTANT_KNOWLEDGE.map((entry) => ({ entry, score: terms.filter((term) => entry.text.toLowerCase().includes(term) || entry.title.toLowerCase().includes(term)).length }))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, 4).map(({ entry }) => entry);
}

export function redactAssistantText(value: string) {
  return value
    .replace(/uncoil_sk_[a-z0-9_]+/gi, "[redacted-api-key]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .slice(0, 4000);
}

export const ASSISTANT_SYSTEM_PROMPT = [
  "You are the friendly assistant on Uncoil's public website. Uncoil is an observability platform for AI agents.",
  "Talk like a helpful person: reply to greetings and small talk warmly in one short sentence, then offer help with Uncoil.",
  "Answer product questions only from the supplied public context. Be concise (2 to 4 sentences), honest and practical.",
  "If the question has nothing to do with Uncoil or AI agents (cooking, health, homework and so on), say politely in your own words that you can only help with Uncoil, and suggest one or two things you can help with. Vary your wording; never repeat a stock sentence.",
  "Never claim to access an account, trace, API key or deployment. If the context is not enough, say so and point to the docs or contact page.",
  "Do not output markdown links; citations are added separately.",
].join(" ");

const GREETING = /^(yo|hi|hey|hello|hiya|sup|howdy|hej|good (morning|afternoon|evening))\b[\s!.?]*$/i;
const PRODUCT_WORDS = /\b(uncoil|trace|traces|span|agent|agents|llm|model|eval|evaluat\w*|sdk|api|key|docs?|pricing|price|plan|cost|region|alert|dashboard|prompt|playground|demo|install|setup|quickstart|security|privacy|support|contact)\b/i;

export function fallbackAssistantAnswer(message: string): { answer: string; citations: AssistantCitation[]; offTopic?: boolean } {
  const lower = message.toLowerCase();
  if (GREETING.test(message.trim())) return { answer: "Hey! I can help with Uncoil: how traces work, SDK setup, pricing, or the playground. What are you trying to do?", citations: [{ title: "Explore the product", href: "/demo" }] };
  if (!PRODUCT_WORDS.test(message)) return { answer: "That one is outside what I can help with, since I only know Uncoil. Ask me about tracing an AI agent, setting up the SDK, pricing or the playground and I'll gladly help.", citations: [], offTopic: true };
  if (lower.includes("playground") || lower.includes("demo")) return { answer: "Use Explore to open a private simulated workspace with populated runs, costs, alerts, and trace examples. It does not create a real project or require a region.", citations: [{ title: "Open the playground", href: "/sign-in?redirect=/playground" }, { title: "Documentation", href: "/docs" }] };
  if (lower.includes("price") || lower.includes("cost")) return { answer: "You can compare the current plans and included usage on the pricing page. The playground is simulated and does not consume project telemetry.", citations: [{ title: "View pricing", href: "/pricing" }] };
  if (lower.includes("install") || lower.includes("sdk") || lower.includes("api key")) return { answer: "Start with the quickstart: install the SDK, configure the regional API key, wrap your agent, and send one trace. If you already have an account, choose Build and select its region first.", citations: [{ title: "Open the quickstart", href: "/docs/quickstart" }, { title: "Choose a cloud region", href: "/cloud?next=/onboarding" }] };
  return { answer: "I can explain Uncoil, point you to the right documentation, or help you choose between the simulated playground and a real regional project. Try asking about traces, evaluations, costs, SDK setup, pricing, or regions.", citations: [{ title: "Browse the docs", href: "/docs" }, { title: "Explore the product", href: "/demo" }, { title: "Contact Uncoil", href: "/contact" }] };
}
