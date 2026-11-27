"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import { clampCursor, searchSpans, splitMatch, type SearchableSpan } from "@/lib/span-search";

export type SpanSearchState = {
  query: string;
  /** Span ids to render; every span while the query is blank. */
  visible: Set<string>;
  /** The match Enter last jumped to, or null. */
  activeId: string | null;
};

/** Renders text with the first case-insensitive query hit marked. */
export function HighlightedText({ text, query }: { text: string; query: string }) {
  const [before, hit, after] = splitMatch(text, query);
  return (
    <>
      {before}
      {hit ? <mark className="bg-[#f4d44d] text-black">{hit}</mark> : null}
      {after}
    </>
  );
}

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable));
}

/**
 * Search box above the step list. Filters the already-loaded spans by type, tool, model or
 * error text, steps through matches with Enter / Shift+Enter, and hands the result to the
 * list through a render callback. "/" focuses the box when no field is focused; Ctrl/Cmd+F
 * is left to the browser.
 */
export function SpanSearch({ spans, children }: { spans: SearchableSpan[]; children: (state: SpanSearchState) => ReactNode }) {
  const [query, setQuery] = useState("");
  const [rawCursor, setCursor] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => searchSpans(spans, query), [spans, query]);
  const cursor = clampCursor(rawCursor, result.matches.length);
  const activeId = cursor === null ? null : (result.matches[cursor] ?? null);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function step(direction: 1 | -1) {
    const count = result.matches.length;
    if (!count) return;
    const next = cursor === null ? (direction === 1 ? 0 : count - 1) : (cursor + direction + count) % count;
    setCursor(next);
    document.getElementById(`trace-span-${result.matches[next]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      setQuery("");
      setCursor(null);
      event.currentTarget.blur();
    }
  }

  const noMatch = result.active && result.matches.length === 0;

  return (
    <>
      <div className="flex items-center gap-3 border border-border px-3 py-2 focus-within:border-black">
        <Search className="size-3.5 text-black/55" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search steps by name, tool, model or error  ( / )"
          aria-label="Search steps in this run"
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-black outline-none placeholder:text-black/45"
        />
        {result.active && !noMatch ? (
          <span className="font-mono text-[10px] uppercase text-black/55" aria-live="polite">
            {cursor === null ? result.matches.length : `${cursor + 1}/${result.matches.length}`}
          </span>
        ) : null}
      </div>
      {noMatch ? (
        <p className="font-mono text-xs text-black/55" role="status">No steps match</p>
      ) : (
        children({ query, visible: result.visible, activeId })
      )}
    </>
  );
}
