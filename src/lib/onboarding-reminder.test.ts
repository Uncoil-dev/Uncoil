import assert from "node:assert/strict";
import { register } from "node:module";
import test, { beforeEach } from "node:test";

// inngest-functions.ts imports path-aliased modules that plain Node cannot resolve,
// so a resolve hook swaps them for stubs. The Convex stub reports a trace once
// `globalThis.__activatedAfter` activation checks have passed. Email templates are real.
const stubs: Record<string, string> = {
  "convex/_generated/api": `export const api = { agentRuns: { getProjectOnboardingState: "agentRuns.getProjectOnboardingState" } };`,
  "@/lib/convex": `export const getConvexClient = () => ({ query: async () => ({ hasReceivedFirstSpan: ++globalThis.__checks > globalThis.__activatedAfter }) });`,
  "@/lib/inngest": `export const inngest = { createFunction: (config, handler) => ({ config, handler }) };`,
  "@/lib/ingest-cache": `export const noEvaluatorsCache = new Map();`,
  "@/lib/span-pipeline": `export const persistSpan = async () => ({});`,
  "@/lib/regions": `export const getUncoilRegion = () => ({ origin: "https://www.uncoil.dev" });`,
  "@/lib/retention-job": `export const runRetention = async () => ({});`,
  "@/lib/transactional-email": `export const sendTransactionalEmail = async (mail) => { globalThis.__emails.push(mail); };`,
};
const real: Record<string, string> = { "@/lib/email-templates": new URL("./email-templates.ts", import.meta.url).href };
const hooks = `
  const stubs = ${JSON.stringify(stubs)};
  const real = ${JSON.stringify(real)};
  export async function resolve(specifier, context, next) {
    if (specifier in stubs) return { url: "data:text/javascript," + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier in real) return { url: real[specifier], shortCircuit: true };
    return next(specifier, context);
  }`;
register("data:text/javascript," + encodeURIComponent(hooks));

const g = globalThis as unknown as { __checks: number; __activatedAfter: number; __emails: { idempotencyKey: string; text: string }[] };
type Handler = (ctx: { event: { data: Record<string, string> }; step: Record<string, unknown> }) => Promise<unknown>;
const { onboardingReminder } = (await import("./inngest-functions.ts")) as unknown as { onboardingReminder: { handler: Handler } };
const step = { sleep: async () => {}, run: (_id: string, fn: () => Promise<unknown>) => fn() };
const event = { data: { email: "a@example.com", name: "Ada", projectId: "p1", projectName: "Demo" } };

beforeEach(() => { g.__checks = 0; g.__emails = []; });

test("a project still without a trace on day three gets a second, shorter email from the founder", async () => {
  g.__activatedAfter = Infinity;
  await onboardingReminder.handler({ event, step });
  assert.deepEqual(g.__emails.map((mail) => mail.idempotencyKey), ["onboarding-reminder-p1", "onboarding-follow-up-p1"]);
  assert.match(g.__emails[1].text, /Kristoffer/);
  assert.ok(g.__emails[1].text.length < g.__emails[0].text.length);
});

test("a trace that arrives after the first reminder stops the second one", async () => {
  g.__activatedAfter = 1;
  await onboardingReminder.handler({ event, step });
  assert.deepEqual(g.__emails.map((mail) => mail.idempotencyKey), ["onboarding-reminder-p1"]);
});
