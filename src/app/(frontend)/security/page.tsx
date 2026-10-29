import { faqJsonLd, jsonLdString, pageMetadata } from "@/lib/seo";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { ClosingBand, DarkBand, CreamBand, Eyebrow, HeaderAction, SectionTitle , StatStrip } from "@/components/marketing/company/blocks";
import { ControlExplorer } from "@/components/marketing/company/control-explorer";

import { RedactionDemo } from "@/components/marketing/company/redaction-demo";
export const metadata = pageMetadata({ title: "Security and EU data residency for AI agent traces", description: "How Uncoil protects AI agent traces and prompts: encryption in transit and at rest, project isolation, access controls, EU data residency and redaction.", path: "/security" });

const faqs = [
  { q: "Where is Uncoil data stored?", a: "EU region accounts, traces and cache are stored in Ireland. Queued span events pass through Inngest in the United States, so Uncoil does not claim end-to-end EU residency." },
  { q: "Are prompts and personal data redacted?", a: "Email, phone, card, SSN and API-key patterns are redacted before queued events leave the EU region." },
  { q: "How are API keys protected?", a: "Project keys are shown once at creation and only a hash is stored on our side." },
  { q: "Can one project see another project's traces?", a: "No. Telemetry is scoped to the project derived from the authenticated key, and there is no cross-project query path." },
  { q: "Will Uncoil slow down or break my production agent?", a: "Runtime policies are observe-first and cost ceilings fail open, so monitoring does not silently change or block production traffic." },
] as const;

const controls = [
  { title: "Encryption", icon: "lock", summary: "TLS 1.3 in transit and AES-256 at rest.", items: ["API keys are hashed before storage.", "Plaintext project keys are shown once."] },
  { title: "Data isolation", icon: "layers", summary: "Telemetry is scoped to the project derived from the authenticated key.", items: ["No cross-project query path.", "Cost counters remain project-specific."] },
  { title: "Data residency", icon: "globe", summary: "EU region accounts, traces, and cache are stored in Ireland; Inngest Cloud currently processes queued span events in the United States.", items: ["Convex, Tinybird, and Redis for the EU region are hosted in Ireland.", "Inngest receives queued span events in US infrastructure, so Uncoil does not claim end-to-end EU residency.", "Email, phone, card, SSN, and API-key redaction is applied before queued events leave the EU."] },
  { title: "Access control", icon: "user", summary: "Better Auth sessions and Convex authorization protect workspace data.", items: ["Encrypted OAuth tokens and CSRF protection.", "Organization roles are enforced at the data layer."] },
  { title: "Runtime enforcement", icon: "server", summary: "Observe-first policies keep monitoring from silently changing production behavior.", items: ["Cost ceilings are evaluated server-side.", "Fail-open behavior protects production traffic."] },
  { title: "Infrastructure", icon: "shield", summary: "Convex, Tinybird, Inngest, and Redis have explicit jobs in the data path.", items: ["Durable event processing and retry semantics.", "Ephemeral cache and rate-limit state stay separate."] },
  { title: "Incident response", icon: "siren", summary: "A documented response path governs investigation and customer notification.", items: ["Affected users are notified within 72 hours.", "Security reviews run on a recurring schedule."] },
] as const;

const path = [
  ["Your agent", "The SDK or OTLP exporter sends spans with a project key. Plaintext keys are shown once and stored hashed."],
  ["Redaction", "Email, phone, card, SSN and API-key patterns are removed before queued events leave the EU region."],
  ["Queue", "Inngest Cloud processes queued span events in the United States, which is why we do not claim end-to-end EU residency."],
  ["Storage", "Convex, Tinybird and Redis for the EU region are hosted in Ireland, scoped to the project that owns the key."],
] as const;

