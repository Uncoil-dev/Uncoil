import type { Term } from "../glossary";

const group = "Models and tokens";

export const modelTerms: readonly Term[] = [
  {
    slug: "large-language-model",
    term: "Large language model (LLM)",
    group,
    definition:
      "A large language model is a neural network trained on very large amounts of text to predict the next token, which lets it write, summarize, translate, reason about text and call tools. Most AI agents use an LLM as the part that decides what to do next.",
    expansion:
      "An LLM takes tokens in and produces tokens out, one at a time. It has no memory between calls beyond what you put in the prompt, and its output can vary from call to call. These properties are why LLM applications need tracing: you have to see the exact input a model received to understand its output.",
    example:
      "A support agent sends the customer's message and a list of available tools to an LLM. The model answers with a request to call the \"lookup_order\" tool.",
    related: ["foundation-model", "token", "context-window", "llm-observability"],
    link: { href: "/product/llm-calls", label: "See how LLM calls are traced" },
    inPractice:
      "Treat the model as one component that can change under you. Record the model name and version on every call, and keep a fixed test set, so you can tell whether a provider update changed your results.",
  },
  {
    slug: "foundation-model",
    term: "Foundation model",
    group,
    definition:
      "A foundation model is a large model trained on broad data that can be adapted to many tasks, usually through prompting or fine-tuning. Large language models are the best-known kind, but the term also covers image and audio models.",
    expansion:
      "Most teams do not train a foundation model. They choose one from a provider, then shape its behavior with prompts, retrieved context and tools. That choice matters for cost, speed and quality, which is why comparing models on your own traces beats trusting a public benchmark.",
    example:
      "You run the same 200 support questions through two provider models and compare accuracy, cost per run and latency in your own traces before picking one.",
    related: ["large-language-model", "benchmark", "fine-tuning", "model-fallback"],
    link: { href: "/docs/provider-integrations", label: "See supported providers" },
    inPractice:
      "Pick the smallest model that passes your test set for each step, and keep the choice in config, not in code. Record the model on every span so cost and quality can be compared across models.",
  },
  {
    slug: "token",
    term: "Token",
    group,
    definition:
      "A token is the unit of text a language model reads and writes, usually a word piece of about four characters of English. Model providers count and bill usage in tokens, and context limits are measured in them.",
    expansion:
      "Common words are often one token, while rare words, numbers and code split into several. Other languages can use more tokens for the same meaning. Because price and speed both scale with tokens, knowing how many a call used is the starting point for cost control.",
    example:
      "The sentence \"Tracing agents is useful\" might be split into about five tokens. A 3,000-word document is roughly 4,000 tokens.",
    related: ["input-tokens", "output-tokens", "token-usage", "context-window"],
    link: { href: "/docs/costs", label: "Track model cost and latency" },
    inPractice:
      "Tokens are what you pay for and what limits context. Record input and output tokens on every model span. A sudden rise in input tokens per run usually means a prompt or retrieved document grew, and it shows up as cost long before it shows up as an error.",
  },
  {
    slug: "input-tokens",
    term: "Input tokens",
    group,
    definition:
      "Input tokens are the tokens you send to a model in a call: the system prompt, conversation history, retrieved documents, tool definitions and the user message. They are usually billed at a lower rate than output tokens.",
    expansion:
      "In agents the input grows with every step, because each loop resends the earlier messages and tool results. That makes input tokens the biggest cost driver in long runs. Prompt caching, shorter history and tighter retrieval are the main ways to reduce them.",
    example:
      "An agent step sends a 900-token system prompt, 1,500 tokens of chat history and 2,000 tokens of retrieved text. The call used 4,400 input tokens before the model wrote a word.",
    related: ["output-tokens", "prompt-caching", "context-window", "llm-cost-tracking"],
    link: { href: "/docs/costs", label: "Track model cost and latency" },
    inPractice:
      "Input tokens are usually most of the bill for agents, because every loop sends the history again. Look at which part of the input grew: system prompt, history or retrieved text. Trim that part first.",
  },
  {
    slug: "output-tokens",
    term: "Output tokens",
    group,
    definition:
      "Output tokens are the tokens a model generates in its reply. They cost more per token than input tokens and are produced one at a time, so they dominate how long a response takes.",
    expansion:
      "Latency grows with the number of output tokens, which is why asking for shorter answers or structured output often speeds up an agent. Models that reason before answering can also spend many output tokens on reasoning you never see, so check the usage numbers rather than the visible text.",
    example:
      "A classifier that returns one word uses about 3 output tokens. A model asked to explain its answer may use 300.",
    related: ["input-tokens", "max-tokens", "reasoning-model", "latency"],
    link: { href: "/docs/costs", label: "Track model cost and latency" },
    inPractice:
      "Cap output length so a runaway answer cannot cost much, and record the finish reason. A reply cut off by the limit looks fine but is incomplete. Ask for short formats when you only need a label or a number.",
  },
  {
    slug: "prompt-caching",
    term: "Prompt caching",
    group,
    definition:
      "Prompt caching lets a model provider reuse the already processed beginning of a prompt across calls, so repeated input is cheaper and faster. It only helps when the start of the prompt is identical from call to call.",
    expansion:
      "To benefit, put stable content first, such as the system prompt and tool definitions, and variable content last. Providers report cached tokens separately in usage, so tracing it shows whether your prompt layout is actually getting cache hits. A small change near the top of the prompt can silently break the cache.",
    example:
      "An agent's 3,000-token instructions never change. After the first call, later calls read them from cache at a lower price, and the trace shows 3,000 cached input tokens per step.",
    related: ["input-tokens", "system-prompt", "llm-cost-tracking", "latency"],
    link: { href: "/docs/prompt-caching", label: "Read the prompt caching guide" },
    inPractice:
      "Put the stable parts of a prompt first and the changing parts last, so the provider can reuse the start. Check the cache hit rate in your traces. If it is low, something early in the prompt changes on every call.",
  },
  {
    slug: "temperature",
    term: "Temperature",
    group,
    definition:
      "Temperature is a setting that controls how random a model's output is. Low values make answers more predictable and repeatable, and high values make them more varied.",
    expansion:
      "For extraction, classification and tool calling, a low temperature is usually the safer choice. For brainstorming or creative writing, higher values help. Even at zero, outputs are not guaranteed to be identical, and some reasoning models fix the setting for you, so record it as an attribute when you compare runs.",
    example:
      "A data-extraction step runs at temperature 0 so the same invoice always gives the same fields. A name-suggestion step runs at 0.9 for variety.",
    related: ["max-tokens", "structured-output", "hallucination", "agent-drift"],
    link: { href: "/docs/playground", label: "Try settings in the playground" },
    inPractice:
      "Use a low value for tasks with one right answer, such as extraction or tool arguments. Record the setting on each call, because a changed temperature can explain a change in results that looks like a model problem.",
  },
  {
    slug: "max-tokens",
    term: "Max tokens",
    group,
    definition:
      "Max tokens is a setting that caps how many tokens a model may generate in one reply. If the reply hits the cap, it stops mid-sentence and the call reports a length stop reason.",
    expansion:
      "It protects you from runaway cost and long waits, but a cap set too low truncates answers and can break structured output, leaving invalid JSON. Watch for runs that end because of length, since they are a common hidden cause of bad outputs and failed parsing.",
    example:
      "A summarizer is capped at 200 tokens. A long article produces a reply cut off mid-sentence, and the trace shows the stop reason \"length\".",
    related: ["output-tokens", "structured-output", "temperature", "context-window"],
    link: { href: "/docs/costs", label: "Track model cost and latency" },
    inPractice:
      "Set max tokens high enough that answers are not cut off, and low enough to cap cost. Watch for runs that end because they hit the limit, since the reply looks fine but is incomplete. Record the finish reason on every model span.",
  },
  {
    slug: "reasoning-model",
    term: "Reasoning model",
    group,
    definition:
      "A reasoning model is a language model that spends extra tokens thinking through a problem before it gives an answer. It tends to do better on multi-step tasks, at the price of more latency and cost.",
    expansion:
      "The thinking tokens are billed as output tokens even when the provider hides the text. That makes usage numbers in traces important: a short visible answer can hide a large bill. Many providers let you set how much effort the model spends, so you can use a lower setting for simple steps and a higher one for hard ones.",
    example:
      "The same question costs 150 output tokens on a standard model and 2,400 on a reasoning model, because most of those tokens are internal reasoning.",
    related: ["output-tokens", "chain-of-thought", "latency", "llm-cost-tracking"],
    link: { href: "/docs/costs", label: "Track model cost and latency" },
    inPractice:
      "Reasoning models spend extra tokens thinking, so cost and latency rise. Use them for steps that need it and a faster model for the rest. Record reasoning tokens separately so the extra cost is visible.",
  },
  {
    slug: "structured-output",
    term: "Structured output",
    group,
    definition:
      "Structured output is a model reply that follows a fixed format, usually JSON that matches a schema, so your code can read it without guessing. Many providers can enforce the schema while the model generates.",
    expansion:
      "Free text is hard to parse reliably. A schema gives you named fields, types and allowed values, and turns most formatting failures into a validation error you can count. Truncation, refusals and a schema that is too loose are the remaining failure modes to watch in traces.",
    example:
      "A triage step must return {\"priority\": \"low\" | \"high\", \"reason\": string}. Your code parses it directly and routes the ticket without reading prose.",
    related: ["function-calling", "max-tokens", "guardrails", "tool-call"],
    link: { href: "/product/llm-calls", label: "See how LLM calls are traced" },
    inPractice:
      "Validate every reply against the schema and log failures. Retry once with the error message, and if it still fails, fall back safely. Most downstream bugs start from a reply that looked right but did not match the schema.",
  },
  {
    slug: "embeddings",
    term: "Embeddings",
    group,
    definition:
      "Embeddings are lists of numbers that represent the meaning of a piece of text, so texts with similar meaning have similar numbers. They power semantic search and retrieval.",
    expansion:
      "An embedding model turns a document chunk or a question into a vector. Searching for the closest vectors finds relevant text even when the words differ. The same model must be used for both documents and queries, and changing the model means re-embedding everything.",
    example:
      "The question \"how do I get my money back?\" and a document titled \"Refund policy\" share no words, but their embeddings are close, so retrieval finds the document.",
    related: ["vector-database", "semantic-search", "rag", "chunking"],
    link: { href: "/docs/observability", label: "Read the observability guide" },
    inPractice:
      "In an agent, embeddings power retrieval: the question is turned into a vector and compared with stored vectors to find relevant text. If answers cite the wrong document, check the retrieval span first. A bad match there often comes from poor chunking or a mismatched embedding model, not from the language model.",
  },
  {
    slug: "fine-tuning",
    term: "Fine-tuning",
    group,
    definition:
      "Fine-tuning is training an existing model a little further on your own examples so it follows a style, format or task more reliably. It changes the model itself, while prompting only changes its input.",
    expansion:
      "It is worth considering when you have many good examples and prompting alone is too long, costly or inconsistent. It is not a good way to add facts that change often; retrieval handles that better. Good traces and reviewed datasets are the raw material for a fine-tuning set, and an evaluation set tells you whether it helped.",
    example:
      "You collect 800 reviewed support replies in your brand voice, fine-tune a small model on them, and check it against a held-out set before replacing the large model.",
    related: ["foundation-model", "evaluation-dataset", "golden-dataset", "agent-evaluation"],
    link: { href: "/docs/datasets", label: "Build datasets from traces" },
    inPractice:
      "Fine-tune only after a prompt change and better retrieval have failed to fix a repeatable problem. Keep a fixed evaluation set before and after, so you can prove the tuned model is better and not just different. Record the model version on every span, so a regression points to the right version.",
  },
];
