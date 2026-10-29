"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getAvailableRegions, type UncoilRegionId } from "@/lib/regions";

type RegionState = "checking" | "operational" | "unavailable";

const beat = "M0 40 L60 40 L72 40 L80 14 L90 66 L98 40 L170 40 L230 40 L242 40 L250 14 L260 66 L268 40 L340 40 L400 40 L412 40 L420 14 L430 66 L438 40 L500 40";
const flat = "M0 40 L500 40";

function Pulse({ state }: { state: RegionState }) {
  const reduce = useReducedMotion();
  const live = state === "operational";
  return (
    <svg viewBox="0 0 500 80" className="h-20 w-full overflow-visible" role="img" aria-label={live ? "Heartbeat line, region responding" : state === "checking" ? "Checking region" : "Flat line, region not responding"}>
      <path d={flat} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="2" fill="none" />
      <motion.path
        d={live ? beat : flat}
        stroke={live ? "#f4d44d" : "#eceae3"}
        strokeWidth="3"
        strokeLinejoin="miter"
        strokeDasharray={live ? undefined : "6 10"}
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        animate={live ? { pathLength: 1 } : { pathLength: 1, opacity: state === "checking" ? [0.3, 1, 0.3] : 0.5 }}
        transition={live ? { duration: 2.4, ease: "linear", repeat: reduce ? 0 : Infinity, repeatDelay: 0.6 } : { duration: 1.4, repeat: state === "checking" && !reduce ? Infinity : 0 }}
      />
    </svg>
  );
}

export function RegionalStatusBoard() {
  const [states, setStates] = useState<Record<UncoilRegionId, RegionState>>({ eu: "checking", us: "checking" });
  const [ms, setMs] = useState<Partial<Record<UncoilRegionId, number>>>({});

  useEffect(() => {
    const controllers = getAvailableRegions().map((region) => {
      const controller = new AbortController();
      const started = performance.now();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      fetch(`${region.origin}/api/health/region`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const body = await response.json() as { ok?: boolean; region?: string };
          const operational = response.ok && body.ok === true && body.region === region.id;
          setStates((current) => ({ ...current, [region.id]: operational ? "operational" : "unavailable" }));
          if (operational) setMs((current) => ({ ...current, [region.id]: Math.round(performance.now() - started) }));
        })
        .catch(() => setStates((current) => ({ ...current, [region.id]: "unavailable" })))
        .finally(() => window.clearTimeout(timeout));
      return controller;
    });
    return () => controllers.forEach((controller) => controller.abort());
  }, []);

  return (
    <section className="bg-[#090909] px-5 py-20 text-[#eceae3] md:px-10 md:py-28">
      <div className="mx-auto max-w-[1320px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">Regional cloud probes / checked live from your browser</p>
        <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.4rem,5.5vw,5rem)] leading-[0.92] tracking-[-0.07em]">Is each region answering right now?</h2>
        <div className={`mt-14 grid gap-4 ${getAvailableRegions().length > 1 ? "md:grid-cols-2" : ""}`}>
          {getAvailableRegions().map((region) => {
            const state = states[region.id];
            const label = state === "operational" ? "Responding" : state === "unavailable" ? "Not responding" : "Checking";
            return (
              <article key={region.id} className={`border p-7 ${state === "operational" ? "border-[#f4d44d]" : "border-white/15"} bg-[#111]`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">{region.flag} {region.shortName} cloud</p>
                    <h3 className="mt-4 font-pixel text-5xl leading-none tracking-[-0.06em]">{region.location}</h3>
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">{region.hostname}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${state === "operational" ? "bg-[#f4d44d] text-black" : "border border-white/25 text-white/70"}`} role="status">
                    {state === "operational" && <span className="size-1.5 animate-pulse bg-black" aria-hidden="true" />}
                    {label}{state === "operational" && ms[region.id] !== undefined ? ` · ${ms[region.id]} ms` : ""}
                  </span>
                </div>
                <div className="mt-8 border-t border-white/15 pt-6"><Pulse state={state} /></div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
