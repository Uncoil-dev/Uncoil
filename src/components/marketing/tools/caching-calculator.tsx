"use client";

import { useMemo, useState } from "react";
import { cachingSavings, defaultCaching, type CachingInput } from "@/lib/tools/calculators";
import { money, PRICES_CHECKED_LABEL } from "@/lib/tools/models";
import { Caption, ghostClass, Metric, MetricGrid, NumberField, TableFrame, td, th } from "./ui";

export function CachingCalculator() {
  const [input, setInput] = useState<CachingInput>(defaultCaching);
  const set = (key: keyof CachingInput) => (v: number) => setInput((c) => ({ ...c, [key]: v }));
  const rows = useMemo(() => cachingSavings(input), [input]);
  const best = rows[0];
  const median = rows[Math.floor(rows.length / 2)];

  return (
    <div className="space-y-10">
      <div>
        <Caption>What does one call look like?</Caption>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <NumberField label="Calls per month" value={input.requestsPerMonth} onChange={set("requestsPerMonth")} step={10000} />
          <NumberField label="Fixed tokens at the start" value={input.stableTokens} onChange={set("stableTokens")} step={500} hint="System prompt, tool definitions, fixed documents." />
          <NumberField label="Changing tokens" value={input.changingTokens} onChange={set("changingTokens")} step={100} hint="User message and new tool results." />
          <NumberField label="Output tokens" value={input.outputTokens} onChange={set("outputTokens")} step={50} />
          <NumberField label="Calls that hit the cache" value={input.hitRate} onChange={(v) => set("hitRate")(Math.min(100, v))} step={5} suffix="%" hint="Caches expire after a few minutes without use." />
        </div>
        <button type="button" className={`${ghostClass} mt-3`} onClick={() => setInput(defaultCaching)}>Reset to examples</button>
      </div>

      {best ? (
        <MetricGrid label="Caching savings">
          <Metric strong label="Biggest saving" value={`${money(best.saved)} a month`} note={`${best.model.name}, ${best.savedPercent.toFixed(0)}% less`} />
          <Metric label="Typical saving" value={median ? `${median.savedPercent.toFixed(0)}%` : "—"} note="Median across models with a cache price" />
          <Metric label="Cost with caching" value={money(best.withCache)} note={`${best.model.name}, down from ${money(best.withoutCache)}`} />
          <Metric label="Models compared" value={String(rows.length)} note="Only models with a published cache price" />
        </MetricGrid>
      ) : null}

      <div>
        <TableFrame label="Monthly cost with and without prompt caching">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={th}>Model</th>
                <th className={`${th} text-right`}>Without cache</th>
                <th className={`${th} text-right`}>With cache</th>
                <th className={`${th} text-right`}>You save</th>
                <th className={`${th} text-right`}>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model.id}>
                  <td className={td}>{r.model.name} <span className="text-black/50">{r.model.provider}</span></td>
                  <td className={`${td} text-right`}>{money(r.withoutCache)}</td>
                  <td className={`${td} text-right`}>{money(r.withCache)}</td>
                  <td className={`${td} text-right font-medium`}>{money(r.saved)}</td>
                  <td className={`${td} text-right`}>{r.savedPercent.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
        <p className="mt-3 text-xs leading-5 text-black/60">List prices in US dollars, checked {PRICES_CHECKED_LABEL}. Some providers charge extra to write the cache or have minimum prompt sizes. This estimate leaves those out, so check your provider&rsquo;s caching rules.</p>
      </div>
    </div>
  );
}
