"use client";

import { appHref } from "@/lib/app-links";
import { ArtBand, CapabilityGrid, EndCta, Faq, PageHero, SignalTicker, StickyStory, type CapsVariant, type HeroVariant, type StoryLook } from "./page-kit";
import { CodeSection, snippets } from "./code-section";
import { ControlStage, CostStage, EvalStage, FailureStage, ModelStage, ReportStage, ToolStage, TraceStage } from "./stages";

export type ProductPageData = {
  title: string;
  description: string;
  outcome: string;
  bestFor: string;
  details: readonly { title: string; body: string }[];
  workflow: readonly { title: string; body: string }[];
  faq: readonly { q: string; a: string }[];
  related: readonly string[];
};

const config = {
  "trace-viewer": {
    lead: "Open any run and see what the agent actually did: every model call, tool call and retry in order, with timing, tokens, cost and the payloads in between. Jump straight to the first thing that went wrong.",
    outcome: "Stop reading logs. Read the run.",
    hero: "/images/pages/trace-hero.png",
    band: "/images/landing/span-anatomy.png",
    eyebrow: "Product / Trace viewer",
    headline: "Every step of one run.",
    facts: [["Spans per run", "Hundreds"], ["Retries", "Visible"], ["Payloads", "Inline"]],
    ticker: ["agent.run", "llm.plan", "tool.search", "retry", "llm.answer", "fallback"],
    kicker: "Debug one run",
    story: "Watch the run play back.",
    Stage: TraceStage,
    statement: "From a wrong answer to the exact span.",
  },
  "cost-dashboard": {
    lead: "Spend broken down by day, run, model and tool, with retries and fallbacks counted separately. Find the call that doubled your bill, then open the exact run behind it.",
    outcome: "Turn a rising invoice into a short list of things to fix.",
    hero: "/images/pages/cost-hero.png",
    band: "/images/landing/cost-city.png",
    eyebrow: "Product / Cost dashboard",
    headline: "Know where the money went.",
    facts: [["Granularity", "Per step"], ["Retry cost", "Separated"], ["Models", "Ranked"]],
    ticker: ["by day", "by run", "by model", "by tool", "retries", "fallbacks"],
    kicker: "Explain the bill",
    story: "Follow a spike to its cause.",
    Stage: CostStage,
    statement: "One retry loop can triple a bill.",
  },
  "tool-calls": {
    lead: "See which tool the agent picked, the arguments it sent, what came back and how long it took. Tell a bad decision from a broken integration in one look.",
    outcome: "Know whether the agent or the API got it wrong.",
    hero: "/images/pages/tools-hero.png",
    band: "/images/landing/capture-streams.png",
    eyebrow: "Product / Tool calls",
    headline: "Every action, inspectable.",
    facts: [["Arguments", "Recorded"], ["Results", "Recorded"], ["Failures", "Flagged"]],
    ticker: ["search", "database", "browser", "api call", "internal function", "schema check"],
    kicker: "Tell the failures apart",
    story: "Was it the agent or the tool?",
    Stage: ToolStage,
    statement: "Bad reasoning or a broken integration?",
  },
  "llm-calls": {
    lead: "Every generation with its model, prompt, tokens, latency, time to first token and cost. Compare calls inside the real workflow instead of judging only the final answer.",
    outcome: "Find the call that changed quality, speed or cost.",
    hero: "/images/pages/models-hero.png",
    band: "/images/landing/globe-orbits.png",
    eyebrow: "Product / LLM calls",
    headline: "Model behavior you can measure.",
    facts: [["Tokens", "In and out"], ["Latency", "+ first token"], ["Cost", "Per call"]],
    ticker: ["model", "prompt", "tokens in", "tokens out", "latency", "first token", "cost"],
    kicker: "Compare generations",
    story: "Judge the call, not just the answer.",
    Stage: ModelStage,
    statement: "Which generation changed the result?",
  },
  failures: {
    lead: "Errors, retry storms, slow runs and fallbacks, tied to the trace behind them. Get the alert in Slack, open the run, and land on the step where it first went wrong.",
    outcome: "Go from an alert to a cause in minutes.",
    hero: "/images/pages/failures-hero.png",
    band: "/images/landing/failure-shatter.png",
    eyebrow: "Product / Failure analysis",
    headline: "Find the first crack.",
    facts: [["Alerts", "To Slack"], ["Retries", "Counted"], ["Cause", "Traced"]],
    ticker: ["error span", "retry storm", "latency breach", "fallback", "alert", "first crack"],
    kicker: "Alert to cause",
    story: "Failures start earlier than they show.",
    Stage: FailureStage,
    statement: "The error shows up late. The cause is earlier.",
  },
  "evaluation-engine": {
    lead: "Build datasets from real traces, run code checks or model judges, and score live traffic with the same evaluators. Know a change is better before it ships, and notice when it stops being true.",
    outcome: "Replace gut-feel spot checks with a record you can rerun.",
    hero: "/images/pages/evaluation-hero.png",
    band: "/images/landing/logs-wall.png",
    eyebrow: "Product / Evaluation engine",
    headline: "Quality you can repeat.",
    facts: [["Datasets", "Versioned"], ["Evaluators", "Typed"], ["Monitors", "Live"]],
    ticker: ["dataset", "evaluator", "offline run", "live score", "review queue", "threshold"],
    kicker: "Replace spot checks",
    story: "Test the behavior, then watch it live.",
    Stage: EvalStage,
    statement: "A change is only better if you can show it.",
  },
  "runtime-control": {
    lead: "Set per-run and daily cost ceilings, a latency budget, an ordered fallback chain and a retry policy. Watch what the policy would do in observe mode, then enforce it.",
    outcome: "Make limits and recovery a decision, not an accident.",
    hero: "/images/pages/control-hero.png",
    band: "/images/landing/horizon-sun.png",
    eyebrow: "Product / Runtime control",
    headline: "Limits you chose on purpose.",
    facts: [["Mode", "Observe first"], ["Ceilings", "Per run, daily"], ["Fallbacks", "Ordered"]],
    ticker: ["observe", "enforce", "cost ceiling", "fallback chain", "retry policy", "latency budget"],
    kicker: "Policy, not guesses",
    story: "Watch the policy before it bites.",
    Stage: ControlStage,
    statement: "Guardrails that live outside your app code.",
  },
  reports: {
    lead: "A clean, print-ready summary of runs, spend, failures, models and tools for any project window. Built from the same telemetry your engineers use, so it matches.",
    outcome: "Give the meeting the numbers without the dashboard tour.",
    hero: "/images/pages/reports-hero.png",
    band: "/images/landing/map-flat.png",
    eyebrow: "Product / Project reports",
    headline: "The operating record, on one page.",
    facts: [["Totals", "Runs, spend"], ["Breakdowns", "Model, tool"], ["Output", "Print / PDF"]],
    ticker: ["run volume", "spend", "failures", "models", "tools", "alerts"],
    kicker: "Share it outside the dashboard",
    story: "A review packet that builds itself.",
    Stage: ReportStage,
    statement: "Same telemetry as engineers, in a form a meeting can read.",
  },
} as const;

