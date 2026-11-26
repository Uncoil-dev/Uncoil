"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { appHref } from "@/lib/app-links";
import { formatPrice, plans } from "@/lib/pricing-plans";
import { OutputHead, usePrinted } from "./turn";

// Torn paper edge for the bottom of each receipt.
const TORN = "polygon(0 0,100% 0,100% calc(100% - 8px),96% 100%,92% calc(100% - 8px),88% 100%,84% calc(100% - 8px),80% 100%,76% calc(100% - 8px),72% 100%,68% calc(100% - 8px),64% 100%,60% calc(100% - 8px),56% 100%,52% calc(100% - 8px),48% 100%,44% calc(100% - 8px),40% 100%,36% calc(100% - 8px),32% 100%,28% calc(100% - 8px),24% 100%,20% calc(100% - 8px),16% 100%,12% calc(100% - 8px),8% 100%,4% calc(100% - 8px),0 100%)";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="shrink-0">{k}</span>
      <span aria-hidden="true" className="min-w-2 flex-1 overflow-hidden whitespace-nowrap text-black/30">
        {".".repeat(60)}
      </span>
      <span className="shrink-0">{v}</span>
    </p>
  );
}

/** A tiny barcode drawn from the plan name, so each receipt gets its own. */
function Barcode({ seed }: { seed: string }) {
  const bars = Array.from({ length: 44 }, (_, i) => (seed.charCodeAt(i % seed.length) * (i + 3)) % 4);
  let x = 0;
  return (
    <svg viewBox="0 0 132 18" className="h-6 w-full" shapeRendering="crispEdges" aria-hidden="true">
      {bars.map((b, i) => {
        const w = b === 0 ? 1 : b;
        const rect = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={18} fill="#090909" /> : null;
        x += w;
        return rect;
      })}
    </svg>
  );
}

export function Receipts() {
  const reduce = useReducedMotion();
  const printed = usePrinted();
  return (
    <div className="border-2 border-[#090909] bg-[#090909] text-[#eceae3]">
      <OutputHead left="printing 3 plans" right="billed monthly" />
      <div className="grid gap-x-6 gap-y-10 px-4 pb-10 pt-0 md:grid-cols-3 md:px-8 md:pb-12">
        {plans.map((plan, i) => (
          <div key={plan.id} className="flex min-w-0 flex-col">
            {/* The printer slot the receipt feeds out of */}
            <div className="h-3 border-x-2 border-b-2 border-white/25 bg-black" aria-hidden="true" />
            <motion.article
              initial={reduce ? false : { clipPath: "inset(0 0 100% 0)", y: -24 }}
              animate={printed ? { clipPath: "inset(0 0 0% 0)", y: 0 } : undefined}
              transition={{ duration: 1.3, delay: 0.5 + i * 0.25, ease: [0.45, 0, 0.2, 1] }}
              className="mx-2 font-mono text-[12px] text-[#090909]"
              aria-label={`${plan.name} plan, ${formatPrice(plan.monthly)} a month`}
            >
              <div style={{ clipPath: TORN }} className="bg-[#eceae3] px-5 pb-8 pt-5">
                <p className="flex justify-between text-[10px] uppercase tracking-[0.16em] text-black/55">
                  <span>uncoil · plan</span>
                  <span>#{String(i + 1).padStart(3, "0")}</span>
                </p>
                <div className="mt-4 flex items-end justify-between gap-3 border-b-2 border-dashed border-black/40 pb-4">
                  <h3 className="font-pixel text-4xl tracking-[-0.06em]">{plan.name}</h3>
                  <p className="font-pixel text-5xl leading-none tracking-[-0.07em]">
                    {formatPrice(plan.monthly)}
                    <span className="ml-1 font-mono text-[11px] tracking-normal text-black/55">/mo</span>
                  </p>
                </div>
                <p className="mt-3 font-sans text-sm text-black/70">{plan.line}</p>
                <div className="mt-4 space-y-1">
                  <Row k="spans / month" v={plan.spans} />
                  <Row k="kept for" v={plan.retention} />
                  <Row k="members" v={plan.members} />
                  <Row k="projects" v={plan.projects} />
                </div>
                <ul className="mt-4 space-y-1 border-t-2 border-dashed border-black/40 pt-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true">+</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Barcode seed={plan.id} />
                  <p className="mt-1 text-center text-[9px] uppercase tracking-[0.3em] text-black/50">{plan.monthly ? "thank you" : "no card needed"}</p>
                </div>
              </div>
            </motion.article>
            <Link
              href={appHref("/sign-up")}
              className={`mx-2 mt-5 inline-flex min-h-11 items-center justify-center font-mono text-[11px] uppercase tracking-[0.14em] ${plan.id === "pro" ? "bg-[#f4d44d] text-black hover:bg-white" : "border border-white/35 hover:bg-white hover:text-black"}`}
            >
              {plan.monthly ? `Start ${plan.name}` : "Start free"}
            </Link>
          </div>
        ))}
      </div>
      <p className="border-t border-white/15 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45 md:px-8">
        Need more than 2m spans? <Link href="/pricing" className="text-[#eceae3] underline underline-offset-4 hover:text-[#f4d44d]">Full pricing and Enterprise</Link>
      </p>
    </div>
  );
}
