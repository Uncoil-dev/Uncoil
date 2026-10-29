# Blog Content Strategy — AI Agent Operations Cluster (Q4 2026)

Prepared for: Uncoil content team
Scope: 10 long-form article briefs, keyword-cluster map, topical-authority map, pillar/cluster plan, 90-day calendar, production checklist.
Status: strategy and briefs only. No articles have been drafted. All keyword-priority calls are labeled as strategic hypotheses, not measured search data — no keyword-volume or ranking-difficulty tool was queried to produce this document.

---

## 1. Executive summary

Uncoil's blog already has strong coverage of observability fundamentals (what is AI observability, AI agent monitoring, AI agent architecture), evaluation basics (AI evaluation metrics, RAG evaluation), reliability basics (retries/guardrails, regression testing, incident response), and platform comparisons (15 `*-vs-uncoil` posts). What is missing is a layer of **operational depth**: the frameworks a team reaches for once they already have an agent in production and are now responsible for classifying its failures, pricing its runs, releasing changes to it safely, and proving it is behaving the way it did last week.

The 10 topics below fill that layer. Each one gives a production-facing reader (on-call engineer, AI platform lead, eng manager approving a release) a named framework they can apply immediately, not a restatement of "why observability matters."

| # | Topic | Strategic role | Funnel stage |
|---|---|---|---|
| 1 | AI Agent Failure Taxonomy | Diagnostic reference — the page an engineer lands on mid-incident | Problem-aware |
| 2 | AI Agent Release Checklist | Operational gate — used before every prompt/model/tool change | Solution-aware / technical evaluation |
| 3 | AI Agent Trace Schema | Data-model reference — what to capture, cited by tooling docs | Technical evaluation |
| 4 | AI Agent Evaluation Datasets | Practical library — how to build test cases from real traffic | Solution-aware |
| 5 | AI Agent SLOs and Error Budgets | Decision framework — reliability targets and release gates | Technical evaluation |
| 6 | AI Agent Cost Per Task | Decision framework — unit economics beyond token price | Commercial investigation |
| 7 | AI Agent Guardrails | Definitive guide — layered safety model | Problem-aware / solution-aware |
| 8 | LLM-as-a-Judge Evaluation | Decision framework — when a model judge is trustworthy | Technical evaluation |
| 9 | AI Agent Drift Detection | Diagnostic reference — behavioral change before user reports | Problem-aware |
| 10 | AI Agent Observability vs Traditional APM | Comparison / buyer education | Commercial investigation |

**Recommended publishing order** (rationale below each brief; unchanged from the requested priority — research did not surface a reason to reorder it, since the sequence already moves from acute-pain diagnostic content toward comparison/buyer content, which is the correct order for compounding internal links into a pillar):

1. AI Agent Failure Taxonomy
2. AI Agent Release Checklist
3. AI Agent Trace Schema
4. AI Agent Evaluation Datasets
5. AI Agent SLOs and Error Budgets
6. AI Agent Cost Per Task
7. AI Agent Guardrails
8. LLM-as-a-Judge Evaluation
9. AI Agent Drift Detection
10. AI Agent Observability vs Traditional APM

---

## 2. Research assumptions and limitations

- No third-party keyword-volume, ranking-difficulty, or SERP-scraping tool was available when producing this document. Every "primary keyword" and "supporting keyword" below is a **strategic hypothesis** based on how engineers phrase these problems in documentation, GitHub issues, and forum threads — not a measured search-volume figure. Before drafting, run each primary keyword through whatever keyword tool Uncoil has access to and adjust priority if the data disagrees.
- "Competing pages fail to explain X" observations are based on the general state of the AI-observability content space (most existing public content on these 10 topics is either vendor-agnostic and shallow, or vendor blog content that stops at "use our product"), not a citation-by-citation SERP audit.
- All internal links recommended below point only to **slugs confirmed to exist** in `content/blog/*.mdoc` at the time this document was written. Re-verify with `ls content/blog/` before publishing, since slugs may change.
- No customer names, benchmark numbers, integration claims, or compliance claims are used anywhere in this document. Any such claim in a drafted article must trace to a real, citable Uncoil source at draft time.

---

## 3. Recommended publishing priority

Unchanged from the brief's requested order. Justification:

1. **Failure Taxonomy** first — it is the highest-frequency real-world query shape ("why did my agent do X") and the natural landing page for an incident, so it earns organic traffic and repeat visits fastest.
2. **Release Checklist** second — every reader of the Failure Taxonomy who wants to prevent the next incident is one click from a release process; strong internal-link pair.
3. **Trace Schema** third — the Failure Taxonomy and Release Checklist both quote trace evidence; readers will ask "what should my trace actually record," so publishing this while the first two are fresh completes the diagnostic trio.
4. **Evaluation Datasets** fourth — once a team has fixed a failure and defined a release gate, the next question is "how do I stop this from regressing," which is a dataset problem.
5. **SLOs and Error Budgets** fifth — requires the vocabulary built by 1–4 (failure types, release gates, trace fields, eval datasets) to be genuinely useful rather than abstract.
6. **Cost Per Task** sixth — a distinct but related operational metric; benefits from the failure/retry vocabulary already established.
7. **Guardrails** seventh — broadens from reliability into safety; natural next step once release and eval processes exist.
8. **LLM-as-a-Judge** eighth — a deeper, narrower evaluation-methodology piece; best read by people who already found the Evaluation Datasets article useful.
9. **Drift Detection** ninth — a monitoring-maturity topic that assumes SLOs and baselines already exist.
10. **Observability vs APM** last — a buyer-education/comparison piece that benefits from linking back into the entire cluster once it exists, making it the strongest possible entry point for a commercial-investigation reader who then has nine deep articles to fall into.

---

## 4. Topic 1 — AI Agent Failure Taxonomy

