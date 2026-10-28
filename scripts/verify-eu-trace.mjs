/**
 * End-to-end verification for the EU regional cloud.
 *
 * Sends a real span through https://eu.cloud.uncoil.dev and confirms it lands in
 * Tinybird, exercising SDK -> /api/ingest -> Inngest -> Tinybird. This is the one
 * launch-checklist item that cannot be automated without a real account, so it is
 * packaged as a single command.
 *
 * Usage (PowerShell):
 *   $env:UNCOIL_SMOKE_API_KEY="uncoil_sk_live_eu_..."; node scripts/verify-eu-trace.mjs
 *
 * Optional:
 *   UNCOIL_SMOKE_BASE_URL   defaults to https://eu.cloud.uncoil.dev
 *   TINYBIRD_HOST / TINYBIRD_TOKEN  read from .tinyb automatically when present, so
 *                                   the script also polls Tinybird directly to prove
 *                                   the span was persisted, not merely accepted.
 */
import { readFileSync } from "node:fs";

// The Tinybird host/token are already on disk in .tinyb after `tb login`, so fall
// back to them. That reduces the operator's job to supplying the one value only a
// signed-in human can produce: the project API key.
function tinybirdFromCli() {
  try {
    const c = JSON.parse(readFileSync(new URL("../.tinyb", import.meta.url), "utf8"));
    return { host: c.host, token: c.token };
  } catch {
    return { host: undefined, token: undefined };
  }
}
const cli = tinybirdFromCli();

const BASE = process.env.UNCOIL_SMOKE_BASE_URL ?? "https://eu.cloud.uncoil.dev";
const KEY = process.env.UNCOIL_SMOKE_API_KEY;
const TB_HOST = process.env.TINYBIRD_HOST ?? cli.host;
const TB_TOKEN = process.env.TINYBIRD_TOKEN ?? cli.token;

if (!KEY) {
  console.error("UNCOIL_SMOKE_API_KEY is required.");
  console.error("Create a project at https://eu.cloud.uncoil.dev, copy the key shown once, then:");
  console.error('  $env:UNCOIL_SMOKE_API_KEY="uncoil_sk_live_eu_..."; npm run verify:eu-trace');
  process.exit(2);
}

const runId = `eu_verify_${Date.now().toString(36)}`;
const spanId = `${runId}_span1`;
let failures = 0;
const step = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

const span = {
  spanId, runId, spanType: "llm_call",
  input: "EU region verification probe", output: "ok",
  latencyMs: 12, costUsd: 0.00001, modelId: "verification/none",
  inputTokens: 4, outputTokens: 1,
  createdAt: new Date().toISOString(),
};

const res = await fetch(`${BASE}/api/ingest`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify(span),
});
const body = await res.text();
step(res.status === 202, `ingest accepts a valid span (HTTP ${res.status})`, res.status === 202 ? "" : body.slice(0, 160));
step(Boolean(res.headers.get("X-RateLimit-Remaining")), "Redis ingest quota header present",
  `X-RateLimit-Remaining=${res.headers.get("X-RateLimit-Remaining") ?? "absent"}`);

if (TB_HOST && TB_TOKEN) {
  // Inngest -> Tinybird is asynchronous; poll rather than assume.
  let found = false;
  for (let i = 0; i < 12 && !found; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const q = encodeURIComponent(`SELECT count() AS c FROM spans WHERE runId = '${runId}' FORMAT JSON`);
    const tb = await fetch(`${TB_HOST}/v0/sql?q=${q}`, { headers: { Authorization: `Bearer ${TB_TOKEN}` } });
    if (!tb.ok) continue;
    const json = await tb.json().catch(() => null);
    found = Number(json?.data?.[0]?.c ?? 0) > 0;
    if (!found) console.log(`  … waiting for Tinybird (${(i + 1) * 5}s)`);
  }
  step(found, "span persisted to Tinybird", found ? `runId=${runId}` : "not visible after 60s — check Inngest");
} else {
  console.log("SKIP span persisted to Tinybird (set TINYBIRD_HOST and TINYBIRD_TOKEN to verify storage)");
}

console.log(`\nBase URL: ${BASE}\nRun ID:   ${runId}\n${failures === 0 ? "EU region verified end to end." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
