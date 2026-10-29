"use client";

import { appHref } from "@/lib/app-links";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Pro",
    price: "$19",
    note: "/mo",
    cta: "Start building",
    href: appHref("/sign-up?intent=beta&plan=pro"),
    popular: true,
    lines: [
      ["spans", "100,000"],
      ["retention", "30 days"],
      ["projects", "5"],
      ["members", "3"],
      ["alerts", "Slack"],
    ],
  },
  {
    name: "Team",
    price: "$39",
    note: "/mo",
    cta: "Start building",
    href: appHref("/sign-up?intent=beta&plan=team"),
    popular: false,
    lines: [
      ["spans", "1,000,000"],
      ["retention", "90 days"],
      ["projects", "unlimited"],
      ["members", "10"],
      ["alerts", "Slack"],
      ["reports", "PDF-ready"],
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cta: "Contact us",
    href: "mailto:sales@uncoil.dev",
    popular: false,
    lines: [
      ["spans", "unlimited"],
      ["retention", "custom"],
      ["SSO", "SAML / OIDC"],
      ["deployment", "on-prem"],
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.1, duration: 0.45, ease: [0.23, 1, 0.32, 1] as const },
  }),
};

export function PricingTeaser() {
  const [mounted] = useState(true);

  return (
    <section className="w-full bg-[#050505] py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-8">
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[600px]">
            <div className="mb-5 inline-flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.3em] text-[#666666]">
              <span className="h-px w-6 bg-[#666666]" />
              Pricing
            </div>
            <h2
              className="font-pixel text-white font-bold tracking-tighter uppercase leading-[1.05]"
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: "clamp(28px, 5vw, 44px)",
              }}
            >
              Start with traces.
              <br />
              <span className="text-[#555555]">Scale into operations.</span>
            </h2>
            <p className="mt-4 text-[#888888] text-[15px] leading-relaxed">
              10,000 free spans to try. Upgrade when you outgrow.
            </p>
          </div>
          <Link
            href="/pricing"
            className="group flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#CCCCCC] transition-colors hover:text-white"
          >
            View pricing details
            <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              custom={index}
              initial="hidden"
              animate={mounted ? "visible" : "hidden"}
              variants={cardVariants}
              className={`flex flex-col border bg-[#0A0A0A] ${
                plan.popular ? "border-white" : "border-[#2A2A2A] hover:border-[#555555]"
              } transition-all duration-300`}
            >
              <div className="flex items-center gap-2 border-b border-[#1A1A1A] bg-[#080808] px-4 py-2.5 font-mono text-[11px] text-[#555555]">
                <span className="text-[#10B981]">$</span>
                <span>./plan</span>
                <span className="text-[#666666]">--{plan.name.toLowerCase()}</span>
              </div>

              <div className="flex flex-1 flex-col p-6 pt-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl tracking-tight text-white">
                    {plan.price}
                  </span>
                  {plan.note && (
                    <span className="font-mono text-[12px] text-[#555555]">
                      {plan.note}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex-1 space-y-2.5">
                  {plan.lines.map(([key, val]) => (
                    <div key={key} className="flex items-center gap-3 font-mono text-[12px]">
                      <span className="text-[#444444]">&gt;</span>
                      <span className="text-[#666666]">{key}</span>
                      <span className="ml-auto text-[#CCCCCC]">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-8">
                  <Link href={plan.href}>
                    <Button
                      variant={plan.popular ? "default" : "secondary"}
                      className={`h-11 w-full rounded-none font-mono text-[11px] uppercase tracking-widest transition-all duration-200 ${
                        plan.popular ? "hover:bg-[#CCCCCC]" : "hover:bg-[#1A1A1A] hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {plan.cta}
                        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="mt-5 border border-[#2A2A2A] bg-[#0A0A0A] transition-colors hover:border-[#555555]"
        >
          <div className="flex items-center gap-2 border-b border-[#1A1A1A] bg-[#080808] px-5 py-3 font-mono text-[11px] text-[#555555]">
            <span className="text-[#10B981]">$</span>
            <span>./plan</span>
            <span className="text-[#666666]">--free</span>
          </div>
          <div className="flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-8">
              <div className="shrink-0">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#666666]">
                  Experimenting
                </div>
                <div className="mt-2 font-mono text-2xl uppercase text-white">Free</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-3xl text-white">$0</span>
                  <span className="font-mono text-[11px] text-[#555555]">/ mo</span>
                </div>
              </div>
              <div className="hidden h-16 w-px bg-[#1A1A1A] md:block" />
              <div className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">Spans</div>
                  <div className="mt-0.5 font-mono text-[13px] text-white">10,000 / mo</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">Retention</div>
                  <div className="mt-0.5 font-mono text-[13px] text-white">7 days</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">Projects</div>
                  <div className="mt-0.5 font-mono text-[13px] text-white">1</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">Support</div>
                  <div className="mt-0.5 font-mono text-[13px] text-white">Community</div>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <Link href={appHref("/sign-up")}>
                <Button
                  variant="secondary"
                  className="h-11 rounded-none font-mono text-[11px] uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white"
                >
                  Start free
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 border border-[#2A2A2A] bg-[#0A0A0A]/50 px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#555555]">
            Prompt workflows, evaluations, experiments, runtime controls, and integrations are available now. Contact us for production self-hosting and alerting setup.
          </p>
        </div>
      </div>
    </section>
  );
}
