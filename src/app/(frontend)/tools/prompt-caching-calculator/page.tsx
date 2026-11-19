import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { CachingCalculator } from "@/components/marketing/tools/caching-calculator";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("prompt-caching-calculator");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Describe one call", body: "Enter the fixed part of your prompt, the part that changes, and the reply length." },
  { title: "Set your cache hit rate", body: "Guess how many calls find the fixed start already cached. Busy apps hit more often." },
  { title: "Compare models", body: "See the monthly cost with and without caching on every model that has a cache price." },
];

const faqs: Faq[] = [
  { q: "What is prompt caching?", a: "Providers store the start of a prompt they have just processed. If your next call begins with the same text, that part is billed at a much lower cached price." },
  { q: "What do I need to do to hit the cache?", a: "Keep the fixed text first and the changing text last. Dates, user names and ids near the top change the start and break the match." },
  { q: "Why is my real saving lower than the estimate?", a: "Caches expire after a short idle time, some providers charge extra to write the cache, and short prompts may not qualify. Measure your real cache hits before you trust the number." },
  { q: "Is my data stored?", a: "No. The numbers stay in your browser." },
  { q: "How do I see my real cache hits?", a: "Uncoil shows tokens and cost for every call in a run, so you can see which calls paid full price." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="What would caching save you?"
      lede="Enter how your prompts look. See the monthly saving from prompt caching on every model that supports it."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Cache the fixed part, pay less."
      steps={steps}
      faqs={faqs}
      notes={<p>{"This is a planning estimate from public list prices. Cache write fees, minimum prompt sizes and expiry times differ by provider."}</p>}
    >
      <CachingCalculator />
    </ToolPage>
  );
}
