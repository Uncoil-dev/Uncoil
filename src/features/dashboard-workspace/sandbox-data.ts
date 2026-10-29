import type { DashboardWorkspace } from "./contracts";

const traces = [
  ["trace_150656", "handle-chatbot-message", "Completed", "production", "2026-09-06 15:06:56", "6.61s", "—", "default", "0.97", "usr_olivia", "session_checkout_104"],
  ["trace_145453", "handle-chatbot-message", "Completed", "production", "2026-09-06 14:54:53", "20.25s", "—", "default", "0.94", "usr_noah", "session_policy_882"],
  ["trace_145440", "handle-chatbot-message", "Completed", "production", "2026-09-06 14:54:40", "4.16s", "—", "default", "0.92", "usr_emma", "session_orders_551"],
  ["trace_145235", "handle-chatbot-message", "Completed", "production", "2026-09-06 14:52:35", "44.93s", "—", "default", "0.88", "usr_liam", "session_account_020"],
  ["trace_145134", "handle-chatbot-message", "Completed", "production", "2026-09-06 14:51:34", "19.33s", "—", "default", "0.91", "usr_ava", "session_voice_440"],
  ["trace_134555", "handle-chatbot-message", "Completed", "production", "2026-09-06 13:45:55", "20.06s", "—", "default", "0.93", "usr_mia", "session_incident_148"],
  ["trace_132111", "handle-chatbot-message", "Completed", "production", "2026-09-06 13:21:11", "78s", "—", "default", "0.86", "usr_olivia", "session_support_111"],
  ["trace_132045", "handle-chatbot-message", "Completed", "production", "2026-09-06 13:20:45", "15.64s", "—", "default", "0.84", "usr_noah", "session_support_045"],
  ["trace_132011", "handle-chatbot-message", "Completed", "production", "2026-09-06 13:20:11", "4.85s", "—", "default", "0.82", "usr_emma", "session_support_011"],
  ["trace_131959", "handle-chatbot-message", "Completed", "production", "2026-09-06 13:19:59", "7.30s", "—", "default", "0.80", "usr_liam", "session_support_959"],
  ["trace_125932", "voice-conversation", "Completed", "production", "2026-09-06 12:59:32", "34.18s", "—", "default", "0.78", "usr_ava", "session_voice_932"],
  ["trace_125401", "handle-chatbot-message", "Completed", "production", "2026-09-06 12:54:01", "24.78s", "—", "default", "0.76", "usr_mia", "session_support_401"],
  ["trace_124540", "voice-conversation", "Completed", "production", "2026-09-06 12:45:40", "36.49s", "—", "default", "0.74", "usr_olivia", "session_voice_540"],
  ["trace_121928", "handle-chatbot-message", "Completed", "production", "2026-09-06 12:19:28", "15.41s", "—", "default", "0.72", "usr_noah", "session_support_928"],
  ["trace_121909", "handle-chatbot-message", "Completed", "production", "2026-09-06 12:19:09", "6.90s", "—", "default", "0.70", "usr_emma", "session_support_909"],
  ["trace_111617", "handle-chatbot-message", "Completed", "production", "2026-09-06 11:16:50", "25.98s", "—", "default", "0.68", "usr_liam", "session_support_650"],
  ["trace_104519", "image-generator", "Completed", "production", "2026-09-06 10:45:19", "10.72s", "$0.010", "gpt-image-1", "0.66", "usr_ava", "session_image_519"],
  ["trace_104504", "sentiment-classifier", "Completed", "production", "2026-09-06 10:45:04", "2.13s", "—", "default", "0.64", "usr_mia", "session_sentiment_504"],
  ["trace_104433", "handle-chatbot-message", "Completed", "production", "2026-09-06 10:44:33", "36.27s", "—", "default", "0.62", "usr_olivia", "session_support_433"],
] as const;

const referenceTraceInputs = [
  "abc", "I mean integration", "how we can setup OpenAPI along with Uncoil", "My backend logic is C#, can I use all the features of Uncoil?", "What can I use Uncoil for?", "What can I use Uncoil for?", "show me the trace", "py", "adk2", "show me", "yes", "What is 1 + 1?", "What can I use Uncoil for?", "What can I use Uncoil for?", "A sunset over mountains in watercolor style", "[{},{}]", "where is the answer to my question?", "Explain how I can utilize Uncoil as an SRE", "What can I use Uncoil for?", "How do I get started with tracing?",
] as const;

