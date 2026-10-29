import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { AiStatus } from "@/components/marketing/tools/ai-status";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("ai-api-status");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Open the page", body: "Status is read from each provider's public status feed when you load it." },
  { title: "Look for problems", body: "Each provider shows its state, open incidents and any affected components." },
  { title: "Open the official page", body: "Every card links to the provider's own status page for the full story." },
];

const faqs: Faq[] = [
  { q: "Where does this data come from?", a: "Directly from each provider's public status feed, fetched by our server and cached for about a minute. We do not guess or run our own checks." },
  { q: "Why does a provider show as Unknown?", a: "Its status feed could not be reached or was not in a format we understand. We never show green without a real answer. Use the link to check its page." },
  { q: "Why is the API failing for me when the page says operational?", a: "Status pages lag, and problems can be limited to one model, region or account. Check your own error rates and latency, which is what Uncoil shows." },
  { q: "How often does it update?", a: "The page checks once a minute while it is open, and the server caches answers for about a minute." },
  { q: "Can I get alerts when a provider goes down?", a: "Uncoil alerts you when error rates or latency jump in your own agent traffic, which usually shows up before a status page does." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Is the AI API down?"
      lede="Live status of OpenAI, Anthropic, Gemini and more, read straight from each provider's own status page."
      toolEyebrow="Live / refreshes every minute"
      toolTitle="One page for every provider."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Status is only as fast as the provider's own page, and providers often post an incident minutes after users first see errors. If a provider's feed cannot be read, it is shown as \u201cUnknown\u201d, never as operational. For problems in your own traffic, you need your own monitoring."}</p>}
    >
      <AiStatus />
    </ToolPage>
  );
}
