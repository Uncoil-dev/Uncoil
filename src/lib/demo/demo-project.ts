/**
 * Public demo project: a deterministic, read-only "support agent" workspace.
 *
 * Nothing here touches a database. Every run is derived from a seed that depends only on a five minute slot of
 * the clock, so the same slot always produces the same runs on any server, and new runs keep appearing as time
 * passes. Spans are rebuilt from the same seed whenever a single trace is opened.
 */

import { DEMO_PROJECT_ID } from "./demo-config";

export { DEMO_PROJECT_ID };

const SLOT_MS = 5 * 60_000;
const HISTORY_DAYS = 90;

export type DemoSpan = {
  spanId: string; runId: string; projectId: string; spanType: string; input: string; output: string; attachments: string;
  latencyMs: number; costUsd: number; modelId: string; toolName: string; parentSpanId: string; metadata: string;
  sessionId: string; endUserId: string; environment: string; release: string; tags: string[]; traceName: string;
  inputTokens: number; outputTokens: number; ttftMs: number; retryCount: number; errorType: string; errorMessage: string;
  isStreamChunk: boolean; streamSequence: number; streamFinal: boolean; payloadFormat: string; stackTrace: string;
  timedOut: boolean; timeoutMs: number; createdAt: string; startMs: number;
};

export type DemoRun = {
  runId: string; seed: number; traceName: string; startMs: number; durationMs: number; spanCount: number; errorCount: number;
  totalCostUsd: number; inputTokens: number; outputTokens: number; modelId: string; endUserId: string; sessionId: string;
  environment: string; release: string; tags: string[]; input: string; output: string;
  llmCalls: number; toolCalls: number; slowestStepMs: number; avgStepMs: number; ttftMs: number; retries: number; timeouts: number;
  firstErrorType: string; firstErrorMessage: string; tools: string[]; models: string[]; spanTypes: string[]; nodeKeys: string[];
  errors: Array<{ tool: string; type: string; message: string; sample: string }>;
  meta: Record<string, string>;
  modelUsage: Record<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>;
};

// ---------------------------------------------------------------------------------------------------------------
// Random numbers

function hashString(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Random = () => number;
const between = (random: Random, min: number, max: number) => min + random() * (max - min);
const whole = (random: Random, min: number, max: number) => Math.round(between(random, min, max));
const pick = <T,>(random: Random, list: readonly T[]) => list[Math.floor(random() * list.length)]!;
function weighted<T>(random: Random, entries: ReadonlyArray<readonly [T, number]>) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of entries) { roll -= weight; if (roll <= 0) return value; }
  return entries[entries.length - 1]![0];
}
const hex = (random: Random, length: number) => Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join("");

