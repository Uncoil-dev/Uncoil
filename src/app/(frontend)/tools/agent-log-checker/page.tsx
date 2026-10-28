import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { LogChecker } from "@/components/marketing/tools/log-checker";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("agent-log-checker");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Paste your log", body: "A JSON trace, JSON lines, an OpenTelemetry export, a chat message list with tool calls, or a plain text log. Or open a file." },
  { title: "Read the findings", body: "The first failure comes first, then slow steps, repeated calls, retry storms, loops and growing prompts." },
  { title: "Try the fix", body: "Each finding says what it means in plain words and what to try next. Then run the agent again." },
];

const faqs: Faq[] = [
  { q: "What kinds of logs does it read?", a: "JSON traces and span lists, JSON lines, OpenTelemetry exports, OpenAI and Anthropic style message lists with tool calls, and plain text logs with or without timestamps. If the format is unusual, it still reads what it can and tells you what was missing." },
  { q: "Is my log uploaded anywhere?", a: "No. The log is read by code running in your browser and is gone when you close the tab. Still remove API keys and personal data before pasting into any tool." },
  { q: "How does it decide a step was slow?", a: "A step is flagged when it takes at least twice the typical step and at least 15% of all timed work. That avoids flagging every step in a run where everything is slow." },
  { q: "How are wasted tokens counted?", a: "Tokens in repeated identical calls (after the first) and tokens spent on steps that failed. If your log has no token counts, it cannot measure them and says so, rather than guessing." },
  { q: "Can it find why an agent loops?", a: "It spots the loop and shows which steps repeat and how many times. The cause is usually a tool that returns the same result, or an agent with no rule for when to stop. Uncoil shows loops across every run automatically." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Why did my agent fail?"
      lede="Paste an agent log or trace. See where it failed, which steps were slow and where tokens were wasted, with something to try next."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Find the step that broke."
      steps={steps}
      faqs={faqs}
      notes={<p>{"The checker reads common field names (duration_ms, usage.prompt_tokens, status, error and more) and guesses the rest. A bare \u201cduration\u201d is read as milliseconds. When a log has no token counts, token waste cannot be measured, and when counts are estimated from text length it says so."}</p>}
    >
      <LogChecker />
    </ToolPage>
  );
}
