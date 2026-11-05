"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "convex/_generated/api";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";
import { projectCreateError } from "@/lib/project-errors";
import { setOneTimeApiKey } from "@/lib/onboarding-client-state";

const API_KEY_COPIED_STORAGE_KEY = "uncoil.onboarding.apiKeyCopied";
const PROJECT_ID_STORAGE_KEY = "uncoil.onboarding.projectId";
const PROJECT_NAME_STORAGE_KEY = "uncoil.onboarding.projectName";
const LAST_PROJECT_STORAGE_KEY = "uncoil.lastProjectId";

/** Landing page after a pay-first checkout: make the login, name the project, and the paid plan attaches to it. */
function Welcome() {
  const router = useRouter();
  const sessionId = useSearchParams().get("session_id") ?? "";
  const auth = useConvexAuthReadiness();
  const createProject = useMutation(api.projects.createProject);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const returnPath = `/pricing/checkout/welcome?session_id=${encodeURIComponent(sessionId)}`;
  const valid = sessionId.startsWith("cs_");

  async function finish() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setError("");
    try {
      const result = await createProject({ name: trimmed });
      const response = await fetch("/api/stripe/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, projectId: result.projectId }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not link your payment.");
      setOneTimeApiKey(result.plaintextApiKey);
      window.sessionStorage.removeItem(API_KEY_COPIED_STORAGE_KEY);
      window.sessionStorage.setItem(PROJECT_ID_STORAGE_KEY, result.projectId);
      window.sessionStorage.setItem(PROJECT_NAME_STORAGE_KEY, result.name);
      window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, result.projectId);
      router.push("/onboarding/api-key");
    } catch (failure) {
      setError(failure instanceof Error && failure.message.includes("payment") ? failure.message : projectCreateError(failure, "Could not finish setup.").message);
      setPending(false);
    }
  }

  const aside = (
    <>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Payment received</p>
        <h1 className="mt-5 font-pixel text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.85] tracking-[-0.08em]">You&apos;re in.</h1>
        <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">Stripe has your payment. Two quick steps and your plan is on.</p>
      </div>
      <ol className="mt-12 grid gap-3 border-t border-white/20 pt-6 font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-white/70">
        <li>1. Make your login.</li>
        <li>2. Name your first project.</li>
        <li>3. Copy your key and send a trace.</li>
      </ol>
    </>
  );

  return (
    <CheckoutShell aside={aside}>
      <ol className="grid grid-cols-3 gap-[2px] font-mono text-[10px] uppercase tracking-[0.12em]" aria-label="Setup steps">
        {["Pay", "Create login", "Send a trace"].map((label, i) => {
          const current = i === 1;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className={`border-t-4 pt-3 ${i <= 1 ? "border-black" : "border-black/20 text-black/40"}`}>
              <span className={current ? "bg-[#f4d44d] px-1.5 py-0.5" : ""}>{i + 1}. {label}</span>
            </li>
          );
        })}
      </ol>

      <h2 className="mt-10 font-pixel text-5xl leading-[0.92] tracking-[-0.07em] md:text-6xl">{!valid ? "No payment found." : auth.isAuthenticated ? "Name your project." : "Make your login."}</h2>

      {!valid ? (
        <p className="mt-6 text-sm leading-6 text-black/70">This link is missing its payment. Open the link from your Stripe receipt, or <Link href="/pricing" className="underline underline-offset-4">go back to pricing</Link>.</p>
      ) : auth.status === "error" ? <div className="mt-8"><ConvexAuthState mode="error" redirectPath={returnPath} /></div> : auth.status === "loading" ? (
        <p className="mt-8 border-t border-black/20 pt-6 font-mono text-[10px] uppercase tracking-[0.12em]" role="status">One moment…</p>
      ) : !auth.isAuthenticated ? (
        <div className="mt-8 border-t border-black/20 pt-6">
          <p className="text-sm leading-6 text-black/70">Your payment is safe. Create the login that owns this plan. Use the email on your Stripe receipt.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href={`/sign-up?redirect_url=${encodeURIComponent(returnPath)}`} className="group flex min-h-14 items-center justify-between bg-[#f4d44d] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black outline outline-2 outline-black hover:bg-black hover:text-[#f4d44d]">Create login <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`} className="flex min-h-14 items-center justify-between border-2 border-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#eceae3]">I have one <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </div>
      ) : (
        <form className="mt-8 border-t border-black/20 pt-6" onSubmit={(event) => { event.preventDefault(); void finish(); }}>
          <p className="text-sm leading-6 text-black/70">A project holds the traces for one agent or app. You can add more later.</p>
          <label htmlFor="welcome-project" className="mt-6 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Project name</label>
          <input id="welcome-project" autoFocus autoComplete="off" required value={name} onChange={(event) => setName(event.target.value)} placeholder="production-agents" className="mt-2 h-14 w-full border-2 border-black bg-white px-4 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]" />
          {error ? <p role="alert" className="mt-4 border-2 border-black bg-[#fff4b5] p-3 text-sm">{error}</p> : null}
          <button type="submit" disabled={pending || !name.trim()} className="group mt-6 flex min-h-16 w-full items-center justify-between bg-[#f4d44d] px-5 font-mono text-xs uppercase tracking-[0.14em] text-black outline outline-2 outline-black hover:bg-black hover:text-[#f4d44d] disabled:opacity-50">
            <span>{pending ? "Setting up…" : "Create project and get my key"}</span><ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </form>
      )}
    </CheckoutShell>
  );
}

export default function CheckoutWelcomePage() {
  return <Suspense fallback={null}><Welcome /></Suspense>;
}
