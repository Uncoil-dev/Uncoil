#!/usr/bin/env node
// Lists src/lib/*.ts modules that have no sibling *.test.ts and, with
// --open-issues, files de-duplicated GitHub issues for them (needs GITHUB_TOKEN
// and the gh CLI).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PREFIX = "[coverage-scan]";
export const LABEL = "agent-task-queued";
export const MAX_NEW = 5;
const SENSITIVE_NAME = /admin|login|session|auth|billing|secret|delet|credential|token|password|stripe|crypto|api-key/i;
const SENSITIVE_CONTENT = /\b(?:clerk|stripe|HMAC|createHmac|deleteMany|\.delete\(|process\.env\.[A-Z_]*(?:SECRET|KEY|TOKEN))/;

export function isSensitive(name, source = "") {
  return SENSITIVE_NAME.test(name) || SENSITIVE_CONTENT.test(source);
}

export function findUncovered(files, readSource = () => "") {
  const set = new Set(files);
  return files
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"))
    .filter((f) => !set.has(f.replace(/\.ts$/, ".test.ts")))
    .filter((f) => !isSensitive(f, readSource(f)))
    .sort();
}

export function issueFor(file) {
  const path = `src/lib/${file}`;
  return {
    title: `${PREFIX} ${path}`,
    body: `**Task**\nAdd unit tests for \`${path}\`, which has no matching test file.\n\n**Files owned**\n- ${path}\n- src/lib/${file.replace(/\.ts$/, ".test.ts")} (new)\n\n**Done looks like**\n- A node:test file covers the main exported behaviour.\n- The test is added to the test:tools script and passes.\n`,
  };
}

export function selectNew(files, openTitles, max = MAX_NEW) {
  const seen = new Set(openTitles);
  return files.map(issueFor).filter((i) => !seen.has(i.title)).slice(0, max);
}

const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });

function main() {
  const dir = join(process.cwd(), "src/lib");
  const files = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : [];
  const uncovered = findUncovered(files, (f) => readFileSync(join(dir, f), "utf8"));
  console.log(`${uncovered.length} uncovered module(s)`);
  for (const f of uncovered) console.log(`- src/lib/${f}`);
  if (!process.argv.includes("--open-issues")) return;
  const open = JSON.parse(gh(["issue", "list", "--state", "open", "--label", LABEL, "--limit", "500", "--json", "title"])).map((i) => i.title);
  const fresh = selectNew(uncovered, open);
  if (fresh.length) {
    try { gh(["label", "create", LABEL, "--color", "ededed", "--description", "Queued agent task"]); } catch { /* exists */ }
  }
  for (const i of fresh) console.log(gh(["issue", "create", "--title", i.title, "--body", i.body, "--label", LABEL]).trim());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
