import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleDot,
  Cloud,
  Code2,
  GitBranch,
  Globe2,
  Layers3,
  LockKeyhole,
  Radio,
  ShieldCheck,
} from "lucide-react";
import {
  CostSimulator,
  EvaluationPlayground,
  FutureSandbox,
  PersonaRouter,
  ReleaseGateBuilder,
  RoiCalculator,
} from "@/components/marketing/landing-future-interactions";

function FutureTag({
  number,
  title,
  light = false,
}: {
  number: string;
  title: string;
  light?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b pb-4 font-mono text-[9px] uppercase tracking-[0.16em] ${light ? "border-black/15 text-zinc-500" : "border-white/15 text-zinc-500"}`}
    >
      <span>
        Future {number} / {title}
      </span>
      <span>Exploration</span>
    </div>
  );
}

function FutureLink({
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

function SandboxSection() {
  return (
    <section
      id="future-sandbox"
      className="border-b border-white/15 bg-[#080808] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="01" title="interactive product sandbox" />
        <div className="py-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ee0b8]">
                Try the product before the pitch
              </p>
              <h2 className="mt-5 max-w-[840px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
                Investigate the failure yourself.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-zinc-500">
              A homepage-native trace experience that turns product proof into
              something the visitor can touch.
            </p>
          </div>
          <FutureSandbox />
        </div>
      </div>
    </section>
  );
}

function RoiSection() {
  return (
    <section
      id="future-roi-calculator"
      className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="02" title="ROI calculator" light />
        <div className="grid gap-12 py-12 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Model the opportunity
            </p>
            <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
              What does faster clarity give back?
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-600">
              Adjust the workload and incident profile. Keep the assumptions
              visible so the calculator builds trust instead of inventing
              certainty.
            </p>
          </div>
          <RoiCalculator />
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  const stages = [
    ["Runtime", "SDK + OTLP", "#f4d44d"],
    ["Ingest", "Verify + route", "#ff655a"],
    ["Telemetry", "Spans + summaries", "#8b7cff"],
    ["Intelligence", "Evaluate + compare", "#7ee0b8"],
    ["Action", "Alert + release", "#ffffff"],
  ] as const;
  return (
    <section
      id="future-architecture"
      className="relative overflow-hidden border-b border-white/15 bg-[#0b0a10] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="03" title="architecture explorer" />
        <div className="py-12">
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b7cff]">
              From emitted span to operating decision
            </p>
            <h2 className="mx-auto mt-6 max-w-[900px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              One signal. Five transformations.
            </h2>
          </div>
          <div className="relative mt-16 grid gap-8 lg:grid-cols-5">
            <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-white/20 lg:block" />
            {stages.map(([title, body, color], index) => (
              <article key={title} className="group relative text-center">
                <span
                  className="relative z-10 mx-auto flex size-14 items-center justify-center rounded-full border border-white/20 bg-black font-mono text-[9px] transition-transform duration-300 group-hover:scale-125"
                  style={{ boxShadow: `0 0 35px ${color}25` }}
                >
                  0{index + 1}
                </span>
                <div className="mt-7 border border-white/15 p-5 transition-colors group-hover:bg-white/5">
                  <div
                    className="mx-auto h-1 w-12"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="mt-5 font-pixel text-3xl tracking-[-0.05em]">
                    {title}
                  </h3>
                  <p className="mt-3 text-xs text-zinc-500">{body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-12 text-center">
            <FutureLink href="/docs/lifecycle">
              Read the architecture path
            </FutureLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function MigrationSection() {
  return (
    <section
      id="future-migration"
      className="border-b border-black/15 bg-white px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="04" title="gradual migration" light />
        <div className="grid gap-14 py-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 border border-black/20 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.13em]">
              <Layers3 className="size-3" /> Additive by design
            </span>
            <h2 className="mt-7 font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Keep the logs. Add the run.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600">
              Start with one production workflow. Uncoil connects the
              agent-level context while your existing logs and APM remain
              exactly where they are.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ["Week 01", "Instrument one agent", "Existing stack unchanged"],
              [
                "Week 02",
                "Turn failures into evaluations",
                "Add shared review",
              ],
              [
                "Week 03",
                "Compare the next release",
                "Keep current deployment",
              ],
              [
                "Later",
                "Expand where evidence earns it",
                "No forced migration",
              ],
            ].map(([time, title, note], index) => (
              <div
                key={time}
                className={`grid grid-cols-[80px_1fr] border border-black/15 p-5 ${index === 0 ? "bg-[#f4d44d]" : "bg-[#eceae3]"}`}
              >
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] opacity-50">
                  {time}
                </span>
                <div>
                  <p className="font-pixel text-3xl tracking-[-0.05em]">
                    {title}
                  </p>
                  <p className="mt-2 text-xs opacity-55">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OnboardingSection() {
  const steps = [
    ["01", "Create", "Project + environment"],
    ["02", "Key", "Copy once"],
    ["03", "Install", "TypeScript or Python"],
    ["04", "Trace", "Run one agent"],
    ["05", "Inspect", "Find the first signal"],
  ] as const;
  return (
    <section
      id="future-onboarding"
      className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="05" title="onboarding journey" />
        <div className="py-12">
          <p className="font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
            Five steps to the first useful trace.
          </p>
          <div className="mt-14 flex min-w-0 flex-col border-l border-t border-white/15 lg:flex-row">
            {steps.map(([number, title, body], index) => (
              <article
                key={title}
                className={`group relative flex-1 border-b border-r border-white/15 p-6 ${index === 4 ? "bg-[#7ee0b8] text-black" : ""}`}
              >
                <span className="font-mono text-[9px] opacity-45">
                  {number}
                </span>
                <div className="mt-14 flex size-10 items-center justify-center border border-current/20 transition-transform group-hover:rotate-45">
                  <ArrowDown className="size-4" />
                </div>
                <h3 className="mt-8 font-pixel text-4xl tracking-[-0.06em]">
                  {title}
                </h3>
                <p className="mt-3 text-xs opacity-55">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReliabilitySection() {
  return (
    <section
      id="future-reliability"
      className="border-b border-white/15 bg-[#090909] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="06" title="reliability and status" />
        <div className="grid gap-px py-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="bg-[#7ee0b8] p-8 text-black">
            <CircleDot className="size-7" />
            <p className="mt-16 font-mono text-[9px] uppercase tracking-[0.14em]">
              All systems operational
            </p>
            <p className="mt-5 font-pixel text-8xl leading-none tracking-[-0.09em]">
              99.98%
            </p>
            <p className="mt-3 text-sm opacity-55">
              Illustrative ingest availability
            </p>
          </div>
          <div className="border border-white/15">
            {[
              ["Ingest API", "Operational", "42ms"],
              ["Processing pipeline", "Operational", "1.2s"],
              ["Dashboard API", "Operational", "88ms"],
              ["Evaluation workers", "Operational", "2.4s"],
            ].map(([service, state, latency]) => (
              <div
                key={service}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-5 border-b border-white/10 p-5 last:border-b-0"
              >
                <span className="font-sans text-lg">{service}</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#7ee0b8]">
                  {state}
                </span>
                <span className="font-mono text-[9px] text-zinc-600">
                  {latency}
                </span>
              </div>
            ))}
            <div className="p-5">
              <FutureLink href="/status">View status history</FutureLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeploymentSection() {
  return (
    <section
      id="future-deployment"
      className="border-b border-black/15 bg-[#8b7cff] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="07" title="deployment options" light />
        <div className="py-12">
          <h2 className="max-w-[940px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
            Put the evidence where the policy allows.
          </h2>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {[
              ["Managed cloud", "Fastest path", "Available", Cloud],
              [
                "Regional controls",
                "Data-location review",
                "Enterprise",
                Globe2,
              ],
              [
                "Private deployment",
                "Architecture discussion",
                "Roadmap",
                LockKeyhole,
              ],
            ].map(([title, body, status, Icon], index) => (
              <article
                key={String(title)}
                className={`min-h-[330px] border border-black/20 p-7 ${index === 0 ? "bg-black text-white" : "bg-white/35"}`}
              >
                <Icon className="size-7" />
                <p className="mt-16 font-mono text-[8px] uppercase tracking-[0.12em] opacity-50">
                  {String(status)}
                </p>
                <h3 className="mt-4 font-pixel text-5xl tracking-[-0.06em]">
                  {String(title)}
                </h3>
                <p className="mt-4 text-sm opacity-60">{String(body)}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PersonaSection() {
  return (
    <section
      id="future-persona-router"
      className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="08" title="persona router" light />
        <div className="py-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-7">
            <h2 className="max-w-[800px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Start with the decision you own.
            </h2>
            <p className="max-w-sm text-sm leading-7 text-zinc-600">
              A single product can speak differently to engineering, AI
              leadership, product, and security.
            </p>
          </div>
          <PersonaRouter />
        </div>
      </div>
    </section>
  );
}

function EvaluationSection() {
  return (
    <section
      id="future-evaluation-playground"
      className="border-b border-white/15 bg-[#080808] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="09" title="evaluation playground" />
        <div className="grid gap-12 py-12 lg:grid-cols-[0.65fr_1.35fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">
              Compare the candidate
            </p>
            <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
              Make the release argument visible.
            </h2>
            <p className="mt-7 text-lg leading-8 text-zinc-400">
              Switch between prompt candidates and see the quality, latency,
              cost, and promotion result move together.
            </p>
          </div>
          <EvaluationPlayground />
        </div>
      </div>
    </section>
  );
}

function CostSection() {
  return (
    <section
      id="future-cost-simulator"
      className="border-b border-black/15 bg-white px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="10" title="cost simulator" light />
        <div className="py-12">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-7">
            <h2 className="max-w-[750px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              Watch the retry become a bill.
            </h2>
            <p className="max-w-sm text-sm leading-7 text-zinc-600">
              Model how workload, retries, and model cost compound—then show the
              value of operational controls.
            </p>
          </div>
          <CostSimulator />
        </div>
      </div>
    </section>
  );
}

function ReleaseGateSection() {
  return (
    <section
      id="future-release-gate"
      className="border-b border-white/15 bg-[#0b0b0b] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="11" title="release gate builder" />
        <div className="grid gap-12 py-12 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
          <div>
            <ShieldCheck className="size-8 text-[#7ee0b8]" />
            <h2 className="mt-7 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
              Build the proof required to ship.
            </h2>
            <p className="mt-7 text-lg leading-8 text-zinc-400">
              Let visitors assemble a release policy and immediately understand
              how Uncoil turns evidence into a promotion decision.
            </p>
          </div>
          <ReleaseGateBuilder />
        </div>
      </div>
    </section>
  );
}

function TraceAnatomySection() {
  const parts = [
    ["Model", "Prompt + response", "#f4d44d"],
    ["Tool", "Input + output", "#ff655a"],
    ["Retry", "Reason + budget", "#8b7cff"],
    ["Score", "Evaluator result", "#7ee0b8"],
    ["Release", "Version context", "#ffffff"],
  ] as const;
  return (
    <section
      id="future-trace-anatomy"
      className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="12" title="trace anatomy" />
        <div className="py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Exploded view / run_8f21a9
          </p>
          <h2 className="mx-auto mt-6 max-w-[900px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
            Every layer of the answer.
          </h2>
          <div className="relative mx-auto mt-16 max-w-[900px]">
            {parts.map(([title, body, color], index) => (
              <div
                key={title}
                className="relative mx-auto mb-[-12px] grid max-w-[760px] grid-cols-[80px_1fr_auto] items-center border border-white/20 bg-black p-5 text-left transition-transform duration-300 hover:z-10 hover:-translate-y-2"
                style={{
                  width: `${100 - index * 7}%`,
                  boxShadow: `0 10px 35px ${color}12`,
                }}
              >
                <span className="font-mono text-[9px] text-zinc-600">
                  0{index + 1}
                </span>
                <div>
                  <p className="font-pixel text-3xl tracking-[-0.05em]">
                    {title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">{body}</p>
                </div>
                <span className="size-3" style={{ backgroundColor: color }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManifestoSection() {
  return (
    <section
      id="future-manifesto"
      className="relative overflow-hidden border-b border-black/15 bg-[#ff655a] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="absolute -right-10 -top-24 font-pixel text-[30rem] leading-none text-black/5">
        ?
      </div>
      <div className="relative mx-auto max-w-[1240px]">
        <FutureTag number="13" title="brand manifesto" light />
        <div className="py-16">
          <p className="max-w-[1120px] font-pixel text-[clamp(4rem,9vw,9rem)] leading-[0.78] tracking-[-0.08em]">
            An agent is not a request. It is a chain of decisions.
          </p>
          <div className="mt-14 grid gap-8 border-t border-black/20 pt-8 md:grid-cols-3">
            <p className="text-lg leading-8">
              Traditional monitoring stops at the endpoint.
            </p>
            <p className="text-lg leading-8">
              Agent engineering begins inside the run.
            </p>
            <p className="text-lg leading-8">
              Uncoil makes that run explainable, measurable, and releasable.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FounderSection() {
  return (
    <section
      id="future-founder-story"
      className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="14" title="founder and company story" light />
        <div className="grid gap-px py-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-black p-8 text-white md:p-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#f4d44d]">
              The founding thesis
            </p>
            <h2 className="mt-10 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
              The hardest bug was always between the calls.
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-400">
              Uncoil began with a simple frustration: production logs showed
              that something failed, but not which agent decision made failure
              inevitable.
            </p>
          </div>
          <div className="grid grid-rows-3">
            {[
              ["01", "Evidence over anecdotes"],
              ["02", "Production is the feedback loop"],
              ["03", "Every release should prove itself"],
            ].map(([number, title], index) => (
              <div
                key={number}
                className={`border border-black/15 p-7 ${index === 1 ? "bg-[#f4d44d]" : "bg-white"}`}
              >
                <p className="font-mono text-[9px] opacity-45">{number}</p>
                <p className="mt-8 font-pixel text-4xl tracking-[-0.06em]">
                  {title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section
      id="future-community"
      className="border-b border-white/15 bg-[#0b0b0b] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="15" title="community and open source" />
        <div className="py-12">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8b7cff]">
                Build the instrumentation layer together
              </p>
              <h2 className="mt-6 max-w-[850px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
                Open SDKs. Shared examples. Better agents.
              </h2>
            </div>
            <GitBranch className="size-16 text-zinc-700" />
          </div>
          <div className="mt-14 grid gap-px bg-white/15 md:grid-cols-4">
            {[
              ["TypeScript SDK", "Packages"],
              ["Python SDK", "Packages"],
              ["OTLP recipes", "Examples"],
              ["Agent templates", "Community"],
            ].map(([title, label], index) => (
              <article
                key={title}
                className={`min-h-64 p-6 ${index === 3 ? "bg-[#8b7cff] text-black" : "bg-black"}`}
              >
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] opacity-50">
                  {label}
                </p>
                <Code2 className="mt-12 size-5" />
                <h3 className="mt-7 font-pixel text-4xl tracking-[-0.06em]">
                  {title}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplatesSection() {
  const templates = [
    ["Support triage", "Tools + policy", "#ff655a"],
    ["Research agent", "Sources + grounding", "#f4d44d"],
    ["Coding agent", "Tool calls + patch", "#8b7cff"],
    ["RAG assistant", "Retrieval + answer", "#7ee0b8"],
    ["Browser agent", "Actions + state", "#ffffff"],
    ["Workflow automation", "Retries + cost", "#b7b7b7"],
  ] as const;
  return (
    <section
      id="future-templates"
      className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="16" title="template gallery" />
        <div className="py-12">
          <h2 className="max-w-[900px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
            Start from a run that looks like yours.
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map(([title, body, color], index) => (
              <article
                key={title}
                className="group border border-white/15 p-6 transition-transform hover:-translate-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[8px] text-zinc-600">
                    TEMPLATE 0{index + 1}
                  </span>
                  <span className="size-3" style={{ backgroundColor: color }} />
                </div>
                <div className="mt-16 h-20 border-l border-b border-white/20">
                  <div
                    className="h-px w-2/3 translate-y-8"
                    style={{ backgroundColor: color }}
                  />
                </div>
                <h3 className="mt-7 font-pixel text-4xl tracking-[-0.06em]">
                  {title}
                </h3>
                <p className="mt-3 text-sm text-zinc-500">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  return (
    <section
      id="future-newsletter"
      className="border-b border-black/15 bg-[#f4d44d] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="17" title="editorial newsletter" light />
        <div className="grid gap-12 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <BookOpen className="size-7" />
            <h2 className="mt-8 max-w-[850px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              One useful production lesson, every other Tuesday.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-black/60">
              Trace teardowns, evaluation patterns, release notes, and the
              occasional expensive retry.
            </p>
          </div>
          <form
            action="/api/leads"
            method="post"
            className="border border-black/20 bg-white p-6"
          >
            <label className="font-mono text-[9px] uppercase tracking-[0.13em]">
              Work email
              <input
                name="email"
                type="email"
                placeholder="you@company.com"
                className="mt-4 h-12 w-full border border-black/20 px-4 font-sans text-sm outline-none focus:border-black"
              />
            </label>
            <button className="mt-3 flex h-12 w-full items-center justify-between bg-black px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-white">
              Subscribe
              <ArrowRight className="size-4" />
            </button>
            <p className="mt-4 font-mono text-[8px] uppercase tracking-[0.12em] text-black/45">
              Practical · technical · worth opening
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

function AnnouncementSection() {
  return (
    <section
      id="future-announcement"
      className="border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="18" title="announcement system" />
        <div className="py-12">
          <div className="border border-white/15">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-[#ff655a] px-5 py-4 text-black">
              <p className="font-mono text-[9px] uppercase tracking-[0.13em]">
                <span className="mr-3 bg-black px-2 py-1 text-white">New</span>{" "}
                Evaluation monitors are live
              </p>
              <ArrowRight className="size-4" />
            </div>
            <div className="grid lg:grid-cols-[1fr_0.5fr]">
              <div className="p-8 md:p-12">
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-600">
                  Release / 2026.08
                </p>
                <h2 className="mt-6 max-w-3xl font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
                  Catch quality drift before the customer does.
                </h2>
              </div>
              <div className="flex items-center justify-center border-t border-white/15 bg-[#111] p-8 lg:border-l lg:border-t-0">
                <Link
                  href="/changelog"
                  className="flex h-14 w-full items-center justify-between bg-white px-5 font-mono text-[9px] uppercase tracking-[0.14em] text-black"
                >
                  Read the release
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NavigationSection() {
  return (
    <section
      id="future-navigation"
      className="border-b border-black/15 bg-[#eceae3] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="19" title="navigation rework" light />
        <div className="py-12">
          <div className="border border-black/20 bg-white shadow-[18px_18px_0_#111]">
            <div className="flex items-center justify-between border-b border-black/15 px-6 py-4">
              <span className="font-pixel text-2xl">uncoil</span>
              <div className="hidden gap-7 font-mono text-[9px] uppercase tracking-[0.12em] md:flex">
                <span>Product</span>
                <span>Solutions</span>
                <span>Developers</span>
                <span>Company</span>
              </div>
              <span className="bg-black px-4 py-2 font-mono text-[8px] uppercase text-white">
                Start free
              </span>
            </div>
            <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
              <div className="grid border-b border-black/15 sm:grid-cols-2 lg:border-b-0 lg:border-r">
                {[
                  ["Observe", "Traces · sessions · costs"],
                  ["Improve", "Evaluations · datasets · prompts"],
                  ["Release", "Experiments · gates · monitors"],
                  ["Operate", "Alerts · reports · integrations"],
                ].map(([title, body], index) => (
                  <div
                    key={title}
                    className={`border-b border-r border-black/10 p-6 ${index === 1 ? "bg-[#f4d44d]" : ""}`}
                  >
                    <p className="font-pixel text-4xl tracking-[-0.06em]">
                      {title}
                    </p>
                    <p className="mt-3 text-xs text-zinc-500">{body}</p>
                  </div>
                ))}
              </div>
              <div className="bg-black p-7 text-white">
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                  Featured
                </p>
                <p className="mt-10 font-pixel text-5xl leading-[0.88] tracking-[-0.06em]">
                  The complete agent lifecycle.
                </p>
                <FutureLink href="/product/lifecycle">
                  Explore workflow
                </FutureLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroReworkSection() {
  return (
    <section
      id="future-hero-rework"
      className="relative overflow-hidden border-b border-white/15 bg-black px-6 py-16 md:px-10 md:py-20"
    >
      <Image
        src="/images/explorations/agent-signal-map.png"
        alt="Abstract agent signal network"
        fill
        sizes="100vw"
        className="object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="relative mx-auto max-w-[1240px]">
        <FutureTag number="20" title="hero rework" />
        <div className="flex min-h-[680px] items-center">
          <div className="max-w-[900px]">
            <span className="inline-flex items-center gap-2 bg-[#7ee0b8] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.13em] text-black">
              <Radio className="size-3" /> production signal connected
            </span>
            <h2 className="mt-8 font-pixel text-[clamp(4.5rem,10vw,10rem)] leading-[0.76] tracking-[-0.085em]">
              The run explains the release.
            </h2>
            <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-300">
              Trace what happened. Test what changed. Ship the version that
              proves itself.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center gap-3 bg-white px-6 font-mono text-[9px] uppercase tracking-[0.14em] text-black"
              >
                Start tracing
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex h-12 items-center border border-white/20 px-6 font-mono text-[9px] uppercase tracking-[0.14em]"
              >
                Open sample run
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingCurationSection() {
  return (
    <section
      id="future-pricing-curation"
      className="border-b border-black/15 bg-white px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="21" title="pricing curation" light />
        <div className="py-12">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="max-w-[760px] font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              One pricing story. Three clear choices.
            </h2>
            <div className="border border-black/20 p-1 font-mono text-[9px] uppercase">
              <span className="inline-block bg-black px-4 py-2 text-white">
                Monthly
              </span>
              <span className="inline-block px-4 py-2">Annual −20%</span>
            </div>
          </div>
          <div className="mt-12 grid border-l border-t border-black/15 lg:grid-cols-3">
            {[
              ["Free", "$0", "10k spans", "Start with one agent"],
              ["Pro", "$19", "100k spans", "Ship a production workflow"],
              ["Team", "$39", "1m spans", "Share the operating loop"],
            ].map(([name, price, volume, note], index) => (
              <article
                key={name}
                className={`border-b border-r border-black/15 p-7 ${index === 1 ? "bg-black text-white" : ""}`}
              >
                <p className="font-pixel text-5xl tracking-[-0.06em]">{name}</p>
                <p className="mt-10 font-pixel text-8xl tracking-[-0.09em]">
                  {price}
                  <span className="ml-2 font-sans text-base tracking-normal opacity-50">
                    /mo
                  </span>
                </p>
                <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] opacity-50">
                  {volume}
                </p>
                <p className="mt-12 text-lg">{note}</p>
                <button
                  className={`mt-8 h-11 w-full font-mono text-[9px] uppercase tracking-[0.13em] ${index === 1 ? "bg-white text-black" : "border border-black/20"}`}
                >
                  Choose {name}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SequenceSection() {
  const sequence = [
    "Hero",
    "Proof",
    "Sandbox",
    "Workflow",
    "Integrations",
    "Security",
    "Pricing",
    "FAQ",
    "CTA",
  ];
  return (
    <section
      id="future-page-sequence"
      className="border-b border-white/15 bg-[#0a0a0a] px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="22" title="homepage sequence curator" />
        <div className="grid gap-14 py-12 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">
              From gallery to final page
            </p>
            <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
              The strongest story in nine beats.
            </h2>
            <p className="mt-7 text-lg leading-8 text-zinc-400">
              A curation concept that turns hundreds of experiments into one
              deliberate conversion path.
            </p>
          </div>
          <div className="space-y-2">
            {sequence.map((item, index) => (
              <div
                key={item}
                className={`flex items-center justify-between border border-white/15 px-5 py-4 ${index === 2 || index === 6 ? "bg-[#f4d44d] text-black" : ""}`}
              >
                <span className="flex items-center gap-5">
                  <span className="font-mono text-[9px] opacity-45">
                    0{index + 1}
                  </span>
                  <span className="font-pixel text-3xl tracking-[-0.05em]">
                    {item}
                  </span>
                </span>
                <span className="font-mono text-[8px] uppercase opacity-45">
                  {index === 2
                    ? "Product proof"
                    : index === 6
                      ? "Decision"
                      : "Narrative"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileSection() {
  return (
    <section
      id="future-mobile-treatment"
      className="border-b border-black/15 bg-[#8b7cff] px-6 py-16 text-black md:px-10 md:py-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="23" title="mobile composition" light />
        <div className="grid items-center gap-14 py-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
              Designed for the thumb, not shrunk from desktop
            </p>
            <h2 className="mt-6 font-pixel text-7xl leading-[0.82] tracking-[-0.075em] md:text-9xl">
              The run, one decision at a time.
            </h2>
          </div>
          <div className="flex justify-center gap-5 overflow-hidden">
            <div className="w-[250px] shrink-0 border-[8px] border-black bg-black p-4 text-white shadow-[16px_16px_0_rgba(0,0,0,.18)]">
              <div className="h-1 w-12 bg-[#7ee0b8]" />
              <p className="mt-8 font-mono text-[8px] text-zinc-600">
                RUN_8F21A9
              </p>
              <p className="mt-4 font-pixel text-4xl leading-[0.88]">
                Root cause found.
              </p>
              <div className="mt-8 space-y-2">
                {["agent.run", "tool.account", "retry.account"].map(
                  (item, index) => (
                    <div
                      key={item}
                      className={`border p-3 font-mono text-[8px] ${index === 2 ? "border-[#ff655a]" : "border-white/15"}`}
                    >
                      {item}
                    </div>
                  ),
                )}
              </div>
              <button className="mt-6 h-10 w-full bg-white font-mono text-[8px] uppercase text-black">
                Inspect evidence
              </button>
            </div>
            <div className="mt-16 w-[250px] shrink-0 border-[8px] border-black bg-[#f4d44d] p-4">
              <p className="font-mono text-[8px]">RELEASE V2.4</p>
              <p className="mt-8 font-pixel text-5xl leading-[0.85]">
                94 quality
              </p>
              <div className="mt-10 border-t border-black/20 pt-5">
                <ShieldCheck className="size-6" />
                <p className="mt-4 font-mono text-[8px] uppercase">
                  Ready to promote
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterFinaleSection() {
  return (
    <section
      id="future-footer-finale"
      className="border-b border-white/15 bg-black px-6 pt-16 md:px-10 md:pt-20"
    >
      <div className="mx-auto max-w-[1240px]">
        <FutureTag number="24" title="footer finale" />
        <div className="grid gap-12 py-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="font-pixel text-7xl leading-[0.82] tracking-[-0.075em]">
              The last impression should still move the story forward.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">
            <div>
              <p className="mb-5 text-white">Product</p>
              <div className="space-y-3">
                <p>Trace viewer</p>
                <p>Evaluation</p>
                <p>Lifecycle</p>
                <p>Pricing</p>
              </div>
            </div>
            <div>
              <p className="mb-5 text-white">Company</p>
              <div className="space-y-3">
                <p>Security</p>
                <p>Changelog</p>
                <p>Contact</p>
                <p>Status</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden border-t border-white/15">
        <p className="w-full whitespace-nowrap text-center font-pixel text-[clamp(8rem,24vw,24rem)] leading-[0.72] tracking-[-0.1em]">
          uncoil
        </p>
      </div>
    </section>
  );
}

export function LandingFutureExplorations() {
  return (
    <section
      aria-label="Future landing-page exploration gallery"
      className="border-t-4 border-double border-white/30 bg-black"
    >
      <div className="border-b border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Future surface exploration gallery
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
            24 remaining directions · interactive + editorial
          </p>
        </div>
      </div>
      <SandboxSection />
      <RoiSection />
      <ArchitectureSection />
      <MigrationSection />
      <OnboardingSection />
      <ReliabilitySection />
      <DeploymentSection />
      <PersonaSection />
      <EvaluationSection />
      <CostSection />
      <ReleaseGateSection />
      <TraceAnatomySection />
      <ManifestoSection />
      <FounderSection />
      <CommunitySection />
      <TemplatesSection />
      <NewsletterSection />
      <AnnouncementSection />
      <NavigationSection />
      <HeroReworkSection />
      <PricingCurationSection />
      <SequenceSection />
      <MobileSection />
      <FooterFinaleSection />
      <div className="border-y border-white/15 px-6 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
            End of future explorations 01–24
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">
            All previous sections remain unchanged
          </p>
        </div>
      </div>
    </section>
  );
}