1. **Working title:** AI Agent Failure Taxonomy: 12 Failure Modes Every Production Team Should Track
2. **Alternative SEO title:** Why AI Agents Fail: A 12-Type Failure Taxonomy for Production Teams
3. **Slug:** `ai-agent-failure-modes`
4. **Primary keyword:** ai agent failure modes
5. **Secondary keyword cluster:** why do ai agents fail, ai agent errors in production, ai agent reliability problems, production ai agent debugging, agent failure root cause
6. **Search intent:** Informational, leaning problem-aware (reader has just experienced or is investigating a failure).
7. **Target reader:** Mid-to-senior backend or platform engineer who owns an agent in production and is mid-incident or writing a postmortem; secondarily, an EM triaging an on-call rotation for AI systems.
8. **Reader job:** Classify an observed bad outcome into a known failure type fast enough to route it to the right owner and start a fix.
9. **Promised outcome:** The reader leaves able to name the failure type, know which trace fields prove it, and know which team (model/prompt, retrieval, tool integration, platform, or product) owns the fix.
10. **Boundary:** Covers a taxonomy of behavioral failure modes observable in a trace and how to diagnose them. Does not cover general SRE reliability engineering (that's Topic 5), does not re-explain retries/guardrails patterns already covered in `ai-agent-reliability-failures-retries-guardrails`, and does not cover infrastructure failures unrelated to agent behavior.
11. **Archetype:** Practical library (taxonomy + diagnostic reference), with a decision-tree component.
12. **Search-intent rationale:** "Why did my agent do X" queries are typed mid-incident — the reader wants a name for what they're seeing and a next step, not a conceptual overview. A taxonomy-plus-decision-tree format matches that intent better than a narrative guide.
13. **Direct AEO answer (40-70 words):** AI agent failures generally fall into 12 types: model reasoning errors, hallucinated facts, retrieval misses, stale retrieval, tool-selection errors, tool-execution errors, permission/authorization failures, context-window truncation, infinite or repeated-call loops, human-approval bottlenecks, output-format violations, and cascading multi-step failures. Each has distinct trace evidence and a different owning team.
14. **AEO questions the article must answer:**
    - What are the most common ways AI agents fail in production?
    - What is the difference between a model failure and a tool failure?
    - How do you tell a retrieval failure from a hallucination in a trace?
    - What causes an AI agent to loop or repeat the same tool call?
    - Who should own a permission/authorization failure?
    - What trace evidence proves a context-window truncation failure?
    - How do you turn a production failure into a regression test?
    - Is every wrong answer from an LLM a hallucination?
15. **Featured-snippet opportunities:** Definition paragraph near the top; numbered 12-item list for the taxonomy; comparison table for symptom to likely cause to evidence to owner; FAQ block at the end.
16. **Detailed H2/H3 outline:**
    - H2: What counts as an AI agent failure (and what doesn't)
      - H3: Failure vs. degraded quality vs. user dissatisfaction
      - H3: Why "hallucination" is overused as a catch-all label
    - H2: The 12-type failure taxonomy at a glance (table)
    - H2: Model and reasoning failures
      - H3: Reasoning errors vs. hallucinated facts
      - H3: Trace evidence: model span inputs, outputs, and confidence signals
    - H2: Retrieval failures
      - H3: Retrieval miss vs. stale retrieval vs. irrelevant retrieval
    - H2: Tool-calling failures
      - H3: Tool-selection error vs. tool-execution error
      - H3: Argument-construction failures
    - H2: Permission and authorization failures
    - H2: Context and memory failures
      - H3: Context-window truncation
      - H3: Cross-session memory bleed
    - H2: Loop and repetition failures
    - H2: Human-approval and escalation failures
    - H2: Output-contract and formatting failures
    - H2: Cascading and multi-step failures
    - H2: From symptom to root cause: a diagnostic decision tree
    - H2: Who owns each failure type
    - H2: Turning a failure into a regression test
    - H2: Worked incident: a support agent that keeps re-opening resolved tickets
    - H2: FAQ
17. **Unique framework:** The 12-Type Agent Failure Taxonomy, a single reference table with columns: Failure type, one-line definition, primary trace evidence, typical owning team, suggested regression-test type.
18. **Opening angle:** An on-call engineer is paged because a support agent gave a customer an outdated refund policy. The trace shows the model call succeeded, tokens and latency were normal — standard APM sees nothing wrong. The failure is stale retrieval, invisible to infrastructure monitoring.
19. **Evidence plan:** The 12-type reference table; a symptom-to-root-cause-to-evidence-to-owner table; a decision-tree diagram; one fully worked incident with an illustrative trace excerpt; a checklist for converting an incident into a regression test.
20. **Code guidance:** One illustrative JSON trace excerpt contrasting a tool-selection failure with a tool-execution failure. Label explicitly as illustrative, not sampled from a live Uncoil trace.
21. **Purposeful interaction — Failure Classifier:** Reader picks one of 5-6 short symptom descriptions from a dropdown. It teaches the same diagnostic questions the article's decision tree uses and lands on one of the 12 failure types with a one-line justification. Default state: no symptom selected. Deterministic fixed lookup table, entirely client-side, no secrets or network calls. Static fallback: the same mapping shown as a table if scripting is unavailable.
22. **Hero image concept:** A stylized trace waterfall where exactly one span among eight or nine is highlighted in the failure color, with an annotation callout — "one failure, buried in a normal-looking run."
23. **In-article visuals:** (1) The 12-type taxonomy as a designed reference table near the top. (2) Past the midpoint: a before/after trace comparison for the worked incident, healthy vs. stale-retrieval trace side by side.
24. **Internal-link strategy:**
    - In the model/reasoning-failures section, link "debugging a production agent" to `/blog/debug-ai-agents-in-production`.
    - In "who owns each failure type," link "retry and fallback policy" to `/blog/ai-agent-reliability-failures-retries-guardrails`.
    - In "turning a failure into a regression test," link "regression testing for agents" to `/blog/ai-agent-regression-testing`.
    - In the worked incident, link "incident response for AI agents" to `/blog/ai-agent-incident-response`.
25. **CTA:** "See what a failed run's full trace actually looks like" linking to the Trace Viewer product page. Not a signup push.
26. **Conversion role:** Problem awareness to technical evaluation. Top of the funnel for the entire cluster.
27. **Metadata:**
    - Meta title: "AI Agent Failure Modes: A 12-Type Taxonomy" (44 chars)
    - Meta description: "12 named AI agent failure types, the trace evidence that proves each one, and who should own the fix. A practical diagnostic reference." (140 chars)
    - Social title: "Why Did Your AI Agent Just Do That?"
    - Social description: "A 12-type taxonomy for classifying AI agent failures fast, from stale retrieval to tool-call loops, with the trace evidence for each."
28. **FAQ (exactly 5):**
    - Is every wrong AI agent answer a hallucination? No; hallucination is one specific failure type. Retrieval, tool, permission, and context failures produce wrong answers without the model inventing anything.
    - How do I tell a tool-selection failure from a tool-execution failure? Selection means the wrong tool was called; execution means the right tool was called with bad arguments or it errored.
    - What causes an AI agent to loop? Usually a tool result the model doesn't recognize as satisfying the goal, so it retries a similar call; the trace shows repeated near-identical spans.
    - Who owns a retrieval failure? Typically whoever owns the retrieval/indexing pipeline, since the model behaved reasonably given bad or missing context.
    - How do I convert a failure into a regression test? Capture the input, expected behavior, and failure signature, then add it as a dataset case scored by a deterministic or model-based evaluator.
29. **Schema recommendation:** Article + FAQPage. No HowTo, no SoftwareApplication claim.
30. **Risks:** Cannibalization risk with `ai-agent-reliability-failures-retries-guardrails` — mitigate by keeping this strictly diagnostic/taxonomic. Unsupported-claims risk: no frequency percentages without a named source. Topic-breadth risk is moderate; keep each of the 12 types to one short subsection.
31. **Editorial differentiation:** Most public content on "AI agent failures" is a listicle with no trace-level diagnostic detail and no ownership guidance. This article's differentiation is the ownership column and the regression-test conversion step.
32. **Writer handoff:** Use realistic but entirely fictional trace shapes, never customer data. Cross-check every failure-type name against `ai-agent-reliability-failures-retries-guardrails` and `debug-ai-agents-in-production` before drafting so this becomes the taxonomy those articles link back to, not a restatement of them.
---

## 5. Topic 2 — AI Agent Release Checklist

1. **Working title:** AI Agent Release Checklist: What to Verify Before Changing a Prompt, Model, or Tool
2. **Alternative SEO title:** The Pre-Release Checklist for Prompt, Model, and Tool Changes
3. **Slug:** `ai-agent-release-checklist`
4. **Primary keyword:** ai agent release checklist
5. **Secondary cluster:** deploy ai agent to production, prompt change testing, model change checklist, production ai deployment, rolling out a new model version
6. **Search intent:** Informational + technical evaluation (reader is about to ship a change and wants a process, not a product).
7. **Target reader:** Engineer or eng lead about to change a prompt, swap a model, or add/modify a tool on a live agent.
8. **Reader job:** Decide what must be verified before shipping a specific class of change, and what conditions should trigger a rollback.
9. **Promised outcome:** A repeatable, change-type-specific checklist plus a rollback trigger they can attach to any release.
10. **Boundary:** Covers the verification and rollout process for prompt/model/tool/retrieval/orchestration changes specifically. Does not duplicate `ai-agent-production-checklist` (which covers first-time production readiness, not iterative releases) and does not cover general CI/CD infrastructure.
11. **Archetype:** Implementation tutorial / decision framework (checklist-driven).
12. **Search-intent rationale:** "Checklist" and "what to verify before" queries are inherently procedural — a numbered, change-type-branching checklist outperforms a narrative guide for both ranking and usefulness.
13. **Direct AEO answer:** Before releasing a prompt, model, or tool change to an AI agent, verify: the change passes a representative evaluation dataset, contract/output-format checks still hold, the change is exposed to a small traffic slice first, monitoring and rollback triggers are active, and an owner is assigned for the release window.
14. **AEO questions:** What should you test before changing an AI agent's prompt? Do you need to re-evaluate an agent after a model version upgrade? What is staged exposure for an AI agent release? What triggers a rollback for an agent release? Who should own an AI agent release? How is releasing a tool change different from releasing a prompt change? What monitoring should be active during a release window?
15. **Featured-snippet opportunities:** Step-by-step numbered checklist (primary target), a change-type comparison table (prompt vs. model vs. tool vs. retrieval), FAQ.
16. **Outline:**
    - H2: What "release" means for an AI agent (not just code deploys)
    - H2: The five change types and why each needs different checks
      - H3: Prompt changes · H3: Model changes · H3: Tool changes
    - H2: Pre-release: contract and format checks
    - H2: Pre-release: representative evaluation
    - H2: Staged exposure: how much traffic, for how long
    - H2: Monitoring during the release window
    - H2: Rollback triggers and who pulls them
    - H2: Post-release review
    - H2: Ownership: who is on point during a release
    - H2: The release-readiness checklist (interaction)
    - H2: Worked example: swapping a model version on a support agent
    - H2: FAQ
17. **Unique framework:** The **Change-Type Release Matrix** — rows are the five change types (prompt, model, tool, retrieval, orchestration), columns are required checks (contract check, eval suite, staged exposure, rollback trigger, owner), cells marked required/recommended/optional per change type, since a tool change and a model upgrade do not need identical gates.
18. **Opening angle:** A team upgrades to a newer model version expecting a quality improvement; two days later, cost per run has tripled because the new model calls a search tool far more often. Nothing crashed, no alert fired — it's a release process gap, not a bug.
19. **Evidence plan:** The Change-Type Release Matrix table; a numbered release checklist; a worked before/after cost and quality comparison; a rollback-trigger table (metric, threshold, action).
20. **Code guidance:** An illustrative config snippet showing a staged-exposure percentage and rollback threshold as declarative fields (not tied to a specific vendor API) — labeled illustrative.
21. **Purposeful interaction — Release Readiness Checklist:** Reader selects a change type (prompt / model / tool / retrieval / orchestration) from a control; the page reveals the matching subset of the Change-Type Release Matrix as a checkable list. Teaches that release gates are not one-size-fits-all. Deterministic, client-side, no network calls; static fallback shows the full matrix table.
22. **Hero image concept:** A branching rail/gate diagram — a single "change" entering from the left, passing through four gate checkpoints (contract, eval, staged exposure, monitoring) before reaching "100% traffic," with one branch shown diverting to "rollback."
23. **In-article visuals:** (1) The Change-Type Release Matrix as a formatted table near the top. (2) Past the midpoint: the worked model-upgrade scenario shown as a before/after cost-and-quality comparison chart.
24. **Internal links:** "first-time production readiness" → `/blog/ai-agent-production-checklist`; "prompt versioning" → `/blog/prompt-versioning-and-prompt-management`; "rollback strategy" → `/blog/agent-deployment-rollback-strategies`; "regression testing before a release" → `/blog/ai-agent-regression-testing`.
25. **CTA:** "Compare the release against real trace evidence before and after" → Runtime Control / Trace Viewer product pages.
26. **Conversion role:** Solution-aware → technical evaluation.
27. **Metadata:** Title "AI Agent Release Checklist: What to Verify First" (46 chars). Description: "A change-type-specific checklist for releasing prompt, model, and tool changes safely, with rollback triggers and staged exposure guidance." (146 chars). Social title: "Before You Ship That Prompt Change." Social description: "A release checklist built around what actually differs between prompt, model, and tool changes to an AI agent."
28. **FAQ (5):** Do you need a different checklist for a prompt change vs. a model change? Yes — a model change needs a full re-evaluation since underlying behavior can shift broadly, while a small prompt tweak may only need targeted regression cases. — What is staged exposure? Releasing a change to a small percentage of traffic before full rollout, so a regression is caught on a small blast radius. — What should trigger an automatic rollback? A defined threshold breach in error rate, cost per run, or evaluation score, agreed before the release, not decided in the moment. — Who owns an AI agent release? Whoever is actively watching monitoring during the exposure window, named before the release starts. — Does every AI agent change need a staged rollout? No — low-risk changes with strong eval coverage can sometimes go straight to full traffic, but the decision should be explicit, not a default.
29. **Schema:** Article + FAQPage + HowTo (the checklist is a genuine linear procedure).
30. **Risks:** Cannibalization with `ai-agent-production-checklist` — mitigate by scoping this strictly to *iterative* releases on an already-live agent, not first launch. Risk of becoming outdated if tied to specific vendor deployment tools — keep it vendor-agnostic.
31. **Editorial differentiation:** Most "AI deployment checklist" content online is generic MLOps advice not specific to agent behavior (tool calls, retrieval, orchestration). The Change-Type Release Matrix is the differentiator.
32. **Writer handoff:** Keep every checklist item actionable and falsifiable (something a reader can literally check off), not aspirational advice. Cross-reference `ai-agent-production-checklist` while drafting to guarantee no overlap in scope.

---

## 6. Topic 3 — AI Agent Trace Schema

1. **Working title:** AI Agent Trace Schema: What to Capture for Debugging, Evaluation, and Cost Analysis
2. **Alternative SEO title:** The Minimum Trace Data Model for AI Agents
3. **Slug:** `ai-agent-trace-schema`
4. **Primary keyword:** ai agent trace schema
5. **Secondary cluster:** llm trace fields, what to log for ai agents, agent observability data model, ai agent tracing fields, span vs trace vs run
6. **Search intent:** Informational + technical evaluation (often searched while building internal instrumentation).
7. **Target reader:** Platform/infra engineer instrumenting an agent for the first time, or evaluating whether their current logging is sufficient.
8. **Reader job:** Decide exactly which fields to capture at the run, trace, span, and event level so debugging, evaluation, and cost analysis are all possible later without re-instrumenting.
9. **Promised outcome:** A concrete field list they can implement, with the reasoning for each field so they can extend it correctly for their own system.
10. **Boundary:** Covers a practical data model (definitions + field list + illustrative JSON) for what to capture. Does not re-explain OpenTelemetry semantics in depth (that's `opentelemetry-llm-tracing`) or MCP-specific tracing (`mcp-observability-guide`) — this article is the vendor-neutral field-level reference those two can point back to.
11. **Archetype:** Practical library / reference (with a "minimum viable schema" framing).
12. **Search-intent rationale:** "What fields should I log" is a builder's question asked once, early, and referenced repeatedly — a reference-style article with a clear schema table earns bookmarks and backlinks better than a tutorial.
13. **Direct AEO answer:** A minimum AI agent trace schema captures four levels: run (top-level goal, user, outcome), trace (one end-to-end execution), span (one model, tool, or retrieval call with timing and status), and event (a discrete occurrence inside a span, like a retry). Each span should record identity, inputs, outputs, timing, cost, and status.
14. **AEO questions:** What is the difference between a run, a trace, a span, and an event? What fields does an AI agent trace need to support debugging? What fields does an AI agent trace need to support cost analysis? Should you log full prompts and completions? What is a correlation ID and why does an agent trace need one? How do you redact sensitive data in a trace without losing debuggability? What is the difference between required and optional trace fields?
15. **Featured-snippet opportunities:** Definition paragraph for run/trace/span/event; a required-vs-optional field table; a step-by-step "how to instrument a new span" list; FAQ.
16. **Outline:**
    - H2: Run, trace, span, and event — definitions
    - H2: Why a data model matters before you pick a tracing tool
    - H2: Required fields for every span
    - H2: Model-call-specific fields
    - H2: Tool-call-specific fields
    - H2: Retrieval-specific fields
    - H2: Correlation, versioning, and release metadata
    - H2: Privacy, redaction, and retention boundaries
      - H3: What not to log by default
      - H3: Retention windows and why they matter
    - H2: An illustrative trace schema (JSON)
    - H2: Using the schema for debugging vs. evaluation vs. cost analysis
    - H2: Trace-field explorer (interaction)
    - H2: FAQ
17. **Unique framework:** The **Run/Trace/Span/Event data model**, plus a "three uses, one schema" framing showing how the same fields serve three different jobs (debugging, evaluation, cost) rather than needing three separate logging systems.
18. **Opening angle:** A team wants to know why their agent got expensive last week, opens their logs, and finds prompts and completions but no per-call cost, no correlation ID linking retries together, and no tool-argument capture — the debugging data existed, the cost and evaluation data didn't, because the schema was designed around one use case only.
19. **Evidence plan:** A required-vs-optional field table per span type; an illustrative JSON trace document; a redaction-boundary table (field, sensitivity, default handling); a short worked "same trace, three questions" walkthrough (debug/evaluate/cost from one document).
20. **Code guidance:** One illustrative JSON schema excerpt for a single trace with two child spans (a model call and a tool call), explicitly labeled illustrative and not a tested production schema.
21. **Purposeful interaction — Trace-Field Explorer:** Reader clicks between three toggles ("I need to debug," "I need to evaluate," "I need to analyze cost"); the same illustrative trace JSON re-highlights the subset of fields relevant to that job. Teaches that one well-designed schema serves all three without duplication. Deterministic, client-side highlighting only, no data leaves the page. Static fallback: three annotated copies of the JSON side by side.
22. **Hero image concept:** An exploded-view diagram of one trace document, unfolding from Run → Trace → Span → Event like nested boxes, each labeled with its 2-3 defining fields.
23. **In-article visuals:** (1) The nested run/trace/span/event diagram near the top. (2) Past the midpoint: the "same trace, three questions" highlighted-JSON visual.
24. **Internal links:** "LLM tracing fundamentals" → `/blog/llm-tracing-explained`; "OpenTelemetry for LLM tracing" → `/blog/opentelemetry-llm-tracing`; "MCP observability" → `/blog/mcp-observability-guide`; "debugging a production agent" → `/blog/debug-ai-agents-in-production`.
25. **CTA:** "See how a full trace schema renders in a real trace view" → Trace Viewer product page.
26. **Conversion role:** Technical evaluation — read by people actively deciding on instrumentation.
27. **Metadata:** Title "AI Agent Trace Schema: What to Log and Why" (44 chars). Description: "A practical run/trace/span/event data model for AI agents, with the fields that support debugging, evaluation, and cost analysis." (140 chars). Social title: "What Should Actually Be in an AI Agent Trace?" Social description: "A field-level reference for instrumenting AI agents so one trace schema supports debugging, evaluation, and cost analysis."
28. **FAQ (5):** What is the difference between a trace and a span? A trace is one end-to-end execution; a span is one operation inside it, like a single model or tool call. — Should you log full prompts and completions? Generally yes for debuggability, with redaction applied to known-sensitive fields before storage, not omission of the field entirely. — What is a correlation ID? An identifier that ties retries, fallbacks, and related spans back to the same logical run so they can be reconstructed later. — Do you need a different schema for RAG agents? No — retrieval is modeled as a specific span type with its own optional fields, not a separate schema. — How long should traces be retained? There's no universal answer; retention should be set deliberately based on debugging needs, storage cost, and data-handling policy, not left as a default.
29. **Schema:** Article + FAQPage. No HowTo (reference, not a procedure) and no SoftwareApplication claim.
30. **Risks:** Must not imply the schema is an official or industry-standard spec — always frame as "a practical minimum," not "the standard." Overlaps conceptually with `llm-tracing-explained` and `opentelemetry-llm-tracing` — mitigate by making this the field-level reference those articles can cite rather than repeating their conceptual explanations.
31. **Editorial differentiation:** Most tracing content explains *why* tracing matters; almost none gives a concrete, opinionated field list. This article's differentiation is being copy-pasteable as a starting schema.
32. **Writer handoff:** Keep the JSON illustrative and clearly labeled; do not claim it matches any specific Uncoil internal format unless verified with engineering at draft time.

---

## 7. Topic 4 — AI Agent Evaluation Datasets

1. **Working title:** AI Agent Evaluation Datasets: How to Build Test Cases From Real User Interactions
2. **Alternative SEO title:** Turning Production Traces Into an AI Agent Evaluation Dataset
3. **Slug:** `ai-agent-evaluation-datasets`
4. **Primary keyword:** ai agent evaluation dataset
5. **Secondary cluster:** llm evaluation dataset, ai agent test cases, evaluation dataset design, production data for ai evaluations, building eval sets from user traffic
6. **Search intent:** Informational + solution-aware (reader already knows they need eval, wants a construction method).
7. **Target reader:** Engineer or applied-AI practitioner who has an evaluation *framework* (metrics, scoring) but an empty or thin dataset.
8. **Reader job:** Build a representative, versioned dataset from real traces, failures, and escalations without simply dumping raw production data into a test set.
9. **Promised outcome:** A repeatable process for turning five specific production signal types into dataset cases, plus a schema for the cases themselves.
10. **Boundary:** Covers dataset *construction* — sourcing, sanitizing, categorizing, versioning. Does not cover evaluator design or scoring methodology (that's `ai-evaluation-metrics` and `ai-agent-evaluation-practical-guide`), and does not give legal advice on privacy — it states sanitization as a practice, not a compliance guarantee.
11. **Archetype:** Practical library / implementation tutorial.
12. **Search-intent rationale:** "How to build" is a construction query — readers want a schema and a process, which favors a tutorial-with-schema format over a conceptual overview.
13. **Direct AEO answer:** Build an AI agent evaluation dataset by sourcing cases from five signal types: user-reported failures, low human-review scores, expensive or retried runs, tool-call errors, and random production sampling. Sanitize sensitive fields, tag each case by failure category, and version the dataset so evaluation results stay comparable across releases.
14. **AEO questions:** What makes a good AI agent evaluation dataset? Should evaluation data come from real production traffic or synthetic examples? How many test cases does an AI agent evaluation dataset need? How do you sanitize production data for an evaluation set? What is dataset versioning and why does it matter for AI evaluation? How do you know if an evaluation dataset is representative? Should failed runs be overrepresented in an evaluation dataset?
15. **Featured-snippet opportunities:** Definition paragraph; a five-signal-source bulleted list; a test-case schema table; a step-by-step "from trace to test case" numbered process; FAQ.
16. **Outline:**
    - H2: What makes an evaluation dataset useful (not just large)
    - H2: Five sources of real signal to mine
      - H3: User-reported failures · H3: Low-scoring human reviews · H3: Expensive or retried runs · H3: Tool-call errors · H3: Representative random sampling
    - H2: A test-case schema
    - H2: Sanitizing production data before it becomes a test case
    - H2: Positive, negative, edge, and adversarial cases
    - H2: Representativeness: how much is enough, and of what
    - H2: Versioning and ownership
    - H2: From trace to test case: a worked example
    - H2: Evaluation-case builder (interaction)
    - H2: FAQ
17. **Unique framework:** The **Five-Signal Sourcing Model** (failure reports, low review scores, expensive/retried runs, tool errors, random sampling) mapped to a single test-case schema (input, expected behavior, category, source signal, sanitization status, version).
18. **Opening angle:** A team's evaluation dataset has 40 cases, all written by hand months ago, and none of them catch the tool-call regression that just shipped — because the dataset was authored from imagination, not from what the agent actually encounters in production.
19. **Evidence plan:** The test-case schema table; the five-signal sourcing table; a sanitization checklist; a worked before/after (raw trace → sanitized, categorized test case).
20. **Code guidance:** An illustrative test-case JSON object (input, expected behavior, category, source, version) — labeled illustrative.
21. **Purposeful interaction — Evaluation-Case Builder:** Reader picks a source signal type (e.g., "tool-call error") from a control; the tool shows which fields of a sample trace should be extracted into a test case and which should be redacted, using a fixed illustrative trace. Teaches the sourcing-to-schema mapping concretely. Deterministic, client-side, no real data. Static fallback: the same mapping as a table.
22. **Hero image concept:** A funnel diagram — five labeled input streams (failures, low scores, expensive runs, tool errors, random sample) converging into one versioned dataset icon.
23. **In-article visuals:** (1) The five-signal sourcing table near the top. (2) Past the midpoint: the worked raw-trace-to-test-case transformation shown as an annotated before/after.
24. **Internal links:** "evaluation metrics and scoring" → `/blog/ai-evaluation-metrics`; "the broader evaluation practice" → `/blog/ai-agent-evaluation-practical-guide`; "RAG-specific evaluation" → `/blog/rag-evaluation-guide`; "regression testing" → `/blog/ai-agent-regression-testing`.
25. **CTA:** "See how production traces can be promoted into a dataset" → Evaluation Engine product page.
26. **Conversion role:** Solution-aware → technical evaluation.
27. **Metadata:** Title "AI Agent Evaluation Datasets: A Sourcing Guide" (48 chars). Description: "How to build a representative AI agent evaluation dataset from real traces, failures, and escalations instead of hand-written guesses." (144 chars). Social title: "Your Eval Dataset Should Come From Production." Social description: "Five real signal sources for building an AI agent evaluation dataset that actually catches regressions."
28. **FAQ (5):** Should all production data go directly into an evaluation set? No — it should be sampled, sanitized, and categorized deliberately, not copied wholesale, both for privacy and for dataset balance. — Is synthetic data worse than real data for evaluation? Not inherently; synthetic cases are useful for edge and adversarial coverage that real traffic may not yet contain, but real traces anchor the dataset to what actually happens. — How many test cases are enough? There's no universal number — enough to cover each known failure category with more than one example, growing over time rather than fixed upfront. — Who should own the evaluation dataset? Typically whoever owns agent quality end to end, with contributions from anyone who can identify a new failure case. — How often should a dataset be versioned? Whenever cases are added, removed, or reclassified, so evaluation scores stay comparable across releases.
29. **Schema:** Article + FAQPage.
30. **Risks:** Do not give privacy/legal guidance beyond "sanitize before storing" — no compliance claims. Cannibalization risk with `ai-agent-evaluation-practical-guide` — mitigate by keeping this strictly about dataset *sourcing and construction*, not evaluator or scoring design.
31. **Editorial differentiation:** Most evaluation content focuses on scoring methodology; almost none addresses where the test cases themselves should come from. The Five-Signal Sourcing Model is the differentiator.
32. **Writer handoff:** Do not describe any specific sanitization technique as legally sufficient — frame all privacy guidance as a starting practice, and recommend the reader involve their own legal/privacy function for real production data.

---

## 8. Topic 5 — AI Agent SLOs and Error Budgets

1. **Working title:** AI Agent SLOs and Error Budgets: A Practical Reliability Framework
2. **Alternative SEO title:** Setting SLOs and Error Budgets for AI Agents
3. **Slug:** `ai-agent-slos-error-budgets`
4. **Primary keyword:** ai agent slos
5. **Secondary cluster:** error budgets for ai systems, ai agent service level objectives, ai reliability metrics, production ai reliability targets
6. **Search intent:** Informational + technical evaluation (SRE-minded readers adapting a known framework to a new system type).
7. **Target reader:** Platform/SRE-adjacent engineer or eng lead who already thinks in SLOs for traditional services and wants to apply the same discipline to an AI agent.
8. **Reader job:** Define SLIs/SLOs that capture AI-specific failure (not just uptime) and decide what happens operationally when an error budget is spent.
9. **Promised outcome:** A worked example of SLI/SLO definitions across four indicator types plus an error-budget policy they can adapt.
10. **Boundary:** Covers reliability-target design specific to agent behavior (quality, not just infrastructure). Does not re-explain general SRE/error-budget theory from scratch, and does not replace `ai-agent-reliability-failures-retries-guardrails` (which covers retry/fallback mechanics, not target-setting).
11. **Archetype:** Decision framework.
12. **Search-intent rationale:** Readers searching "AI agent SLOs" already know SRE vocabulary; the value is in the AI-specific adaptation, so the article should assume SLO literacy and go straight to what's different.
13. **Direct AEO answer:** AI agent SLOs should cover four indicator types: availability (is the agent responding), reliability (are runs completing without error), quality (are outputs correct and well-formed), and efficiency (cost and latency per successful task). An error budget is the acceptable rate of failure across all four before release velocity is deliberately slowed.
14. **AEO questions:** What is an SLO for an AI agent? How is an AI agent SLO different from a traditional service SLO? What counts as a "failure" for AI agent reliability purposes? What is an error budget and how does it apply to AI quality issues? What happens when an AI agent's error budget is exhausted? Can AI output quality be represented by a single metric? How do you set an SLO threshold without historical data?
15. **Featured-snippet opportunities:** Definition paragraph; a four-indicator-type table; a step-by-step SLO-definition process; FAQ.
16. **Outline:**
    - H2: Why traditional uptime SLOs miss most AI agent failure
    - H2: Four indicator types: availability, reliability, quality, efficiency
    - H2: Writing an SLI: from vague goal to measurable signal
    - H2: Setting an SLO threshold without historical data
    - H2: Error budgets: definition and policy
    - H2: Quality failures vs. infrastructure failures
    - H2: What happens when the budget is spent
    - H2: SLO design worksheet (interaction)
    - H2: Worked example: an internal support agent's SLO set
    - H2: FAQ
17. **Unique framework:** The **Four-Indicator SLO Model** (availability / reliability / quality / efficiency), each with an example SLI, example SLO, and example error-budget policy row in one reference table.
18. **Opening angle:** A team has 99.9% uptime on their agent's API and a green infrastructure dashboard, yet support tickets about wrong answers are climbing — because uptime was the only SLO they ever defined, and nothing measured whether the agent was right.
19. **Evidence plan:** The Four-Indicator SLO Model table; a worked SLI/SLO/error-budget example set for one fictional agent; a decision table for "budget spent → what action."
20. **Code guidance:** An illustrative SLO config snippet (YAML-like) declaring one SLI/SLO pair per indicator type — labeled illustrative, vendor-neutral.
21. **Purposeful interaction — SLO Design Worksheet:** Reader picks an indicator type (availability/reliability/quality/efficiency); the tool shows a fill-in template (SLI definition, suggested measurement window, example threshold range) for that type only. Teaches that each indicator type needs a structurally different SLI. Deterministic, client-side, no data collection. Static fallback: all four templates shown as one table.
22. **Hero image concept:** A budget/gauge visual — four small gauges (availability, reliability, quality, efficiency) feeding into one larger "error budget" meter, one gauge shown in the red.
23. **In-article visuals:** (1) The Four-Indicator SLO Model table near the top. (2) Past the midpoint: the worked example's error-budget-over-time chart showing a release event that consumed the budget.
24. **Internal links:** "observability metrics that matter" → `/blog/ai-observability-metrics-that-matter`; "incident response" → `/blog/ai-agent-incident-response`; "retries, fallbacks, and guardrails" → `/blog/ai-agent-reliability-failures-retries-guardrails`; "AI agent monitoring" → `/blog/ai-agent-monitoring`.
25. **CTA:** "Track error-budget-relevant metrics against real run data" → Cost Dashboard / Runtime Control product pages.
26. **Conversion role:** Technical evaluation.
27. **Metadata:** Title "AI Agent SLOs and Error Budgets Explained" (43 chars). Description: "A four-indicator SLO framework for AI agents covering availability, reliability, quality, and efficiency, with a worked error-budget example." (147 chars). Social title: "Uptime Isn't the Only SLO Your Agent Needs." Social description: "A practical SLO and error-budget framework built for AI agent quality failures, not just infrastructure failures."
28. **FAQ (5):** What is an SLO for an AI agent? A measurable target for how reliably an agent performs across availability, reliability, quality, and efficiency indicators, not just whether its API responds. — Is uptime enough to measure AI agent reliability? No — an agent can be fully available and still produce wrong or unsafe outputs, which uptime alone cannot detect. — What is an error budget? The acceptable amount of SLO-violating behavior allowed before a team deliberately slows down releases to focus on reliability. — Can AI quality be captured by one metric? No — quality typically needs multiple SLIs (accuracy, format compliance, safety) rather than a single score. — How do you set an SLO threshold with no historical data? Start with a conservative estimate from a short observation period, then revise it once real distribution data exists, treating the first threshold as provisional.
29. **Schema:** Article + FAQPage.
30. **Risks:** Must avoid stating universal threshold numbers (e.g., "99.9% is the standard") without context — every example must be explicitly a worked hypothetical, not a benchmark. Overlaps with observability-metrics content — mitigate by keeping this strictly about target-setting and budget policy, not general metric definitions.
31. **Editorial differentiation:** SRE error-budget content is abundant for traditional services; almost none adapts it to AI-specific quality failure. The Four-Indicator Model is the differentiator.
32. **Writer handoff:** Keep every numeric threshold example clearly hypothetical ("a team might set..."), never presented as an industry-standard figure.

---

## 9. Topic 6 — AI Agent Cost Per Task

1. **Working title:** AI Agent Cost Per Task: How to Measure Unit Economics Beyond Token Usage
2. **Alternative SEO title:** AI Agent Unit Economics: Cost Per Successful Task, Not Per Token
3. **Slug:** `ai-agent-cost-per-task`
4. **Primary keyword:** ai agent cost per task
5. **Secondary cluster:** ai agent unit economics, llm cost per workflow, calculate ai agent cost, reduce ai agent operating costs
6. **Search intent:** Commercial investigation + informational (often a finance/eng-lead question, "what does this actually cost us").
7. **Target reader:** Eng lead, product owner, or FinOps-adjacent engineer trying to explain or forecast agent operating cost beyond a token-price line item.
8. **Reader job:** Calculate a defensible cost-per-successful-task figure that includes retries, failures, and tool/API cost, not just model tokens.
9. **Promised outcome:** A formula and worked example the reader can adapt to their own workflow, plus a segmentation method for finding where cost concentrates.
10. **Boundary:** Covers cost *measurement* and *segmentation* methodology. Does not repeat general LLM cost-reduction tactics already in `reduce-llm-costs-without-hurting-quality`, and does not use the existing `ai-agent-cost-calculator` post's interactive calculator angle — this is the unit-economics *methodology* piece that calculator can link back to.
11. **Archetype:** Decision framework (formula-driven).
12. **Search-intent rationale:** "Cost per task" is a unit-economics framing distinct from "reduce my LLM bill" — it signals a reader building a model or justifying budget, which favors a formula-and-worked-example format over a tips list.
13. **Direct AEO answer:** Cost per successful task equals total workflow cost (model calls, tool/API calls, retries, and failed attempts) divided by the number of successfully completed tasks in that period — not total cost divided by total runs. This distinction matters because retries and failed runs still cost money but produce no successful outcome.
14. **AEO questions:** What is cost per task for an AI agent? Why isn't token cost alone a good cost metric? How do you account for failed runs in AI agent cost? What is the difference between cost per run and cost per successful task? How do retries affect AI agent unit economics? How should AI agent cost be segmented for analysis? Can two workflows with the same token usage have different real costs?
15. **Featured-snippet opportunities:** Formula (primary target); a cost-waterfall table; a segmentation table (by workflow, model, customer, failure type); FAQ.
16. **Outline:**
    - H2: Why token cost alone misrepresents AI agent spend
    - H2: The cost-per-successful-task formula
    - H2: What belongs in "total cost": a cost waterfall
      - H3: Model calls · H3: Tool and external API calls · H3: Retries and fallbacks · H3: Human escalation cost
    - H2: Segmenting cost: by workflow, model, customer, and failure type
    - H2: Worked example: retry-driven cost waste in a support workflow
    - H2: Cost per task vs. cost per run vs. cost per token
    - H2: Setting a cost budget without guessing
    - H2: Cost-per-task calculator (interaction)
    - H2: FAQ
17. **Unique framework:** The **Cost Waterfall** — a running total that starts at raw model-token cost and adds tool/API cost, then retry overhead, then human-escalation cost, ending at true cost per successful task, so each addition is visible rather than buried in one aggregate number.
18. **Opening angle:** A team reports "$0.02 per model call" to leadership as their agent cost; the real number, once retries and human escalations are included, is $0.31 per successfully resolved ticket — a 15x gap that the token-only number completely hid.
19. **Evidence plan:** The cost-per-successful-task formula; the Cost Waterfall table; a segmentation table by workflow/model/customer/failure type; the worked retry-waste scenario with before/after numbers.
20. **Code guidance:** An illustrative pseudocode/formula snippet showing the calculation (`cost_per_successful_task = total_cost / successful_task_count`, with `total_cost` broken into components) — labeled illustrative, not tied to a specific billing API.
21. **Purposeful interaction — Cost-Per-Task Calculator:** Reader enters four numbers (model cost per run, tool cost per run, retry rate, success rate) into plain number inputs; the page computes cost per successful task live using the stated formula. Teaches how sensitive the final number is to success rate specifically. Deterministic client-side arithmetic, no data sent anywhere, works with made-up numbers. Static fallback: the worked example table with the same four inputs shown pre-filled.
22. **Hero image concept:** A waterfall/cascade chart silhouette — token cost as the first small bar, growing through tool cost, retries, and escalation cost to a final bar roughly triple the height of the first, visually making the headline claim before any text is read.
23. **In-article visuals:** (1) The Cost Waterfall as a designed chart near the top. (2) Past the midpoint: the segmentation table rendered as a small heatmap-style table (darker cells = higher cost concentration) across workflow × failure type.
24. **Internal links:** "reducing LLM costs" → `/blog/reduce-llm-costs-without-hurting-quality`; "the cost calculator tool" → `/blog/ai-agent-cost-calculator`; "observability metrics that matter" → `/blog/ai-observability-metrics-that-matter`; "latency and its relationship to cost" → `/blog/llm-latency-optimization`.
25. **CTA:** "Break your own agent's spend down into this waterfall" → Cost Dashboard product page.
26. **Conversion role:** Commercial investigation — strong bottom-of-funnel relevance for budget-owning readers.
27. **Metadata:** Title "AI Agent Cost Per Task: Beyond Token Pricing" (46 chars). Description: "A cost-per-successful-task formula for AI agents that accounts for retries, tool calls, and failed runs, not just token price." (135 chars). Social title: "Your Real AI Agent Cost Isn't the Token Price." Social description: "A cost waterfall and worked example showing why cost per successful task can be many times higher than cost per model call."
28. **FAQ (5):** What is cost per task for an AI agent? Total workflow cost divided by the number of successfully completed tasks, not by total runs or token count alone. — Why doesn't token cost alone represent real spend? Because it ignores retries, failed runs, tool/API calls, and human escalations, all of which cost money without producing a successful outcome on their own. — How do retries affect cost per task? Every retry adds cost without necessarily adding a successful outcome, so a high retry rate can make cost per successful task several times higher than cost per run. — How should cost be segmented? By workflow, model, customer or use case, and failure type, so spend concentration is visible rather than hidden in one aggregate. — Is a lower cost per run always better? Not necessarily — a cheaper model with a lower success rate can produce a higher cost per successful task than a more expensive, more reliable one.
29. **Schema:** Article + FAQPage.
30. **Risks:** Must not invent savings percentages or benchmark figures — every number in the worked example must be explicitly hypothetical. Cannibalization risk with `reduce-llm-costs-without-hurting-quality` and `ai-agent-cost-calculator` — mitigate by keeping this the unit-economics *methodology* piece, linking to rather than repeating those two.
31. **Editorial differentiation:** Almost all "LLM cost" content is about reducing token price per call; this article's differentiation is the denominator — measuring cost per outcome, not per call.
32. **Writer handoff:** Keep all worked numbers clearly hypothetical/illustrative; do not attribute any specific dollar figure to a real customer or benchmark.

---

## 10. Topic 7 — AI Agent Guardrails

1. **Working title:** AI Agent Guardrails: A Layered Safety Model for Tool-Using Systems
2. **Alternative SEO title:** A Layered Guardrail Model for AI Agents That Call Tools
3. **Slug:** `ai-agent-guardrails`
4. **Primary keyword:** ai agent guardrails
5. **Secondary cluster:** guardrails for ai agents, llm guardrails, tool-calling guardrails, ai agent safety controls, agent permission design
6. **Search intent:** Informational, mixed with solution-aware (reader is designing safety controls for a tool-using agent).
7. **Target reader:** Engineer or security-adjacent engineer designing or auditing the safety controls around an agent that can take real actions (call APIs, modify data, spend money).
8. **Reader job:** Design a layered set of controls — input, context, output, authorization, runtime limits, human approval, audit — appropriate to what the agent can actually do.
9. **Promised outcome:** A layered model they can map their own agent's tools against, plus a tool-permission matrix template.
10. **Boundary:** Covers guardrail *architecture* — what each layer is for and how they compose. Does not repeat prompt-injection-specific defense (`prompt-injection-defense`) or general agent security (`ai-agent-security`) in depth — this article is the layered-model overview those two feed into as the input-validation and platform-hardening layers respectively.
11. **Archetype:** Definitive guide with an embedded decision framework (the layered model).
12. **Search-intent rationale:** "Guardrails" queries span from conceptual ("what are AI guardrails") to implementation ("how do I guardrail a tool call") — a layered model with a worked permission matrix serves both without fragmenting into two articles.
13. **Direct AEO answer:** AI agent guardrails are layered controls — input validation, context restriction, output validation, tool authorization, runtime limits, human approval for high-risk actions, and audit logging — that together reduce the chance an agent takes an unsafe or unintended action. No single layer is sufficient alone; they are meant to compose.
14. **AEO questions:** What are AI agent guardrails? How are guardrails different from business logic validation? How are guardrails different from authentication and authorization? What is a tool-permission matrix? Can guardrails fully prevent prompt injection or agent misuse? What happens when a guardrail blocks a legitimate action? Who should approve high-risk agent actions?
15. **Featured-snippet opportunities:** Definition paragraph; a seven-layer numbered/bulleted list; a guardrails-vs-adjacent-concepts comparison table; FAQ.
16. **Outline:**
    - H2: What a guardrail is (and isn't: not business logic, not auth alone)
    - H2: The layered guardrail model, layer by layer
      - H3: Input validation · H3: Context restriction · H3: Output validation
      - H3: Tool authorization · H3: Runtime limits · H3: Human approval · H3: Audit logging
    - H2: Designing a tool-permission matrix
    - H2: Blocked vs. ambiguous execution paths
    - H2: False positives and user friction
    - H2: What guardrails cannot guarantee
    - H2: Tool-permission matrix (interaction)
    - H2: Worked example: guardrails around a refund-issuing tool
    - H2: FAQ
17. **Unique framework:** The **Seven-Layer Guardrail Model** (input, context, output, authorization, runtime limits, human approval, audit), presented as a table with columns: layer, what it catches, what it does not catch, example control — explicitly showing the boundary of each layer so readers don't over-trust any single one.
18. **Opening angle:** An agent with a refund tool correctly validates the refund amount against business rules (business logic) but has no check on *who* is authorized to trigger refunds above a threshold (authorization) — the two are often conflated as "the same guardrail" and they are not, which is exactly the gap this layered model exists to name.
19. **Evidence plan:** The Seven-Layer Guardrail Model table; a tool-permission matrix worked example (tool × role × allowed/requires-approval/blocked); a guardrails-vs-business-logic-vs-auth comparison table; a checklist for auditing an existing agent's layers.
20. **Code guidance:** An illustrative policy snippet (pseudo-config) declaring a tool's permission level per role and a runtime spend limit — labeled illustrative, vendor-neutral.
21. **Purposeful interaction — Tool-Permission Matrix Builder:** Reader picks a tool risk level (read-only / reversible write / irreversible write) and a user role (end user / support agent / admin); the tool shows the recommended control combination (auto-allow / require approval / block) from a fixed decision table. Teaches that permission decisions should follow from risk × role, not be uniform. Deterministic, client-side, no real permissions system touched. Static fallback: the full decision table shown directly.
22. **Hero image concept:** A cutaway "layers" diagram — seven concentric or stacked bands labeled input/context/output/authorization/limits/approval/audit, with a single arrow (representing one attempted action) shown passing through multiple bands before reaching "executed."
23. **In-article visuals:** (1) The Seven-Layer Guardrail Model table near the top. (2) Past the midpoint: the worked refund-tool permission matrix rendered as a small grid (tool × role → decision).
24. **Internal links:** "prompt injection defense" → `/blog/prompt-injection-defense`; "AI agent security" → `/blog/ai-agent-security`; "structured outputs" → `/blog/structured-outputs-ai-agents`; "human-in-the-loop agents" → `/blog/human-in-the-loop-ai-agents`.
25. **CTA:** "Review which tool calls in your traces required approval" → Runtime Control product page.
26. **Conversion role:** Problem-aware → solution-aware.
27. **Metadata:** Title "AI Agent Guardrails: A Layered Safety Model" (46 chars). Description: "A seven-layer guardrail model for tool-using AI agents, showing what each layer catches, what it doesn't, and how they compose." (137 chars). Social title: "One Guardrail Is Never Enough." Social description: "A layered model for AI agent guardrails — input, context, output, authorization, limits, approval, and audit — and where each one stops."
28. **FAQ (5):** What are AI agent guardrails? Layered controls — input validation, context restriction, output validation, tool authorization, runtime limits, human approval, and audit logging — that together reduce the risk of an unsafe or unintended agent action. — Are guardrails the same as business logic validation? No — business logic checks whether an action is valid (a refund amount within policy); authorization checks whether this actor is allowed to take this action at all. — Can guardrails fully prevent prompt injection? No single guardrail layer can guarantee that; layered input validation and output checks reduce risk but should be paired with the platform-level defenses described in dedicated prompt-injection guidance. — What should trigger human approval instead of automatic execution? Actions that are irreversible, high-value, or outside the agent's demonstrated reliability range for that specific tool. — What happens when a guardrail blocks a legitimate action? It should fail with a clear, auditable reason and a path to human review, not a silent failure — false positives are a real cost of guardrails and should be tracked.
29. **Schema:** Article + FAQPage.
30. **Risks:** Must not claim guardrails eliminate attacks or guarantee safety — every claim should be framed as risk reduction. Overlaps with `prompt-injection-defense` and `ai-agent-security` — mitigate by keeping this the layered *architecture* overview, explicitly deferring deep technique detail to those articles.
31. **Editorial differentiation:** Most "AI guardrails" content conflates validation, authorization, and monitoring into one undifferentiated bucket. The Seven-Layer Model's explicit "what each layer does not catch" column is the differentiator.
32. **Writer handoff:** Every layer's "what it does not catch" column must be filled honestly, even though it undercuts a simple sales narrative — that honesty is what makes the framework credible and citable.

---

## 11. Topic 8 — LLM-as-a-Judge Evaluation

1. **Working title:** LLM-as-a-Judge Evaluation: When It Works, When It Fails, and What to Measure
2. **Alternative SEO title:** LLM-as-a-Judge: A Practical Guide to Reliability and Bias
3. **Slug:** `llm-as-a-judge-evaluation`
4. **Primary keyword:** llm as a judge
5. **Secondary cluster:** llm evaluation judge, llm judge reliability, evaluating llm responses, ai output grading, judge bias in llm evaluation
6. **Search intent:** Informational + technical evaluation.
7. **Target reader:** Engineer or applied-AI practitioner deciding whether and how to use a model to score another model's output.
8. **Reader job:** Decide which qualities are safe to score with an LLM judge, which need deterministic checks, and which need a human, then design a rubric and calibration process for the ones that go to a judge.
9. **Promised outcome:** A three-layer decision model for routing evaluation criteria to the right method, plus rubric-writing and calibration guidance.
10. **Boundary:** Covers judge *methodology* — when to trust it, known biases, calibration. Does not re-cover general evaluation metric definitions (`ai-evaluation-metrics`) or dataset construction (Topic 4) — this is the narrower "is a model judge the right tool for this criterion" piece.
11. **Archetype:** Decision framework.
12. **Search-intent rationale:** "LLM as a judge" queries are typically asked by someone who has already heard of the technique and wants to know its limits — a decision-framework format (when it works / when it fails) matches better than an introductory explainer.
13. **Direct AEO answer:** LLM-as-a-judge means using one model to score another model's output against a rubric. It works well for criteria with clear, describable rubrics (tone, format adherence, relative preference) and works poorly for criteria requiring ground-truth facts, precise counting, or resistance to verbosity and position bias — those need deterministic checks or human review instead.
14. **AEO questions:** What is LLM-as-a-judge evaluation? When should you use an LLM judge instead of a human reviewer? What is position bias in LLM judging? What is verbosity bias in LLM judging? Can an LLM judge be trusted as ground truth? How do you calibrate an LLM judge against human judgment? What is rubric drift?
15. **Featured-snippet opportunities:** Definition paragraph; a three-layer routing table (deterministic / LLM judge / human); a bias-type table; FAQ.
16. **Outline:**
    - H2: What LLM-as-a-judge means and doesn't mean
    - H2: The three-layer evaluation model: deterministic, judge, human
    - H2: What LLM judges are reasonably good at
    - H2: Known judge failure modes
      - H3: Position bias · H3: Verbosity bias · H3: Self-preference / agreement bias · H3: Rubric drift
    - H2: Writing a rubric a judge can actually follow
    - H2: Calibrating a judge against human review
    - H2: Confidence thresholds and escalation to a human
    - H2: Rubric-selection interaction
    - H2: Worked example: judging a support-agent response for tone and policy adherence
    - H2: FAQ
17. **Unique framework:** The **Three-Layer Evaluation Routing Model** — every evaluation criterion is routed to exactly one of deterministic check / LLM judge / human review, based on two questions: "can this be checked with fixed logic?" and "does this require subjective or comparative judgment a rubric can describe?" — with a routing table as the core artifact.
18. **Opening angle:** A team adopts an LLM judge to score "helpfulness" across thousands of runs, trusts the aggregate score for two release cycles, then discovers the judge consistently rated longer answers higher regardless of correctness — a well-documented verbosity bias that went unnoticed because the score was never calibrated against human judgment.
19. **Evidence plan:** The Three-Layer Routing table; a judge-bias reference table (bias type, description, mitigation); a worked rubric example; a calibration-process checklist (sample size, agreement threshold, re-calibration cadence).
20. **Code guidance:** An illustrative rubric-as-structured-prompt example (criteria + scoring scale + required justification field) — labeled illustrative.
21. **Purposeful interaction — Rubric Selector:** Reader picks an evaluation criterion from a short list (e.g., "factual accuracy," "tone," "format compliance," "relative preference between two answers"); the tool shows which of the three layers (deterministic / judge / human) is recommended and why, from a fixed mapping. Teaches the two routing questions concretely. Deterministic, client-side, no live model call. Static fallback: the mapping shown as a table.
22. **Hero image concept:** A courtroom-adjacent but abstract visual — three parallel lanes (gavel icon for deterministic rules, a stylized model outline for the judge, a person silhouette for human review) each receiving a different criterion token, avoiding literal gavel/courtroom cliché in favor of a clean lane-routing diagram.
23. **In-article visuals:** (1) The Three-Layer Routing table near the top. (2) Past the midpoint: the judge-bias reference table with a small illustrative example transcript for one bias type (verbosity).
24. **Internal links:** "evaluation metrics" → `/blog/ai-evaluation-metrics`; "the broader evaluation practice" → `/blog/ai-agent-evaluation-practical-guide`; "human-in-the-loop review" → `/blog/human-in-the-loop-ai-agents`; "RAG evaluation" → `/blog/rag-evaluation-guide`.
25. **CTA:** "See how judge scores attach to real traces for review" → Evaluation Engine product page.
26. **Conversion role:** Technical evaluation.
27. **Metadata:** Title "LLM-as-a-Judge: When It Works, When It Fails" (46 chars). Description: "A three-layer routing model for deciding when to use an LLM judge, a deterministic check, or a human reviewer, plus known judge biases." (140 chars). Social title: "Should a Model Be Grading Your Model?" Social description: "When an LLM judge is trustworthy, when it isn't, and how to calibrate one against human judgment."
28. **FAQ (5):** What is LLM-as-a-judge? Using one model to score another model's output against a defined rubric, typically for criteria too subjective or expensive for deterministic checks. — Is an LLM judge's score ground truth? No — it should be calibrated against human judgment on a sample and treated as an estimate, not an objective fact. — What is position bias? A judge's tendency to favor whichever answer is presented first (or second) regardless of quality, which is why answer order should be randomized during evaluation. — What is verbosity bias? A judge's tendency to rate longer answers as better independent of actual quality or correctness. — When should a human review instead of a judge? When the criterion requires ground-truth fact-checking, high-stakes judgment, or when judge-human agreement on a calibration sample is too low to trust.
29. **Schema:** Article + FAQPage.
30. **Risks:** Must not cite any specific accuracy or agreement percentage without a named source — describe bias effects qualitatively. Cannibalization risk with `ai-evaluation-metrics` — mitigate by keeping this narrowly about judge methodology and bias, not general metric taxonomy.
31. **Editorial differentiation:** Most LLM-judge content either oversells it as objective or dismisses it entirely; this article's differentiation is the routing model that gives a concrete decision process instead of a binary opinion.
32. **Writer handoff:** Do not present any bias as fully solved by a mitigation technique — frame mitigations as reducing, not eliminating, each bias.

---

## 12. Topic 9 — AI Agent Drift Detection

1. **Working title:** AI Agent Drift Detection: How to Detect Behavioral Changes Before Users Report Them
2. **Alternative SEO title:** Detecting AI Agent Behavior Drift Before It Reaches Users
3. **Slug:** `ai-agent-drift-detection`
4. **Primary keyword:** ai agent drift detection
5. **Secondary cluster:** llm drift monitoring, ai behavior drift, model drift versus prompt drift, detect ai output changes
6. **Search intent:** Informational, problem-aware.
7. **Target reader:** Engineer or AI-ops practitioner responsible for an agent that has been stable in production and needs to notice when its behavior silently changes.
8. **Reader job:** Set up baselines and comparison windows that can catch a meaningful behavioral shift caused by a model update, prompt change, retrieval data change, tool/API change, or traffic-mix change — before users report it.
9. **Promised outcome:** A five-type drift model plus a baseline/comparison-window method they can apply without needing perfect labels.
10. **Boundary:** Covers *detecting* behavioral drift through observability signals. Does not cover ML training-data drift in the classical sense, and does not duplicate `prompt-versioning-and-prompt-management` (which covers managing prompt versions, not detecting drift from them).
11. **Archetype:** Practical library / diagnostic reference.
12. **Search-intent rationale:** "Drift detection" queries come from teams who've already been burned by a silent regression — the format should lead with detection method, not a definition-heavy introduction.
13. **Direct AEO answer:** AI agent drift is a meaningful, unplanned change in an agent's behavior over time, caused by one of five sources: model updates, prompt changes, retrieval data changes, tool/API changes, or shifts in user population or traffic mix. Detecting it requires comparing current behavior against a defined baseline window across output, cost, latency, and quality signals, not just watching one dashboard metric.
14. **AEO questions:** What is AI agent drift? What is the difference between model drift and prompt drift? Can AI agent behavior change without any code or config change? How do you detect drift without labeled data? What is a baseline window? How do you separate real drift from normal variance? Should drift be checked at the aggregate level or the segment level?
15. **Featured-snippet opportunities:** Definition paragraph; a five-type drift table; a step-by-step baseline-comparison process; FAQ.
16. **Outline:**
    - H2: What counts as drift (and what's just normal variance)
    - H2: Five sources of agent behavior drift
      - H3: Model drift · H3: Prompt drift · H3: Retrieval-data drift · H3: Tool/API drift · H3: Population/traffic-mix drift
    - H2: Establishing a baseline window
    - H2: Comparing at the segment level, not just the aggregate
    - H2: Detecting drift without perfect labels
    - H2: Healthy vs. degraded trace comparison
    - H2: "Spot the drift" interaction
    - H2: Worked example: a silent retrieval-data drift after a content migration
    - H2: FAQ
17. **Unique framework:** The **Five-Source Drift Model** (model / prompt / retrieval / tool-API / population), each mapped to a detection signal (e.g., retrieval drift shows up as a shift in which documents are retrieved, not necessarily in the final answer's tone) — a table making clear that different drift sources leave different fingerprints.
18. **Opening angle:** An agent's average response length, latency, and error rate all look unchanged week over week — but its retrieved documents have quietly shifted after an unrelated content migration, and answers have gotten subtly less accurate in a way no aggregate metric shows, only a segment-level comparison of retrieval sources would catch it.
19. **Evidence plan:** The Five-Source Drift Model table; a baseline-window methodology checklist; a healthy-vs-degraded trace comparison (illustrative); a segment-level comparison table example (behavior by user cohort or traffic segment).
20. **Code guidance:** An illustrative comparison-window pseudocode/query snippet showing how a segment (e.g., "requests from a specific channel") is compared across two time windows — labeled illustrative.
21. **Purposeful interaction — Spot the Drift:** Reader is shown two side-by-side simplified "trace summaries" (fixed, illustrative — not live data) representing the same workflow one week apart, and picks which fields differ meaningfully; the page reveals which of the five drift sources that difference pattern indicates. Teaches pattern recognition across the five source fingerprints. Deterministic, entirely pre-authored content, no network calls. Static fallback: the same two summaries and the answer shown directly below.
22. **Hero image concept:** Two nearly-identical trace waterfalls side by side, visually similar at a glance, with one small but consequential difference (a different retrieved-document label) subtly highlighted — visually enacting "looks the same, isn't."
23. **In-article visuals:** (1) The Five-Source Drift Model table near the top. (2) Past the midpoint: the healthy-vs-degraded trace comparison visual (the hero concept's content, shown in full detail with annotations).
24. **Internal links:** "prompt versioning and management" → `/blog/prompt-versioning-and-prompt-management`; "LLM tracing" → `/blog/llm-tracing-explained`; "observability metrics that matter" → `/blog/ai-observability-metrics-that-matter`; "AI agent monitoring" → `/blog/ai-agent-monitoring`.
25. **CTA:** "Compare two time windows of real trace data side by side" → Trace Viewer product page.
26. **Conversion role:** Problem-aware → technical evaluation.
27. **Metadata:** Title "AI Agent Drift Detection: A Five-Source Model" (47 chars). Description: "How to detect AI agent behavior drift from model, prompt, retrieval, tool, or traffic changes before users report it." (122 chars). Social title: "Your Agent's Dashboards Are Green. Is It Still Working?" Social description: "A five-source drift model for catching silent AI agent behavior changes that aggregate metrics miss."
28. **FAQ (5):** What is AI agent drift? A meaningful, unplanned change in an agent's behavior over time, distinct from normal run-to-run variance. — What's the difference between model drift and prompt drift? Model drift comes from the underlying model changing (a provider update); prompt drift comes from the instructions given to the model changing, even if unintentionally. — Can an agent's behavior drift with no code change at all? Yes — retrieval-data drift and population/traffic-mix drift can both change behavior without any prompt, model, or code change. — How do you detect drift without labeled data? By comparing distributions of observable signals (output length, tool-selection frequency, retrieval sources, cost) across time windows rather than relying on correctness labels. — Should drift checks happen at the aggregate or segment level? Both — but segment-level checks catch drift that averages out and disappears at the aggregate level.
29. **Schema:** Article + FAQPage.
30. **Risks:** Must not claim any specific automated anomaly-detection capability without verification — frame detection as a methodology, not a promised automated feature. Overlaps conceptually with monitoring/metrics content — mitigate by keeping this specifically about *change-over-time* detection, not general metric definitions.
31. **Editorial differentiation:** Most "AI drift" content is about ML training-data drift; almost none addresses agent behavioral drift from non-training causes (retrieval content, tool APIs, traffic mix). The Five-Source Model is the differentiator.
32. **Writer handoff:** Keep the "Spot the Drift" interaction's example data entirely fictional and clearly illustrative; do not imply it reflects any real monitored system.

---

## 13. Topic 10 — AI Agent Observability vs Traditional APM

1. **Working title:** AI Agent Observability vs Traditional APM: What Changes and What Stays the Same?
2. **Alternative SEO title:** APM vs AI Agent Observability: A Buyer's Comparison
3. **Slug:** `ai-agent-observability-vs-apm`
4. **Primary keyword:** ai agent observability vs apm
5. **Secondary cluster:** apm for ai agents, ai observability versus application monitoring, traditional monitoring for llm applications, ai agent monitoring tools
6. **Search intent:** Commercial investigation (buyer comparing what their existing APM covers against what they might still need).
7. **Target reader:** Eng lead or platform engineer with an existing APM stack (Datadog, New Relic, etc.) evaluating whether it's sufficient for an AI agent or whether they need AI-specific observability too.
8. **Reader job:** Understand exactly which failure classes their current APM stack can and cannot see, and decide whether to add AI-specific observability, and if so, how the two layers should coexist.
9. **Promised outcome:** A side-by-side comparison and a layered-architecture view showing where APM's job ends and AI observability's job begins.
10. **Boundary:** Covers the boundary and overlap between APM and AI-agent-specific observability. Does not claim APM is obsolete, does not repeat `what-is-ai-observability`'s foundational definition in depth, and does not make unverified competitor comparisons — comparisons stay at the category level (APM vs. AI observability), not vendor vs. vendor.
11. **Archetype:** Comparison / buyer evaluation guide.
12. **Search-intent rationale:** "X vs Y" queries are classic commercial-investigation intent — a reader with budget authority comparing categories before a purchase decision; the format must be a genuine side-by-side comparison, not a disguised sales pitch for one side.
13. **Direct AEO answer:** Traditional APM observes infrastructure and request-level signals: latency, error rates, uptime, and resource usage. AI agent observability adds a layer APM cannot see: prompts, model outputs, tool-call decisions, retrieval quality, and output correctness. Most production AI systems need both — APM for the request path, AI observability for whether the agent's decisions and answers were actually right.
14. **AEO questions:** What is the difference between APM and AI agent observability? Can traditional APM tools monitor AI agents? What can APM see that AI observability can't, and vice versa? Do you need both APM and AI-specific observability? What kind of AI agent failure is invisible to standard APM? How do APM and AI observability data work together in one architecture? Is AI agent observability a replacement for APM?
15. **Featured-snippet opportunities:** Definition paragraph; a side-by-side comparison table (signal type: APM sees it? / AI observability sees it?); a layered-architecture diagram description; a buyer evaluation scorecard; FAQ.
16. **Outline:**
    - H2: What traditional APM was built to observe
    - H2: What's different about an AI agent's failure surface
    - H2: Side-by-side: signal type, APM coverage, AI observability coverage
    - H2: A normal-metrics, wrong-answer incident (worked example)
    - H2: A layered architecture: APM and AI observability together
    - H2: Do you need both, or can one substitute for the other?
    - H2: A buyer evaluation scorecard
    - H2: "Which layer caught it?" scenario quiz
    - H2: FAQ
17. **Unique framework:** The **Layered Coverage Model** — a comparison table where rows are signal types (latency, error rate, uptime, cost, correctness, tool-selection quality, retrieval relevance, prompt/output content) and two columns mark whether traditional APM and AI-specific observability each cover that signal, making the non-overlapping rows the article's core argument.
18. **Opening angle:** An agent's Datadog dashboard is entirely green — normal latency, zero 5xx errors, healthy CPU — while it has been giving a specific category of customers confidently wrong answers for two days, because nothing in that dashboard was ever designed to evaluate whether an answer was *correct*.
19. **Evidence plan:** The Layered Coverage Model table; the worked "green dashboard, wrong answers" incident; a buyer evaluation scorecard (a short checklist of questions to ask when evaluating whether current tooling is sufficient); a simple two-layer architecture description.
20. **Code guidance:** Not required for this comparison-format article; if included, a minimal illustrative example of a request span vs. an AI-specific span side by side (fields present in one, absent in the other), labeled illustrative.
21. **Purposeful interaction — Which Layer Caught It?:** Reader is shown a short fixed scenario description (e.g., "an agent's 95th-percentile latency spiked for ten minutes") and picks whether APM, AI observability, or both would have caught it; the tool reveals the correct answer with a one-line reason, from a fixed set of 5 scenarios. Teaches the coverage boundary experientially rather than just via the table. Deterministic, client-side, fixed content. Static fallback: the five scenarios and answers shown as a table.
22. **Hero image concept:** Two overlapping translucent layers rendered as horizontal bands — a lower "infrastructure" band (labeled APM) and an upper "decisions and content" band (labeled AI observability) — with a single vertical arrow (one request) shown passing through both, visually establishing that they're complementary layers, not competing tools.
23. **In-article visuals:** (1) The Layered Coverage Model comparison table near the top. (2) Past the midpoint: the two-layer architecture diagram showing where APM instrumentation and AI-specific trace instrumentation each attach to the same request path.
24. **Internal links:** "what is AI observability" → `/blog/what-is-ai-observability`; "AI observability tools" → `/blog/ai-observability-tools`; "AI observability platform" → `/blog/ai-observability-platform`; "AI agent monitoring" → `/blog/ai-agent-monitoring`.
25. **CTA:** "See what AI-specific observability adds alongside your existing APM" → product overview / Trace Viewer page.
26. **Conversion role:** Commercial investigation — the strongest single entry point into the whole cluster for a buyer-stage reader, per the publishing-order rationale.
27. **Metadata:** Title "AI Agent Observability vs APM: What's the Difference?" (54 chars). Description: "What traditional APM covers, what it misses for AI agents, and why most production AI systems need both layers together." (124 chars). Social title: "Your APM Dashboard Is Green. Your Agent Is Still Wrong." Social description: "A layered comparison of what traditional APM sees and what AI-specific observability adds for agents and LLM workflows."
28. **FAQ (5):** What's the difference between APM and AI agent observability? APM observes infrastructure and request-level signals like latency and error rate; AI observability adds visibility into prompts, model decisions, tool calls, retrieval, and output correctness. — Can I monitor an AI agent with just APM? You can monitor its infrastructure health, but APM alone cannot tell you whether the agent's answers were correct or its tool choices were right. — Is AI observability a replacement for APM? No — they cover different, mostly non-overlapping signal types and are meant to be used together. — What kind of AI agent failure is invisible to standard APM? A quality failure: a confidently wrong answer, a bad tool choice, or stale retrieval, all of which can occur with completely normal latency and error-rate numbers. — Do small AI agent deployments need both? It depends on risk and scale, but any agent making decisions that matter to users benefits from at least some AI-specific visibility beyond infrastructure metrics alone.
29. **Schema:** Article + FAQPage.
30. **Risks:** Must not claim APM is obsolete or inadequate in general — the whole framing depends on "complementary, not competing." Must avoid unverified named-competitor comparisons — keep comparisons at the category level. Highest commercial-relevance topic in the set, but also the one most likely to read as a sales pitch if not kept genuinely balanced — mitigate with the honest "what APM does well" section early.
31. **Editorial differentiation:** Most vendor content in this space either dismisses APM or ignores it; this article's differentiation is treating APM coverage seriously and precisely (via the Layered Coverage Model) before explaining the gap, which is more credible to a technical buyer than a dismissive framing.
32. **Writer handoff:** Write the "what traditional APM was built to observe" section with genuine respect for what APM does well — the entire article's credibility depends on not strawmanning it. This is the pillar-adjacent piece; make sure every one of the other nine articles is linkable from somewhere in this one over time (not all in v1 — see internal-link strategy note in the topical-authority map).

---

## 14. Keyword-cluster map

| Article | Primary keyword | Supporting keywords | Related questions | Search intent | Funnel stage | Internal links | Cannibalization risk |
|---|---|---|---|---|---|---|---|
| 1. Failure Taxonomy | ai agent failure modes | why ai agents fail, production ai agent errors, ai agent reliability problems | Is every wrong answer a hallucination? Who owns a tool failure? | Informational | Problem-aware | debug-ai-agents-in-production, ai-agent-reliability-failures-retries-guardrails, ai-agent-regression-testing, ai-agent-incident-response | Medium — vs. reliability/retries post; mitigate by staying diagnostic/taxonomic only |
| 2. Release Checklist | ai agent release checklist | deploy ai agent to production, prompt change testing, model change checklist | What to verify before a model upgrade? What triggers rollback? | Informational + technical evaluation | Solution-aware | ai-agent-production-checklist, prompt-versioning-and-prompt-management, agent-deployment-rollback-strategies, ai-agent-regression-testing | Medium — vs. production checklist; mitigate by scoping to iterative releases only |
| 3. Trace Schema | ai agent trace schema | llm trace fields, what to log for ai agents, agent observability data model | Run vs trace vs span vs event? What fields for cost analysis? | Informational + technical evaluation | Technical evaluation | llm-tracing-explained, opentelemetry-llm-tracing, mcp-observability-guide, debug-ai-agents-in-production | Low-medium — vs. tracing-explained/OTel posts; mitigate as the field-level reference they cite |
| 4. Evaluation Datasets | ai agent evaluation dataset | llm evaluation dataset, ai agent test cases, evaluation dataset design | Real vs synthetic data? How many test cases is enough? | Informational + solution-aware | Solution-aware | ai-evaluation-metrics, ai-agent-evaluation-practical-guide, rag-evaluation-guide, ai-agent-regression-testing | Medium — vs. evaluation-practical-guide; mitigate by staying sourcing/construction-only |
| 5. SLOs & Error Budgets | ai agent slos | error budgets for ai systems, ai reliability metrics, service level objectives | Uptime enough? What happens when budget is spent? | Informational + technical evaluation | Technical evaluation | ai-observability-metrics-that-matter, ai-agent-incident-response, ai-agent-reliability-failures-retries-guardrails, ai-agent-monitoring | Low — new framing (SLO/error-budget) not covered elsewhere |
| 6. Cost Per Task | ai agent cost per task | ai agent unit economics, llm cost per workflow, reduce ai agent operating costs | Why isn't token cost enough? How do retries affect cost? | Commercial investigation | Commercial investigation | reduce-llm-costs-without-hurting-quality, ai-agent-cost-calculator, ai-observability-metrics-that-matter, llm-latency-optimization | Medium — vs. cost-calculator/cost-reduction posts; mitigate as the unit-economics methodology piece |
| 7. Guardrails | ai agent guardrails | llm guardrails, tool-calling guardrails, ai agent safety controls | Guardrails vs auth? What should require human approval? | Informational | Problem-aware / solution-aware | prompt-injection-defense, ai-agent-security, structured-outputs-ai-agents, human-in-the-loop-ai-agents | Medium — vs. security/prompt-injection posts; mitigate as the layered-architecture overview only |
| 8. LLM-as-a-Judge | llm as a judge | llm judge reliability, evaluating llm responses, ai output grading | Is a judge score ground truth? What is position bias? | Informational + technical evaluation | Technical evaluation | ai-evaluation-metrics, ai-agent-evaluation-practical-guide, human-in-the-loop-ai-agents, rag-evaluation-guide | Medium — vs. evaluation-metrics post; mitigate as judge-methodology-only |
| 9. Drift Detection | ai agent drift detection | llm drift monitoring, ai behavior drift, detect ai output changes | Model drift vs prompt drift? Can drift happen with no code change? | Informational | Problem-aware | prompt-versioning-and-prompt-management, llm-tracing-explained, ai-observability-metrics-that-matter, ai-agent-monitoring | Low-medium — vs. monitoring content; mitigate as change-over-time detection specifically |
| 10. Observability vs APM | ai agent observability vs apm | apm for ai agents, ai observability versus application monitoring | Do you need both? What's invisible to APM? | Commercial investigation | Commercial investigation | what-is-ai-observability, ai-observability-tools, ai-observability-platform, ai-agent-monitoring | Low — distinct comparison framing not covered elsewhere |

---

## 15. Topical-authority map

How the ten articles cover the eight required themes. A theme marked **primary** means the article is that theme's main entry point; **secondary** means it touches the theme in service of its main argument.

| Theme | Primary article(s) | Secondary coverage |
|---|---|---|
| AI agent failures | 1. Failure Taxonomy | 9. Drift Detection (behavioral failure over time), 10. Observability vs APM (failure visibility gap) |
| Evaluation | 4. Evaluation Datasets, 8. LLM-as-a-Judge | 1. Failure Taxonomy (failure → test case), 2. Release Checklist (pre-release eval gate) |
| Reliability | 5. SLOs & Error Budgets | 1. Failure Taxonomy, 2. Release Checklist (rollback triggers) |
| Security | 7. Guardrails | 2. Release Checklist (security/permission verification step) |
| Cost | 6. Cost Per Task | 2. Release Checklist (cost-regression trigger), 5. SLOs (efficiency indicator) |
| Performance | (no dedicated primary — intentional; `llm-latency-optimization` already owns this) | 5. SLOs (latency SLI), 6. Cost Per Task (latency/cost relationship), 10. Observability vs APM (latency as an APM-covered signal) |
| Release operations | 2. Release Checklist | 5. SLOs (release-gate triggers), 9. Drift Detection (post-release drift watch) |
| Observability architecture | 3. Trace Schema, 10. Observability vs APM | 1, 5, 9 all depend on trace-level evidence defined in Topic 3 |

Every article except Topic 3 (Trace Schema) and Topic 10 (Observability vs APM) references trace-level evidence — Topic 3 is the connective-tissue article most of the others implicitly depend on, which is why it is sequenced third (early enough to exist before the articles that lean on it are published in volume).

---

## 16. Pillar-and-cluster recommendation

**Strongest pillar candidate: Topic 10 — AI Agent Observability vs Traditional APM.**

Reasoning: it is the only article in the set aimed squarely at a commercial-investigation buyer who has not yet decided what kind of tooling they need, and its natural structure (a category-level comparison) supports linking out to all nine other articles as "here's what that other layer actually covers" without straining the narrative. It is sequenced *last* in the publishing calendar specifically so that by the time it goes live, all nine cluster articles already exist and can be linked from it — the reverse of typical pillar-first sequencing, chosen because acute diagnostic content (Topic 1) earns organic traffic faster than a comparison piece would this early.

**Cluster articles and link flow:**

- Topics 1, 3, 5, 9 (Failure Taxonomy, Trace Schema, SLOs, Drift Detection) form the **diagnostic/reliability sub-cluster** — they should cross-link to each other directly (e.g., Failure Taxonomy → SLOs when discussing what "failure" counts against a budget; Drift Detection → Trace Schema when discussing what fields to compare) in addition to linking up to the pillar once it exists.
- Topics 2, 4, 6 (Release Checklist, Evaluation Datasets, Cost Per Task) form the **operations sub-cluster** — Release Checklist should link to both Evaluation Datasets (pre-release eval gate) and Cost Per Task (cost-regression trigger) directly.
- Topics 7, 8 (Guardrails, LLM-as-a-Judge) are more standalone but should link to the evaluation sub-cluster (Judge → Evaluation Datasets) and reliability sub-cluster (Guardrails → Failure Taxonomy's permission-failure section) respectively.
- Once Topic 10 is published, go back and add one contextual link from it into each of the other nine articles' introductions or conclusions where it naturally fits ("if you're comparing this against what your existing APM already covers, see..."), completing the hub-and-spoke structure without needing a link-dump section anywhere.

---

## 17. 90-day publishing calendar

Assumes one article every 8–9 days (10 articles across ~90 days), with research/draft/review milestones staggered so two articles are always in different pipeline stages at once.

| Day | Milestone |
|---|---|
| 1–3 | Kickoff: verify all internal-link slugs still exist (`ls content/blog/`); confirm keyword priorities against a real keyword tool if available; assign writer/editor pairs for Topics 1–3 |
| 4–7 | Topic 1 (Failure Taxonomy) research + draft |
| 8 | Topic 1 technical review (trace-evidence accuracy) + SEO/AEO review |
| 9 | **Publish Topic 1** — visual production (hero + 2 in-article visuals) finalized day 8 |
| 9–13 | Topic 2 (Release Checklist) research + draft, in parallel with Topic 1 publication |
| 14 | Topic 2 technical + SEO/AEO review |
| 17 | **Publish Topic 2** — add internal link from Topic 2 back to Topic 1 |
| 17–22 | Topic 3 (Trace Schema) research + draft |
| 23 | Topic 3 technical review (illustrative JSON must be clearly labeled) + SEO/AEO review |
| 26 | **Publish Topic 3** — retro-add trace-schema links into Topics 1–2 |
| 26–31 | Topic 4 (Evaluation Datasets) research + draft |
| 32 | Topic 4 technical + SEO/AEO review |
| 35 | **Publish Topic 4** |
| 35–40 | Topic 5 (SLOs & Error Budgets) research + draft |
| 41 | Topic 5 technical + SEO/AEO review |
| 44 | **Publish Topic 5** |
| 44–49 | Topic 6 (Cost Per Task) research + draft |
| 50 | Topic 6 technical + SEO/AEO review (verify no invented savings figures) |
| 53 | **Publish Topic 6** |
| 53–58 | Topic 7 (Guardrails) research + draft |
| 59 | Topic 7 technical review (security-adjacent claims checked) + SEO/AEO review |
| 62 | **Publish Topic 7** |
| 62–67 | Topic 8 (LLM-as-a-Judge) research + draft |
| 68 | Topic 8 technical + SEO/AEO review |
| 71 | **Publish Topic 8** |
| 71–76 | Topic 9 (Drift Detection) research + draft |
| 77 | Topic 9 technical + SEO/AEO review |
| 80 | **Publish Topic 9** |
| 80–86 | Topic 10 (Observability vs APM) research + draft — longest lead time, since it needs links back into all 9 prior articles |
| 87 | Topic 10 technical + SEO/AEO review; retro-add Topic 10 links into Topics 1–9 |
| 90 | **Publish Topic 10** — cluster complete |

**Refresh dates:** schedule a lightweight accuracy pass on Topics 1–3 at day 180 (they age fastest, since trace-field and failure-taxonomy conventions may shift as the product evolves) and a full-cluster link audit at day 180 to confirm every internal link still resolves.

---

## 18. Writer and editor production checklist

**Research**
- [ ] Primary and secondary keywords checked against a real keyword tool if available; priority downgraded to "hypothesis" in the brief if not
- [ ] Existing Uncoil content re-scanned (`content/blog/*.mdoc`) immediately before drafting to confirm no new overlapping article has shipped since this strategy was written

**Source verification**
- [ ] Every factual claim about AI systems traces to public documentation, the Uncoil repo/docs, or is explicitly labeled as general industry guidance or a worked hypothetical
- [ ] No invented customers, benchmarks, integrations, compliance claims, or performance statistics anywhere in the draft

**Brief approval**
- [ ] Working title, slug, and primary keyword confirmed against this document (or an approved deviation noted)
- [ ] Boundary section reread immediately before drafting to prevent scope creep into an adjacent existing article

**Drafting**
- [ ] Primary query answered within the first 100–150 words
- [ ] At least 8 meaningful H2 sections, at least 3 useful H3 sections
- [ ] Each major section answers: what's the problem, how to identify it, what evidence to inspect, what decision to make, what trade-off applies
- [ ] At least one illustrative or tested code example, labeled accordingly
- [ ] At least two semantic tables with descriptive headers
- [ ] At least two labeled decision notes / editorial panels
- [ ] Exactly one purposeful deterministic interaction, matching this brief's spec
- [ ] Word count between 3,000–10,000, targeting 4,000–8,000
- [ ] No banned filler phrasing ("in today's rapidly evolving landscape," "revolutionary," "seamless," unsupported "powerful")
- [ ] FAQ section present, exactly 5 questions, placed after the main teaching content, no separate "related articles" link-dump section

**Technical review**
- [ ] A second engineer confirms every trace-field, schema, or code example is either accurate to Uncoil's real implementation or clearly labeled illustrative
- [ ] No claim implies a specific product capability that hasn't been verified

**SEO review**
- [ ] Meta title ≤ ~60 characters, meta description ≤ ~160 characters
- [ ] Slug matches the approved brief
- [ ] Canonical URL set; no duplicate slug conflict

**AEO review**
- [ ] The 40–70 word direct answer appears near the top, extractable as a standalone paragraph
- [ ] Every AEO question listed in the brief has a clear, findable answer in the body
- [ ] Question-based H2/H3 headings used where natural

**Visual production**
- [ ] Hero image is article-specific, not reused or recolored from another post
- [ ] At least two instructional in-article visuals, at least one after the article midpoint
- [ ] All images have meaningful, specific alt text (not generic)

**Internal-link review**
- [ ] Every internal link points to a real, published, non-draft Uncoil URL, verified live before publishing
- [ ] Anchor text is descriptive, never "click here" / "read more"
- [ ] Links appear inside explanatory sentences, not as a link-dump list

**Accessibility review**
- [ ] Heading hierarchy is sequential (no skipped levels)
- [ ] Tables use proper header cells
- [ ] The deterministic interaction is usable via keyboard and has a static fallback if scripting fails

**Metadata and schema**
- [ ] `faq-item` tags present and match the approved FAQ (enables automatic FAQPage schema via the blog's existing extraction pipeline)
- [ ] Frontmatter `categories`/`tags` reviewed for consistency with the topical-authority map above

**Final publication checks**
- [ ] `npm run validate:blog -- <slug>` passes
- [ ] `npm run test:content` passes
- [ ] `draft: false` set only when the article is genuinely ready to go live
- [ ] Confirmed against the 90-day calendar's intended publish date before merging
