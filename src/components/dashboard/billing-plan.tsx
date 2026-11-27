"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, BarChart3, Users, Shield, type LucideIcon } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Panel, StatTile, adminButton, adminButtonPrimary } from "@/components/dashboard/project-admin-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import type { BillingInterval } from "@/lib/billing-links";
import { formatPrice, monthlyPrice, planById, plans } from "@/lib/pricing-plans";

type PlanCardData = {
  id: string;
  name: string;
  price: string;
  note?: string;
  audience: string;
  popular: boolean;
  icon?: LucideIcon;
  features: readonly string[];
};

const PLAN_ICONS: Partial<Record<string, LucideIcon>> = { pro: BarChart3, team: Users };

const ENTERPRISE_CARD: PlanCardData = {
  id: "enterprise",
  name: "Enterprise",
  price: "Custom",
  audience: "Compliance, SSO, retention, deployment needs",
  popular: false,
  icon: Shield,
  features: ["Unlimited spans", "Custom retention", "SSO / SAML", "On-prem option", "Audit logs", "Dedicated engineer"],
};

/** Builds the Free, Pro and Team cards from the shared plan list, followed by Enterprise. */
export function buildPlanCards(interval: BillingInterval): PlanCardData[] {
  const shared = plans.map((plan): PlanCardData => ({
    id: plan.id,
    name: plan.name,
    price: formatPrice(monthlyPrice(plan, interval)),
    note: plan.monthly > 0 ? "/mo" : undefined,
    audience: plan.line,
    popular: plan.id === "pro",
    icon: PLAN_ICONS[plan.id],
    features: [
      `${plan.spans} spans / month`,
      `${plan.retention.replace(" days", "-day")} retention`,
      plan.projects === "Unlimited" ? "Unlimited projects" : `${plan.projects} projects`,
      `${plan.members} team ${plan.members === "1" ? "member" : "members"}`,
      ...plan.features,
    ],
  }));
  return [...shared, ENTERPRISE_CARD];
}

