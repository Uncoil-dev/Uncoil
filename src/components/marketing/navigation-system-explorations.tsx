import { appHref } from "@/lib/app-links";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CircleDot,
  Code2,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Future19Pricing } from "@/components/marketing/future19-pricing";
import { ThirdPartyLogo } from "@/components/third-party-logo";
import { LandingSampleRun } from "@/components/marketing/landing-sample-run";

const integrationMarks = [
  { name: "OpenAI", mark: "✳", className: "font-semibold tracking-[-0.05em]" },
  {
    name: "Anthropic",
    mark: "AI",
    className: "font-serif font-semibold tracking-[-0.07em]",
  },
  { name: "Vercel", mark: "▲", className: "font-semibold tracking-[-0.05em]" },
  {
    name: "LangChain",
    mark: "⛓",
    className: "font-semibold tracking-[-0.06em]",
  },
  {
    name: "LlamaIndex",
    mark: "◫",
    className: "font-semibold tracking-[-0.06em]",
  },
  {
    name: "OpenTelemetry",
    mark: "◎",
    className: "font-semibold tracking-[-0.07em]",
  },
] as const;

function StudyLabel({ number, title }: { number: string; title: string }) {
  return (
    <div className="future19-section-label flex items-center justify-between border-b border-black/15 pb-4 font-mono text-[9px] uppercase tracking-[0.15em] text-black/70">
      <span>
        Nav system {number} / {title}
      </span>
      <span>Future 19 language</span>
    </div>
  );
}

function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 border-b border-black pb-1 font-mono text-[9px] uppercase tracking-[0.12em] hover:border-[#f4d44d] hover:text-black/70"
    >
      {children} <ArrowUpRight className="size-3" />
    </Link>
  );
}

