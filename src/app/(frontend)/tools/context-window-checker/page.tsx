import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { ContextChecker } from "@/components/marketing/tools/context-checker";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("context-window-checker");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Paste text or enter a size", body: "Paste the document, or type a token count you already know." },
  { title: "Set room for the reply", body: "The context window covers your prompt and the answer together, so leave space for the reply." },
  { title: "Read the table", body: "See which models fit, which are tight, and how many pieces a too-big document needs." },
];

const faqs: Faq[] = [
  { q: "What is a context window?", a: "The largest amount of text, measured in tokens, that a model can take in one request. It includes your prompt, the conversation so far, tool results and the model's own answer." },
  { q: "Why leave room for the reply?", a: "The window is shared. If your prompt fills it, the model has no space left to answer, and the request fails or the answer is cut off." },
  { q: "Is a bigger window always better?", a: "Larger windows cost more to fill and models can miss details buried in the middle of very long inputs. Often it is better to retrieve only the relevant parts." },
  { q: "What should I do if my document does not fit?", a: "Split it into pieces, summarise older parts, or retrieve only the relevant sections. The table shows how many pieces each model would need." },
  { q: "How do I know when my agent's prompt is growing?", a: "Uncoil records the size of every call, so you see a prompt creeping toward the limit before it fails." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Will it fit in memory?"
      lede="Paste a document and see which models can read it in one go, how much room is left and how many pieces you would need."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Check the window before you hit the wall."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Context windows are the maximum a model accepts, taken from the same price list as our other tools and checked 17 October 2026. Models read less reliably near the limit, so \u201ctight\u201d starts at 80% used. Token counts are exact for OpenAI models and estimated (about \u00b115%) for others."}</p>}
    >
      <ContextChecker />
    </ToolPage>
  );
}
