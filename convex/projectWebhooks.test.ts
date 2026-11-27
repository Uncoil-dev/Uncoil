import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { validateDiscordWebhookUrl, validateSlackWebhookUrl, validateTeamsWebhookUrl } from "./projects";

const SLACK_ERROR = "Slack webhook must be a valid Slack webhook URL";
const TEAMS_ERROR = "Teams webhook must be a valid Microsoft Teams webhook URL";
// Fake path built at runtime so no webhook-shaped secret sits in the source.
const fakePath = ["fake", "path", "value"].join("/");

describe("validateSlackWebhookUrl", () => {
  test("accepts an https hooks.slack.com /services/ address unchanged", () => {
    const url = `https://hooks.slack.com/services/${fakePath}`;
    expect(validateSlackWebhookUrl(url)).toBe(url);
  });

  test.each([
    ["http", `http://hooks.slack.com/services/${fakePath}`],
    ["another host", `https://example.com/services/${fakePath}`],
    ["a lookalike host", `https://hooks.slack.com.evil.example/services/${fakePath}`],
    ["a non-/services/ path", `https://hooks.slack.com/other/${fakePath}`],
    ["a non-URL", "not a url"],
  ])("rejects %s", (_name, url) => {
    expect(() => validateSlackWebhookUrl(url)).toThrow(SLACK_ERROR);
  });

  test("empty input returns undefined", () => {
    expect(validateSlackWebhookUrl(undefined)).toBeUndefined();
    expect(validateSlackWebhookUrl("")).toBeUndefined();
  });
});

describe("validateTeamsWebhookUrl", () => {
  test.each([
    `https://contoso.webhook.office.com/webhookb2/${fakePath}`,
    `https://prod-00.westus.logic.azure.com/workflows/${fakePath}`,
  ])("accepts %s", (url) => {
    expect(validateTeamsWebhookUrl(url)).toBe(url);
  });

  test.each([
    ["another host", `https://example.com/webhookb2/${fakePath}`],
    ["a lookalike host", `https://contoso.webhook.office.com.evil.example/${fakePath}`],
    ["http on a Teams host", `http://contoso.webhook.office.com/webhookb2/${fakePath}`],
    ["http on a Power Automate host", `http://prod-00.westus.logic.azure.com/workflows/${fakePath}`],
    ["a non-URL", "not a url"],
  ])("rejects %s", (_name, url) => {
    expect(() => validateTeamsWebhookUrl(url)).toThrow(TEAMS_ERROR);
  });

  test("empty input returns undefined", () => {
    expect(validateTeamsWebhookUrl(undefined)).toBeUndefined();
    expect(validateTeamsWebhookUrl("")).toBeUndefined();
  });
});

describe("validateDiscordWebhookUrl", () => {
  const DISCORD_ERROR = "Discord webhook must be a valid Discord webhook URL";

  test.each(["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"])("accepts an https %s /api/webhooks/ address unchanged", (host) => {
    const url = `https://${host}/api/webhooks/123/${fakePath}`;
    expect(validateDiscordWebhookUrl(url)).toBe(url);
  });

  test.each([
    "http://discord.com/api/webhooks/1/x",
    "https://evil.example/api/webhooks/1/x",
    "https://discord.com.evil.example/api/webhooks/1/x",
    "https://evil.example/?u=https://discord.com/api/webhooks/1/x",
    "https://user@evil.example/api/webhooks/1/x",
    "https://discord.com:8443/api/webhooks/1/x",
    "https://discord.com/channels/1/2",
    "https://hooks.slack.com/services/T/B/x",
    "not a url",
  ])("rejects %s", (url) => {
    expect(() => validateDiscordWebhookUrl(url)).toThrow(DISCORD_ERROR);
  });

  test("treats empty as not set", () => {
    expect(validateDiscordWebhookUrl(undefined)).toBeUndefined();
    expect(validateDiscordWebhookUrl("")).toBeUndefined();
  });
});

describe("discord webhook storage", () => {
  const modules = import.meta.glob("./**/*.ts");
  const url = "https://discord.com/api/webhooks/123/abc";

  async function setup() {
    const t = convexTest(schema, modules);
    const projectId = await t.run((ctx) => ctx.db.insert("projects", { name: "Acme", clerkOrgId: "org", clerkUserId: "owner" }));
    return {
      t,
      projectId,
      owner: t.withIdentity({ subject: "owner", orgId: "org", orgRole: "org:admin" }),
      member: t.withIdentity({ subject: "member", orgId: "org", orgRole: "org:member" }),
    };
  }
  const stored = (t: Awaited<ReturnType<typeof setup>>["t"], projectId: Awaited<ReturnType<typeof setup>>["projectId"]) =>
    t.run(async (ctx) => (await ctx.db.get(projectId))?.discordWebhookUrl);

  test("a non-admin member only learns whether a Discord link is set", async () => {
    const { owner, member, projectId } = await setup();
    await owner.mutation(api.projects.updateProject, { projectId, name: "Acme", discordWebhookUrl: url });
    const seen = await member.query(api.projects.getProjectById, { projectId });
    expect(seen).toMatchObject({ hasDiscordWebhook: true });
    expect(JSON.stringify(seen)).not.toContain("api/webhooks");
  });

  test("saving another setting keeps the link and an empty string clears it", async () => {
    const { t, owner, projectId } = await setup();
    await owner.mutation(api.projects.updateProject, { projectId, name: "Acme", discordWebhookUrl: url });
    await owner.mutation(api.projects.updateProject, { projectId, name: "Renamed" });
    expect(await stored(t, projectId)).toBe(url);
    await owner.mutation(api.projects.updateProject, { projectId, name: "Acme", discordWebhookUrl: "" });
    expect(await owner.query(api.projects.getProjectById, { projectId })).toMatchObject({ hasDiscordWebhook: false });
  });
});
