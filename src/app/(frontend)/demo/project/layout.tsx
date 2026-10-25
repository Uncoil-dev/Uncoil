import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { DEMO_PROJECT_ID } from "@/lib/demo/demo-config";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { ...noIndex, title: "Demo project" };

/** The real dashboard shell and sidebar, pointed at the read-only sample project. */
export default function DemoProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell canAccessContent={false} preview previewProjectId={DEMO_PROJECT_ID} previewProjectName="Support agent (demo)" demo>
      <div className="pb-14 [&>div>header]:pl-11">{children}</div>
      <div className="fixed bottom-4 right-4 z-20 flex flex-wrap items-stretch justify-end gap-2 font-mono text-[11px] uppercase tracking-[0.1em]">
        <Link href="/sign-up" className="flex items-center gap-2 border border-[#f4d44d] bg-[#090909] px-3 py-2 !text-[#f4d44d] hover:!bg-[#f4d44d] hover:!text-[#090909]">
          <span className="size-1.5 animate-pulse bg-[#5BE3A0]" aria-hidden="true" />Sample data · Start your own free →
        </Link>
        <Link href={pricingCheckoutHref("pro", "monthly")} className="flex items-center gap-2 border border-[#f4d44d] bg-[#f4d44d] px-3 py-2 !text-[#090909] hover:!bg-white">
          Start Pro · $19 →
        </Link>
      </div>
    </DashboardShell>
  );
}
