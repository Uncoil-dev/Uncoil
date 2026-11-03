import type { Term } from "../glossary";

const promptGroup = "Prompts and context";
const agentGroup = "Agents and tools";
const retrievalGroup = "Retrieval";

export const agentTerms: readonly Term[] = [
  // Prompts and context
  {
    slug: "prompt",
    term: "Prompt",
    group: promptGroup,
    definition:
      "A prompt is the full input given to a language model for one call: instructions, examples, retrieved context, conversation history and the user's request. The model's reply depends entirely on it.",
    expansion:
      "What the user typed is only a small part of the prompt. Most of it is assembled by your code, which is why bugs often hide in prompt building rather than in the model. Seeing the final prompt exactly as the model received it is the first thing to check in any bad answer.",
    example:
      "A user asks \"Where is my order?\". The prompt sent to the model also includes the system instructions, the last four messages and the order record your code fetched.",
    related: ["system-prompt", "prompt-template", "context-window", "llm-tracing"],
    link: { href: "/product/llm-calls", label: "See how LLM calls are traced" },
  },
  {
    slug: "system-prompt",
    term: "System prompt",
    group: promptGroup,
    definition:
      "A system prompt is the standing set of instructions sent at the start of every call that tells the model its role, rules, tone and what tools it may use. The user does not see it.",
    expansion:
      "It is where you set boundaries, such as what to refuse and how to format answers. Because it is repeated on every step, it adds to input tokens and is a good candidate for prompt caching. It also is not a security boundary: a determined user can sometimes override or extract it, so enforce important rules in code as well.",
    example:
      "\"You are a support agent for Acme. Only answer questions about orders. Use the lookup_order tool before quoting a status. Reply in two sentences.\"",
    related: ["prompt", "prompt-caching", "prompt-injection", "guardrails"],
    link: { href: "/docs/prompts", label: "Manage prompts" },
  },
  {
    slug: "prompt-template",
    term: "Prompt template",
    group: promptGroup,
    definition:
      "A prompt template is a prompt with named placeholders that your code fills in at run time, such as the customer name or retrieved documents. It keeps the wording fixed while the data changes.",
    expansion:
      "Templates make prompts reusable and testable, and they let you version the wording separately from the code that fills it. The usual bugs are missing values, which leave a literal placeholder in the prompt, and unescaped user text that changes the meaning of the template.",
    example:
      "\"Summarize the following ticket for {{team}} in {{max_sentences}} sentences: {{ticket_text}}\"",
    related: ["prompt", "prompt-versioning", "prompt-engineering", "context-engineering"],
    link: { href: "/docs/prompts", label: "Manage prompts" },
  },
  {
    slug: "prompt-versioning",
    term: "Prompt versioning",
    group: promptGroup,
    definition:
      "Prompt versioning is keeping a numbered history of each prompt so you know which wording produced which result and can roll back a change that made things worse.",
    expansion:
      "A one-word edit can change quality, cost and tool use. Recording the prompt version on every run lets you compare versions on real traffic and tie a regression to the change that caused it. Combine it with an evaluation set so each new version is scored before it ships.",
    example:
      "Version 14 of the refund prompt adds a rule about partial refunds. Runs tagged v14 show a higher success rate than v13, so you keep it.",
    related: ["prompt-template", "regression-testing", "agent-drift", "evaluation-dataset"],
    link: { href: "/docs/prompts", label: "Manage prompts" },
  },
  {
    slug: "prompt-engineering",
    term: "Prompt engineering",
    group: promptGroup,
    definition:
      "Prompt engineering is the practice of writing and testing prompts to get reliable results from a model. It covers instructions, examples, output formats and how context is arranged.",
    expansion:
      "Good prompt engineering is closer to testing than writing: you change one thing, run it on a fixed set of inputs, and compare scores. Without traces and an evaluation set, it turns into guessing. As agents grow, the work widens into context engineering, which decides what goes into the prompt at each step.",
    example:
      "You rewrite a vague instruction into three numbered rules, run both versions on 100 saved questions, and keep the one with fewer wrong answers.",
    related: ["context-engineering", "few-shot-prompting", "agent-evaluation", "prompt-versioning"],
    link: { href: "/docs/playground", label: "Try prompts in the playground" },
  },
  {
    slug: "few-shot-prompting",
    term: "Few-shot prompting",
    group: promptGroup,
    definition:
      "Few-shot prompting is including a handful of worked examples in the prompt so the model copies their pattern. Zero-shot means no examples, and one-shot means a single example.",
    expansion:
      "Examples are often the strongest way to fix a format or tone problem. Choose varied, correct examples, keep them short, and watch the token cost since they are sent on every call. Poor or inconsistent examples teach the wrong pattern as reliably as good ones teach the right one.",
    example:
      "To label tickets, the prompt shows three tickets with their labels: \"billing\", \"bug\" and \"feature request\". The model labels the fourth ticket in the same style.",
    related: ["prompt-engineering", "prompt", "structured-output", "input-tokens"],
    link: { href: "/docs/playground", label: "Try prompts in the playground" },
  },
  {
    slug: "chain-of-thought",
    term: "Chain of thought",
    group: promptGroup,
    definition:
      "Chain of thought is having a model work through a problem in written intermediate steps before giving a final answer. It often improves results on tasks with several steps, such as math or planning.",
    expansion:
      "You can ask for it in the prompt, or use a reasoning model that does it on its own. It costs extra output tokens and time, and the written reasoning is not always a faithful account of how the answer was reached, so treat it as a useful aid for debugging rather than proof.",
    example:
      "Prompt: \"Think through the discount rules step by step, then give the total.\" The reply lists each rule it applied, then states $84.50.",
    related: ["reasoning-model", "react-pattern", "output-tokens", "prompt-engineering"],
    link: { href: "/docs/playground", label: "Try prompts in the playground" },
  },
  {
    slug: "context-engineering",
    term: "Context engineering",
    group: promptGroup,
    definition:
      "Context engineering is deciding what information goes into the model's context at each step of an agent: instructions, tools, retrieved facts, memory and past results. The aim is the smallest set that lets the model do the step well.",
    expansion:
      "In an agent, the context changes on every loop. Too little leaves the model guessing; too much costs money, slows each call and buries the useful part. Typical techniques are trimming old tool results, summarizing history, and retrieving only what the current step needs. Traces show exactly what was in context when a step went wrong.",
    example:
      "After ten steps an agent's history is 40,000 tokens. You keep the last three tool results in full, replace the older ones with a short summary, and quality stays the same at a third of the cost.",
    related: ["context-window", "context-window-overflow", "agent-memory", "prompt-engineering"],
    link: { href: "/product/llm-calls", label: "See how LLM calls are traced" },
  },
  {
    slug: "context-window-overflow",
    term: "Context window overflow",
    group: promptGroup,
    definition:
      "Context window overflow happens when the input to a model is larger than its context window. The provider returns an error, or your code silently cuts text to fit and loses information.",
    expansion:
      "In long agent runs it appears slowly: each step adds messages and tool output until a call fails or, worse, an old instruction falls out of view and the agent starts behaving differently. Alert on input size approaching the limit and on truncation in your own code, not just on hard errors.",
    example:
      "A research agent pastes full web pages into its history. On step 12 the input reaches 130,000 tokens and the provider rejects the call with a context length error.",
    related: ["context-window", "context-engineering", "input-tokens", "error-rate"],
    link: { href: "/product/failures", label: "See how failures are surfaced" },
  },

  // Agents and tools
  {
    slug: "ai-agent",
    term: "AI agent",
    group: agentGroup,
    definition:
      "An AI agent is a program that uses a language model to decide its own next steps, calling tools and reading the results until it reaches a goal or gives up. It differs from a single model call because it loops and acts.",
    expansion:
      "The model is the decision maker, and the tools are how it affects the world: searching, reading files, calling APIs, writing data. Because the path is not fixed in advance, two runs of the same request can take different routes, which is why you need a trace of each run to see what actually happened.",
    example:
      "You ask a coding agent to fix a failing test. It reads the test file, runs the tests, edits a function, runs the tests again and reports that they pass.",
    related: ["agent-loop", "agentic-workflow", "tool-use", "ai-agent-observability"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "agentic-workflow",
    term: "Agentic workflow",
    group: agentGroup,
    definition:
      "An agentic workflow is a multi-step process in which a language model helps decide what happens, as opposed to a fixed pipeline where code decides every step. Many are a mix, with some fixed stages and some model-chosen ones.",
    expansion:
      "Fixed steps are cheaper, faster and easier to test. Model-chosen steps handle open-ended tasks. A common pattern is to keep the overall flow in code and let the model decide only inside a step, such as which tool to call. Tracing the whole workflow as one run shows where the model's freedom helps and where it causes failures.",
    example:
      "A claims workflow always runs intake, then validation. Inside validation, an agent decides which documents to request before passing the case on.",
    related: ["ai-agent", "ai-pipeline-tracing", "orchestrator", "agent-run"],
    link: { href: "/use-cases/automation", label: "See automation use cases" },
  },
  {
    slug: "tool-use",
    term: "Tool use",
    group: agentGroup,
    definition:
      "Tool use is a model's ability to ask for an external function to be run, such as a search, calculation or API call, and then continue with the result. The model asks; your code actually runs the tool.",
    expansion:
      "Each tool is described to the model by name, purpose and parameters. The model replies with the tool it wants and the arguments, your code executes it, and the result goes back into the next call. Most agent failures involve this exchange: the wrong tool, wrong arguments or a result the model misreads.",
    example:
      "The model replies with get_weather({\"city\": \"Oslo\"}). Your code calls a weather API and sends back \"4°C, light rain\" for the model to use in its answer.",
    related: ["function-calling", "tool-call", "tool-call-tracking", "model-context-protocol"],
    link: { href: "/docs/tool-calls", label: "Read about tool calls" },
  },
  {
    slug: "function-calling",
    term: "Function calling",
    group: agentGroup,
    definition:
      "Function calling is the model provider feature that lets a model return a structured request to run one of your named functions with arguments that match a schema. It is the mechanism behind most tool use.",
    expansion:
      "You declare functions with names, descriptions and JSON schemas for their parameters. The model returns the chosen function and arguments instead of plain text. Clear names and descriptions matter a lot, since the model picks tools using only that text. Validate arguments before running anything with side effects.",
    example:
      "You declare create_refund(order_id: string, amount: number). The model returns create_refund({\"order_id\": \"A-1042\", \"amount\": 19.0}) and your code checks the amount before acting.",
    related: ["tool-use", "tool-call", "structured-output", "guardrails"],
    link: { href: "/docs/tool-calls", label: "Read about tool calls" },
  },
  {
    slug: "agent-loop",
    term: "Agent loop",
    group: agentGroup,
    definition:
      "The agent loop is the repeating cycle in which an agent calls the model, runs any tools it requests, adds the results to the context, and calls the model again until it produces a final answer or hits a limit.",
    expansion:
      "Every pass adds tokens and time, and a loop with no stopping rule can run until it hits a budget. Good agents have a maximum number of steps, a spend limit and a way to notice repeated identical calls. In a trace, one pass of the loop appears as a model span followed by its tool spans.",
    example:
      "Pass 1: the model asks to search. Pass 2: it reads a result. Pass 3: it writes the answer. The trace shows three model spans and two tool spans under one run.",
    related: ["ai-agent", "react-pattern", "agent-run"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "react-pattern",
    term: "ReAct pattern",
    group: agentGroup,
    definition:
      "ReAct, short for reason and act, is an agent pattern in which the model alternates between writing a short thought about what to do and taking an action with a tool, then reads the observation before the next thought.",
    expansion:
      "It was an early, influential recipe for tool-using agents and still underlies many frameworks, though modern models usually do the reasoning internally or through native tool calling. Seeing the thought, action and observation of each cycle in a trace makes it easy to find the step where the reasoning went off course.",
    example:
      "Thought: I need the order status. Action: lookup_order(A-1042). Observation: shipped on Monday. Thought: I can answer now.",
    related: ["agent-loop", "chain-of-thought", "tool-use", "ai-agent"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "planner-agent",
    term: "Planner agent",
    group: agentGroup,
    definition:
      "A planner agent breaks a large goal into smaller steps and hands them to other agents or tools to carry out. It focuses on deciding what to do, not on doing it.",
    expansion:
      "Planning first can make long tasks more reliable, but plans can be wrong or go stale as results come in, so many systems re-plan after each step. Compare the plan with what actually ran: a gap between the two is a common source of silent failures.",
    example:
      "Asked to write a market report, the planner returns five steps: search, read sources, extract figures, draft, check. Worker agents then handle each step.",
    related: ["orchestrator", "multi-agent-system", "agent-handoff", "agentic-workflow"],
    link: { href: "/use-cases/research", label: "See research agent use cases" },
  },
  {
    slug: "orchestrator",
    term: "Orchestrator",
    group: agentGroup,
    definition:
      "An orchestrator is the part of an agent system that decides which agent or tool runs next, passes work between them and combines their results. It can be ordinary code or an agent itself.",
    expansion:
      "In a multi-agent setup the orchestrator is where routing mistakes happen: sending a task to the wrong specialist, losing context in the handoff, or running steps in sequence that could run in parallel. Tracing the orchestrator as the parent span makes each worker's contribution visible underneath it.",
    example:
      "A support orchestrator sends billing questions to a billing agent and technical ones to a diagnostics agent, then merges their answers into one reply.",
    related: ["multi-agent-system", "agent-handoff", "planner-agent", "agentic-workflow"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "agent-handoff",
    term: "Agent handoff",
    group: agentGroup,
    definition:
      "An agent handoff is when one agent passes a task, along with context, to another agent that takes over. What gets passed on, and what gets left out, decides whether the second agent can succeed.",
    expansion:
      "Handoffs are a frequent failure point because the receiving agent only knows what it is told. Missing facts, an over-long dump of history, or a vague instruction all cause errors that look like the second agent's fault. A trace that links both agents shows exactly what crossed the boundary.",
    example:
      "A triage agent hands a ticket to a refunds agent with the order ID and the customer's request, but forgets to include the earlier agreement to waive the fee.",
    related: ["multi-agent-system", "orchestrator", "context-engineering", "session-tracing"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "agent-memory",
    term: "Agent memory",
    group: agentGroup,
    definition:
      "Agent memory is information an agent keeps beyond a single model call, either within a run (short-term) or across runs and sessions (long-term). Models do not remember anything on their own, so memory is something your code stores and puts back into the prompt.",
    expansion:
      "Short-term memory is usually the message history. Long-term memory is typically saved notes, preferences or facts retrieved when relevant. The risks are stale or wrong memories and memories that leak between users, so record what was retrieved on each run and keep each user's data separate.",
    example:
      "A travel agent saves \"prefers aisle seats\" after one booking and retrieves it three weeks later when the user books again.",
    related: ["context-engineering", "session-tracing", "rag", "context-window"],
    link: { href: "/product/trace-viewer", label: "See the trace viewer" },
  },
  {
    slug: "human-in-the-loop",
    term: "Human-in-the-loop",
    group: agentGroup,
    definition:
      "Human-in-the-loop means a person reviews, approves or corrects an agent's work at defined points, such as before it sends money or deletes data, or after it produces an answer a reviewer samples.",
    expansion:
      "It is the practical answer to actions that are costly to undo. You decide which steps need approval, which can run alone, and how reviewers' labels flow back into your evaluation data. Reviewer decisions are valuable data: each correction shows where the agent falls short.",
    example:
      "A finance agent drafts payments but cannot send any over $500 until a manager approves. Rejected drafts are saved to a dataset for review.",
    related: ["guardrails", "human-feedback", "agent-evaluation", "evaluation-dataset"],
    link: { href: "/docs/annotation-queues", label: "Review runs in annotation queues" },
  },
  {
    slug: "guardrails",
    term: "Guardrails",
    group: agentGroup,
    definition:
      "Guardrails are checks placed around a model or agent that block, change or flag inputs and outputs that break your rules, such as unsafe content, personal data, off-topic requests or invalid tool arguments.",
    expansion:
      "They can be simple code, like a schema check or an allow-list of tools, or a second model that classifies content. They work best as layers: validate inputs, restrict what tools can do, and check outputs. Log every time a guardrail fires, since the count and the reasons are a useful quality signal.",
    example:
      "Before replying, a check scans the draft for card numbers and email addresses. If it finds any, the reply is blocked and the event is recorded on the run.",
    related: ["prompt-injection", "pii-redaction", "human-in-the-loop", "jailbreak"],
    link: { href: "/docs/resilience-testing", label: "Read about resilience testing" },
  },

  // Retrieval
  {
    slug: "rag",
    term: "RAG (retrieval-augmented generation)",
    group: retrievalGroup,
    definition:
      "Retrieval-augmented generation is a pattern where your system first looks up relevant documents and then gives them to the model along with the question, so the answer is based on that material instead of the model's memory alone.",
    expansion:
      "It lets a model answer from private or recent data without retraining. Quality depends on two parts: whether retrieval found the right passages, and whether the model used them faithfully. When an answer is wrong, a trace tells you which part failed, because it shows the retrieved text next to the final reply.",
    example:
      "A user asks about the refund window. The system retrieves three paragraphs from the policy handbook and the model answers \"30 days\", citing the second paragraph.",
    related: ["vector-database", "chunking", "reranking", "grounding"],
    link: { href: "/docs/trace-anatomy", label: "Read about trace anatomy" },
  },
  {
    slug: "vector-database",
    term: "Vector database",
    group: retrievalGroup,
    definition:
      "A vector database stores embeddings and quickly finds the ones closest to a query embedding. It is the usual storage layer behind semantic search and retrieval-augmented generation.",
    expansion:
      "You index document chunks with their embeddings and metadata, then search by similarity with optional filters such as customer or date. Latency, index freshness and filters are the practical concerns. Trace each search as its own span with the query, number of results and scores, since weak scores are an early sign of poor retrieval.",
    example:
      "A query for \"cancel my plan\" returns the five nearest chunks, with similarity scores from 0.82 down to 0.71, each linking back to its source page.",
    related: ["embeddings", "semantic-search", "rag", "chunking"],
    link: { href: "/docs/observability", label: "Read the observability guide" },
  },
  {
    slug: "chunking",
    term: "Chunking",
    group: retrievalGroup,
    definition:
      "Chunking is splitting documents into smaller pieces before embedding and storing them, so retrieval can return just the relevant part instead of a whole file.",
    expansion:
      "Chunks that are too small lose meaning, and chunks that are too large dilute it and waste tokens. Splitting along natural boundaries such as headings and paragraphs, with a little overlap, usually works better than cutting at a fixed length. Changing your chunking changes retrieval quality, so re-run your evaluation set after any change.",
    example:
      "A 20-page handbook is split by section into 60 chunks of about 300 words, each tagged with its heading and page.",
    related: ["rag", "embeddings", "vector-database", "reranking"],
    link: { href: "/docs/evaluation", label: "Read about evaluation" },
  },
  {
    slug: "reranking",
    term: "Reranking",
    group: retrievalGroup,
    definition:
      "Reranking is a second pass that reorders the results of a first search using a more careful relevance model, so the best passages come first and weak ones are dropped.",
    expansion:
      "The first search is fast but rough, so you fetch more candidates than you need, perhaps 30. A reranker scores each candidate against the question and you keep the top few. This often improves answers more than changing the embedding model, at the cost of extra latency you can see in the trace.",
    example:
      "Vector search returns 30 chunks. The reranker keeps the best four, and the correct policy paragraph moves from position 11 to position 1.",
    related: ["rag", "semantic-search", "chunking", "latency"],
    link: { href: "/docs/evaluation", label: "Read about evaluation" },
  },
  {
    slug: "grounding",
    term: "Grounding",
    group: retrievalGroup,
    definition:
      "Grounding means tying a model's answer to specific source material, such as retrieved documents or tool results, so each claim can be checked against evidence.",
    expansion:
      "A grounded answer cites or quotes its source and says so when the source does not contain the answer. It is the main defense against hallucination in retrieval systems. You can score it automatically by checking whether each claim is supported by the retrieved text, then review the failures by hand.",
    example:
      "Asked about warranty length, the agent answers \"two years\" and links the manual section that says so. Without that text, it replies that it could not find the information.",
    related: ["hallucination", "rag", "llm-as-a-judge", "agent-evaluation"],
    link: { href: "/docs/evaluation", label: "Read about evaluation" },
  },
  {
    slug: "semantic-search",
    term: "Semantic search",
    group: retrievalGroup,
    definition:
      "Semantic search finds text by meaning rather than by exact words, using embeddings to compare a query with documents. A search for \"car won't start\" can find a page about a dead battery.",
    expansion:
      "It handles synonyms and paraphrases well but can miss exact identifiers like error codes or product names, so many systems combine it with keyword search and rerank the merged results. Always check results on your own questions; similarity scores are not a guarantee of relevance.",
    example:
      "A search for \"how do I stop being charged\" returns the cancellation article even though it never uses the word \"charged\".",
    related: ["embeddings", "vector-database", "reranking", "rag"],
    link: { href: "/docs/observability", label: "Read the observability guide" },
  },
];
