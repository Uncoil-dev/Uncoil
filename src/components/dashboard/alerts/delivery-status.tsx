"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { relativeTime } from "@/components/dashboard/tracing/format";

type Delivery = { ok: boolean; kind: "fired" | "resolved" | "test"; error?: string; at: number };
type Result = { ok: boolean; error?: string };

export const cleanError = (caught: unknown, fallback: string) => (caught instanceof Error ? caught.message.replace(/^.*Uncaught Error:\s*/, "").replace(/\s*Called by client[\s\S]*$/, "") : fallback);

const KIND_LABEL = { fired: "alert", resolved: "back-to-normal message", test: "test" } as const;

/** One line per channel: did the last Slack or webhook message arrive, and if not, why. */
export function DeliveryLine({ label, delivery, now }: { label: string; delivery: Delivery | undefined; now: number }) {
  if (!delivery) return <span className="text-[#6B7380]">{label}: nothing sent yet</span>;
  const when = relativeTime(new Date(delivery.at).toISOString(), now);
  return delivery.ok ? (
    <span className="text-[#8B93A1]"><i className="mr-1 inline-block size-1.5 bg-[#5BE3A0]" />{label}: last {KIND_LABEL[delivery.kind]} delivered {when}</span>
  ) : (
    <span role="alert" className="text-[#FF8A8A]"><i className="mr-1 inline-block size-1.5 bg-[#FF6B6B]" />{label}: last {KIND_LABEL[delivery.kind]} failed {when}. {delivery.error}</span>
  );
}

/** Sends a test to a saved rule's Slack and webhook and shows the answer right away. */
export function SendTest({ ruleId, name }: { ruleId: Id<"alertRules">; name: string }) {
  const send = useAction(api.alertRules.sendTest);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ slack?: Result; webhook?: Result; error?: string } | null>(null);
  async function run() {
    setBusy(true);
    setOutcome(null);
    try { setOutcome(await send({ ruleId })); } catch (caught) { setOutcome({ error: cleanError(caught, "The test could not be sent.") }); }
    setBusy(false);
  }
  const lines = outcome ? ([["Slack", outcome.slack], ["Webhook", outcome.webhook]] as const).filter(([, r]) => r) : [];
  return (
    <div className="mt-2">
      <button type="button" disabled={busy} onClick={() => void run()} aria-label={`Send a test message for ${name}`} className="h-6 border border-[#262C35] px-2 text-[11px] text-[#8B93A1] hover:border-[#4A5260] hover:text-[#E6E9EE] disabled:opacity-50">{busy ? "Sending…" : "Send a test"}</button>
      <div aria-live="polite" className="mt-1 space-y-0.5 text-[11px]">
        {outcome?.error ? <p className="text-[#FF8A8A]">{outcome.error}</p> : null}
        {lines.map(([label, result]) => <p key={label} className={result!.ok ? "text-[#5BE3A0]" : "text-[#FF8A8A]"}>{result!.ok ? `✓ ${label} test delivered. Check the channel.` : `✕ ${label}: ${result!.error}`}</p>)}
      </div>
    </div>
  );
}

/** Used in the new-rule form: tries a pasted link before anything is saved. */
export function TestLink({ projectId, kind, url }: { projectId: string; kind: "slack" | "webhook"; url: string }) {
  const test = useAction(api.alertRules.testLink);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Result | null>(null);
  async function run() {
    setBusy(true);
    setOutcome(null);
    try {
      const result = await test({ projectId: projectId as Id<"projects">, ...(kind === "slack" ? { slackUrl: url.trim() } : { webhookUrl: url.trim() }) });
      setOutcome((kind === "slack" ? result.slack : result.webhook) ?? { ok: false, error: "Nothing was sent." });
    } catch (caught) { setOutcome({ ok: false, error: cleanError(caught, "The test could not be sent.") }); }
    setBusy(false);
  }
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
      <button type="button" disabled={busy || !url.trim()} onClick={() => void run()} className="h-6 border border-[#262C35] px-2 text-[#8B93A1] enabled:hover:border-[#4A5260] enabled:hover:text-[#E6E9EE] disabled:opacity-40">{busy ? "Sending…" : "Send a test message"}</button>
      <span aria-live="polite" className={outcome?.ok ? "text-[#5BE3A0]" : "text-[#FF8A8A]"}>{outcome ? (outcome.ok ? "✓ Delivered. Check the channel." : `✕ ${outcome.error}`) : null}</span>
    </span>
  );
}
