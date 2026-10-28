import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/components/reading/legal-document";
import { Reveal } from "@/components/marketing/landing/reveal";

export const metadata = pageMetadata({ title: "Privacy policy", description: "Uncoil privacy policy: what data we collect, how telemetry is protected, and how to manage analytics preferences.", path: "/privacy" });

const sections = [
  { id: "overview", title: "Overview", body: "This policy explains how Uncoil collects, uses, and safeguards information when you use the agent observability platform.", bullets: [] },
  { id: "collection", title: "Collection", body: "We collect information you provide directly and technical data generated through use of the platform.", bullets: ["Account information such as name, email, and organization.", "Telemetry sent through the SDK, including spans, tool calls, and model logs.", "Usage data such as browser type and platform interaction."] },
  { id: "use", title: "Use", body: "Collected data is used to provide, maintain, protect, and improve the service. Product analytics is enabled by default and can be rejected or changed at any time through the privacy preferences control. Marketing cookies and marketing scripts are not currently used.", bullets: ["Process and visualize agent telemetry.", "Provide cost and performance analytics.", "Send requested system alerts and notifications."] },
  { id: "protection", title: "Protection", body: "Telemetry is encrypted in transit and at rest. Access is limited to authorized people and systems needed to provide the service.", bullets: [] },
  { id: "data-residency", title: "Data residency", body: "For the EU region, account data, traces, and cache are stored in Ireland. Inngest Cloud currently processes queued span events in the United States, so the EU region is not end-to-end EU-resident.", bullets: ["Span input and output are redacted before being sent to the US event-processing provider.", "Stripe processes billing and payment information as a separate payment provider; Uncoil does not store full card numbers.", "Redis and the EU application data services are operated in the documented EU region."] },
  { id: "control", title: "Control", body: "You can accept, reject, or change optional analytics preferences at any time through the privacy preferences control or the cookie policy. Questions and privacy requests can be sent directly to privacy@uncoil.dev.", bullets: [] },
] as const;

const flow = [
  { step: "01", title: "Your app", body: "The SDK sends spans: tool calls, model calls and logs. Obvious secrets are removed before they leave." },
  { step: "02", title: "Uncoil EU", body: "Account data, traces and cache are stored in Ireland, encrypted in transit and at rest." },
  { step: "03", title: "Event queue", body: "Inngest Cloud processes queued span events in the United States. Span input and output are redacted first." },
] as const;

function DataFlow() {
  return (
    <section className="bg-[#eceae3] px-5 py-20 md:px-10 md:py-28" aria-label="How data moves">
      <div className="mx-auto max-w-[1320px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Follow the data</p>
        <h2 className="mt-5 max-w-3xl font-pixel text-[clamp(2.4rem,5.4vw,4.8rem)] leading-[0.92] tracking-[-0.07em]">Three stops, one policy.</h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {flow.map((f, i) => (
            <Reveal key={f.step} delay={i * 0.1}>
              <li className="relative h-full border border-black bg-white/40 p-7">
                <span className="font-pixel text-5xl leading-none text-black/20">{f.step}</span>
                <p className="mt-8 font-pixel text-3xl leading-none tracking-[-0.05em]">{f.title}</p>
                <p className="mt-3 text-sm leading-6 text-black/70">{f.body}</p>
                <span className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 bg-[#f4d44d] outline outline-1 outline-black md:block" aria-hidden="true" />
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <LegalDocument
      current="/privacy"
      eyebrow="Privacy policy"
      title="What enters. What stays. What leaves."
      description="How Uncoil handles the information that passes through it, in the order it happens."
      updated="16 May 2026"
      summary="We collect your account details and the traces your SDK sends, use them only to run and improve Uncoil, encrypt them, and let you control optional analytics at any time."
      highlights={[
        { label: "Collection", title: "Only what runs the service.", body: "Account details and the telemetry your SDK sends." },
        { label: "Protection", title: "Encrypted. Access limited.", body: "Telemetry is encrypted in transit and at rest." },
        { label: "Control", title: "Analytics is your call.", body: "Reject or change optional analytics at any time." },
      ]}
      extra={<DataFlow />}
      sections={sections}
      contact={{ label: "Privacy questions", title: "Ask us anything about your data.", href: "mailto:privacy@uncoil.dev", action: "privacy@uncoil.dev" }}
    />
  );
}
