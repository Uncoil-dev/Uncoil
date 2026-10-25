import { appHref } from "@/lib/app-links";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "./hero";
import { Reveal, Ticker } from "./reveal";
import { ProductWindow, Statement, Story } from "./scroll-sections";
import { Bento } from "./bento";
import { Anatomy, BeforeAfter, UseCases } from "./more-sections";
import { Timeline } from "./timeline";
import { LiveDemo } from "./live-demo";
import { PricingSection } from "./pricing-section";
import { SmoothScroll } from "./smooth-scroll";

const faqs = [
  ["What is a span?", "One recorded step in a run: a model call, a tool call, a retrieval. Plans are sized by spans per month."],
  ["Do I have to rewrite my agent?", "No. Wrap the entry point once and mark the steps you care about. Everything else keeps working the way it does today."],
  ["What can I send traces from?", "The TypeScript and Python SDKs, OpenTelemetry, or plain HTTP."],
  ["Can I try it without paying?", "Yes. The Free plan includes the trace viewer and cost visibility, no card needed."],
] as const;

export function LandingPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <SmoothScroll />
      <Hero />

      <section className="border-y border-white/15 bg-[#090909] py-6 text-[#eceae3]" aria-label="Works with">
        <Ticker items={["OpenAI", "Anthropic", "Vercel AI SDK", "LangChain", "LlamaIndex", "OpenTelemetry", "TypeScript", "Python", "HTTP"]} />
      </section>

      <Statement />
      <BeforeAfter />
      <Story />
      <Timeline />
      <ProductWindow />
      <LiveDemo />
      <Anatomy />
      <Bento />
      <UseCases />
      <PricingSection />

      <section className="border-t-2 border-black bg-[#eceae3] px-5 pb-24 text-black md:px-10">
        <div className="mx-auto grid max-w-[1320px] gap-x-12 pt-16 md:grid-cols-2">
          {faqs.map(([q, a], i) => (
            <Reveal key={q} delay={(i % 2) * 0.08} className="border-b border-black/20 py-7">
              <h3 className="font-pixel text-2xl tracking-[-0.05em]">{q}</h3>
              <p className="mt-2 text-sm leading-6 text-black/65">{a}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="overflow-hidden bg-[#090909] px-5 pt-28 text-center text-[#eceae3] md:px-10 md:pt-36">
        <Reveal className="relative z-10">
          <h2 className="mx-auto max-w-5xl font-pixel text-[clamp(3rem,9vw,8rem)] leading-[0.88] tracking-[-0.08em]">Stop guessing. Start seeing.</h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-7 text-white/70">Wrap your agent, run it, open the map. The free plan needs no card.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href={appHref("/sign-up")} className="group inline-flex items-center gap-3 bg-[#f4d44d] px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">
              Start tracing free <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="inline-flex items-center border border-white/40 bg-[#090909] px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black">
              Read the docs
            </Link>
          </div>
        </Reveal>
        <Reveal className="relative -mx-5 -mt-[28vw] aspect-square md:-mx-10 md:-mt-[16vw] md:aspect-[2/1]" delay={0.15}>
          <Image src="/images/landing/horizon-sun.png" alt="" fill unoptimized sizes="100vw" className="object-cover [image-rendering:pixelated]" />
        </Reveal>
      </section>
    </div>
  );
}
