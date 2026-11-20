"use client";

import { useMemo, useState } from "react";
import { allBills, defaultBill, VENDOR_PRICES_AS_OF, type BillInput, type BillRow } from "@/lib/tools/observability-bill";
import { Badge, Caption, ghostClass, NumberField, TableFrame, td, th } from "./ui";

const money = (row: BillRow) => {
  if (row.amount === null) return "Quote";
  const text = `$${row.amount.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(row.amount) ? 0 : 2, maximumFractionDigits: 2 })}`;
  return row.kind === "from" ? `${text}+` : text;
};

export function ObservabilityBillCalculator() {
  const [input, setInput] = useState<BillInput>(defaultBill);
  const set = <K extends keyof BillInput>(key: K, value: number) => setInput((c) => ({ ...c, [key]: value }));
  const rows = useMemo(() => allBills(input), [input]);
  const [uncoil, ...others] = rows;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-8">
        <fieldset className="min-w-0">
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">Your traffic</legend>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <NumberField label="Agent runs a month" value={input.runsPerMonth} onChange={(v) => set("runsPerMonth", v)} step={1000} hint="One run is one task your agent finishes." />
            <NumberField label="Team members" value={input.members} onChange={(v) => set("members", Math.max(1, v))} step={1} min={1} hint="People who log in to look at traces." />
            <NumberField label="Model calls per run" value={input.modelCallsPerRun} onChange={(v) => set("modelCallsPerRun", v)} step={1} />
            <NumberField label="Tool calls per run" value={input.toolCallsPerRun} onChange={(v) => set("toolCallsPerRun", v)} step={1} />
            <NumberField label="Scores per run" value={input.scoresPerRun} onChange={(v) => set("scoresPerRun", v)} step={1} hint="Only Langfuse bills these as units." />
          </div>
        </fieldset>
        <button type="button" className={ghostClass} onClick={() => setInput(defaultBill)}>Reset to examples</button>
      </div>

      <div className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div role="region" aria-live="polite" aria-label="Monthly bill on Uncoil" className="bg-[#f4d44d] p-6 text-black">
          <Caption>Uncoil, {uncoil.plan}</Caption>
          <p className="mt-3 break-words font-pixel text-[clamp(2.4rem,5vw,3.6rem)] leading-none tracking-[-0.06em]">{money(uncoil)}<span className="ml-2 font-mono text-sm tracking-normal">a month</span></p>
          <p className="mt-3 text-sm leading-6 text-black/75">{uncoil.what}. {uncoil.note}</p>
        </div>

        <TableFrame label="Monthly bill by tool">
          <table className="w-full border-collapse text-left">
            <thead><tr><th className={th}>Tool</th><th className={th}>Plan</th><th className={th}>A month</th></tr></thead>
            <tbody>
              {others.map((row) => (
                <tr key={row.tool}>
                  <td className={td}>{row.tool}</td>
                  <td className={td}>{row.plan}</td>
                  <td className={`${td} tabular-nums`}>{money(row)} {row.kind === "from" ? <Badge tone="warning">At least</Badge> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
        <ul className="space-y-2 text-xs leading-5 text-black/65">
          {others.map((row) => <li key={row.tool}><span className="font-medium text-black">{row.tool}:</span> {row.what}. {row.note}</li>)}
        </ul>
        <p className="text-xs leading-5 text-black/60">Plan prices read from each vendor&rsquo;s public pricing page on {VENDOR_PRICES_AS_OF}. They change, so check before you decide. Tools count different things (traces, steps, requests), so we convert your traffic for each one. Annual billing, volume deals and add-ons are left out.</p>
      </div>
    </div>
  );
}
