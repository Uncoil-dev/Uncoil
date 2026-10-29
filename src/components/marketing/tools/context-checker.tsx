"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { checkFit, type FitStatus } from "@/lib/tools/calculators";
import { formatTokens } from "@/lib/tools/models";
import { countFor, methodLabel } from "@/lib/tools/tokens";
import { Badge, buttonClass, Caption, ghostClass, Metric, MetricGrid, NumberField, TableFrame, td, TextArea, th } from "./ui";
import { useTokenizer } from "./use-tokenizer";

const MAX_CHARS = 2_000_000;
const label: Record<FitStatus, string> = { fits: "Fits", tight: "Tight", "too-big": "Too big" };
const tone: Record<FitStatus, "ok" | "warning" | "error"> = { fits: "ok", tight: "warning", "too-big": "error" };

export function ContextChecker() {
  const [mode, setMode] = useState<"text" | "count">("text");
  const [text, setText] = useState("");
  const [known, setKnown] = useState(150_000);
  const [reply, setReply] = useState(4000);
  const [onlyFits, setOnlyFits] = useState(false);
  const { tokenizer, status } = useTokenizer();
  const deferred = useDeferredValue(text);
  const body = deferred.length > MAX_CHARS ? deferred.slice(0, MAX_CHARS) : deferred;
  const openaiCount = useMemo(() => (tokenizer ? tokenizer.count(body) : null), [tokenizer, body]);

  const rows = useMemo(() => {
    const fromText = mode === "text";
    return checkFit((m) => (fromText ? countFor(m.family, body, openaiCount).tokens : Math.max(0, known)), reply);
  }, [mode, body, openaiCount, known, reply]);

  const shown = onlyFits ? rows.filter((r) => r.status !== "too-big") : rows;
  const fitting = rows.filter((r) => r.status !== "too-big").length;
  const empty = mode === "text" ? body.trim().length === 0 : known <= 0;
  const gpt = rows.find((r) => r.model.id === "gpt-4o");
  const biggest = rows.reduce((a, b) => (b.model.context > a.model.context ? b : a));

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="What do you know?">
          <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")} className={`min-h-11 border border-black px-4 font-mono text-[11px] uppercase tracking-[0.12em] ${mode === "text" ? "bg-black text-[#eceae3]" : "hover:bg-[#f4d44d]"}`}>I have the text</button>
          <button type="button" aria-pressed={mode === "count"} onClick={() => setMode("count")} className={`min-h-11 border border-black px-4 font-mono text-[11px] uppercase tracking-[0.12em] ${mode === "count" ? "bg-black text-[#eceae3]" : "hover:bg-[#f4d44d]"}`}>I know the token count</button>
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {mode === "text" ? (
            <div className="space-y-3">
              <TextArea label="Your document or prompt" value={text} onChange={setText} rows={10} placeholder="Paste the full text you want to send to the model…" hint={status === "failed" ? "The OpenAI tokenizer could not load, so counts are rough estimates." : "Nothing is uploaded. OpenAI counts are exact; other models are scaled estimates (about ±15%)."} />
              <button type="button" className={ghostClass} onClick={() => setText("")} disabled={!text}>Clear</button>
            </div>
          ) : (
            <NumberField label="Prompt size in tokens" value={known} onChange={setKnown} step={1000} hint="For example from your provider's usage numbers, or from the Uncoil trace of a real call." />
          )}
          <NumberField label="Room to leave for the reply (tokens)" value={reply} onChange={(v) => setReply(Math.max(0, v))} step={500} hint="The window covers your prompt and the answer together. Some models cap the reply lower than this." />
        </div>
        <div className="flex flex-wrap gap-3">
          {mode === "count" ? null : <button type="button" className={buttonClass} onClick={() => setText("Lorem ipsum dolor sit amet. ".repeat(24000))}>Try a ~140K token example</button>}
        </div>
      </div>

      {empty ? (
        <p className="border border-dashed border-black/40 p-6 text-sm leading-6 text-black/65">{mode === "text" ? "Paste your text to see which models can read it in one go." : "Enter a token count to see which models can take it."}</p>
      ) : (
        <>
          <MetricGrid label="Fit summary">
            <Metric strong label="Models it fits" value={`${fitting} of ${rows.length}`} note={fitting === 0 ? `Even the largest window (${formatTokens(biggest.model.context)}) is too small` : `Leaving ${reply.toLocaleString("en-US")} tokens for the reply`} />
            <Metric label="Prompt size" value={(gpt?.promptTokens ?? 0).toLocaleString("en-US")} note={mode === "text" ? `Tokens by GPT-4o's tokenizer${openaiCount === null ? " (rough)" : ""}` : "As you entered it"} />
            <Metric label="GPT-4o window used" value={gpt ? `${Math.round(gpt.used * 100)}%` : "—"} note={gpt ? `${formatTokens(gpt.model.context)} window, ${gpt.free >= 0 ? `${formatTokens(gpt.free)} free` : `${formatTokens(-gpt.free)} over`}` : undefined} />
            <Metric label="Largest window" value={formatTokens(biggest.model.context)} note={biggest.model.name} />
          </MetricGrid>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Caption>Model by model</Caption>
              <label className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em]">
                <input type="checkbox" checked={onlyFits} onChange={(e) => setOnlyFits(e.target.checked)} className="size-4 accent-black" />
                Only models that fit
              </label>
            </div>
            <div className="mt-4">
              <TableFrame label="Which models fit this prompt">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Model</th>
                      <th className={th}>Result</th>
                      <th className={`${th} text-right`}>Prompt tokens</th>
                      <th className={`${th} text-right`}>Window</th>
                      <th className={th}>Used</th>
                      <th className={`${th} text-right`}>Room left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.model.id}>
                        <td className={td}>{r.model.name}<span className="block text-[11px] text-black/50">{r.model.provider}</span></td>
                        <td className={td}>
                          <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
                          {r.status === "too-big" ? <span className="mt-1 block text-[11px] leading-4 text-black/60">Needs {r.chunks} pieces</span> : null}
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{r.promptTokens.toLocaleString("en-US")}{mode === "text" ? <span className="block text-[11px] text-black/50">{methodLabel(countFor(r.model.family, body, openaiCount)).split(" (")[0].toLowerCase()}</span> : null}</td>
                        <td className={`${td} text-right tabular-nums`}>{formatTokens(r.model.context)}{r.outputCapped ? <span className="block text-[11px] text-black/50">reply capped at {formatTokens(r.reservedOutput)}</span> : null}</td>
                        <td className={`${td} min-w-[140px]`}>
                          <span className="tabular-nums">{r.used >= 10 ? ">999%" : `${(r.used * 100).toFixed(r.used < 0.1 ? 1 : 0)}%`}</span>
                          <span className="mt-1 block h-1.5 bg-black/10" aria-hidden="true"><span className={`block h-full ${r.status === "too-big" ? "bg-black" : r.status === "tight" ? "bg-[#f4d44d] outline outline-1 outline-black/30" : "bg-black/70"}`} style={{ width: `${Math.min(100, Math.round(r.used * 100))}%` }} /></span>
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{r.free >= 0 ? formatTokens(r.free) : `−${formatTokens(-r.free)}`}</td>
                      </tr>
                    ))}
                    {shown.length === 0 ? <tr><td className={td} colSpan={6}>No model can take this in one piece. Split it, or summarise it first.</td></tr> : null}
                  </tbody>
                </table>
              </TableFrame>
            </div>
            <p className="mt-3 text-xs leading-5 text-black/60">“Tight” means over 80% of the window. Models do worse near the limit, so leave margin. Pieces are a rough count of equal parts that would each fit.</p>
          </div>
        </>
      )}
    </div>
  );
}
