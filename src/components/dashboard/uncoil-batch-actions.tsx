"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ListChecks, Star, StopCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BATCH_RUN_LIMIT, type BatchAction } from "../../../convex/batchRules";
import { Button, Notice, PanelHeading, card, cleanError, eyebrow, field, label, usd } from "./settings-kit";

const ACTIONS: Array<{ id: BatchAction; title: string; text: string; icon: typeof StopCircle }> = [
  { id: "cancel_stuck", title: "Close stuck runs", text: "Mark runs that stopped sending steps as cancelled, so they stop counting as running.", icon: StopCircle },
  { id: "queue_review", title: "Send to review", text: "Put matching runs in the review queue for a person to look at. Runs already there are skipped.", icon: ListChecks },
  { id: "add_score", title: "Add a score", text: "Give every matching run one of your defined scores, for example a triage label.", icon: Star },
];

/** Do one thing to many runs at once: pick the runs, see the exact count, then confirm. Every action is recorded in the audit log. */
export function UncoilBatchActions({ projectId }: { projectId: string }) {
  const id = projectId as Id<"projects">;
  const [action, setAction] = useState<BatchAction>("cancel_stuck");
  const [status, setStatus] = useState<string>("running");
  const [environment, setEnvironment] = useState("");
  const [model, setModel] = useState("");
  const [hours, setHours] = useState("24");
  const [scoreName, setScoreName] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean }>({ text: "" });
  const run = useMutation(api.batchActions.run);
  const scoreTypes = useQuery(api.scoreConfigs.list, { projectId: id });

  const effectiveStatus = action === "cancel_stuck" ? "running" : status;
  const filter = {
    status: effectiveStatus ? (effectiveStatus as "running" | "completed" | "failed" | "cancelled") : undefined,
    environment: environment.trim() || undefined,
    modelContains: model.trim() || undefined,
    olderThanHours: hours.trim() === "" ? undefined : Number(hours),
  };
  const preview = useQuery(api.batchActions.preview, { projectId: id, action, filter });
  const config = scoreTypes?.configs.find((item) => item.name === scoreName);
  const parsedValue = !config ? undefined : config.dataType === "numeric" ? (scoreValue.trim() === "" ? undefined : Number(scoreValue)) : config.dataType === "boolean" ? (scoreValue === "" ? undefined : scoreValue === "true") : scoreValue || undefined;
  const scoreReady = action !== "add_score" || (config && parsedValue !== undefined && !(typeof parsedValue === "number" && Number.isNaN(parsedValue)));
  const matched = preview?.matched ?? 0;
  const canRun = Boolean(preview && !preview.problem && matched > 0 && scoreReady);
  const meta = ACTIONS.find((item) => item.id === action)!;

  async function confirm() {
    if (!canRun || busy) return;
    setBusy(true);
    try {
      const result = await run({ projectId: id, action, filter, score: action === "add_score" && config && parsedValue !== undefined ? { name: config.name, value: parsedValue } : undefined });
      setNotice({ text: `${meta.title}: ${result.affected} run${result.affected === 1 ? "" : "s"} changed${result.skipped ? `, ${result.skipped} skipped` : ""}.${result.remaining ? ` ${result.remaining} more match. Run it again to continue.` : ""}` });
    } catch (error) {
      setNotice({ text: cleanError(error, "The action could not run."), bad: true });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="uncoil-settings-panel grid gap-5">
      <section className={`${card} p-6`}>
        <PanelHeading kicker="Project settings / Bulk" title="Fix many runs in one go.">
          Choose what to do, narrow down which runs, and check the exact count before anything changes. Each run handles up to {BATCH_RUN_LIMIT} runs at a time.
        </PanelHeading>
        <div className="grid gap-3 md:grid-cols-3">
          {ACTIONS.map((item) => (
            <button key={item.id} type="button" aria-pressed={action === item.id} onClick={() => { setAction(item.id); setConfirming(false); setNotice({ text: "" }); if (item.id === "cancel_stuck") setHours((h) => (Number(h) >= 1 ? h : "24")); }} className={`border p-4 text-left transition-colors ${action === item.id ? "border-[#F4D44D] !bg-[#F4D44D]/10" : "border-[#262C35] !bg-transparent hover:border-[#F4D44D]/60"}`}>
              <item.icon className={`size-4 ${action === item.id ? "text-[#F4D44D]" : "text-[#8B93A1]"}`} />
              <p className="mt-3 text-[13px] font-semibold text-[#E6E9EE]">{item.title}</p>
              <p className="mt-1 text-[12px] leading-5 text-[#8B93A1]">{item.text}</p>
            </button>
          ))}
        </div>
      </section>

      <section className={`${card} p-6`}>
        <p className={eyebrow}>Which runs</p>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className={label}>Status
            <select className={field} value={effectiveStatus} disabled={action === "cancel_stuck"} onChange={(event) => { setStatus(event.target.value); setConfirming(false); }}>
              <option value="">Any</option><option value="running">Running</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className={label}>No activity for (hours)<input className={field} inputMode="decimal" value={hours} placeholder="any age" onChange={(event) => { setHours(event.target.value); setConfirming(false); }} /></label>
          <label className={label}>Environment<input className={field} value={environment} placeholder="production" onChange={(event) => { setEnvironment(event.target.value); setConfirming(false); }} /></label>
          <label className={label}>Model contains<input className={field} value={model} placeholder="gpt-4o" onChange={(event) => { setModel(event.target.value); setConfirming(false); }} /></label>
        </div>

        {action === "add_score" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className={label}>Score
              <select className={field} value={scoreName} onChange={(event) => { setScoreName(event.target.value); setScoreValue(""); }}>
                <option value="">Choose a score…</option>
                {scoreTypes?.configs.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            {config?.dataType === "boolean" ? <label className={label}>Value<select className={field} value={scoreValue} onChange={(event) => setScoreValue(event.target.value)}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select></label>
              : config?.dataType === "categorical" ? <label className={label}>Value<select className={field} value={scoreValue} onChange={(event) => setScoreValue(event.target.value)}><option value="">Choose…</option>{config.categories?.map((item) => <option key={item}>{item}</option>)}</select></label>
              : <label className={label}>Value<input className={field} inputMode="decimal" disabled={!config} value={scoreValue} placeholder={config ? `${config.min ?? ""} to ${config.max ?? ""}` : "Pick a score first"} onChange={(event) => setScoreValue(event.target.value)} /></label>}
            {scoreTypes && scoreTypes.configs.length === 0 ? <p className="text-[12px] text-[#8B93A1] md:col-span-2">No scores are defined yet. Add one in the Scores tab first.</p> : null}
          </div>
        ) : null}

        <div className="mt-6 border border-[#262C35] bg-[#0B0D10] p-5">
          <p className={eyebrow}>This would change</p>
          <p className="mt-2 font-pixel text-5xl tracking-[-0.05em] text-[#E6E9EE]">{preview === undefined ? "…" : preview === null ? "—" : preview.matched.toLocaleString("en-US")}<span className="ml-3 font-mono text-[11px] tracking-normal text-[#8B93A1]">run{matched === 1 ? "" : "s"}</span></p>
          {preview?.problem ? <p className="mt-2 font-mono text-[11px] text-[#ff9d9d]">{preview.problem}</p> : null}
          {preview?.capped ? <p className="mt-2 font-mono text-[10px] text-[#8B93A1]">Only the newest {preview.scanned.toLocaleString("en-US")} runs were checked.</p> : null}
          {preview && preview.sample.length ? (
            <ul className="mt-4 divide-y divide-[#1F242C]">
              {preview.sample.map((item) => (
                <li key={item.runId} className="flex flex-wrap justify-between gap-2 py-2 font-mono text-[10px] text-[#8B93A1]">
                  <span className="truncate text-[#E6E9EE]">{item.runId}</span><span>{item.status} · {item.model ?? "no model"} · {usd(item.costUsd)} · {new Date(item.startedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {confirming
            ? <><Button tone="primary" disabled={!canRun || busy} onClick={() => void confirm()}>{busy ? "Working…" : `Yes, ${meta.title.toLowerCase()}: ${Math.min(matched, BATCH_RUN_LIMIT)} run${Math.min(matched, BATCH_RUN_LIMIT) === 1 ? "" : "s"}`}</Button><Button disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button></>
            : <Button tone="primary" disabled={!canRun} onClick={() => setConfirming(true)}>Review and run</Button>}
          <span className="font-mono text-[10px] text-[#8B93A1]">Recorded in the audit log.</span>
        </div>
        <div className="mt-3"><Notice text={notice.text} bad={notice.bad} /></div>
      </section>
    </div>
  );
}
