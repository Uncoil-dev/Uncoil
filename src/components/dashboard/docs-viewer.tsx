"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

/** In-app docs content; links point into the given project. */
export function docsSections(projectId: string) {
  return {
  quickstart: {
    title: "Quickstart",
    content: `
# Quickstart

Welcome to **Uncoil**. This guide will help you integrate our observability SDK into your agentic workflow in less than 2 minutes.

## 1. Install the SDK

Depending on your environment, run one of the following commands:

\`\`\`bash
# Python
pip install uncoil-sdk

# TypeScript / Node.js
npm install @uncoil.dev/sdk
\`\`\`

## 2. Set your API key

Keep the key in a server-side environment variable. The SDK reads \`UNCOIL_API_KEY\` automatically. Create one on the [API keys](/dashboard/${projectId}/api-keys) page.

\`\`\`bash
export UNCOIL_API_KEY=uncoil_sk_live_...
\`\`\`

Never put the key in browser code.

## 3. Instrument your Agent

Wrap your agent's main function with the \`@trace_agent\` decorator. Each call becomes one run.

\`\`\`python
from uncoil import trace_agent

@trace_agent(name="support-agent")
def run_agent(task):
    # Your agent logic here
    pass
\`\`\`

## 4. View your Traces

Once your agent runs, traces appear on the [Tracing](/dashboard/${projectId}/tracing) page within a minute.
    `,
  },
  sdk_python: {
    title: "Python SDK",
    content: `
# Python SDK Reference

The Uncoil Python SDK provides deep instrumentation for LLM-based agents.

## \`@trace_agent\`

Decorator that traces a full agent run. Each call of the decorated function is one trace.
- \`name\`: (Optional) Custom name for the run.
- \`environment\`, \`release\`, \`deployment_id\`: (Optional) Where and what version ran.
- \`session_id\`, \`end_user_id\`, \`tags\`: (Optional) Grouping and filtering.

## \`llm_call\` and \`tool_call\`

Plain functions that record a finished model or tool call inside the current run.

\`\`\`python
from uncoil import llm_call, tool_call

llm_call(
    input_data=question,
    output_data=reply.text,
    model_id="your-model-id",
    cost_usd=0.002,
    latency_ms=800,
)

tool_call(
    tool_name="web_search",
    input_data={"q": question},
    output_data=results,
    latency_ms=1200,
)
\`\`\`

Both also accept \`tags\` and \`metadata\`; \`llm_call\` takes \`input_tokens\` and \`output_tokens\` too.
    `,
  },
  sdk_ts: {
    title: "TypeScript SDK",
    content: `
# TypeScript SDK Reference

High-performance observability for Node.js and Browser-based agents.

## Installation
\`\`\`bash
npm install @uncoil.dev/sdk
\`\`\`

## Usage
\`\`\`typescript
import { traceAgent } from "@uncoil.dev/sdk";

const runAgent = traceAgent(
  async (task: string) => runTask(task),
  { apiKey: process.env.UNCOIL_API_KEY },
);

async function main() {
  await runAgent("support request");
}
\`\`\`
    `,
  },
  observability: {
    title: "Observability fields",
    content: `
# Observability fields

Every span may include \`sessionId\`, \`endUserId\`, \`environment\`, \`release\`, \`tags\`, and \`parentSpanId\` for session grouping and handoff graphs.

## Tokens, latency, and retries

\`inputTokens\`, \`outputTokens\`, \`ttftMs\`, and \`retryCount\` power cost and latency breakdowns. Error spans can provide \`errorType\` and \`errorMessage\`.

## Streaming and multimodal payloads

Send each partial as a span with \`isStreamChunk: true\`, an increasing \`streamSequence\`, and \`streamFinal: true\` on the final chunk. Set \`payloadFormat\` to values such as \`image\`, \`audio\`, or \`function_call\`; structured input/output JSON and the optional \`attachments\` array are preserved.

## Privacy and retention

Obvious secrets are removed from inputs and outputs by default. Data older than your plan keeps (Free 7 days, Pro 30, Team 90) is removed every day by a built-in schedule. You can also run it with \`POST /api/retention\` and the \`x-retention-secret\` header; set \`UNCOIL_RETENTION_SECRET\` in the deployment environment.
    `,
  },
  };
}

type DocId = keyof ReturnType<typeof docsSections>;

export function DocsViewer() {
  const { projectId } = useParams<{ projectId: string }>();
  const DOCS = docsSections(projectId);
  const [activeTab, setActiveTab] = useState<DocId>("quickstart");

  return (
    <div className="flex h-full min-h-[600px] border border-black/15 bg-[#f3f2ed] font-mono">
      {/* Docs Sidebar */}
      <div className="w-64 border-r border-black/15 bg-white">
        <div className="flex items-center gap-2 border-b border-black/15 p-4 text-[12px] font-bold text-black uppercase tracking-widest">
          <BookOpen className="size-4" />
          <span>Documentation</span>
        </div>
        <div className="p-2 space-y-1">
          {Object.entries(DOCS).map(([id, doc]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as DocId)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-[12px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset",
                activeTab === id
                  ? "bg-[#f3f2ed] text-black"
                  : "text-black/55 hover:bg-[#f3f2ed] hover:text-black/60"
              )}
            >
              <span>{doc.title}</span>
              <ChevronRight className={cn("size-3", activeTab === id ? "opacity-100" : "opacity-0")} />
            </button>
          ))}
        </div>
      </div>

      {/* Docs Content */}
      <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
        <div className="max-w-3xl mx-auto prose prose-invert prose-zinc prose-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ className, ...props }) => (
                <h1 className={cn("text-2xl font-bold border-b border-black/15 pb-4 mb-8 text-black", className)} {...props} />
              ),
              h2: ({ className, ...props }) => (
                <h2 className={cn("text-lg font-bold text-black mt-10 mb-4", className)} {...props} />
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match;
                return isInline ? (
                  <code className="bg-[#f3f2ed] px-1 py-0.5 rounded-none text-black/70" {...props}>
                    {children}
                  </code>
                ) : (
                  <div className="relative group my-6">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-black opacity-20" />
                    <pre className="bg-[#050505] p-4 border border-black overflow-x-auto rounded-none">
                      <code className={cn("font-mono text-xs text-[#f4d44d]", className)} {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                );
              },
              p: ({ className, ...props }) => (
                <p className={cn("text-black/60 leading-relaxed mb-4", className)} {...props} />
              ),
              ul: ({ className, ...props }) => (
                <ul className={cn("list-square list-inside mb-4 text-black/60", className)} {...props} />
              ),
            }}
          >
            {DOCS[activeTab].content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
