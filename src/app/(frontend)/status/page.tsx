import { pageMetadata } from "@/lib/seo";
import { Activity, BellRing, DatabaseZap, RadioTower } from "lucide-react";
import { RegionalStatusBoard } from "@/components/status/regional-status-board";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { ClosingBand, CreamBand, Eyebrow, HeaderAction, SectionTitle , StatStrip } from "@/components/marketing/company/blocks";

export const metadata = pageMetadata({ title: "Uncoil status: uptime and incidents", description: "Live operational status for Uncoil ingestion, dashboards and API, with regional health checks for the US and EU clouds.", path: "/status" });

const services = [
  { name: "Dashboard + authentication", owner: "Application", icon: Activity },
  { name: "Telemetry ingestion", owner: "Ingest", icon: RadioTower },
  { name: "Trace + analytics queries", owner: "Data", icon: DatabaseZap },
  { name: "Notifications + runtime policies", owner: "Operations", icon: BellRing },
] as const;

const protocol = [
  ["Send the affected surface", "Tell us which page, API or SDK call misbehaved."],
  ["Include the time window", "A rough start and end time is enough."],
  ["Receive a human reply", "A person answers, not a form acknowledgement."],
] as const;

export default function StatusPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader
        eyebrow="Public operations channel / Beta"
        title="Status, earned by evidence."
        lede="A direct view of the surfaces needed to ingest, inspect and act on agent telemetry. Automated uptime history is not public yet, so support stays the honest source of truth."
        image="/images/company/status-pulse.png"
      >
        <HeaderAction href="mailto:hello@uncoil.dev?subject=Service%20incident">Report an incident</HeaderAction>
        <HeaderAction href="/security" kind="secondary">How we handle incidents</HeaderAction>
      </PageHeader>
      <StatStrip stats={[["2","Surfaces probed live"],["EU","Region online"],["Manual","Review until monitors land"],["Human","Reply to every report"]]} />

      <RegionalStatusBoard />

      <CreamBand>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow dark={false}>Service board / manual review</Eyebrow>
            <SectionTitle>Four surfaces we watch.</SectionTitle>
          </div>
          <p className="max-w-sm text-base leading-7 text-black/65">Monitor links are still being connected. Until then each card says so instead of showing a green light we have not earned.</p>
        </div>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal key={service.name} delay={i * 0.07}>
                <article className="flex h-full min-h-[320px] flex-col justify-between border border-black bg-white p-6">
                  <div className="flex items-start justify-between">
                    <span className="font-pixel text-6xl leading-none text-black/20">0{i + 1}</span>
                    <Icon className="size-6" strokeWidth={1.3} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">{service.owner}</p>
                    <h3 className="mt-3 font-pixel text-3xl leading-[0.95] tracking-[-0.055em]">{service.name}</h3>
                    <p className="mt-6 inline-block bg-[#f4d44d] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">Monitor link pending</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </CreamBand>

      <section className="bg-[#090909] px-5 py-20 text-[#eceae3] md:px-10 md:py-28">
        <div className="mx-auto max-w-[1320px]">
          <Eyebrow>Incident protocol</Eyebrow>
          <SectionTitle>See a problem before the board does?</SectionTitle>
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {protocol.map(([title, body], i) => (
              <Reveal key={title} delay={i * 0.08}>
                <li className="h-full min-h-[240px] border border-white/15 bg-[#111] p-7">
                  <span className="font-pixel text-6xl leading-none text-[#f4d44d]">0{i + 1}</span>
                  <h3 className="mt-10 font-pixel text-3xl leading-none tracking-[-0.05em]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">{body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <ClosingBand
        title="Tell us. We will answer."
        body="Email the affected surface and time window to hello@uncoil.dev."
        actions={[{ href: "mailto:hello@uncoil.dev?subject=Service%20incident", label: "Report an incident", primary: true }, { href: "/contact", label: "Other contact options" }]}
      />
    </div>
  );
}
