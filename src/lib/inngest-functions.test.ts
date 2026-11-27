import assert from "node:assert/strict";
import { register } from "node:module";
import test, { afterEach, beforeEach, mock } from "node:test";

// inngest-functions.ts imports path-aliased modules that plain Node cannot resolve,
// so a resolve hook swaps them for stubs. The Convex stub keeps one alert per run and type,
// the way alerts.create does, and says whether the alert was new.
const stubs: Record<string, string> = {
  "convex/_generated/api": `export const api = { alerts: { create: "alerts.create" }, projects: { getById: "projects.getById" } };`,
  "@/lib/convex": `
    const alerts = new Set();
    export const getConvexClient = () => ({
      mutation: async (name, args) => {
        const key = args.projectId + ":" + args.runId + ":" + args.type;
        const created = !alerts.has(key);
        alerts.add(key);
        return { alertId: key, created };
      },
      query: async () => ({ slackWebhookUrl: "https://hooks.slack.com/services/x", teamsWebhookUrl: "https://example.webhook.office.com/x" }),
    });`,
  "@/lib/inngest": `export const inngest = { createFunction: (config, handler) => ({ config, handler }), send: async () => {} };`,
  "@/lib/ingest-cache": `export const noEvaluatorsCache = new Map();`,
  "@/lib/span-pipeline": `export const persistSpan = async () => ({ created: true });`,
  "@/lib/regions": `export const getUncoilRegion = () => ({ origin: "https://www.uncoil.dev" });`,
  "@/lib/retention-job": `export const runRetention = async () => ({});`,
  "@/lib/transactional-email": `export const sendTransactionalEmail = async () => {};`,
  "@/lib/email-templates": `export const renderNoTraceEmail = () => ({});`,
};
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) {
      return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    }
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

type Handler = (ctx: { event: { data: unknown }; step: { run: (id: string, fn: () => Promise<unknown>) => Promise<unknown> } }) => Promise<unknown>;
const { processAlert } = (await import("./inngest-functions.ts")) as unknown as { processAlert: { handler: Handler } };
const step = { run: (_id: string, fn: () => Promise<unknown>) => fn() };
const runFailed = (runId: string) => ({ data: { projectId: "p1", runId, type: "run_failed", message: `Run ${runId} encountered an error span.`, triggeredAt: new Date().toISOString() } });

let fetchMock: ReturnType<typeof mock.method>;
beforeEach(() => { fetchMock = mock.method(globalThis, "fetch", async () => new Response("ok")); });
afterEach(() => mock.restoreAll());

test("two error spans in one run post to Slack and Teams once", async () => {
  await processAlert.handler({ event: runFailed("run-1"), step });
  await processAlert.handler({ event: runFailed("run-1"), step });

  const posted = fetchMock.mock.calls.map((call) => String(call.arguments[0]));
  assert.deepEqual(posted, ["https://hooks.slack.com/services/x", "https://example.webhook.office.com/x"]);
});

test("webhook posts carry a timeout so a hanging webhook is cut off", async () => {
  await processAlert.handler({ event: runFailed("run-2"), step });

  assert.equal(fetchMock.mock.calls.length, 2);
  for (const call of fetchMock.mock.calls) assert.ok((call.arguments[1] as RequestInit).signal instanceof AbortSignal);
});
