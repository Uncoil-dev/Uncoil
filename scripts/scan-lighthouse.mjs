#!/usr/bin/env node
// Reads Lighthouse reports (.lighthouseci/lhr-*.json) and, with --open-issues,
// files one de-duplicated GitHub issue per page whose performance or SEO score
// is below the threshold (needs GITHUB_TOKEN and the gh CLI).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PREFIX = "[lighthouse-scan]";
export const LABEL = "agent-task-queued";
export const THRESHOLD = 0.9;
export const CATEGORIES = ["performance", "seo"];

export function pagePath(url) {
  const p = new URL(url).pathname.replace(/\/$/, "");
  return p || "/";
}

export function summarize(lhr) {
  const failing = [];
  const scores = {};
  for (const id of CATEGORIES) {
    const cat = lhr.categories?.[id];
    if (!cat || typeof cat.score !== "number") continue;
    scores[id] = cat.score;
    if (cat.score >= THRESHOLD) continue;
    for (const ref of cat.auditRefs ?? []) {
      const a = lhr.audits?.[ref.id];
      if (a && ref.weight > 0 && typeof a.score === "number" && a.score < THRESHOLD) failing.push({ category: id, id: a.id, title: a.title, score: a.score });
    }
  }
  return { path: pagePath(lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl), scores, failing, belowThreshold: Object.values(scores).some((s) => s < THRESHOLD) };
}

export function issueFor(s) {
  const scoreText = Object.entries(s.scores).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(", ");
  const audits = s.failing.length ? s.failing.map((a) => `- ${a.category}: ${a.title} (${a.id}, score ${a.score})`).join("\n") : "- See the Lighthouse report for details.";
  return {
    title: `${PREFIX} ${s.path}`,
    body: `**Task**\nImprove Lighthouse scores for \`${s.path}\` (${scoreText}; target ${THRESHOLD * 100}+). Failing audits:\n${audits}\n\n**Files owned**\n- The page and components that render \`${s.path}\` under src/app and src/components\n\n**Done looks like**\n- Performance and SEO scores for \`${s.path}\` are at least ${THRESHOLD * 100} in the next scheduled run.\n- Existing tests and checks pass.\n`,
  };
}

export function selectNew(summaries, openTitles) {
  const seen = new Set(openTitles);
  return summaries.filter((s) => s.belowThreshold).map(issueFor).filter((i) => !seen.has(i.title));
}

const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });

function main() {
  const dir = join(process.cwd(), ".lighthouseci");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^lhr-.*\.json$/.test(f)) : [];
  const byPath = new Map();
  for (const f of files) {
    const s = summarize(JSON.parse(readFileSync(join(dir, f), "utf8")));
    if (!byPath.has(s.path) || s.belowThreshold) byPath.set(s.path, s);
  }
  const summaries = [...byPath.values()];
  for (const s of summaries) console.log(`${s.path}: ${JSON.stringify(s.scores)}`);
  if (!process.argv.includes("--open-issues")) return;
  const open = JSON.parse(gh(["issue", "list", "--state", "open", "--label", LABEL, "--limit", "500", "--json", "title"])).map((i) => i.title);
  const fresh = selectNew(summaries, open);
  if (fresh.length) {
    try { gh(["label", "create", LABEL, "--color", "ededed", "--description", "Queued agent task"]); } catch { /* exists */ }
  }
  for (const i of fresh) console.log(gh(["issue", "create", "--title", i.title, "--body", i.body, "--label", LABEL]).trim());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
