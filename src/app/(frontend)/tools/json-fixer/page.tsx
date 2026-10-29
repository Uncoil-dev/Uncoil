import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { JsonFixer } from "@/components/marketing/tools/json-fixer";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("json-fixer");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Paste the output", body: "Anything meant to be JSON, even with chat around it or a code fence." },
  { title: "See the fixed version", body: "Valid, indented JSON, and a list of every kind of fix that was made." },
  { title: "Copy or download", body: "Copy the result, download it, or switch to minified." },
];

const faqs: Faq[] = [
  { q: "What kinds of mistakes does it fix?", a: "Code fences and chatty text around the data, single quotes, unquoted keys, trailing commas, comments, Python True/False/None, curly quotes, missing commas, raw line breaks inside strings, quotes inside strings and output cut off before it closes." },
  { q: "Is my data sent anywhere?", a: "No. The repair runs in your browser." },
  { q: "Can it fix cut-off JSON?", a: "Yes. It closes open strings, lists and objects where the text stops, and drops a half-written final entry. It does not guess the missing data." },
  { q: "Why does my model return invalid JSON?", a: "Long outputs get truncated, models add explanations, or the prompt does not constrain the format. Use structured outputs or a JSON schema, and validate with a retry." },
  { q: "How do I find out how often this happens?", a: "Uncoil traces every model call, so you can see how often outputs fail to parse and which prompts cause it." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Fix that broken JSON."
      lede="Paste broken output from ChatGPT, Claude or any model and get valid JSON back, with a list of what was fixed."
      toolEyebrow="No sign-up / runs in your browser"
      toolTitle="From almost-JSON to valid JSON."
      steps={steps}
      faqs={faqs}
      notes={<p>{"Repair never invents data. If the output was cut off, it ends where the original ended and open brackets are closed. Always check the result, because a model may have changed the meaning before the formatting broke. To prevent this at the source, use your provider's structured output or JSON mode."}</p>}
    >
      <JsonFixer />
    </ToolPage>
  );
}
