"use client";

import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/marketing/landing/hero";
import { Reveal, Ticker } from "@/components/marketing/landing/reveal";
import { SmoothScroll } from "@/components/marketing/landing/smooth-scroll";
import { getCopy, localizedPath, type Locale } from "@/lib/i18n";
import { formatPrice, plans } from "@/lib/pricing-plans";

const cardArt = ["/images/landing/map-flat.png", "/images/landing/cost-city.png", "/images/landing/failure-shatter.png"] as const;

/** Norwegian and German home page: same hero and look as the English landing page, shorter body. */
export function LocalizedHome({ locale }: { locale: Locale }) {
  const t = getCopy(locale);
  const h = t.home;
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <SmoothScroll />
      <Hero locale={locale} />

      <section className="border-y border-white/15 bg-[#090909] py-6 text-[#eceae3]" aria-label={h.works}>
        <Ticker items={["OpenAI", "Anthropic", "Vercel AI SDK", "LangChain", "LlamaIndex", "OpenTelemetry", "TypeScript", "Python", "HTTP"]} />
      </section>

      <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-36">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">{h.stepsEyebrow}</p>
            <h2 className="mt-5 max-w-4xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">{h.stepsTitle}</h2>
          </Reveal>
          <ol className="mt-16 grid gap-[2px] border border-white/20 bg-white/20 md:grid-cols-3">
            {h.steps.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.08} className="bg-[#090909] p-7 md:p-9">
                <span className="font-pixel text-7xl leading-none tracking-[-0.07em] text-[#f4d44d]">{i + 1}</span>
                <h3 className="mt-8 font-pixel text-3xl tracking-[-0.05em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/65">{body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#eceae3] px-5 py-24 text-black md:px-10 md:py-32">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{h.seeEyebrow}</p>
            <h2 className="mt-5 max-w-4xl font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">{h.seeTitle}</h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-black/70">{h.seeBody}</p>
          </Reveal>
          <div className="mt-14 grid gap-[2px] border-2 border-black bg-black md:grid-cols-3">
            {h.cards.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.08} className="group bg-[#eceae3] transition-colors hover:bg-[#f4d44d]">
                <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-black bg-[#090909]">
                  <Image src={cardArt[i]} alt="" fill unoptimized sizes="(min-width: 768px) 33vw, 100vw" className="object-cover [image-rendering:pixelated]" />
                </div>
                <div className="p-7">
                  <h3 className="font-pixel text-3xl tracking-[-0.05em]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-black/70">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#090909] px-5 py-24 text-[#eceae3] md:px-10 md:py-32">
        <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{h.priceEyebrow}</p>
            <h2 className="mt-5 font-pixel text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.07em]">{h.priceTitle}</h2>
            <p className="mt-6 max-w-md text-base leading-7 text-white/70">{h.priceBody}</p>
            <Link href={localizedPath(locale, "/pricing")} className="group mt-8 inline-flex items-center gap-3 bg-[#f4d44d] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
              {h.priceCta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Reveal>
          <Reveal delay={0.1} className="grid grid-cols-3 gap-[2px] border border-white/20 bg-white/20">
            {plans.map((plan) => (
              <div key={plan.id} className={`p-5 md:p-7 ${plan.id === "pro" ? "bg-[#f4d44d] text-black" : "bg-[#090909]"}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-60">{plan.name}</p>
                <p className="mt-4 font-pixel text-5xl leading-none tracking-[-0.07em] md:text-6xl">{formatPrice(plan.monthly)}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] opacity-60">{plan.spans} {t.pricing.spansPerMonth}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="border-t-2 border-black bg-[#eceae3] px-5 pb-24 text-black md:px-10">
        <div className="mx-auto max-w-[1320px] pt-16">
          <h2 className="font-pixel text-[clamp(2.2rem,4vw,3.5rem)] leading-[0.92] tracking-[-0.07em]">{h.faqTitle}</h2>
          <div className="mt-8 grid gap-x-12 md:grid-cols-2">
            {h.faqs.map(([q, a], i) => (
              <Reveal key={q} delay={(i % 2) * 0.08} className="border-b border-black/20 py-7">
                <h3 className="font-pixel text-2xl tracking-[-0.05em]">{q}</h3>
                <p className="mt-2 text-sm leading-6 text-black/65">{a}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#090909] px-5 pt-28 text-center text-[#eceae3] md:px-10 md:pt-36">
        <Reveal className="relative z-10">
          <h2 className="mx-auto max-w-5xl font-pixel text-[clamp(3rem,9vw,8rem)] leading-[0.88] tracking-[-0.08em]">{h.closeTitle}</h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-7 text-white/70">{h.closeBody}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
              {h.ctaPrimary} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="inline-flex items-center border border-white/40 bg-[#090909] px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">{h.closeDocs}</Link>
          </div>
        </Reveal>
        <Reveal className="relative -mx-5 -mt-[28vw] aspect-square md:-mx-10 md:-mt-[16vw] md:aspect-[2/1]" delay={0.15}>
          <Image src="/images/landing/horizon-sun.png" alt="" fill unoptimized sizes="100vw" className="object-cover [image-rendering:pixelated]" />
        </Reveal>
      </section>
    </div>
  );
}
