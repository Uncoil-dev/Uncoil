/**
 * Fills a project with realistic sample traces so an empty preview or staging
 * dashboard has something to look at: a week of support-agent runs with
 * tool calls, LLM calls, retries and a few failures.
 *
 * It sends spans through the normal /api/ingest endpoint, so the target needs a
 * working analytics database (ClickHouse) behind it. Nothing is written directly.
 *
 * Usage (PowerShell), with a project API key from the project you want to fill
 * (sign in as that project's owner, e.g. kristoffer.bon@gmail.com on staging):
 *   $env:SEED_API_KEY="tracify_sk_live_..."; $env:SEED_BASE_URL="https://staging.eu.cloud.tracify.tech"; node scripts/seed-sample-traces.mjs
 *
 * Optional: SEED_RUNS (default 60), SEED_DAYS (default 7), SEED_DRY_RUN=1 to print one run only.
 * Run ids start with "seed_" so they are easy to spot. Running it twice adds more runs.
 */
const BASE = (process.env.SEED_BASE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.SEED_API_KEY;
const RUNS = Number(process.env.SEED_RUNS ?? 60);
const DAYS = Number(process.env.SEED_DAYS ?? 7);
const DRY = process.env.SEED_DRY_RUN === "1";

if (!DRY && (!BASE || !KEY)) {
  console.error("SEED_BASE_URL and SEED_API_KEY are required (or SEED_DRY_RUN=1).");
  process.exit(2);
}

import { createRunBuilder } from "./lib/sample-traces.mjs";
const buildRun = createRunBuilder({ days: DAYS });

const runs = Array.from({ length: DRY ? 1 : RUNS }, () => buildRun());
if (DRY) {
  console.log(JSON.stringify(runs[0], null, 2));
  process.exit(0);
}

let sent = 0;
let failedSends = 0;
for (const spans of runs) {
  for (const span of spans) {
    const response = await fetch(`${BASE}/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(span),
    });
    if (response.status === 202) sent++;
    else {
      failedSends++;
      if (failedSends <= 3) console.error(`Ingest said HTTP ${response.status}: ${(await response.text()).slice(0, 160)}`);
      if (response.status === 401 || response.status === 429) process.exit(1);
    }
  }
}
console.log(`Sent ${sent} spans across ${runs.length} runs${failedSends ? `, ${failedSends} rejected` : ""}.`);
process.exit(failedSends ? 1 : 0);
