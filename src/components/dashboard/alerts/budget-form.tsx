"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function BudgetForm({ projectId, defaultEmail, onClose }: { projectId: string; defaultEmail: string; onClose: () => void }) {
  const create = useMutation(api.budgets.create);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [limit, setLimit] = useState("100");
  const [warnAt, setWarnAt] = useState("80");
  const [environment, setEnvironment] = useState("");
  const [name, setName] = useState("");
  const [emails, setEmails] = useState(defaultEmail);
  const [useEmail, setUseEmail] = useState(true);
  const [useSlack, setUseSlack] = useState(false);
  const [useWebhook, setUseWebhook] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const limitNumber = Number(limit);
  const warnNumber = Number(warnAt);
  const autoName = `${period === "week" ? "Weekly" : "Monthly"} spend`;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!(limit.trim() !== "" && limitNumber > 0)) { setError("Enter a budget of more than $0."); return; }
    if (!(Number.isInteger(warnNumber) && warnNumber >= 1 && warnNumber <= 99)) { setError("Warn me at a whole number between 1 and 99."); return; }
    if (!(useEmail || useSlack || useWebhook)) { setError("Choose at least one way to be told."); return; }
    if ((useSlack && !slackUrl.trim()) || (useWebhook && !webhookUrl.trim())) { setError("Paste the link for each way you switched on."); return; }
    setSaving(true);
    setError("");
    try {
      await create({ projectId: projectId as Id<"projects">, name: name.trim() || autoName, period, limitUsd: limitNumber, warnAtPercent: warnNumber, environment: environment.trim() || undefined, emailTo: useEmail ? emails.split(/[,\s]+/).filter(Boolean) : [], slackUrl: useSlack ? slackUrl.trim() : undefined, webhookUrl: useWebhook ? webhookUrl.trim() : undefined });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace(/^.*Uncaught Error:\s*/, "") : "Could not save the budget.");
      setSaving(false);
    }
  }

  const field = "h-8 border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] text-[#F4D44D] outline-none focus:border-[#4A5260]";
  const wide = "mt-2.5 h-9 w-full border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] outline-none focus:border-[#4A5260]";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:pt-10" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="New cost budget" className="w-full max-w-[600px] border border-[#262C35] bg-[#0E1115] font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE] shadow-2xl outline-none">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between border-b border-[#1F242C] px-4 py-3">
            <b>New cost budget</b>
            <button type="button" onClick={onClose} aria-label="Close" className="text-[#8B93A1] hover:text-[#E6E9EE]">esc ✕</button>
          </div>
          <div className="border-b border-[#1F242C] px-4 py-3">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">1 · HOW MUCH</div>
            <div className="flex flex-wrap items-center gap-2 text-[14px]">
              <span>Spend up to $</span>
              <input aria-label="Budget in dollars" inputMode="decimal" value={limit} onChange={(event) => setLimit(event.target.value)} className={`${field} w-24`} />
              <span>per</span>
              <select aria-label="Period" value={period} onChange={(event) => setPeriod(event.target.value as "week" | "month")} className={field}>
                <option value="week">week</option>
                <option value="month">month</option>
              </select>
              <span>in environment</span>
              <input aria-label="Environment (optional)" placeholder="any" value={environment} onChange={(event) => setEnvironment(event.target.value)} className={`${field} w-28 placeholder:text-[#6B7380]`} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
              <span>Warn me at</span>
              <input aria-label="Warn at percent" inputMode="numeric" value={warnAt} onChange={(event) => setWarnAt(event.target.value)} className={`${field} w-16`} />
              <span>% of the budget</span>
            </div>
            <p className="mt-2 text-[11px] text-[#6B7380]">The {period} runs on UTC time, {period === "week" ? "Monday to Sunday" : "from the 1st"}. You’re told once at the warning level and once when the budget is passed.</p>
          </div>
          <div className="border-b border-[#1F242C] px-4 py-3">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">2 · TELL ME BY</div>
            <div className="flex flex-wrap gap-2 text-[12px]" role="group" aria-label="Ways to be told">
              {([["✉ Email", useEmail, setUseEmail], ["Slack", useSlack, setUseSlack], ["Webhook", useWebhook, setUseWebhook]] as const).map(([label, on, set]) => (
                <button key={label} type="button" aria-pressed={on} onClick={() => set(!on)} className={`border px-3 py-1.5 ${on ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1] hover:border-[#4A5260]"}`}>{on ? "✓ " : ""}{label}</button>
              ))}
            </div>
            {useEmail ? <input aria-label="Email addresses" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="you@company.com, teammate@company.com" className={wide} /> : null}
            {useSlack ? <input aria-label="Slack webhook link" type="password" autoComplete="off" value={slackUrl} onChange={(event) => setSlackUrl(event.target.value)} placeholder="https://hooks.slack.com/services/…" className={wide} /> : null}
            {useWebhook ? <input aria-label="Webhook link" type="password" autoComplete="off" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://example.com/uncoil-budgets" className={wide} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <input aria-label="Budget name" value={name} onChange={(event) => setName(event.target.value)} placeholder={autoName} className="h-8 min-w-[180px] flex-1 border border-[#262C35] bg-[#111418] px-2.5 outline-none focus:border-[#4A5260]" />
            {error ? <span role="alert" className="text-[12px] text-[#FF8A8A]">{error}</span> : null}
            <button type="button" onClick={onClose} className="h-8 border border-[#262C35] px-3 text-[#8B93A1] hover:text-[#E6E9EE]">Cancel</button>
            <button type="submit" disabled={saving} className="h-8 bg-[#F4D44D] px-4 font-bold text-[#090909] disabled:opacity-50">{saving ? "Saving…" : "Create budget"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
