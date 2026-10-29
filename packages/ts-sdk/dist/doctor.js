"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskKey = maskKey;
exports.runDoctor = runDoctor;
exports.formatReport = formatReport;
const index_1 = require("./index");
function keyRegion(apiKey) {
    if (/^(uncoil|tracify)_sk_live_eu_/.test(apiKey))
        return "eu";
    if (/^(uncoil|tracify)_sk_live_us_/.test(apiKey))
        return "us";
    if (/^(uncoil|tracify)_sk_live_/.test(apiKey))
        return "eu";
    return undefined;
}
/** Shows enough of a key to recognise it without leaking it. */
function maskKey(apiKey) {
    if (apiKey.length <= 12)
        return "***";
    return `${apiKey.slice(0, 16)}…${apiKey.slice(-4)}`;
}
function id() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
function errorText(error) {
    const err = error;
    if (err?.name === "TimeoutError" || err?.name === "AbortError")
        return "the request timed out";
    return err?.cause?.code || err?.cause?.message || err?.message || String(error);
}
/** Runs every setup check in order and never throws. */
async function runDoctor(options = {}) {
    const checks = [];
    const add = (check) => { checks.push(check); return check; };
    const timeoutMs = options.timeoutMs ?? 10000;
    const apiKey = (options.apiKey || (process.env.UNCOIL_API_KEY ?? process.env.TRACIFY_API_KEY) || "").trim();
    const envRegion = (process.env.UNCOIL_REGION ?? process.env.TRACIFY_REGION)?.trim().toLowerCase();
    const wanted = (options.region || (envRegion === "eu" || envRegion === "us" ? envRegion : undefined));
    const found = keyRegion(apiKey);
    const host = (options.host || (process.env.UNCOIL_HOST ?? process.env.TRACIFY_HOST) || index_1.UNCOIL_REGION_HOSTS[wanted ?? found ?? "eu"]).replace(/\/$/, "");
    const report = () => ({ ok: !checks.some((c) => c.status === "fail"), host, checks, runId });
    let runId;
    const nodeMajor = Number(process.versions?.node?.split(".")[0]);
    if (typeof fetch !== "function" || nodeMajor < 18) {
        add({ id: "runtime", title: "Runtime", status: "fail", message: `This runtime has no built-in fetch (Node ${process.versions?.node ?? "unknown"}).`, hint: "Use Node 18 or newer." });
        return report();
    }
    add({ id: "runtime", title: "Runtime", status: "ok", message: `Node ${process.versions.node}` });
    if (!apiKey) {
        add({ id: "key", title: "API key", status: "fail", message: "No API key was found.", hint: "Set the UNCOIL_API_KEY environment variable, or run with --key. Create a key on the API keys page of your dashboard." });
        return report();
    }
    if (!/^(uncoil|tracify)_sk_/.test(apiKey)) {
        add({ id: "key", title: "API key", status: "fail", message: `${maskKey(apiKey)} does not look like an Uncoil key (they start with uncoil_sk_).`, hint: "Copy the key again from the API keys page; make sure no other service's key was pasted by mistake." });
        return report();
    }
    add({ id: "key", title: "API key", status: "ok", message: `Found ${maskKey(apiKey)}` });
    try {
        new URL(host);
    }
    catch {
        add({ id: "region", title: "Region and host", status: "fail", message: `The host "${host}" is not a valid web address.`, hint: 'Use a full address such as "https://eu.cloud.uncoil.dev", or drop the host option and use --region eu or us.' });
        return report();
    }
    const hostRegion = (Object.entries(index_1.UNCOIL_REGION_HOSTS).find(([, value]) => value === host)?.[0]);
    if (found && hostRegion && found !== hostRegion) {
        add({ id: "region", title: "Region and host", status: "fail", message: `This key belongs to ${found.toUpperCase()}, but you are pointing at ${hostRegion.toUpperCase()}.`, hint: `Set UNCOIL_REGION=${found} (or run with --region ${found}), or create a key in the ${hostRegion.toUpperCase()} region.` });
        return report();
    }
    add({ id: "region", title: "Region and host", status: "ok", message: hostRegion ? `${hostRegion.toUpperCase()} · ${host}` : `Custom host · ${host}` });
    const proxyNote = process.env.HTTPS_PROXY || process.env.https_proxy ? " A proxy is set in your environment, and Node's fetch does not use it automatically; allow this host or route the request through your proxy." : "";
    try {
        const response = await fetch(host, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
        add({ id: "network", title: "Network", status: "ok", message: `Reached ${host} (HTTP ${response.status}).` });
    }
    catch (error) {
        add({ id: "network", title: "Network", status: "fail", message: `Could not reach ${host} (${errorText(error)}).`, hint: `Check your internet connection, firewall and the host setting.${proxyNote}` });
        return report();
    }
    // Which project does this key send to? Older servers have no such route, so anything unexpected is skipped quietly.
    const expectedProject = (options.projectId || (process.env.UNCOIL_PROJECT_ID ?? process.env.TRACIFY_PROJECT_ID) || "").trim();
    try {
        const response = await fetch(`${host}/api/sdk/whoami`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(timeoutMs) });
        const data = response.ok ? await response.json() : null;
        if (data?.projectId) {
            if (expectedProject && expectedProject !== data.projectId) {
                add({ id: "project", title: "Project", status: "fail", message: `UNCOIL_PROJECT_ID points at a different project than this key ("${data.projectName ?? data.projectId}").`, hint: "Run `npx uncoil-sdk login` in this folder again so the key and project are saved together." });
                return report();
            }
            add({ id: "project", title: "Project", status: "ok", message: `Traces will land in: ${data.projectName ?? data.projectId}` });
        }
    }
    catch { /* the trace check below reports connection problems */ }
    if (options.send === false) {
        add({ id: "trace", title: "Test trace", status: "skip", message: "Skipped (--no-send)." });
        return report();
    }
    const spanRunId = `doctor_${id()}`;
    const started = Date.now();
    const span = {
        spanId: `doctor_span_${id()}`,
        runId: spanRunId,
        traceName: "Uncoil setup check",
        spanType: "llm_call",
        modelId: "uncoil-doctor",
        createdAt: new Date(started).toISOString(),
        latencyMs: 1,
        input: "Setup check from uncoil-sdk doctor",
        output: "If you can see this trace in your dashboard, the SDK is set up correctly.",
        tags: ["uncoil-doctor"],
        metadata: { source: "uncoil-sdk doctor", sdk: "ts" },
    };
    try {
        const response = await fetch(`${host}/api/ingest`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(span),
            signal: AbortSignal.timeout(timeoutMs),
        });
        const status = response.status;
        if (response.ok) {
            runId = spanRunId;
            add({ id: "trace", title: "Test trace", status: "ok", message: `Accepted. Look for "Uncoil setup check" (run ${spanRunId}) in your dashboard.` });
        }
        else if (status === 401) {
            add({ id: "trace", title: "Test trace", status: "fail", message: "Uncoil rejected the API key (401).", hint: "The key is wrong, was revoked, or belongs to another region. Create a fresh one on the API keys page." });
        }
        else if (status === 403) {
            add({ id: "trace", title: "Test trace", status: "fail", message: "This key is not allowed to send data (403).", hint: "Check that the key belongs to the project you expect and has not been disabled." });
        }
        else if (status === 402 || status === 429) {
            add({ id: "trace", title: "Test trace", status: "fail", message: `Uncoil is not taking data right now (${status}).`, hint: "You may be over your plan's limit or sending too fast. Check usage on the billing page, then try again." });
        }
        else if (status >= 500) {
            add({ id: "trace", title: "Test trace", status: "fail", message: `Uncoil had a problem on its side (${status}).`, hint: "Your app is not affected. Check the status page and try again in a minute." });
        }
        else {
            add({ id: "trace", title: "Test trace", status: "fail", message: `Uncoil did not accept the test trace (${status}).`, hint: "Update uncoil-sdk to the latest version; if it still happens, contact support." });
        }
    }
    catch (error) {
        add({ id: "trace", title: "Test trace", status: "fail", message: `The test trace could not be sent (${errorText(error)}).`, hint: `Check your connection and try again.${proxyNote}` });
    }
    return report();
}
const MARKS = { ok: "✓", warn: "!", fail: "✗", skip: "-" };
function formatReport(report) {
    const lines = ["Uncoil setup check", ""];
    for (const check of report.checks) {
        lines.push(`${MARKS[check.status]} ${check.title}: ${check.message}`);
        if (check.hint && check.status !== "ok")
            lines.push(`    Fix: ${check.hint}`);
    }
    lines.push("", report.ok ? "All good. Your setup is ready to send traces." : "Something needs fixing; see the Fix lines above.");
    return lines.join("\n");
}
