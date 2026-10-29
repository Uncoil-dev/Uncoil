import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { PromptChecker } from "@/components/marketing/tools/prompt-checker";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("prompt-cost-checker");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Paste your prompt", body: "A system prompt or a full prompt. Nothing leaves your browser." },
  { title: "Review the changes", body: "Safe fixes are applied for you: extra spaces, repeated lines, wordy phrases and indented JSON examples. Riskier ideas are listed for you to decide." },
  { title: "Copy the shorter prompt", body: "Check it reads right, then see the saving per call and per month on your model." },
];

const faqs: Faq[] = [
  { q: "Will a shorter prompt change my results?", a: "The automatic changes (spaces, exact repeats, wordy phrase swaps and compact JSON) keep the meaning. Anything that could change behaviour is only suggested, never applied. Test before you ship either way." },
  { q: "How are the savings calculated?", a: "The tool counts tokens before and after with the real OpenAI tokenizer and scales for other model families. It is a measured difference for your text, not a guess." },
  { q: "What is prompt caching and why does it matter?", a: "Providers charge much less for the identical start of a prompt they have seen recently. Putting dates, ids and user details near the top breaks that, so move changing values to the end." },
  { q: "Is my prompt stored?", a: "No. It is processed in your browser only." },
  { q: "What else cuts cost besides shorter prompts?", a: "Fewer model calls per task, a cheaper model for easy steps, capped output length and fewer retries. Uncoil shows which of these your agent spends the most on." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Make that prompt shorter."
      lede="Paste a prompt. Get a shorter version, the tokens saved and what each call costs on the models you use."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="Trim the tokens, keep the meaning."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Only changes that cannot alter the meaning are applied automatically. Cutting filler words, examples or whole sections changes behaviour, so those are suggestions for you to test. Always re-run your own checks on a shortened prompt."}</p>}
    >
      <PromptChecker />
    </ToolPage>
  );
}
