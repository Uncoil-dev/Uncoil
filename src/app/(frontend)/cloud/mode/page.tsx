import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, Wrench } from "lucide-react";

import { CloudShell } from "@/components/cloud/cloud-shell";
import { getUncoilRegion } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Explore or build with Uncoil",
  description: "Open a populated Uncoil Sandbox or create a live regional project.",
  robots: { index: false, follow: false },
};

export default function CloudModePage() {
  const region = getUncoilRegion();
  return (
    <CloudShell
      step="step 02 of 02"
      eyebrow={`${region.flag} ${region.name} cloud`}
      title="Choose your path."
      body={`Explore a populated read-only Uncoil workspace, or build a live project in ${region.location}.`}
      image="/images/company/demo-play.png"
      footer={
        <Link href="/cloud" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Change region
        </Link>
      }
    >
      <div className="grid gap-4">
        <Link href="/demo/project" className="group border border-[#f4d44d] bg-[#f4d44d] p-7 text-black transition-colors hover:bg-white">
          <Sparkles className="size-7" aria-hidden="true" />
          <span className="mt-10 block font-pixel text-5xl leading-none tracking-[-0.06em]">Sandbox</span>
          <span className="mt-3 block text-sm leading-6 text-black/70">Open the populated Uncoil demo. No account or live telemetry required.</span>
          <span className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">Open playground <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>
        <Link href="/sign-up?intent=build&redirect_url=%2Fonboarding" className="group border border-white/20 bg-[#111] p-7 transition-colors hover:border-[#f4d44d]">
          <Wrench className="size-7 text-[#f4d44d]" aria-hidden="true" />
          <span className="mt-10 block font-pixel text-5xl leading-none tracking-[-0.06em]">Build</span>
          <span className="mt-3 block text-sm leading-6 text-white/60">Create a real project, API key and regional telemetry boundary.</span>
          <span className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4d44d]">Start building <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
        </Link>
      </div>
    </CloudShell>
  );
}
