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
  const [streaming, setStreaming] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const byId = new Map(spans.map((span) => [span.spanId, span]));

  useEffect(() => { abort.current?.abort(); setMessages([]); setStreaming(""); setBusy(false); }, [runId]);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages, busy, streaming]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = messages.filter((message) => message.role === "user" || message.role === "assistant").slice(-6).map((message) => ({ role: message.role, text: message.text }));
    setDraft("");
    setBusy(true);
    setLastQuestion(text);
    setMessages((current) => [...current.filter((message) => message.role !== "error"), { role: "user", text }]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(runId)}/ask`, {
        method: "POST", headers: { "content-type": "application/json" }, signal: controller.signal, body: JSON.stringify({ question: text, history, stream: true }),
      });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("ndjson") || !response.body) {
        const body = await response.json().catch(() => ({})) as { answer?: string; stepIds?: string[]; source?: "ai" | "basic"; error?: string };
        if (!response.ok || !body.answer) throw new Error(body.error ?? "Something went wrong. Please try again.");
        setMessages((current) => [...current, { role: "assistant", text: body.answer!, stepIds: body.stepIds ?? [], source: body.source ?? "basic" }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let live = "";
      let final: { answer?: string; stepIds?: string[]; source?: "ai" | "basic" } | null = null;
      const handle = (line: string) => {
        if (!line.trim()) return;
        try {
          const event = JSON.parse(line) as { delta?: string; done?: { answer?: string; stepIds?: string[]; source?: "ai" | "basic" } };
          if (event.delta) { live += event.delta; setStreaming(live); }
          if (event.done) final = event.done;
        } catch { /* a broken line is skipped */ }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handle);
      }
      handle(buffer);
      const result = final as { answer?: string; stepIds?: string[]; source?: "ai" | "basic" } | null;
      const answer = result?.answer ?? live.trim();
      if (!answer) throw new Error("No answer came back. Please try again.");
      setMessages((current) => [...current, { role: "assistant", text: answer, stepIds: result?.stepIds ?? [], source: result?.source ?? "ai" }]);
    } catch (reason) {
      if (controller.signal.aborted) return;
      setMessages((current) => [...current, { role: "error", text: reason instanceof Error ? reason.message : "Something went wrong. Please try again." }]);
    } finally {
      abort.current = null;
      setStreaming("");
      setBusy(false);
    }
  }

  function stop() { abort.current?.abort(); }
  function reset() { abort.current?.abort(); setMessages([]); setStreaming(""); setBusy(false); }
  async function copy(index: number, text: string) {
    try { await navigator.clipboard.writeText(text.replace(/\s*\[s\d+\]/g, "")); setCopied(index); setTimeout(() => setCopied((current) => current === index ? null : current), 1500); } catch { /* clipboard blocked */ }
  }
  const lastIndex = messages.length - 1;

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
                {message.role === "error" && lastQuestion ? <button type="button" disabled={busy} onClick={() => void ask(lastQuestion)} className="mt-2 rounded border border-[#5A2A2A] px-2 py-1 font-mono text-[11px] text-[#FF8A8A] hover:bg-[#2A1A1B] disabled:opacity-40">Try again</button> : null}
                {message.role === "assistant" && message.stepIds.length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-[#6B7380]">Steps</span>
                    {message.stepIds.map((id) => byId.has(id) ? (
                      <button key={id} type="button" onClick={() => onSelectStep(id)} className="max-w-[180px] truncate rounded border border-[#3A3420] bg-[#16140C] px-1.5 py-0.5 font-mono text-[11px] text-[#F4D44D] hover:bg-[#1E1B0F]">{stepName(byId.get(id)!)}</button>
                    ) : null)}
                  </div>
                ) : null}
                {message.role === "assistant" ? (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] text-[#6B7380]">{message.source === "basic" ? "Built-in answer, no AI used" : "AI can be wrong. Check the steps it points to."}</p>
                    <button type="button" onClick={() => void copy(index, message.text)} className="shrink-0 font-mono text-[10px] text-[#8B93A1] hover:text-[#E6E9EE]">{copied === index ? "Copied" : "Copy"}</button>
                  </div>
                ) : null}
                {message.role === "assistant" && index === lastIndex && !busy ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SUGGESTED_QUESTIONS.filter((question) => question !== lastQuestion).slice(0, 2).map((question) => (
                      <button key={question} type="button" onClick={() => void ask(question)} className="rounded border border-[#262C35] px-2 py-1 text-left text-xs text-[#C9CED6] hover:border-[#4A5260]">{question}</button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
            {busy && streaming ? (
              <li className="rounded-lg border border-[#1F242C] bg-[#111418] p-3"><p className="whitespace-pre-wrap text-sm leading-6">{streaming.replace(/\s*\[s\d+\]/g, "")}<span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[#F4D44D] align-middle" /></p></li>
            ) : busy ? <li className="font-mono text-xs text-[#8B93A1]">Reading the trace…</li> : null}
          </ol>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void ask(draft); }} className="flex shrink-0 gap-2 border-t border-[#1F242C] p-3">
        <label htmlFor="ask-ai-input" className="sr-only">Ask about this trace</label>
        <input id="ask-ai-input" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Ask about this trace"
          className="h-9 min-w-0 flex-1 rounded-md border border-[#262C35] bg-[#111418] px-3 text-sm outline-none placeholder:text-[#6B7380] focus:border-[#4A5260]" />
        {busy
          ? <button type="button" onClick={stop} className="h-9 rounded-md border border-[#262C35] px-3 text-sm text-[#E6E9EE] hover:border-[#4A5260]">Stop</button>
          : <button type="submit" disabled={!draft.trim()} className="h-9 rounded-md bg-[#F4D44D] px-3 text-sm font-medium text-[#0B0D10] disabled:opacity-40">Ask</button>}
        {messages.length > 0 && !busy ? <button type="button" onClick={reset} aria-label="Start a new chat" title="New chat" className="h-9 rounded-md border border-[#262C35] px-2.5 text-sm text-[#8B93A1] hover:border-[#4A5260]">New</button> : null}
      </form>
    </section>
  );
}
