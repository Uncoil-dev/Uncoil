"use client";

import { useId, useState, type ReactNode } from "react";
import { models, providers, type Model } from "@/lib/tools/models";

export const labelClass = "font-mono text-[11px] uppercase tracking-[0.08em]";
export const boxClass = "border border-black bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f4d44d]";
export const buttonClass = "min-h-11 border border-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-[#f4d44d] disabled:opacity-40";
export const ghostClass = "min-h-11 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-black/60 underline decoration-[#f4d44d] decoration-2 underline-offset-4";

export function Caption({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">{children}</p>;
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  step = 1,
  suffix,
  min = 0,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  min?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className={`mt-2 flex items-center ${boxClass}`}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
        />
        {suffix ? <span className="pr-3 font-mono text-xs text-black/50">{suffix}</span> : null}
      </div>
      {hint ? <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-black/55">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 12,
  hint,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: ReactNode;
  mono?: boolean;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className={`mt-2 ${boxClass}`}>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className={`block w-full resize-y bg-transparent p-3 text-sm leading-6 outline-none ${mono ? "font-mono text-[13px]" : ""}`}
        />
      </div>
      {hint ? <div className="mt-1.5 text-xs leading-5 text-black/55">{hint}</div> : null}
    </div>
  );
}

export function SelectModel({
  label = "Model",
  value,
  onChange,
  list = models,
}: {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  list?: readonly Model[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className={`mt-2 ${boxClass}`}>
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 w-full bg-transparent px-3 font-mono text-sm outline-none">
          {providers.map((p) => (
            <optgroup key={p} label={p}>
              {list.filter((m) => m.provider === p).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

export function Metric({ label, value, note, strong = false }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`p-5 ${strong ? "bg-[#f4d44d] text-black" : "bg-[#090909] text-[#eceae3]"}`}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${strong ? "text-black/65" : "text-white/55"}`}>{label}</p>
      <p className="mt-3 break-words font-pixel text-[clamp(1.7rem,3vw,2.6rem)] leading-none tracking-[-0.06em]">{value}</p>
      {note ? <p className={`mt-3 text-xs leading-5 ${strong ? "text-black/70" : "text-white/55"}`}>{note}</p> : null}
    </div>
  );
}

export function MetricGrid({ children, label }: { children: ReactNode; label: string }) {
  return <div role="region" aria-live="polite" aria-label={label} className="grid gap-px border border-black bg-black sm:grid-cols-2">{children}</div>;
}

const badgeTone = {
  problem: "bg-black text-[#eceae3]",
  warning: "bg-[#f4d44d] text-black",
  tip: "border border-black/40 text-black/70",
  error: "bg-black text-[#eceae3]",
  ok: "bg-[#eceae3] text-black border border-black/40",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof badgeTone; children: ReactNode }) {
  return <span className={`inline-block shrink-0 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${badgeTone[tone]}`}>{children}</span>;
}

export function CopyButton({ text, label = "Copy", disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  return (
    <button
      type="button"
      disabled={disabled}
      className={buttonClass}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("failed");
        }
        window.setTimeout(() => setState("idle"), 2000);
      }}
    >
      <span aria-live="polite">{state === "done" ? "Copied" : state === "failed" ? "Select and copy by hand" : label}</span>
    </button>
  );
}

/** Small scrolling table wrapper that keeps wide tables inside the page on phones. */
export function TableFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto border border-black bg-white" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export const th = "whitespace-nowrap border-b border-black bg-[#eceae3] px-3 py-2.5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-black/65";
export const td = "border-b border-black/10 px-3 py-2.5 align-top font-mono text-[13px]";
