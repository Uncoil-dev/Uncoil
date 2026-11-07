"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "convex/_generated/api";
import type { BillingInterval, PaidPlan } from "@/lib/billing-links";
import { CheckoutShell, TrustRow } from "@/components/checkout/checkout-shell";
import { useConvexAuthReadiness } from "@/hooks/use-convex-auth-readiness";
import { projectCreateError } from "@/lib/project-errors";
import { formatPrice, monthlyPrice, planById } from "@/lib/pricing-plans";

function isPaidPlan(value: string | null): value is PaidPlan {
  return value === "pro" || value === "team";
}

function isBillingInterval(value: string | null): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

const DEFAULT_PROJECT_NAME = "My first project";

function PricingCheckout() {
  const searchParams = useSearchParams();
  const auth = useConvexAuthReadiness();
  const { isAuthenticated } = auth;
  const projects = useQuery(api.projects.getProjectsByUserOrOrg, isAuthenticated ? {} : "skip");
  const createProject = useMutation(api.projects.createProject);
  const plan = isPaidPlan(searchParams.get("plan")) ? searchParams.get("plan") as PaidPlan : "pro";
  const interval = isBillingInterval(searchParams.get("interval")) ? searchParams.get("interval") as BillingInterval : "monthly";
  const cancelled = searchParams.get("cancelled") === "1";
  const [projectId, setProjectId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const selectedProjectId = projectId || projects?.[0]?._id || "";
  const returnPath = `/pricing/checkout?plan=${plan}&interval=${interval}`;

  async function openCheckout(targetProjectId?: string) {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: targetProjectId, plan, interval, code: code.trim() || undefined }),
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

  async function pay() {
    setPending(true);
    setError("");
    try {
      if (!isAuthenticated) {
        await openCheckout();
        return;
      }
      if (selectedProjectId) {
        await openCheckout(selectedProjectId);
        return;
      }
      // Signed in with no project yet: make a default one so it is one click. They can rename it later in settings.
      const result = await createProject({ name: DEFAULT_PROJECT_NAME });
      window.localStorage.setItem("uncoil.lastProjectId", result.projectId);
      await openCheckout(result.projectId);
    } catch (checkoutError) {
      setError(isAuthenticated && !selectedProjectId ? projectCreateError(checkoutError, "Checkout is unavailable right now.").message : checkoutError instanceof Error ? checkoutError.message : "Checkout is unavailable right now.");
      setPending(false);
    }
  }

  const planInfo = planById(plan);
  const price = monthlyPrice(planInfo, interval);
  const intervalHref = (next: BillingInterval) => `/pricing/checkout?plan=${plan}&interval=${next}`;
  const steps = isAuthenticated ? (["Plan", "Pay", "Send a trace"] as const) : (["Pay", "Create login", "Send a trace"] as const);
  // If sign-in cannot be checked (status "error"), treat them as a new customer so paying is never blocked.
  // If sign-in cannot be checked (it times out), treat them as a new customer so paying is never blocked.
  const waiting = auth.status === "loading" || (isAuthenticated && projects === undefined);
  const buttonClass = "group mt-6 flex min-h-16 w-full items-center justify-between bg-[#f4d44d] px-5 font-mono text-xs uppercase tracking-[0.14em] text-black outline outline-2 outline-black hover:bg-black hover:text-[#f4d44d] disabled:opacity-50";

  const aside = (
    <>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Your plan</p>
        <h1 className="mt-5 font-pixel text-[clamp(4rem,9vw,7.5rem)] leading-[0.85] tracking-[-0.08em]">{planInfo.name}</h1>
        <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">{planInfo.line}</p>
      </div>
      <div className="mt-12">
        <div className="flex items-end gap-3">
          <span className="font-pixel text-6xl leading-none tracking-[-0.07em] text-[#f4d44d]">{formatPrice(price)}</span>
          <span className="pb-1 font-mono text-[10px] uppercase text-white/55">/ month</span>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-white/55">
          {interval === "annual" ? `Billed annually · ${formatPrice(price * 12)} a year` : "Billed monthly"}
        </p>
        <ul className="mt-8 grid gap-2.5 border-t border-white/20 pt-6 text-sm">
          {[`${planInfo.spans} spans / month`, `${planInfo.retention} retention`, `${planInfo.members} members · ${planInfo.projects} projects`, ...planInfo.features].map((feature) => (
            <li key={feature} className="flex gap-2.5"><span className="mt-1.5 size-1.5 shrink-0 bg-[#f4d44d]" />{feature}</li>
          ))}
        </ul>
      </div>
    </>
  );

  return (
    <CheckoutShell aside={aside}>
      <ol className="grid grid-cols-3 gap-[2px] font-mono text-[10px] uppercase tracking-[0.12em]" aria-label="Checkout steps">
        {steps.map((label, i) => {
          const current = (isAuthenticated ? 1 : 0) === i;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className={`border-t-4 pt-3 ${i <= (isAuthenticated ? 1 : 0) ? "border-black" : "border-black/20 text-black/40"}`}>
              <span className={current ? "bg-[#f4d44d] px-1.5 py-0.5" : ""}>{i + 1}. {label}</span>
            </li>
          );
        })}
      </ol>

      {cancelled ? <p role="status" className="mt-8 border-2 border-black bg-[#fff4b5] p-3 text-sm">No charge was made. Your plan is still here when you are ready.</p> : null}

      <h2 className="mt-10 font-pixel text-5xl leading-[0.92] tracking-[-0.07em] md:text-6xl">{isAuthenticated ? "Ready to pay." : `Get ${planInfo.name}.`}</h2>
      <p className="mt-4 max-w-md text-sm leading-6 text-black/70">
        {isAuthenticated
          ? projects && projects.length > 1 ? "Pick the project this plan covers, then pay on Stripe." : "One click to Stripe. Your project is ready when you come back."
          : "Pay on Stripe now. You make your login and name your project right after, with your plan already on."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-[2px] border-2 border-black p-[2px] font-mono text-[11px] uppercase tracking-[0.1em]" role="group" aria-label="Billing period">
        <Link href={intervalHref("monthly")} replace aria-current={interval === "monthly" ? "true" : undefined} className={`px-3 py-3 text-center ${interval === "monthly" ? "bg-black text-[#f4d44d]" : "hover:bg-black/10"}`}>Monthly · {formatPrice(planInfo.monthly)}</Link>
        <Link href={intervalHref("annual")} replace aria-current={interval === "annual" ? "true" : undefined} className={`px-3 py-3 text-center ${interval === "annual" ? "bg-black text-[#f4d44d]" : "hover:bg-black/10"}`}>Annual · save 20%</Link>
      </div>

      {(
        <div>
          {isAuthenticated && projects && projects.length > 1 ? (
            <>
              <label htmlFor="checkout-project" className="mt-6 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Project</label>
              <select id="checkout-project" value={selectedProjectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 h-14 w-full border-2 border-black bg-white px-4 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]">
                {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
              </select>
            </>
          ) : null}
          {error ? <p role="alert" className="mt-4 border-2 border-black bg-[#fff4b5] p-3 text-sm">{error}</p> : null}
          <button type="button" onClick={() => void pay()} disabled={pending || waiting} className={buttonClass}>
            <span>{pending ? "Opening Stripe…" : waiting ? "One moment…" : `Pay ${formatPrice(interval === "annual" ? price * 12 : price)} ${interval === "annual" ? "a year" : "a month"}`}</span>
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </button>
          <label htmlFor="checkout-code" className="mt-5 block font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Have a code?</label>
          <input id="checkout-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Enter code" className="mt-2 h-12 w-full border-2 border-black bg-white px-4 font-mono text-sm uppercase placeholder:normal-case focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d44d]" />
          <TrustRow />
          {!isAuthenticated && !waiting ? (
            <p className="mt-8 border-t border-black/20 pt-5 text-sm text-black/70">
              Already have an account?{" "}
              <Link href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`} className="font-medium text-black underline underline-offset-4 hover:bg-[#f4d44d]">Sign in first</Link>
              {" "}to pay for an existing project.
            </p>
          ) : null}
        </div>
      )}

      <p className="mt-8 text-xs leading-5 text-black/55">Card details go to Stripe and never touch Uncoil.</p>
    </CheckoutShell>
  );
}

export default function PricingCheckoutPage() {
  return <Suspense fallback={null}><PricingCheckout /></Suspense>;
}
