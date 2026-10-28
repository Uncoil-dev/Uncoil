"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Reveal } from "@/components/marketing/landing/reveal";

export type Snippet = { title: string; lede: string; ts: string; py?: string };

const imp = {
  ts: "npm install uncoil-sdk",
  py: "pip install uncoil-sdk",
};

export function CodeSection({ snippet }: { snippet: Snippet }) {
  const [lang, setLang] = useState<"ts" | "py">("ts");
  const [copied, setCopied] = useState(false);
  const code = snippet[lang] ?? snippet.ts;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked; the code stays selectable */
    }
  };
  return (
    <section className="bg-[#eceae3] px-5 py-24 text-[#090909] md:px-8 md:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Instrument it</p>
          <h2 className="mt-4 font-pixel text-[clamp(2.2rem,4.6vw,4.4rem)] leading-[0.9] tracking-[-0.06em]">{snippet.title}</h2>
          <p className="mt-6 max-w-md text-base leading-7 text-black/62">{snippet.lede}</p>
          <p className="mt-8 inline-block border border-black px-3 py-2 font-mono text-[11px] tracking-[0.04em]">$ {imp[lang]}</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="bg-[#090909] text-[#eceae3]">
            <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
              <div className="flex gap-1" role="tablist" aria-label="Language">
                {(snippet.py ? (["ts", "py"] as const) : (["ts"] as const)).map((l) => (
                  <button
                    key={l}
                    role="tab"
                    aria-selected={lang === l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${lang === l ? "bg-[#f4d44d] text-[#090909]" : "text-white/55 hover:text-white"}`}
                  >
                    {l === "ts" ? "TypeScript" : "Python"}
                  </button>
                ))}
              </div>
              <button onClick={copy} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 transition-colors hover:text-[#f4d44d]" aria-label="Copy code">
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-6 md:p-7 md:text-[13px] md:leading-7">
              <code>{code}</code>
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export const snippets: Record<string, Snippet> = {
  "trace-viewer": {
    title: "Wrap the agent once. Get the whole run.",
    lede: "Every span you open inside traceAgent is linked to the step it ran in, so loops, retries and handoffs show up as a tree you can read.",
    ts: `import { traceAgent, span } from "uncoil-sdk";

export const answer = traceAgent(async (question: string) => {
  const plan = await span("plan", () => callModel(question), { type: "llm", input: question });
  const docs = await span("search", () => search(plan.query), { type: "tool" });
  return span("answer", () => callModel(question, docs), { type: "llm" });
}, { environment: "production", release: "2.14" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production", release="2.14")
def answer(question):
    with uncoil.span("plan", type="llm", input=question):
        plan = call_model(question)
    with uncoil.span("search", type="tool"):
        docs = search(plan.query)
    with uncoil.span("answer", type="llm"):
        return call_model(question, docs)`,
  },
  "cost-dashboard": {
    title: "Put a price on every call.",
    lede: "Record cost where the call happens. Spend then rolls up by day, run, model and tool, with retries counted on their own.",
    ts: `import { traceAgent, llmCall } from "uncoil-sdk";

export const answer = traceAgent(async (question: string) => {
  const reply = await callModel(question);
  await llmCall({
    input: question,
    output: reply.text,
    modelId: "gpt-4o",
    costUsd: 0.002,
    latencyMs: 800,
  });
  return reply.text;
}, { environment: "production", release: "2.14" });`,
    py: `from uncoil import trace_agent, llm_call

@trace_agent(environment="production", release="2.14")
def answer(question):
    reply = call_model(question)
    llm_call(
        input_data=question,
        output_data=reply.text,
        model_id="gpt-4o",
        cost_usd=0.002,
        latency_ms=800,
    )
    return reply.text`,
  },
  "tool-calls": {
    title: "Mark a function as a tool. Done.",
    lede: "observe records the arguments, the result, the timing and any error, and keeps the call attached to the step that chose it.",
    ts: `import { observe, traceAgent } from "uncoil-sdk";

const searchDocs = observe(async function searchDocs(query: string) {
  return search(query);
}, { type: "tool" });

export const answer = traceAgent(async (question: string) => {
  const hits = await searchDocs(question);
  return summarize(hits);
});`,
    py: `import uncoil

@uncoil.observe(type="tool")
def search_docs(query):
    return search(query)

@uncoil.trace_agent()
def answer(question):
    hits = search_docs(question)
    return summarize(hits)`,
  },
  "llm-calls": {
    title: "Tag the model. Keep the tokens.",
    lede: "Set the model and token counts on the span and they roll up into the run total, next to latency and cost.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const answer = traceAgent(async (question: string) => {
  return span("chat", async (step) => {
    const reply = await callModel(question);
    step.set({ model: "claude-sonnet-5-5", inputTokens: reply.usage.input, outputTokens: reply.usage.output });
    return reply.text;
  }, { type: "llm", input: question });
});`,
    py: `import uncoil

@uncoil.trace_agent()
def answer(question):
    with uncoil.span("chat", type="llm", input=question) as step:
        reply = call_model(question)
        step.set_output(reply.text)
        step.set(model="claude-sonnet-5-5", input_tokens=reply.usage.input, output_tokens=reply.usage.output)
    return reply.text`,
  },
  failures: {
    title: "Errors are captured for you.",
    lede: "Throw inside a span and Uncoil records the error type and message on that step, inside the full run, so the first crack is easy to find.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const answer = traceAgent(async (question: string) => {
  const docs = await span("search", async () => {
    const hits = await search(question);
    if (hits.length === 0) throw new Error("empty result");
    return hits;
  }, { type: "tool" });
  return summarize(docs);
}, { environment: "production", release: "2.14" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production", release="2.14")
def answer(question):
    with uncoil.span("search", type="tool"):
        hits = search(question)
        if not hits:
            raise ValueError("empty result")
    return summarize(hits)`,
  },
  research: {
    title: "Make every source a step.",
    lede: "Record retrievals as their own spans and the trace shows which sources each claim rests on, and which it does not.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const research = traceAgent(async (question: string) => {
  const sources = await span("retrieve", () => searchWeb(question), { type: "retrieval", input: question });
  return span("synthesize", () => writeAnswer(question, sources), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def research(question):
    with uncoil.span("retrieve", type="retrieval", input=question):
        sources = search_web(question)
    with uncoil.span("synthesize", type="llm"):
        return write_answer(question, sources)`,
  },
  support: {
    title: "Tie every trace to a conversation.",
    lede: "Add a session and an end user and every ticket's runs line up in one place, so an escalation has its whole history.",
    ts: `import { traceAgent } from "uncoil-sdk";

export const handleTicket = traceAgent(async (ticket: Ticket) => {
  const account = await loadAccount(ticket.customerId);
  return resolve(ticket, account);
}, { environment: "production", release: "2.14", sessionId: "ticket-1842", endUserId: "cus_204", tags: ["support"] });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production", release="2.14", session_id="ticket-1842", end_user_id="cus_204", tags=["support"])
def handle_ticket(ticket):
    account = load_account(ticket.customer_id)
    return resolve(ticket, account)`,
  },
  automation: {
    title: "Trace the chain, not just the end.",
    lede: "Wrap each step of the workflow and retries show up as their own spans, so a duplicated side effect is visible instead of silent.",
    ts: `import { observe, traceAgent } from "uncoil-sdk";

const chargeCard = observe(async function chargeCard(order: Order) {
  return billing.charge(order.id, { idempotencyKey: order.id });
}, { type: "tool" });

export const runOrder = traceAgent(async (order: Order) => {
  await chargeCard(order);
  return fulfil(order);
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.observe(type="tool")
def charge_card(order):
    return billing.charge(order.id, idempotency_key=order.id)

@uncoil.trace_agent(environment="production")
def run_order(order):
    charge_card(order)
    return fulfil(order)`,
  },
  "evaluation-engine": {
    title: "Score a trace in one line.",
    lede: "Attach a typed score or end-user feedback to any run. The same score shows up in suites, monitors and the review queue.",
    ts: `import { UncoilClient } from "uncoil-sdk";

const client = new UncoilClient({ apiKey: (process.env.UNCOIL_API_KEY ?? process.env.TRACIFY_API_KEY), projectId: "your-project-id" });

client.score(runId, "answer_quality", 0.92, { dataType: "numeric" });
client.feedback(runId, true, { kind: "thumb", comment: "Helpful answer" });`,
    py: `client = UncoilClient(project_id="your-project-id")

client.score(run_id, "answer_quality", 0.92, data_type="numeric")
client.feedback(run_id, True, kind="thumb", comment="Helpful answer")`,
  },
  "runtime-control": {
    title: "Run the model call through a policy.",
    lede: "orchestrate wraps a call with your fallback chain, retry policy and ceilings. Start in observe mode and switch to enforce when the numbers look right.",
    ts: `const reply = await client.orchestrate({
  model: "large-model",
  input: question,
  call: (model, signal) => callModel(model, question, { signal }),
  policy: {
    enforcementMode: "observe",
    maxCostPerRun: 0.25,
    fallbackChain: ["fast-model"],
    retryPolicy: { maxAttempts: 2, backoffMs: 1000, backoffMultiplier: 2, retryableErrors: ["timeout", "rate_limit"] },
    latencyBudgetMs: 8000,
  },
});`,
  },
  coding: {
    title: "Record every edit and every test run.",
    lede: "Wrap the plan, each edit and the test run in spans, and a failing change points straight back to the step that caused it.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const fixBug = traceAgent(async (task: string) => {
  const patch = await span("write-patch", () => writePatch(task), { type: "llm", input: task });
  const result = await span("run-tests", () => runTests(patch), { type: "tool" });
  return result.passed ? patch : span("retry", () => writePatch(task, result.errors), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def fix_bug(task):
    with uncoil.span("write-patch", type="llm", input=task):
        patch = write_patch(task)
    with uncoil.span("run-tests", type="tool"):
        result = run_tests(patch)
    if result.passed:
        return patch
    with uncoil.span("retry", type="llm"):
        return write_patch(task, result.errors)`,
  },
  rag: {
    title: "Make retrieval a step you can read.",
    lede: "Record the retrieval as its own span and the trace shows which chunks the model was given, next to the answer it wrote.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const answer = traceAgent(async (question: string) => {
  const chunks = await span("retrieve", () => vectorSearch(question, 8), { type: "retrieval", input: question });
  return span("generate", () => writeAnswer(question, chunks), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def answer(question):
    with uncoil.span("retrieve", type="retrieval", input=question):
        chunks = vector_search(question, 8)
    with uncoil.span("generate", type="llm"):
        return write_answer(question, chunks)`,
  },
  voice: {
    title: "Time every turn of the call.",
    lede: "Put speech recognition, the model and speech output in separate spans and the slow part of a turn is obvious.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const handleTurn = traceAgent(async (audio: Buffer) => {
  const text = await span("transcribe", () => speechToText(audio), { type: "tool" });
  const reply = await span("think", () => callModel(text), { type: "llm", input: text });
  return span("speak", () => textToSpeech(reply), { type: "tool" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def handle_turn(audio):
    with uncoil.span("transcribe", type="tool"):
        text = speech_to_text(audio)
    with uncoil.span("think", type="llm", input=text):
        reply = call_model(text)
    with uncoil.span("speak", type="tool"):
        return text_to_speech(reply)`,
  },
  browser: {
    title: "Turn every click into a span.",
    lede: "Wrap the actions your browser agent takes and a stuck or repeated step shows up in the trace with its timing.",
    ts: `import { observe, traceAgent } from "uncoil-sdk";

const click = observe(async function click(selector: string) {
  return page.click(selector);
}, { type: "tool" });

export const bookTable = traceAgent(async (request: string) => {
  const plan = await planSteps(request);
  for (const step of plan.steps) await click(step.selector);
});`,
    py: `import uncoil

@uncoil.observe(type="tool")
def click(selector):
    return page.click(selector)

@uncoil.trace_agent()
def book_table(request):
    plan = plan_steps(request)
    for step in plan.steps:
        click(step.selector)`,
  },
  "multi-agent": {
    title: "Keep every agent in one trace.",
    lede: "Run each agent inside the same traced run and a handoff is just another span, so a dropped one is easy to spot.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const run = traceAgent(async (goal: string) => {
  const plan = await span("planner", () => planner(goal), { type: "llm", input: goal });
  const results = await Promise.all(plan.tasks.map((task) => span("worker", () => worker(task), { type: "llm" })));
  return span("reviewer", () => reviewer(results), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def run(goal):
    with uncoil.span("planner", type="llm", input=goal):
        plan = planner(goal)
    results = []
    for task in plan.tasks:
        with uncoil.span("worker", type="llm"):
            results.append(worker(task))
    with uncoil.span("reviewer", type="llm"):
        return reviewer(results)`,
  },
  mcp: {
    title: "Record every server call.",
    lede: "Wrap the call to an MCP tool and its arguments, result and timing are recorded, so a slow server stands out.",
    ts: `import { observe, traceAgent } from "uncoil-sdk";

const callMcpTool = observe(async function callMcpTool(server: string, tool: string, args: object) {
  return mcpClient.callTool({ server, name: tool, arguments: args });
}, { type: "tool" });

export const agent = traceAgent(async (request: string) => {
  const choice = await pickTool(request);
  return callMcpTool(choice.server, choice.tool, choice.args);
});`,
    py: `import uncoil

@uncoil.observe(type="tool")
def call_mcp_tool(server, tool, args):
    return mcp_client.call_tool(server, tool, args)

@uncoil.trace_agent()
def agent(request):
    choice = pick_tool(request)
    return call_mcp_tool(choice.server, choice.tool, choice.args)`,
  },
  chatbot: {
    title: "Trace every turn, not just the chat.",
    lede: "Open one trace per conversation and one span per turn, and the history each reply used is stored next to it.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const reply = traceAgent(async (history: string[], message: string) => {
  const context = await span("load-history", () => trimHistory(history), { type: "tool", input: message });
  return span("reply", () => callModel(context, message), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def reply(history, message):
    with uncoil.span("load-history", type="tool", input=message):
        context = trim_history(history)
    with uncoil.span("reply", type="llm"):
        return call_model(context, message)`,
  },
  sales: {
    title: "Put the lead and the draft in one trace.",
    lede: "Record the record lookup, the draft and the send check as spans, and every message has the data behind it.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const outreach = traceAgent(async (leadId: string) => {
  const lead = await span("load-lead", () => crm.get(leadId), { type: "tool", input: leadId });
  const draft = await span("write-draft", () => writeEmail(lead), { type: "llm" });
  return span("send-check", () => checkAndSend(lead, draft), { type: "tool" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def outreach(lead_id):
    with uncoil.span("load-lead", type="tool", input=lead_id):
        lead = crm.get(lead_id)
    with uncoil.span("write-draft", type="llm"):
        draft = write_email(lead)
    with uncoil.span("send-check", type="tool"):
        return check_and_send(lead, draft)`,
  },
  sql: {
    title: "Store the SQL exactly as it ran.",
    lede: "Wrap the schema read, the query and the explanation, and a wrong number points to the query that made it.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const ask = traceAgent(async (question: string) => {
  const sql = await span("write-sql", () => writeSql(question), { type: "llm", input: question });
  const rows = await span("run-query", () => db.query(sql), { type: "tool", input: sql });
  return span("explain", () => explain(question, rows), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def ask(question):
    with uncoil.span("write-sql", type="llm", input=question):
        sql = write_sql(question)
    with uncoil.span("run-query", type="tool", input=sql):
        rows = db.query(sql)
    with uncoil.span("explain", type="llm"):
        return explain(question, rows)`,
  },
  documents: {
    title: "Make every field traceable to its page.",
    lede: "Record the read and the extraction as separate spans, and a wrong field shows the text the model saw.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const extract = traceAgent(async (fileId: string) => {
  const pages = await span("read-pages", () => readPages(fileId), { type: "tool", input: fileId });
  const fields = await span("extract-fields", () => extractFields(pages), { type: "llm" });
  return span("validate", () => validate(fields), { type: "tool" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def extract(file_id):
    with uncoil.span("read-pages", type="tool", input=file_id):
        pages = read_pages(file_id)
    with uncoil.span("extract-fields", type="llm"):
        fields = extract_fields(pages)
    with uncoil.span("validate", type="tool"):
        return validate(fields)`,
  },
  "cost-control": {
    title: "Price every step as it runs.",
    lede: "Model calls already carry their token cost. Wrap the steps around them and the trace adds up where the money went.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const work = traceAgent(async (task: string) => {
  const plan = await span("plan", () => callModel(task), { type: "llm", input: task });
  return span("act", () => runTools(plan), { type: "tool" });
}, { environment: "production", release: "2.14" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def work(task):
    with uncoil.span("plan", type="llm", input=task):
        plan = call_model(task)
    with uncoil.span("act", type="tool"):
        return run_tools(plan)`,
  },
  release: {
    title: "Label the release once.",
    lede: "Pass a release to the SDK and every run is tagged, so two versions can be compared on the same screen.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const answer = traceAgent(async (question: string) => {
  return span("answer", () => callModel(question), { type: "llm", input: question });
}, { environment: "production", release: "2.15" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def answer(question):
    with uncoil.span("answer", type="llm", input=question):
        return call_model(question)`,
  },
  copilot: {
    title: "Record what the assistant reached for.",
    lede: "Wrap the tool choice and each access check, and a refused read is a step with a reason.",
    ts: `import { span, traceAgent } from "uncoil-sdk";

export const assist = traceAgent(async (userId: string, question: string) => {
  const tools = await span("choose-tools", () => pickTools(question), { type: "llm", input: question });
  const docs = await span("read-docs", () => readAllowed(userId, tools), { type: "tool" });
  return span("answer", () => callModel(question, docs), { type: "llm" });
}, { environment: "production" });`,
    py: `import uncoil

@uncoil.trace_agent(environment="production")
def assist(user_id, question):
    with uncoil.span("choose-tools", type="llm", input=question):
        tools = pick_tools(question)
    with uncoil.span("read-docs", type="tool"):
        docs = read_allowed(user_id, tools)
    with uncoil.span("answer", type="llm"):
        return call_model(question, docs)`,
  },
  "tool-calling": {
    title: "See the arguments the model chose.",
    lede: "Wrap each tool and the exact payload, the result and every retry are recorded, so loops and rejected schemas stand out.",
    ts: `import { observe, traceAgent } from "uncoil-sdk";

const issueRefund = observe(async function issueRefund(args: { amount: number; currency: string }) {
  return payments.refund(args);
}, { type: "tool" });

export const agent = traceAgent(async (request: string) => {
  const call = await pickTool(request);
  return issueRefund(call.args);
});`,
    py: `import uncoil

@uncoil.observe(type="tool")
def issue_refund(amount, currency):
    return payments.refund(amount, currency)

@uncoil.trace_agent()
def agent(request):
    call = pick_tool(request)
    return issue_refund(**call.args)`,
  },
};
