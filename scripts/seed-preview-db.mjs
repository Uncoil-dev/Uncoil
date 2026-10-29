/**
 * Fills the PREVIEW analytics database with sample traces for the staging test account,
 * so local previews look full without touching live customer data.
 *
 * It writes straight into ClickHouse database `uncoil_preview` (created on first run as a
 * copy of the live table layout) and never goes through /api/ingest, so it costs zero
 * Convex calls. It refuses to run against any database whose name does not end in "_preview".
 *
 * Usage (PowerShell, in the repo folder; CLICKHOUSE_* are read from .env.local):
 *   $env:PREVIEW_PROJECT_ID="<id from the dashboard URL /dashboard/<id>>"; node scripts/seed-preview-db.mjs
 *
 * Optional: SEED_RUNS (default 120), SEED_DAYS (default 14), SEED_RESET=1 to clear sample rows first.
 * Sample run ids start with "seed_" so they are easy to spot.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRunBuilder } from "./lib/sample-traces.mjs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(CLICKHOUSE_(?:URL|USER|PASSWORD))\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const URL_ = process.env.CLICKHOUSE_URL?.replace(/\/$/, "");
const USER = process.env.CLICKHOUSE_USER;
const PASS = process.env.CLICKHOUSE_PASSWORD;
const DB = process.env.CLICKHOUSE_DATABASE ?? "uncoil_preview";
const LIVE_DB = "uncoil";
const PROJECT = process.env.PREVIEW_PROJECT_ID;
const RUNS = Number(process.env.SEED_RUNS ?? 120);
const DAYS = Number(process.env.SEED_DAYS ?? 14);

if (!URL_ || !USER || !PASS) fail("CLICKHOUSE_URL, CLICKHOUSE_USER and CLICKHOUSE_PASSWORD are required (put them in .env.local).");
if (!/^[a-z0-9_]+_preview$/.test(DB)) fail(`Refusing to write to database "${DB}": the name must end in _preview.`);
if (!PROJECT || !/^[a-z0-9]+$/i.test(PROJECT)) fail("PREVIEW_PROJECT_ID is required (the id in the dashboard URL).");

function fail(message) {
  console.error(message);
  process.exit(2);
}

async function query(sql, { database, body } = {}) {
  const params = new URLSearchParams({ query: sql, ...(database ? { database } : {}), date_time_input_format: "best_effort", input_format_skip_unknown_fields: "1" });
  const res = await fetch(`${URL_}/?${params}`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}` },
    body,
  });
  if (!res.ok) throw new Error(`ClickHouse ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.text();
}

// Same layout as live, separate data. Safe to repeat.
await query(`CREATE DATABASE IF NOT EXISTS ${DB}`);
for (const table of ["spans", "evaluation_scores"]) {
  await query(`CREATE TABLE IF NOT EXISTS ${DB}.${table} AS ${LIVE_DB}.${table}`);
}
if (process.env.SEED_RESET === "1") {
  await query(`ALTER TABLE ${DB}.spans DELETE WHERE projectId = '${PROJECT}' AND startsWith(runId, 'seed_') SETTINGS mutations_sync = 1`);
}

const build = createRunBuilder({ days: DAYS, environment: "production" });
const rows = [];
for (let i = 0; i < RUNS; i++) {
  for (const span of build()) {
    rows.push(JSON.stringify({
      attachments: "[]", metadata: "{}", payloadFormat: "json", streamFinal: true,
      ...span,
      projectId: PROJECT,
      input: typeof span.input === "string" ? span.input : JSON.stringify(span.input ?? ""),
      output: typeof span.output === "string" ? span.output : JSON.stringify(span.output ?? ""),
    }));
  }
}
await query(`INSERT INTO ${DB}.spans FORMAT JSONEachRow`, { body: rows.join("\n") + "\n" });
console.log(`Inserted ${rows.length} spans (${RUNS} runs, last ${DAYS} days) into ${DB}.spans for project ${PROJECT}.`);
