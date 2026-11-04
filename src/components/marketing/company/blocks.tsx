import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/marketing/landing/reveal";

export const art = "[image-rendering:pixelated]";

const primary =
  "group inline-flex min-h-12 items-center gap-3 bg-[#f4d44d] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-white";
const secondary =
  "inline-flex min-h-12 items-center gap-3 border border-white/60 bg-black/70 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black";

/** Action buttons for the dark PageHeader. */
export function HeaderAction({ href, children, kind = "primary" }: { href: string; children: ReactNode; kind?: "primary" | "secondary" }) {
  const external = href.startsWith("mailto:") || href.startsWith("http");
  const className = kind === "primary" ? primary : secondary;
  const icon = kind === "primary" ? (
    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
  ) : (
    <ArrowUpRight className="size-4" aria-hidden="true" />
  );
  return external ? (
    <a href={href} className={className}>{children}{icon}</a>
  ) : (
    <Link href={href} className={className}>{children}{icon}</Link>
  );
}

/** Small mono label above a section headline. */
export function Eyebrow({ children, dark = true }: { children: ReactNode; dark?: boolean }) {
  return <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${dark ? "text-white/50" : "text-black/50"}`}>{children}</p>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-4 max-w-3xl font-pixel mk-h2 leading-[0.92] tracking-[-0.07em]">{children}</h2>;
}

/** Dark section with the landing page's padding and width. */
export function DarkBand({ children, id, className = "" }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`bg-[#090909] px-5 mk-section text-[#eceae3] md:px-10 ${className}`}>
      <div className="mx-auto max-w-[1320px]">{children}</div>
    </section>
  );
}

export function CreamBand({ children, id, className = "" }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`border-t-2 border-black bg-[#eceae3] px-5 mk-section text-black md:px-10 ${className}`}>
      <div className="mx-auto max-w-[1320px]">{children}</div>
    </section>
  );
}

/** Closing call to action with the horizon artwork, same finish as the landing page. */
export function ClosingBand({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <section className="overflow-hidden bg-[#090909] px-5 pt-16 text-center text-[#eceae3] md:px-10 md:pt-20">
      <Reveal>
        <h2 className="mx-auto max-w-5xl font-pixel text-[clamp(2.4rem,6vw,5rem)] leading-[0.9] tracking-[-0.075em]">{title}</h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/80">{body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {actions.map((a) => (
            <HeaderAction key={a.href + a.label} href={a.href} kind={a.primary ? "primary" : "secondary"}>
              {a.label}
            </HeaderAction>
          ))}
        </div>
      </Reveal>
      <Reveal className="relative -mx-5 mt-2 h-[clamp(140px,18vw,260px)] md:-mx-10" delay={0.15}>
        <Image src="/images/landing/horizon-sun.png" alt="" fill unoptimized sizes="100vw" className={`object-cover object-top ${art}`} />
      </Reveal>
    </section>
  );
}

/** Row of hard facts directly under a page header, in the landing page's mono style. */
export function StatStrip({ stats }: { stats: readonly (readonly [string, string])[] }) {
  return (
    <section aria-label="At a glance" className="border-y border-white/15 bg-[#090909] text-[#eceae3]">
      <dl className="mx-auto grid max-w-[1320px] grid-cols-2 md:grid-cols-4">
        {stats.map(([value, label], i) => (
          <Reveal key={label} delay={i * 0.06} className="border-white/15 px-5 py-5 md:border-l md:first:border-l-0 md:px-8">
            <dd className="font-pixel text-4xl leading-none tracking-[-0.06em] text-[#f4d44d] md:text-5xl">{value}</dd>
            <dt className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">{label}</dt>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
