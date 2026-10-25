"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { pricingCheckoutHref, type BillingInterval } from "@/lib/billing-links";
import { formatPrice, monthlyPrice, planForSpans, plans, type Plan } from "@/lib/pricing-plans";
import { getCopy, type Locale } from "@/lib/i18n";

type PricingCopy = ReturnType<typeof getCopy>["pricing"];

const CELLS = 24;

/** Pixel meter: how much of the biggest plan's monthly span budget this plan covers (log scale). */
function CapacityMeter({ limit, dark }: { limit: number; dark?: boolean }) {
  const filled = Math.round((Math.log10(limit / 5_000) / Math.log10(2_000_000 / 5_000)) * CELLS);
  return (
    <div className="mt-6 flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: CELLS }, (_, i) => (
        <span key={i} className={`h-3 flex-1 ${i < filled ? (dark ? "bg-[#f4d44d]" : "bg-black") : dark ? "bg-white/15" : "bg-black/15"}`} />
      ))}
    </div>
  );
}

function BillingToggle({ interval, onChange, dark, t }: { interval: BillingInterval; onChange: (v: BillingInterval) => void; dark?: boolean; t: PricingCopy }) {
  return (
    <div className={`relative flex w-fit border-2 p-1 font-mono text-[10px] uppercase tracking-[0.12em] ${dark ? "border-white/40 text-white" : "border-black"}`}>
      {(["monthly", "annual"] as const).map((value) => {
        const on = value === interval;
        return (
          <button key={value} type="button" aria-pressed={on} onClick={() => onChange(value)} className={`relative z-10 min-h-11 px-5 ${on ? (dark ? "text-black" : "text-[#f4d44d]") : ""}`}>
            {on && <motion.span layoutId={`billing-pill-${dark ? "d" : "l"}`} className={`absolute inset-0 -z-10 ${dark ? "bg-[#f4d44d]" : "bg-black"}`} transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            {value === "monthly" ? t.monthly : t.annual}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({ plan, interval, featured, recommended, t }: { plan: Plan; interval: BillingInterval; featured: boolean; recommended: boolean; t: PricingCopy }) {
  const reduce = useReducedMotion();
  const label = formatPrice(monthlyPrice(plan, interval));
  const muted = featured ? "text-white/55" : "text-black/55";
  return (
    <div className={`relative flex flex-col p-7 transition-colors ${featured ? "bg-black text-[#eceae3]" : "bg-[#eceae3] hover:bg-[#f4d44d]"} ${recommended ? "outline outline-4 -outline-offset-4 outline-[#f4d44d]" : ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-4xl tracking-[-0.06em]">{plan.name}</h3>
        {featured && <span className="bg-[#f4d44d] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-black">{t.popular}</span>}
      </div>
      <p className={`mt-2 text-sm ${featured ? "text-white/65" : "text-black/65"}`}>{t.plans[plan.id].line}</p>
      <div className="mt-8 flex h-20 items-end gap-2 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={label} initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className={`font-pixel text-7xl leading-none tracking-[-0.07em] ${featured ? "text-[#f4d44d]" : ""}`}>
            {label}
          </motion.span>
        </AnimatePresence>
        <span className={`pb-2 font-mono text-[10px] uppercase ${muted}`}>{t.perMonth}</span>
      </div>
      <p className={`mt-1 h-4 font-mono text-[9px] uppercase ${muted}`}>{interval === "annual" && plan.monthly ? t.perYearSave(formatPrice(monthlyPrice(plan, interval) * 12), formatPrice(plan.monthly * 12 - monthlyPrice(plan, interval) * 12)) : ""}</p>
      <CapacityMeter limit={plan.spanLimit} dark={featured} />
      <p className={`mt-2 font-mono text-[10px] uppercase tracking-[0.1em] ${muted}`}>{plan.spans} {t.spansPerMonth}</p>
      <ul className="mt-6 grid gap-2.5 text-sm">
        {[`${t.rows[1][plan.id === "free" ? 1 : plan.id === "pro" ? 2 : 3]} ${t.retention}`, `${t.members(plan.members)} · ${t.projects(plan.projects)}`, ...t.plans[plan.id].features].map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className={`mt-1.5 size-1.5 shrink-0 ${featured ? "bg-[#f4d44d]" : "bg-black"}`} />
            {f}
          </li>
        ))}
      </ul>
      {recommended && <p className={`mt-6 font-mono text-[9px] uppercase tracking-[0.14em] ${featured ? "text-[#f4d44d]" : "text-black"}`}>◼ {t.fits}</p>}
      <Link
        href={plan.id === "free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(plan.id, interval))}
        className={`mt-auto flex min-h-12 items-center justify-between px-4 font-mono text-[10px] uppercase tracking-[0.13em] ${featured ? "bg-[#f4d44d] text-black hover:bg-white" : "border-2 border-black hover:bg-black hover:text-white"}`}
        style={{ marginTop: "2.5rem" }}
      >
        {plan.id === "free" ? t.startFree : t.getPlan(plan.name)}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function format(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}m`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

/** Runs per month on a log scale: slider 0..100 -> 100..300,000 */
const MIN_RUNS = 100;
const MAX_RUNS = 300_000;
const runsFromSlider = (v: number) => {
  const raw = MIN_RUNS * Math.pow(MAX_RUNS / MIN_RUNS, v / 100);
  const step = raw < 1000 ? 10 : raw < 10_000 ? 100 : 1000;
  return Math.round(raw / step) * step;
};
const sliderFromRuns = (runs: number) => Math.round((Math.log(runs / MIN_RUNS) / Math.log(MAX_RUNS / MIN_RUNS)) * 100);

type EstimateState = { slider: number; steps: number };

function estimateSpans({ slider, steps }: EstimateState) {
  return runsFromSlider(slider) * steps;
}

function Calculator({ value, onChange, interval, locale, t }: { value: EstimateState; onChange: (v: EstimateState) => void; interval: BillingInterval; locale: Locale; t: PricingCopy }) {
  const c = t.calc;
  const { slider, steps } = value;
  const runs = runsFromSlider(slider);
  const spans = estimateSpans(value);
  const match = planForSpans(spans);
  const reduce = useReducedMotion();
  const pct = Math.min(100, (Math.log10(Math.max(spans, 5_000) / 5_000) / Math.log10(2_000_000 / 5_000)) * 100);
  const over = !match;
  const numberLocale = locale === "de" ? "de-DE" : locale === "no" ? "nb-NO" : "en-US";
  const priceLabel = over ? c.custom : match.id === "free" ? c.free : formatPrice(monthlyPrice(match, interval));

  return (
    <section className="relative overflow-hidden bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32" aria-labelledby="calc-title">
      <div className="mx-auto grid max-w-[1320px] gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{c.eyebrow}</p>
          <h2 id="calc-title" className="mt-5 font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">{c.title}</h2>
          <p className="mt-6 max-w-md text-base leading-7 text-white/70">{c.body}</p>
        </Reveal>

        <Reveal delay={0.1} className="border border-white/20 bg-[#090909]">
          <div className="grid gap-8 p-6 md:p-8">
            <div>
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                <label htmlFor="runs-per-month">{c.runs}</label>
                <output htmlFor="runs-per-month" className="font-pixel text-3xl normal-case tracking-[-0.05em] text-[#eceae3]">{runs.toLocaleString(numberLocale)}</output>
              </div>
              <input id="runs-per-month" type="range" min={0} max={100} value={slider} onChange={(e) => onChange({ ...value, slider: Number(e.target.value) })} className="pricing-range mt-4 w-full" aria-valuetext={`${runs.toLocaleString(numberLocale)} ${c.runs}`} />
            </div>
            <div>
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
                <label htmlFor="steps-per-run">{c.steps}</label>
                <output htmlFor="steps-per-run" className="font-pixel text-3xl normal-case tracking-[-0.05em] text-[#eceae3]">{steps}</output>
              </div>
              <input id="steps-per-run" type="range" min={1} max={40} value={steps} onChange={(e) => onChange({ ...value, steps: Number(e.target.value) })} className="pricing-range mt-4 w-full" aria-valuetext={`${steps} ${c.steps}`} />
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label={c.examples}>
              {c.presets.map(([label, r, st]) => (
                <button key={label} type="button" onClick={() => onChange({ slider: sliderFromRuns(r), steps: st })} className="min-h-11 border border-white/30 px-4 font-mono text-[10px] uppercase tracking-[0.12em] hover:bg-[#f4d44d] hover:text-black">
                  {label}
                </button>
              ))}
            </div>

            <div className="border-t border-white/15 pt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">{c.price}</p>
                  <div className="mt-2 flex h-[4.5rem] items-end gap-2 overflow-hidden md:h-20" aria-live="polite">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={priceLabel} initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className="font-pixel text-6xl leading-none tracking-[-0.07em] text-[#f4d44d] md:text-7xl">
                        {priceLabel}
                      </motion.span>
                    </AnimatePresence>
                    {!over && match.id !== "free" && <span className="pb-2 font-mono text-[10px] uppercase text-white/50">{t.perMonth}</span>}
                  </div>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
                    {format(spans)} {c.spans} · {c.summary(runs.toLocaleString(numberLocale), steps)}
                    {interval === "annual" && !over && match.id !== "free" ? ` · ${c.annualNote}` : ""}
                  </p>
                </div>
                <div className="text-right" aria-live="polite">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">{c.bestFit}</p>
                  <p className="mt-2 bg-[#f4d44d] px-3 py-1 font-pixel text-3xl tracking-[-0.05em] text-black">{match ? match.name : t.enterprise.name}</p>
                </div>
              </div>

              <div className="relative mt-10 h-10" aria-hidden="true">
                <div className="absolute inset-x-0 top-4 flex gap-[2px]">
                  {Array.from({ length: 48 }, (_, i) => (
                    <span key={i} className={`h-4 flex-1 ${((i + 1) / 48) * 100 <= pct ? "bg-[#f4d44d]" : "bg-white/15"}`} />
                  ))}
                </div>
                {plans.map((plan) => {
                  const at = (Math.log10(plan.spanLimit / 5_000) / Math.log10(2_000_000 / 5_000)) * 100;
                  return (
                    <span key={plan.id} className="absolute top-0 -translate-x-full font-mono text-[9px] uppercase tracking-[0.1em] text-white/60" style={{ left: `${at}%` }}>
                      {plan.name} · {plan.spans}
                      <span className="absolute -bottom-3 right-0 h-3 w-px bg-white/50" />
                    </span>
                  );
                })}
              </div>
              <p className="mt-8 text-sm leading-6 text-white/65">{over ? c.over : match.id === "free" ? c.fitsFree : c.covers(match.name, match.spans)}</p>
              <Link
                href={over ? "/contact" : match.id === "free" ? appHref("/sign-up") : appHref(pricingCheckoutHref(match.id, interval))}
                className="group mt-6 inline-flex items-center gap-3 bg-[#f4d44d] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white"
              >
                {over ? c.talk : match.id === "free" ? t.startFree : t.getPlan(match.name)}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const sampleKinds = [
  ["AGENT", "support-agent"],
  ["LLM", "chat"],
  ["TOOL", "order.lookup"],
  ["TOOL", "docs.search"],
  ["LLM", "chat · retry"],
  ["TOOL", "refund.issue"],
] as const;

/** One run, counted row by row, so "what is a span" is something you watch instead of read. */
function SpanCounter({ t }: { t: PricingCopy }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const [count, setN] = useState(0);
  const n = reduce ? sampleKinds.length : count;
  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => setN((v) => (v >= sampleKinds.length ? v : v + 1)), 450);
    return () => window.clearInterval(id);
  }, [inView, reduce]);
  return (
    <section className="border-y-2 border-black bg-[#eceae3] px-5 py-24 text-black md:px-10 md:py-32" aria-labelledby="span-title">
      <div className="mx-auto grid max-w-[1320px] items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{t.spanEyebrow}</p>
          <h2 id="span-title" className="mt-5 font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">{t.spanTitle}</h2>
          <p className="mt-6 max-w-md text-base leading-7 text-black/70">{t.spanBody}</p>
        </Reveal>
        <div ref={ref} className="border-2 border-black bg-[#090909] font-mono text-[11px] text-[#eceae3]">
          <div className="flex items-center justify-between border-b border-white/15 px-4 py-3 text-[9px] uppercase tracking-[0.14em] text-white/55">
            <span>run_9f3a</span>
            <span className="flex items-center gap-2 text-[#f4d44d]"><span className="font-pixel text-2xl normal-case tracking-[-0.05em]" aria-live="polite">{n}</span>{t.spanCounted(n)}</span>
          </div>
          <ul className="px-4 py-3">
            {sampleKinds.map(([kind, name], i) => {
              const meta = t.runMeta[i];
              return (
                <li key={name} className={`grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b border-white/10 py-3 last:border-0 transition-opacity duration-300 ${i < n ? "opacity-100" : "opacity-15"} ${i === 5 ? "text-[#f4d44d]" : ""}`}>
                  <span className="text-[9px] tracking-[0.1em] text-white/55">{kind}</span>
                  <span>{name}</span>
                  <span className="text-white/45">{meta}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Compare({ interval, t }: { interval: BillingInterval; t: PricingCopy }) {
  return (
    <section className="bg-[#eceae3] px-5 py-24 text-black md:px-10 md:py-32" aria-labelledby="compare-title">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{t.compareEyebrow}</p>
          <h2 id="compare-title" className="mt-5 font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">{t.compareTitle}</h2>
        </Reveal>
        <div className="mt-12 overflow-x-auto border-2 border-black">
          <table className="w-full border-collapse text-left md:min-w-[720px]">
            <caption className="sr-only">{t.compareCaption}</caption>
            <thead>
              <tr className="bg-black text-[#eceae3]">
                <th scope="col" className="p-2.5 font-mono text-[8px] font-normal uppercase tracking-[0.1em] text-white/55 md:p-5 md:text-[10px] md:tracking-[0.14em]">{t.capability}</th>
                {plans.map((plan) => (
                  <th key={plan.id} scope="col" className={`border-l border-white/20 p-2 md:p-5 ${plan.id === "pro" ? "bg-[#f4d44d] text-black" : ""}`}>
                    <span className="block font-pixel text-base tracking-[-0.05em] md:text-3xl">{plan.name}</span>
                    <span className="mt-1 block font-mono text-[8px] font-normal uppercase tracking-[0.04em] opacity-60 md:text-[10px] md:tracking-[0.1em]">{formatPrice(monthlyPrice(plan, interval))}<span className="hidden md:inline"> {t.perMonth}</span></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row) => (
                <tr key={row[0]} className="group border-t border-black/25 hover:bg-[#f4d44d]/40">
                  <th scope="row" className="p-2.5 text-xs font-medium leading-4 md:p-5 md:text-sm md:leading-normal">{row[0]}</th>
                  {row.slice(1).map((cell, i) => (
                    <td key={i} className={`border-l border-black/25 p-2 font-mono text-[9px] uppercase tracking-[0.02em] md:p-5 md:text-[11px] md:tracking-[0.06em] ${cell === "—" ? "text-black/30" : ""}`}>
                      {cell === t.included ? <span className="flex items-center gap-2"><span className="size-2 bg-black" /><span className="sr-only md:not-sr-only">{t.included}</span></span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Faq({ t }: { t: PricingCopy }) {
  return (
    <section className="border-t-2 border-black bg-[#eceae3] px-5 pb-24 text-black md:px-10 md:pb-32" aria-labelledby="faq-title">
      <div className="mx-auto grid max-w-[1320px] gap-12 pt-20 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{t.faqEyebrow}</p>
          <h2 id="faq-title" className="mt-5 font-pixel text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.92] tracking-[-0.07em]">{t.faqTitle}</h2>
        </Reveal>
        <div className="border-t border-black/25">
          {t.faqs.map(([q, a]) => (
            <details key={q} className="group border-b border-black/25">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-pixel text-2xl tracking-[-0.05em] [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="size-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="max-w-xl pb-6 text-sm leading-6 text-black/70">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

const foundingCopy: Record<Locale, { tag: string; line: string; cta: string }> = {
  en: { tag: "Founding members", line: "The first 20 paying teams get 40% off, for as long as they stay.", cta: "Claim it on Pro or Team" },
  de: { tag: "Gründungsmitglieder", line: "Die ersten 20 zahlenden Teams erhalten 40 % Rabatt, solange sie dabei bleiben.", cta: "Mit Pro oder Team sichern" },
  no: { tag: "Grunnleggende medlemmer", line: "De første 20 betalende teamene får 40 % avslag så lenge de er med.", cta: "Ta det med Pro eller Team" },
};

/** Yellow strip above the plans while the founding-member coupon is live. */
function FoundingStrip({ locale }: { locale: Locale }) {
  const c = foundingCopy[locale] ?? foundingCopy.en;
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-[#f4d44d] px-5 py-4">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black">
        <span className="bg-black px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#f4d44d]">{c.tag}</span>
        {c.line}
      </p>
      <Link href="#plans" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-black underline underline-offset-4">
        {c.cta} <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function PricingPage({ locale = "en", founding = false }: { locale?: Locale; founding?: boolean }) {
  const t = getCopy(locale).pricing;
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [estimate, setEstimate] = useState<EstimateState | null>(null);
  const recommended = estimate ? planForSpans(estimateSpans(estimate))?.id ?? null : null;
  const contact = "/contact";

  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader eyebrow={t.eyebrow} title={t.title} lede={t.lede} image="/images/landing/pricing-stairs.png">
        <BillingToggle interval={interval} onChange={setInterval} dark t={t} />
      </PageHeader>

      <section id="plans" className="bg-[#eceae3] px-5 py-20 text-black md:px-10 md:py-28">
        <div className="mx-auto max-w-[1320px]">
          {founding && <FoundingStrip locale={locale} />}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">{interval === "annual" ? t.annualOn : t.annualOff}</p>
            <BillingToggle interval={interval} onChange={setInterval} t={t} />
          </div>
          <div className="grid gap-[2px] border-2 border-black bg-black md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} interval={interval} featured={plan.id === "pro"} recommended={recommended === plan.id} t={t} />
            ))}
            <div className="flex flex-col bg-[#eceae3] p-7 transition-colors hover:bg-[#f4d44d]">
              <h3 className="font-pixel text-4xl tracking-[-0.06em]">{t.enterprise.name}</h3>
              <p className="mt-2 text-sm text-black/65">{t.enterprise.line}</p>
              <div className="mt-8 flex h-20 items-end"><span className="font-pixel text-6xl leading-none tracking-[-0.07em]">{t.enterprise.price}</span></div>
              <p className="mt-1 h-4" />
              <div className="mt-6 flex gap-[2px]" aria-hidden="true">{Array.from({ length: CELLS }, (_, i) => <span key={i} className="h-3 flex-1 bg-black" />)}</div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-black/55">{t.enterprise.spans}</p>
              <ul className="mt-6 grid gap-2.5 text-sm">
                {t.enterprise.features.map((f) => (
                  <li key={f} className="flex gap-2.5"><span className="mt-1.5 size-1.5 shrink-0 bg-black" />{f}</li>
                ))}
              </ul>
              <Link href={contact} className="mt-auto flex min-h-12 items-center justify-between border-2 border-black px-4 font-mono text-[10px] uppercase tracking-[0.13em] hover:bg-black hover:text-white" style={{ marginTop: "2.5rem" }}>
                {t.enterprise.cta} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-black/55">{t.noCard}</p>
        </div>
      </section>

      <Calculator value={estimate ?? { slider: sliderFromRuns(8000), steps: 8 }} onChange={setEstimate} interval={interval} locale={locale} t={t} />
      <SpanCounter t={t} />
      <Compare interval={interval} t={t} />
      <Faq t={t} />

      <section className="overflow-hidden bg-[#090909] px-5 pt-28 text-center text-[#eceae3] md:px-10 md:pt-36">
        <Reveal>
          <h2 className="mx-auto max-w-5xl font-pixel text-[clamp(3rem,9vw,8rem)] leading-[0.88] tracking-[-0.08em]">{t.closeTitle}</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
              {t.closeCta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href={contact} className="inline-flex items-center border border-white/40 px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">{t.closeTalk}</Link>
          </div>
        </Reveal>
        <Reveal className="relative -mx-5 mt-4 aspect-[2/1] md:-mx-10" delay={0.15}>
          <Image src="/images/landing/horizon-sun.png" alt="" fill unoptimized sizes="100vw" className="object-cover [image-rendering:pixelated]" />
        </Reveal>
      </section>
    </div>
  );
}
