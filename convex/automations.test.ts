/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { buildDelivery } from "./automationRuntime";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const projectId = await t.run((ctx) => ctx.db.insert("projects", { name: "Test", clerkOrgId: "org", clerkUserId: "owner", apiKeyHash: "hash", apiKeyStatus: "active" }));
  return { t, projectId, owner: t.withIdentity({ subject: "owner", orgId: "org" }), outsider: t.withIdentity({ subject: "outsider", orgId: "other" }) };
}
const base = { name: "Page me", eventSource: "run.failed", actionType: "webhook", destination: "https://example.com/hook" };

test("create validates the destination for each action", async () => {
  const { owner, projectId } = await setup();
  await expect(owner.mutation(api.automations.create, { projectId, ...base, destination: "http://example.com" })).rejects.toThrow(/https/);
  await expect(owner.mutation(api.automations.create, { projectId, ...base, destination: "nope" })).rejects.toThrow(/web address/);
  await expect(owner.mutation(api.automations.create, { projectId, ...base, eventSource: "x" })).rejects.toThrow(/trigger/);
  await expect(owner.mutation(api.automations.create, { projectId, ...base, actionType: "github_dispatch", destination: "bad repo" })).rejects.toThrow(/owner\/repository/);
  await owner.mutation(api.automations.create, { projectId, ...base, actionType: "github_dispatch", destination: "acme/api" });
  await expect(owner.mutation(api.automations.create, { projectId, ...base, actionType: "github_dispatch", destination: "acme/api" })).rejects.toThrow(/already exists/);
});

test("update, pause and delete stay inside the project", async () => {
  const { owner, outsider, projectId } = await setup();
  const id = await owner.mutation(api.automations.create, { projectId, ...base });
  await owner.mutation(api.automations.setActive, { projectId, automationId: id, active: false });
  await owner.mutation(api.automations.update, { projectId, automationId: id, ...base, name: "Renamed", eventSource: "alert.created" });
  const [row] = await owner.query(api.automations.list, { projectId });
  expect(row).toMatchObject({ name: "Renamed", eventSource: "alert.created", active: false });
  await expect(outsider.mutation(api.automations.remove, { projectId, automationId: id })).rejects.toThrow();
  await owner.mutation(api.automations.remove, { projectId, automationId: id });
  expect(await owner.query(api.automations.list, { projectId })).toEqual([]);
});

test("private addresses and non-Slack links are refused", async () => {
  const { owner, projectId } = await setup();
  for (const destination of ["https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.2/x", "https://intranet/x", "https://db.internal/x"]) {
    await expect(owner.mutation(api.automations.create, { projectId, ...base, destination })).rejects.toThrow(/private/);
  }
  await expect(owner.mutation(api.automations.create, { projectId, ...base, actionType: "slack", destination: "https://example.com/hook" })).rejects.toThrow(/Slack/);
});

describe("delivery", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("builds the right request for each action", () => {
    const event = { source: "run.failed", title: "A run failed", message: "Run r1 ended in an error." };
    expect(buildDelivery("webhook", "https://a.dev/h", event, "p", "t").body).toMatchObject({ event: "run.failed", projectId: "p" });
    expect(buildDelivery("slack", "https://hooks.slack.com/services/a", event, "p", "t").body).toEqual({ text: ":zap: *A run failed*\nRun r1 ended in an error." });
    expect(() => buildDelivery("github_dispatch", "acme/api", event, "p", "t")).toThrow(/token/i);
    vi.stubEnv("AUTOMATIONS_GITHUB_TOKEN", "tok");
    const gh = buildDelivery("github_dispatch", "acme/api", event, "p", "t");
    expect(gh.url).toBe("https://api.github.com/repos/acme/api/dispatches");
    expect(gh.headers.Authorization).toBe("Bearer tok");
    expect(gh.body).toMatchObject({ event_type: "uncoil.run.failed" });
    vi.unstubAllEnvs();
  });

  test("dispatch sends to active matching rules only, records the result and throttles failures", async () => {
    const { t, owner, projectId } = await setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("ok")).mockResolvedValueOnce(new Response("no", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const good = await owner.mutation(api.automations.create, { projectId, ...base, name: "good" });
    const bad = await owner.mutation(api.automations.create, { projectId, ...base, name: "bad" });
    const paused = await owner.mutation(api.automations.create, { projectId, ...base, name: "paused" });
    await owner.mutation(api.automations.create, { projectId, ...base, name: "other", eventSource: "alert.created" });
    await owner.mutation(api.automations.setActive, { projectId, automationId: paused, active: false });
    const args = { projectId, source: "run.failed", title: "A run failed", message: "m" };
    expect(await t.action(internal.automationRuntime.dispatch, args)).toEqual({ matched: 2, sent: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const rows = await owner.query(api.automations.list, { projectId });
    const byId = Object.fromEntries(rows.map((r) => [r._id as string, r]));
    expect(byId[good]).toMatchObject({ lastStatus: "ok", fireCount: 1 });
    expect(byId[bad]).toMatchObject({ lastStatus: "failed", lastError: "The other side answered 500" });
    expect(byId[paused].lastStatus).toBeUndefined();
    // a second failure within a minute is skipped
    expect(await t.action(internal.automationRuntime.dispatch, args)).toEqual({ matched: 2, sent: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
