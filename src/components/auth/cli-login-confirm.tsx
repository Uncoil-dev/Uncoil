"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { AuthShell } from "@/components/auth/auth-shell";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";

const NEW_PROJECT = "new";

/** The browser half of `tracify-sdk login`: confirm the code, pick a project, send the key to the terminal. */
export function CliLoginConfirm() {
  const code = useSearchParams().get("code") ?? "";
  const auth = useConvexAuthReadiness();
  const signedIn = auth.status === "authenticated";
  const request = useQuery(api.deviceLogins.lookup, signedIn && code ? { userCode: code } : "skip");
  const projects = useQuery(api.projects.getProjectsByUserOrOrg, signedIn ? {} : "skip");
  const approve = useMutation(api.deviceLogins.approve);
  const deny = useMutation(api.deviceLogins.deny);

  const [choice, setChoice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [replaceOk, setReplaceOk] = useState(false);
  const [phase, setPhase] = useState<"idle" | "working" | "approved" | "denied">("idle");
  const [message, setMessage] = useState("");
  const [connectedName, setConnectedName] = useState("");

  const here = `/cli/login?code=${encodeURIComponent(code)}`;
  const list = projects ?? [];
  const selected = choice ?? (list.length > 0 ? String(list[0]._id) : NEW_PROJECT);
  const selectedProject = list.find((project) => String(project._id) === selected);
  const needsReplace = Boolean(selectedProject?.apiKeyLastUsedAt);
  const defaultName = request && request.state === "pending" ? request.newProjectName ?? "My first project" : "My first project";

  async function confirm() {
    setPhase("working");
    setMessage("");
    try {
      const result = await approve({
        userCode: code,
        ...(selected === NEW_PROJECT ? { newProjectName: newName.trim() || defaultName } : { projectId: selected as Id<"projects">, confirmReplace: replaceOk }),
      });
      setConnectedName(result.projectName);
      setPhase("approved");
    } catch (error) {
      setPhase("idle");
      const text = error instanceof Error ? error.message : "";
      setMessage(text.includes("expired") ? "This code has expired. Run the command in your terminal again." : text.includes("already used") ? "This code was already used." : "That did not work. Try again, or run the command again.");
    }
  }

  async function refuse() {
    await deny({ userCode: code });
    setPhase("denied");
  }

  let body;
  if (!code) body = <Notice>This link is missing its code. Run <Mono>npx tracify-sdk login</Mono> in your terminal again.</Notice>;
  else if (auth.status === "loading") body = <Notice>Checking your account…</Notice>;
  else if (auth.status === "error") body = <Notice>We could not check your sign-in. Reload this page.</Notice>;
  else if (!signedIn) {
    body = (
      <>
        <Notice>Sign in, or create a free account, to connect your terminal. Your code is <Mono>{code}</Mono>.</Notice>
        <ActionLink href={`/sign-in?redirect_url=${encodeURIComponent(here)}`}>Sign in</ActionLink>
        <ActionLink href={`/sign-up?redirect_url=${encodeURIComponent(here)}`}>Create a free account</ActionLink>
      </>
    );
  } else if (phase === "approved") {
    body = (
      <>
        <Notice>Connected to <strong>{connectedName}</strong>. Go back to your terminal; it finishes on its own.</Notice>
        <ActionLink href="/dashboard">Open dashboard</ActionLink>
      </>
    );
  } else if (phase === "denied") body = <Notice>Cancelled. Nothing was connected.</Notice>;
  else if (request === undefined || projects === undefined) body = <Notice>Loading…</Notice>;
  else if (!request || request.state === "invalid") body = <Notice>We do not know this code. Run <Mono>npx tracify-sdk login</Mono> again and open the new link.</Notice>;
  else if (request.state === "expired") body = <Notice>This code has expired. Run <Mono>npx tracify-sdk login</Mono> again.</Notice>;
  else if (request.state === "done") body = <Notice>This code was already used.</Notice>;
  else {
    body = (
      <>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Code from your terminal</p>
        <p className="mt-1 font-mono text-3xl tracking-[0.18em]">{request.userCode}</p>
        <Notice>Only continue if you just ran <Mono>npx tracify-sdk login</Mono> yourself and the same code is on your screen. If someone sent you this link, close it.</Notice>
        <fieldset className="mt-6">
          <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Send traces to</legend>
          <div className="mt-3 grid gap-2">
            {list.map((project) => (
              <Choice key={String(project._id)} checked={selected === String(project._id)} onSelect={() => { setChoice(String(project._id)); setReplaceOk(false); }} label={project.name} hint={project.apiKeyLastUsedAt ? "Already sending data" : "No data yet"} />
            ))}
            <Choice checked={selected === NEW_PROJECT} onSelect={() => setChoice(NEW_PROJECT)} label="Create a new project" />
          </div>
          {selected === NEW_PROJECT ? (
            <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={80} placeholder={defaultName} aria-label="New project name" className="mt-3 h-12 w-full border border-black/30 bg-white px-3 text-sm" />
          ) : null}
          {selected !== NEW_PROJECT ? <p className="mt-3 text-sm leading-6 text-black/60">This makes a new key for <strong>{selectedProject?.name}</strong>. The old key stops working.</p> : null}
          {needsReplace ? (
            <label className="mt-3 flex items-start gap-3 border border-black/25 bg-[#fff4b5] p-3 text-sm leading-6">
              <input type="checkbox" checked={replaceOk} onChange={(event) => setReplaceOk(event.target.checked)} className="mt-1" />
              <span>This project is already sending data. Anything using the old key will stop until it gets the new one.</span>
            </label>
          ) : null}
        </fieldset>
        <button disabled={phase === "working" || (needsReplace && !replaceOk)} onClick={() => void confirm()} className="active-press mt-6 flex h-12 w-full items-center justify-between bg-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white hover:bg-[#f4d44d] hover:text-black disabled:opacity-50">
          <span>{phase === "working" ? "Connecting…" : "Connect my terminal"}</span><ArrowRight className="size-4" />
        </button>
        <button onClick={() => void refuse()} className="mt-3 min-h-11 font-mono text-[10px] uppercase tracking-[0.13em] text-black/60 hover:text-black">Cancel</button>
        {message ? <Notice>{message}</Notice> : null}
      </>
    );
  }

  return (
    <AuthShell mode="device">
      <div>
        <h2 className="font-pixel text-4xl tracking-[-0.06em]">Connect your terminal</h2>
        <p className="mt-3 text-sm leading-6 text-black/55">Link this machine to a Tracify project in one step.</p>
        {body}
      </div>
    </AuthShell>
  );
}

function Notice({ children }: { children: React.ReactNode }) { return <p role="status" className="mt-6 border border-black/25 bg-[#f7f6f1] p-4 text-sm leading-6 text-black/60">{children}</p>; }
function Mono({ children }: { children: React.ReactNode }) { return <code className="font-mono text-[0.9em] text-black">{children}</code>; }
function ActionLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="active-press mt-4 flex h-12 items-center justify-between bg-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white hover:bg-[#f4d44d] hover:text-black">{children}<ArrowRight className="size-4" /></Link>; }
function Choice({ checked, onSelect, label, hint }: { checked: boolean; onSelect: () => void; label: string; hint?: string }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border px-3 py-2 text-sm ${checked ? "border-black bg-[#fff4b5]" : "border-black/25"}`}>
      <span className="flex items-center gap-3"><input type="radio" name="project" checked={checked} onChange={onSelect} /><span>{label}</span></span>
      {hint ? <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-black/50">{hint}</span> : null}
    </label>
  );
}
