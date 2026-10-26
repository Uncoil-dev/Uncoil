"use client";

import { useEffect, useRef, useState } from "react";
import { stepName, SUGGESTED_QUESTIONS, type AskSpan } from "@/lib/ask-ai";

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; stepIds: string[]; source: "ai" | "basic" }
  | { role: "error"; text: string };

export function AskAiPanel({ projectId, runId, spans, onSelectStep }: {
  projectId: string; runId: string; spans: AskSpan[]; onSelectStep: (spanId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const byId = new Map(spans.map((span) => [span.spanId, span]));

  useEffect(() => { setMessages([]); }, [runId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages, busy]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", text }]);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/ask`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text, history: messages.filter((message) => message.role !== "error").slice(-6).map((message) => ({ role: message.role, text: message.text })) }),
      });
      const body = await response.json() as { answer?: string; stepIds?: string[]; source?: "ai" | "basic"; error?: string };
      if (!response.ok || !body.answer) throw new Error(body.error ?? "Something went wrong. Please try again.");
      setMessages((current) => [...current, { role: "assistant", text: body.answer!, stepIds: body.stepIds ?? [], source: body.source ?? "basic" }]);
    } catch (reason) {
      setMessages((current) => [...current, { role: "error", text: reason instanceof Error ? reason.message : "Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Ask AI" className="flex h-full min-h-0 flex-col text-[#E6E9EE]">
      <div data-lenis-prevent className="min-h-0 flex-1 overflow-auto overscroll-contain p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-6 text-[#C9CED6]">Ask anything about this run. Answers point to the exact steps they come from.</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button key={question} type="button" onClick={() => void ask(question)} className="rounded-md border border-[#262C35] bg-[#111418] px-3 py-2 text-left text-sm text-[#E6E9EE] hover:border-[#4A5260]">{question}</button>
              ))}
            </div>
          </div>
        ) : (
          <ol aria-live="polite" className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <li key={index} className={message.role === "user" ? "self-end max-w-[85%] rounded-lg bg-[#232A34] px-3 py-2 text-sm" : message.role === "error" ? "rounded-lg border border-[#5A2A2A] bg-[#1E1314] p-3 text-sm text-[#FF8A8A]" : "rounded-lg border border-[#1F242C] bg-[#111418] p-3"}>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.text.replace(/\s*\[s\d+\]/g, "")}</p>
                {message.role === "assistant" && message.stepIds.length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-[#6B7380]">Steps</span>
                    {message.stepIds.map((id) => byId.has(id) ? (
                      <button key={id} type="button" onClick={() => onSelectStep(id)} className="max-w-[180px] truncate rounded border border-[#3A3420] bg-[#16140C] px-1.5 py-0.5 font-mono text-[11px] text-[#F4D44D] hover:bg-[#1E1B0F]">{stepName(byId.get(id)!)}</button>
                    ) : null)}
                  </div>
                ) : null}
                {message.role === "assistant" ? <p className="mt-2 font-mono text-[10px] text-[#6B7380]">{message.source === "basic" ? "Built-in answer, no AI used" : "AI can be wrong. Check the steps it points to."}</p> : null}
              </li>
            ))}
            {busy ? <li className="font-mono text-xs text-[#8B93A1]">Reading the trace…</li> : null}
          </ol>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void ask(draft); }} className="flex shrink-0 gap-2 border-t border-[#1F242C] p-3">
        <label htmlFor="ask-ai-input" className="sr-only">Ask about this trace</label>
        <input id="ask-ai-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Ask about this trace"
          className="h-9 min-w-0 flex-1 rounded-md border border-[#262C35] bg-[#111418] px-3 text-sm outline-none placeholder:text-[#6B7380] focus:border-[#4A5260]" />
        <button type="submit" disabled={busy || !draft.trim()} className="h-9 rounded-md bg-[#F4D44D] px-3 text-sm font-medium text-[#0B0D10] disabled:opacity-40">Ask</button>
      </form>
    </section>
  );
}
