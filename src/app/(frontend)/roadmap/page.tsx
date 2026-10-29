import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { ClosingBand, DarkBand, Eyebrow, HeaderAction, SectionTitle , StatStrip } from "@/components/marketing/company/blocks";
import { RoadmapTrack } from "@/components/marketing/company/roadmap-track";

export const metadata = pageMetadata({ title: "Uncoil roadmap", description: "A transparent view of what Uncoil has shipped, what is in progress, and what is planned for AI agent observability.", path: "/roadmap" });

const sections = [
  { status: "Shipped", code: "NOW", title: "Observe and control the runs you have today", items: ["Trace and run inspection", "Cost, model, and tool analytics", "Project reports and Slack alerts", "Runtime retry, fallback, latency, and cost policies", "Python and TypeScript instrumentation", "OpenTelemetry ingestion"] },
  { status: "In progress", code: "NEXT", title: "Complete the operational foundation", items: ["Sessions and multi-agent trace views", "Search and saved filters", "Payload redaction and retention controls", "Expanded provider and framework adapters", "Public service status and supported-limit reporting"] },
  { status: "Planned", code: "LATER", title: "Evaluate and improve every release", items: ["Datasets, experiments, and CI regression checks", "Rule, LLM-judge, and human-review evaluators", "Prompt versions, playgrounds, and safe rollback", "Feedback capture and score-driven alerts", "Provider health, routing, and policy templates"] },
  { status: "Enterprise phase", code: "SCALE", title: "Deploy and govern at scale", items: ["Organization roles and audit logs", "SAML/SSO and granular RBAC", "EU/US data residency", "Self-hosted Docker, Helm, and air-gapped guidance", "Migration tooling for existing observability stacks"] },
] as const;

export default function RoadmapPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader
        eyebrow="Trajectory / 2026 onward"
        title="The work, with its uncertainty intact."
        lede="What works now, what is moving, and what still depends on evidence from real agent teams. Direction is public. Dates stay evidence-led."
        image="/images/company/roadmap-steps.png"
      >
        <HeaderAction href="/changelog">See what shipped</HeaderAction>
        <HeaderAction href="/contact" kind="secondary">Tell us what you need</HeaderAction>
      </PageHeader>
      <StatStrip stats={[[String(sections[0].items.length),"Shipped capabilities"],[String(sections[1].items.length),"In progress"],[String(sections[2].items.length),"Planned"],[String(sections[3].items.length),"Enterprise phase"]]} />

      <DarkBand>
        <Eyebrow>Four stages</Eyebrow>
        <SectionTitle>Now, next, later, at scale.</SectionTitle>
        <div className="mt-14"><RoadmapTrack stages={sections} /></div>
      </DarkBand>

      <section className="border-t-2 border-black bg-[#eceae3] px-5 py-20 text-black md:px-10 md:py-28">
        <div className="mx-auto max-w-[1320px]">
          <Eyebrow dark={false}>How we decide</Eyebrow>
          <SectionTitle>Three rules for what moves up.</SectionTitle>
          <div className="mt-12 grid gap-0 border-y-2 border-black md:grid-cols-3">
            {[
              ["Real failures first", "If a team shows us an agent failing in production, the thing that would have caught it jumps the queue."],
              ["Evidence over dates", "We publish direction, not promises. A date appears only once the work is far enough along to be honest about it."],
              ["Observe before enforce", "New controls ship as visibility first. Anything that can change production behavior arrives opt-in."],
            ].map(([t, body], i) => (
              <div key={t} className="border-black p-7 md:border-r-2 md:last:border-r-0">
                <span className="font-pixel text-5xl leading-none text-black/25">0{i + 1}</span>
                <h3 className="mt-10 font-pixel text-3xl leading-none tracking-[-0.05em]">{t}</h3>
                <p className="mt-3 text-sm leading-6 text-black/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ClosingBand
        title="Missing something you need?"
        body="The roadmap follows real agent teams. Tell us what is blocking yours and it moves up."
        actions={[{ href: "/contact", label: "Talk to us", primary: true }, { href: "/changelog", label: "Read the changelog" }]}
      />
    </div>
  );
}
