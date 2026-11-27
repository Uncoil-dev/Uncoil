import { describe, expect, it } from "vitest";
import { resolveSettingsTab, SETTINGS_TAB_GROUPS, validatePrivacySettings } from "./settings-tabs";

const tabs = ["General", "Members", "Data", "API Keys", "Audit log"];

describe("resolveSettingsTab", () => {
  it("matches a tab name regardless of case", () => {
    expect(resolveSettingsTab("members", tabs)).toBe("Members");
    expect(resolveSettingsTab("api keys", tabs)).toBe("API Keys");
    expect(resolveSettingsTab("Audit Log", tabs)).toBe("Audit log");
  });

  it("falls back to General for a missing or unknown tab", () => {
    expect(resolveSettingsTab(null, tabs)).toBe("General");
    expect(resolveSettingsTab("billing", tabs)).toBe("General");
  });
});

describe("project settings tabs", () => {
  it("lists Privacy under Project so redaction and retention are reachable", () => {
    const project = SETTINGS_TAB_GROUPS.find((group) => group.label === "Project");
    expect(project?.items).toContain("Privacy");
    expect(resolveSettingsTab("privacy", SETTINGS_TAB_GROUPS.flatMap((group) => group.items))).toBe("Privacy");
  });
});

describe("validatePrivacySettings", () => {
  it("rejects retention beyond the plan limit", () => {
    expect(validatePrivacySettings({ redactionEnabled: true, redactionRules: ["email"], retentionDays: "30", planTier: "free" }).ok).toBe(false);
  });

  it("returns the values to save for a valid form", () => {
    expect(validatePrivacySettings({ redactionEnabled: false, redactionRules: ["email"], retentionDays: "5", planTier: "free" })).toEqual({
      ok: true,
      value: { redactionEnabled: false, redactionRules: ["email"], retentionDays: 5 },
    });
  });
});
