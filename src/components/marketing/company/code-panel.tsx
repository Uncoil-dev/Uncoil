"use client";

import { CopyButton } from "./copy-button";

/** Terminal-style code block with a one-click copy button. Used by every integration setup step. */
export function CodePanel({ code, label, className = "" }: { code: string; label: string; className?: string }) {
  return (
    <div className={`min-w-0 border-2 border-black bg-[#090909] text-[#eceae3] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/20 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
          <span className="size-2 bg-[#f4d44d]" aria-hidden="true" />
          {label}
        </span>
        <CopyButton text={code} className="-my-2 min-h-11 px-2 text-[#f4d44d] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]" />
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6"><code>{code}</code></pre>
    </div>
  );
}
