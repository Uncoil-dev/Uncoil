import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Reveal } from "@/components/marketing/landing/reveal";
import { appHref } from "@/lib/app-links";
import { getCopy, type Locale } from "@/lib/i18n";
import { pricingFaqEntries } from "@/lib/pricing-faq";
import { exampleBills, limitRows } from "@/lib/pricing-examples";
import { formatPrice } from "@/lib/pricing-plans";
import { PAID_GRACE } from "@/lib/plan-limits";

// Static pricing sections rendered on the server, so their markup and copy ship as HTML without client JS or hydration work.

const number = (n: number) => n.toLocaleString("en-US");
const buffer = `${Math.round(PAID_GRACE * 100)}%`;

/** Example bills and the limits table, computed from the shared plan list so the page cannot drift from ingest. English only, like the pricing page route. */
export function PricingLimits() {
  const bills = exampleBills();
  const rows = limitRows();
  const paid = rows.filter((row) => row.plan.monthly > 0);
  return (
    <section className="border-t-2 border-black bg-[#eceae3] px-5 py-14 text-black md:px-10 md:py-16" aria-labelledby="limits-title">
      <div className="mx-auto max-w-[1320px]">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Real bills and real limits</p>
          <h2 id="limits-title" className="mt-5 font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">What a month costs, and what a limit does.</h2>
        </Reveal>
        <ul className="mt-10 grid gap-[2px] border-2 border-black bg-black md:grid-cols-3">
          {bills.map((bill) => (
            <li key={bill.label} className="flex flex-col bg-[#eceae3] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">{bill.label}</p>
              <p className="mt-3 font-pixel text-5xl leading-none tracking-[-0.07em]">{formatPrice(bill.monthly)}<span className="ml-2 font-mono text-[10px] uppercase tracking-normal text-black/55">/ mo on {bill.plan.name}</span></p>
              <p className="mt-3 text-sm leading-6 text-black/70">{number(bill.runs)} runs of {bill.steps} steps is {number(bill.spans)} spans a month, {bill.what}.{bill.annual > 0 ? ` ${formatPrice(bill.annual)} a month if you pay yearly.` : ""}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 overflow-x-auto border-2 border-black">
          <table className="w-full border-collapse text-left md:min-w-[640px]">
            <caption className="sr-only">Retention and span limits per plan</caption>
            <thead>
              <tr className="bg-black text-[#eceae3]">
                <th scope="col" className="p-2.5 font-mono text-[9px] font-normal uppercase tracking-[0.1em] text-white/55 md:px-5 md:py-3.5 md:text-[10px]">Limit</th>
                {rows.map(({ plan }) => <th key={plan.id} scope="col" className="border-l border-white/20 p-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.1em] md:px-5 md:py-3.5">{plan.name}</th>)}
              </tr>
            </thead>
            <tbody className="font-mono text-[10px] md:text-xs">
              {[
                ["Data kept for", (row: (typeof rows)[number]) => `${row.retentionDays} days`],
                ["Spans per day", (row: (typeof rows)[number]) => (row.daily === null ? "No daily cap" : number(row.daily))],
                ["Spans per month", (row: (typeof rows)[number]) => number(row.included)],
                ["New spans refused at", (row: (typeof rows)[number]) => number(row.stopsAt)],
              ].map(([label, cell]) => (
                <tr key={label as string} className="border-t border-black/25">
                  <th scope="row" className="p-2.5 text-left text-xs font-medium md:px-5 md:py-3.5 md:text-sm">{label as string}</th>
                  {rows.map((row) => <td key={row.plan.id} className="border-l border-black/25 p-2.5 md:px-5 md:py-3.5">{(cell as (r: (typeof rows)[number]) => string)(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-black/70">
          When a limit is hit, new spans are not saved and the request gets a 429 error: <span className="font-mono text-xs">plan_limit_reached</span> at the monthly limit, <span className="font-mono text-xs">daily_limit_reached</span> on Free at the daily cap. Everything already saved stays until its retention time is up. Counts reset at the start of each UTC month, or at midnight UTC for the daily cap. {paid.map((row) => row.plan.name).join(" and ")} refuse new spans only after a {buffer} buffer above the included amount. Your price never goes up for going over.
        </p>
      </div>
    </section>
  );
}

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
