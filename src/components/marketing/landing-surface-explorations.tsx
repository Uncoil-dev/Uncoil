import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDot,
  Code2,
  GitBranch,
  LockKeyhole,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  InteractiveSignalMap,
  MotionArtwork,
} from "@/components/marketing/landing-surface-interactions";

const placeholderLogos = [
  "NORTHSTAR",
  "RELAY",
  "FORGE",
  "MESA",
  "ORBIT",
  "PILOT",
];
const integrations = [
  "OpenAI",
  "Anthropic",
  "Vercel AI SDK",
  "LangChain",
  "LlamaIndex",
  "OpenTelemetry",
  "Slack",
  "Convex",
  "Tinybird",
];
const useCases = [
  ["Support", "Resolve the ticket without losing the reason."],
  ["Research", "See which source changed the conclusion."],
  ["Coding", "Follow every tool call behind the patch."],
  ["Automation", "Catch retries before they become spend."],
] as const;

function Tag({
  group,
  number,
  light = false,
}: {
  group: string;
  number: string;
  light?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b pb-4 font-mono text-[9px] uppercase tracking-[0.16em] ${light ? "border-black/15 text-zinc-500" : "border-white/15 text-zinc-500"}`}
    >
      <span>
        {group} / {number}
      </span>
      <span>New direction</span>
    </div>
  );
}

function ArrowLink({
  href,
  children,
  light = false,
}: {
  href: string;
  children: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.14em] ${light ? "text-zinc-600 hover:text-black" : "text-zinc-400 hover:text-white"}`}
    >
      {children}
      <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function ProofExplorations() {
  return (
    <>
      <section
        id="proof-logo-wall"
        className="border-b border-white/15 bg-[#070707] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Customer proof" number="01 / logo constellation" />
          <div className="py-14 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4d44d]">
              Placeholder logo system
            </p>
            <h2 className="mx-auto mt-6 max-w-[880px] font-pixel text-6xl leading-[0.82] tracking-[-0.075em] md:text-8xl">
              Built for teams shipping agents into the real world.
            </h2>
          </div>
          <div className="grid border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-6">
            {placeholderLogos.map((logo, index) => (
              <div
                key={logo}
                data-placeholder-logo
                className={`relative flex min-h-40 items-center justify-center overflow-hidden border-b border-r border-white/15 ${index === 1 ? "bg-[#f4d44d] text-black" : index === 4 ? "bg-[#8b7cff] text-black" : "bg-black"}`}
              >
                <span className="font-pixel text-2xl tracking-[-0.03em]">
                  {logo}
                </span>
                <span className="absolute bottom-3 font-mono text-[7px] uppercase tracking-[0.15em] opacity-50">
                  Placeholder
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-600">
            Replace with approved customer marks before publishing
          </p>
        </div>
      </section>

      <section
        id="proof-quote-monument"
        className="relative overflow-hidden border-b border-black/15 bg-[#ff655a] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div
          aria-hidden
          className="absolute -right-20 top-1/2 font-pixel text-[32rem] leading-none text-black/5"
        >
          “
        </div>
        <div className="relative mx-auto max-w-[1240px]">
          <Tag group="Customer proof" number="02 / quote monument" light />
          <div className="py-16 md:py-24">
            <p className="font-pixel text-[clamp(3.8rem,8vw,8.8rem)] leading-[0.82] tracking-[-0.075em]">
              “We stopped debating the failure and started fixing the exact
              decision.”
            </p>
            <div className="mt-12 flex flex-wrap items-end justify-between gap-8 border-t border-black/20 pt-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]">
                  Approved customer quote placeholder
                </p>
                <p className="mt-2 text-sm text-black/60">
                  Name · role · company
                </p>
              </div>
              <div className="font-pixel text-7xl tracking-[-0.08em]">
                −41%
                <span className="ml-3 font-sans text-sm tracking-normal">
                  time to root cause
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="proof-metric-poster"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Customer proof" number="03 / metric poster" />
          <div className="grid py-12 md:grid-cols-12 md:grid-rows-2">
            <div className="border border-white/15 bg-[#f4d44d] p-8 text-black md:col-span-7 md:row-span-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em]">
                Illustrative outcome
              </p>
              <p className="mt-16 font-pixel text-[clamp(7rem,17vw,14rem)] leading-[0.68] tracking-[-0.09em]">
                94%
              </p>
              <p className="mt-10 max-w-md text-2xl leading-tight">
                of production incidents linked to an inspectable run.
              </p>
            </div>
            <div className="border border-white/15 p-7 md:col-span-5">
              <p className="font-pixel text-6xl tracking-[-0.07em]">2.3×</p>
              <p className="mt-4 text-sm text-zinc-500">
                faster evaluation loop
              </p>
            </div>
            <div className="border border-white/15 bg-[#171717] p-7 md:col-span-5">
              <p className="font-pixel text-6xl tracking-[-0.07em]">$18k</p>
              <p className="mt-4 text-sm text-zinc-500">
                modeled annual savings
              </p>
            </div>
          </div>
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-zinc-600">
            Example layout only · validate every metric with an approved case
            study
          </p>
        </div>
      </section>
    </>
  );
}

function IntegrationExplorations() {
  return (
    <>
      <section
        id="integrations-orbit"
        className="relative overflow-hidden border-b border-white/15 bg-[#09080d] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Integration ecosystem" number="01 / signal orbit" />
          <div className="relative mt-12 min-h-[620px] overflow-hidden border border-white/15 bg-[radial-gradient(circle_at_center,rgba(139,124,255,0.2),transparent_34%)]">
            <div className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-[#8b7cff] bg-black font-pixel text-3xl">
              uncoil
            </div>
            <div className="absolute left-1/2 top-1/2 size-[360px] -translate-x-1/2 -translate-y-1/2 animate-[exploration-spin_24s_linear_infinite] rounded-full border border-dashed border-white/20 motion-reduce:animate-none" />
            <div className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 animate-[exploration-spin_38s_linear_infinite_reverse] rounded-full border border-dashed border-white/10 motion-reduce:animate-none" />
            {integrations.slice(0, 8).map((name, index) => {
              const positions = [
                "left-[8%] top-[18%]",
                "left-[42%] top-[8%]",
                "right-[8%] top-[20%]",
                "right-[4%] top-[60%]",
                "right-[35%] bottom-[7%]",
                "left-[30%] bottom-[8%]",
                "left-[5%] bottom-[28%]",
                "left-[15%] top-[48%]",
              ];
              return (
                <div
                  key={name}
                  className={`absolute ${positions[index]} border border-white/20 bg-black px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] shadow-[8px_8px_0_rgba(139,124,255,0.14)] transition-transform duration-300 hover:-translate-y-2 hover:rotate-1 motion-reduce:transition-none`}
                >
                  {name}
                </div>
              );
            })}
            <p className="absolute bottom-6 left-6 max-w-[330px] font-pixel text-4xl leading-[0.9] tracking-[-0.05em]">
              Your stack. One operating record.
            </p>
          </div>
        </div>
      </section>

      <section
        id="integrations-bento"
        className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag
            group="Integration ecosystem"
            number="02 / connector bento"
            light
          />
          <div className="grid gap-3 py-12 md:grid-cols-4 md:grid-rows-3">
            {integrations.map((name, index) => (
              <article
                key={name}
                className={`min-h-40 border border-black/15 p-5 ${index === 0 ? "bg-black text-white md:col-span-2 md:row-span-2" : index === 3 ? "bg-[#f4d44d] md:col-span-2" : index === 6 ? "bg-[#ff655a] md:col-span-2" : "bg-white"}`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center border border-current/20 font-pixel text-lg">
                    {name[0]}
                  </span>
                  <ArrowUpRight className="size-3 opacity-40" />
                </div>
                <p
                  className={`${index === 0 ? "mt-20 text-5xl" : "mt-10 text-2xl"} font-pixel tracking-[-0.05em]`}
                >
                  {name}
                </p>
                <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.13em] opacity-50">
                  Connector surface
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="integrations-flow"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Integration ecosystem" number="03 / live data flow" />
          <div className="py-14">
            <div className="flex flex-col gap-0 lg:flex-row">
              {[
                ["01", "Instrument", "SDK / OTLP", "#f4d44d"],
                ["02", "Route", "Uncoil ingest", "#ff655a"],
                ["03", "Store", "Tinybird + Convex", "#8b7cff"],
                ["04", "Act", "Slack + dashboard", "#7ee0b8"],
              ].map(([number, title, body, color], index) => (
                <div
                  key={title}
                  className="relative flex-1 border border-white/15 p-7"
                >
                  <span className="font-mono text-[9px] text-zinc-600">
                    {number}
                  </span>
                  <div
                    className="mt-14 size-3"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="mt-5 font-pixel text-4xl tracking-[-0.06em]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm text-zinc-500">{body}</p>
                  {index < 3 && (
                    <ArrowRight className="absolute -right-3 top-1/2 z-10 size-6 bg-black p-1 text-zinc-500" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
              <span>From one emitted span</span>
              <span>To one actionable decision</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SecurityExplorations() {
  return (
    <>
      <section
        id="security-data-path"
        className="border-b border-white/15 bg-[#070707] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Security and trust" number="01 / data path" />
          <div className="py-12">
            <h2 className="max-w-[860px] font-pixel text-6xl leading-[0.84] tracking-[-0.07em] md:text-8xl">
              See exactly where the evidence goes.
            </h2>
            <div className="mt-14 grid gap-px bg-white/15 lg:grid-cols-5">
              {[
                ["01", "Your runtime", "Span leaves over TLS"],
                ["02", "Ingest", "Key verified"],
                ["03", "Processing", "Bounded pipeline"],
                ["04", "Storage", "Separated by purpose"],
                ["05", "Control", "Retention + access"],
              ].map(([number, title, body], index) => (
                <article
                  key={title}
                  className={`relative min-h-56 p-6 ${index === 2 ? "bg-[#7ee0b8] text-black" : "bg-black"}`}
                >
                  <p className="font-mono text-[9px] opacity-50">{number}</p>
                  <LockKeyhole className="mt-10 size-5 opacity-60" />
                  <h3 className="mt-6 font-pixel text-3xl tracking-[-0.05em]">
                    {title}
                  </h3>
                  <p className="mt-3 text-xs leading-5 opacity-60">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="security-vault"
        className="relative overflow-hidden border-b border-black/15 bg-[#f4d44d] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Security and trust" number="02 / control vault" light />
          <div className="grid items-center gap-12 py-12 lg:grid-cols-[1fr_1fr]">
            <div className="relative mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-black/20" />
              <div className="absolute inset-[12%] rounded-full border border-dashed border-black/30" />
              <div className="absolute inset-[27%] rounded-full border border-black/30" />
              <div className="flex size-36 items-center justify-center bg-black text-white">
                <ShieldCheck className="size-12" />
              </div>
              {["Encryption", "Retention", "RBAC", "Audit"].map(
                (item, index) => (
                  <span
                    key={item}
                    className={`absolute font-mono text-[9px] uppercase tracking-[0.13em] ${["top-[5%] left-1/2 -translate-x-1/2", "right-[2%] top-1/2 -translate-y-1/2", "bottom-[5%] left-1/2 -translate-x-1/2", "left-[4%] top-1/2 -translate-y-1/2"][index]}`}
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Enterprise controls
              </p>
              <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
                Trust is a system, not a badge.
              </h2>
              <p className="mt-7 max-w-lg text-lg leading-8 text-black/65">
                Put encryption, access, retention, and auditability into one
                memorable control model.
              </p>
              <div className="mt-8">
                <ArrowLink href="/security" light>
                  Review security
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="security-trust-center"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Security and trust" number="03 / trust center" />
          <div className="py-12">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <h2 className="max-w-[700px] font-pixel text-6xl leading-[0.85] tracking-[-0.07em] md:text-8xl">
                The enterprise review, already organized.
              </h2>
              <ArrowLink href="/security">Open trust center</ArrowLink>
            </div>
            <div className="mt-12 border border-white/15">
              {[
                ["Encryption in transit", "Available", "TLS transport"],
                ["Data retention", "Configurable", "Plan-based controls"],
                ["Single sign-on", "Enterprise", "SAML / OIDC path"],
                ["Audit logs", "Enterprise", "Access visibility"],
                ["SOC 2", "Roadmap", "Honest posture"],
              ].map(([title, status, note], index) => (
                <div
                  key={title}
                  className="grid gap-3 border-b border-white/10 p-5 last:border-b-0 sm:grid-cols-[1fr_0.45fr_1fr] sm:items-center"
                >
                  <p className="font-sans text-lg">{title}</p>
                  <span
                    className={`w-fit px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] ${index === 4 ? "bg-[#ff655a] text-black" : "bg-[#7ee0b8] text-black"}`}
                  >
                    {status}
                  </span>
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                    {note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FaqExplorations() {
  const faqs = [
    [
      "How fast is setup?",
      "Instrument one agent function or send OTLP spans. Most teams can create the first trace in one focused session.",
    ],
    [
      "Where does data live?",
      "Telemetry and app metadata use separate stores, with retention and access explained in the security overview.",
    ],
    [
      "Can we migrate gradually?",
      "Yes. Start with one workflow, preserve your existing logs, and expand instrumentation as the operating value becomes clear.",
    ],
    [
      "Is self-hosting available?",
      "Managed Uncoil is the current path. Deployment requirements can be discussed for enterprise plans.",
    ],
  ] as const;
  return (
    <>
      <section
        id="faq-index"
        className="border-b border-black/15 bg-white px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="FAQ and objections" number="01 / answer index" light />
          <div className="grid gap-12 py-12 lg:grid-cols-[0.42fr_1.58fr]">
            <div>
              <p className="font-pixel text-7xl leading-[0.82] tracking-[-0.07em]">
                The short answer is here.
              </p>
              <p className="mt-6 text-sm leading-7 text-zinc-600">
                A searchable-feeling index without hiding the questions behind
                tiny cards.
              </p>
            </div>
            <div>
              {faqs.map(([question, answer], index) => (
                <details
                  key={question}
                  className="group border-t border-black/20 py-5 last:border-b"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                    <span className="flex items-center gap-5">
                      <span className="font-mono text-[9px] text-zinc-400">
                        0{index + 1}
                      </span>
                      <span className="font-sans text-xl tracking-[-0.04em]">
                        {question}
                      </span>
                    </span>
                    <span className="font-mono text-lg group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="ml-11 mt-4 max-w-[720px] text-sm leading-7 text-zinc-600">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq-objection-cards"
        className="border-b border-white/15 bg-[#101010] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="FAQ and objections" number="02 / objection deck" />
          <div className="py-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ff655a]">
              What buyers ask before they trust you
            </p>
            <div className="mt-8 grid gap-4 lg:grid-cols-4">
              {faqs.map(([question, answer], index) => (
                <article
                  key={question}
                  className={`min-h-[360px] border border-white/15 p-6 ${index === 0 ? "rotate-[-1deg] bg-[#f4d44d] text-black" : index === 1 ? "translate-y-6 bg-[#8b7cff] text-black" : index === 2 ? "rotate-[1deg] bg-white text-black" : "translate-y-3 bg-black"}`}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] opacity-50">
                    Objection 0{index + 1}
                  </p>
                  <h3 className="mt-12 font-pixel text-4xl leading-[0.9] tracking-[-0.06em]">
                    {question}
                  </h3>
                  <p className="mt-6 text-sm leading-6 opacity-65">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq-conversation"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[960px]">
          <Tag group="FAQ and objections" number="03 / live conversation" />
          <div className="py-14">
            <h2 className="text-center font-pixel text-7xl leading-[0.84] tracking-[-0.07em]">
              Ask the uncomfortable questions.
            </h2>
            <div className="mt-14 space-y-6">
              <div className="ml-auto max-w-[620px] bg-[#232323] p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                  Your team
                </p>
                <p className="mt-3 text-lg">Do we have to replace our logs?</p>
              </div>
              <div className="max-w-[720px] border-l-4 border-[#7ee0b8] bg-[#111] p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#7ee0b8]">
                  Uncoil
                </p>
                <p className="mt-3 text-lg leading-7">
                  No. Keep them. Uncoil adds the run-level context that
                  connects model calls, tools, quality, cost, and releases.
                </p>
              </div>
              <div className="ml-auto max-w-[620px] bg-[#232323] p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
                  Your team
                </p>
                <p className="mt-3 text-lg">Can we begin with one agent?</p>
              </div>
              <div className="max-w-[720px] border-l-4 border-[#f4d44d] bg-[#111] p-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#f4d44d]">
                  Uncoil
                </p>
                <p className="mt-3 text-lg leading-7">
                  That is the recommended path: one production workflow, one
                  useful trace, then expand from evidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DocsExplorations() {
  return (
    <>
      <section
        id="docs-terminal"
        className="border-b border-white/15 bg-[#0b0b0b] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Developer docs preview" number="01 / terminal takeover" />
          <div className="mt-12 border border-white/15 bg-black shadow-[20px_20px_0_#f4d44d]">
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-500">
              <span>quickstart.ts</span>
              <span className="flex items-center gap-2">
                <CircleDot className="size-3 text-[#7ee0b8]" /> first trace
              </span>
            </div>
            <div className="grid lg:grid-cols-[1.4fr_0.6fr]">
              <pre className="overflow-x-auto p-7 font-mono text-[13px] leading-8 text-zinc-300">
                <code>
                  <span className="text-[#8b7cff]">import</span>
                  {" { UncoilClient } from 'uncoil-sdk'\n\n"}
                  <span className="text-[#f4d44d]">const</span>
                  {" uncoil = new UncoilClient()\n\n"}
                  <span className="text-zinc-600">
                    {"// instrument → trace → inspect"}
                  </span>
                  {"\n"}
                  <span className="text-[#f4d44d]">await</span>
                  {
                    " uncoil.trace('support-agent', () => {\n  return agent.respond(ticket)\n})"
                  }
                </code>
              </pre>
              <div className="border-t border-white/15 p-7 lg:border-l lg:border-t-0">
                <p className="font-pixel text-5xl leading-[0.88] tracking-[-0.06em]">
                  One wrapper. The whole run.
                </p>
                <div className="mt-12">
                  <ArrowLink href="/docs">Open the quickstart</ArrowLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="docs-three-step"
        className="border-b border-black/15 bg-[#8b7cff] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag
            group="Developer docs preview"
            number="02 / executable steps"
            light
          />
          <div className="py-12">
            <h2 className="max-w-[900px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Install. Trace. Inspect.
            </h2>
            <div className="mt-12 grid border-l border-t border-black/20 lg:grid-cols-3">
              {[
                ["01", "Install", "npm install uncoil-sdk", "< 1 min"],
                ["02", "Trace", "wrap(agent.run)", "one function"],
                ["03", "Inspect", "open run_0182", "full evidence"],
              ].map(([number, title, code, time]) => (
                <article
                  key={title}
                  className="border-b border-r border-black/20 p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px]">{number}</span>
                    <Code2 className="size-4" />
                  </div>
                  <h3 className="mt-16 font-pixel text-5xl tracking-[-0.06em]">
                    {title}
                  </h3>
                  <code className="mt-7 block bg-black p-4 font-mono text-xs text-white">
                    {code}
                  </code>
                  <p className="mt-4 font-mono text-[8px] uppercase tracking-[0.13em] opacity-60">
                    {time}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="docs-reference"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Developer docs preview" number="03 / reference atlas" />
          <div className="grid gap-0 py-12 lg:grid-cols-[260px_1fr]">
            <nav
              aria-label="Preview documentation"
              className="border border-white/15 p-5 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500"
            >
              {[
                "Quickstart",
                "TypeScript SDK",
                "Python SDK",
                "OpenTelemetry",
                "Evaluation",
                "Prompts",
                "Lifecycle",
              ].map((item, index) => (
                <div
                  key={item}
                  className={`border-b border-white/10 py-4 ${index === 0 ? "text-white" : ""}`}
                >
                  {item}
                </div>
              ))}
            </nav>
            <div className="border border-white/15 p-7 md:p-10">
              <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#7ee0b8]">
                Quickstart / 01
              </p>
              <h2 className="mt-5 font-pixel text-6xl tracking-[-0.07em]">
                Send your first trace.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
                Create a project, copy the API key once, instrument a function,
                and open the resulting run.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {["Create project", "Add SDK", "Run agent"].map(
                  (item, index) => (
                    <div key={item} className="border border-white/15 p-4">
                      <span className="font-mono text-[8px] text-zinc-600">
                        0{index + 1}
                      </span>
                      <p className="mt-5 text-sm">{item}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function UseCaseExplorations() {
  return (
    <>
      <section
        id="use-cases-selector"
        className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag
            group="Use-case selector"
            number="01 / agent switchboard"
            light
          />
          <div className="py-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Select the operating surface
            </p>
            <div className="mt-8 grid border-l border-t border-black/15 md:grid-cols-2">
              {useCases.map(([title, body], index) => (
                <Link
                  href={`/use-cases/${title === "Coding" ? "tool-calling" : title.toLowerCase()}`}
                  key={title}
                  className={`group min-h-72 border-b border-r border-black/15 p-7 ${index === 0 ? "bg-[#ff655a]" : index === 2 ? "bg-black text-white" : "bg-white"}`}
                >
                  <span className="font-mono text-[9px] opacity-50">
                    0{index + 1}
                  </span>
                  <h2 className="mt-16 font-pixel text-6xl tracking-[-0.07em]">
                    {title}
                  </h2>
                  <p className="mt-4 max-w-md text-base leading-7 opacity-60">
                    {body}
                  </p>
                  <ArrowRight className="mt-8 size-5 transition-transform group-hover:translate-x-2" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="use-cases-stories"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Use-case selector" number="02 / story stack" />
          <div className="py-12">
            <h2 className="max-w-[920px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Different agents. The same need for evidence.
            </h2>
            <div className="mt-14 divide-y divide-white/15 border-y border-white/15">
              {useCases.map(([title, body], index) => (
                <div
                  key={title}
                  className="group grid items-center gap-6 py-7 md:grid-cols-[0.2fr_0.8fr_1.2fr_auto]"
                >
                  <span className="font-mono text-[9px] text-zinc-600">
                    0{index + 1}
                  </span>
                  <h3 className="font-pixel text-4xl tracking-[-0.06em] group-hover:text-[#f4d44d]">
                    {title}
                  </h3>
                  <p className="text-sm text-zinc-500">{body}</p>
                  <ArrowUpRight className="size-4 text-zinc-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="use-cases-map"
        className="border-b border-white/15 bg-[#0c0b10] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Use-case selector" number="03 / workload map" />
          <div className="relative mt-12 min-h-[620px] overflow-hidden border border-white/15 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:54px_54px]">
            <div className="absolute left-1/2 top-1/2 flex size-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#8b7cff] bg-black text-center font-pixel text-3xl leading-none">
              Production
              <br />
              evidence
            </div>
            {useCases.map(([title, body], index) => (
              <div
                key={title}
                className={`absolute w-52 border p-5 ${index === 0 ? "left-[7%] top-[12%] border-[#ff655a]" : index === 1 ? "right-[7%] top-[14%] border-[#f4d44d]" : index === 2 ? "bottom-[10%] left-[12%] border-[#8b7cff]" : "bottom-[9%] right-[9%] border-[#7ee0b8]"} bg-black`}
              >
                <p className="font-pixel text-3xl tracking-[-0.05em]">
                  {title}
                </p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ComparisonExplorations() {
  return (
    <>
      <section
        id="comparison-blind-spots"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Comparison" number="01 / blind spots" />
          <div className="py-12">
            <h2 className="max-w-[1000px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Logs tell you events. Uncoil tells you the run.
            </h2>
            <div className="mt-14 grid gap-px bg-white/15 lg:grid-cols-3">
              {[
                ["Logs", "Scattered events", "What emitted"],
                ["Dashboards", "Aggregated symptoms", "What moved"],
                ["Uncoil", "Connected evidence", "What to change"],
              ].map(([title, problem, outcome], index) => (
                <article
                  key={title}
                  className={`min-h-[380px] p-7 ${index === 2 ? "bg-[#f4d44d] text-black" : "bg-[#090909]"}`}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.13em] opacity-50">
                    Option 0{index + 1}
                  </p>
                  <h3 className="mt-12 font-pixel text-6xl tracking-[-0.07em]">
                    {title}
                  </h3>
                  <p className="mt-8 text-sm opacity-50">{problem}</p>
                  <div className="mt-16 border-t border-current/15 pt-5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-50">
                      Answers
                    </p>
                    <p className="mt-3 text-xl">{outcome}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="comparison-spectrum"
        className="border-b border-black/15 bg-[#ff655a] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Comparison" number="02 / evidence spectrum" light />
          <div className="py-14">
            <div className="flex items-end justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">
                Less context
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">
                Release evidence
              </span>
            </div>
            <div className="relative mt-8 h-4 bg-black/15">
              <div className="absolute inset-y-0 left-0 w-1/5 bg-black/30" />
              <div className="absolute inset-y-0 left-1/5 w-1/4 bg-black/50" />
              <div className="absolute inset-y-0 right-0 w-[55%] bg-black" />
            </div>
            <div className="mt-8 grid grid-cols-3">
              <div>
                <p className="font-pixel text-5xl tracking-[-0.06em]">Logs</p>
                <p className="mt-3 text-sm opacity-60">Events</p>
              </div>
              <div className="text-center">
                <p className="font-pixel text-5xl tracking-[-0.06em]">APM</p>
                <p className="mt-3 text-sm opacity-60">Symptoms</p>
              </div>
              <div className="text-right">
                <p className="font-pixel text-5xl tracking-[-0.06em]">
                  Uncoil
                </p>
                <p className="mt-3 text-sm opacity-60">Decision + outcome</p>
              </div>
            </div>
            <p className="mt-20 max-w-4xl font-pixel text-7xl leading-[0.84] tracking-[-0.07em]">
              Move from “something failed” to “this is the change to test.”
            </p>
          </div>
        </div>
      </section>

      <section
        id="comparison-before-after"
        className="relative overflow-hidden border-b border-white/15 bg-black"
      >
        <MotionArtwork />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-12 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <Tag group="Comparison" number="03 / failure to release" />
            <div className="mt-8 flex flex-wrap items-end justify-between gap-8">
              <h2 className="max-w-[780px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
                Chaos in. Evidence out.
              </h2>
              <ArrowLink href="/product/lifecycle">
                See the improvement loop
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ResourceExplorations() {
  return (
    <>
      <section
        id="resources-covers"
        className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag
            group="Blog and resources"
            number="01 / editorial covers"
            light
          />
          <div className="py-12">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <h2 className="max-w-[700px] font-pixel text-7xl leading-[0.82] tracking-[-0.07em]">
                Field notes for teams shipping agents.
              </h2>
              <ArrowLink href="/blog" light>
                Visit the journal
              </ArrowLink>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="min-h-[520px] bg-black p-7 text-white">
                <span className="font-mono text-[9px] text-[#f4d44d]">
                  GUIDE / 01
                </span>
                <div className="mt-24 size-24 border-[12px] border-[#ff655a]" />
                <h3 className="mt-16 font-pixel text-5xl leading-[0.88] tracking-[-0.06em]">
                  Debugging agent failures with traces.
                </h3>
              </article>
              <article className="min-h-[520px] bg-[#f4d44d] p-7">
                <span className="font-mono text-[9px]">REPORT / 02</span>
                <div className="mt-20 grid grid-cols-5 gap-2">
                  {[3, 5, 2, 8, 6].map((height, index) => (
                    <span
                      key={index}
                      className="bg-black"
                      style={{ height: `${height * 14}px` }}
                    />
                  ))}
                </div>
                <h3 className="mt-16 font-pixel text-5xl leading-[0.88] tracking-[-0.06em]">
                  Cost and latency in production.
                </h3>
              </article>
              <article className="min-h-[520px] bg-[#8b7cff] p-7">
                <span className="font-mono text-[9px]">PLAYBOOK / 03</span>
                <div className="mt-20 flex size-36 items-center justify-center rounded-full border border-black">
                  <GitBranch className="size-12" />
                </div>
                <h3 className="mt-12 font-pixel text-5xl leading-[0.88] tracking-[-0.06em]">
                  Tracing multi-agent handoffs.
                </h3>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section
        id="resources-newsroom"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Blog and resources" number="02 / newsroom" />
          <div className="grid gap-px py-12 lg:grid-cols-[1.2fr_0.8fr] lg:grid-rows-2">
            <article className="relative min-h-[620px] overflow-hidden lg:row-span-2">
              <InteractiveSignalMap />
            </article>
            <article className="border border-white/15 p-7">
              <span className="font-mono text-[9px] text-zinc-600">
                RELEASE NOTES
              </span>
              <h3 className="mt-10 font-pixel text-4xl leading-[0.9] tracking-[-0.05em]">
                Evaluation monitors arrive in the review loop.
              </h3>
              <p className="mt-5 text-sm text-zinc-500">4 minute read</p>
            </article>
            <article className="border border-white/15 bg-[#ff655a] p-7 text-black">
              <span className="font-mono text-[9px]">FIELD NOTE</span>
              <h3 className="mt-10 font-pixel text-4xl leading-[0.9] tracking-[-0.05em]">
                The retry looked harmless. The cost curve disagreed.
              </h3>
              <p className="mt-5 text-sm text-black/55">6 minute read</p>
            </article>
          </div>
        </div>
      </section>

      <section
        id="resources-release-notes"
        className="border-b border-white/15 bg-[#0b0b0b] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Blog and resources" number="03 / release tape" />
          <div className="py-12">
            <p className="font-pixel text-7xl leading-[0.84] tracking-[-0.07em]">
              Ship notes worth reading.
            </p>
            <div className="mt-12 overflow-x-auto">
              <div className="flex min-w-[980px]">
                {[
                  ["AUG 09", "Evaluation monitors", "#f4d44d"],
                  ["AUG 02", "Trace deep links", "#8b7cff"],
                  ["JUL 24", "Dataset access", "#7ee0b8"],
                  ["JUL 11", "Prompt deployments", "#ff655a"],
                ].map(([date, title, color], index) => (
                  <article
                    key={title}
                    className="w-[320px] shrink-0 border border-white/15 p-6"
                  >
                    <div className="h-2" style={{ backgroundColor: color }} />
                    <p className="mt-8 font-mono text-[9px] text-zinc-600">
                      {date} / 0{index + 1}
                    </p>
                    <h3 className="mt-10 font-pixel text-4xl leading-[0.9] tracking-[-0.05em]">
                      {title}
                    </h3>
                    <p className="mt-8 text-sm leading-6 text-zinc-500">
                      A compact release story, connected to the workflow it
                      improves.
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function WorkflowExplorations() {
  const steps = [
    ["01", "Instrument"],
    ["02", "Observe"],
    ["03", "Evaluate"],
    ["04", "Improve"],
    ["05", "Release"],
  ] as const;
  return (
    <>
      <section
        id="workflow-ribbon"
        className="overflow-hidden border-b border-white/15 bg-[#f4d44d] py-16 text-black md:py-20"
      >
        <div className="px-6 md:px-10">
          <div className="mx-auto max-w-[1240px]">
            <Tag group="Product workflow" number="01 / kinetic ribbon" light />
          </div>
        </div>
        <div className="mt-14 flex w-max -rotate-2 animate-[exploration-marquee_26s_linear_infinite] border-y border-black bg-black py-5 text-white hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...steps, ...steps].map(([number, title], index) => (
            <span
              key={`${title}-${index}`}
              className="flex items-center gap-5 px-8 font-pixel text-5xl tracking-[-0.05em]"
            >
              <span className="font-mono text-[9px] text-[#f4d44d]">
                {number}
              </span>
              {title}
              <ArrowRight className="size-5 text-zinc-600" />
            </span>
          ))}
        </div>
        <div className="mx-auto mt-20 max-w-[1240px] px-6 md:px-10">
          <h2 className="max-w-4xl font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
            Production becomes the improvement loop.
          </h2>
        </div>
      </section>

      <section
        id="workflow-circular"
        className="border-b border-white/15 bg-[#0c0b10] px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Product workflow" number="02 / continuous loop" />
          <div className="grid items-center gap-14 py-12 lg:grid-cols-[1fr_0.8fr]">
            <div className="relative mx-auto aspect-square w-full max-w-[620px]">
              <div className="absolute inset-[8%] rounded-full border border-dashed border-[#8b7cff]/50" />
              <div className="absolute inset-[28%] flex items-center justify-center rounded-full bg-[#8b7cff] text-center font-pixel text-4xl leading-none text-black">
                Every
                <br />
                run
              </div>
              {steps.map(([number, title], index) => (
                <div
                  key={title}
                  className={`absolute flex size-28 flex-col items-center justify-center rounded-full border border-white/20 bg-black ${["left-1/2 top-0 -translate-x-1/2", "right-0 top-[30%]", "bottom-[5%] right-[12%]", "bottom-[5%] left-[12%]", "left-0 top-[30%]"][index]}`}
                >
                  <span className="font-mono text-[8px] text-zinc-600">
                    {number}
                  </span>
                  <span className="mt-2 font-pixel text-xl">{title}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#8b7cff]">
                No dead-end dashboards
              </p>
              <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
                Every signal points to the next decision.
              </h2>
              <p className="mt-7 text-lg leading-8 text-zinc-400">
                Capture reality, turn failures into evaluation cases, compare
                the fix, and keep watching after release.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="workflow-release-rail"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Product workflow" number="03 / release rail" />
          <div className="py-14">
            <div className="relative">
              <div className="absolute left-0 right-0 top-7 h-px bg-white/20" />
              <div className="relative grid grid-cols-5">
                {steps.map(([number, title], index) => (
                  <div key={title} className="text-center">
                    <span
                      className={`mx-auto flex size-14 items-center justify-center border font-mono text-[9px] ${index === 4 ? "border-[#7ee0b8] bg-[#7ee0b8] text-black" : "border-white/20 bg-black"}`}
                    >
                      {number}
                    </span>
                    <p className="mt-6 font-pixel text-2xl tracking-[-0.04em]">
                      {title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-16 grid border border-white/15 lg:grid-cols-[1fr_auto]">
              <div className="p-8">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
                  Release candidate / v2.4.0
                </p>
                <p className="mt-5 font-pixel text-5xl tracking-[-0.06em]">
                  Regression check passed.
                </p>
              </div>
              <div className="flex items-center bg-[#7ee0b8] px-8 text-black">
                <ShieldCheck className="mr-3 size-5" />
                <span className="font-mono text-[9px] uppercase tracking-[0.13em]">
                  Ready to promote
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ContactExplorations() {
  return (
    <>
      <section
        id="contact-intake"
        className="border-b border-black/15 bg-white px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag
            group="Contact and sales"
            number="01 / enterprise intake"
            light
          />
          <div className="grid gap-16 py-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#ff655a]">
                Start with the operating problem
              </p>
              <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
                Tell us where the agent gets hard to trust.
              </h2>
              <p className="mt-7 max-w-lg text-lg leading-8 text-zinc-600">
                We’ll shape the conversation around your architecture, security
                constraints, and release workflow.
              </p>
            </div>
            <form
              action="/api/leads"
              method="post"
              className="border border-black/20 bg-[#eceae3] p-7"
            >
              <label className="block font-mono text-[9px] uppercase tracking-[0.13em]">
                Work email
                <input
                  name="email"
                  type="email"
                  className="mt-3 h-12 w-full border border-black/20 bg-white px-4 font-sans text-sm outline-none focus:border-black"
                  placeholder="you@company.com"
                />
              </label>
              <label className="mt-6 block font-mono text-[9px] uppercase tracking-[0.13em]">
                What are you operating?
                <textarea
                  name="context"
                  rows={5}
                  className="mt-3 w-full resize-none border border-black/20 bg-white p-4 font-sans text-sm outline-none focus:border-black"
                  placeholder="Agent type, scale, and current challenge"
                />
              </label>
              <button className="mt-6 flex h-12 w-full items-center justify-between bg-black px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-white">
                Start the conversation
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <section
        id="contact-office-hours"
        className="border-b border-white/15 bg-[#8b7cff] px-6 py-16 text-black md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Contact and sales" number="02 / office hours" light />
          <div className="py-12 text-center">
            <Radio className="mx-auto size-8" />
            <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.18em]">
              Live architecture office hours
            </p>
            <h2 className="mx-auto mt-6 max-w-[920px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Bring one trace. Leave with a clearer system.
            </h2>
            <div className="mx-auto mt-12 grid max-w-3xl border border-black/20 sm:grid-cols-3">
              {[
                ["TUE", "10:00", "Agent tracing"],
                ["THU", "14:00", "Evaluation design"],
                ["FRI", "09:00", "Enterprise security"],
              ].map(([day, time, topic]) => (
                <div
                  key={day}
                  className="border-b border-black/20 p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                >
                  <p className="font-mono text-[9px] opacity-50">{day}</p>
                  <p className="mt-5 font-pixel text-5xl tracking-[-0.06em]">
                    {time}
                  </p>
                  <p className="mt-3 text-sm opacity-60">{topic}</p>
                </div>
              ))}
            </div>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-12 items-center gap-3 bg-black px-6 font-mono text-[9px] uppercase tracking-[0.14em] text-white"
            >
              Book a working session
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="contact-enterprise-brief"
        className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
      >
        <div className="mx-auto max-w-[1240px]">
          <Tag group="Contact and sales" number="03 / enterprise brief" />
          <div className="grid gap-px bg-white/15 py-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-[#0a0a0a] p-8 md:p-12">
              <span className="inline-flex items-center gap-2 bg-[#7ee0b8] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.13em] text-black">
                <Sparkles className="size-3" /> Enterprise design session
              </span>
              <h2 className="mt-8 max-w-[720px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
                A deployment plan your team can defend.
              </h2>
            </div>
            <div className="bg-[#111] p-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                What we cover
              </p>
              <div className="mt-8 space-y-5">
                {[
                  "Current agent architecture",
                  "Telemetry and retention",
                  "Security review path",
                  "Evaluation rollout",
                  "Success criteria",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 border-b border-white/10 pb-5"
                  >
                    <span className="font-mono text-[8px] text-zinc-600">
                      0{index + 1}
                    </span>
                    <Check className="size-3 text-[#7ee0b8]" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/contact"
                className="mt-8 flex h-12 items-center justify-between bg-white px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-black"
              >
                Design your plan
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function LandingSurfaceExplorations() {
  return (
    <section
      aria-label="Creative landing-page exploration gallery"
      className="border-t-4 border-double border-white/30 bg-black"
    >
      <div className="border-b border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Creative surface explorations
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
            30 layouts / 10 themes / placeholder proof
          </p>
        </div>
      </div>
      <ProofExplorations />
      <IntegrationExplorations />
      <SecurityExplorations />
      <FaqExplorations />
      <DocsExplorations />
      <UseCaseExplorations />
      <ComparisonExplorations />
      <ResourceExplorations />
      <WorkflowExplorations />
      <ContactExplorations />
      <div className="border-y border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
            End of creative explorations
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
            Existing homepage sections remain unchanged
          </p>
        </div>
      </div>
    </section>
  );
}