export default function SecurityPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader
        eyebrow="Security dossier"
        title="Trust is a system of controls."
        lede="How agent telemetry is isolated, encrypted, governed and investigated, with the limits stated as plainly as the strengths."
        image="/images/company/security-boundaries.png"
      >
        <HeaderAction href="mailto:security@uncoil.dev?subject=Uncoil%20Security%20inquiry">Email security</HeaderAction>
        <HeaderAction href="/status" kind="secondary">See live status</HeaderAction>
      </PageHeader>
      <StatStrip stats={[["TLS 1.3","In transit"],["AES-256","At rest"],["72 h","Breach notice"],["Ireland","EU region storage"]]} />

      <DarkBand>
        <Eyebrow>Control families / {controls.length}</Eyebrow>
        <SectionTitle>Seven boundaries. Pick one.</SectionTitle>
        <div className="mt-14"><ControlExplorer controls={controls} /></div>
      </DarkBand>

      <DarkBand className="border-t border-white/15">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>Try it / runs in your browser</Eyebrow>
            <SectionTitle>Paste a secret. Watch it vanish.</SectionTitle>
          </div>
          <p className="max-w-sm text-base leading-7 text-white/65">This is the same redaction rule set Uncoil applies to inputs and outputs. Edit the text on the left. Nothing you type leaves this page.</p>
        </div>
        <div className="mt-12"><RedactionDemo /></div>
      </DarkBand>

      <CreamBand>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow dark={false}>Where a span goes</Eyebrow>
            <SectionTitle>Follow one span through the system.</SectionTitle>
          </div>
          <p className="max-w-sm text-base leading-7 text-black/65">Four hops, each with a named job. The US queue hop is real, so it is on the diagram.</p>
        </div>
        <ol className="mt-14 grid gap-0 border-y-2 border-black md:grid-cols-4">
          {path.map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.1}>
              <li className={`relative flex h-full min-h-[300px] flex-col justify-between p-6 md:border-r-2 md:border-black md:last:border-r-0 ${i === 2 ? "bg-[#f4d44d]" : i === 3 ? "bg-black text-[#eceae3]" : ""}`}>
                <div className="flex items-start justify-between">
                  <span className="font-pixel text-6xl leading-none">0{i + 1}</span>
                  {i < 3 && <ArrowRight className="hidden size-6 md:block" aria-hidden="true" />}
                </div>
                <div>
                  <h3 className="font-pixel text-3xl leading-none tracking-[-0.05em]">{title}</h3>
                  <p className={`mt-3 text-sm leading-6 ${i === 3 ? "text-white/65" : "text-black/70"}`}>{body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </CreamBand>

      <DarkBand>
        <Eyebrow>Plain limits</Eyebrow>
        <SectionTitle>What we will not claim.</SectionTitle>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["No end-to-end EU residency", "Storage is in Ireland, but queued span events pass through Inngest in the US. We say so instead of rounding up."],
            ["No silent behavior changes", "Runtime policies are observe-first. Cost ceilings are checked server-side and fail open, so monitoring never quietly breaks production traffic."],
            ["No keys in plaintext", "Project keys are shown once at creation. After that only the hash exists on our side."],
          ].map(([t, body], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <div className="h-full border border-white/15 bg-[#111] p-7">
                <span className="font-pixel text-5xl leading-none text-[#f4d44d]">0{i + 1}</span>
                <h3 className="mt-8 font-pixel text-3xl leading-none tracking-[-0.05em]">{t}</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </DarkBand>

      <CreamBand>
        <Eyebrow dark={false}>Questions</Eyebrow>
        <SectionTitle>Security questions, answered plainly.</SectionTitle>
        <div className="mt-10 max-w-3xl border-t border-black/25">
          {faqs.map(({ q, a }) => (
            <details key={q} className="border-b border-black/25 py-4">
              <summary className="cursor-pointer font-pixel text-2xl tracking-[-0.05em]">{q}</summary>
              <p className="mt-3 text-sm leading-6 text-black/70">{a}</p>
            </details>
          ))}
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd(faqs.map(({ q, a }) => ({ q, a })))) }} />
      </CreamBand>

      <ClosingBand
        title="Found something? Tell us first."
        body="Responsible disclosure goes straight to the people who can fix it. Affected users are notified within 72 hours."
        actions={[
          { href: "mailto:security@uncoil.dev?subject=Uncoil%20Security%20inquiry", label: "Email security", primary: true },
          { href: "/contact", label: "Other questions" },
        ]}
      />
    </div>
  );
}
