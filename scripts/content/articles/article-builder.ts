import { bullets, createDocument, heading, link, media, numbered, paragraph, quote } from "../lexical.ts";

export type ArticleBlueprint = {
  title: string;
  keyword: string;
  thesis: string;
  audience: string;
  framework: string;
  outcome: string;
  uncoilLink: string;
  related: readonly [string, string, ...string[]];
  topics: readonly [string, string, string, string, string];
  signals: readonly [string, string, string, string, string];
  failure: string;
  example: string;
  decision: string;
};

const blogUrl = (slug: string) => `/blog/${slug}`;

const sentenceCase = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

const deepDive = (topic: string, signal: string, blueprint: ArticleBlueprint) => [
  paragraph(`${topic} deserves an explicit operating decision, not a vague expectation. Teams often see it only after ${blueprint.failure}, when the pressure to restore service makes every signal look equally important. Start by naming the decision that ${topic} must support: whether a run may continue, whether an operator should intervene, whether a release should advance, or whether a customer outcome needs repair. That decision determines the unit of analysis, the useful time window, and who owns the response. ${blueprint.title} is more useful when it turns a technical trace into that concrete decision.`),
  paragraph(`The most useful evidence combines ${signal} with the surrounding execution context. A number without an input, tool result, model setting, prompt revision, retry history, and final outcome can suggest a correlation without establishing a cause. Capture the smallest stable identifiers that connect those pieces, then preserve the raw values needed for authorized investigation. This is not a request to retain every possible datum forever. It is a request to make the path from observed behavior to an accountable explanation short enough for the people operating the system.`),
  paragraph(`A practical review asks three questions. What normal behavior looks like for ${topic}; what deviation changes risk or user impact; and what action follows the deviation. The answer should be written before a dashboard or alert is created. For example, a slower run may be acceptable when it completes a high-value task, while the same delay can be unacceptable in an interactive flow. The threshold therefore belongs to a service promise and a workflow, not to a generic chart. This keeps ${blueprint.keyword} connected to the outcome ${sentenceCase(blueprint.outcome)}.`),
  paragraph(`Treat the first version as a learning instrument. Review a small sample of successful, degraded, and failed runs, and compare the classification against what an experienced operator concludes from the full context. If the signal creates noise, refine the event boundary or add missing context instead of silently lowering attention. If it misses meaningful cases, inspect the false negatives for a shared pattern. That feedback loop makes the measurement defensible and prevents the team from turning an early proxy into a permanent definition of quality.`),
];

