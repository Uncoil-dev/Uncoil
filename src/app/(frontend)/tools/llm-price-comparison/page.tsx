import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { PriceComparison } from "@/components/marketing/tools/price-comparison";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("llm-price-comparison");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Describe your app", body: "Requests per month, tokens in and out per request, and how much input a cache can serve." },
  { title: "Read the table", body: "Each row shows list prices per million tokens and what your traffic would cost per month." },
  { title: "Sort and filter", body: "Sort by any column, filter by provider, or search for a model." },
];

const faqs: Faq[] = [
  { q: "Where do the prices come from?", a: "From the public LiteLLM model price list, checked on 17 October 2026. We show the date on the page. Providers change prices often, so always confirm on the provider's own page." },
  { q: "Why is monthly cost not just the price per million tokens?", a: "Your bill is tokens in times the input price plus tokens out times the output price, for every request. This page does that maths with your numbers, and applies the cached-input price where the model has one." },
  { q: "Is the cheapest model the best choice?", a: "Not always. A cheaper model that needs more retries, longer prompts or human fixes can cost more per finished task. Compare on your own prompts." },
  { q: "Why are some prices missing a cached rate?", a: "Not every provider or model offers a cheaper price for cached input. A dash means there is no cache discount on record." },
  { q: "How do I see what I really spend?", a: "Provider dashboards show totals. Uncoil shows cost per run, per step and per model, so you can see which part of your agent is expensive." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Which model is cheapest?"
      lede="Every major model's price in one table, plus what your app would cost per month on each one."
      toolEyebrow="No sign-up / prices checked 17 October 2026"
      toolTitle="Compare the bill before you pick."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Prices are public list prices in US dollars per million tokens, taken from the LiteLLM community price list on 17 October 2026. They exclude batch, priority and regional pricing, tiered prices for very long prompts and free tiers. Llama models are open weights, so they are priced at one host (DeepInfra); other hosts charge differently. Confirm on the provider's page before you commit to a budget."}</p>}
    >
      <PriceComparison />
    </ToolPage>
  );
}
