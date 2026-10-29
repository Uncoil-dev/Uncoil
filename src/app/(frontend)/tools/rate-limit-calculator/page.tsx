import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { RateLimitCalculator } from "@/components/marketing/tools/rate-limit-calculator";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("rate-limit-calculator");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Enter your limits", body: "Requests per minute and tokens per minute from your provider's dashboard." },
  { title: "Describe one user action", body: "Calls per action, tokens per call and how often a failed call is tried again." },
  { title: "Read the verdict", body: "See which limit you hit first, how many users fit, and what your target traffic needs." },
];

const faqs: Faq[] = [
  { q: "Where do I find my rate limits?", a: "On your provider's dashboard, usually under limits, usage tiers or rate limits. They depend on your account tier and the model." },
  { q: "Which limit matters, requests or tokens?", a: "Whichever is hit first. Agents with long prompts usually hit the token limit; apps with many tiny calls hit the request limit. The calculator tells you which." },
  { q: "Why include retries?", a: "A call that fails with a 429 still counts against your limit when you try again. A 5% retry rate means 5% more traffic than users alone create." },
  { q: "What is the busiest-minute factor?", a: "Real traffic is bursty. If your busiest minute is twice the average, you need limits for twice the average load." },
  { q: "How do I see my real usage against limits?", a: "Uncoil records every call and every 429, so you see how close you run to your limits and when you were throttled." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="How many users can you handle?"
      lede="Enter your provider's limits and your traffic. See how many users you can serve before you hit 429 errors."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Do the maths before the 429s."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Providers set limits per model, per tier and sometimes per day or organisation, and some estimate your reply length from the maximum you request. The defaults here are example numbers, not any provider's real limits. Enter your own."}</p>}
    >
      <RateLimitCalculator />
    </ToolPage>
  );
}
