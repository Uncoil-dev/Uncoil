"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { checkConfig, type ScoreDataType } from "../../../convex/scoreConfigRules";
import { Button, Notice, PanelHeading, card, cleanError, eyebrow, field, label } from "./settings-kit";

type Form = { editingId: Id<"scoreConfigs"> | null; name: string; dataType: ScoreDataType; description: string; min: string; max: string; passThreshold: string; categories: string; passCategories: string };
const blank: Form = { editingId: null, name: "", dataType: "numeric", description: "", min: "0", max: "1", passThreshold: "", categories: "", passCategories: "" };
const num = (value: string) => (value.trim() === "" ? undefined : Number(value));
const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

/** Named score types: what values are allowed and what counts as a pass. Scores sent with these names are checked against them. */
export function UncoilScoreConfigs({ projectId }: { projectId: string }) {
  const id = projectId as Id<"projects">;
  const data = useQuery(api.scoreConfigs.list, { projectId: id });
  const create = useMutation(api.scoreConfigs.create);
  const update = useMutation(api.scoreConfigs.update);
  const remove = useMutation(api.scoreConfigs.remove);
  const [form, setForm] = useState<Form>(blank);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean }>({ text: "" });
  const [busy, setBusy] = useState(false);

  if (data === undefined) return <div className={`${card} p-6 ${eyebrow}`}>Loading score types…</div>;
  if (data === null) return <div className={`${card} p-6 ${eyebrow}`}>You do not have access to this project.</div>;

  const shape = { name: form.name, dataType: form.dataType, description: form.description, min: num(form.min), max: num(form.max), passThreshold: num(form.passThreshold), categories: list(form.categories), passCategories: list(form.passCategories) };
  const problem = form.name.trim() ? checkConfig(shape) : "Give the score a name.";

  async function submit() {
    if (problem || busy) return;
    setBusy(true);
    try {
      if (form.editingId) await update({ projectId: id, configId: form.editingId, description: shape.description, min: shape.min, max: shape.max, passThreshold: shape.passThreshold, categories: form.dataType === "categorical" ? shape.categories : undefined, passCategories: form.dataType === "categorical" ? shape.passCategories : undefined });
      else await create({ projectId: id, name: shape.name, dataType: shape.dataType, description: shape.description, min: shape.min, max: shape.max, passThreshold: shape.passThreshold, categories: form.dataType === "categorical" ? shape.categories : undefined, passCategories: form.dataType === "categorical" ? shape.passCategories : undefined });
      setNotice({ text: form.editingId ? `Changed "${form.name}".` : `Defined "${form.name}". New scores with this name are now checked.` });
      setForm(blank);
    } catch (error) {
      setNotice({ text: cleanError(error, "The score could not be saved."), bad: true });
    } finally {
      setBusy(false);
    }
  }

  const set = (patch: Partial<Form>) => { setForm({ ...form, ...patch }); setNotice({ text: "" }); };

  return (
    <div className="uncoil-settings-panel grid gap-5">
      <section className={`${card} p-6`}>
        <PanelHeading kicker="Project settings / Quality" title="Say what a good score is.">
          Define each score once: its type, its allowed values and what counts as a pass. Every score saved with that name is then checked, and this page shows how the latest ones are doing.
        </PanelHeading>

        {data.configs.length === 0 ? <p className="border border-dashed border-[#262C35] p-5 text-[13px] leading-6 text-[#8B93A1]">No score types yet. Add one below, for example &quot;groundedness&quot; from 0 to 1 that passes at 0.8.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.configs.map((config) => {
              const { stats } = config;
              const rate = stats.judged ? stats.passCount / stats.judged : null;
              return (
                <li key={config._id} className="border border-[#262C35] bg-[#0B0D10] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] text-[#E6E9EE]">{config.name}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[#8B93A1]">
                        {config.dataType}{config.dataType === "numeric" && (config.min !== undefined || config.max !== undefined) ? ` · ${config.min ?? "…"} to ${config.max ?? "…"}` : ""}{config.dataType === "categorical" ? ` · ${config.categories?.join(" / ")}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button aria-label={`Edit ${config.name}`} className="!px-2" onClick={() => setForm({ editingId: config._id, name: config.name, dataType: config.dataType, description: config.description ?? "", min: String(config.min ?? ""), max: String(config.max ?? ""), passThreshold: String(config.passThreshold ?? ""), categories: (config.categories ?? []).join(", "), passCategories: (config.passCategories ?? []).join(", ") })}><Pencil className="size-3.5" /></Button>
                      <Button tone="danger" aria-label={`Remove ${config.name}`} className="!px-2" onClick={() => { if (window.confirm(`Remove the definition of "${config.name}"? Scores already saved stay.`)) void remove({ projectId: id, configId: config._id }).catch((error) => setNotice({ text: cleanError(error, "Could not remove it."), bad: true })); }}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                  {config.description ? <p className="mt-3 text-[12px] leading-5 text-[#8B93A1]">{config.description}</p> : null}
                  <div className="mt-4 h-1.5 bg-[#1F242C]" aria-hidden><div className="h-full bg-[#F4D44D]" style={{ width: `${Math.round((rate ?? 0) * 100)}%` }} /></div>
                  <p className="mt-2 font-mono text-[10px] text-[#8B93A1]">
                    {stats.count === 0 ? "No scores yet" : `${stats.count} score${stats.count === 1 ? "" : "s"}${rate === null ? " · no pass rule set" : ` · ${Math.round(rate * 100)}% pass`}${stats.average !== null ? ` · average ${stats.average.toFixed(2)}` : ""}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {data.undefinedNames.length ? (
          <div className="mt-5 border border-[#262C35] p-4">
            <p className={eyebrow}>Used in your traces but not defined</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.undefinedNames.map((item) => (
                <Button key={item.name} onClick={() => set({ ...blank, name: item.name, dataType: item.dataType === "boolean" ? "boolean" : item.dataType === "numeric" ? "numeric" : "categorical" })}><Plus className="size-3.5" />{item.name} · {item.count}</Button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${card} p-6`}>
        <p className={eyebrow}>{form.editingId ? `Edit ${form.name}` : "New score type"}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={label}>Name<input className={field} value={form.name} disabled={Boolean(form.editingId)} placeholder="groundedness" onChange={(event) => set({ name: event.target.value })} /></label>
          <label className={label}>Type
            <select className={field} value={form.dataType} disabled={Boolean(form.editingId)} onChange={(event) => set({ dataType: event.target.value as ScoreDataType })}>
              <option value="numeric">Number</option><option value="boolean">Yes / no</option><option value="categorical">Category</option>
            </select>
          </label>
          {form.dataType === "numeric" ? <>
            <label className={label}>Lowest value<input className={field} inputMode="decimal" value={form.min} onChange={(event) => set({ min: event.target.value })} /></label>
            <label className={label}>Highest value<input className={field} inputMode="decimal" value={form.max} onChange={(event) => set({ max: event.target.value })} /></label>
            <label className={label}>Passes at or above<input className={field} inputMode="decimal" value={form.passThreshold} placeholder="0.8" onChange={(event) => set({ passThreshold: event.target.value })} /></label>
          </> : null}
          {form.dataType === "categorical" ? <>
            <label className={label}>Categories, separated by commas<input className={field} value={form.categories} placeholder="good, ok, bad" onChange={(event) => set({ categories: event.target.value })} /></label>
            <label className={label}>Categories that pass<input className={field} value={form.passCategories} placeholder="good, ok" onChange={(event) => set({ passCategories: event.target.value })} /></label>
          </> : null}
          {form.dataType === "boolean" ? <p className="self-end text-[12px] leading-5 text-[#8B93A1]">A yes passes. A no fails.</p> : null}
          <label className={`${label} md:col-span-2`}>What it measures (optional)<input className={field} value={form.description} placeholder="Is the answer backed by the retrieved documents?" onChange={(event) => set({ description: event.target.value })} /></label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button tone="primary" disabled={Boolean(problem) || busy} onClick={() => void submit()}>{busy ? "Saving…" : form.editingId ? "Save changes" : "Add score type"}</Button>
          {form.editingId || form.name ? <Button onClick={() => { setForm(blank); setNotice({ text: "" }); }}>Clear</Button> : null}
          {problem && form.name ? <span className="font-mono text-[11px] text-[#ff9d9d]">{problem}</span> : null}
        </div>
        <div className="mt-3"><Notice text={notice.text} bad={notice.bad} /></div>
      </section>
    </div>
  );
}
