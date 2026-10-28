import type { Metadata } from "next";
import { Globe2, ShieldCheck } from "lucide-react";

import { CloudShell } from "@/components/cloud/cloud-shell";
import { RegionOptions } from "@/components/cloud/region-options";
import { getAvailableRegions } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Choose your Uncoil region",
  description: "Choose a regional Uncoil cloud before entering Sandbox or Build.",
  alternates: { canonical: "/cloud" },
  robots: { index: false, follow: false },
};

const AUTH_ENTRY_PATHS = ["/sign-in", "/sign-up"];

export default async function CloudRegionPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  // "Sign in" on the marketing site must land on sign-in and "Sign up" on sign-up; anything else keeps the Sandbox/Build step.
  const requested = (await searchParams).next;
  const requestedPath = typeof requested === "string" ? requested.split("?")[0] : "";
  const next = AUTH_ENTRY_PATHS.includes(requestedPath) ? requestedPath : "/cloud/mode";
  const regions = getAvailableRegions();
  return (
    <CloudShell
      step="step 01 of 02"
      eyebrow="Regional cloud"
      title="Choose your region."
      body="First choose where Uncoil runs. Next you pick Sandbox or Build on that regional cloud."
      image="/images/company/region-link.png"
      footer={<p className="text-xs leading-6 text-white/55">Regions are isolated. Choosing another region does not move an existing account or its data.</p>}
    >
      <div className="mb-6 grid gap-4 border-y border-white/20 py-5 sm:grid-cols-2">
        <Fact icon={ShieldCheck} label="Regional boundary" />
        <Fact icon={Globe2} label="Sandbox and Build" />
      </div>
      <RegionOptions regions={regions} next={next} intent="build" />
    </CloudShell>
  );
}

function Fact({ icon: Icon, label }: { icon: typeof Globe2; label: string }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75">
      <Icon className="size-4 text-[#f4d44d]" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
