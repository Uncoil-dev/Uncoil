"use client";

import { Check, ChevronDown, Copy, Download, Send } from "lucide-react";
import { useState } from "react";

type DocsActionsProps = { markdown: string; installUrl: string };

export function DocsActions({ markdown, installUrl }: DocsActionsProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const prompt = `Use this Uncoil documentation page as context:\n\n${markdown}`;
  const send = (destination: "chatgpt" | "claude") => {
    const url = destination === "chatgpt"
      ? `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
      : `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={copyMarkdown} className="inline-flex min-h-9 items-center gap-2 border border-black px-3 font-mono text-[9px] uppercase tracking-[.1em] transition-colors hover:bg-[#f4d44d]">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy Markdown"}
        </button>
        <div className="relative">
          <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-2 border border-black px-3 font-mono text-[9px] uppercase tracking-[.1em] transition-colors hover:bg-[#f4d44d]">
            <Send className="size-3" />Send to<ChevronDown className="size-3" />
          </button>
          {open ? (
            <div className="absolute right-0 z-20 mt-1 w-52 border border-black bg-[#f3f2ed] p-1 shadow-[5px_5px_0_#000]">
              <button type="button" onClick={copyMarkdown} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#f4d44d]"><Copy className="size-3" />Copy Markdown</button>
              <button type="button" onClick={() => send("chatgpt")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#f4d44d]">Send to ChatGPT</button>
              <button type="button" onClick={() => send("claude")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#f4d44d]">Send to Claude</button>
              <a href={installUrl} className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[#f4d44d]"><Download className="size-3" />Install Docs MCP</a>
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[.11em] text-black/55">Copy or share.</p>
    </div>
  );
}
