import { appHref } from "@/lib/app-links";
import { pageMetadata } from "@/lib/seo";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PageHeader } from "@/components/marketing/page-header";
import { Reveal } from "@/components/marketing/landing/reveal";
import { ClosingBand, DarkBand, Eyebrow, HeaderAction, SectionTitle , StatStrip } from "@/components/marketing/company/blocks";

export const metadata = pageMetadata({ title: "Changelog: new in Uncoil", description: "Release notes for Uncoil: new tracing, cost, alert and evaluation features for AI agent observability, shipped week by week.", path: "/changelog" });

const releaseSource = readFileSync(resolve(process.cwd(), "docs/releases.md"), "utf8");

const releases = [...releaseSource.matchAll(/^## \[(.+?)\](?: — (\d{4}-\d{2}-\d{2}))?\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map((match) => {
  const groups = [...match[3].matchAll(/^### (.+)\n([\s\S]*?)(?=^### |(?![\s\S]))/gm)]
    .map((g) => ({
      name: g[1],
      items: [...g[2].matchAll(/^- (.+)$/gm)].map((i) => i[1]).filter((text) => !/^none\.?$/i.test(text.trim())),
    }))
    .filter((g) => g.items.length > 0);
  return { code: match[1], date: match[2] ?? "Unreleased", groups };
});

function formatDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function ChangelogPage() {
  const latest = releases.find((r) => r.code !== "Unreleased") ?? releases[0];
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <PageHeader
        eyebrow={`Release record / latest ${latest?.code ?? ""}`}
        title="What changed, and when."
        lede="A chronological product record, taken straight from the release log. No inflated patch notes."
        image="/images/company/changelog-strata.png"
      >
        <HeaderAction href="/roadmap">See what is next</HeaderAction>
        <HeaderAction href="/docs" kind="secondary">Read the docs</HeaderAction>
      </PageHeader>
      <StatStrip stats={[[String(releases.length),"Entries in the log"],[latest?.code ?? "-","Latest release"],["Open","Every note, no filler"],["Plain","No inflated patch notes"]]} />

      <DarkBand>
        <Eyebrow>Release index</Eyebrow>
        <SectionTitle>Every release, newest first.</SectionTitle>
        <nav aria-label="Releases" className="mt-8 flex flex-wrap gap-2">
          {releases.map((r) => (
            <a key={r.code} href={`#release-${r.code}`} className="border border-white/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/75 hover:border-[#f4d44d] hover:text-[#f4d44d]">
              {r.code}
            </a>
          ))}
        </nav>

        <ol className="relative mt-14 grid gap-6 pl-8 md:pl-12">
          <span className="absolute bottom-0 left-[7px] top-0 w-0.5 bg-white/20 md:left-[11px]" aria-hidden="true" />
          {releases.map((release, i) => (
            <Reveal key={release.code}>
              <li id={`release-${release.code}`} className="relative scroll-mt-24">
                <span className={`absolute -left-[31px] top-9 size-4 md:-left-[47px] md:size-6 ${i === 0 ? "bg-[#f4d44d]" : "border-2 border-[#f4d44d] bg-[#090909]"}`} aria-hidden="true" />
                <article className={`grid gap-8 border p-7 md:grid-cols-[240px_1fr] md:p-10 ${release.code === "Unreleased" ? "border-white/20 bg-[#111] [background-image:radial-gradient(rgba(244,212,77,0.14)_1px,transparent_1px)] [background-size:12px_12px]" : i === 0 || (latest && release.code === latest.code) ? "border-[#f4d44d] bg-[#f4d44d] text-black" : "border-white/15 bg-[#111]"}`}>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-60">{release.code === "Unreleased" ? "In progress" : "Released"}</p>
                    <h3 className="mt-3 font-pixel text-[clamp(3rem,6vw,4.5rem)] leading-none tracking-[-0.07em]">{release.code}</h3>
                    {release.code !== "Unreleased" && <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] opacity-70">{formatDate(release.date)}</p>}
                  </div>
                  <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
                    {release.groups.length === 0 && <p className="text-sm opacity-60">Nothing recorded yet.</p>}
                    {release.groups.map((group) => (
                      <section key={group.name}>
                        <h4 className="border-b border-current/30 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">{group.name}</h4>
                        <ul className="mt-3 space-y-3">
                          {group.items.map((item) => (
                            <li key={item} className="flex gap-3 text-sm leading-6">
                              <span className="mt-2 size-1.5 shrink-0 bg-current" aria-hidden="true" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </article>
              </li>
            </Reveal>
          ))}
        </ol>
      </DarkBand>

      <ClosingBand
        title="Ship with eyes open."
        body="Start tracing in a few minutes. The free plan needs no card."
        actions={[{ href: appHref("/sign-up"), label: "Start tracing free", primary: true }, { href: "/docs", label: "Read the docs" }]}
      />
    </div>
  );
}
