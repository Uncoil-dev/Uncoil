import { describe, expect, it } from "vitest";
import { buildDiscordAlertPayload, DISCORD_LIMITS } from "./discordAlert";

const base = { projectName: "Support bot", ruleLabel: "run failed", runUrl: "https://uncoil.dev/dashboard/p1/runs/r1" };

describe("buildDiscordAlertPayload", () => {
  it("puts project, rule, failing step and run link in one embed", () => {
    const payload = buildDiscordAlertPayload({ ...base, failingStep: "search_tool", message: "Timed out after 30s" });
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.title).toBe("Alert: run failed");
    expect(embed.url).toBe(base.runUrl);
    expect(embed.description).toBe("Timed out after 30s");
    expect(embed.fields).toEqual([
      { name: "Project", value: "Support bot", inline: true },
      { name: "Failing step", value: "search_tool", inline: true },
    ]);
    expect(payload.content).toContain(base.runUrl);
  });

  it("leaves out the failing step when none is known", () => {
    const embed = buildDiscordAlertPayload({ ...base, message: "x" }).embeds[0];
    expect(embed.fields.map((field) => field.name)).toEqual(["Project"]);
  });

  it("trims long text to Discord's limits", () => {
    const long = "e".repeat(10_000);
    const payload = buildDiscordAlertPayload({ ...base, ruleLabel: long, projectName: long, failingStep: long, message: long });
    expect(payload.content.length).toBeLessThanOrEqual(DISCORD_LIMITS.content);
    expect(payload.embeds[0].title.length).toBeLessThanOrEqual(DISCORD_LIMITS.embedTitle);
    expect(payload.embeds[0].description.length).toBeLessThanOrEqual(DISCORD_LIMITS.embedDescription);
    for (const field of payload.embeds[0].fields) expect(field.value.length).toBeLessThanOrEqual(DISCORD_LIMITS.fieldValue);
    expect(payload.embeds[0].description.endsWith("…")).toBe(true);
  });

  it("does not let a message ping everyone", () => {
    expect(buildDiscordAlertPayload({ ...base, message: "@everyone" }).allowed_mentions).toEqual({ parse: [] });
  });
});
