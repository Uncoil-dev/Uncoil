"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, BarChart3, Users, Shield } from "lucide-react";

import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";
import { planById } from "@/lib/pricing-plans";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    audience: "Experimenting with agents",
    popular: false,
    note: undefined,
    icon: undefined,
    features: ["25k spans / month", "7-day retention", "3 projects", "1 team member"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    note: "/mo",
    audience: "Production agents",
    popular: true,
    icon: BarChart3,
    features: ["500k spans / month", "30-day retention", "3 projects", "5 team members", "Evaluations + datasets", "Slack alerts"],
  },
  {
    id: "team",
    name: "Team",
    price: "$39",
    note: "/mo",
    audience: "Shared agent operations",
    popular: false,
    icon: Users,
    features: ["2M spans / month", "90-day retention", "Unlimited projects", "20 team members", "Release gates", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    audience: "Compliance, SSO, retention, deployment needs",
    popular: false,
    note: undefined,
    icon: Shield,
    features: ["Unlimited spans", "Custom retention", "SSO / SAML", "On-prem option", "Audit logs", "Dedicated engineer"],
  },
] as const;

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
        <Skeleton className="h-28 w-full rounded-none" />
        <Skeleton className="h-80 w-full rounded-none" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="border border-black/15 bg-white p-6 font-mono text-sm text-black/60">
        Project not found or access denied.
      </div>
    );
  }

  const currentPlan = summary.project.planTier ?? "free";

  return (
    <div className="space-y-10">
      <div className="grid gap-4 md:grid-cols-3">
        <UsageCard
          label="Current plan"
          value={currentPlan}
          detail={usage && currentPlan !== "enterprise" ? `${usage.spans.toLocaleString()} of ${planById(currentPlan).spans} spans used this month` : "From project metadata"}
        />
        <UsageCard
          label="Saved spend"
          value={formatCurrency(summary.totals.totalCostUsd)}
          detail={`${summary.totals.totalRuns.toLocaleString()} saved runs`}
        />
        <UsageCard
          label="Saved spans"
          value={summary.totals.totalSpans.toLocaleString()}
          detail={`${summary.totals.failedRuns.toLocaleString()} failed runs`}
        />
      </div>

      <div className="border border-black/15 bg-white p-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-black">
          Subscription billing
        </div>
        <p className="mt-2 max-w-3xl font-mono text-[12px] leading-relaxed text-black/55">
          Paid plans use secure Stripe Checkout. Existing subscribers can manage
          payment methods, invoices, plan changes, and cancellation in Stripe.
        </p>
        {summary.project.stripeCustomerId ? <PortalButton projectId={projectId} /> : null}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-mono text-sm uppercase tracking-widest text-black">Plans</h3>
          <div className="flex border border-black/15 p-1" aria-label="Billing interval">
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={cn("px-3 py-2 font-mono text-[9px] uppercase", !annual && "bg-black text-white")}>Monthly</button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={cn("px-3 py-2 font-mono text-[9px] uppercase", annual && "bg-black text-white")}>Annual −20%</button>
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-4">
          {PLANS.map((plan) => (
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
      </div>
    </div>
  );
}

function UsageCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-none border-black/15 bg-white p-5 shadow-none">
      <div className="font-mono text-[10px] uppercase tracking-widest text-black/55">
        {label}
      </div>
      <div className="mt-3 font-mono text-2xl uppercase text-black">{value}</div>
      <div className="mt-2 font-mono text-[11px] text-black/55">{detail}</div>
    </Card>
  );
}

function PlanCard({
  plan,
  current,
  projectId,
  interval,
  hasSubscription,
}: {
  plan: (typeof PLANS)[number];
  current: boolean;
  projectId: string;
  interval: "monthly" | "annual";
  hasSubscription: boolean;
}) {
  const Icon = plan.icon;
  const displayPrice = interval === "annual" && plan.id === "pro"
    ? "$15.20"
    : interval === "annual" && plan.id === "team"
      ? "$31.20"
      : plan.price;

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col rounded-none border p-5 shadow-none transition-all duration-200 hover:-translate-y-0.5",
        plan.popular && !current
          ? "border-black bg-[#f3f2ed]"
          : current
            ? "border-black bg-[#f3f2ed]"
            : "border-black/15 bg-white hover:border-black/30",
      )}
    >
      {plan.popular && !current && (
        <div className="absolute -top-[1px] left-5 -translate-y-full bg-black px-2.5 py-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">
            Most popular
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex size-8 items-center justify-center border border-black/15">
              <Icon className="size-4 text-black" />
            </div>
          )}
          <div>
            <h4 className="font-mono text-base uppercase text-black">{plan.name}</h4>
            <p className="mt-0.5 font-mono text-[11px] text-black/55">
              {plan.audience}
            </p>
          </div>
        </div>
        {current ? (
          <span className="bg-black px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white">
            Current
          </span>
        ) : null}
      </div>
      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl text-black">{displayPrice}</span>
        {plan.note && (
          <span className="font-mono text-[10px] text-black/55">{plan.note}</span>
        )}
        {interval === "annual" && (plan.id === "pro" || plan.id === "team") ? <span className="font-mono text-[9px] text-black/55">billed annually</span> : null}
      </div>
      <ul className="mt-5 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-3 font-mono text-[11px] text-black/70"
          >
            <Check className="size-3 shrink-0 text-black" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {current ? (
        <div className="mt-8 border border-black/15 px-3 py-2 text-center font-mono text-[10px] uppercase text-black/55">
          Active plan
        </div>
      ) : (
        hasSubscription && (plan.id === "pro" || plan.id === "team") ? (
          <div className="mt-8 border border-black/15 px-3 py-2 text-center font-mono text-[10px] uppercase text-black/55">Change in billing portal</div>
        ) : plan.id === "pro" || plan.id === "team" ? (
          <CheckoutButton projectId={projectId} plan={plan.id} interval={interval} />
        ) : (
          <Link href={plan.id === "enterprise" ? "/contact" : "/dashboard"} className="mt-8 block border border-black/15 px-3 py-2 text-center font-mono text-[10px] uppercase text-black/70 transition-colors hover:border-black hover:text-black">
            {plan.id === "enterprise" ? "Contact us" : "Free plan"}
          </Link>
        )
      )}
    </Card>
  );
}

function CheckoutButton({ projectId, plan, interval }: { projectId: string; plan: "pro" | "team"; interval: "monthly" | "annual" }) {
  const [pending, setPending] = useState(false);
  const startCheckout = async () => {
    if (!projectId) return;
    setPending(true);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, plan, interval }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout unavailable");
      window.location.assign(data.url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Checkout unavailable");
      setPending(false);
    }
  };
  return <button type="button" onClick={startCheckout} disabled={pending} className="mt-8 border border-black bg-black px-3 py-2 font-mono text-[10px] uppercase text-white disabled:opacity-50">{pending ? "Opening checkout…" : `Choose ${plan}`}</button>;
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
  return <button type="button" onClick={openPortal} disabled={pending} className="mt-4 border border-black/30 px-3 py-2 font-mono text-[10px] uppercase text-black">{pending ? "Opening…" : "Manage billing"}</button>;
}
