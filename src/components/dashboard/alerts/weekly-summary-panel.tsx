"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";

export function WeeklySummaryPanel({ projectId }: { projectId: string }) {
  const id = projectId as Id<"projects">;
  const data = useQuery(api.weeklySummary.get, { projectId: id });
  const save = useMutation(api.weeklySummary.save);
  const sendTest = useMutation(api.weeklySummary.sendTest);
  const { data: session } = authClient.useSession();
  const [emails, setEmails] = useState<string | null>(null);
  const [slackUrl, setSlackUrl] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);


  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try { await action(); setMessage({ kind: "ok", text: done }); }
    catch (caught) { setMessage({ kind: "error", text: caught instanceof Error ? caught.message.replace(/^.*Uncaught Error:\s*/, "") : "Something went wrong." }); }
    finally { setBusy(false); }
  }

  const emailText = emails ?? (data?.emailTo.length ? data.emailTo.join(", ") : session?.user?.email ?? "");
  const list = emailText.split(/[,\s]+/).filter(Boolean);
  const persist = (enabled: boolean, clearSlack?: boolean) => save({ projectId: id, enabled, emailTo: list, slackUrl: slackUrl.trim() || undefined, clearSlack });
  const input = "h-9 w-full border border-[#262C35] bg-[#111418] px-2.5 font-mono text-[12px] outline-none focus:border-[#4A5260]";

  return (
    <div className="flex min-h-0 flex-1 flex-col font-[family-name:var(--font-geist-sans)] text-[13px] text-[#E6E9EE]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#1F242C] px-4 py-2">
        <h1 className="mr-2 text-base font-semibold tracking-tight">Weekly summary</h1>
        <span className="text-[12px] text-[#8B93A1]">One short email every Monday with runs, failures and spend.</span>
        {data ? <span className={`ml-auto border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em] ${data.enabled ? "border-[#5BE3A0] text-[#5BE3A0]" : "border-[#6B7380] text-[#6B7380]"}`}>{data.enabled ? "ON" : "OFF"}</span> : null}
      </header>
      {data === undefined ? (
        <div className="grid gap-3 p-4 lg:grid-cols-2" aria-label="Loading weekly summary"><div className="h-64 animate-pulse border border-[#1F242C] bg-[#0E1115]" /><div className="h-64 animate-pulse border border-[#1F242C] bg-[#0E1115]" /></div>
      ) : data === null ? (
        <p className="p-6 text-[#8B93A1]">You don’t have access to this project’s summary.</p>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <section className="border border-[#1F242C] bg-[#0E1115] p-4" aria-label="Settings">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">SEND TO</div>
            <label className="block text-[12px] text-[#8B93A1]">Email addresses
              <input aria-label="Email addresses" value={emailText} onChange={(event) => setEmails(event.target.value)} placeholder="you@company.com, teammate@company.com" className={`${input} mt-1`} />
            </label>
            <label className="mt-3 block text-[12px] text-[#8B93A1]">Slack link (optional){data.hasSlack ? " · one is saved" : ""}
              <input aria-label="Slack webhook link" type="password" autoComplete="off" value={slackUrl} onChange={(event) => setSlackUrl(event.target.value)} placeholder={data.hasSlack ? "Paste a new link to replace it" : "https://hooks.slack.com/services/…"} className={`${input} mt-1`} />
            </label>
            {data.hasSlack ? <button type="button" disabled={busy} onClick={() => void run(() => persist(data.enabled, true), "Slack link removed.")} className="mt-1.5 text-[11px] text-[#8B93A1] underline hover:text-[#E6E9EE]">Remove saved Slack link</button> : null}
            {!data.emailConfigured && list.length > 0 ? <p className="mt-3 border border-[#F4D44D]/40 bg-[#17150a] p-2 text-[12px] text-[#F4D44D]">Email sending isn’t switched on for this Uncoil yet, so emails won’t go out until it is. Slack works either way.</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data.enabled ? (
                <>
                  <button type="button" disabled={busy} onClick={() => void run(() => persist(true), "Saved.")} className="h-8 bg-[#F4D44D] px-4 font-bold text-[#090909] disabled:opacity-50">Save changes</button>
                  <button type="button" disabled={busy} onClick={() => void run(() => persist(false), "Weekly summary turned off.")} className="h-8 border border-[#262C35] px-3 text-[#8B93A1] hover:text-[#E6E9EE] disabled:opacity-50">Turn off</button>
                </>
              ) : (
                <button type="button" disabled={busy} onClick={() => void run(() => persist(true), "Weekly summary turned on. The first one arrives next Monday.")} className="h-8 bg-[#F4D44D] px-4 font-bold text-[#090909] disabled:opacity-50">Turn on</button>
              )}
              <button type="button" disabled={busy} onClick={() => void run(async () => { await persist(data.enabled); await sendTest({ projectId: id }); }, "Test sent. It can take a minute to arrive.")} className="h-8 border border-[#262C35] px-3 text-[#E6E9EE] hover:border-[#4A5260] disabled:opacity-50">Send me a test now</button>
            </div>
            {message ? <p role={message.kind === "error" ? "alert" : "status"} className={`mt-3 text-[12px] ${message.kind === "error" ? "text-[#FF8A8A]" : "text-[#5BE3A0]"}`}>{message.text}</p> : null}
            <p className="mt-4 text-[11px] text-[#6B7380]">Sent Mondays at 08:00 UTC. Covers the last 7 days against the 7 before.{data.lastSentWeek ? ` Last sent for the week of ${data.lastSentWeek}.` : ""}</p>
          </section>
          <section className="border border-[#1F242C] bg-[#0E1115] p-4" aria-label="What it looks like">
            <div className="mb-2 text-[10px] tracking-[0.12em] text-[#6B7380]">PREVIEW · THE LAST 7 DAYS RIGHT NOW</div>
            <div className="bg-[#F5F4EE] p-4 text-[#090909]">
              <p className="text-[15px] font-bold">{data.preview.title}</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px]">{data.preview.lines.map((line) => <li key={line}>{line}</li>)}</ul>
              {data.preview.totals.runs === 0 ? <p className="mt-3 text-[12px]">No runs came in this week. If that’s unexpected, check that your app is still sending traces.</p> : null}
            </div>
            {data.truncated ? <p className="mt-2 text-[11px] text-[#6B7380]">Busy project: only the most recent {data.scanLimit.toLocaleString("en-US")} runs are counted.</p> : null}
          </section>
        </div>
      )}
    </div>
  );
}
