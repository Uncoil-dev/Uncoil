/**
 * Small static pictures of what a dashboard page looks like once it has data. They use made-up values,
 * are rendered inside <EmptyState> (hidden from assistive tech and not clickable), and share the dashboard palette.
 */
import type { ReactNode } from "react";

const MONO = "font-mono";
const YELLOW = "bg-[#F4D44D]";

function Pill({ tone, children }: { tone: "ok" | "bad" | "warn" | "mute" | "link"; children: ReactNode }) {
  const map = { ok: "text-[#5BE3A0] border-[#1F4D38]", bad: "text-[#FF8A8A] border-[#5B2B2B]", warn: "text-[#F4D44D] border-[#5A4E1A]", mute: "text-[#8B93A1] border-[#262C35]", link: "text-[#8AB4FF] border-[#27384F]" } as const;
  return <span className={`${MONO} inline-block border px-1.5 py-px text-[9px] uppercase tracking-wider ${map[tone]}`}>{children}</span>;
}

/** A table-like list: header row, then rows. Cells can be plain text or pills. */
export function SampleRows({ head, rows, grid }: { head: string[]; rows: ReactNode[][]; grid: string }) {
  return (
    <div className="text-[11px] text-[#C9CED6]">
      <div className={`grid gap-3 border-b border-[#1F242C] pb-1.5 ${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`} style={{ gridTemplateColumns: grid }}>{head.map((h) => <span key={h}>{h}</span>)}</div>
      {rows.map((cells, i) => (
        <div key={i} className="grid items-center gap-3 border-b border-[#161B22] py-2" style={{ gridTemplateColumns: grid, opacity: 1 - i * 0.12 }}>
          {cells.map((cell, j) => <span key={j} className={`truncate ${j === 0 ? `${MONO} text-[#8AB4FF]` : ""}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

export function SampleSessions() {
  return <SampleRows grid="1.3fr 1fr 0.5fr 0.6fr" head={["Session", "User", "Steps", "Cost"]} rows={[
    ["sess_9f2a41", "maria@acme.io", "14", "$0.083"],
    ["sess_77c0d2", "dev-team-3", "31", "$0.212"],
    ["sess_41be09", "jonas@northly.co", "6", "$0.019"],
    ["sess_0a88e7", "support-bot", "22", "$0.146"],
    ["sess_c3d150", "maria@acme.io", "9", "$0.041"],
  ]} />;
}

export function SampleUsers() {
  return <SampleRows grid="1.4fr 0.6fr 0.7fr 0.7fr" head={["User", "Runs", "Errors", "Spend"]} rows={[
    ["maria@acme.io", "128", <Pill key="a" tone="ok">0%</Pill>, "$4.12"],
    ["dev-team-3", "96", <Pill key="b" tone="warn">4%</Pill>, "$9.80"],
    ["jonas@northly.co", "41", <Pill key="c" tone="ok">0%</Pill>, "$1.07"],
    ["support-bot", "37", <Pill key="d" tone="bad">18%</Pill>, "$2.66"],
  ]} />;
}

export function SampleRuns() {
  return <SampleRows grid="1.2fr 0.8fr 0.6fr 0.7fr" head={["Run", "Status", "Steps", "Cost"]} rows={[
    ["run_5kd81q", <Pill key="a" tone="ok">ok</Pill>, "12", "$0.061"],
    ["run_5kd80z", <Pill key="b" tone="bad">failed</Pill>, "7", "$0.340"],
    ["run_5kd7yt", <Pill key="c" tone="ok">ok</Pill>, "18", "$0.092"],
    ["run_5kd7vm", <Pill key="d" tone="ok">ok</Pill>, "9", "$0.037"],
  ]} />;
}

export function SampleAlertRules() {
  const cards = [
    { name: "Failed runs over 5%", state: "fires", value: "7.2%", limit: "limit 5%", tone: "bad" as const, bar: 100 },
    { name: "Daily spend over $50", state: "ok", value: "$31.40", limit: "limit $50", tone: "ok" as const, bar: 63 },
    { name: "Slow runs over 30s", state: "ok", value: "11s", limit: "limit 30s", tone: "ok" as const, bar: 36 },
  ];
  return (
    <div className="grid gap-2">
      {cards.map((c) => (
        <div key={c.name} className="border border-[#1F242C] bg-[#0E1115] p-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#E6E9EE]"><span className="truncate">{c.name}</span><Pill tone={c.tone}>{c.state}</Pill></div>
          <div className={`mt-1.5 flex items-baseline justify-between ${MONO} text-[10px] text-[#6B7380]`}><b className="text-sm text-[#E6E9EE]">{c.value}</b><span>{c.limit}</span></div>
          <div className="mt-1.5 h-1 bg-[#1F242C]"><div className={`h-full ${c.tone === "bad" ? "bg-[#FF6B6B]" : YELLOW}`} style={{ width: `${c.bar}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function SampleBudgets() {
  const rows = [
    { name: "Weekly · all models", used: "$38 of $50", pct: 76, warn: false },
    { name: "Monthly · GPT-class models", used: "$162 of $180", pct: 90, warn: true },
    { name: "Monthly · embeddings", used: "$9 of $60", pct: 15, warn: false },
  ];
  return (
    <div className="grid gap-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex justify-between text-[11px] text-[#E6E9EE]"><span>{r.name}</span><span className={`${MONO} text-[#8B93A1]`}>{r.used}</span></div>
          <div className="relative mt-1.5 h-2 bg-[#1F242C]"><div className={`h-full ${r.warn ? "bg-[#FF6B6B]" : YELLOW}`} style={{ width: `${r.pct}%` }} /><i className="absolute inset-y-0 w-px bg-[#E6E9EE]/50" style={{ left: "80%" }} /></div>
          <p className={`mt-1 ${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>{r.warn ? "Warning sent at 80%" : "Warns at 80%"}</p>
        </div>
      ))}
    </div>
  );
}

export function SampleExperiment() {
  const rows = [
    ["Refund policy for annual plans?", false, true],
    ["Cancel my account", true, true],
    ["Where is my invoice?", false, true],
    ["Change card on file", true, false],
  ] as const;
  return (
    <div className="text-[11px] text-[#C9CED6]">
      <div className={`grid grid-cols-[1.6fr_1fr_1fr] gap-3 border-b border-[#1F242C] pb-1.5 ${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}><span>Question</span><span>Baseline v3</span><span>New v4</span></div>
      {rows.map(([q, a, b]) => (
        <div key={q} className="grid grid-cols-[1.6fr_1fr_1fr] items-center gap-3 border-b border-[#161B22] py-2"><span className="truncate">{q}</span><Pill tone={a ? "ok" : "bad"}>{a ? "pass" : "fail"}</Pill><Pill tone={b ? "ok" : "bad"}>{b ? "pass" : "fail"}</Pill></div>
      ))}
      <p className={`mt-3 ${MONO} text-[10px] text-[#5BE3A0]`}>v4 fixes 2 answers and breaks 1. 3 of 4 now pass, up from 2.</p>
    </div>
  );
}

export function SampleScores() {
  const bars = [4, 9, 6, 14, 22, 30, 38, 26, 12];
  return (
    <div>
      <div className="flex items-baseline justify-between"><span className={`${MONO} text-2xl text-[#E6E9EE]`}>0.82</span><Pill tone="ok">+6% vs last week</Pill></div>
      <p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>Answer quality · average</p>
      <div className="mt-3 flex h-24 items-end gap-1">{bars.map((h, i) => <i key={i} className={`flex-1 ${i === 6 ? YELLOW : "bg-[#2A313B]"}`} style={{ height: `${h * 2.4}px` }} />)}</div>
      <div className={`mt-1 flex justify-between ${MONO} text-[9px] text-[#6B7380]`}><span>0.0</span><span>score</span><span>1.0</span></div>
    </div>
  );
}

export function SampleFlow() {
  const Box = ({ k, v }: { k: string; v: string }) => <div className="flex-1 border border-[#262C35] bg-[#0E1115] p-2.5"><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>{k}</p><p className="mt-1 text-[11px] text-[#E6E9EE]">{v}</p></div>;
  return (
    <div className="grid gap-3">
      {[["A run fails", "Post to #agent-alerts"], ["A trace scores under 0.5", "Add it to the review queue"], ["A run costs over $1", "Email the team"]].map(([w, d], i) => (
        <div key={w} className="flex items-center gap-2" style={{ opacity: 1 - i * 0.18 }}><Box k="When" v={w} /><span className="text-[#F4D44D]" aria-hidden="true">→</span><Box k="Then" v={d} /></div>
      ))}
    </div>
  );
}

export function SampleBoard() {
  const spark = [3, 5, 4, 7, 6, 9, 8, 12, 10, 14];
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="border border-[#1F242C] bg-[#0E1115] p-2.5"><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>Runs / day</p><div className="mt-2 flex h-14 items-end gap-0.5">{spark.map((h, i) => <i key={i} className={`flex-1 ${YELLOW}`} style={{ height: `${h * 4}px`, opacity: 0.45 + i * 0.055 }} />)}</div></div>
      <div className="border border-[#1F242C] bg-[#0E1115] p-2.5"><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>Error rate</p><p className={`mt-3 ${MONO} text-2xl text-[#E6E9EE]`}>2.4%</p><p className={`${MONO} text-[10px] text-[#5BE3A0]`}>▼ 0.8 pts</p></div>
      <div className="col-span-2 border border-[#1F242C] bg-[#0E1115] p-2.5"><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>Cost by model</p>{[["gpt-class", 64], ["claude-class", 28], ["embeddings", 8]].map(([n, p]) => <div key={n} className="mt-1.5 flex items-center gap-2 text-[10px] text-[#8B93A1]"><span className="w-20 truncate">{n}</span><div className="h-1.5 flex-1 bg-[#1F242C]"><div className="h-full bg-[#8AB4FF]" style={{ width: `${p}%` }} /></div></div>)}</div>
    </div>
  );
}

export function SampleDataset() {
  return <SampleRows grid="1.5fr 1.5fr" head={["Input", "Expected answer"]} rows={[
    ["How do I reset my password?", "Settings → Security → Reset"],
    ["Cancel my subscription", "Confirm, then offer pause"],
    ["Do you ship to Norway?", "Yes, 3–5 business days"],
    ["Refund after 40 days?", "No, 30-day window"],
  ]} />;
}

export function SampleEvaluators() {
  const cards = [
    { name: "Valid JSON", kind: "Code rule", rate: 98, tone: "ok" as const },
    { name: "Answers the question", kind: "AI judge", rate: 84, tone: "ok" as const },
    { name: "No made-up links", kind: "AI judge", rate: 61, tone: "warn" as const },
  ];
  return (
    <div className="grid gap-2">
      {cards.map((c) => (
        <div key={c.name} className="flex items-center gap-3 border border-[#1F242C] bg-[#0E1115] p-2.5">
          <svg viewBox="0 0 44 44" className="size-9 shrink-0"><circle cx="22" cy="22" r="17" fill="none" stroke="#1F242C" strokeWidth="5" /><circle cx="22" cy="22" r="17" fill="none" stroke={c.tone === "ok" ? "#5BE3A0" : "#F4D44D"} strokeWidth="5" strokeDasharray={`${c.rate * 1.068} 107`} transform="rotate(-90 22 22)" /></svg>
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] text-[#E6E9EE]">{c.name}</p><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>{c.kind}</p></div>
          <b className={`${MONO} text-sm text-[#E6E9EE]`}>{c.rate}%</b>
        </div>
      ))}
    </div>
  );
}

export function SamplePrompts() {
  return (
    <div className="grid gap-2.5">
      <div className="border border-[#1F242C] bg-[#0E1115] p-2.5"><div className="flex items-center justify-between text-[11px] text-[#E6E9EE]"><span className={MONO}>support-answer</span><span className="flex gap-1"><Pill tone="ok">production v4</Pill><Pill tone="warn">staging v5</Pill></span></div><pre className={`mt-2 whitespace-pre-wrap ${MONO} text-[10px] leading-4 text-[#8B93A1]`}>{"You are a support agent for {{company}}.\nAnswer in two sentences. Cite the help page."}</pre></div>
      <div className={`flex items-center gap-2 ${MONO} text-[10px] text-[#6B7380]`}><span>v3</span><i className="h-px flex-1 bg-[#262C35]" /><span>v4</span><i className="h-px flex-1 bg-[#262C35]" /><span className="text-[#F4D44D]">v5</span></div>
      <p className={`${MONO} text-[10px] text-[#8B93A1]`}>1,284 traces used v4 · 3.1% errors</p>
    </div>
  );
}

export function SampleReview() {
  return (
    <div className="grid gap-2.5">
      <div className="border border-[#1F242C] bg-[#0E1115] p-2.5"><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>What came in</p><p className="mt-1 text-[11px] text-[#C9CED6]">Can I get a refund after 40 days?</p></div>
      <div className="border border-[#1F242C] bg-[#0E1115] p-2.5"><p className={`${MONO} text-[9px] uppercase tracking-wider text-[#6B7380]`}>What the agent answered</p><p className="mt-1 text-[11px] text-[#C9CED6]">Yes, we refund any order within 60 days.</p></div>
      <div className="flex gap-2">{[["1", "Good"], ["2", "Wrong"], ["3", "Unsure"]].map(([k, l]) => <span key={l} className={`flex-1 border px-2 py-1.5 text-center ${MONO} text-[10px] uppercase ${l === "Wrong" ? "border-[#F4D44D] text-[#F4D44D]" : "border-[#262C35] text-[#8B93A1]"}`}><b className="mr-1.5 text-[#6B7380]">{k}</b>{l}</span>)}</div>
    </div>
  );
}

export function SampleTrace() {
  const steps = [
    { n: "agent.run", w: 100, l: 0, c: "bg-[#F4D44D]" },
    { n: "llm · plan", w: 22, l: 2, c: "bg-[#8AB4FF]" },
    { n: "tool · search_docs", w: 30, l: 26, c: "bg-[#5BE3A0]" },
    { n: "tool · create_ticket", w: 14, l: 58, c: "bg-[#FF6B6B]" },
    { n: "llm · answer", w: 24, l: 74, c: "bg-[#8AB4FF]" },
  ];
  return (
    <div className="grid gap-1.5">
      {steps.map((s) => <div key={s.n} className="grid grid-cols-[110px_1fr] items-center gap-2"><span className={`truncate ${MONO} text-[10px] text-[#8B93A1]`}>{s.n}</span><div className="relative h-3 bg-[#161B22]"><i className={`absolute inset-y-0 ${s.c}`} style={{ left: `${s.l}%`, width: `${s.w}%` }} /></div></div>)}
    </div>
  );
}

export function SampleCosts() {
  const days = [22, 30, 26, 41, 38, 52, 47, 63, 58, 71];
  return (
    <div>
      <div className="flex items-baseline justify-between"><span className={`${MONO} text-2xl text-[#E6E9EE]`}>$184.20</span><span className={`${MONO} text-[10px] text-[#6B7380]`}>last 30 days</span></div>
      <div className="mt-3 flex h-24 items-end gap-1">{days.map((h, i) => <i key={i} className={`flex-1 ${i === days.length - 1 ? YELLOW : "bg-[#2A313B]"}`} style={{ height: `${h * 1.3}px` }} />)}</div>
      {[["gpt-class", "$118.40"], ["claude-class", "$51.90"], ["embeddings", "$13.90"]].map(([n, v]) => <div key={n} className={`mt-1.5 flex justify-between ${MONO} text-[10px] text-[#8B93A1]`}><span>{n}</span><span>{v}</span></div>)}
    </div>
  );
}

export function SampleCompare() {
  return <SampleRows grid="1.1fr 0.9fr 0.9fr 0.8fr" head={["Release", "Runs", "Errors", "Cost / run"]} rows={[
    ["v1.4.0", "1,204", <Pill key="a" tone="ok">1.2%</Pill>, "$0.061"],
    ["v1.5.0", "986", <Pill key="b" tone="bad">6.8%</Pill>, "$0.094"],
    ["v1.5.1", "412", <Pill key="c" tone="ok">1.4%</Pill>, "$0.058"],
  ]} />;
}

export function SampleSteps() {
  return <SampleRows grid="1.2fr 0.6fr 1fr 0.6fr" head={["Step", "Type", "Name", "Time"]} rows={[
    ["step_01", <Pill key="a" tone="link">llm</Pill>, "plan", "1.2s"],
    ["step_02", <Pill key="b" tone="ok">tool</Pill>, "search_docs", "0.4s"],
    ["step_03", <Pill key="c" tone="bad">tool</Pill>, "create_ticket", "0.1s"],
    ["step_04", <Pill key="d" tone="link">llm</Pill>, "answer", "2.3s"],
  ]} />;
}
