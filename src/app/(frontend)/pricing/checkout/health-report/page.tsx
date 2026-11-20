"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CheckoutShell } from "@/components/checkout/checkout-shell";

/** After paying for the health report: upload the runs, get the report link. No login. */
function Upload() {
  const sessionId = useSearchParams().get("session_id") ?? "";
  const valid = sessionId.startsWith("cs_");
  const [data, setData] = useState("");
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setData(await file.text());
  }

  async function submit() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/health-report/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, data }) });
      const result = await response.json().catch(() => ({})) as { token?: string; error?: string };
      if (!response.ok || !result.token) throw new Error(result.error ?? "Could not build the report.");
      window.location.assign(`/health-report/r/${result.token}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not build the report.");
      setPending(false);
    }
  }

  const aside = (
    <>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Payment received</p>
        <h1 className="mt-5 font-pixel text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.85] tracking-[-0.08em]">Thank you.</h1>
        <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">One step left. Send your runs and your report opens in seconds.</p>
      </div>
      <ol className="mt-12 grid gap-3 border-t border-white/20 pt-6 font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-white/70">
        <li>1. Add your file below.</li>
        <li>2. We add up cost, errors and speed.</li>
        <li>3. Your private report link opens.</li>
      </ol>
    </>
  );

  return (
    <CheckoutShell aside={aside} backHref="/health-report" backLabel="← Health report">
      <ol className="grid grid-cols-2 gap-[2px] font-mono text-[10px] uppercase tracking-[0.12em]" aria-label="Steps">
        {["Pay", "Send your runs"].map((label, i) => (
          <li key={label} aria-current={i === 1 ? "step" : undefined} className="border-t-4 border-black pt-3"><span className={i === 1 ? "bg-[#f4d44d] px-1.5 py-0.5" : ""}>{i + 1}. {label}</span></li>
        ))}
      </ol>
      <h2 className="mt-10 font-pixel text-5xl leading-[0.92] tracking-[-0.07em] md:text-6xl">{valid ? "Add your runs." : "No payment found."}</h2>
      {!valid ? (
        <p className="mt-6 text-sm leading-6 text-black/70">This link is missing its payment. Open the link from your Stripe receipt, or <Link href="/health-report" className="underline underline-offset-4">go back</Link>.</p>
      ) : (
        <form className="mt-8 border-t border-black/20 pt-6" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <p className="text-sm leading-6 text-black/70">One row per step: JSON, JSON lines or CSV. At least a run id and a time per step. <Link href="/health-report#what-to-upload" className="underline underline-offset-4">See the format</Link>. You can leave out prompts and answers.</p>
          <label htmlFor="hr-file" className="mt-6 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">File</label>
          <input id="hr-file" type="file" accept=".json,.jsonl,.ndjson,.csv,.txt,application/json,text/csv" onChange={(event) => void onFile(event.target.files?.[0])} className="mt-2 block w-full border-2 border-black bg-white p-3 font-mono text-xs file:mr-4 file:border-0 file:bg-[#f4d44d] file:px-3 file:py-2 file:font-mono file:text-[10px] file:uppercase" />
          <label htmlFor="hr-paste" className="mt-6 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Or paste it {fileName ? `(loaded ${fileName})` : ""}</label>
          <textarea id="hr-paste" value={data} onChange={(event) => { setData(event.target.value); setFileName(""); }} rows={7} spellCheck={false} placeholder='[{"runId":"run_1","createdAt":"2026-11-10T09:14:02Z","latencyMs":1830,"modelId":"gpt-4.1","costUsd":0.0055}]' className="mt-2 w-full border-2 border-black bg-white p-3 font-mono text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]" />
          {error ? <p role="alert" className="mt-4 border-2 border-black bg-[#fff4b5] p-3 text-sm">{error}</p> : null}
          <button type="submit" disabled={pending || data.trim().length < 20} className="group mt-6 flex min-h-16 w-full items-center justify-between bg-[#f4d44d] px-5 font-mono text-xs uppercase tracking-[0.14em] text-black outline outline-2 outline-black hover:bg-black hover:text-[#f4d44d] disabled:opacity-50">
            <span>{pending ? "Building your report…" : "Build my report"}</span><ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </form>
      )}
    </CheckoutShell>
  );
}

export default function HealthReportUploadPage() {
  return <Suspense fallback={null}><Upload /></Suspense>;
}
