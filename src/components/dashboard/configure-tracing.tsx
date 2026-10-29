"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, Copy } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getDeploymentRegion, getUncoilRegion } from "@/lib/regions";

const SNIPPETS = {
  typescript: { label: "TypeScript", install: "npm install uncoil-sdk", env: "UNCOIL_API_KEY=your_key_here", code: `import { init } from "uncoil-sdk";\n\ninit(); // call once at startup\n// every OpenAI and Anthropic call is now traced` },
  python: { label: "Python", install: "pip install uncoil-sdk", env: "UNCOIL_API_KEY=your_key_here", code: `import uncoil\n\nuncoil.init()  # call once at startup\n# every OpenAI, Anthropic and LangChain call is now traced` },
} as const;

function Copyable({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-[#262C35] bg-[#0B0D10]">
      <div className="flex items-center justify-between border-b border-[#1F242C] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8B93A1]">
        <span>{label}</span>
        <button type="button" onClick={() => void navigator.clipboard.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })} className="inline-flex items-center gap-1.5 hover:text-[#F4D44D]">
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-6 text-[#E6E9EE]">{value}</pre>
    </div>
  );
}

/** Setup page: key, install lines, and a live "waiting for first trace" status that flips by itself. */
export function ConfigureTracing({ projectId }: { projectId: string }) {
  const state = useQuery(api.agentRuns.getProjectOnboardingState, { projectId: projectId as Id<"projects"> });
  const [language, setLanguage] = useState<keyof typeof SNIPPETS>("typescript");
  const region = getUncoilRegion(getDeploymentRegion());
  const snippet = SNIPPETS[language];
  const keyShown = state?.apiKeyPrefix && state.apiKeyLast4 ? `${state.apiKeyPrefix}...${state.apiKeyLast4}` : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6 text-[#E6E9EE]">
      <section className={`flex items-center gap-4 border px-5 py-4 ${state?.hasReceivedFirstSpan ? "border-[#5BE3A0]/40 bg-[#5BE3A0]/[0.06]" : "border-[#F4D44D]/40 bg-[#F4D44D]/[0.06]"}`} role="status" aria-live="polite">
        <span className="relative flex size-3 shrink-0" aria-hidden="true">
          {!state?.hasReceivedFirstSpan ? <span className="absolute inset-0 animate-ping bg-[#F4D44D] opacity-60 motion-reduce:animate-none" style={{ animationDuration: "2.4s" }} /> : null}
          <span className={`relative size-3 ${state?.hasReceivedFirstSpan ? "bg-[#5BE3A0]" : "bg-[#F4D44D]"}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8B93A1]">{state === undefined ? "Checking" : state?.hasReceivedFirstSpan ? "Connected" : "Waiting for your first trace"}</p>
          <p className="mt-1 text-sm">
            {state === undefined ? "Looking for traces from this project…" : state?.hasReceivedFirstSpan
              ? `Your first trace arrived${state.firstSpanAt ? ` on ${new Date(state.firstSpanAt).toLocaleString()}` : ""}.`
              : "Add the lines below, run your agent once, and this turns green on its own."}
          </p>
        </div>
        {state?.hasReceivedFirstSpan ? <Link href={`/dashboard/${projectId}/tracing`} className="shrink-0 border border-[#F4D44D] bg-[#F4D44D] px-3 py-2 font-mono text-[10px] uppercase tracking-widest !text-[#0B0D10] no-underline hover:bg-[#fff4b5]">See traces →</Link> : null}
      </section>

      <section className="grid gap-3 border border-[#262C35] bg-[#0E1115] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]">1 · Your API key</p>
        <p className="text-sm leading-6 text-[#8B93A1]">
          {keyShown ? <>This project&apos;s key ends <span className="font-mono text-[#E6E9EE]">{keyShown}</span>. </> : null}
          A key is only shown once, when it is created. If you lost it, make a new one and put it in <span className="font-mono text-[#E6E9EE]">UNCOIL_API_KEY</span>.
        </p>
        <Link href={`/dashboard/${projectId}/api-keys`} className="w-fit border border-[#262C35] px-3 py-2 font-mono text-[10px] uppercase tracking-widest !text-[#E6E9EE] no-underline hover:border-[#F4D44D]">Manage API keys →</Link>
      </section>

      <section className="grid gap-4 border border-[#262C35] bg-[#0E1115] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-auto font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]">2 · Add it to your agent</p>
          <div role="group" aria-label="Language" className="flex border border-[#262C35]">
            {(Object.keys(SNIPPETS) as Array<keyof typeof SNIPPETS>).map((key) => (
              <button key={key} type="button" aria-pressed={language === key} onClick={() => setLanguage(key)} className={`h-8 px-3 font-mono text-[10px] uppercase tracking-widest ${language === key ? "bg-[#F4D44D] text-[#0B0D10]" : "text-[#8B93A1] hover:text-[#E6E9EE]"}`}>{SNIPPETS[key].label}</button>
            ))}
          </div>
        </div>
        <Copyable label="Install" value={snippet.install} />
        <Copyable label="Environment variable" value={snippet.env} />
        <Copyable label="Your code" value={snippet.code} />
        <p className="font-mono text-[11px] text-[#8B93A1]">Sends to {region.shortName} · {region.origin}/api/ingest</p>
      </section>

      <section className="grid gap-2 border border-[#262C35] bg-[#0E1115] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8B93A1]">3 · Run your agent once</p>
        <p className="text-sm leading-6 text-[#8B93A1]">Start it the way you normally do. Nothing showing after a minute? Check the key is set in the same place your agent runs, then see the <Link href={`/dashboard/${projectId}/quickstart`} className="text-[#F4D44D] underline underline-offset-4">full quickstart</Link>.</p>
      </section>
    </div>
  );
}