export function NavigationSystemExplorations({
  showIntroduction = true,
  showSectionLabels = true,
  showFooter = true,
}: {
  showIntroduction?: boolean;
  showSectionLabels?: boolean;
  showFooter?: boolean;
}) {
  return (
    <section
      aria-label="Future 19 navigation visual system explorations"
      className={`border-t border-white/15 bg-black ${showSectionLabels ? "" : "future19-public-page"}`}
    >
      {showIntroduction ? (
        <div className="bg-[#eceae3] px-6 py-20 text-black md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/70">
              New exploration set / one visual system
            </p>
            <h2 className="mt-6 max-w-[1040px] font-pixel text-6xl leading-[0.84] tracking-[-0.075em] md:text-8xl">
              Fifteen sections cut from the same cloth.
            </h2>
            <p className="mt-7 max-w-[720px] text-lg leading-8 text-black/70">
              The light field, black feature panel, yellow interaction color,
              thin rules, and pixel typography from the new navigation—extended
              into a complete homepage kit.
            </p>
          </div>
        </div>
      ) : null}

      <section
        id="navsys-hero-split"
        className="bg-[#eceae3] px-6 py-14 text-black md:px-10 md:py-16"
      >
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-col gap-2 border-b border-black/15 pb-4 font-mono text-[9px] uppercase tracking-[0.15em] text-black/70 sm:flex-row sm:items-center sm:justify-between">
            <span>AI agent observability / evaluation</span>
            <span>Production infrastructure</span>
          </div>
          <div className="mt-7 grid border border-black/20 bg-white shadow-[18px_18px_0_#111] lg:grid-cols-[0.95fr_1.05fr] md:mt-8">
            <div className="flex min-h-[470px] flex-col justify-between border-b border-black/15 p-6 md:p-8 lg:border-b-0 lg:border-r">
              <div>
                <span className="inline-flex items-center gap-2 bg-black px-3 py-2 font-mono text-[8px] uppercase tracking-[0.13em] text-white">
                  <Radio className="size-3 text-[#f4d44d]" /> the run explains
                  the release
                </span>
                <h1 className="mt-7 max-w-[740px] font-pixel text-7xl leading-[0.82] tracking-[-0.08em] md:text-7xl">
                  See why it failed. Ship with proof.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-black/70 md:text-lg">
                  Trace every model, tool, retrieval, and fallback decision.
                  Evaluate the fix before it reaches production.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={appHref("/sign-up")}
                  className="inline-flex h-12 items-center gap-3 bg-black px-6 font-mono text-[9px] uppercase tracking-[0.13em] text-white hover:bg-[#f4d44d] hover:text-black"
                >
                  Start tracing <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={appHref("/demo")}
                  className="inline-flex h-12 items-center border border-black/25 px-6 font-mono text-[9px] uppercase tracking-[0.13em] hover:bg-[#f4d44d]"
                >
                  Open sample run
                </Link>
              </div>
            </div>
            <LandingSampleRun />
          </div>
        </div>
      </section>

      <section id="navsys-proof-band" className="bg-[#eceae3] py-20 text-black">
        <div className="mx-auto max-w-[1240px] px-6 md:px-10">
          <StudyLabel number="02" title="verified proof strip" />
          <div className="mt-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/70">
                What the record contains
              </p>
              <h3 className="mt-5 max-w-2xl font-pixel text-6xl leading-[0.86] tracking-[-0.07em]">
                Evidence that survives the handoff.
              </h3>
            </div>
          </div>
          <div className="mt-10 grid border-y border-black/15 sm:grid-cols-3">
            {[
              ["01", "Full run context", "Model, tool, retrieval, fallback, and evaluation in one trail."],
              ["02", "Release evidence", "Quality, latency, cost, and a decision you can defend."],
              ["03", "Native transport", "SDK, OpenTelemetry, and HTTP for the stack you already run."],
            ].map(([number, title, body], index) => (
              <div
                key={title}
                className={`min-h-44 border-b border-black/15 p-6 sm:border-b-0 sm:border-r last:border-r-0 ${index === 1 ? "bg-[#f4d44d]" : "bg-white"}`}
              >
                <span className="font-mono text-[9px] text-black/60">{number}</span>
                <h4 className="mt-8 font-pixel text-3xl tracking-[-0.06em]">{title}</h4>
                <p className="mt-3 text-sm leading-6 text-black/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 px-6 font-mono text-[8px] uppercase tracking-[0.13em] text-black/60 md:px-10">
          Supported runtimes / current integration coverage
        </p>
        <div className="mt-12 grid border-y border-black/15 sm:grid-cols-3 lg:grid-cols-6">
          {integrationMarks.map(({ name, className }) => (
            <div
              key={name}
              className="flex min-h-28 items-center justify-center gap-2 border-r border-black/15 bg-white px-4 text-xl last:border-r-0 hover:bg-[#f4d44d]"
            >
              <ThirdPartyLogo brand={name} className="size-5 shrink-0 object-contain" />
              <span className={className}>{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="navsys-lifecycle-map"
        className="bg-[#eceae3] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <StudyLabel number="03" title="observe / evaluate / release" />
          <div className="mt-10 border border-black/20 bg-white">
            <div className="grid md:grid-cols-4">
              {[
                ["01", "Instrument", "Capture the complete run."],
                ["02", "Observe", "Find the decision that changed it."],
                ["03", "Evaluate", "Prove the candidate improves."],
                ["04", "Release", "Promote with evidence."],
              ].map(([number, title, body], index) => (
                <div
                  key={title as string}
                  className={`min-h-72 border-b border-r border-black/15 p-6 md:border-b-0 ${index === 2 ? "bg-[#f4d44d]" : ""}`}
                >
                  <span className="font-mono text-[9px] text-black/70">
                    {number}
                  </span>
                  <h3 className="mt-20 font-pixel text-4xl tracking-[-0.06em]">
                    {title}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-black/70">{body}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-black/15 bg-black p-5 text-white">
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-white/62">
                A continuous production feedback loop
              </span>
              <Link
                href="/product/lifecycle"
                className="inline-flex items-center gap-2 border-b border-[#f4d44d] pb-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f4d44d] hover:text-white"
              >
                Explore lifecycle <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>
          <div className="mt-12 border border-black/20 bg-white">
            <div className="border-b border-black/15 p-6 md:flex md:items-end md:justify-between md:gap-8">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/70">
                  Use cases
                </p>
                <h3 className="mt-4 max-w-2xl font-pixel text-5xl leading-[0.88] tracking-[-0.07em]">
                  Apply the record to the agent you ship.
                </h3>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-black/70 md:mt-0">
                Start with the failure mode that costs your team the most time.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Support", "Escalations, retrieval, handoffs", "/use-cases/support"],
                ["Research", "Sources, browsing, synthesis", "/use-cases/research"],
                ["Automation", "Workflows, retries, stalls", "/use-cases/automation"],
                ["Tool calling", "APIs, loops, hidden spend", "/use-cases/tool-calling"],
              ].map(([title, body, href], index) => (
                <Link
                  key={title}
                  href={href}
                  className={`group border-b border-r border-black/15 p-5 last:border-r-0 ${index === 0 ? "bg-black text-white" : "bg-white hover:bg-[#f4d44d]"}`}
                >
                  <span className="font-mono text-[8px] uppercase opacity-45">0{index + 1}</span>
                  <h4 className="mt-8 font-pixel text-4xl tracking-[-0.06em]">{title}</h4>
                  <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-white/62" : "text-black/70"}`}>{body}</p>
                  <ArrowUpRight className="mt-6 size-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="navsys-trace-report"
        className="bg-[#eceae3] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <StudyLabel number="04" title="observe / decision trail" />
          <div className="mt-10 grid border border-black/20 bg-white lg:grid-cols-[0.8fr_1.2fr]">
            <div className="border-b border-black/15 p-7 lg:border-b-0 lg:border-r md:p-10">
              <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-black/70">
                Incident / sample run_018204
              </p>
              <h3 className="mt-8 font-pixel text-6xl leading-[0.86] tracking-[-0.07em]">
                The failure is a decision trail.
              </h3>
              <p className="mt-6 text-sm leading-7 text-black/70">
                Follow the model, tool response, fallback, and evaluation
                without stitching logs together.
              </p>
              <div className="mt-10">
                <TextLink href={appHref("/demo")}>Inspect sample trace</TextLink>
              </div>
            </div>
            <div className="bg-black p-6 text-white md:p-8">
              <div className="border-l-2 border-[#f4d44d] pl-5">
                <p className="font-mono text-[8px] uppercase text-[#f4d44d]">
                  Root cause
                </p>
                <h4 className="mt-3 text-2xl tracking-[-0.04em]">
                  Fallback ignored an empty retrieval result.
                </h4>
              </div>
              <div className="mt-8 space-y-px bg-white/15">
                {[
                  ["12:41:08.120", "model", "response drafted"],
                  ["12:41:08.604", "tool", "knowledge.search → 0 results"],
                  ["12:41:09.011", "retry", "fallback model invoked"],
                  ["12:41:09.842", "eval", "groundedness → 0.42"],
                ].map(([time, type, event], index) => (
                  <div
                    key={time}
                    className={`grid grid-cols-[105px_70px_1fr] gap-3 p-4 font-mono text-[9px] ${index === 2 ? "bg-[#f4d44d] text-black" : "bg-[#090909] text-white/72"}`}
                  >
                    <span>{time}</span>
                    <span className="uppercase opacity-55">{type}</span>
                    <span>{event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-black/15 pt-12">
          <StudyLabel number="05" title="evaluate / release decision" />
          <div className="mt-10 grid gap-px bg-black/15 lg:grid-cols-[1fr_0.42fr]">
            <div className="bg-white p-7 md:p-10">
              <div className="flex flex-col justify-between gap-6 border-b border-black/15 pb-7 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-black/70">
                    Candidate comparison / sample data
                  </p>
                  <h3 className="mt-5 font-pixel text-5xl leading-[0.9] tracking-[-0.07em] sm:text-6xl">
                    Release 2.4 wins.
                  </h3>
                </div>
                <span className="bg-[#f4d44d] px-4 py-2 font-mono text-[8px] uppercase">
                  Safe to promote
                </span>
              </div>
              <div className="mt-8 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[560px] text-left">
                  <thead className="font-mono text-[8px] uppercase text-black/70">
                    <tr>
                      <th className="pb-4">Candidate</th>
                      <th className="pb-4">Quality</th>
                      <th className="pb-4">Latency</th>
                      <th className="pb-4">Cost</th>
                      <th className="pb-4">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Current", "0.82", "3.4s", "$0.052", "Hold"],
                      ["v2.4", "0.94", "2.8s", "$0.041", "Promote"],
                      ["Fast", "0.77", "1.9s", "$0.035", "Reject"],
                    ].map((row, index) => (
                      <tr
                        key={row[0]}
                        className={`border-t border-black/15 text-sm ${index === 1 ? "bg-[#f4d44d]" : ""}`}
                      >
                        {row.map((cell) => (
                          <td key={cell} className="px-2 py-5 first:pl-0">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 grid gap-px bg-black/15 md:hidden">
                {[
                  ["Current", "0.82", "3.4s", "$0.052", "Hold"],
                  ["v2.4", "0.94", "2.8s", "$0.041", "Promote"],
                  ["Fast", "0.77", "1.9s", "$0.035", "Reject"],
                ].map(([candidate, quality, latency, cost, decision], index) => (
                  <div
                    key={candidate}
                    className={`p-5 ${index === 1 ? "bg-[#f4d44d]" : "bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-base font-medium">{candidate}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em]">
                        {decision}
                      </p>
                    </div>
                    <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-black/15 pt-4">
                      {[
                        ["Quality", quality],
                        ["Latency", latency],
                        ["Cost", cost],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <dt className="font-mono text-[7px] uppercase tracking-[0.1em] text-black/70">
                            {label}
                          </dt>
                          <dd className="mt-2 text-sm">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-between bg-black p-7 text-white">
              <Sparkles className="size-6 text-[#f4d44d]" />
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/55">
                  Sample result
                </p>
                <p className="font-pixel text-6xl tracking-[-0.07em]">+12%</p>
                <p className="mt-3 text-sm leading-6 text-white/62">
                  quality uplift on the same production-derived evaluation set
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="navsys-developer-install"
        className="bg-[#eceae3] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <StudyLabel number="06" title="developer setup" />
          <div className="mt-10 grid border border-black/20 bg-white lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-black/15 p-7 lg:border-b-0 lg:border-r md:p-10">
              <Code2 className="size-7" />
              <h3 className="mt-10 font-pixel text-6xl leading-[0.86] tracking-[-0.07em]">
                One wrapper. A complete record.
              </h3>
              <p className="mt-6 text-sm leading-7 text-black/70">
                Install, trace, and inspect without rebuilding your agent stack.
              </p>
              <div className="mt-10">
                <TextLink href="/docs/quickstart">Read quickstart</TextLink>
              </div>
            </div>
            <div className="bg-black p-6 font-mono text-[12px] leading-7 text-white/80 md:p-9">
              <div className="flex items-center justify-between border-b border-white/15 pb-4 text-[8px] uppercase tracking-[0.13em] text-white/62">
                <span>agent.ts</span>
                <span>typescript</span>
              </div>
              <pre className="mt-7 overflow-x-auto">
                <code>
                  <span className="text-white/62">01</span>
                  {"  import { traceAgent } from 'uncoil-sdk'\n"}
                  <span className="text-white/62">02</span>
                  {"\n"}
                  <span className="text-white/62">03</span>
                  {"  const response = await traceAgent(\n"}
                  <span className="text-white/62">04</span>
                  {"    'support-agent',\n"}
                  <span className="text-white/62">05</span>
                  {"    () => agent.respond(ticket),\n"}
                  <span className="text-white/62">06</span>
                  {"  )"}
                </code>
              </pre>
              <div className="mt-8 flex items-center gap-3 border-t border-white/15 pt-5 text-[8px] uppercase tracking-[0.12em] text-[#f4d44d]">
                <CircleDot className="size-3" /> first trace received
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="navsys-security-controls"
        className="bg-[#eceae3] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <StudyLabel number="07" title="production trust" />
          <div className="mt-10 grid border border-black/20 bg-white lg:grid-cols-[1fr_1fr]">
            <div className="border-b border-black/15 p-7 lg:border-b-0 lg:border-r md:p-10">
              <LockKeyhole className="size-7" />
              <h3 className="mt-10 font-pixel text-6xl leading-[0.86] tracking-[-0.07em]">
                Production context, controlled.
              </h3>
              <p className="mt-6 max-w-md text-sm leading-7 text-black/70">
                Clear data handling, retention, access control, and deployment
                paths for technical review.
              </p>
              <div className="mt-10">
                <TextLink href="/security">Open security page</TextLink>
              </div>
            </div>
            <div className="grid sm:grid-cols-2">
              {[
                ["Encryption", "In transit and at rest"],
                ["Retention", "Plan-defined windows"],
                ["Access", "Team-scoped controls"],
                ["Audit", "Administrative record"],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className={`border-b border-r border-black/15 p-6 ${index === 3 ? "bg-[#f4d44d]" : ""}`}
                >
                  <ShieldCheck className="size-4" />
                  <h4 className="mt-12 font-pixel text-4xl tracking-[-0.06em]">
                    {title}
                  </h4>
                  <p className="mt-3 text-sm text-black/70">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-black/15 pt-12">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/70">
            Operating model / why the record is different
          </p>
          <div className="mt-5 overflow-x-auto border border-black/20 bg-white">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-black/15 font-mono text-[8px] uppercase tracking-[0.12em] text-black/70">
                  <th className="p-5">Operating model</th>
                  <th className="p-5">Logs</th>
                  <th className="p-5">Dashboards</th>
                  <th className="bg-[#f4d44d] p-5 text-black">Uncoil</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Complete run context", "Partial", "Aggregated", "Connected"],
                  ["Model + tool decisions", "Manual", "Limited", "Native"],
                  ["Quality evidence", "Separate", "Trend only", "Run-level"],
                  ["Release decision", "Human guess", "External", "Built in"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-black/15 last:border-b-0">
                    {row.map((cell, index) => (
                      <td
                        key={cell}
                        className={`p-5 text-sm ${index === 3 ? "bg-[#fff4b5] font-medium" : index === 0 ? "font-pixel text-2xl tracking-[-0.04em]" : "text-black/70"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Future19Pricing />

      <section
        id="navsys-final-conversion"
        className="bg-[#eceae3] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <StudyLabel number="08" title="pricing + field notes" />
          <div className="mt-10 grid gap-px bg-black/15 lg:grid-cols-[1.25fr_0.75fr]">
            <article className="flex min-h-[480px] flex-col justify-between bg-black p-8 text-white md:p-10">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#f4d44d]">
                  Featured field guide
                </p>
                <h3 className="mt-12 max-w-2xl font-pixel text-7xl leading-[0.84] tracking-[-0.075em]">
                  How to turn production failures into release gates.
                </h3>
              </div>
              <Link
                href="/blog"
                className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f4d44d]"
              >
                Read the guide →
              </Link>
            </article>
            <div className="grid">
              {[
                ["Guide", "The complete guide to AI agent observability"],
                ["Guide", "How to debug failed agent runs"],
                ["Guide", "Building reliable agent release gates"],
              ].map(([type, title], index) => (
                <Link
                  key={title}
                  href={index === 0 ? "/blog/ai-agent-observability-complete-guide" : "/blog"}
                  className={`border-b border-black/15 p-6 ${index === 1 ? "bg-[#f4d44d]" : "bg-white hover:bg-[#f4d44d]"}`}
                >
                  <span className="font-mono text-[8px] uppercase text-black/70">
                    {type}
                  </span>
                  <h4 className="mt-8 font-pixel text-4xl leading-[0.9] tracking-[-0.06em]">
                    {title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-black/15 pt-12">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/70">
            Start with a real run
          </p>
          <div className="mt-10 grid border border-black/20 bg-white shadow-[18px_18px_0_#111] lg:grid-cols-[1.25fr_0.75fr]">
            <div className="p-8 md:p-12">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/70">
                The next useful conversation
              </p>
              <h3 className="mt-8 max-w-[760px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-8xl">
                Bring us a run you do not trust.
              </h3>
              <p className="mt-7 max-w-xl text-lg leading-8 text-black/70">
                We will map the failure, missing signals, and first useful
                quality gate together.
              </p>
              <Link
                href="/contact?intent=trace-clinic"
                className="mt-10 inline-flex h-12 items-center gap-3 bg-black px-6 font-mono text-[9px] uppercase tracking-[0.13em] text-white hover:bg-[#f4d44d] hover:text-black"
              >
                Book a trace clinic <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="flex flex-col justify-between bg-[#f4d44d] p-8">
              <CircleDot className="size-6" />
              <div>
                <p className="font-pixel text-6xl tracking-[-0.07em]">30 min</p>
                <p className="mt-4 text-sm leading-6 text-black/70">
                  one real trace · one root-cause map · one release-gate
                  recommendation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showFooter ? (
        <footer
          id="navsys-footer-atlas"
          className="overflow-hidden bg-[#eceae3] px-6 pt-20 text-black md:px-10"
        >
          <div className="mx-auto max-w-[1240px]">
            <StudyLabel number="15" title="footer atlas" />
            <div className="mt-10 grid gap-10 border-b border-black/15 pb-14 md:grid-cols-[1fr_auto]">
              <div>
                <p className="relative isolate inline-block px-1 font-pixel text-3xl tracking-[-0.05em] before:absolute before:-inset-x-1 before:bottom-0.5 before:-z-10 before:h-[68%] before:-rotate-1 before:skew-x-[-7deg] before:bg-[#f4d44d]/80 before:content-['']">
                  uncoil
                </p>
                <p className="mt-5 max-w-sm text-sm leading-7 text-black/70">
                  The operating record for the agents your team ships.
                </p>
                <form
                  action="/api/leads"
                  method="post"
                  className="mt-7 flex max-w-md border border-black/25 bg-white"
                >
                  <input type="hidden" name="intent" value="newsletter" />
                  <label htmlFor="future19-newsletter" className="sr-only">
                    Work email for the Uncoil newsletter
                  </label>
                  <input
                    id="future19-newsletter"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@company.com"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-[10px] outline-none placeholder:text-black/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black"
                  />
                  <button
                    type="submit"
                    className="bg-black px-4 font-mono text-[9px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.11em] text-black/70">
                  One technical dispatch a month. Unsubscribe anytime.
                </p>
                <Link
                  href={appHref("/sign-up")}
                  className="mt-6 inline-flex items-center gap-3 bg-black px-5 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white hover:bg-[#f4d44d] hover:text-black"
                >
                  Start free <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
                {(
                  [
                    [
                      "Product",
                      [
                        ["Trace viewer", "/product/trace-viewer"],
                        ["Pricing", "/pricing"],
                        ["Integrations", "/integrations"],
                      ],
                    ],
                    [
                      "Developers",
                      [
                        ["Docs", "/docs/quickstart"],
                        ["Quickstart", "/docs/typescript"],
                        ["API reference", "/docs/api"],
                      ],
                    ],
                    [
                      "Company",
                      [
                        ["Blog", "/blog"],
                        ["Security", "/security"],
                        ["Contact", "/contact"],
                      ],
                    ],
                    [
                      "Resources",
                      [
                        ["Status", "/status"],
                        ["Changelog", "/changelog"],
                        ["Privacy", "/privacy"],
                      ],
                    ],
                  ] as Array<[string, Array<[string, string]>]>
                ).map(([title, links]) => (
                  <div
                    key={title as string}
                    className="space-y-3 font-mono text-[9px] uppercase tracking-[0.11em]"
                  >
                    <p>{title as string}</p>
                    {(links as readonly (readonly [string, string])[]).map(
                      ([label, href]) => (
                        <Link
                          key={href}
                          href={href}
                          className="block text-black/70 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                          {label}
                        </Link>
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="select-none pt-8 font-pixel text-[clamp(5.5rem,18.2vw,18rem)] leading-[0.66] tracking-[-0.1em] text-black">
              uncoil
            </div>
          </div>
          <div className="h-4 bg-[#f4d44d]" />
        </footer>
      ) : null}
    </section>
  );
}
