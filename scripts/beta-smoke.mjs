import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

loadEnvFile(".env.local");

const baseUrl = normalizeBaseUrl(process.env.UNCOIL_SMOKE_BASE_URL || "http://127.0.0.1:3000");
const apiKey = process.env.UNCOIL_SMOKE_API_KEY || "";
const projectId = process.env.UNCOIL_SMOKE_PROJECT_ID || "";
const runId = `smoke_${Date.now().toString(36)}`;

const results = [];

await check("missing API key is rejected", async () => {
  const response = await postIngest(null, sampleSpan(runId, "missing-key"));
  assertStatus(response, 401);
});

await check("invalid API key is rejected", async () => {
  const response = await postIngest("uncoil_sk_live_invalid_smoke_key", sampleSpan(runId, "invalid-key"));
  assertStatus(response, 401);
});

await check("invalid span payload is rejected", async () => {
  const response = await postIngest(apiKey || "uncoil_sk_live_invalid_smoke_key", {
    spanId: "bad_payload",
  });
  assertStatus(response, 422);
});

if (apiKey) {
  await check("valid span is accepted", async () => {
    const response = await postIngest(apiKey, sampleSpan(runId, "accepted"));
    assertStatus(response, 202);
    const body = await response.json();
    if (body?.ok !== true) {
      throw new Error(`Expected ok=true response, got ${JSON.stringify(body)}`);
    }
  });
} else {
  skip("valid span is accepted", "set UNCOIL_SMOKE_API_KEY");
}

if (apiKey && projectId) {
  await check("accepted run appears in Convex", async () => {
    await waitForConvexRun({ projectId, runId });
  });
} else {
  skip("accepted run appears in Convex", "set UNCOIL_SMOKE_API_KEY and UNCOIL_SMOKE_PROJECT_ID");
}

await check("report route is reachable or protected", async () => {
  const targetProjectId = projectId || "00000000000000000000000000000000";
  const response = await fetch(`${baseUrl}/dashboard/${targetProjectId}/reports`, {
    redirect: "manual",
  });
  if (![200, 302, 303, 307, 308, 401, 403, 404].includes(response.status)) {
    throw new Error(`Unexpected report route status ${response.status}`);
  }
});

await check("billing route is reachable or protected", async () => {
  const targetProjectId = projectId || "00000000000000000000000000000000";
  const response = await fetch(`${baseUrl}/dashboard/${targetProjectId}/billing`, {
    redirect: "manual",
  });
  if (![200, 302, 303, 307, 308, 401, 403, 404].includes(response.status)) {
    throw new Error(`Unexpected billing route status ${response.status}`);
  }
});

printSummary();

if (results.some((result) => result.status === "fail")) {
  process.exitCode = 1;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function postIngest(key, payload) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  return await fetch(`${baseUrl}/api/ingest`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

function sampleSpan(id, suffix) {
  return {
    spanId: `${id}_${suffix}`,
    runId: id,
    spanType: suffix === "accepted" ? "error" : "llm_call",
    createdAt: new Date().toISOString(),
    latencyMs: 42,
    input: { smoke: true, suffix },
    output: { ok: suffix !== "accepted" },
    costUsd: suffix === "accepted" ? 1.25 : 0.01,
    modelId: "smoke-model",
    toolName: suffix === "accepted" ? "smoke-tool" : "",
    metadata: { source: "scripts/beta-smoke.mjs" },
  };
}

function assertStatus(response, expected) {
  if (response.status !== expected) {
    throw new Error(`Expected HTTP ${expected}, got ${response.status}`);
  }
}

async function waitForConvexRun({ projectId, runId }) {
  const deadline = Date.now() + 30_000;
  let lastOutput = "";
  while (Date.now() < deadline) {
    const output = await convexRun("agentRuns:getByRunId", { projectId, runId });
    lastOutput = output;
    if (output.includes(runId)) return;
    await sleep(2_000);
  }
  throw new Error(`Run ${runId} did not appear in Convex within 30s. Last output: ${lastOutput}`);
}

async function convexRun(functionName, payload) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const { stdout, stderr } = await execFileAsync(
    npx,
    ["convex", "run", functionName, JSON.stringify(payload)],
    { cwd: process.cwd(), windowsHide: true },
  );
  return `${stdout}\n${stderr}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: "pass" });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "fail", error });
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

function skip(name, reason) {
  results.push({ name, status: "skip", reason });
  console.log(`SKIP ${name} (${reason})`);
}

function printSummary() {
  const counts = results.reduce(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { pass: 0, fail: 0, skip: 0 },
  );
  console.log("");
  console.log(`Smoke summary: ${counts.pass} passed, ${counts.fail} failed, ${counts.skip} skipped`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Run ID: ${runId}`);
}
