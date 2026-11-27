"use client";

import { useState } from "react";
import { isLargePayload, payloadPreview, payloadSizeLabel } from "./collapsible-payload.helpers";

const PRE_CLASS =
  "p-3 bg-[#050505] border border-black text-[11px] font-mono overflow-auto max-h-[300px] text-[#f4d44d]";

/**
 * Renders a step's input or output. Text above the size threshold shows only a
 * short preview and its size; the full text enters the page after "Show all".
 */
export function CollapsiblePayload({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const large = isLargePayload(text);

  if (!large) {
    return <pre className={PRE_CLASS}>{text}</pre>;
  }

  return (
    <div className="space-y-2">
      <pre className={`${PRE_CLASS} whitespace-pre-wrap break-words`}>{expanded ? text : `${payloadPreview(text)}…`}</pre>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-black/55">
          {expanded ? payloadSizeLabel(text) : `Preview of ${payloadSizeLabel(text)}`}
        </span>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="flex h-6 items-center gap-1 border border-black/15 px-2 font-mono text-[9px] uppercase tracking-widest text-black/55 transition-colors hover:border-black hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {expanded ? "Show less" : "Show all"}
        </button>
      </div>
    </div>
  );
}
