import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { TokenCounter } from "@/components/marketing/tools/token-counter";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("token-counter");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Paste your text", body: "A prompt, a document or a whole chat history. It stays in your browser." },
  { title: "Read the counts", body: "OpenAI counts use the real tokenizer. Other families are scaled from it and clearly labelled as estimates." },
  { title: "Compare the price", body: "See what one call costs on every model, with an optional reply length, and sort by cheapest." },
];

const faqs: Faq[] = [
  { q: "Is this the real tokenizer?", a: "For OpenAI models, yes: it runs the open o200k tokenizer in your browser. For every other provider it is an estimate built from that count, and each row says so." },
  { q: "Why do models give different counts for the same text?", a: "Each model family splits text into pieces with its own vocabulary. Code, numbers and non-English text can differ by 20% or more between families, which changes both cost and how much fits in the context window." },
  { q: "Does it include the reply in the price?", a: "Only if you add a reply length. Output tokens cost several times more than input tokens, so a long answer can cost more than the prompt." },
  { q: "Is my text sent to a server?", a: "No. Counting happens in your browser. The only thing downloaded is the tokenizer code." },
  { q: "How do I get exact counts for Claude or Gemini?", a: "Use the provider's own token counting endpoint, or read the usage numbers in each API response. Uncoil records those real numbers for every call." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="How many tokens is that?"
      lede="Paste text and see the token count and price on GPT, Claude, Gemini, Llama, Mistral, DeepSeek and Grok at once."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Count once, price everywhere."
      steps={steps}
      faqs={faqs}
      notes={<p>{"OpenAI (GPT-4o, GPT-4.1, GPT-5 and o-series) counts are exact. Anthropic, Google, Meta, Mistral, DeepSeek and xAI do not publish an offline tokenizer for their current models, so those counts are the real OpenAI count scaled by a typical ratio (for example about 12% more tokens for Claude). Expect roughly \u00b115% on normal English text, more on code and other languages. Prices are public list prices checked 17 October 2026."}</p>}
    >
      <TokenCounter />
    </ToolPage>
  );
}
