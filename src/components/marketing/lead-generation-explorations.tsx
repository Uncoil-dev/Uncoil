import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  FileSearch,
  Gauge,
  Mail,
  ScanSearch,
} from "lucide-react";

function LeadTag({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-current/15 pb-4 font-mono text-[9px] uppercase tracking-[0.15em] opacity-55">
      <span>
        Lead lab {number} / {title}
      </span>
      <span>Admin concept</span>
    </div>
  );
}

export function LeadGenerationExplorations() {
  return (
    <section
      aria-label="Lead generation exploration gallery"
      className="border-t border-white/15 bg-black"
    >
      <div className="border-b border-white/15 px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">
            New exploration set / conversion and demand
          </p>
          <h2 className="mt-6 max-w-[1000px] font-pixel text-6xl leading-[0.86] tracking-[-0.07em] md:text-8xl">
            Give visitors a useful reason to raise their hand.
          </h2>
          <p className="mt-7 max-w-[680px] text-lg leading-8 text-zinc-400">
            Six lead-generation directions built around diagnosis, benchmarks,
            migration, and expert help—not generic newsletter capture.
          </p>
        </div>
      </div>

      <section
        id="lead-readiness-audit"
        className="bg-[#f4d44d] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <LeadTag number="01" title="production readiness audit" />
          <div className="mt-12 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <ScanSearch className="size-8" />
              <h3 className="mt-7 max-w-[620px] font-pixel text-6xl leading-[0.86] tracking-[-0.07em] md:text-8xl">
                How observable is your agent, really?
              </h3>
              <p className="mt-6 max-w-[540px] text-lg leading-8 text-black/65">
                A two-minute assessment that returns a tailored instrumentation,
                evaluation, and release-readiness plan.
              </p>
            </div>
            <div className="border border-black/25 bg-black p-6 text-white">
              {[
                "Can you replay a failed run?",
                "Can you compare prompts on real cases?",
                "Can you block a risky release?",
              ].map((question, index) => (
                <div
                  key={question}
                  className="flex items-center gap-4 border-b border-white/15 py-5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <span className="font-mono text-[9px] text-zinc-600">
                    0{index + 1}
                  </span>
                  <span className="flex-1 text-sm">{question}</span>
                  <span className="border border-white/20 px-3 py-1 font-mono text-[8px] uppercase text-zinc-400">
                    Answer
                  </span>
                </div>
              ))}
              <Link
                href="/contact?intent=readiness-audit"
                className="mt-7 flex items-center justify-between bg-white px-4 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-black"
              >
                Get my scorecard <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="lead-trace-clinic" className="px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <LeadTag number="02" title="trace clinic" />
          <div className="mt-12 grid gap-px bg-white/15 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-[#080808] p-8 md:p-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ff655a]">
                Bring one broken run
              </p>
              <h3 className="mt-6 max-w-[700px] font-pixel text-6xl leading-[0.88] tracking-[-0.065em] md:text-8xl">
                We’ll find the failure together.
              </h3>
              <p className="mt-6 max-w-[590px] text-lg leading-8 text-zinc-400">
                A focused 30-minute teardown turns an actual production incident
                into an instrumentation and evaluation plan.
              </p>
            </div>
            <div className="bg-[#ff655a] p-8 text-black md:p-10">
              <Clock3 className="size-7" />
              <p className="mt-16 font-mono text-[9px] uppercase tracking-[0.15em] opacity-55">
                You leave with
              </p>
              <ul className="mt-5 space-y-4 text-sm">
                {[
                  "Root-cause map",
                  "Missing-signal checklist",
                  "Suggested release gate",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <Check className="size-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact?intent=trace-clinic"
                className="mt-10 flex items-center justify-between border-t border-black/20 pt-5 font-mono text-[9px] uppercase tracking-[0.12em]"
              >
                Book a trace clinic <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="lead-benchmark-report"
        className="bg-[#eceae3] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <LeadTag number="03" title="benchmark report" />
          <div className="mt-12 grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div className="border-2 border-black bg-white p-6 shadow-[18px_18px_0_#8b7cff]">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em]">
                Field report / 2026
              </p>
              <BarChart3 className="mt-20 size-12" />
              <h4 className="mt-6 font-pixel text-5xl leading-[0.9] tracking-[-0.06em]">
                The agent reliability benchmark.
              </h4>
              <p className="mt-10 border-t border-black/20 pt-4 font-mono text-[8px] uppercase">
                Quality · latency · retry cost · release confidence
              </p>
            </div>
            <div className="lg:pl-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                Original research lead magnet
              </p>
              <h3 className="mt-5 max-w-[720px] font-pixel text-6xl leading-[0.88] tracking-[-0.065em] md:text-8xl">
                Know what good looks like.
              </h3>
              <p className="mt-6 max-w-[600px] text-lg leading-8 text-black/60">
                A quarterly benchmark gives technical buyers useful reference
                points and gives Uncoil a repeatable reason to publish,
                promote, and follow up.
              </p>
              <form
                action="/api/leads"
                method="post"
                className="mt-8 flex max-w-[620px] flex-col border border-black sm:flex-row"
              >
                <label className="sr-only" htmlFor="benchmark-email">
                  Work email
                </label>
                <input
                  id="benchmark-email"
                  name="email"
                  type="email"
                  required
                  placeholder="Work email"
                  className="min-h-12 flex-1 bg-transparent px-4 font-mono text-xs outline-none placeholder:text-black/35"
                />
                <input type="hidden" name="intent" value="benchmark-report" />
                <button
                  type="submit"
                  className="flex min-h-12 items-center justify-center gap-3 bg-black px-5 font-mono text-[9px] uppercase tracking-[0.12em] text-white"
                >
                  Send the report <Mail className="size-3" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="lead-cost-scan" className="px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[1240px]">
          <LeadTag number="04" title="cost leak scan" />
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Gauge className="size-8 text-[#7ee0b8]" />
              <h3 className="mt-7 max-w-[650px] font-pixel text-6xl leading-[0.87] tracking-[-0.07em] md:text-8xl">
                Find the retries eating your margin.
              </h3>
              <p className="mt-6 max-w-[560px] text-lg leading-8 text-zinc-400">
                A lightweight diagnostic built around run volume, model mix,
                retry rate, and tool latency. The output becomes an instant
                savings memo.
              </p>
              <Link
                href="/contact?intent=cost-scan"
                className="mt-8 inline-flex items-center gap-3 border border-white/20 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.12em] hover:bg-white hover:text-black"
              >
                Run a cost scan <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 border-l border-t border-white/15">
              {[
                ["Run volume", "50k/mo"],
                ["Retry rate", "12%"],
                ["Tool stalls", "3.8%"],
                ["Modeled waste", "$1,840"],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`border-b border-r border-white/15 p-6 ${index === 3 ? "bg-[#7ee0b8] text-black" : "bg-[#090909]"}`}
                >
                  <p className="font-mono text-[8px] uppercase opacity-45">
                    {label}
                  </p>
                  <p className="mt-8 font-pixel text-4xl tracking-[-0.05em]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="lead-migration-brief"
        className="bg-[#8b7cff] px-6 py-20 text-black md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <LeadTag number="05" title="migration brief" />
          <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <FileSearch className="size-8" />
              <h3 className="mt-7 max-w-[760px] font-pixel text-6xl leading-[0.86] tracking-[-0.07em] md:text-8xl">
                Keep your logs. Add the missing context.
              </h3>
              <p className="mt-6 max-w-[620px] text-lg leading-8 text-black/65">
                A tailored migration brief maps the existing stack to a low-risk
                first trace, retention plan, and rollout sequence.
              </p>
            </div>
            <div className="border border-black/25 bg-black p-7 text-white">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500">
                Brief includes
              </p>
              {[
                "Current telemetry map",
                "Parallel-run architecture",
                "Two-week adoption sequence",
                "Success criteria",
              ].map((item, index) => (
                <div
                  key={item}
                  className="grid grid-cols-[34px_1fr] border-b border-white/15 py-5"
                >
                  <span className="font-mono text-[8px] text-zinc-600">
                    0{index + 1}
                  </span>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
              <Link
                href="/contact?intent=migration-brief"
                className="mt-7 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em]"
              >
                Request my migration brief <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="lead-email-course"
        className="bg-[#080808] px-6 py-20 md:px-10"
      >
        <div className="mx-auto max-w-[1240px]">
          <LeadTag number="06" title="five-day operator course" />
          <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <Mail className="size-8 text-[#f4d44d]" />
              <h3 className="mt-7 max-w-[640px] font-pixel text-6xl leading-[0.87] tracking-[-0.07em] md:text-8xl">
                One production lesson a day.
              </h3>
              <p className="mt-6 max-w-[540px] text-lg leading-8 text-zinc-400">
                A practical email sequence on traces, evaluation sets, cost
                controls, and release gates—each lesson ending with one action.
              </p>
            </div>
            <div className="border border-white/15">
              {[
                "Capture the whole run",
                "Turn failures into evals",
                "See the true retry cost",
                "Design a release gate",
                "Build the feedback loop",
              ].map((lesson, index) => (
                <div
                  key={lesson}
                  className="grid grid-cols-[48px_1fr_auto] items-center border-b border-white/15 px-5 py-4 last:border-b-0"
                >
                  <span className="font-mono text-[8px] text-zinc-600">
                    D{index + 1}
                  </span>
                  <span className="text-sm">{lesson}</span>
                  <Check className="size-3 text-zinc-600" />
                </div>
              ))}
              <Link
                href="/contact?intent=operator-course"
                className="flex items-center justify-between bg-[#f4d44d] px-5 py-4 font-mono text-[9px] uppercase tracking-[0.12em] text-black"
              >
                Send lesson one <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