const referenceTraceNames = [
  "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot", "QA-Chatbot",
  "livekit-voice-agent", "QA-Chatbot", "livekit-voice-agent", "QA-Chatbot", "Image-Generator", "QA-Chatbot", "Sentiment-Classifier", "QA-Chatbot", "QA-Chatbot",
] as const;
const referenceTraceOutputs = [
  "Could you share what you need help with in Uncoil—for example SDK setup (which language), adding traces/spans/generations, evaluations, self-hosting, or API usage?",
  "Got it — \"integration\" could mean either OpenAI (the LLM API) or OpenAPI (the Swagger/REST API spec). Which one do you mean?",
  "Do you mean integrating Uncoil with OpenAI (the LLM API) or with OpenAPI (the Swagger/REST API spec)?",
  "Short answer: Yes. While there’s no native C# SDK, you can use the Uncoil HTTP API or OpenTelemetry to send traces.",
  "Uncoil is an AI agent observability platform for tracing, evaluating, and improving LLM applications.",
  "Uncoil is an AI agent observability platform for tracing, evaluating, and improving LLM applications.",
  "Here’s how to get and view the current trace URL in Uncoil.",
  "Here’s a minimal, runnable example for the Uncoil SDK.",
  "Do you mean the Uncoil SDK v2? If so, which language are you using?",
  "What would you like me to show you in Uncoil?",
  "Great! Here are minimal, runnable examples to get started.",
  "Would you like a quick example of setting up a simple calculation trace?",
  "Uncoil helps you build, debug, and improve LLM applications with tracing and evaluation.",
  "Here are the steps to inspect a trace and its observations.",
  "A sunset over mountains in watercolor style.",
] as const;

const traceRecords = traces.map(([id, name, status, environment, timestamp, latency, cost, model, score, userId, sessionId], index) => ({
  id,
  name,
  status,
  environment,
  timestamp,
  latency,
  cost,
  model,
  score,
  userId,
  sessionId,
  traceName: referenceTraceNames[index] ?? "QA-Chatbot",
  input: referenceTraceInputs[index] ?? `Investigate ${name.toLowerCase()} and return a grounded answer.`,
  output: (status as string) === "Failed" ? "Tool request timed out before a verified answer was available." : referenceTraceOutputs[index] ?? "Completed with linked evidence and a verified final response.",
}));

