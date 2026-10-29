"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Trash2 } from "lucide-react";

const panel = "mt-5 border border-[#262C35] bg-[#0E1115] p-5";
const label = "grid gap-1.5 text-[11px] text-[#8B93A1]";
const field =
  "w-full border border-[#262C35] bg-[#0B0D10] px-3 py-2 font-mono text-[12px] text-[#E6E9EE] outline-none focus:border-[#F4D44D]";

export function ProjectDataControls({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmed = name === projectName && word === "DELETE";
  const base = `/api/projects/${encodeURIComponent(projectId)}`;

  async function deleteProject() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${base}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationName: name, confirmationWord: word }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "The project could not be deleted.");
      }
      try {
        if (window.localStorage.getItem("uncoil.lastProjectId") === projectId) window.localStorage.removeItem("uncoil.lastProjectId");
      } catch {}
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The project could not be deleted.");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={panel}>
        <h3 className="text-[13px] font-semibold text-[#E6E9EE]">Download your data</h3>
        <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#8B93A1]">
          Get one file with everything stored for this project: every trace and step, scores, alerts, comments, prompts, datasets and settings.
          Your API key, billing details and webhook addresses are left out. Big projects can take a minute to prepare.
        </p>
        <a
          href={`${base}/export`}
          download
          className="mt-4 inline-flex items-center gap-2 border border-[#F4D44D] bg-[#F4D44D] px-3 py-2 text-[12px] font-semibold !text-[#0B0D10] no-underline hover:bg-[#fff4b5]"
        >
          <Download className="size-3.5" />
          Download all data (JSON)
        </a>
      </div>

      <div className="mt-5 border border-[#FF6B6B]/40 bg-[#FF6B6B]/5 p-5">
        <h3 className="text-[13px] font-semibold text-[#FF8A8A]">Delete this project</h3>
        <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#8B93A1]">
          This permanently removes the project, all of its traces, alerts, comments, prompts, datasets and scores, and stops its API key from working.
          It cannot be undone. Download your data first if you might need it.
        </p>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="!mt-4 inline-flex items-center gap-2 !border-[#FF6B6B]/60 !bg-transparent px-3 py-2 text-[12px] !text-[#FF8A8A] hover:!bg-[#FF6B6B]/10"
          >
            <Trash2 className="size-3.5" />
            Delete this project…
          </button>
        ) : (
          <div className="mt-4 max-w-md">
            <label className={label}>
              <span>
                Type the project name <span className="font-mono text-[#E6E9EE]">{projectName}</span>
              </span>
              <input value={name} onChange={(event) => setName(event.target.value)} className={field} autoComplete="off" spellCheck={false} />
            </label>
            <label className={label}>
              <span>
                Then type <span className="font-mono text-[#E6E9EE]">DELETE</span>
              </span>
              <input value={word} onChange={(event) => setWord(event.target.value)} className={field} autoComplete="off" spellCheck={false} />
            </label>
            {error ? <p role="alert" className="mt-3 text-[12px] text-[#FF8A8A]">{error}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!confirmed || busy}
                onClick={() => void deleteProject()}
                className="!mt-4 inline-flex items-center gap-2 !border-[#FF6B6B] !bg-[#FF6B6B] px-3 py-2 text-[12px] font-semibold !text-[#0B0D10] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
                {busy ? "Deleting…" : "Delete forever"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => { setOpen(false); setName(""); setWord(""); setError(""); }}
                className="!mt-4 !border-[#262C35] !bg-transparent px-3 py-2 text-[12px] !text-[#E6E9EE] hover:!bg-[#161A20]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
