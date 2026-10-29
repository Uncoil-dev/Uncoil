import type { Doc } from "./_generated/dataModel";

export type BudgetPeriod = "week" | "month";
type Run = Pick<Doc<"agentRuns">, "status" | "totalCostUsd" | "startedAt" | "primaryModel">;

const DAY = 24 * 60 * 60_000;

/** Calendar week (Monday start) or month in UTC, so a budget resets at the same moment for everyone. */
export function periodBounds(period: BudgetPeriod, now: number) {
  const date = new Date(now);
  if (period === "month") {
    const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    return { start, end, key: new Date(start).toISOString().slice(0, 7) };
  }
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const start = today - ((date.getUTCDay() + 6) % 7) * DAY;
  return { start, end: start + 7 * DAY, key: new Date(start).toISOString().slice(0, 10) };
}

export function spendBetween(runs: Run[], from: number, to: number) {
  let total = 0;
  for (const run of runs) {
    const t = Date.parse(run.startedAt);
    if (t >= from && t < to) total += run.totalCostUsd;
  }
  return Math.round(total * 100) / 100;
}

/** What the period will cost at the pace so far. Needs at least a day of data to say anything useful. */
export function projectSpend(spent: number, bounds: { start: number; end: number }, now: number) {
  const elapsed = now - bounds.start;
  if (elapsed < DAY) return null;
  return Math.round((spent / elapsed) * (bounds.end - bounds.start) * 100) / 100;
}

export type BudgetLevel = "ok" | "warning" | "over";
export function budgetLevel(spent: number, limitUsd: number, warnAtPercent: number): BudgetLevel {
  if (spent >= limitUsd) return "over";
  if (spent >= (limitUsd * warnAtPercent) / 100) return "warning";
  return "ok";
}

export function describeBudget(name: string, level: Exclude<BudgetLevel, "ok">, spent: number, limitUsd: number, period: BudgetPeriod) {
  const where = period === "week" ? "this week" : "this month";
  return level === "over"
    ? `${name}: $${spent.toFixed(2)} spent ${where}, over the $${limitUsd} budget.`
    : `${name}: $${spent.toFixed(2)} spent ${where}, ${Math.round((spent / limitUsd) * 100)}% of the $${limitUsd} budget.`;
}

type Totals = { runs: number; failed: number; costUsd: number };
function totals(runs: Run[], from: number, to: number): Totals {
  const inRange = runs.filter((run) => { const t = Date.parse(run.startedAt); return t >= from && t < to; });
  return { runs: inRange.length, failed: inRange.filter((run) => run.status === "failed").length, costUsd: Math.round(inRange.reduce((sum, run) => sum + run.totalCostUsd, 0) * 100) / 100 };
}

export type WeeklySummary = {
  from: number;
  to: number;
  current: Totals;
  previous: Totals;
  topModels: { model: string; runs: number; costUsd: number }[];
};

/** The last 7 days ending at `now`, set against the 7 days before. */
export function buildWeeklySummary(runs: Run[], now: number): WeeklySummary {
  const from = now - 7 * DAY;
  const models = new Map<string, { runs: number; costUsd: number }>();
  for (const run of runs) {
    const t = Date.parse(run.startedAt);
    if (!(t >= from && t < now)) continue;
    const key = run.primaryModel || "unknown model";
    const entry = models.get(key) ?? { runs: 0, costUsd: 0 };
    entry.runs += 1;
    entry.costUsd += run.totalCostUsd;
    models.set(key, entry);
  }
  const topModels = [...models.entries()].map(([model, value]) => ({ model, runs: value.runs, costUsd: Math.round(value.costUsd * 100) / 100 })).sort((a, b) => b.costUsd - a.costUsd).slice(0, 3);
  return { from, to: now, current: totals(runs, from, now), previous: totals(runs, from - 7 * DAY, from), topModels };
}

function change(now: number, before: number) {
  if (before === 0) return now === 0 ? "no change" : "new this week";
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? "no change" : `${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% on last week`;
}

export type BudgetLine = { name: string; spent: number; limitUsd: number; period: BudgetPeriod };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
}

const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Plain lines first, so the same wording feeds the email text, the HTML and the Slack message. */
export function summaryLines(projectName: string, summary: WeeklySummary, budgets: BudgetLine[]) {
  const { current, previous } = summary;
  const rate = current.runs ? Math.round((current.failed / current.runs) * 1000) / 10 : 0;
  const lines = [
    `Runs: ${current.runs.toLocaleString("en-US")} (${change(current.runs, previous.runs)})`,
    `Failed runs: ${current.failed.toLocaleString("en-US")}, ${rate}% of runs (${change(current.failed, previous.failed)})`,
    `Spend: $${current.costUsd.toFixed(2)} (${change(current.costUsd, previous.costUsd)})`,
  ];
  if (summary.topModels.length) lines.push(`Biggest spend: ${summary.topModels.map((m) => `${m.model} $${m.costUsd.toFixed(2)}`).join(", ")}`);
  for (const budget of budgets) lines.push(`Budget "${budget.name}": $${budget.spent.toFixed(2)} of $${budget.limitUsd} ${budget.period === "week" ? "this week" : "this month"}`);
  return { title: `${projectName}: ${day(summary.from)} to ${day(summary.to - 1)}`, lines };
}

export function renderSummaryEmail(projectName: string, summary: WeeklySummary, budgets: BudgetLine[], dashboardUrl: string) {
  const { title, lines } = summaryLines(projectName, summary, budgets);
  const quiet = summary.current.runs === 0 ? "\nNo runs came in this week. If that's unexpected, check that your app is still sending traces." : "";
  return {
    subject: `Your Uncoil week: ${title}`,
    text: `${title}\n\n${lines.join("\n")}${quiet}\n\nSee the details: ${dashboardUrl}\n\nYou get this every Monday. Turn it off any time from Alerts in your dashboard.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="margin:0 0 12px">${escapeHtml(title)}</h2><ul style="padding-left:18px;line-height:1.7">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>${quiet ? `<p>${escapeHtml(quiet.trim())}</p>` : ""}<p><a href="${escapeHtml(dashboardUrl)}">See the details</a></p><p style="color:#666;font-size:12px">You get this every Monday. Turn it off any time from Alerts in your dashboard.</p></div>`,
  };
}