const referenceAdditionalTraces = [
  ["2026-09-06 10:44:33", "handle-chatbot-message", "QA-Chatbot", "where is the answer to my question?"],
  ["2026-09-06 10:41:08", "handle-chatbot-message", "QA-Chatbot", "Explain how I can utilize Uncoil as an SRE and how to integrate it with my AI team's workflow to achieve the best results"],
  ["2026-09-06 10:15:12", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 09:54:01", "handle-chatbot-message", "QA-Chatbot", "How do I get started with tracing?"],
  ["2026-09-06 08:30:40", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 07:43:28", "sentiment-classifier", "Sentiment-Classifier", "[{},{}]"],
  ["2026-09-06 07:08:15", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 05:15:46", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 03:29:39", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 03:19:38", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 01:42:29", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 01:35:19", "handle-chatbot-message", "QA-Chatbot", "give me a brief overview of uncoil."],
  ["2026-09-06 01:35:01", "handle-chatbot-message", "QA-Chatbot", "what tools do you have?"],
  ["2026-09-06 01:34:51", "handle-chatbot-message", "QA-Chatbot", "Hi, I need some help adding some numbers, can you assist?"],
  ["2026-09-06 00:32:21", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-06 00:28:54", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-05 22:03:00", "handle-chatbot-message", "QA-Chatbot", ""],
  ["2026-09-05 21:21:05", "handle-chatbot-message", "QA-Chatbot", "what all purpose this can solve"],
  ["2026-09-05 21:16:41", "handle-chatbot-message", "QA-Chatbot", "hello"],
  ["2026-09-05 21:11:44", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
  ["2026-09-05 20:02:35", "voice-conversation", "livekit-voice-agent", "[]"],
  ["2026-09-05 17:06:15", "handle-chatbot-message", "QA-Chatbot", "What can I use Uncoil for?"],
] as const;
const tracingRecords = [...traceRecords, ...referenceAdditionalTraces.map(([timestamp, name, traceName, input], index) => ({
  id: `trace_reference_${index + traceRecords.length}`,
  name,
  traceName,
  status: "Completed",
  environment: "production",
  timestamp,
  latency: "12.00s",
  cost: "—",
  model: "default",
  score: "0.82",
  userId: "",
  sessionId: "",
  input,
  output: "Completed with linked evidence and a verified final response.",
}))];

const referenceSessionIds = [
  "chat_e3649383-4371-439f-9b79-1b8da230fb3f", "chat_ae2c8d6b-f583-4a99-a6f8-38016efee41a", "chat_1eb963c1-6721-46f6-895c-8669df1f8c10", "chat_4a1b55be-7957-4490-b6b8-4d001d3f02da", "chat_6946882b-b685-407b-9987-3ad595436c71", "chat_efc12813-df7d-46f0-88f8-d869a2241451", "voice-agent-u-wdKQeQ-cD_yatVoCOBUGp", "chat_011cdfbc-0403-40e1-aabe-66e1f377491d", "chat_b88bb980-fefb-45f0-b384-5e317a3ebaae", "chat_f481a805-6acc-4b5b-a16f-e60718e62ba6", "chat_f08a41dc-32dc-40d1-b5b6-200fcf7077b4", "chat_4050f574-8adc-4ec9-9fa1-42eeee7b70bb", "chat_65fde9ca-19d8-4bbb-a15c-64ebeb7f718a", "chat_6e4ca2c5-f3e7-41a5-8347-ec5db6255830", "chat_fec781c9-ee41-451b-a32e-f91f69654bb4", "chat_82001084-409d-4b8a-bffc-ccaada5b9ed3", "chat_6f1439cc-bc22-4250-86e6-8020673aa11a", "chat_5eccd9be-725a-4957-b5fb-092e2f83de3a", "chat_15a6c9b3-7086-4774-b778-5877649b7111", "chat_f2e5ec66-f397-4f04-ab68-9d4b51c714af",
] as const;
const referenceSessionTimestamps = [
  "2026-09-06 15:06:56", "2026-09-06 14:54:40", "2026-09-06 14:51:34", "2026-09-06 13:45:55", "2026-09-06 13:19:59", "2026-09-06 12:54:01", "2026-09-06 12:45:40", "2026-09-06 12:19:09", "2026-09-06 11:24:17", "2026-09-06 11:16:50", "2026-09-06 10:41:08", "2026-09-06 10:15:12", "2026-09-06 09:54:01", "2026-09-06 08:30:40", "2026-09-06 07:08:15", "2026-09-06 05:15:46", "2026-09-06 03:29:39", "2026-09-06 03:19:38", "2026-09-06 01:42:29", "2026-09-06 01:34:51",
] as const;
const referenceSessionLatencies = [
  "7.00s", "34.00s", "1m 46s", "20.00s", "2m 31s", "24.00s", "14m 26s", "34.00s", "21.00s", "26.00s", "4m 01s", "24.00s", "20.00s", "25.00s", "26.00s", "21.00s", "13.00s", "17.00s", "14.00s", "1m 41s",
] as const;
const referenceSessionUserIds = [
  "u-hqLy_X6u77lTTd8j8XzlK", "u-T9A6Ej6EiVAHUip8EiEmm", "u-HpisBGihuAHyE7lhL8AzR", "u-5RTt7dcg6appD6W-QaGb_", "u-9uoFaD8WPx__fMZiFed0o", "u-X_y-Auf2mluq2WJgLHWcz", "", "u-AEFA5RuNVc93iWUPqz4Om", "u-vAJizOgX9F9up2djjxnUn", "u-sqr5wqqyXIGz6G6_LAk_h", "u-HbyabaX8tyzmPsELI8mQ_", "u-j5QgPGHGNjMohOlo97pyj", "u-rDmCcxNWfLdiiKLO474gO", "u-XzpG6DFsk_4Vqf3ApmMOv", "u-wz-axhw9gTocNPpC_VN6x", "u-OxSDdCcUTN92jbbR9vyRt1", "u-8fQaUq4Ei3nyQvGTeLS7-", "u-AzcS7u7EBWOOKxWyo15BC", "u-wNqjyRHzTrIcRxzXt6T4k", "u-WjuT3-zVCVJJLoYoJZFOt",
] as const;
const referenceSessionIdsExtended = [...referenceSessionIds, "chat_98f1d9bf-683a-4540-acc3-968cfb56b3a7", "chat_749c6d59-7faa-4d14-9b08-d58e10ea3049", "chat_79a0974c-cde1-4150-aafe-741b1d511588", "chat_2554ce7b-fdef-4e3c-b55a-c7b615dc4a8b", "chat_afe13a5f-14f1-40a5-8ab3-33f508d16b42", "voice-agent-u-NkL26fi-EiPbCSR3Bb2do", "chat_68059ad8-97ed-4f24-8679-9dbb75a8a8af"] as const;
const referenceSessionTimestampsExtended = [...referenceSessionTimestamps, "2026-09-06 00:32:21", "2026-09-06 00:28:54", "2026-09-05 22:03:00", "2026-09-05 21:16:41", "2026-09-05 21:11:44", "2026-09-05 20:02:35", "2026-09-05 17:06:15"] as const;
const referenceSessionLatenciesExtended = [...referenceSessionLatencies, "10.00s", "13.00s", "5.00s", "4m 45s", "16.00s", "34.00s", "13.00s"] as const;
const referenceSessionUserIdsExtended = [...referenceSessionUserIds, "u-INslKAAqiciwJIsHLlxHW", "u-IuCE6VxTUm90WGF5r4yTA", "u-lREiLE76MX5k15oG81qbA", "u-Ags4oLut0yalDz4SZOUrD", "u-F0MfJ250838zTpIbDGs10", "", "u-zh7g3eEY926DZYSGP0zTV"] as const;
const referenceUserIds = [
  "u-9uoFaD8WPx__fMZiFed0o", "u-WjuT3-zVCVJJLoYoJZFOt", "u-Ags4oLut0yalDz4SZOUrD", "u-AEFA5RuNVc93iWUPqz4Om", "u-HbyabaX8tyzmPsELI8mQ_", "u-T9A6Ej6EiVAHUip8EiEmm", "u-HpisBGihuAHyE7lhL8AzR", "u-dTnjZeP9k5-3--qvO9e5w", "u-vAJizOgX9F9up2djjxnUn", "u-lREiLE76MX5k15oG81qbA", "u-8fQaUq4Ei3nyQvGTeLS7-", "u-j5QgPGHGNjMohOlo97pyj", "u-INslKAAqiciwJIsHLlxHW", "u-5RTt7dcg6appD6W-QaGb_", "u-zh7g3eEY926DZYSGP0zTV", "u-i-W8qw6LimkOQ2LNJZKyE", "u-rDmCcxNWfLdiiKLO474gO", "u-XzpG6DFsk_4Vqf3ApmMOv", "u-hqLy_X6u77lTTd8j8XzlK", "u-PlkTqZhcLn7XIO0a3jYxS", "u-OxSDdCcUTN92jbbR9vyRt", "u-sqr5wqqyXIGz6G6_LAk_h", "u-wNqjyRHzTrIcRxzXt6T4k", "u-IuCE6VxTUm90WGF5r4yTA", "u-AzcS7u7EBWOOKxWyo15BC", "u-wz-axhw9gTocNPpC_VN6x", "u-X_y-Auf2mluq2WJgLHWcz", "u-F0MfJ250838zTpIbDGs10",
] as const;
const referenceUserTimestamps = [
  "2026-09-06 13:19:59", "2026-09-06 01:34:51", "2026-09-05 21:16:41", "2026-09-06 12:19:09", "2026-09-06 10:41:08", "2026-09-06 14:54:40", "2026-09-06 14:51:34", "2026-09-06 10:45:19", "2026-09-06 11:24:17", "2026-09-05 22:03:00", "2026-09-06 03:29:39", "2026-09-06 10:15:12", "2026-09-06 00:32:21", "2026-09-06 13:45:55", "2026-09-05 17:06:15", "2026-09-06 07:43:28", "2026-09-06 09:54:01", "2026-09-06 08:30:40", "2026-09-06 15:06:56", "2026-09-06 10:45:04", "2026-09-06 05:15:46", "2026-09-06 11:16:50", "2026-09-06 01:42:29", "2026-09-06 00:28:54", "2026-09-06 03:19:38", "2026-09-06 07:08:15", "2026-09-06 12:54:01", "2026-09-05 21:11:44",
] as const;
const referenceScoreNames = [
  "is_out_of_scope_request", "user_disagrees", "user-intent", "answer_relevance", "is_cursing", "all-caps-detection", "is_out_of_scope_request", "user_disagrees", "answer_relevance", "user-intent", "is_cursing", "all-caps-detection", "is_out_of_scope_request", "user_disagrees", "answer_relevance", "user-intent", "is_cursing", "all-caps-detection", "is_out_of_scope_request", "user_disagrees",
] as const;
const referenceScoreTimestamps = [
  "2026-09-06 15:07:07", "2026-09-06 15:07:07", "2026-09-06 15:07:06", "2026-09-06 15:07:06", "2026-09-06 15:07:06", "2026-09-06 15:07:04", "2026-09-06 14:55:18", "2026-09-06 14:55:17", "2026-09-06 14:55:16", "2026-09-06 14:55:16", "2026-09-06 14:55:16", "2026-09-06 14:55:14", "2026-09-06 14:54:49", "2026-09-06 14:54:48", "2026-09-06 14:54:48", "2026-09-06 14:54:47", "2026-09-06 14:53:25", "2026-09-06 14:53:23", "2026-09-06 14:53:23", "2026-09-06 14:53:22",
] as const;
const referenceScoreValues = ["False", "False", "irrelevant-to-uncoil", "0", "False", "False", "False", "False", "0.9500", "implementation-question", "False", "False", "False", "False", "0.3000", "implementation-question", "False", "False", "False", "False"] as const;


export const sandboxWorkspace: DashboardWorkspace = {
  mode: "sandbox",
  readOnly: true,
  region: "eu",
  dataSource: "uncoil-sandbox",
  project: {
    id: "uncoil-sandbox",
    name: "uncoil-docs",
    organizationName: "Uncoil Demo",
  },
  metrics: {
    traces: 41,
    observations: 474,
    totalCost: 1.20948,
    scores: 126,
  },
  environments: ["all", "production", "staging"],
  models: ["all", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.4-mini"],
  collections: {
    dashboards: {
      description: "Reusable views for cost, quality, latency, and trace volume.",
      records: [
        { id: "uncoil-home", name: "Home", status: "Default", environment: "all", timestamp: "Updated today" },
        { id: "cost-overview", name: "Cost Overview", status: "Published", environment: "production", timestamp: "Updated 12 min ago" },
        { id: "release-quality", name: "Release Quality", status: "Published", environment: "production", timestamp: "Updated 34 min ago" },
        { id: "latency-watch", name: "Latency Watch", status: "Draft", environment: "staging", timestamp: "Updated yesterday" },
      ],
    },
    costs: { description: "Review model and trace cost across environments.", records: traceRecords },
    tracing: { description: "Inspect every trace and observation emitted by instrumented agents.", records: tracingRecords },
    sessions: {
      description: "Group related traces into complete user and agent conversations.",
      records: referenceSessionIdsExtended.map((sessionId, index) => { const trace = traceRecords[index % traceRecords.length]; return { ...trace, id: sessionId, timestamp: referenceSessionTimestampsExtended[index] ?? trace.timestamp, latency: referenceSessionLatenciesExtended[index] ?? trace.latency, userId: referenceSessionUserIdsExtended[index] || trace.userId, name: trace.name.replace("investigation", "conversation"), status: (trace.status as string) === "Running" ? "Active" : "Complete" }; }),
    },
    users: {
      description: "Understand activity, quality, latency, and cost for each end user.",
      records: referenceUserIds.map((userId, index) => {
        const trace = traceRecords[index % traceRecords.length];
        return { ...trace, id: userId, userId, timestamp: referenceUserTimestamps[index] ?? trace.timestamp, name: ["Olivia Martin", "Noah Williams", "Emma Davis", "Liam Brown", "Ava Wilson", "Mia Moore"][index % 6], status: index === 2 ? "Needs review" : "Active" };
      }),
    },
    alerts: {
      description: "Monitor quality, latency, cost, and failures against operational thresholds.",
      records: [
        { id: "alert_latency", name: "P95 latency budget", status: "Triggered", environment: "production", timestamp: "8 min ago" },
        { id: "alert_failures", name: "Tool-call failure rate", status: "Healthy", environment: "production", timestamp: "12 min ago" },
        { id: "alert_cost", name: "Daily cost ceiling", status: "Healthy", environment: "all", timestamp: "21 min ago" },
      ],
    },
    prompts: {
      description: "Version, label, test, and deploy prompts used by Uncoil agents.",
      records: [
        { id: "prompt_support", name: "support-agent-system", status: "Production", environment: "production", timestamp: "Version 18", model: "gpt-5.6-luna" },
        { id: "prompt_triage", name: "incident-triage", status: "Staging", environment: "staging", timestamp: "Version 7", model: "gpt-5.4-mini" },
        { id: "order-resolution", name: "order-resolution", status: "Draft", environment: "sandbox", timestamp: "yesterday", model: "gpt-5.6-luna" },
        { id: "prompt_research", name: "research-with-citations", status: "Production", environment: "production", timestamp: "Version 12", model: "gpt-5.6-sol" },
      ],
    },
    playground: { description: "Test prompt versions and model settings against realistic inputs.", records: traceRecords.slice(0, 3) },
    scores: {
      description: "Explore numeric, categorical, and boolean quality signals attached to traces.",
      records: traceRecords.map((trace, index) => ({ ...trace, name: referenceScoreNames[index] ?? trace.name, timestamp: referenceScoreTimestamps[index] ?? trace.timestamp, score: referenceScoreValues[index] ?? trace.score, status: Number(trace.score) >= 0.8 ? "Passing" : "Failing" })),
    },
    evaluators: {
      description: "Run deterministic and model-based evaluators against production traces.",
      records: [
        { id: "eval_grounded", name: "Grounded answer", status: "Active", environment: "production", timestamp: "126 scores", model: "gpt-5.6-luna" },
        { id: "eval_policy", name: "Policy compliance", status: "Active", environment: "production", timestamp: "98 scores" },
        { id: "eval_tool", name: "Tool result used", status: "Draft", environment: "staging", timestamp: "24 scores" },
      ],
    },
    "annotation-queues": {
      description: "Route difficult traces to structured human review.",
      records: [
        { id: "queue_failed", name: "Failed support responses", status: "6 pending", environment: "production", timestamp: "Updated 4 min ago" },
        { id: "queue_quality", name: "Low quality answers", status: "12 pending", environment: "production", timestamp: "Updated 9 min ago" },
      ],
    },
    datasets: {
      description: "Build versioned test sets from representative production traces.",
      records: [
        { id: "dataset_support", name: "Support regression set", status: "48 items", environment: "production", timestamp: "Version 6" },
        { id: "dataset_policy", name: "Policy edge cases", status: "32 items", environment: "production", timestamp: "Version 3" },
        { id: "dataset_tools", name: "Tool failure recovery", status: "20 items", environment: "staging", timestamp: "Version 2" },
      ],
    },
    experiments: {
      description: "Compare candidate prompts and models against a fixed evaluation set.",
      records: [
        { id: "experiment_luna", name: "Luna support migration", status: "Complete", environment: "staging", timestamp: "42 runs", score: "0.94" },
        { id: "experiment_retry", name: "Tool retry policy", status: "Running", environment: "staging", timestamp: "18 / 32 runs", score: "0.88" },
      ],
    },
  },
};
