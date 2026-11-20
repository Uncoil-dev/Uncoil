import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { ObservabilityBillCalculator } from "@/components/marketing/tools/observability-bill-calculator";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("ai-observability-cost-calculator");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Enter your traffic", body: "Runs a month, steps per run and how many people look at traces." },
  { title: "We convert it for each tool", body: "Langfuse counts units, LangSmith counts traces, Helicone counts requests and Uncoil counts spans." },
  { title: "Compare the monthly bill", body: "See the plan each tool would put you on and what it costs." },
];

const faqs: Faq[] = [
  { q: "Why do the same runs cost different amounts?", a: "Each tool counts something different. Langfuse bills traces, steps and scores as units. LangSmith bills traces and charges per seat. Helicone bills requests. Uncoil bills spans on a flat plan." },
  { q: "Why does a bill say 'at least'?", a: "LangSmith and Helicone charge usage-based prices above their included amount, but their pricing pages do not say the rate. We show the part that is published and do not guess the rest." },
  { q: "Where do the prices come from?", a: "Each vendor's public pricing page, read on the date shown under the result. Prices change, so check the vendor before you decide." },
  { q: "What is a span?", a: "One step inside a run: a model call, a tool call or the run itself. Uncoil counts one span for the run plus one for every model and tool call." },
  { q: "Is anything uploaded?", a: "No. The sums run in your browser. Nothing you enter leaves the page." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="What would tracing cost you?"
      lede="Enter your traffic once and see the monthly bill on Langfuse, LangSmith, Helicone and Uncoil."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Same traffic, four bills."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Example numbers are not your traffic. Replace them with your own. Free tiers have limits on history and members, shown beside each result."}</p>}
    >
      <ObservabilityBillCalculator />
    </ToolPage>
  );
}
