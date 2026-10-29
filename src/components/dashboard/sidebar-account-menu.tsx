"use client";

import { useState } from "react";
import { ChevronRight, CreditCard, Gauge, Globe2, LogOut, ShieldCheck, Sparkles, UserPen } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { UsageBar } from "@/components/dashboard/usage-bar";
import { usageLevel } from "@/lib/plan-limits";
import { planById, type PlanId } from "@/lib/pricing-plans";
import { getUncoilRegion } from "@/lib/regions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MARKETING_ORIGIN = process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.uncoil.dev";

/** The person's profile picture, or their initial on yellow when they have none (or it fails to load). */
function Avatar({ image, name }: { image?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={28} height={28} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="block size-7 shrink-0 object-cover" />;
  }
  return <span className="flex size-7 shrink-0 items-center justify-center bg-[#f4d44d] text-[12px] font-semibold !text-[#090909]">{name.slice(0, 1).toUpperCase()}</span>;
}

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
  const region = getUncoilRegion();
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
          aria-label={`Manage account: ${name}`}
          title={isCollapsed ? `Manage account · ${name}` : undefined}
          className={cn(
            "flex items-center font-mono outline-none transition-colors hover:!bg-[#181818] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/55",
            isCollapsed ? "mx-auto size-10 justify-center" : "mx-2 h-12 w-[calc(100%-1rem)] gap-3 px-3 text-left",
          )}
        >
          <Avatar image={synthetic ? null : user?.image} name={name} />
          {isCollapsed ? null : (
            <>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12px] !text-[#dedede]">{name}</span>
                <span className="truncate text-[10px] !text-[#8d8d8d]">Manage account</span>
              </span>
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
