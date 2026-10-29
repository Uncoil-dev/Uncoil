import { pageMetadata } from "@/lib/seo";
import { getTool, toolPath } from "@/lib/tools/registry";
import { ToolChecker } from "@/components/marketing/tools/tool-checker";
import { ToolPage, type Faq, type Step } from "@/components/marketing/tools/tool-page";

const tool = getTool("tool-definition-checker");

export const metadata = pageMetadata({ title: tool.title, description: tool.description, path: toolPath(tool.slug) });

const steps: Step[] = [
  { title: "Paste your tools", body: "The array you send to the model. OpenAI, Anthropic, MCP and Gemini formats are recognised." },
  { title: "Read the problems", body: "Names, descriptions, missing types, required fields, loose schemas and provider-specific rejections, in plain words." },
  { title: "Fix and re-check", body: "Each problem has a fix. Paste again to see the score go up." },
];

const faqs: Faq[] = [
  { q: "Which formats are supported?", a: "OpenAI Chat Completions and Responses, Anthropic, MCP (the tools/list response) and Gemini function declarations. You can paste a single tool, a list or an object with a tools list." },
  { q: "Why do descriptions matter so much?", a: "Models choose tools by reading names and descriptions. A vague description or a name like \u201crun\u201d makes wrong calls much more likely, especially when tools look alike." },
  { q: "What does strict mode check?", a: "If a tool has strict set, OpenAI requires every property to be listed as required and additionalProperties to be false. The tool flags both." },
  { q: "Does it send my definitions anywhere?", a: "No. Everything is checked in your browser." },
  { q: "How do I see which tool calls fail in production?", a: "Uncoil records every tool call with its input, output and error, so you see which tools fail, how often and why." },
];

export default function Page() {
  return (
    <ToolPage
      slug={tool.slug}
      title="Is your tool setup right?"
      lede="Paste your agent's tool definitions. Find the mistakes that make agents pick the wrong tool or send bad arguments."
      toolEyebrow="No sign-up / OpenAI, Anthropic, MCP, Gemini"
      toolTitle="Catch tool mistakes before the model does."
      steps={steps}
      faqs={faqs}
      notes={<p>{"This checks structure and clarity, not whether your tool works. It follows the documented rules of each provider's tool format. A high score means fewer avoidable mistakes, not that the model will always choose well."}</p>}
    >
      <ToolChecker />
    </ToolPage>
  );
}
