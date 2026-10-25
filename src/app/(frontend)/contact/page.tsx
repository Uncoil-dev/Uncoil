import { appHref } from "@/lib/app-links";
import { pageMetadata } from "@/lib/seo";
import { ArrowUpRight, Mail, MessagesSquare, ShieldCheck } from "lucide-react";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { ClosingBand, CreamBand, DarkBand, Eyebrow, HeaderAction, SectionTitle , StatStrip } from "@/components/marketing/company/blocks";
import { CopyButton } from "@/components/marketing/company/copy-button";

import { FitCheck } from "@/components/marketing/company/fit-check";
export const metadata = pageMetadata({ title: "Contact the Tracify team", description: "Book an Agent Failure Fit Call or talk to Tracify about agent observability, security, and deployment.", path: "/contact" });

const fitCallSubject = "Agent Failure Fit Call";
const fitCallBody = `Hi Tracify,

I would like to book a 20-minute Agent Failure Fit Call.

Agent use case:
Failure symptom:
Framework or stack:
Sanitized staging evidence available:
Preferred times and timezone:`;

const fitCallHref = `mailto:hello@tracify.tech?subject=${encodeURIComponent(fitCallSubject)}&body=${encodeURIComponent(fitCallBody)}`;

const routes = [
  {
    title: "Agent Failure Fit Call",
    body: "A free 20-minute qualification call. Bring the symptom and your stack; we will decide whether Tracify can investigate it, what sanitized evidence is required, and whether the paid review fits. The call does not include written findings, regression cases, or a release recommendation.",
    icon: Mail,
    href: fitCallHref,
    action: "Book the fit call",
    featured: true,
  },
  {
    title: "Enterprise",
    body: "Architecture, security, procurement, and rollout planning.",
    icon: MessagesSquare,
    href: `mailto:hello@tracify.tech?subject=${encodeURIComponent("Tracify Enterprise inquiry")}`,
    action: "Email enterprise",
    featured: false,
  },
  {
    title: "Security",
    body: "Responsible disclosure and data-handling questions.",
    icon: ShieldCheck,
    href: `mailto:security@tracify.tech?subject=${encodeURIComponent("Tracify Security inquiry")}`,
    action: "Email security",
    featured: false,
  },
] as const;

const bring = [
  ["The behavior", "What the agent did that it should not have, in one or two sentences."],
  ["The consequence", "What it cost a customer or your engineers."],
  ["The stack", "Runtime, framework and model provider."],
  ["The evidence", "Sanitized staging traces or logs, if you have them."],
] as const;

export default function ContactPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader
        eyebrow="One failure / one decision / five business days"
        title="Bring the messy agent."
        lede="Start with a free 20-minute fit call. We qualify one real failure and the sanitized evidence needed to investigate it, without turning the call into a free diagnosis."
        image="/images/company/contact-signal.png"
      >
        <HeaderAction href={fitCallHref}>Book a fit call</HeaderAction>
        <HeaderAction href={appHref("/demo/project")} kind="secondary">Inspect the demo first</HeaderAction>
      </PageHeader>
      <StatStrip stats={[["20 min","Free fit call"],["1","Real failure, qualified"],["5 days","To one decision"],["Email","Subject pre-filled"]]} />

      <DarkBand>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>Three ways in</Eyebrow>
            <SectionTitle>Pick the inbox that owns the answer.</SectionTitle>
          </div>
          <p className="max-w-sm text-base leading-7 text-white/65">No form maze. Each button opens a plain email with the right subject already filled in.</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {routes.map((route, i) => {
            const Icon = route.icon;
            return (
              <Reveal key={route.title} delay={i * 0.08} className={route.featured ? "md:col-span-3 lg:col-span-1" : ""}>
                <a
                  href={route.href}
                  className={`group flex h-full min-h-[380px] flex-col justify-between border p-7 transition-colors ${
                    route.featured
                      ? "border-[#f4d44d] bg-[#f4d44d] text-black hover:bg-white"
                      : "border-white/15 bg-[#111] hover:border-[#f4d44d] hover:bg-[#161616]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`font-pixel text-6xl leading-none ${route.featured ? "text-black" : "text-[#f4d44d]"}`}>0{i + 1}</span>
                    <Icon className="size-6" strokeWidth={1.4} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-pixel text-4xl leading-none tracking-[-0.06em]">{route.title}</h3>
                    <p className={`mt-4 text-sm leading-6 ${route.featured ? "text-black/70" : "text-white/60"}`}>{route.body}</p>
                    <span className="mt-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                      {route.action}
                      <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      </DarkBand>

      <CreamBand>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow dark={false}>Ten-second check</Eyebrow>
            <SectionTitle>Is this a fit?</SectionTitle>
            <p className="mt-6 max-w-md text-base leading-7 text-black/65">Tick what is true. Nothing is sent anywhere. It just tells you whether the call is worth your twenty minutes.</p>
          </div>
          <FitCheck href={fitCallHref} />
        </div>
      </CreamBand>

      <CreamBand>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0">
            <Eyebrow dark={false}>Before the call</Eyebrow>
            <SectionTitle>Four things make the call count.</SectionTitle>
            <p className="mt-6 max-w-md text-base leading-7 text-black/65">Short answers are fine. Skip anything you cannot share; sanitized staging data is always enough.</p>
            <div className="mt-8 border border-black bg-white">
              <div className="flex items-center justify-between border-b border-black px-4 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black/55">
                <span>Email template</span>
                <CopyButton text={fitCallBody} label="Copy template" className="text-black hover:text-black/60" />
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-6 text-black/75 md:whitespace-pre">{fitCallBody}</pre>
            </div>
          </div>
          <ol className="border-t border-black">
            {bring.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.06}>
                <li className="grid grid-cols-[72px_1fr] gap-4 border-b border-black py-8">
                  <span className="font-pixel text-5xl leading-none text-black/25">0{i + 1}</span>
                  <div>
                    <h3 className="font-pixel text-3xl leading-none tracking-[-0.05em]">{title}</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-black/65">{body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </CreamBand>

      <section className="border-t-2 border-black bg-[#d9d5ca] px-5 py-16 text-black md:px-10 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow dark={false}>Rather write it down?</Eyebrow>
          <h2 className="mt-4 font-pixel text-4xl leading-none tracking-[-0.06em] md:text-5xl">Leave a note and we will reply.</h2>
          <div className="mt-8"><LeadForm /></div>
        </div>
      </section>

      <ClosingBand
        title="Prefer to look first?"
        body="Open the demo project, or read how Tracify keeps your telemetry safe."
        actions={[
          { href: appHref("/demo/project"), label: "Open the demo", primary: true },
          { href: "/security", label: "Review security" },
        ]}
      />
    </div>
  );
}
