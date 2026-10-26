"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { DitherField } from "@/components/auth/dither-field";
import { BrandLogo } from "@/components/brand-logo";
import { getRegionForHostname, getTracifyRegion } from "@/lib/regions";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password" | "invitation" | "device" | "error";

const copy = {
  "sign-in": { img: "/images/landing/hero-graph.png", eyebrow: "Workspace access", title: "Pick up where the last run left off.", note: "Pick the run that went wrong and follow it step by step, from the first prompt to the last tool call.", marker: "Known operator" },
  "sign-up": { img: "/images/landing/capture-streams.png", eyebrow: "Create workspace", title: "See your first agent run as a map.", note: "Install the SDK, run your agent once, and watch every step appear as a map. No credit card.", marker: "New workspace" },
  "forgot-password": { img: "/images/landing/logs-wall.png", eyebrow: "Account recovery", title: "Locked out? Back in a minute.", note: "We send a time-limited recovery path without revealing whether an account exists.", marker: "Recovery channel" },
  "reset-password": { img: "/images/landing/horizon-sun.png", eyebrow: "New credentials", title: "New password. Same history.", note: "A successful reset invalidates existing sessions and restores a clean boundary.", marker: "Credential rotation" },
  invitation: { img: "/images/landing/globe-orbits.png", eyebrow: "Team invitation", title: "Join your team's traces.", note: "Accept the organization invitation to inspect and improve runs with the team.", marker: "Organization link" },
  device: { img: "/images/landing/capture-streams.png", eyebrow: "Connect your terminal", title: "Connect your code to a project.", note: "Confirm the code your terminal shows, pick a project, and the key goes straight to your machine.", marker: "Terminal link" },
  error: { img: "/images/landing/failure-shatter.png", eyebrow: "Authentication status", title: "That sign-in didn't go through.", note: "The workspace remains protected. Review the status and return through a valid sign-in path.", marker: "Boundary event" },
};


export function AuthShell({ mode, children }: { mode: AuthMode; children: ReactNode }) {
  const modeCopy = copy[mode];
  const [regionId, setRegionId] = useState(getTracifyRegion().id);
  useEffect(() => {
    // The host is only available in the browser; this replaces the deployment fallback after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegionId(getRegionForHostname(window.location.host) ?? getTracifyRegion().id);
  }, []);
  const region = getTracifyRegion(regionId);

  return (
    <main className="grid min-h-svh bg-[#f4d44d] text-black selection:bg-[#090909] selection:text-[#f4d44d] lg:grid-cols-[minmax(380px,0.85fr)_minmax(0,1fr)]">
      <aside className="relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden bg-[#090909] p-6 text-[#eceae3] sm:p-8 md:p-10 lg:min-h-svh">
        <Image src={modeCopy.img} alt="" fill priority unoptimized sizes="(min-width:1024px) 45vw, 100vw" className="-z-10 object-cover opacity-30 [image-rendering:pixelated]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,#090909_10%,rgba(9,9,9,0.88)_55%,rgba(9,9,9,0.65)_100%)]" />
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Tracify home" className="active-press focus-visible:outline-2 focus-visible:outline-offset-4"><BrandLogo className="text-[#eceae3]" /></Link>
          <Link href={process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.tracify.tech"} className="active-press hidden min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/60 hover:text-white sm:flex">Back to site <ArrowUpRight className="size-3.5" /></Link>
        </div>
        <div className="mt-10 lg:mt-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">{modeCopy.marker}</p>
          <h1 className="mt-4 max-w-xl font-pixel text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.88] tracking-[-0.065em]">{modeCopy.title}</h1>
        </div>
      </aside>
      <section className="relative isolate flex flex-col overflow-hidden px-5 py-6 sm:px-8 md:px-12">
        <DitherField vivid />
        <div className="flex justify-end">
          <Link href={`/cloud?next=/${mode === "sign-up" ? "sign-up" : "sign-in"}`} className="inline-flex min-h-11 items-center font-mono text-[10px] uppercase tracking-[0.14em] text-black hover:text-black/60">{region.flag} {region.shortName} region · Change</Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="dark-card w-full max-w-[480px] border border-black bg-[#090909] text-[#eceae3] shadow-[8px_8px_0_#090909]">
            <div className="h-[3px] bg-[#f4d44d]" />
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50 md:px-8"><span>{modeCopy.eyebrow}</span><span>{region.shortName}</span></div>
            <div className="p-5 md:p-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
