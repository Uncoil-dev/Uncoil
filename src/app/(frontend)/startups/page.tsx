import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { ClosingBand, CreamBand, DarkBand, Eyebrow, HeaderAction, SectionTitle } from "@/components/marketing/company/blocks";

export const metadata = pageMetadata({
  title: "Uncoil for startups, students and open source",
  description: "Discounted Uncoil plans for early-stage startups, students and educators, and open-source projects that run AI agents.",
  path: "/startups",
});

const applyHref = `mailto:hello@uncoil.dev?subject=${encodeURIComponent("Uncoil discount")}&body=${encodeURIComponent(
  "Who you are (startup, student or educator, open-source project):\nLink (site, school page or repository):\nPlan you want (Pro or Team):\nWhat your agent does:\n",
)}`;

const programs = [
  {
    name: "Startups",
    deal: "50% off the first year",
    who: "Companies under two years old.",
    how: "Send us your company site. We reply with a code for Pro or Team.",
  },
  {
    name: "Students and educators",
    deal: "Free Pro",
    who: "Students, teachers and researchers using Uncoil for coursework or study.",
    how: "Send a school email address or a link to your course page.",
  },
  {
    name: "Open source",
    deal: "Free Pro for the project",
    who: "Public repositories under an open-source licence.",
    how: "Send the repository link. We set up the plan for one project.",
  },
] as const;

const steps = [
  ["Write to us", "Use the button below. Tell us who you are and which plan you want."],
  ["We check", "A person reads it and replies within two working days."],
  ["You get a code", "Enter it in the promo box at checkout, or we switch the plan on for you."],
] as const;

export default function StartupsPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader eyebrow="Startups, students, open source" title="Pay less while you build." lede="Uncoil is free for 10,000 spans a month. When you need Pro or Team, these plans keep the price low while your agent is young.">
        <div className="mt-8 flex flex-wrap gap-3">
          <HeaderAction href={applyHref}>Apply by email</HeaderAction>
          <HeaderAction href="/pricing" kind="secondary">See plans</HeaderAction>
        </div>
      </PageHeader>
      <CreamBand>
        <Eyebrow dark={false}>Three plans</Eyebrow>
        <SectionTitle>Pick the one that fits.</SectionTitle>
        <div className="mt-12 grid gap-px border-2 border-black bg-black md:grid-cols-3">
          {programs.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06} className="flex flex-col bg-[#eceae3] p-6 md:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{p.name}</p>
              <p className="mt-4 font-pixel text-3xl leading-none tracking-[-0.06em]">{p.deal}</p>
              <p className="mt-5 text-base leading-7">{p.who}</p>
              <p className="mt-3 text-base leading-7 text-black/70">{p.how}</p>
            </Reveal>
          ))}
        </div>
      </CreamBand>
      <DarkBand>
        <Eyebrow>How it works</Eyebrow>
        <SectionTitle>Three steps. No forms.</SectionTitle>
        <ol className="mt-12 grid gap-px bg-white/15 md:grid-cols-3">
          {steps.map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.06} className="bg-[#090909] p-6 md:p-8">
              <p className="font-pixel text-5xl leading-none tracking-[-0.06em] text-[#f4d44d]">{i + 1}</p>
              <h3 className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em]">{title}</h3>
              <p className="mt-3 text-base leading-7 text-white/70">{body}</p>
            </Reveal>
          ))}
        </ol>
      </DarkBand>
      <ClosingBand
        title="Building an agent? Start free."
        body="Send your first trace in a few minutes. Ask for a discount when you are ready to upgrade."
        actions={[
          { href: "/sign-up", label: "Start free", primary: true },
          { href: applyHref, label: "Apply by email" },
        ]}
      />
    </div>
  );
}
