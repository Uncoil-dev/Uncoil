"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AlertChart } from "./alert-chart";
import { METRICS, type Metric } from "./alert-metrics";
import { TestLink } from "./delivery-status";

export function AlertRuleForm({ projectId, defaultEmail, onClose }: { projectId: string; defaultEmail: string; onClose: () => void }) {
  const create = useMutation(api.alertRules.create);
  const [metric, setMetric] = useState<Metric>("failed_runs");
  const [threshold, setThreshold] = useState("5");
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [environment, setEnvironment] = useState("");
  const [emails, setEmails] = useState(defaultEmail);
  const [useEmail, setUseEmail] = useState(true);
  const [useSlack, setUseSlack] = useState(false);
  const [useWebhook, setUseWebhook] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const config = METRICS[metric];
  const limit = Number(threshold);
  const valid = threshold.trim() !== "" && Number.isFinite(limit) && limit >= 0;
  const effectiveWindow = config.fixedWindow ?? windowMinutes;

  const preview = useQuery(api.alertRules.preview, valid ? { projectId: projectId as Id<"projects">, metric, threshold: limit, windowMinutes: effectiveWindow, environment: environment.trim() || undefined } : "skip");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const autoName = useMemo(() => config.defaultName(effectiveWindow), [config, effectiveWindow]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) { setError("Enter a limit of zero or more."); return; }
    if (!(useEmail || useSlack || useWebhook)) { setError("Choose at least one way to be told."); return; }
    if ((useSlack && !slackUrl.trim()) || (useWebhook && !webhookUrl.trim())) { setError("Paste the link for each way you switched on."); return; }
    setSaving(true);
    setError("");
    try {
      await create({ projectId: projectId as Id<"projects">, name: name.trim() || autoName, metric, threshold: limit, windowMinutes: effectiveWindow, environment: environment.trim() || undefined, emailTo: useEmail ? emails.split(/[,\s]+/).filter(Boolean) : [], slackUrl: useSlack ? slackUrl.trim() : undefined, webhookUrl: useWebhook ? webhookUrl.trim() : undefined });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.replace(/^.*Uncaught Error:\s*/, "") : "Could not save the rule.");
      setSaving(false);
    }
  }

  const field = "h-8 border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] text-[#F4D44D] outline-none focus:border-[#4A5260]";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 sm:pt-10" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="New alert rule" className="w-full max-w-[680px] border border-[#262C35] bg-[#0E1115] text-[13px] text-[#E6E9EE] shadow-2xl outline-none">
        <form onSubmit={submit}>
          <div className="flex items-center justify-between border-b border-[#1F242C] px-4 py-3">
            <b>New alert rule</b>
            <button type="button" onClick={onClose} aria-label="Close" className="text-[#8B93A1] hover:text-[#E6E9EE]">esc ✕</button>
          </div>
          <div className="border-b border-[#1F242C] px-4 py-3">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">1 · WHAT TO WATCH</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="What to watch">
              {(Object.keys(METRICS) as Metric[]).map((key) => (
                <button key={key} type="button" role="radio" aria-checked={metric === key} onClick={() => { setMetric(key); setThreshold(String(METRICS[key].defaultLimit)); }} className={`border px-2.5 py-2 text-left ${metric === key ? "border-[#F4D44D] bg-[#17150a]" : "border-[#262C35] hover:border-[#4A5260]"}`}>
                  <b className={`block ${metric === key ? "text-[#F4D44D]" : ""}`}>{METRICS[key].title}</b>
                  <span className="text-[11px] text-[#6B7380]">{METRICS[key].hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="border-b border-[#1F242C] px-4 py-3">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">2 · WHEN</div>
            <div className="flex flex-wrap items-center gap-2 text-[14px]">
              <span>Alert when {config.sentence} is above</span>
              <input aria-label="Limit" inputMode="decimal" value={threshold} onChange={(event) => setThreshold(event.target.value)} className={`${field} w-20`} />
              <span>{config.unit}</span>
              {config.fixedWindow === undefined ? (
                <>
                  <span>per</span>
                  <select aria-label="Time window" value={windowMinutes} onChange={(event) => setWindowMinutes(Number(event.target.value))} className={field}>
                    <option value={60}>hour</option>
                    <option value={1440}>day</option>
                  </select>
                </>
              ) : null}
              <span>in environment</span>
              <input aria-label="Environment (optional)" placeholder="any" value={environment} onChange={(event) => setEnvironment(event.target.value)} className={`${field} w-28 placeholder:text-[#6B7380]`} />
            </div>
          </div>
          <div className="border-b border-[#1F242C] px-4 py-3">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">PREVIEW · LAST 7 DAYS</div>
            {preview ? (
              <>
                <AlertChart series={preview.series} threshold={limit} color="#F4D44D" height={120} bars label={`Preview of ${config.title} over the last 7 days`} />
                <p className="mt-2 font-mono text-[12px] text-[#8B93A1]">
                  {preview.series.every((value) => value === 0) ? "No runs recorded in the last 7 days, so there is nothing to preview yet." : <>This rule would have fired <b className={preview.fires ? "text-[#FF8A8A]" : "text-[#E6E9EE]"}>{preview.fires} {preview.fires === 1 ? "time" : "times"}</b>.</>}
                  {preview.truncated ? " Based on the most recent 2,000 runs." : ""}
                </p>
              </>
            ) : <div className="h-[120px] animate-pulse bg-[#111418]" aria-label="Loading preview" />}
          </div>
          <div className="border-b border-[#1F242C] px-4 py-3">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">3 · TELL ME BY</div>
            <div className="flex flex-wrap gap-2 text-[12px]" role="group" aria-label="Ways to be told">
              {([["✉ Email", useEmail, setUseEmail], ["Slack", useSlack, setUseSlack], ["Webhook", useWebhook, setUseWebhook]] as const).map(([label, on, set]) => (
                <button key={label} type="button" aria-pressed={on} onClick={() => set(!on)} className={`border px-3 py-1.5 ${on ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1] hover:border-[#4A5260]"}`}>{on ? "✓ " : ""}{label}</button>
              ))}
            </div>
            {useEmail ? <input aria-label="Email addresses" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="you@company.com, teammate@company.com" className="mt-2.5 h-9 w-full border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] outline-none focus:border-[#4A5260]" /> : null}
            {useSlack ? (
              <div className="mt-2.5">
                <input aria-label="Slack webhook link" type="password" autoComplete="off" value={slackUrl} onChange={(event) => setSlackUrl(event.target.value)} placeholder="https://hooks.slack.com/services/…" className="h-9 w-full border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] outline-none focus:border-[#4A5260]" />
                <p className="mt-1 text-[11px] text-[#6B7380]">In Slack, add the “Incoming Webhooks” app to a channel and paste the link it gives you.</p>
                <TestLink projectId={projectId} kind="slack" url={slackUrl} />
              </div>
            ) : null}
            {useWebhook ? (
              <div className="mt-2.5">
                <input aria-label="Webhook link" type="password" autoComplete="off" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://example.com/tracify-alerts" className="h-9 w-full border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] outline-none focus:border-[#4A5260]" />
                <p className="mt-1 text-[11px] text-[#6B7380]">We send a JSON message to this address whenever the rule fires. It must be a public https link.</p>
                <TestLink projectId={projectId} kind="webhook" url={webhookUrl} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <input aria-label="Rule name" value={name} onChange={(event) => setName(event.target.value)} placeholder={autoName} className="h-8 min-w-[180px] flex-1 border border-[#262C35] bg-[#111418] px-2.5 outline-none focus:border-[#4A5260]" />
            {error ? <span role="alert" className="text-[12px] text-[#FF8A8A]">{error}</span> : null}
            <button type="button" onClick={onClose} className="h-8 border border-[#262C35] px-3 text-[#8B93A1] hover:text-[#E6E9EE]">Cancel</button>
            <button type="submit" disabled={saving} className="h-8 bg-[#F4D44D] px-4 font-bold text-[#090909] disabled:opacity-50">{saving ? "Saving…" : "Create rule"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
