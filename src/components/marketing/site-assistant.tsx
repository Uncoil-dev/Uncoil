"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Send, X } from "lucide-react";

type Message = { role: "user" | "assistant"; text: string; citations?: { title: string; href: string }[] };

export function SiteAssistant() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Ask me about Uncoil, the playground, traces, evaluations, pricing, SDK setup, or regions." }]);
  const [loading, setLoading] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = value.trim();
    if (!message || loading) return;
    setValue(""); setMessages((current) => [...current, { role: "user", text: message }]); setLoading(true);
    try {
      const response = await fetch("/api/site-assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, conversationId, pagePath: window.location.pathname }) });
      const data = await response.json() as { answer?: string; citations?: { title: string; href: string }[]; conversationId?: string; error?: string };
      if (data.conversationId) setConversationId(data.conversationId);
      setMessages((current) => [...current, { role: "assistant", text: data.answer || data.error || "I couldn't answer that right now.", citations: data.citations }]);
    } catch { setMessages((current) => [...current, { role: "assistant", text: "The assistant is temporarily unavailable. Try the documentation instead.", citations: [{ title: "Browse the docs", href: "/docs" }] }]); }
    finally { setLoading(false); }
  }

  return <div className="fixed bottom-5 right-5 z-50"><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label={open ? "Close Uncoil assistant" : "Open Uncoil assistant"} className="flex size-12 items-center justify-center border border-black bg-[#f4d44d] text-black shadow-[4px_4px_0_#000] hover:bg-white">{open ? <X className="size-5" /> : <Bot className="size-5" />}</button>{open ? <section aria-label="Uncoil assistant" className="absolute bottom-16 right-0 flex h-[min(560px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col border border-black bg-[#eceae3] text-black shadow-[6px_6px_0_#000]"><header className="flex items-center justify-between border-b border-black bg-black p-4 text-white"><div><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f4d44d]">Uncoil assistant</p><p className="mt-1 text-xs text-white/55">Public product and setup guide</p></div><Bot className="size-5 text-[#f4d44d]" /></header><div data-lenis-prevent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-8" : "mr-4"}><div className={`p-3 text-sm leading-6 ${message.role === "user" ? "bg-[#f4d44d]" : "border border-black/15 bg-white"}`}>{message.text}</div>{message.citations?.length ? <div className="mt-2 flex flex-wrap gap-2">{message.citations.map((citation) => <Link key={citation.href} href={citation.href} className="font-mono text-[9px] uppercase tracking-[0.1em] underline underline-offset-4">{citation.title}</Link>)}</div> : null}</div>)}{loading ? <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/45">Thinking…</p> : null}</div><form onSubmit={send} className="flex gap-2 border-t border-black p-3"><input value={value} onChange={(event) => setValue(event.target.value)} maxLength={2000} placeholder="Ask a question…" aria-label="Ask Uncoil assistant" className="min-w-0 flex-1 border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-black" /><button type="submit" disabled={!value.trim() || loading} aria-label="Send question" className="flex size-10 shrink-0 items-center justify-center bg-black text-white disabled:opacity-40"><Send className="size-4" /></button></form></section> : null}</div>;
}
