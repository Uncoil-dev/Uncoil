"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "convex/_generated/api";
import type { BillingInterval, PaidPlan } from "@/lib/billing-links";
import { ConvexAuthState } from "@/components/auth/convex-auth-state";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";
import { projectCreateError } from "@/lib/project-errors";
import { formatPrice, monthlyPrice, planById } from "@/lib/pricing-plans";

function isPaidPlan(value: string | null): value is PaidPlan {
  return value === "pro" || value === "team";
}

function isBillingInterval(value: string | null): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

export default function PricingCheckoutPage() {
  const searchParams = useSearchParams();
  const auth = useConvexAuthReadiness();
  const { isAuthenticated } = auth;
  const projects = useQuery(api.projects.getProjectsByUserOrOrg, isAuthenticated ? {} : "skip");
  const createProject = useMutation(api.projects.createProject);
  const plan = isPaidPlan(searchParams.get("plan")) ? searchParams.get("plan") as PaidPlan : "pro";
  const interval = isBillingInterval(searchParams.get("interval")) ? searchParams.get("interval") as BillingInterval : "monthly";
  const [projectId, setProjectId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [projectName, setProjectName] = useState("");
  const selectedProjectId = projectId || projects?.[0]?._id || "";
  const returnPath = `/pricing/checkout?plan=${plan}&interval=${interval}`;

  async function openCheckout(targetProjectId: string) {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: targetProjectId, plan, interval }),
    });
    const responseText = await response.text();
    let data: { url?: string; error?: string } = {};
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText) as { url?: string; error?: string };
      } catch {
        throw new Error(`Checkout failed (${response.status}). The billing service returned an invalid response.`);
      }
    }
    if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout is unavailable right now.");
    window.location.assign(data.url);
  }

  async function startCheckout() {
    if (!selectedProjectId) return;
    setPending(true);
    setError("");
    try {
      await openCheckout(selectedProjectId);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout is unavailable right now.");
      setPending(false);
    }
  }

  async function createProjectAndCheckout() {
    const name = projectName.trim();
    if (!name) return;
    setPending(true);
    setError("");
    try {
      const result = await createProject({ name });
      window.localStorage.setItem("uncoil.lastProjectId", result.projectId);
      await openCheckout(result.projectId);
    } catch (checkoutError) {
      setError(projectCreateError(checkoutError, "Checkout is unavailable right now.").message);
      setPending(false);
    }
  }

  const planInfo = planById(plan);
  const price = monthlyPrice(planInfo, interval);
  const otherInterval: BillingInterval = interval === "annual" ? "monthly" : "annual";
  const signedIn = isAuthenticated;
  const step = !isAuthenticated ? 1 : 2;
  const steps = ["Account", "Project", "Pay"] as const;
  const buttonClass = "group mt-5 flex min-h-14 w-full items-center justify-between bg-[#f4d44d] px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-black hover:text-[#f4d44d] disabled:opacity-50";

  return (
    <main className="grid min-h-svh bg-[#090909] text-black lg:grid-cols-[5fr_7fr]">
      <aside className="relative isolate flex flex-col justify-between overflow-hidden px-5 pb-12 pt-14 text-[#eceae3] md:px-10 lg:pt-20">
        <Image src="/images/landing/checkout-gate.png" alt="" fill priority unoptimized sizes="(min-width: 1024px) 42vw, 100vw" className="-z-10 object-cover opacity-50 [image-rendering:pixelated] lg:opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#090909] via-[#090909]/70 to-[#090909]/20" aria-hidden="true" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Your plan</p>
          <h1 className="mt-5 font-pixel text-[clamp(4rem,9vw,7.5rem)] leading-[0.85] tracking-[-0.08em]">{planInfo.name}</h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">{planInfo.line}</p>
        </div>
        <div className="mt-16">
          <div className="flex items-end gap-3">
            <span className="font-pixel text-6xl leading-none tracking-[-0.07em] text-[#f4d44d]">{formatPrice(price)}</span>
            <span className="pb-1 font-mono text-[10px] uppercase text-white/55">/ month</span>
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white/55">
            {interval === "annual" ? `Billed annually · ${formatPrice(price * 12)} a year · 20% off` : "Billed monthly"}
          </p>
          <Link href={`/pricing/checkout?plan=${plan}&interval=${otherInterval}`} replace className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-white/80 underline underline-offset-4 hover:text-[#f4d44d]">
            {interval === "annual" ? "Switch to monthly" : "Switch to annual and save 20%"}
          </Link>
          <ul className="mt-8 grid gap-2.5 border-t border-white/20 pt-6 text-sm">
            {[`${planInfo.spans} spans / month`, `${planInfo.retention} retention`, `${planInfo.members} members · ${planInfo.projects} projects`, ...planInfo.features].map((feature) => (
              <li key={feature} className="flex gap-2.5"><span className="mt-1.5 size-1.5 shrink-0 bg-[#f4d44d]" />{feature}</li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="bg-[#eceae3] px-5 pb-16 pt-12 md:px-10 lg:px-16 lg:pt-20">
        <div className="mx-auto max-w-xl">
          <ol className="grid grid-cols-3 gap-[2px] font-mono text-[10px] uppercase tracking-[0.12em]" aria-label="Checkout steps">
            {steps.map((label, i) => (
              <li key={label} aria-current={i + 1 === step ? "step" : undefined} className={`border-t-4 pt-3 ${i + 1 <= step ? "border-black" : "border-black/20 text-black/40"}`}>
                <span className={i + 1 === step ? "bg-[#f4d44d] px-1.5 py-0.5" : ""}>{i + 1}. {label}</span>
              </li>
            ))}
          </ol>

          <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Secure subscription checkout</p>
          <h2 className="mt-3 font-pixel text-5xl leading-[0.92] tracking-[-0.07em] md:text-6xl">{!isAuthenticated ? "Sign in to continue." : projects && !projects.length ? "Name your first project." : "Pick a project."}</h2>

          {auth.status === "error" ? <div className="mt-8"><ConvexAuthState mode="error" redirectPath={returnPath} /></div> : auth.status === "loading" || (isAuthenticated && projects === undefined) ? (
            <p className="mt-8 border-t border-black/20 pt-6 font-mono text-[10px] uppercase tracking-[0.12em]" role="status">Loading your workspace…</p>
          ) : !isAuthenticated ? (
            <div className="mt-8 border-t border-black/20 pt-6">
              <p className="text-sm leading-6 text-black/70">Sign in or create an account first. You will come back here with your plan already selected.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href={`/sign-up?redirect_url=${encodeURIComponent(returnPath)}`} className="group flex min-h-14 items-center justify-between bg-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#eceae3] hover:bg-[#f4d44d] hover:text-black">Create account <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
                <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`} className="flex min-h-14 items-center justify-between border-2 border-black px-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-black hover:text-[#eceae3]">Sign in <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
            </div>
          ) : !projects?.length ? (
            <form className="mt-8 border-t border-black/20 pt-6" onSubmit={(event) => { event.preventDefault(); void createProjectAndCheckout(); }}>
              <p className="text-sm leading-6 text-black/70">We will create it here and send you straight to Stripe, no onboarding detour.</p>
              <label htmlFor="new-checkout-project" className="mt-6 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Project name</label>
              <input id="new-checkout-project" autoFocus autoComplete="off" required value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="production-agents" className="mt-2 h-14 w-full border-2 border-black bg-white px-4 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]" />
              {error ? <p role="alert" className="mt-4 border-2 border-black bg-[#fff4b5] p-3 text-sm">{error}</p> : null}
              <button type="submit" disabled={pending || !projectName.trim()} className={buttonClass}>
                {pending ? "Preparing checkout…" : "Create project and pay"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <div className="mt-8 border-t border-black/20 pt-6">
              <p className="text-sm leading-6 text-black/70">Choose the project this subscription should cover.</p>
              <label htmlFor="checkout-project" className="mt-6 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Project</label>
              <select id="checkout-project" value={selectedProjectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 h-14 w-full border-2 border-black bg-white px-4 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]">
                {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
              </select>
              {error ? <p role="alert" className="mt-4 border-2 border-black bg-[#fff4b5] p-3 text-sm">{error}</p> : null}
              <button type="button" onClick={() => void startCheckout()} disabled={pending} className={buttonClass}>
                {pending ? "Opening Stripe…" : "Continue to secure checkout"}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </div>
          )}

          <ol className="mt-10 grid gap-3 border-t border-black/20 pt-6 font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-black/65">
            <li>1. You pay on Stripe&apos;s secure page.</li>
            <li>2. You land on your project&apos;s billing page.</li>
            <li>3. Send your first trace. The docs are one click away.</li>
          </ol>
          <p className="mt-8 text-xs leading-5 text-black/55">{signedIn ? "You will pay on Stripe. Card details never touch Uncoil." : "Payments are handled by Stripe."}</p>
          <Link href="/pricing" className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-black/60 underline underline-offset-4 hover:text-black">← Back to pricing</Link>
        </div>
      </section>
    </main>
  );
}
