import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Reveal } from "@/components/marketing/landing/reveal";
import { appHref } from "@/lib/app-links";
import { getCopy, type Locale } from "@/lib/i18n";
import { pricingFaqEntries } from "@/lib/pricing-faq";

// Static pricing sections rendered on the server, so their markup and copy ship as HTML without client JS or hydration work.

export function PricingFaq({ locale = "en", founding = false }: { locale?: Locale; founding?: boolean }) {
  const t = getCopy(locale).pricing;
  const faqs = pricingFaqEntries(t, founding);
  return (
    <section className="border-t-2 border-black bg-[#eceae3] px-5 pb-16 text-black md:px-10 md:pb-20" aria-labelledby="faq-title">
      <div className="mx-auto grid max-w-[1320px] gap-10 pt-14 md:pt-16 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{t.faqEyebrow}</p>
          <h2 id="faq-title" className="mt-5 font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">{t.faqTitle}</h2>
        </Reveal>
        <div className="border-t border-black/25">
          {faqs.map(([q, a]) => (
            <details key={q} className="group border-b border-black/25">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 font-pixel text-[1.4rem] tracking-[-0.05em] [&::-webkit-details-marker]:hidden">
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

export function PricingClose({ locale = "en" }: { locale?: Locale }) {
  const t = getCopy(locale).pricing;
  return (
    <section className="overflow-hidden bg-[#090909] px-5 pt-16 text-center text-[#eceae3] md:px-10 md:pt-20">
      <Reveal>
        <h2 className="mx-auto max-w-5xl font-pixel text-[clamp(2.6rem,6.5vw,5.5rem)] leading-[0.88] tracking-[-0.08em]">{t.closeTitle}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
            {t.closeCta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link href="/contact" className="inline-flex items-center border border-white/60 bg-black/70 px-8 py-5 text-white font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">{t.closeTalk}</Link>
        </div>
      </Reveal>
      <Reveal className="relative -mx-5 mt-2 h-[clamp(140px,18vw,260px)] md:-mx-10" delay={0.15}>
        <Image src="/images/landing/horizon-sun.png" alt="" fill unoptimized sizes="100vw" className="object-cover object-top [image-rendering:pixelated]" />
      </Reveal>
    </section>
  );
}
