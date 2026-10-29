"use client";

import { appHref } from "@/lib/app-links";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  defaultInput,
  estimate,
  formatUsd,
  fromSearch,
  levers,
  tierPresets,
  toSearch,
  type EstimatorInput,
} from "@/lib/cost-estimator";

type Field = { key: keyof EstimatorInput; label: string; hint: string; step: number; suffix?: string };

const groups: { title: string; fields: Field[] }[] = [
  {
    title: "Traffic",
    fields: [
      { key: "runsPerDay", label: "Agent runs per day", hint: "One run = one user task from start to finish.", step: 100 },
      { key: "callsPerRun", label: "Model calls per run", hint: "Planning, tool choice, answer, checks. Count them all.", step: 1 },
      { key: "successRate", label: "Runs that finish the task", hint: "Failed runs still cost money.", step: 1, suffix: "%" },
      { key: "retryRate", label: "Runs repeated once", hint: "Timeouts, bad tool output, user retries.", step: 1, suffix: "%" },
    ],
  },
  {
    title: "Tokens per call",
    fields: [
      { key: "inputTokens", label: "Input tokens", hint: "System prompt, history, retrieved text and tool results.", step: 100 },
      { key: "outputTokens", label: "Output tokens", hint: "What the model writes back, including tool call arguments.", step: 50 },
      { key: "cachedShare", label: "Input served from cache", hint: "The stable start of your prompt, if your provider caches it.", step: 5, suffix: "%" },
    ],
  },
  {
    title: "Prices (USD per million tokens)",
    fields: [
      { key: "inputPricePerM", label: "Input price", hint: "Copy it from your provider’s price page.", step: 0.05 },
      { key: "outputPricePerM", label: "Output price", hint: "Output is usually several times the input price.", step: 0.1 },
      { key: "cachedDiscount", label: "Cached input discount", hint: "How much cheaper cached input is. Zero if unsure.", step: 5, suffix: "%" },
      { key: "toolCostPerRun", label: "Other cost per run (USD)", hint: "Search APIs, vector queries, code sandboxes.", step: 0.001 },
    ],
  },
];

function Metric({ label, value, note, strong = false }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`p-5 ${strong ? "bg-[#f4d44d] text-black" : "bg-[#090909] text-[#eceae3]"}`}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${strong ? "text-black/65" : "text-white/55"}`}>{label}</p>
      <p className="mt-3 font-pixel text-[clamp(1.9rem,3.6vw,3rem)] leading-none tracking-[-0.06em]">{value}</p>
      {note ? <p className={`mt-3 text-xs leading-5 ${strong ? "text-black/70" : "text-white/55"}`}>{note}</p> : null}
    </div>
  );
}

export function CostEstimator() {
  const uid = useId();
  const [input, setInput] = useState<EstimatorInput>(defaultInput);
  const [copied, setCopied] = useState(false);

  // Restore a shared link once, after hydration, so server and client markup match.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the address is only possible on the client
    if (window.location.search) setInput(fromSearch(window.location.search));
  }, []);

  const result = useMemo(() => estimate(input), [input]);
  const ideas = useMemo(() => levers(input), [input]);
  const top = ideas[0]?.monthlySaving || 1;

  function set(key: keyof EstimatorInput, raw: string) {
    setInput((current) => ({ ...current, [key]: raw === "" ? 0 : Number(raw) }));
  }

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?${toSearch(input)}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard can be blocked; the address bar already holds the link. */
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="space-y-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">Start from a model size</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tierPresets.map((tier) => {
              const active = input.inputPricePerM === tier.inputPricePerM && input.outputPricePerM === tier.outputPricePerM;
              return (
                <button
                  key={tier.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setInput((c) => ({ ...c, inputPricePerM: tier.inputPricePerM, outputPricePerM: tier.outputPricePerM }))}
                  className={`min-h-11 border border-black px-4 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${active ? "bg-black text-[#eceae3]" : "hover:bg-[#f4d44d]"}`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-black/60">These rates are round example numbers, not any provider’s price list. Replace them with the rates on your own bill.</p>
        </div>

        {groups.map((group) => (
          <fieldset key={group.title} className="min-w-0">
            <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">{group.title}</legend>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`${uid}-${field.key}`} className="font-mono text-[11px] uppercase tracking-[0.08em]">{field.label}</label>
                  <div className="mt-2 flex items-center border border-black bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f4d44d]">
                    <input
                      id={`${uid}-${field.key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={field.step}
                      value={Number.isFinite(input[field.key]) ? input[field.key] : 0}
                      onChange={(e) => set(field.key, e.target.value)}
                      aria-describedby={`${uid}-${field.key}-hint`}
                      className="min-h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
                    />
                    {field.suffix ? <span className="pr-3 font-mono text-xs text-black/50">{field.suffix}</span> : null}
                  </div>
                  <p id={`${uid}-${field.key}-hint`} className="mt-1.5 text-xs leading-5 text-black/55">{field.hint}</p>
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div role="region" aria-live="polite" aria-label="Estimated cost" className="grid gap-px border border-black bg-black sm:grid-cols-2">
          <Metric strong label="Per month" value={formatUsd(result.perMonth)} note={`${formatUsd(result.perDay)} a day, 30 day month`} />
          <Metric label="Per finished task" value={formatUsd(result.costPerSuccess)} note="Spend divided by runs that actually succeed" />
          <Metric label="Per run" value={formatUsd(result.costPerRun)} note={`${formatUsd(result.costPerAttempt)} before retries`} />
          <Metric label="Spent on failures" value={formatUsd(result.failedSpendPerMonth)} note={`Plus ${formatUsd(result.retryOverheadPerMonth)} a month on retries`} />
        </div>

        <div className="mt-8 border border-black bg-[#eceae3] p-5 md:p-6">
          <h3 className="font-pixel text-2xl tracking-[-0.05em]">Where you could save</h3>
          <p className="mt-2 text-xs leading-5 text-black/60">Each idea is tested on its own against your numbers above. They do not add up exactly.</p>
          <ul className="mt-5 space-y-4">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-medium">{idea.label}</p>
                  <p className="shrink-0 font-mono text-sm">−{formatUsd(idea.monthlySaving)}<span className="text-black/50"> /mo</span></p>
                </div>
                <div className="mt-2 h-2 bg-black/10" aria-hidden="true"><div className="h-full bg-[#090909]" style={{ width: `${Math.round((idea.monthlySaving / top) * 100)}%` }} /></div>
                <p className="mt-1.5 text-xs leading-5 text-black/55">{idea.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={copyLink} className="min-h-11 border border-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-[#f4d44d]">
            {copied ? "Link copied" : "Copy a link to these numbers"}
          </button>
          <button type="button" onClick={() => setInput(defaultInput)} className="min-h-11 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-black/60 underline decoration-[#f4d44d] decoration-2 underline-offset-4">Reset</button>
        </div>

        <p className="mt-8 text-sm leading-6 text-black/70">
          This is a planning estimate from the numbers you typed. To see what your agent really spends, run by run, <Link href={appHref("/sign-up")} className="underline decoration-[#f4d44d] decoration-2 underline-offset-4 hover:bg-[#f4d44d]">send a trace to Uncoil</Link> and compare.
        </p>
      </div>
    </div>
  );
}