export const buildLongformArticle = (blueprint: ArticleBlueprint, mediaId: number) => {
  const contents = [
    "A working definition and the decisions it supports",
    `The ${blueprint.framework} framework`,
    "Signals, context, and ownership",
    "A grounded production example",
    "Operating cadence, visual guides, and checklist",
    "Frequently asked questions and the next step",
  ];

  const children = [
    heading("h2", `Introduction: why ${blueprint.keyword} needs an operating model`),
    paragraph(`${blueprint.title} is a guide for ${blueprint.audience}. The central idea is simple: a capable-looking agent is not necessarily an understandable or controllable system. Language-model behavior is conditional on instructions, retrieved context, tool responses, runtime conditions, and the choices made after each intermediate result. A team can watch a polished demo and still be unable to answer the questions that matter when a user reports a bad outcome. What happened in this run? Which decision changed the path? Was the result wrong, slow, expensive, unsafe, or merely surprising? And what evidence would justify changing the system?`),
    paragraph(`${blueprint.thesis} This guide treats those questions as an engineering and leadership responsibility. The goal is not to manufacture certainty from a probabilistic component. It is to give people enough timely, connected evidence to set boundaries, investigate deviations, compare alternatives, and learn from real operation. That distinction matters because teams can otherwise accumulate impressive telemetry while remaining unable to explain a user-visible result or decide whether a change helped.`),
    quote(`A useful AI operating practice turns an observed run into a decision, an owner, and a reversible next action.`),
    media(mediaId),

    heading("h2", "Contents"),
    bullets(contents),

    heading("h2", `A working definition of ${blueprint.keyword}`),
    paragraph(`${blueprint.keyword} is the discipline of recording and interpreting enough execution evidence to understand how an AI-enabled workflow behaved, whether it met its intended outcome, and what should happen next. It includes technical telemetry, but it is broader than logging model requests. The unit that people care about is usually an end-to-end task: a user request, a retrieval step, one or more model calls, a tool action, a retry or approval, and a final result. The evidence must keep those events connected without pretending that one metric can stand in for the whole task.`),
    paragraph(`This definition makes room for different roles. An engineer needs causally useful context when investigating a failure. A product owner needs a stable way to see whether the workflow is helping users. A security or risk reviewer needs proof that boundaries and approvals were honored. An engineering leader needs a release decision that is based on representative behavior rather than a single memorable transcript. All of them use the same underlying story of a run, but they ask different questions of it.`),
    heading("h3", "Start with outcomes, not dashboards"),
    paragraph(`Before choosing fields or tools, write the outcome the workflow is supposed to produce and the harm it must avoid. ${blueprint.outcome} is a better anchor than a generic request to improve accuracy. It gives teams a way to distinguish a healthy unusual case from a concerning ordinary case. It also exposes where a human decision is required. A measurement program cannot remove that judgment, but it can make the judgment repeatable, reviewable, and easier to improve.`),

    heading("h2", `The ${blueprint.framework} framework`),
    paragraph(`Use ${blueprint.framework} as a compact way to organize the work. First, define the task boundary and success condition. Second, preserve the execution path as connected evidence. Third, classify the result using a mix of automated checks and sampled human review. Fourth, choose a response that is proportionate to impact: continue, retry within a bound, ask for approval, repair, or stop. Finally, feed the confirmed result into a change decision. The framework is deliberately cyclical. Production behavior should improve the next test set, runbook, prompt review, and release gate.`),
    numbered([
      "Frame the user-facing task, its allowed actions, and its measurable success condition.",
      "Follow the execution path across models, tools, retries, dependencies, and handoffs.",
      "Assess outcome quality and operational cost with context, not a single proxy.",
      "Respond through a named owner, a bounded policy, and a documented escalation path.",
      "Learn by turning reviewed evidence into tests, evaluations, controls, or a rollback decision.",
    ]),
    heading("h3", "Why the loop is more important than any individual tool"),
    paragraph(`A tracing tool, an evaluation dataset, or a cost report is useful only when it closes part of this loop. The failure mode is collecting data because collection feels prudent, then discovering during an incident that no one knows which run is representative, which version changed, or who may make a corrective decision. A smaller system with explicit task boundaries and owners generally teaches more than a larger system filled with unactionable events. Add detail where it changes an investigation or release decision; resist detail that only increases storage and review burden.`),

    heading("h2", "Signals, context, and ownership"),
    paragraph(`Instrumentation should describe the actual workflow rather than the architecture diagram people wish they had. Record a stable run identifier, relevant session or request identifier, environment and release marker, start and finish times, model and provider configuration where permitted, prompt or policy revision, tool names and outcomes, retry decisions, and a final task status. Then connect quality, latency, and cost signals to that same run. The point is to make comparison possible: this run against a baseline, this release against the prior release, and this failure pattern against an owned response.`),
    heading("h3", "Use a layered evidence model"),
    paragraph(`Layer one is task evidence: input class, intended outcome, final status, and user-visible effect. Layer two is execution evidence: spans for model calls, retrieval, tools, validation, retries, and approvals. Layer three is governance evidence: version identifiers, access boundaries, review labels, and the decision that authorized a consequential action. Each layer answers a different question. Keeping them distinct prevents teams from confusing a fast response with a good outcome or a successful API call with a safe business action.`),
    paragraph(`Ownership completes the model. Every signal should have a consumer, a cadence, and an action. A latency distribution might be reviewed weekly by the platform team, while a safety-boundary violation demands immediate triage by the workflow owner. A cost increase may trigger an experiment rather than an incident. Put these rules in a short runbook. People should not have to negotiate the meaning of an alert while a customer is waiting for a response.`),

    heading("h2", "Detailed operating practices"),
    ...blueprint.topics.flatMap((topic, index) => [heading("h3", topic), ...deepDive(topic, blueprint.signals[index], blueprint)]),

    heading("h2", "Decision records that survive handoffs"),
    paragraph(`A durable operating practice leaves behind a short decision record whenever the team changes a material boundary. The record should name the task class, the observed evidence, the hypothesis, the proposed change, the expected benefit, the risks being watched, the accountable owner, and the date for review. It does not need to be a long narrative. Its purpose is to prevent a familiar failure: a reasonable change is made during a fast-moving moment, then the original context disappears and later reviewers cannot distinguish a measured improvement from an accidental drift. In ${blueprint.title}, a decision record makes ${blueprint.decision} visible to the next engineer and the next release reviewer.`),
    paragraph(`Good records separate observations from interpretations. “Thirty percent of reviewed runs needed a clarification after a tool timeout” is an observation when the sample and classification are stated. “The model is confused” is an interpretation that may be useful but requires supporting evidence. The distinction is not bureaucratic. It lets a team revise a theory without losing the facts that led to it. When the interpretation turns out to be wrong, the record still points to the next question: were inputs incomplete, did a dependency fail, did a policy constraint apply, or did the expected outcome need better definition?`),
    paragraph(`This discipline is especially important for AI-enabled workflows because several components can be individually healthy while the task outcome is poor. A provider request can succeed, a tool can return data, and an output can look fluent, yet the result may be irrelevant, unsupported, too late, or inappropriate for the requested action. Review the task as a chain of commitments. What did the system infer? What action did it choose? What evidence supported that action? What constraint should have stopped it? A decision record keeps those commitments inspectable instead of letting them collapse into a generic error label.`),
    heading("h3", "Use comparison cohorts carefully"),
    paragraph(`Most production questions are comparative. Did the new revision improve behavior? Is one input class disproportionately slow? Does a routing policy save money without reducing completion? Comparisons work only when cohorts are meaningful. Hold the task definition stable, identify the relevant release or policy version, account for material changes in traffic and dependency conditions, and report sample limitations. Avoid comparing a high-complexity cohort with a simple baseline just because the aggregate number is convenient. When uncertainty remains, state it plainly and collect the next sample deliberately.`),
    paragraph(`A small cohort can still be valuable when it represents a consequential edge case. The team should not wait for a large volume of customer harm before addressing a well-understood failure mechanism. In that situation, combine the targeted example with a wider baseline and explain the scope of the claim. The practical question is not whether every metric is statistically definitive; it is whether the current evidence is sufficient for the decision at hand and whether the chosen response is reversible if uncertainty proves important.`),
    heading("h3", "Avoid proxy traps"),
    paragraph(`Every operating metric is a proxy for a more important outcome. Completion rate may hide a poor result that users silently correct. A low latency number may come from skipping valuable validation. Reduced token usage may reflect lost context. Human approval rate may rise because the agent is wisely cautious, or because it cannot complete ordinary work. Pair each proxy with a review path that checks the outcome it is meant to represent. The point is not to make measurement impossible; it is to keep the team from optimizing a number after it has lost contact with the user and the workflow.`),
    paragraph(`Proxy traps become visible through disagreement. If an automated score says a task passed but reviewers repeatedly identify unsupported claims, inspect the rubric, the sample, and the evidence available to the scorer. If users report poor experiences while the run status is successful, study what “success” means in the implementation. These disagreements are often the most valuable learning material because they reveal a mismatch between system telemetry and the real service promise. Record them, classify them, and use them to revise the measurement rather than smoothing them away.`),
    heading("h3", "Make escalation humane and specific"),
    paragraph(`Human review is not a failure of automation. It is a controlled response to ambiguity, missing authority, high consequence, or low confidence. An effective escalation packet contains the minimum context a reviewer needs: the task request, relevant evidence, the action proposed or blocked, the policy or uncertainty that triggered escalation, and the time sensitivity. It should not dump an entire unstructured transcript on a person who is already handling exceptions. The reviewer needs a question they can answer and a clear record of their decision.`),
    paragraph(`Define what happens after that decision as well. If the reviewer approves, can the workflow proceed once or must it revalidate stale data? If the reviewer rejects, does the agent provide a safe explanation, retry a different path, or close the task? If no reviewer responds, what is the bounded fallback? These details turn a nominal approval step into an actual reliability control. They also produce evidence that can reveal whether the system is improving: a falling escalation rate may be good only if sampled quality and safety remain sound.`),
    heading("h3", "Build for learning without overclaiming"),
    paragraph(`The right conclusion from a review is often modest. A team may know that a change improved one task class under observed conditions without knowing that it generalizes to every future input. Say what the evidence supports, what it does not support, and what will be watched next. This protects users and makes collaboration easier. Engineering leaders can make a staged investment decision; operators can add an explicit watchpoint; product partners can choose whether the remaining uncertainty is acceptable for the intended audience.`),
    paragraph(`Over time, the records, traces, examples, and review decisions become a practical memory for the service. They show not just what broke but how the organization recognized the issue, who acted, and what evidence justified the fix. That memory is one of the most valuable outputs of ${blueprint.keyword}. It allows a team to improve deliberately even as models, prompts, tools, and user expectations change, while keeping claims proportional to the evidence actually collected.`),

    heading("h2", "A grounded production example"),
    paragraph(`Consider ${blueprint.example}. The first report may say only that the agent produced an unhelpful answer. A good investigation does not jump directly to a prompt rewrite. It reconstructs the task boundary: the request class, the expected action, the policy that applied, the retrieved or supplied context, the selected model configuration, tool outcomes, retry path, final response, and user effect. The team then compares this path with a known-good sample from the same workflow and release. The comparison narrows the question from “why are agents unreliable?” to a testable difference in evidence.`),
    paragraph(`Suppose the evidence shows a valid tool response arrived after an earlier model step inferred that the tool had failed. The correction may be a clearer tool-state contract, a bounded wait, or a validation step before a final answer. Suppose instead that the tool response was correct but stale for the user’s request. The correction might be retrieval freshness controls or an explicit date check. In both cases, the visible symptom is similar, but the remedy differs. That is why a run-level narrative is more useful than a dashboard total.`),
    heading("h3", "Turn the finding into a safe change"),
    paragraph(`Capture the failing case in a scenario suite, state the expected outcome and unacceptable behavior, and choose a leading signal that will reveal recurrence. Test the proposed change against representative cases, including cases that previously worked. Release behind an appropriate boundary when the impact justifies it. After release, review the same evidence for a defined observation period. If the outcome improves without creating a material regression in quality, latency, cost, or risk, keep the change. If not, use the version identifier and rollback path rather than debating from memory.`),

    heading("h2", "Operating cadence and decision hygiene"),
    paragraph(`The work becomes sustainable when it has a rhythm. During ordinary operation, sample completed runs and look for drift across input classes, outcomes, latency, and cost. Before a change, review the scenarios most likely to reveal a meaningful regression. During an incident, assign one person to reconstruct the timeline and another to protect users through the existing fallback or pause policy. After the incident, decide which evidence was missing and whether a new test, label, trace field, or boundary would have made the response faster and safer. Avoid a ritual that produces reports with no changed decision.`),
    paragraph(`Leaders should ask for decision-quality artifacts rather than a larger dashboard. A concise weekly review can include the top outcome risk, the affected task class, the evidence behind the classification, the named owner, and the next reversible action. This connects technical uncertainty to accountable delivery. It also makes it easier to say no to a rollout when the team lacks representative evidence, which is a sign of maturity rather than a lack of ambition.`),

    heading("h2", "Visual guide"),
    bullets([
      `Illustration opportunity: a monochrome run map that follows ${blueprint.keyword} from request through model, tool, review, and outcome, with acid-yellow markers for decision points.`,
      `Diagram opportunity: a ${blueprint.framework} loop showing how observed production evidence becomes a test, release gate, or recovery policy.`,
      "Comparison opportunity: a two-column incident view contrasting a disconnected event log with a connected, owner-aware run narrative.",
    ]),

    heading("h2", "Operational checklist"),
    bullets([
      "Write the task boundary, intended outcome, and unacceptable outcomes in plain language.",
      "Assign stable run, release, and version identifiers before adding high-volume telemetry.",
      "Capture model, tool, retry, validation, and approval events as connected execution evidence.",
      "Define who reviews each signal, how often, and what action follows a deviation.",
      "Build a small representative scenario set from successful, degraded, and failed real cases.",
      "Test changes against that set and preserve the comparison with the previous version.",
      "Use bounded retries, fallbacks, and human escalation where the workflow can cause harm.",
      "Review false positives and false negatives so thresholds evolve from evidence rather than frustration.",
      "Document rollback or pause conditions before a consequential release.",
      "Feed confirmed production findings back into tests, evaluations, policies, and ownership notes.",
    ]),

    heading("h2", "Related reading and implementation resources"),
    paragraph(`This topic is strongest when it is connected to adjacent operating practices. Read the related guides below as a sequence, not as interchangeable keywords: each addresses a different decision in the lifecycle.`),
    link("Related guide", blogUrl(blueprint.related[0])),
    link("Related guide", blogUrl(blueprint.related[1])),
    link("Explore the relevant Uncoil workflow", blueprint.uncoilLink),

    heading("h2", "Frequently asked questions"),
    heading("h3", `Is ${blueprint.keyword} only for large teams?`),
    paragraph(`No. A small team benefits from a clear task boundary, a stable run identifier, a short scenario suite, and a decision rule even before it adopts a dedicated platform. Start with the workflow that has the clearest customer impact or the most expensive failure. The discipline scales because it begins with questions and ownership, not with a prescribed volume of data.`),
    heading("h3", "Do automated scores replace human review?"),
    paragraph(`No. Automated checks can make broad comparison and regression detection practical, but they reflect the criteria and data used to construct them. Use them alongside sampled human review for ambiguous, high-impact, or changing cases. When the two disagree, treat the disagreement as evidence about the evaluation or the task definition, not as a reason to discard one source automatically.`),
    heading("h3", "How much data should a team retain?"),
    paragraph(`Retain what is necessary for authorized investigation, audit, and improvement, subject to privacy, security, contractual, and regulatory requirements. Separate identifiers and metadata from sensitive content where possible, minimize access, and define retention deliberately. More data is not automatically better if it cannot be reviewed safely or linked to a decision.`),
    heading("h3", "What is the first useful milestone?"),
    paragraph(`Pick one end-to-end task. Define success and unacceptable outcomes, trace its execution path, collect a modest set of representative examples, and write the escalation path. That milestone gives the team a baseline for future instrumentation and a way to verify that the next change improves the outcome ${sentenceCase(blueprint.outcome)}.`),

    heading("h2", `Next step: make ${blueprint.keyword} actionable`),
    paragraph(`Start with one workflow this week. Instrument the evidence needed to explain a single completed run, review it against the intended outcome, and turn the finding into a named test or operating decision. Then use the relevant Uncoil resource above to inspect the connected execution path. The final CTA is deliberately practical: choose one bounded improvement, measure its effect, and keep the rollback path clear.`),
  ];

  return createDocument(children);
};
