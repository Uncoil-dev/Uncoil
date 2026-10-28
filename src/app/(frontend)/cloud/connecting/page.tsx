"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { UNCOIL_REGIONS, parseUncoilRegion } from "@/lib/regions";

export default function CloudConnectingPage() {
  const params = useSearchParams();
  const regionId = parseUncoilRegion(params.get("region")) ?? "eu";
  const next = params.get("next") || "/sign-in";
  const intent = params.get("intent") || "build";
  const region = UNCOIL_REGIONS[regionId];

  useEffect(() => {
    const target = `/api/region/select?region=${encodeURIComponent(regionId)}&next=${encodeURIComponent(next)}&intent=${encodeURIComponent(intent)}`;
    const timer = window.setTimeout(() => window.location.assign(target), 1200);
    return () => window.clearTimeout(timer);
  }, [intent, next, regionId]);

  return <main className="flex min-h-screen items-center justify-center bg-[#090909] p-6 text-[#eceae3]"><div role="status" aria-live="polite" className="max-w-lg text-center"><div className="mx-auto flex w-24 flex-col items-end gap-1.5" aria-hidden="true">{[100, 68, 36].map((w, i) => <span key={w} className="h-3 animate-pulse bg-[#f4d44d]" style={{ width: `${w}%`, animationDelay: `${i * 0.18}s` }} />)}</div><p className="mt-8 font-pixel text-5xl tracking-[-0.05em]">Connecting to {region.name} cloud…</p><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">Preparing your regional handoff</p></div></main>;
}
