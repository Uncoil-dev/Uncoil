/** Every free tool, in one list that feeds the tools index, footer, sitemap, llms.txt and related links. */

export type ToolEntry = {
  slug: string;
  /** Short name used in lists and breadcrumbs. */
  name: string;
  /** Search-friendly page title. */
  title: string;
  description: string;
  /** One line for cards. */
  blurb: string;
  /** Tag shown on cards. */
  group: "Debug" | "Cost" | "Build" | "Live";
  /** What the "track it with Uncoil" prompt says on this page. */
  trackLine: string;
};

export const tools: readonly ToolEntry[] = [
  {
    slug: "agent-log-checker",
    name: "Agent log checker",
    title: "Free AI agent log and trace checker",
    description: "Paste an AI agent log or trace and see where it failed, which steps were slow and where tokens were wasted. Free, runs in your browser, nothing is uploaded.",
    blurb: "Paste a log or trace. See where it failed, what was slow and what wasted tokens.",
    group: "Debug",
    trackLine: "Pasting logs by hand works once. Uncoil finds failures, loops and wasted tokens on every run, as they happen.",
  },
  {
    slug: "token-counter",
    name: "Token counter",
    title: "Free token counter for GPT, Claude, Gemini and Llama",
    description: "Count tokens and see the price on every major model at once: GPT, Claude, Gemini, Llama, Mistral, DeepSeek and Grok. Real tokenizer for OpenAI, clearly labelled estimates for the rest.",
    blurb: "Paste text. See the token count and price on GPT, Claude, Gemini and Llama.",
    group: "Cost",
    trackLine: "This counts one prompt. Uncoil counts every call your agent makes and shows the real cost per run.",
  },
  {
    slug: "llm-price-comparison",
    name: "Model price comparison",
    title: "LLM API price comparison and monthly cost calculator",
    description: "Compare the price of every major LLM API in one table, then work out what your app would cost per month on each model. Prices checked 17 October 2026.",
    blurb: "Every model's price in one table, plus what your app costs per month on each.",
    group: "Cost",
    trackLine: "Prices tell you what a model costs on paper. Uncoil shows what your agent actually spends on each one.",
  },
  {
    slug: "prompt-cost-checker",
    name: "Prompt cost checker",
    title: "Free prompt cost checker: make prompts shorter and cheaper",
    description: "Paste a prompt and get a shorter version, the tokens you save and what each call costs on every model. Safe fixes only. Runs in your browser.",
    blurb: "Paste a prompt. Get a shorter, cheaper version and what it costs on each model.",
    group: "Cost",
    trackLine: "Shorter prompts only matter if you can see them add up. Uncoil shows cost per prompt, per step and per run.",
  },
  {
    slug: "context-window-checker",
    name: "Context window checker",
    title: "Context window checker: does my text fit in the model?",
    description: "Paste a document and see whether it fits the context window of GPT, Claude, Gemini, Llama and more, how much room is left and how many pieces you would need.",
    blurb: "Does my document fit in each model's memory?",
    group: "Build",
    trackLine: "Prompts grow quietly as agents run. Uncoil shows the size of every call so you see the overflow before users do.",
  },
  {
    slug: "tool-definition-checker",
    name: "Tool definition checker",
    title: "AI tool and function definition checker",
    description: "Paste your agent's tool or function definitions (OpenAI, Anthropic, MCP, Gemini) and find the mistakes that make agents call tools wrongly. Free, in your browser.",
    blurb: "Paste your tool setup. Find the mistakes that make agents fail.",
    group: "Build",
    trackLine: "A clean definition is half the job. Uncoil shows which tool calls actually fail in production, and why.",
  },
  {
    slug: "ai-api-status",
    name: "AI API status",
    title: "Is OpenAI, Anthropic or Gemini down? Live AI API status",
    description: "Live status of the OpenAI API, Anthropic Claude API, Google Gemini, Mistral, Groq, DeepSeek and more, read straight from each provider's own status page. Updated every minute.",
    blurb: "Is OpenAI or Anthropic down right now? One page for every AI provider.",
    group: "Live",
    trackLine: "Status pages are often late. Uncoil shows errors and slowdowns in your own agent traffic the moment they start.",
  },
  {
    slug: "json-fixer",
    name: "JSON fixer",
    title: "Free AI JSON fixer: repair broken LLM output",
    description: "Paste broken JSON from ChatGPT, Claude or any model and get valid JSON back. Fixes code fences, trailing commas, single quotes, cut-off output and more. Runs in your browser.",
    blurb: "Paste broken AI output. Get valid JSON back.",
    group: "Build",
    trackLine: "Fixing output by hand is a patch. Uncoil shows how often your agent returns broken JSON, and on which prompts.",
  },
  {
    slug: "rate-limit-calculator",
    name: "Rate limit calculator",
    title: "LLM API rate limit calculator: how many users can I handle?",
    description: "Enter your provider's request and token limits and see how many users your AI app can handle before you hit 429 errors. Includes retries and peak traffic. Free.",
    blurb: "How many users can my app handle before I hit my limits?",
    group: "Build",
    trackLine: "Limits are easy to calculate and easy to forget. Uncoil shows every 429 and retry in your real traffic.",
  },
  {
    slug: "ai-cost-estimator",
    name: "AI cost estimator",
    title: "Free AI agent cost estimator",
    description: "Estimate what an AI agent will cost per run, per finished task and per month. Free, no sign-up, nothing leaves your browser.",
    blurb: "What will my agent cost per run, per task and per month?",
    group: "Cost",
    trackLine: "This is a plan. Uncoil shows the real number, run by run.",
  },
];

export function getTool(slug: string): ToolEntry {
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

export const toolPath = (slug: string) => `/tools/${slug}`;