export type ProductSlug = keyof typeof config;


const names: Record<string, [string, string]> = {
  "trace-viewer": ["Trace viewer", "/product/trace-viewer"],
  "cost-dashboard": ["Cost dashboard", "/product/cost-dashboard"],
  "tool-calls": ["Tool calls", "/product/tool-calls"],
  "llm-calls": ["LLM calls", "/product/llm-calls"],
  failures: ["Failure analysis", "/product/failures"],
  "evaluation-engine": ["Evaluation engine", "/product/evaluation-engine"],
  "runtime-control": ["Runtime control", "/product/runtime-control"],
  reports: ["Project reports", "/product/reports"],
};

type Look = { hero: HeroVariant; story: StoryLook; caps: CapsVariant; order: readonly ("story" | "code" | "caps" | "band" | "faq")[]; band?: { flip?: boolean; dark?: boolean } };

const looks: Record<ProductSlug, Look> = {
  "trace-viewer": { hero: "split", story: { side: "right" }, caps: "cards", order: ["story", "code", "caps", "band", "faq"] },
  "cost-dashboard": { hero: "full", story: { side: "left", tone: "yellow" }, caps: "rows", order: ["story", "caps", "band", "code", "faq"], band: { flip: true, dark: true } },
  "tool-calls": { hero: "paper", story: { side: "stack" }, caps: "sticky", order: ["code", "story", "band", "caps", "faq"] },
  "llm-calls": { hero: "left", story: { side: "right", tone: "yellow" }, caps: "cards", order: ["story", "band", "code", "caps", "faq"], band: { flip: true } },
  failures: { hero: "full", story: { side: "stack" }, caps: "rows", order: ["story", "caps", "code", "band", "faq"], band: { dark: true } },
  "evaluation-engine": { hero: "paper", story: { side: "left" }, caps: "sticky", order: ["story", "caps", "code", "band", "faq"], band: { flip: true } },
  "runtime-control": { hero: "left", story: { side: "stack", tone: "yellow" }, caps: "rows", order: ["code", "story", "caps", "band", "faq"], band: { dark: true } },
  reports: { hero: "split", story: { side: "left" }, caps: "sticky", order: ["story", "band", "caps", "faq"], band: { flip: true } },
};

export function ProductPage({ slug, page }: { slug: ProductSlug; page: ProductPageData }) {
  const c = config[slug];
  const look = looks[slug];
  const Stage = c.Stage;
  const others = (Object.keys(names) as string[]).filter((k) => k !== slug).slice(0, 4).map((k) => names[k]);
  const blocks = {
    story: <StickyStory key="story" kicker={c.kicker} heading={c.story} steps={page.workflow} look={look.story} stage={(s) => <Stage {...s} />} />,
    code: snippets[slug] ? <CodeSection key="code" snippet={snippets[slug]} /> : null,
    caps: <CapabilityGrid key="caps" heading={c.outcome} items={page.details} variant={look.caps} />,
    band: <ArtBand key="band" img={c.band} label="Who it is for" statement={c.statement} aside={page.bestFor} {...look.band} />,
    faq: <Faq key="faq" items={page.faq} />,
  };
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.headline} lead={c.lead} img={c.hero} facts={c.facts} primary={["Start tracing free", appHref("/sign-up")]} secondary={["Read the docs", "/docs"]} variant={look.hero} />
      <SignalTicker items={c.ticker} />
      {look.order.map((k) => blocks[k])}
      <EndCta heading="See your own runs like this." links={others} />
    </>
  );
}