export function demoGroupId(tool: string, type: string, message: string) {
  const a = hashString(`${tool}|${type}|${message}`).toString(16).padStart(8, "0");
  const b = hashString(`${message}|${type}|${tool}`).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

// ---------------------------------------------------------------------------------------------------------------
// World: releases, people, prompts

/** The story told by the data: v1.14.0 shipped a slow refund call, v1.14.1 fixed it. */
function releaseAt(ageDays: number, staging: boolean) {
  const prod = ageDays > 62 ? "v1.12.3" : ageDays > 40 ? "v1.13.0" : ageDays > 21 ? "v1.13.2" : ageDays > 9 ? "v1.13.4" : ageDays > 3 ? "v1.14.0" : "v1.14.1";
  if (!staging) return prod;
  return ageDays > 40 ? "v1.13.0-rc" : ageDays > 21 ? "v1.13.4-rc" : ageDays > 9 ? "v1.14.0-rc" : "v1.14.2-rc";
}

const USERS = Array.from({ length: 220 }, (_, i) => `cust_${(4100 + i * 37).toString(36)}${(i * 7919 % 97).toString(36)}`);
const TIERS = ["free", "free", "pro", "pro", "pro", "team", "team", "enterprise"] as const;
const REGIONS = ["eu-west", "eu-west", "us-east", "us-east", "us-west", "ap-south"] as const;
const CHANNELS = ["chat", "chat", "chat", "email", "help-center"] as const;

const QUESTIONS: Record<string, string[]> = {
  kb_question: [
    "How do I change the email address on my account?",
    "Do you offer an annual plan and what does it save?",
    "Can I add a teammate without paying for a full seat?",
    "Where do I find my invoices?",
    "How long do you keep my data after I cancel?",
    "Is there a way to export everything as a CSV?",
    "How do I turn on two-factor sign in?",
    "What happens when I go over my monthly limit?",
    "Can I connect the app to Slack?",
    "Why does the dashboard say my key is invalid?",
  ],
  order_status: [
    "Where is my order {order}? It was meant to arrive Tuesday.",
    "Can you check the status of {order}?",
    "Order {order} says delivered but nothing came.",
    "Has {order} shipped yet?",
    "I need the tracking link for {order}.",
  ],
  refund: [
    "I want my money back for {order}, it arrived broken.",
    "Please refund {order}, I ordered the wrong size.",
    "Refund {order} - it never showed up and I'm tired of waiting.",
    "Can I get a refund on {order}? Changed my mind.",
    "{order} was charged twice, please refund one of them.",
  ],
  account: [
    "I can't sign in after resetting my password.",
    "Please update my shipping address to the new office.",
    "Can you cancel my subscription at the end of this month?",
    "I was charged after cancelling. Can you look into it?",
  ],
  escalate: [
    "This is the third time I've asked. I need to speak to a person about {order}.",
    "Your last answer was wrong and it cost us a day. Please escalate.",
    "We need a written confirmation of the outage credit for our records.",
  ],
  onboarding: [
    "I just signed up. How do I send my first trace?",
    "Which SDK should I install for a Python agent?",
    "Where do I put my API key?",
    "How long until my first run shows up?",
  ],
};

const ANSWERS: Record<string, string[]> = {
  kb_question: [
    "You can do that from Settings → Account. I've linked the exact steps below. Changes apply immediately and you'll get a confirmation email.",
    "Annual plans are billed once a year and save about 20% compared with monthly billing. You can switch from Billing → Plan at any time.",
    "Teammates can be added as viewers for free; editors count as paid seats. I've included the invite link and what each role can see.",
    "Invoices are under Billing → History. Each one has a PDF download and the VAT number we have on file.",
  ],
  order_status: [
    "Your order {order} left the warehouse yesterday and is with the carrier. It should arrive by Thursday; here is the tracking link.",
    "{order} was delivered to the front desk at 10:42. If nothing has arrived, I've asked the carrier to confirm the drop-off photo and will email you today.",
    "{order} is packed and ships tomorrow morning. You'll get a tracking email as soon as the carrier scans it.",
  ],
  refund: [
    "I've refunded {order} in full. The money should show on your card within 3 to 5 business days, and a confirmation is on its way to your inbox.",
    "{order} is eligible, so I've started the refund. You'll get an email when it completes. No need to return the item.",
  ],
  account: [
    "Done. I've updated your account and sent a confirmation to the email on file. If anything looks off, reply here and I'll fix it.",
    "I found the charge and have raised it with billing. You'll hear back within one business day, and I've flagged the account so nothing else is taken.",
  ],
  escalate: [
    "I'm sorry about the trouble. I've opened a ticket with the full history and a teammate will contact you within the hour.",
    "I've passed this to a senior agent with everything you've told me so far. You won't need to repeat yourself.",
  ],
  onboarding: [
    "Install the SDK, set your API key as an environment variable, and wrap your agent's entry point. Your first run appears within a few seconds.",
    "For Python, run pip install uncoil and call uncoil.init() once at start-up. I've shared a copy-paste example below.",
  ],
};

const FALLBACK_ANSWER = "I'm having trouble finishing that right now. I've handed this to a teammate and they'll follow up with you shortly.";

type StepSpec = { kind: "llm" | "tool" | "retrieval"; name: string };
const MINI = "gpt-4.1-mini", FULL = "gpt-4.1", CLAUDE = "claude-sonnet-4-5";
const PRICE: Record<string, [number, number]> = { [MINI]: [0.4, 1.6], [FULL]: [2, 8], [CLAUDE]: [3, 15] };

const PLANS: Record<string, StepSpec[]> = {
  kb_question: [{ kind: "llm", name: MINI }, { kind: "retrieval", name: "search_kb" }, { kind: "llm", name: FULL }],
  order_status: [{ kind: "llm", name: MINI }, { kind: "tool", name: "get_customer" }, { kind: "tool", name: "lookup_order" }, { kind: "llm", name: FULL }],
  account: [{ kind: "llm", name: MINI }, { kind: "tool", name: "get_customer" }, { kind: "tool", name: "update_account" }, { kind: "llm", name: FULL }],
  escalate: [{ kind: "llm", name: MINI }, { kind: "retrieval", name: "search_kb" }, { kind: "llm", name: FULL }, { kind: "tool", name: "create_ticket" }, { kind: "tool", name: "send_email" }, { kind: "llm", name: FULL }],
  refund: [{ kind: "llm", name: MINI }, { kind: "tool", name: "get_customer" }, { kind: "tool", name: "lookup_order" }, { kind: "llm", name: CLAUDE }, { kind: "tool", name: "issue_refund" }, { kind: "tool", name: "send_email" }, { kind: "llm", name: FULL }],
  onboarding: [{ kind: "llm", name: MINI }, { kind: "retrieval", name: "search_kb" }, { kind: "llm", name: MINI }],
};

const TOOL_LATENCY: Record<string, [number, number]> = {
  search_kb: [180, 520], get_customer: [60, 190], lookup_order: [90, 420], create_ticket: [220, 640], send_email: [140, 380],
  issue_refund: [650, 1900], update_account: [110, 340], check_refund_status: [80, 260],
};
const FAIL_WEIGHT: Record<string, number> = { lookup_order: 4, search_kb: 3, issue_refund: 2, send_email: 1.5, create_ticket: 1, update_account: 1, get_customer: 0.4, check_refund_status: 0.5 };
const TOOL_TIMEOUT: Record<string, number> = { search_kb: 5000, lookup_order: 4000, issue_refund: 8000, get_customer: 3000, create_ticket: 6000, send_email: 6000, update_account: 4000 };

// ---------------------------------------------------------------------------------------------------------------
// One run

type RunPlan = {
  runId: string; seed: number; traceName: string; scenario: string; startMs: number; environment: string; release: string;
  user: string; session: string; tier: string; region: string; channel: string; ageDays: number;
};

function stamp(ms: number) { return new Date(ms).toISOString().slice(0, 19).replace("T", " "); }

function planFor(slot: number, index: number, startMs: number, nowMs: number): RunPlan {
  const seed = hashString(`demo-run:${slot}:${index}`);
  const random = rng(seed);
  const ageDays = (nowMs - startMs) / 86_400_000;
  const traceName = weighted(random, [["support-agent", 58], ["refund-agent", 13], ["order-status", 16], ["onboarding-helper", 13]] as const);
  const scenario = traceName === "refund-agent" ? "refund"
    : traceName === "order-status" ? "order_status"
      : traceName === "onboarding-helper" ? "onboarding"
        : weighted(random, [["kb_question", 44], ["order_status", 22], ["account", 20], ["escalate", 14]] as const);
  const environment = random() < 0.1 ? "staging" : "production";
  const userIndex = Math.min(USERS.length - 1, Math.floor(Math.pow(random(), 2.1) * USERS.length));
  const user = USERS[userIndex]!;
  const day = Math.floor(startMs / 86_400_000);
  return {
    runId: `run_${hex(random, 12)}`, seed, traceName, scenario, startMs, environment, release: releaseAt(ageDays, environment === "staging"),
    user, session: `sess_${hashString(`${user}:${day}:${Math.floor(startMs / 21_600_000)}`).toString(36).slice(0, 8)}`,
    tier: TIERS[userIndex % TIERS.length]!, region: REGIONS[userIndex % REGIONS.length]!, channel: pick(random, CHANNELS), ageDays,
  };
}

function tokensFor(random: Random, model: string, final: boolean) {
  if (model === MINI) return { input: whole(random, 320, 760), output: whole(random, 10, 42) + (final ? whole(random, 60, 160) : 0) };
  if (model === CLAUDE) return { input: whole(random, 1400, 2600), output: whole(random, 90, 220) };
  return { input: whole(random, 900, 2800), output: whole(random, 110, 380) };
}

/** Builds every step of a run. `full` adds the input and output payloads, which the list never needs. */
export function buildSpans(plan: RunPlan, full: boolean): DemoSpan[] {
  const random = rng(plan.seed ^ 0x9e3779b9);
  const payload = rng(plan.seed ^ 0x51ed270b);
  const order = `ORD-${whole(payload, 10000, 99999)}`;
  const question = pick(payload, QUESTIONS[plan.scenario]!).replace("{order}", order);
  const steps = [...PLANS[plan.scenario]!];
  if (plan.scenario === "order_status" && random() < 0.28) steps.splice(steps.length - 1, 0, { kind: "tool", name: "check_refund_status" });

  // Which step fails, if any. The v1.14.0 release shipped a refund call that often timed out.
  const baseRate = plan.environment === "staging" ? 0.11 : 0.04;
  let failAt = -1;
  let failKind = "";
  const toolIndexes = steps.map((step, i) => (step.kind === "llm" ? -1 : i)).filter((i) => i >= 0);
  const refundIndex = steps.findIndex((step) => step.name === "issue_refund");
  if (plan.release.startsWith("v1.14.0") && refundIndex >= 0 && random() < 0.34) { failAt = refundIndex; failKind = "timeout"; }
  else if (random() < baseRate && steps.length) {
    const llmIndexes = steps.map((step, i) => (step.kind === "llm" ? i : -1)).filter((i) => i >= 0);
    if (random() < 0.3) { failAt = pick(random, llmIndexes); failKind = random() < 0.7 ? "ratelimit" : "context"; }
    else if (toolIndexes.length) {
      failAt = weighted(random, toolIndexes.map((i) => [i, FAIL_WEIGHT[steps[i]!.name] ?? 1] as const));
      failKind = steps[failAt]!.name === "lookup_order" && random() < 0.55 ? "notfound" : steps[failAt]!.kind === "retrieval" ? "kbdown" : "timeout";
    }
  }

  const rootId = `spn_${hex(random, 10)}`;
  const spans: DemoSpan[] = [];
  const tags = new Set<string>();
  if (plan.tier === "enterprise") tags.add("vip");
  if (plan.environment === "staging") tags.add("canary");
  if (plan.scenario === "refund") tags.add("refund");
  if (plan.scenario === "escalate") tags.add("escalated");

  const base = {
    runId: plan.runId, projectId: DEMO_PROJECT_ID, attachments: "[]", sessionId: plan.session, endUserId: plan.user, environment: plan.environment,
    release: plan.release, traceName: plan.traceName, isStreamChunk: false, streamSequence: 0, streamFinal: true, payloadFormat: "json", stackTrace: "",
  };
  let cursor = plan.startMs + whole(random, 4, 22);
  let finalAnswer = pick(payload, ANSWERS[plan.scenario]!).replace("{order}", order);
  let context = "";
  let failed = false;

  steps.forEach((step, index) => {
    if (failed) return;
    const spanId = `spn_${hex(random, 10)}`;
    const isFinal = step.kind === "llm" && index === steps.length - 1;
    let latency: number, cost = 0, tokens = { input: 0, output: 0 }, ttft = 0, retry = 0, errorType = "", errorMessage = "", timedOut = false, timeoutMs = 0, stack = "";

    if (step.kind === "llm") {
      tokens = tokensFor(random, step.name, isFinal);
      ttft = step.name === MINI ? whole(random, 180, 420) : whole(random, 320, 880);
      latency = ttft + Math.round(tokens.output * (step.name === MINI ? between(random, 2.5, 5) : between(random, 4.5, 8.5)));
      const price = PRICE[step.name]!;
      cost = (tokens.input * price[0] + tokens.output * price[1]) / 1_000_000;
      if (index === failAt && failKind === "ratelimit") {
        errorType = "RateLimitError"; retry = 2; latency += 6200;
        errorMessage = `429 Too Many Requests: rate limit reached for ${step.name} on tokens per minute. Retry after ${whole(random, 4, 9)}s (request ${hex(random, 8)}).`;
        stack = `RateLimitError: ${errorMessage}\n    at OpenAI.makeRequest (openai/core.js:412)\n    at agent.llm_step (agent/steps.ts:88)`;
      } else if (index === failAt) {
        errorType = "ContextLengthExceeded"; latency = whole(random, 140, 260); cost = 0; tokens.output = 0;
        errorMessage = `This model's maximum context length is 128000 tokens. Your messages resulted in ${whole(random, 128400, 141000)} tokens.`;
        stack = `BadRequestError: ${errorMessage}\n    at OpenAI.makeRequest (openai/core.js:412)\n    at agent.llm_step (agent/steps.ts:88)`;
      }
    } else {
      const [low, high] = TOOL_LATENCY[step.name] ?? [100, 300];
      latency = whole(random, low, high);
      if (index === failAt && failKind === "timeout") {
        timeoutMs = TOOL_TIMEOUT[step.name] ?? 5000; latency = timeoutMs; timedOut = true; errorType = "ToolTimeout"; retry = 1;
        errorMessage = `${step.name} timed out after ${timeoutMs}ms (request ${hex(random, 8)}). The upstream service did not respond.`;
        stack = `ToolTimeout: ${errorMessage}\n    at withTimeout (agent/tools.ts:54)\n    at ${step.name} (agent/tools/${step.name}.ts:31)`;
      } else if (index === failAt && failKind === "notfound") {
        errorType = "ValidationError"; latency = whole(random, 60, 120);
        errorMessage = `order_id '${order}' was not found for customer ${plan.user}.`;
        stack = `ValidationError: ${errorMessage}\n    at lookup_order (agent/tools/lookup_order.ts:27)`;
      } else if (index === failAt) {
        errorType = "ConnectionError"; latency = whole(random, 900, 1600);
        errorMessage = `search_kb could not reach the knowledge index (connection reset by peer, request ${hex(random, 8)}).`;
        stack = `ConnectionError: ${errorMessage}\n    at fetchIndex (agent/tools/search_kb.ts:19)`;
      }
    }

    let input = "", output = "";
    if (full) {
      if (step.kind === "llm") {
        const system = step.name === MINI && index === 0 ? "Classify the customer's request. Reply with one intent label." : "You are the support agent for Northwind. Be accurate, brief and kind. Use only facts from the tool results.";
        const messages: Array<{ role: string; content: string }> = [{ role: "system", content: system }, { role: "user", content: question }];
        if (context) messages.push({ role: "tool", content: context });
        input = JSON.stringify(messages);
        output = errorType ? "" : index === 0 ? plan.scenario : isFinal ? finalAnswer : "Plan: use the tool results above to answer the customer.";
      } else if (step.name === "search_kb") {
        input = JSON.stringify({ query: question.replace(/\{order\}/g, order).slice(0, 80), top_k: 4 });
        output = errorType ? "" : JSON.stringify({ results: [{ title: "Managing your account", score: 0.91 }, { title: "Billing and invoices", score: 0.84 }, { title: "Plans and limits", score: 0.78 }] });
        if (!errorType) context = "KB: Managing your account (0.91), Billing and invoices (0.84)";
      } else if (step.name === "lookup_order" || step.name === "check_refund_status") {
        input = JSON.stringify({ order_id: order, customer_id: plan.user });
        output = errorType ? "" : JSON.stringify({ order_id: order, status: pick(payload, ["shipped", "delivered", "packing", "delivered"]), carrier: "DHL", total_eur: whole(payload, 19, 240) });
        if (!errorType) context = `order ${order} found`;
      } else if (step.name === "issue_refund") {
        input = JSON.stringify({ order_id: order, reason: "customer_request", amount: "full" });
        output = errorType ? "" : JSON.stringify({ refund_id: `re_${hex(payload, 10)}`, status: "pending", eta_days: 4 });
        if (!errorType) context = "refund created";
      } else if (step.name === "get_customer") {
        input = JSON.stringify({ customer_id: plan.user });
        output = errorType ? "" : JSON.stringify({ customer_id: plan.user, tier: plan.tier, region: plan.region, open_tickets: whole(payload, 0, 2) });
      } else if (step.name === "create_ticket") {
        input = JSON.stringify({ customer_id: plan.user, summary: question.slice(0, 80), priority: "high" });
        output = errorType ? "" : JSON.stringify({ ticket_id: `TCK-${whole(payload, 1000, 9999)}`, assignee: "tier2" });
      } else if (step.name === "send_email") {
        input = JSON.stringify({ to: `${plan.user}@example.com`, template: plan.scenario === "refund" ? "refund_confirmation" : "ticket_opened" });
        output = errorType ? "" : JSON.stringify({ status: "queued" });
      } else {
        input = JSON.stringify({ customer_id: plan.user, fields: ["shipping_address"] });
        output = errorType ? "" : JSON.stringify({ updated: true });
      }
    }

    const failedStep = Boolean(errorType);
    spans.push({
      ...base, spanId, spanType: step.kind, input, output, latencyMs: latency, costUsd: cost, modelId: step.kind === "llm" ? step.name : "",
      toolName: step.kind === "llm" ? "" : step.name, parentSpanId: rootId, metadata: "{}", tags: [], inputTokens: tokens.input, outputTokens: tokens.output,
      ttftMs: ttft, retryCount: retry, errorType, errorMessage, stackTrace: stack, timedOut, timeoutMs, startMs: cursor, createdAt: stamp(cursor),
    });
    cursor += latency + whole(random, 4, 24);
    if (step.name === "create_ticket") tags.add("escalated");
    if (failedStep) {
      failed = true;
      // The agent still answers, with an apology, so the customer is not left waiting.
      const [inPrice, outPrice] = PRICE[FULL]!;
      const fb = { input: whole(random, 700, 1500), output: whole(random, 40, 70) };
      const fbLatency = whole(random, 700, 1300);
      finalAnswer = FALLBACK_ANSWER;
      if (step.name === "issue_refund") tags.add("needs-review");
      spans.push({
        ...base, spanId: `spn_${hex(random, 10)}`, spanType: "llm", input: full ? JSON.stringify([{ role: "system", content: "The previous step failed. Apologise and hand over to a human." }, { role: "user", content: question }]) : "",
        output: full ? FALLBACK_ANSWER : "", latencyMs: fbLatency, costUsd: (fb.input * inPrice + fb.output * outPrice) / 1_000_000, modelId: FULL, toolName: "", parentSpanId: rootId,
        metadata: "{}", tags: [], inputTokens: fb.input, outputTokens: fb.output, ttftMs: whole(random, 300, 700), retryCount: 0, errorType: "", errorMessage: "", stackTrace: "",
        timedOut: false, timeoutMs: 0, startMs: cursor, createdAt: stamp(cursor),
      });
      cursor += fbLatency;
    }
  });

  const end = cursor + whole(random, 3, 14);
  const metadata = JSON.stringify({ channel: plan.channel, customer_tier: plan.tier, region: plan.region, prompt_version: `${plan.traceName}@v${plan.release.startsWith("v1.14") ? 18 : 17}` });
  for (const span of spans) span.tags = [...tags];
  spans.unshift({
    ...base, spanId: rootId, spanType: "agent", input: full ? JSON.stringify([{ role: "user", content: question }]) : "", output: full ? finalAnswer : "", latencyMs: end - plan.startMs,
    costUsd: 0, modelId: "", toolName: "", parentSpanId: "", metadata, tags: [...tags], inputTokens: 0, outputTokens: 0, ttftMs: 0, retryCount: 0, errorType: "", errorMessage: "",
    stackTrace: "", timedOut: false, timeoutMs: 0, startMs: plan.startMs, createdAt: stamp(plan.startMs),
  });
  // The run summaries show the question and answer even when payloads are not built.
  const root = spans[0]!;
  root.input = full ? root.input : question;
  root.output = full ? root.output : finalAnswer;
  return spans;
}

const messageKey = (message: string) => message
  .replace(/request [0-9a-f]{8}/g, "request <id>").replace(/ORD-\d+/g, "ORD-<n>").replace(/cust_\w+/g, "cust_<id>")
  .replace(/[0-9]+(\.[0-9]+)?/g, "<n>").replace(/\s+/g, " ").trim().slice(0, 120);

function summarise(plan: RunPlan, spans: DemoSpan[]): DemoRun {
  const root = spans[0]!;
  const children = spans.slice(1);
  const failedSpans = spans.filter((span) => span.errorType || span.spanType === "error");
  let costliest = "", costliestValue = -1;
  for (const span of spans) if (span.modelId && span.costUsd > costliestValue) { costliest = span.modelId; costliestValue = span.costUsd; }
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
  const latencies = children.map((span) => span.latencyMs);
  const first = failedSpans[0];
  const meta = JSON.parse(root.metadata) as Record<string, string>;
  const usage: DemoRun["modelUsage"] = {};
  for (const span of children) {
    if (!span.modelId) continue;
    const entry = (usage[span.modelId] ??= { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 });
    entry.calls++; entry.costUsd += span.costUsd; entry.inputTokens += span.inputTokens; entry.outputTokens += span.outputTokens;
  }
  const typeOf = (span: DemoSpan) => (span.spanType === "retrieval" ? "retrieval" : span.spanType);
  return {
    runId: plan.runId, seed: plan.seed, traceName: plan.traceName, startMs: plan.startMs, durationMs: root.latencyMs, spanCount: spans.length, errorCount: failedSpans.length,
    totalCostUsd: spans.reduce((sum, span) => sum + span.costUsd, 0), inputTokens: spans.reduce((sum, span) => sum + span.inputTokens, 0), outputTokens: spans.reduce((sum, span) => sum + span.outputTokens, 0),
    modelId: costliest, endUserId: plan.user, sessionId: plan.session, environment: plan.environment, release: plan.release, tags: root.tags, input: root.input, output: root.output,
    llmCalls: children.filter((span) => span.spanType === "llm").length, toolCalls: children.filter((span) => span.spanType === "tool" || span.spanType === "retrieval").length,
    slowestStepMs: Math.max(0, ...latencies), avgStepMs: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    ttftMs: Math.min(...children.map((span) => span.ttftMs).filter((value) => value > 0), Infinity) === Infinity ? 0 : Math.min(...children.map((span) => span.ttftMs).filter((value) => value > 0)),
    retries: spans.reduce((sum, span) => sum + span.retryCount, 0), timeouts: spans.filter((span) => span.timedOut).length,
    firstErrorType: first?.errorType ?? "", firstErrorMessage: first?.errorMessage.slice(0, 200) ?? "",
    tools: unique(children.map((span) => span.toolName)), models: unique(children.map((span) => span.modelId)),
    spanTypes: unique(spans.map(typeOf)), nodeKeys: unique(spans.map((span) => `${span.spanType === "agent" ? "agent" : span.spanType}:${span.toolName || span.modelId || span.traceName}`)),
    errors: failedSpans.map((span) => ({ tool: span.toolName || span.modelId, type: span.errorType, message: messageKey(span.errorMessage), sample: span.errorMessage.slice(0, 300) })),
    meta,
    modelUsage: usage,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The whole history

function ratePerSlot(startMs: number, nowMs: number) {
  const date = new Date(startMs);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const weekday = date.getUTCDay();
  const curve = 0.16 + 0.84 * Math.exp(-Math.pow((hour - 14.5) / 4.6, 2)) + 0.28 * Math.exp(-Math.pow((hour - 9) / 2.4, 2));
  const week = weekday === 0 ? 0.42 : weekday === 6 ? 0.58 : 1;
  const growth = 0.62 + 0.38 * (1 - (nowMs - startMs) / (HISTORY_DAYS * 86_400_000));
  return 3.6 * curve * week * Math.max(0.5, growth);
}

let cache: { runs: DemoRun[]; lastSlot: number; firstSlot: number } | null = null;

/** Every run in the last 90 days, oldest first. Extended in place as the clock moves on. */
export function demoRuns(nowMs = Date.now()): DemoRun[] {
  const currentSlot = Math.floor(nowMs / SLOT_MS);
  const firstSlot = Math.floor((nowMs - (HISTORY_DAYS + 1) * 86_400_000) / SLOT_MS);
  if (!cache || cache.firstSlot < firstSlot - 2000) cache = { runs: [], lastSlot: firstSlot - 1, firstSlot };
  for (let slot = cache.lastSlot + 1; slot <= currentSlot; slot++) {
    const slotStart = slot * SLOT_MS;
    const random = rng(hashString(`demo-slot:${slot}`));
    const rate = ratePerSlot(slotStart, nowMs);
    const count = Math.floor(rate) + (random() < rate - Math.floor(rate) ? 1 : 0);
    for (let index = 0; index < count; index++) {
      const startMs = slotStart + Math.floor(random() * SLOT_MS);
      const plan = planFor(slot, index, startMs, nowMs);
      cache.runs.push(summarise(plan, buildSpans(plan, false)));
    }
    cache.lastSlot = slot;
  }
  cache.runs.sort((a, b) => a.startMs - b.startMs);
  return cache.runs.filter((run) => run.startMs <= nowMs);
}

/** Rebuilds a run's steps, with payloads, from its seed. Returns null for an unknown id. */
export function demoSpans(runId: string, nowMs = Date.now()): { run: DemoRun; spans: DemoSpan[] } | null {
  const run = demoRuns(nowMs).find((item) => item.runId === runId);
  if (!run) return null;
  const startMs = run.startMs;
  const plan: RunPlan = {
    runId, seed: run.seed, traceName: run.traceName, scenario: scenarioOf(run), startMs, environment: run.environment, release: run.release,
    user: run.endUserId, session: run.sessionId, tier: run.meta.customer_tier ?? "pro", region: run.meta.region ?? "eu-west", channel: run.meta.channel ?? "chat", ageDays: 0,
  };
  return { run, spans: buildSpans(plan, true) };
}

/** Same plan the run was created with, recovered from its seed so the steps match the list exactly. */
function scenarioOf(run: DemoRun) {
  const random = rng(run.seed);
  const traceName = weighted(random, [["support-agent", 58], ["refund-agent", 13], ["order-status", 16], ["onboarding-helper", 13]] as const);
  return traceName === "refund-agent" ? "refund" : traceName === "order-status" ? "order_status" : traceName === "onboarding-helper" ? "onboarding"
    : weighted(random, [["kb_question", 44], ["order_status", 22], ["account", 20], ["escalate", 14]] as const);
}

/** Steps (without payloads) for many runs at once, used by the map and arrow filters. */
export function demoSteps(run: DemoRun) {
  const plan: RunPlan = {
    runId: run.runId, seed: run.seed, traceName: run.traceName, scenario: scenarioOf(run), startMs: run.startMs, environment: run.environment, release: run.release,
    user: run.endUserId, session: run.sessionId, tier: run.meta.customer_tier ?? "pro", region: run.meta.region ?? "eu-west", channel: run.meta.channel ?? "chat", ageDays: 0,
  };
  return buildSpans(plan, false);
}
