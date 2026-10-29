"use client";

import { useState } from "react";
import { CopyButton } from "./copy-button";

const tabs = [
  {
    id: "ts",
    label: "TypeScript",
    file: "agent.ts",
    code: `import { traceAgent, span } from "uncoil-sdk";

export const answer = traceAgent(async (q: string) => {
  const docs = await span("docs.search", () => search(q), { type: "tool" });
  return span("chat", () => callModel(q, docs), { type: "llm" });
});`,
  },
  {
    id: "py",
    label: "Python",
    file: "agent.py",
    code: `import uncoil

@uncoil.observe(type="tool")
def search_docs(query):
    return search(query)

@uncoil.trace_agent()
def answer(question):
    docs = search_docs(question)
    return call_model(question, docs)`,
  },
  {
    id: "http",
    label: "HTTP",
    file: "terminal",
    code: `curl -X POST https://uncoil.dev/api/ingest \\
  -H "Authorization: Bearer $UNCOIL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"spanId":"span_123","runId":"run_123","spanType":"llm","createdAt":"2026-01-01T12:00:00Z","latencyMs":420}'`,
  },
  {
    id: "otlp",
    label: "OpenTelemetry",
    file: ".env",
    code: `UNCOIL_OTLP_ENDPOINT=https://uncoil.dev/api/otel
UNCOIL_API_KEY=uncoil_sk_live_...`,
  },
] as const;

/** Four ways in, one snippet at a time, each copyable. */
export function CodeTabs() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("ts");
  const tab = tabs.find((t) => t.id === active)!;
  return (
    <div className="border border-black bg-[#090909] text-[#eceae3] shadow-[8px_8px_0_#f4d44d]">
      <div role="tablist" aria-label="Integration method" className="flex flex-wrap border-b border-white/15">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={`px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${t.id === active ? "bg-[#f4d44d] text-black" : "text-white/60 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
        <span>{tab.file}</span>
        <CopyButton text={tab.code} className="text-[#f4d44d] hover:text-white" />
      </div>
      <pre className="min-h-[220px] overflow-x-auto p-5 font-mono text-[12px] leading-6 md:p-7"><code>{tab.code}</code></pre>
    </div>
  );
}
