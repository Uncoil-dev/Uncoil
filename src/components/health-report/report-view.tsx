import Link from "next/link";
import type { ReactNode } from "react";
import { formatMs, formatUsd, type Finding, type HealthReport } from "@/lib/health-report";
import { PrintButton } from "@/components/health-report/print-button";

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const dateText = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

const severityStyle: Record<Finding["severity"], string> = {
  high: "bg-black text-[#f4d44d]",
  medium: "bg-[#f4d44d] text-black",
  low: "border border-black text-black",
};

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-14 break-inside-avoid-page print:mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{eyebrow}</p>
      <h2 className="mt-2 font-pixel text-3xl leading-[0.95] tracking-[-0.06em] md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Bar({ value, max = 1, dark = true }: { value: number; max?: number; dark?: boolean }) {
  return (
    <div className="h-3 w-full bg-black/10" aria-hidden="true">
      <div className={dark ? "h-full bg-black" : "h-full bg-[#f4d44d]"} style={{ width: `${Math.max(1, Math.min(100, (value / (max || 1)) * 100))}%` }} />
    </div>
  );
}

const th = "py-2 pr-4 text-left font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-black/55";
const td = "py-3 pr-4 align-top text-sm";

/** The finished report. Used for paid reports and for the public sample. */
export function ReportView({ report, sample = false }: { report: HealthReport; sample?: boolean }) {
  const t = report.totals;
  const maxDaily = Math.max(...report.daily.map((d) => d.costUsd), 0.0001);
  const stats: [string, string][] = [
    [String(t.runs.toLocaleString("en-US")), "Runs"],
    [pct(t.failureRate), "Runs that failed"],
    [formatUsd(t.costUsd), `Spend, ${report.period.days} days`],
    [formatUsd(t.avgCostPerRunUsd), "Average cost per run"],
    [formatMs(t.p95RunMs), "Slowest 5% of runs"],
  ];
  const savings = report.findings.reduce((sum, f) => sum + (f.monthlyUsd ?? 0), 0);

  return (
    <article className="bg-[#eceae3] text-black">
      <header className="bg-[#090909] px-5 py-10 text-[#eceae3] md:px-10 md:py-14 print:bg-white print:text-black">
        <div className="mx-auto max-w-[1100px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d] print:text-black">{sample ? "Sample report · made-up data" : "Agent health report"}</p>
          <h1 className="mt-4 font-pixel text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.88] tracking-[-0.08em]">Your agents, in numbers.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 print:text-black/70">
            {t.spans.toLocaleString("en-US")} steps from {t.runs.toLocaleString("en-US")} runs, {dateText(report.period.from)} to {dateText(report.period.to)}. Built {dateText(report.generatedAt)}.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3"><PrintButton />{sample ? <Link href="/health-report" className="inline-flex min-h-11 items-center border border-white/60 px-5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-white hover:text-black print:hidden">Get one for my agents</Link> : null}</div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-5 pb-20 pt-2 md:px-10">
        <dl className="grid grid-cols-2 gap-px border-b border-black bg-black md:grid-cols-5">
          {stats.map(([value, label]) => (
            <div key={label} className="bg-[#eceae3] px-4 py-6">
              <dd className="font-pixel text-3xl leading-none tracking-[-0.06em] md:text-4xl">{value}</dd>
              <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">{label}</dt>
            </div>
          ))}
        </dl>

        <Section eyebrow="Start here" title={report.findings.length ? "What to fix first" : "Nothing alarming"}>
          {report.findings.length === 0 ? <p className="max-w-xl text-base leading-7 text-black/70">No step stood out. Failures, retries and slow tails were all within normal range for this data. Run it again after your next release to see if that holds.</p> : (
            <>
              {savings > 0 ? <p className="mb-6 max-w-xl text-base leading-7 text-black/70">Fixing the items below could save about <strong className="bg-[#f4d44d] px-1 text-black">{formatUsd(savings)} a month</strong> at this volume. These are estimates from your own numbers, not promises.</p> : null}
              <ol className="grid gap-4">
                {report.findings.map((finding, i) => (
                  <li key={finding.title} className="break-inside-avoid border-2 border-black bg-white p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-pixel text-3xl leading-none">{i + 1}</span>
                      <span className={`px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${severityStyle[finding.severity]}`}>{finding.severity}</span>
                      {finding.monthlyUsd ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/60">≈ {formatUsd(finding.monthlyUsd)} a month</span> : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-snug">{finding.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/70">{finding.detail}</p>
                    <p className="mt-3 border-l-4 border-[#f4d44d] pl-3 text-sm leading-6"><strong>Fix:</strong> {finding.fix}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Section>

        <Section eyebrow="Cost" title="Where the money goes">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">By model</h3>
              <ul className="mt-4 grid gap-4">
                {report.costByModel.length === 0 ? <li className="text-sm text-black/60">No model names in this data.</li> : report.costByModel.map((m) => (
                  <li key={m.model}>
                    <div className="flex justify-between gap-3 text-sm"><span className="font-mono">{m.model}</span><span>{formatUsd(m.costUsd)} · {pct(m.share, 0)}</span></div>
                    <div className="mt-1"><Bar value={m.share} /></div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-black/50">{m.calls.toLocaleString("en-US")} calls · {formatUsd(m.avgCostPerCallUsd)} each</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">By agent</h3>
              <table className="mt-2 w-full"><thead><tr><th className={th}>Agent</th><th className={th}>Runs</th><th className={th}>Spend</th><th className={th}>Failed</th></tr></thead>
                <tbody className="divide-y divide-black/15">{report.costByAgent.map((a) => (
                  <tr key={a.name}><td className={`${td} font-mono`}>{a.name}</td><td className={td}>{a.runs.toLocaleString("en-US")}</td><td className={td}>{formatUsd(a.costUsd)}</td><td className={td}>{pct(a.failureRate)}</td></tr>
                ))}</tbody></table>
            </div>
          </div>
          <h3 className="mt-10 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">Five most expensive runs</h3>
          <table className="mt-2 w-full"><thead><tr><th className={th}>Run</th><th className={th}>Agent</th><th className={th}>Steps</th><th className={th}>Cost</th><th className={th}>Result</th></tr></thead>
            <tbody className="divide-y divide-black/15">{report.costliestRuns.map((r) => (
              <tr key={r.runId}><td className={`${td} font-mono`}>{r.runId}</td><td className={td}>{r.name}</td><td className={td}>{r.spans}</td><td className={td}>{formatUsd(r.costUsd)}</td><td className={td}>{r.failed ? "Failed" : "Finished"}</td></tr>
            ))}</tbody></table>
        </Section>

        <Section eyebrow="Errors" title="What breaks, and where">
          {report.errors.length === 0 ? <p className="text-sm text-black/70">No errors in this data.</p> : (
            <table className="w-full"><thead><tr><th className={th}>Error</th><th className={th}>Step</th><th className={th}>Times</th><th className={th}>Last seen</th></tr></thead>
              <tbody className="divide-y divide-black/15">{report.errors.map((e) => (
                <tr key={e.label}><td className={td}><span className="font-mono text-xs">{e.label}</span><br /><span className="text-black/55">e.g. {e.example}</span></td><td className={`${td} font-mono`}>{e.step}</td><td className={td}>{e.count}</td><td className={td}>{dateText(e.lastSeen)}</td></tr>
              ))}</tbody></table>
          )}
          <p className="mt-4 text-sm text-black/60">{t.failedRuns} runs ended on an error. {t.recoveredRuns} more hit an error but recovered by the end of the run.</p>
        </Section>

        <Section eyebrow="Speed" title="Slow steps">
          <table className="w-full"><thead><tr><th className={th}>Step</th><th className={th}>Calls</th><th className={th}>Typical</th><th className={th}>Slowest 5%</th><th className={th}>Share of time</th></tr></thead>
            <tbody className="divide-y divide-black/15">{report.steps.map((s) => (
              <tr key={s.step}><td className={`${td} font-mono`}>{s.step}<br /><span className="font-sans text-[11px] uppercase tracking-[0.1em] text-black/45">{s.kind}{s.errors ? ` · ${s.errors} errors` : ""}</span></td><td className={td}>{s.calls.toLocaleString("en-US")}</td><td className={td}>{formatMs(s.p50Ms)}</td><td className={td}>{formatMs(s.p95Ms)}</td><td className={`${td} w-40`}>{pct(s.shareOfTime, 0)}<Bar value={s.shareOfTime} dark={false} /></td></tr>
            ))}</tbody></table>
        </Section>

        <Section eyebrow="Trend" title="Day by day">
          <ul className="grid gap-2">
            {report.daily.map((d) => (
              <li key={d.day} className="grid grid-cols-[5.5rem_1fr_9rem] items-center gap-3 text-sm">
                <span className="font-mono text-xs">{d.day.slice(5)}</span>
                <Bar value={d.costUsd} max={maxDaily} />
                <span className="text-right text-black/70">{formatUsd(d.costUsd)} · {d.runs} runs{d.failedRuns ? ` · ${d.failedRuns} failed` : ""}</span>
              </li>
            ))}
          </ul>
        </Section>

        <section className="mt-16 border-2 border-black bg-[#090909] p-6 text-[#eceae3] print:hidden md:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f4d44d]">Want this every day?</p>
          <h2 className="mt-3 font-pixel text-3xl leading-[0.95] tracking-[-0.06em] md:text-4xl">Send traces to Uncoil and the report builds itself.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Same numbers, live, with alerts when cost or errors jump. Free up to 5,000 steps a day.</p>
          <Link href="/sign-up" className="mt-6 inline-flex min-h-12 items-center bg-[#f4d44d] px-6 font-mono text-[11px] uppercase tracking-[0.14em] text-black hover:bg-white">Start free</Link>
        </section>

        <p className="mt-10 max-w-2xl text-xs leading-5 text-black/55">
          How we built this: we read your steps once, added up cost, time and errors, and kept only the totals shown here. Prompts, answers and customer data are never stored. A run counts as failed when its last step errored. Savings are rough estimates based on this period only{report.skippedRows ? `. ${report.skippedRows} rows could not be read and were skipped` : ""}.
        </p>
      </div>
    </article>
  );
}
