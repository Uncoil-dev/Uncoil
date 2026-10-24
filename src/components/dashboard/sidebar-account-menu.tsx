"use client";

import { ChevronRight, CreditCard, Settings2, Gauge, Globe2, LogOut, ShieldCheck, Sparkles, UserPen } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { UsageBar } from "@/components/dashboard/usage-bar";
import { usageLevel } from "@/lib/plan-limits";
import { planById, type PlanId } from "@/lib/pricing-plans";
import { getTracifyRegion } from "@/lib/regions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MARKETING_ORIGIN = process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.tracify.tech";

export function SidebarAccountMenu({
  isCollapsed = false,
  synthetic = false,
}: {
  isCollapsed?: boolean;
  synthetic?: boolean;
}) {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const { data: session } = authClient.useSession();
  const projects = useQuery(api.projects.getProjectsByUserOrOrg, synthetic ? "skip" : undefined) || [];
  const currentProject = projects.find((project) => project._id === projectId) ?? projects[0] ?? null;
  const adminAccess = useQuery(api.admin.access, synthetic ? "skip" : undefined);
  const isFree = !synthetic && (currentProject?.planTier ?? "free") === "free";
  const region = getTracifyRegion();
  const usage = useQuery(
    api.billing.getMonthlyUsage,
    synthetic || !currentProject ? "skip" : { projectId: currentProject._id },
  );
  const usageTier = usage?.planTier ?? "free";
  const usagePlan = planById(usageTier as PlanId);

  const user = session?.user;
  const name = synthetic ? "Demo viewer" : user?.name || "Account";
  const email = synthetic ? "Sign in to use your own data" : user?.email || "";
  const billingHref = projectId ? `/dashboard/${projectId}/billing` : "/dashboard/billing";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Manage account"
          title={isCollapsed ? "Manage account" : undefined}
          className={cn(
            "flex h-9 items-center font-mono text-[13px] !text-[#a0a0a0] outline-none transition-colors hover:!bg-[#181818] hover:!text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55",
            isCollapsed ? "mx-auto w-10 justify-center" : "mx-2 w-[calc(100%-1rem)] gap-3 px-3 text-left",
          )}
        >
          <Settings2 className="size-[17px] shrink-0" strokeWidth={1.7} />
          {isCollapsed ? null : (
            <>
              <span className="truncate">Manage account</span>
              <ChevronRight className="ml-auto size-4 shrink-0 opacity-60" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="right" collisionPadding={8} sideOffset={8} className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2 normal-case !text-[#dedede]">
          <span className="truncate text-[12px]">{name}</span>
          <span className="truncate text-[10px] opacity-55">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {usage && usageTier !== "enterprise" ? (
          <DropdownMenuItem asChild>
            <Link href="/dashboard/account?tab=usage" className="flex-col !items-stretch gap-1.5">
              <span className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2"><Gauge className="size-4" /> Usage this month</span>
                <span className={usageLevel(usage.spans, usageTier) === "ok" ? "opacity-60" : "!text-[#f4d44d]"}>
                  {Math.round((usage.spans / usagePlan.spanLimit) * 100)}%
                </span>
              </span>
              <UsageBar spans={usage.spans} tier={usageTier} />
              <span className="text-[10px] opacity-55">{usage.spans.toLocaleString()} of {usagePlan.spans} spans · {currentProject?.name}</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        {isFree ? (
          <DropdownMenuItem asChild>
            <Link href={billingHref} className="!text-[#f4d44d]">
              <Sparkles className="size-4" />
              <span>Upgrade plan</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/dashboard/account">
            <UserPen className="size-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={billingHref}>
            <CreditCard className="size-4" />
            <span>Billing</span>
          </Link>
        </DropdownMenuItem>
        {adminAccess?.allowed ? (
          <DropdownMenuItem asChild>
            <Link href="/admin" prefetch>
              <ShieldCheck className="size-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <a href={`${MARKETING_ORIGIN}/cloud`}>
            <Globe2 className="size-4" />
            <span>{region.shortName} cloud · switch region</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {synthetic ? (
          <DropdownMenuItem asChild>
            <Link href="/sign-in">
              <LogOut className="size-4" />
              <span>Sign in</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => void authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
