"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { card, eyebrow } from "./settings-kit";

const DOCS_MCP = "https://www.uncoil.dev/api/docs/mcp";

function ago(timestamp: number | null | undefined) {
  if (!timestamp) return null;
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} days ago`;
}

function Snippet({ title, note, code }: { title: string; note?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* the code stays visible to select by hand */ }
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#E6E9EE]">{title}</p>
        <button type="button" onClick={() => void copy()} aria-label={`Copy ${title}`} className="inline-flex items-center gap-1.5 border border-[#262C35] !bg-transparent px-2 py-1 font-mono text-[9px] uppercase tracking-widest !text-[#E6E9EE] hover:border-[#F4D44D]">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
      {note ? <p className="mt-1 text-[12px] leading-5 text-[#8B93A1]">{note}</p> : null}
      <pre className="mt-2 overflow-x-auto border border-[#262C35] bg-[#0B0D10] p-3 font-mono text-[11px] leading-5 text-[#E6E9EE]"><code>{code}</code></pre>
    </div>
  );
}

/** Three ways to reach this project from outside the dashboard, each with something you can paste, and a live check that it worked. */
export function UncoilMcpCli({ projectId }: { projectId: string }) {
  const project = useQuery(api.projects.getProjectById, { projectId: projectId as Id<"projects"> });
  const [origin, setOrigin] = useState("https://eu.cloud.uncoil.dev");
  const [client, setClient] = useState<"claude" | "json">("claude");
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setOrigin(window.location.origin); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const used = project?.apiKeyLastUsedAt ?? null;
  const steps = [
    { n: "1", title: "Sign in from your terminal", body: (
      <div className="uncoil-settings-panel grid gap-5">
        <Snippet title="Log in and save the key" note="Opens your browser, you pick this project, and the key is saved to .env.local in the current folder. Nothing to copy by hand." code={`npx @uncoil.dev/sdk login`} />
        <Snippet title="Check that everything works" note="Checks the key, the region and the network, then sends one test trace that shows up in Tracing." code={`npx @uncoil.dev/sdk doctor`} />
      </div>
    ) },
    { n: "2", title: "Let your coding agent read the docs", body: (
      <div className="grid gap-4">
        <div className="flex gap-2">
          {([["claude", "Claude Code"], ["json", "Cursor / VS Code / others"]] as const).map(([key, text]) => (
            <button key={key} type="button" onClick={() => setClient(key)} className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${client === key ? "border-[#F4D44D] !bg-[#F4D44D] !text-[#0B0D10]" : "border-[#262C35] !bg-transparent !text-[#E6E9EE] hover:border-[#F4D44D]"}`}>{text}</button>
          ))}
        </div>
        {client === "claude"
          ? <Snippet title="Add the Uncoil docs server" code={`claude mcp add --transport http uncoil-docs ${DOCS_MCP}`} />
          : <Snippet title="MCP settings file" code={JSON.stringify({ mcpServers: { "uncoil-docs": { url: DOCS_MCP } } }, null, 2)} />}
        <p className="text-[12px] leading-5 text-[#8B93A1]">The server gives your agent three tools: <code className="text-[#E6E9EE]">list_docs</code>, <code className="text-[#E6E9EE]">search_docs</code> and <code className="text-[#E6E9EE]">read_doc</code>. It reads the public Uncoil docs only. It never sees your traces or your key.</p>
      </div>
    ) },
    { n: "3", title: "Send a step with plain HTTP", body: (
      <Snippet title="One step with curl" note="Use any language. Replace the key with a project key from the API Keys tab." code={`curl -X POST ${origin}/api/ingest \\
  -H "Authorization: Bearer $UNCOIL_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"spanId":"step-1","runId":"run-1","spanType":"llm_call","modelId":"gpt-4o-mini","createdAt":"${new Date().toISOString().slice(0, 19)}Z","latencyMs":420,"inputTokens":812,"outputTokens":96}'`} />
    ) },
  ];

  return (
    <div className="grid gap-5">
      <section className={`${card} p-6`}>
        <p className={eyebrow}>Project settings / Developer access</p>
        <h3 className="mt-2 font-pixel text-3xl tracking-[-0.05em] text-[#E6E9EE]">Connect from your tools.</h3>
        <div className="mt-5 grid gap-px bg-[#262C35] sm:grid-cols-3">
          {[
            ["Project", projectId],
            ["Key", project ? (project.apiKeyPrefix ? `${project.apiKeyPrefix}…${project.apiKeyLast4}` : "No key yet") : "…"],
            ["Last call", project ? (used ? ago(used) : "Nothing received yet") : "…"],
          ].map(([name, value]) => (
            <div key={name} className="bg-[#0B0D10] p-4">
              <p className={eyebrow}>{name}</p>
              <p className={`mt-2 truncate font-mono text-[12px] ${name === "Last call" && used ? "text-[#F4D44D]" : "text-[#E6E9EE]"}`}>{value}</p>
            </div>
          ))}
        </div>
        {project && project.apiKeyStatus && project.apiKeyStatus !== "active" ? <p className="mt-3 font-mono text-[11px] text-[#ff9d9d]">This project&apos;s key is {project.apiKeyStatus}. Make a new one in the API Keys tab.</p> : null}
      </section>

      {steps.map((step) => (
        <section key={step.n} className={`${card} grid gap-5 p-6 md:grid-cols-[48px_1fr]`}>
          <span className="font-pixel text-4xl leading-none text-[#F4D44D]">{step.n}</span>
          <div>
            <h4 className="mb-4 text-[15px] font-semibold text-[#E6E9EE]">{step.title}</h4>
            {step.body}
          </div>
        </section>
      ))}
    </div>
  );
}