export function BillingPlan({ projectId }: { projectId: string }) {
  const [annual, setAnnual] = useState(false);
  const summary = useQuery(api.projects.getProjectManagementSummary, projectId ? {
    projectId: projectId as Id<"projects">,
  } : "skip");

  const usage = useQuery(api.billing.getMonthlyUsage, projectId ? {
    projectId: projectId as Id<"projects">,
  } : "skip");

  if (summary === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-none bg-[#111418]" />
        <Skeleton className="h-80 w-full rounded-none bg-[#111418]" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="border border-[#262C35] bg-[#0E1115] p-6 font-mono text-sm text-[#8B93A1]">
        Project not found or access denied.
      </div>
    );
  }

  const currentPlan = summary.project.planTier ?? "free";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Current plan"
          value={currentPlan.toUpperCase()}
          detail={usage && currentPlan !== "enterprise" ? `${usage.spans.toLocaleString()} of ${planById(currentPlan).spans} spans this month` : "From project metadata"}
        />
        <StatTile label="Saved spend" value={formatCurrency(summary.totals.totalCostUsd)} detail={`${summary.totals.totalRuns.toLocaleString()} saved runs`} />
        <StatTile label="Saved spans" value={summary.totals.totalSpans.toLocaleString()} detail={`${summary.totals.failedRuns.toLocaleString()} failed runs`} />
      </div>

      <Panel
        title="Plans"
        hint="Paid plans use secure Stripe Checkout. Subscribers change plan, card and invoices in the billing portal."
        action={
          <div className="flex items-center gap-2">
            {summary.project.stripeCustomerId ? <PortalButton projectId={projectId} /> : null}
            <div className="flex border border-[#262C35] p-0.5" aria-label="Billing interval">
              <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={cn("px-3 py-1.5 font-mono text-[10px] uppercase text-[#8B93A1]", !annual && "bg-[#E6E9EE] text-[#0B0D10]")}>Monthly</button>
              <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={cn("px-3 py-1.5 font-mono text-[10px] uppercase text-[#8B93A1]", annual && "bg-[#E6E9EE] text-[#0B0D10]")}>Annual −20%</button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {buildPlanCards(annual ? "annual" : "monthly").map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={plan.id === currentPlan}
              projectId={projectId}
              interval={annual ? "annual" : "monthly"}
              hasSubscription={Boolean(summary.project.stripeSubscriptionId)}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  projectId,
  interval,
  hasSubscription,
}: {
  plan: PlanCardData;
  current: boolean;
  projectId: string;
  interval: "monthly" | "annual";
  hasSubscription: boolean;
}) {
  const Icon = plan.icon;
  const footer = "mt-6 border border-[#262C35] px-3 py-2 text-center font-mono text-[10px] uppercase text-[#8B93A1]";

  return (
    <div className={cn("relative flex h-full flex-col border p-5", current ? "border-[#F4D44D] bg-[#111418]" : "border-[#262C35] bg-[#0B0D10]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex size-8 items-center justify-center border border-[#262C35]">
              <Icon className="size-4 text-[#E6E9EE]" />
            </div>
          )}
          <div>
            <h4 className="font-mono text-base uppercase text-[#E6E9EE]">{plan.name}</h4>
            <p className="mt-0.5 text-[12px] text-[#8B93A1]">{plan.audience}</p>
          </div>
        </div>
        {current ? (
          <span className="bg-[#F4D44D] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#0B0D10]">Current</span>
        ) : plan.popular ? (
          <span className="border border-[#262C35] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[#8B93A1]">Popular</span>
        ) : null}
      </div>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl text-[#E6E9EE]">{plan.price}</span>
        {plan.note && <span className="font-mono text-[10px] text-[#8B93A1]">{plan.note}</span>}
        {interval === "annual" && (plan.id === "pro" || plan.id === "team") ? <span className="font-mono text-[9px] text-[#6B7380]">billed annually</span> : null}
      </div>
      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-[12px] text-[#E6E9EE]">
            <Check className="size-3 shrink-0 text-[#5BE3A0]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {current ? (
        <div className={footer}>Active plan</div>
      ) : hasSubscription && (plan.id === "pro" || plan.id === "team") ? (
        <div className={footer}>Change in billing portal</div>
      ) : plan.id === "pro" || plan.id === "team" ? (
        <CheckoutButton projectId={projectId} plan={plan.id} interval={interval} />
      ) : (
        <Link href={plan.id === "enterprise" ? "/contact" : "/dashboard"} className={`${footer} block transition-colors hover:border-[#F4D44D] hover:text-[#E6E9EE]`}>
          {plan.id === "enterprise" ? "Contact us" : "Free plan"}
        </Link>
      )}
    </div>
  );
}

export async function requestCheckoutUrl(projectId: string, plan: "pro" | "team", interval: "monthly" | "annual") {
  const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, plan, interval }) });
  const data = await response.json() as { url?: string; error?: string };
  if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout unavailable");
  return data.url;
}

export function CheckoutButton({ projectId, plan, interval }: { projectId: string; plan: "pro" | "team"; interval: "monthly" | "annual" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startCheckout = async () => {
    if (!projectId) return;
    setPending(true);
    setError(null);
    try {
      window.location.assign(await requestCheckoutUrl(projectId, plan, interval));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout unavailable");
      setPending(false);
    }
  };
  return (
    <>
      <button type="button" onClick={startCheckout} disabled={pending} className={`${adminButtonPrimary} mt-6`}>{pending ? "Opening checkout…" : `Choose ${planById(plan).name}`}</button>
      {error ? <p role="alert" className="mt-2 font-mono text-[11px] text-[#8B93A1]">{error}</p> : null}
    </>
  );
}

function PortalButton({ projectId }: { projectId: string }) {
  const [pending, setPending] = useState(false);
  const openPortal = async () => {
    if (!projectId) return;
    setPending(true);
    const response = await fetch("/api/stripe/portal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId }) });
    const data = await response.json() as { url?: string };
    if (data.url) window.location.assign(data.url); else setPending(false);
  };
  return <button type="button" onClick={openPortal} disabled={pending} className={adminButton}>{pending ? "Opening…" : "Manage billing"}</button>;
}
