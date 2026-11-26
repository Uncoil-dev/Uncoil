import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AgentSetup } from "@/components/marketing/landing/agent-setup";
import { Reveal } from "@/components/marketing/landing/reveal";
import { pricingCheckoutHref } from "@/lib/billing-links";
import { formatPrice, monthlyPrice, plans } from "@/lib/pricing-plans";
import { LEGS, ROBOT_TOP } from "./pixels";

const FILL: Record<string, string> = { C: "#eceae3", K: "#090909", Y: "#f4d44d" };

/** The same robot sprite the canvas draws, as crisp SVG squares for static spots. */
export function RobotSvg({ className = "" }: { className?: string }) {
  const rows = [...ROBOT_TOP, ...LEGS[0]];
  return (
    <svg viewBox={`0 0 10 ${rows.length}`} shapeRendering="crispEdges" className={className} aria-hidden="true">
      {rows.flatMap((row, y) => [...row].map((ch, x) => (FILL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={FILL[ch]} /> : null)))}
    </svg>
  );
}

// A dithered cream block face, the same texture the canvas uses for stones.
const STONE = "bg-[#eceae3] [background-image:radial-gradient(#090909_0.9px,transparent_1.1px)] [background-size:6px_6px]";

export function SetupLevel() {
  return (
    <section id="pw-setup" className="relative scroll-mt-16 bg-[#090909] px-3 pb-16 pt-16 md:px-10 md:pb-24" aria-label="Set up Uncoil with one prompt">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-end justify-between gap-6 px-2 pb-6 md:px-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]/60">Your turn · stop 01 for real</p>
            <h2 className="mt-3 font-pixel text-[clamp(2.4rem,6vw,5rem)] leading-[0.88] tracking-[-0.07em] text-[#eceae3]">Start walking.</h2>
          </div>
          <RobotSvg className="hidden h-28 w-auto shrink-0 [image-rendering:pixelated] md:block" />
        </div>
        <div className="border-4 border-[#eceae3]">
          <div className="flex items-center justify-between border-b-4 border-[#eceae3] bg-[#eceae3] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black">
            <span>Level 01 · one paste</span>
            <span className="flex gap-1" aria-hidden="true">
              <span className="size-2.5 bg-black" />
              <span className="size-2.5 bg-black" />
              <span className="size-2.5 bg-[#f4d44d] outline outline-2 outline-black" />
            </span>
          </div>
          <AgentSetup />
        </div>
      </div>
    </section>
  );
}

const STEP_H = ["md:h-[18rem]", "md:h-[23rem]", "md:h-[28rem]"];

export function PricingStairs() {
  return (
    <section className="relative overflow-hidden bg-[#090909] px-5 pt-20 text-[#eceae3] md:px-10 md:pt-28" aria-labelledby="pw-pricing-title">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#eceae3]/60">Pick your level</p>
            <h2 id="pw-pricing-title" className="mt-4 max-w-3xl font-pixel text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.88] tracking-[-0.07em]">Free to start. One step at a time.</h2>
          </div>
          <Link href="/pricing" className="inline-flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-[#f4d44d]">
            Compare every plan <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <ol className="mt-14 grid gap-4 md:mt-20 md:grid-cols-3 md:items-end md:gap-0">
          {plans.map((plan, i) => {
            const price = formatPrice(monthlyPrice(plan, "monthly"));
            const href = plan.id === "free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.id, "monthly"));
            return (
              <li key={plan.id} className={i === 0 ? "" : i === 1 ? "ml-[6%] md:ml-0" : "ml-[12%] md:ml-0"}>
                <Reveal delay={i * 0.12} className="relative">
                  {i === 1 && <RobotSvg className="absolute -top-[5.5rem] left-6 h-20 w-auto [image-rendering:pixelated]" />}
                  <div className="flex items-end justify-between gap-3 px-1 pb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#eceae3]/60">Level 0{i + 1}</p>
                      <h3 className="mt-1 font-pixel text-3xl tracking-[-0.05em]">{plan.name}</h3>
                    </div>
                    <p className="font-pixel text-5xl tracking-[-0.06em] md:text-6xl">
                      {price}
                      <span className="ml-1 font-mono text-[10px] tracking-[0.1em] text-[#eceae3]/60">/mo</span>
                    </p>
                  </div>
                  <div className={`${STONE} flex flex-col border-t-4 ${i === 2 ? "border-[#f4d44d]" : "border-[#eceae3]"} p-5 text-black md:border-l-2 md:border-[#090909] md:p-6 ${STEP_H[i]}`}>
                    <div className="bg-[#eceae3] p-3">
                      <p className="text-[15px] leading-6">{plan.line}</p>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-black/65">
                        {plan.spans} spans/mo · {plan.retention} · {plan.members} {plan.members === "1" ? "member" : "members"}
                      </p>
                      <ul className="mt-3 grid gap-1.5 font-mono text-[11px] uppercase tracking-[0.06em]">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <span className="size-1.5 shrink-0 bg-black" aria-hidden="true" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link href={href} className={`mt-auto flex min-h-12 items-center justify-between px-4 font-mono text-[10px] uppercase tracking-[0.14em] max-md:mt-5 ${i === 1 ? "bg-[#f4d44d] text-black hover:bg-black hover:text-[#f4d44d]" : "bg-black text-[#eceae3] hover:bg-[#f4d44d] hover:text-black"}`}>
                      {plan.id === "free" ? "Start free" : `Choose ${plan.name}`} <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 pb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#eceae3]/60">No card for Free. Enterprise has its own retention and support. <Link href="/contact" className="underline underline-offset-4 hover:text-[#f4d44d]">Talk to us</Link></p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#090909] px-5 pt-20 text-center text-[#eceae3] md:px-10 md:pt-28">
      <Reveal className="relative z-10">
        <RobotSvg className="mx-auto h-24 w-auto [image-rendering:pixelated]" />
        <h2 className="mx-auto mt-8 max-w-5xl font-pixel text-[clamp(3rem,9vw,8rem)] leading-[0.86] tracking-[-0.08em]">The path is clear.</h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#eceae3]/85">Paste one prompt, run your agent, open the map. The free plan needs no card.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-8 py-5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-black shadow-[6px_6px_0_0_#eceae3] hover:bg-[#eceae3]">
            Start free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link href="/docs" className="inline-flex items-center border-2 border-[#eceae3] px-8 py-5 font-mono text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#eceae3] hover:text-black">
            Read the docs
          </Link>
        </div>
      </Reveal>
      <div className="relative -mx-5 -mt-[18vw] aspect-square md:-mx-10 md:-mt-[10vw] md:aspect-[12/5]" aria-hidden="true">
        <Image src="/images/landing/horizon-sun.png" alt="" fill unoptimized sizes="100vw" className="object-cover object-top [image-rendering:pixelated]" />
      </div>
    </section>
  );
}
