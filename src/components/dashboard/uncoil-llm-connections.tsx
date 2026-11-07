"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { KeyRound, Plus, ShieldCheck, Star, Trash2, Zap } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PROVIDER_PRESETS, presetFor } from "@/lib/llm-providers";
import { Button, Notice, PanelHeading, card, cleanError, eyebrow, field, label } from "./settings-kit";

/** The project's own model keys. AI judges and experiments use the default one instead of the shared platform key. */
export function UncoilLlmConnections({ projectId }: { projectId: string }) {
  const id = projectId as Id<"projects">;
  const connections = useQuery(api.llmConnections.list, { projectId: id });
  const setDefault = useMutation(api.llmConnections.setDefault);
  const remove = useMutation(api.llmConnections.remove);
  const [ready, setReady] = useState<boolean | null>(null);
  const [provider, setProvider] = useState("openai");
  const [form, setForm] = useState({ label: "", baseUrl: "", defaultModel: "", apiKey: "" });
  const [busy, setBusy] = useState<string>("");
  const [notice, setNotice] = useState<{ text: string; bad?: boolean }>({ text: "" });

  useEffect(() => {
    let alive = true;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/llm-connections`).then((r) => r.json()).then((body: { ready?: boolean }) => { if (alive) setReady(Boolean(body.ready)); }).catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, [projectId]);

  if (connections === undefined) return <div className={`${card} p-6 ${eyebrow}`}>Loading connections…</div>;
  if (connections === null) return <div className={`${card} p-6 ${eyebrow}`}>You do not have access to this project.</div>;
  const preset = presetFor(provider)!;

  async function add() {
    setBusy("add");
    setNotice({ text: "" });
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/llm-connections`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, provider }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The connection could not be saved.");
      setForm({ label: "", baseUrl: "", defaultModel: "", apiKey: "" });
      setNotice({ text: "Connection saved. The key is encrypted and can not be shown again." });
    } catch (error) {
      setNotice({ text: cleanError(error, "The connection could not be saved."), bad: true });
    } finally {
      setBusy("");
    }
  }

  async function test(connectionId: string) {
    setBusy(connectionId);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/llm-connections/${connectionId}/test`, { method: "POST" });
      const body = await response.json().catch(() => ({})) as { ok?: boolean; message?: string; error?: string };
      setNotice({ text: body.message ?? body.error ?? "The test did not finish.", bad: !body.ok });
    } catch {
      setNotice({ text: "The test did not finish.", bad: true });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="uncoil-settings-panel grid gap-5">
      <section className={`${card} p-6`}>
        <PanelHeading kicker="Project settings / Providers" title="Bring your own model key.">
          Connect OpenAI, Anthropic, Google or any OpenAI-compatible service. AI judges and experiments in this project then run on your key and your bill, not ours. The default connection is the one used.
        </PanelHeading>

        {ready === false ? (
          <div className="mb-5 border border-[#F4D44D]/40 p-4 text-[12px] leading-5 text-[#F4D44D]">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest"><ShieldCheck className="size-3.5" />Key storage is not switched on for this server yet</p>
            <p className="mt-2 text-[#8B93A1]">The owner sets one server value, UNCOIL_CONNECTION_KEY (32 random bytes, base64). Until then keys can not be stored, and AI judges keep using the shared key.</p>
          </div>
        ) : null}

        {connections.length === 0 ? <p className="border border-dashed border-[#262C35] p-5 text-[13px] leading-6 text-[#8B93A1]">No connections yet. Add one below.</p> : (
          <ul className="grid gap-3">
            {connections.map((connection) => (
              <li key={connection._id} className="grid gap-4 border border-[#262C35] bg-[#0B0D10] p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-mono text-[13px] text-[#E6E9EE]">
                    <KeyRound className="size-3.5 text-[#8B93A1]" />{connection.label}
                    {connection.isDefault ? <span className="border border-[#F4D44D] px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[#F4D44D]">Default</span> : null}
                  </p>
                  <p className="mt-2 truncate font-mono text-[10px] text-[#8B93A1]">{presetFor(connection.provider)?.label ?? connection.provider} · {connection.baseUrl} · key ending {connection.keyLast4}{connection.defaultModel ? ` · ${connection.defaultModel}` : ""}</p>
                  <p className={`mt-1 font-mono text-[10px] ${connection.lastTestOk === undefined ? "text-[#566070]" : connection.lastTestOk ? "text-[#F4D44D]" : "text-[#ff9d9d]"}`}>
                    {connection.lastTestOk === undefined ? "Not tested yet" : `${connection.lastTestMessage ?? (connection.lastTestOk ? "Works" : "Failed")} · ${new Date(connection.lastTestedAt ?? 0).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy === connection._id || ready === false} onClick={() => void test(connection._id)}><Zap className="size-3.5" />{busy === connection._id ? "Testing…" : "Test"}</Button>
                  {!connection.isDefault ? <Button onClick={() => void setDefault({ projectId: id, connectionId: connection._id }).catch((error) => setNotice({ text: cleanError(error, "Could not change the default."), bad: true }))}><Star className="size-3.5" />Make default</Button> : null}
                  <Button tone="danger" aria-label={`Remove ${connection.label}`} onClick={() => { if (window.confirm(`Remove "${connection.label}"? Judges fall back to the next connection or the shared key.`)) void remove({ projectId: id, connectionId: connection._id }).catch((error) => setNotice({ text: cleanError(error, "Could not remove it."), bad: true })); }}><Trash2 className="size-3.5" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4"><Notice text={notice.text} bad={notice.bad} /></div>
      </section>

      <section className={`${card} p-6`}>
        <p className={eyebrow}>Add a connection</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROVIDER_PRESETS.map((item) => (
            <button key={item.id} type="button" onClick={() => setProvider(item.id)} className={`border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${provider === item.id ? "border-[#F4D44D] !bg-[#F4D44D] !text-[#0B0D10]" : "border-[#262C35] !bg-transparent !text-[#E6E9EE] hover:border-[#F4D44D]"}`}>{item.label}</button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={label}>Name<input className={field} value={form.label} placeholder={preset.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></label>
          <label className={label}>Model for judges<input className={field} value={form.defaultModel} placeholder={preset.defaultModel || "model-name"} onChange={(event) => setForm({ ...form, defaultModel: event.target.value })} /></label>
          {preset.id === "custom" ? <label className={`${label} md:col-span-2`}>Base address<input className={field} value={form.baseUrl} placeholder="https://api.example.com/v1" onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} /></label> : null}
          <label className={`${label} md:col-span-2`}>API key<input className={field} type="password" autoComplete="off" value={form.apiKey} placeholder={preset.keyHint} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} /></label>
        </div>
        <p className="mt-4 max-w-2xl text-[12px] leading-5 text-[#8B93A1]">The key is locked on our server before it is stored. It is never shown again, only its last four characters. Only project administrators can add or remove connections.</p>
        <div className="mt-4"><Button tone="primary" disabled={!form.apiKey.trim() || ready === false || busy === "add"} onClick={() => void add()}><Plus className="size-3.5" />{busy === "add" ? "Saving…" : "Save connection"}</Button></div>
      </section>
    </div>
  );
}
