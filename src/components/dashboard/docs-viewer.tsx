"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight } from "lucide-react";
import { useState } from "react";

const DOCS = {
  quickstart: {
    title: "Quickstart",
    content: `
# Quickstart

Welcome to **Tracify**. This guide will help you integrate our observability SDK into your agentic workflow in less than 2 minutes.

## 1. Install the SDK

Depending on your environment, run one of the following commands:

\`\`\`bash
# Python
pip install tracify-sdk

# TypeScript / Node.js
npm install tracify-sdk
\`\`\`

## 2. Instrument your Agent

Wrap your agent's main execution loop with the \`@trace_agent\` decorator.

\`\`\`python
from tracify import trace_agent

@trace_agent()
def run_agent(task):
    # Your agent logic here
    pass
\`\`\`

## 3. View your Traces

Once your agent runs, traces will appear in the [Runs](/dashboard/runs) list in real-time.
    `,
  },
  sdk_python: {
    title: "Python SDK",
    content: `
# Python SDK Reference

The Tracify Python SDK provides deep instrumentation for LLM-based agents.

## Core Decorators

### \`@trace_agent\`
Traces a full agentic run.
- \`name\`: (Optional) Custom name for the run.
- \`metadata\`: (Optional) Dict of additional data.

### \`@llm_call\`
Traces an individual LLM request.
- \`model\`: The model ID (e.g., "gpt-4").
- \`tags\`: (Optional) List of strings for filtering.

### \`@tool_call\`
Traces a tool or function execution by the agent.
- \`tool_name\`: Name of the tool.

## Advanced Usage

Use \`llm_call\` and \`tool_call\` helpers when you need explicit spans for model and tool work.
    `,
  },
  sdk_ts: {
    title: "TypeScript SDK",
    content: `
# TypeScript SDK Reference

High-performance observability for Node.js and Browser-based agents.

## Installation
\`\`\`bash
npm install tracify-sdk
\`\`\`

## Usage
\`\`\`typescript
import { traceAgent } from "tracify-sdk";

const runAgent = traceAgent(
  async (task: string) => runTask(task),
  { apiKey: process.env.TRACIFY_API_KEY },
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

Redaction is enabled by default and configurable under **Project settings → Privacy & Retention**. Data older than your plan keeps (Free 7 days, Pro 30, Team 90) is removed every day by a built-in schedule. You can also run it with \`POST /api/retention\` and the \`x-retention-secret\` header; set \`TRACIFY_RETENTION_SECRET\` in the deployment environment.
    `,
  },
};

export function DocsViewer() {
  const [activeTab, setActiveTab] = useState<keyof typeof DOCS>("quickstart");

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
              onClick={() => setActiveTab(id as keyof typeof DOCS)}
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
