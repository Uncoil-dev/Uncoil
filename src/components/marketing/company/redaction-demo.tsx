"use client";

import { useMemo, useState } from "react";
import { redactString } from "@/lib/redaction";

const sample = `Customer jane.doe@acme.com called from +1 415 555 0134.
Card on file: 4242 4242 4242 4242, SSN 123-45-6789.
Agent used uncoil_sk_live_9fA2kLm3Qx7Zp to refund.`;

/** Runs Uncoil's real redaction rules on whatever you type. Nothing leaves the page. */
export function RedactionDemo() {
  const [text, setText] = useState(sample);
  const out = useMemo(() => redactString(text), [text]);
  const parts = useMemo(() => out.split(/(\[REDACTED_[A-Z_]+\])/g), [out]);
  const hits = parts.filter((p) => p.startsWith("[REDACTED_")).length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="border border-white/15 bg-[#111]">
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
          <span>What your agent sees</span>
          <button type="button" onClick={() => setText(sample)} className="text-[#f4d44d] hover:text-white">Reset</button>
        </div>
        <label className="sr-only" htmlFor="redaction-input">Text to redact</label>
        <textarea
          id="redaction-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="block h-64 w-full resize-none bg-transparent p-4 font-mono text-[12px] leading-6 text-white/85 outline-none focus:bg-white/[0.03]"
        />
      </div>
      <div className="border border-[#f4d44d] bg-[#090909]">
        <div className="flex items-center justify-between border-b border-[#f4d44d]/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">
          <span>What Uncoil stores</span>
          <span role="status">{hits} {hits === 1 ? "value" : "values"} removed</span>
        </div>
        <pre className="h-64 overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-6 text-white/85">
          {parts.map((p, i) => p.startsWith("[REDACTED_") ? <mark key={i} className="bg-[#f4d44d] px-1 text-black">{p}</mark> : <span key={i}>{p}</span>)}
        </pre>
      </div>
    </div>
  );
}
