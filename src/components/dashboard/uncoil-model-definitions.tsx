"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SUGGESTED_PRICES, checkPrices, costFromTokens, findPrice, type ModelPrice } from "../../../convex/modelPricing";
import { Button, Notice, PanelHeading, card, cleanError, eyebrow, field, usd } from "./settings-kit";

type Row = { pattern: string; inputPerM: string; outputPerM: string; note: string };
const toRow = (price: ModelPrice): Row => ({ pattern: price.pattern, inputPerM: String(price.inputPerM), outputPerM: String(price.outputPerM), note: price.note ?? "" });
const toPrice = (row: Row): ModelPrice => ({ pattern: row.pattern.trim(), inputPerM: Number(row.inputPerM), outputPerM: Number(row.outputPerM), note: row.note.trim() || undefined });

/** Prices a project sets for its own models. A step that arrives with tokens but no cost is priced from this list. */
export function UncoilModelDefinitions({ projectId }: { projectId: string }) {
  const id = projectId as Id<"projects">;
  const data = useQuery(api.modelDefinitions.get, { projectId: id });
  const save = useMutation(api.modelDefinitions.save);
  const [draft, setDraft] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean }>({ text: "" });
  const [saving, setSaving] = useState(false);
  const [calc, setCalc] = useState({ model: "", input: "3000", output: "400" });

  const saved = useMemo(() => (data?.prices ?? []).map(toRow), [data]);
  const rows = draft ?? saved;
  const prices = rows.map(toPrice);
  const problem = checkPrices(prices);
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved);

  if (data === undefined) return <div className={`${card} p-6 ${eyebrow}`}>Loading model prices…</div>;
  if (data === null) return <div className={`${card} p-6 ${eyebrow}`}>You do not have access to this project.</div>;

  const edit = (next: Row[]) => { setDraft(next); setNotice({ text: "" }); };
  const addRow = (price?: ModelPrice) => edit([...rows, price ? toRow(price) : { pattern: "", inputPerM: "", outputPerM: "", note: "" }]);
  const suggestionFor = (model: string) => SUGGESTED_PRICES.find((item) => model.toLowerCase().startsWith(item.pattern));
  const calcPrice = findPrice(calc.model || prices[0]?.pattern, prices);
  const calcCost = calcPrice ? costFromTokens(calcPrice, Number(calc.input), Number(calc.output)) : null;

  async function submit() {
    if (problem || saving) return;
    setSaving(true);
    try {
      const result = await save({ projectId: id, prices: prices.filter((price) => price.pattern) });
      setDraft(null);
      setNotice({ text: `Saved ${result.saved} price${result.saved === 1 ? "" : "s"}. New steps use them within 5 minutes.` });
    } catch (error) {
      setNotice({ text: cleanError(error, "The prices could not be saved."), bad: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="uncoil-settings-panel grid gap-5">
      <section className={`${card} p-6`}>
        <PanelHeading kicker="Project settings / Pricing" title="Price your own models.">
          When a step arrives with token counts but no cost, Uncoil prices it from this list. A cost your code already reports is never changed. A name matches every model that starts with it, and the longest match wins.
        </PanelHeading>

        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[1.6fr_1fr_1fr_1.2fr_36px] gap-2 pb-2">
            {["Model name starts with", "Input $ / 1M", "Output $ / 1M", "Note", ""].map((head) => <span key={head} className={eyebrow}>{head}</span>)}
          </div>
          {rows.length === 0 ? <p className="border border-dashed border-[#262C35] p-5 text-[13px] text-[#8B93A1]">No prices yet. Add the models you use, or start from common prices below.</p> : null}
          {rows.map((row, index) => (
            <div key={index} className="mb-2 grid min-w-[640px] grid-cols-[1.6fr_1fr_1fr_1.2fr_36px] gap-2">
              <input aria-label="Model name" className={field} value={row.pattern} placeholder="gpt-4o-mini" onChange={(event) => edit(rows.map((item, i) => (i === index ? { ...item, pattern: event.target.value } : item)))} />
              <input aria-label="Input price per million tokens" className={field} inputMode="decimal" value={row.inputPerM} placeholder="0.15" onChange={(event) => edit(rows.map((item, i) => (i === index ? { ...item, inputPerM: event.target.value } : item)))} />
              <input aria-label="Output price per million tokens" className={field} inputMode="decimal" value={row.outputPerM} placeholder="0.60" onChange={(event) => edit(rows.map((item, i) => (i === index ? { ...item, outputPerM: event.target.value } : item)))} />
              <input aria-label="Note" className={field} value={row.note} placeholder="Negotiated rate" onChange={(event) => edit(rows.map((item, i) => (i === index ? { ...item, note: event.target.value } : item)))} />
              <Button aria-label={`Remove ${row.pattern || "row"}`} className="justify-center !px-0" onClick={() => edit(rows.filter((_, i) => i !== index))}><Trash2 className="size-3.5" /></Button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => addRow()}><Plus className="size-3.5" />Add price</Button>
          <Button onClick={() => edit([...rows, ...SUGGESTED_PRICES.filter((item) => !rows.some((row) => row.pattern.toLowerCase() === item.pattern)).map(toRow)])}><Wand2 className="size-3.5" />Start from common prices</Button>
          <Button tone="primary" disabled={!dirty || Boolean(problem) || saving} onClick={() => void submit()}>{saving ? "Saving…" : "Save prices"}</Button>
          {dirty ? <Button onClick={() => { setDraft(null); setNotice({ text: "" }); }}>Discard</Button> : null}
        </div>
        <div className="mt-3 grid gap-2">
          {dirty && problem ? <Notice bad text={problem} /> : null}
          <Notice text={notice.text} bad={notice.bad} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className={`${card} p-6`}>
          <p className={eyebrow}>Seen in your last {data.scannedRuns} runs</p>
          {data.seen.length === 0 ? <p className="mt-4 text-[13px] leading-6 text-[#8B93A1]">No runs with a model name yet. Once traces arrive, every model they use is listed here with a button to price it.</p> : (
            <ul className="mt-4 divide-y divide-[#1F242C]">
              {data.seen.map((item) => {
                const match = findPrice(item.model, prices);
                const suggestion = suggestionFor(item.model);
                return (
                  <li key={item.model} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12px] text-[#E6E9EE]">{item.model}</p>
                      <p className="mt-1 font-mono text-[10px] text-[#8B93A1]">{item.runs} run{item.runs === 1 ? "" : "s"} · {usd(item.costUsd / item.runs)} average per run</p>
                    </div>
                    {match ? <span className="border border-[#F4D44D]/50 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-[#F4D44D]">Priced · {usd(match.inputPerM)} in / {usd(match.outputPerM)} out</span>
                      : <Button onClick={() => addRow(suggestion ? { ...suggestion, pattern: item.model } : { pattern: item.model, inputPerM: 0, outputPerM: 0 })}><Plus className="size-3.5" />{suggestion ? "Add list price" : "Add price"}</Button>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${card} p-6`}>
          <p className={eyebrow}>Cost check</p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-[11px] text-[#8B93A1]">Model
              <select className={field} value={calc.model} onChange={(event) => setCalc({ ...calc, model: event.target.value })}>
                {prices.filter((price) => price.pattern).map((price) => <option key={price.pattern} value={price.pattern}>{price.pattern}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[11px] text-[#8B93A1]">Input tokens<input className={field} inputMode="numeric" value={calc.input} onChange={(event) => setCalc({ ...calc, input: event.target.value })} /></label>
            <label className="grid gap-1.5 text-[11px] text-[#8B93A1]">Output tokens<input className={field} inputMode="numeric" value={calc.output} onChange={(event) => setCalc({ ...calc, output: event.target.value })} /></label>
          </div>
          <p className="mt-5 font-pixel text-4xl tracking-[-0.05em] text-[#E6E9EE]">{calcCost === null ? "—" : usd(calcCost)}</p>
          <p className="mt-1 font-mono text-[10px] text-[#8B93A1]">{calcCost === null ? "Add a price to see the cost of one call." : `per call · ${usd(calcCost * 1000)} per 1,000 calls`}</p>
        </section>
      </div>
    </div>
  );
}
